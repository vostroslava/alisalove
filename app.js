/**
 * 11 ответов. Демо — Application Logic
 * Navigation, animations, and interactions
 */

(function () {
    'use strict';

    // ============================================
    // State
    // ============================================
    const state = {
        currentScreen: 'intro', // 'intro' | 'card-1' to 'card-11' | 'final'
        currentCardIndex: 0, // 0-10 for cards
        isAnimating: false,
        touchStartY: 0,
        touchStartTime: 0,
        parallaxOffset: 0,
        photoRotationInterval: null,
        currentPhotoIndex: 0
    };

    // ============================================
    // DOM Elements
    // ============================================
    const elements = {
        app: document.getElementById('app'),
        progressBar: document.getElementById('progress-bar'),
        progressDots: document.querySelectorAll('.progress-dot'),
        backgroundLayer: document.getElementById('background-layer'),
        photoPlaceholder: document.getElementById('photo-placeholder'),
        photoLabel: document.getElementById('photo-label'),
        screensContainer: document.getElementById('screens-container'),
        cardsContainer: document.getElementById('cards-container'),
        screenIntro: document.getElementById('screen-intro'),
        screenFinal: document.getElementById('screen-final'),
        navButtons: document.getElementById('nav-buttons'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnStart: document.getElementById('btn-start'),
        btnHowto: document.getElementById('btn-howto'),
        btnMeet: document.getElementById('btn-meet'),
        btnRestart: document.getElementById('btn-restart'),
        modalHowto: document.getElementById('modal-howto'),
        modalMeet: document.getElementById('modal-meet')
    };

    // ============================================
    // Initialization
    // ============================================
    function init() {
        generateCardScreens();
        bindEvents();
        showScreen('intro');
        updateBackground(0);
    }



    // ============================================
    // Generate Card Screens
    // ============================================
    function generateCardScreens() {
        const fragment = document.createDocumentFragment();

        questions.forEach((q, index) => {
            const screen = document.createElement('section');
            screen.className = 'screen card-screen';
            screen.id = `screen-card-${index + 1}`;
            screen.dataset.screen = `card-${index + 1}`;
            screen.dataset.cardIndex = index;

            screen.innerHTML = `
        <div class="screen-content">
          <span class="card-badge">Вопрос ${index + 1} из 11</span>
          <p class="card-title">${q.title}</p>
          <h2 class="card-question">${q.question}</h2>
          <div class="glass-panel card-answer-panel">
            <p class="card-answer">${q.answerShort}</p>
          </div>
          <p class="card-footer">Полная версия — офлайн при встрече.</p>
        </div>
      `;

            fragment.appendChild(screen);
        });

        elements.cardsContainer.appendChild(fragment);
    }

    // ============================================
    // Event Binding
    // ============================================
    function bindEvents() {
        // Navigation buttons
        elements.btnStart.addEventListener('click', () => navigateTo('values'));
        elements.btnRestart.addEventListener('click', () => navigateTo('intro'));
        elements.btnPrev.addEventListener('click', navigatePrev);
        elements.btnNext.addEventListener('click', navigateNext);

        // Values "Дальше" button
        const btnValuesNext = document.getElementById('btn-values-next');
        if (btnValuesNext) {
            btnValuesNext.addEventListener('click', () => navigateTo('card-1', 'down'));
        }

        // Modal buttons
        elements.btnHowto.addEventListener('click', () => openModal('modal-howto'));
        if (elements.btnMeet) {
            elements.btnMeet.addEventListener('click', () => openModal('modal-meet'));
        }

        // Modal close (backdrop and buttons)
        document.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', () => closeModal(el.dataset.close));
        });

        // Highlight toggle
        document.addEventListener('click', (e) => {
            const highlight = e.target.closest('.card-highlight');
            if (highlight) {
                highlight.classList.toggle('expanded');
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleKeydown);

        // Touch events
        elements.screensContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        elements.screensContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        elements.screensContainer.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Wheel events
        elements.screensContainer.addEventListener('wheel', handleWheel, { passive: false });

        // Parallax on mouse move (desktop only)
        if (window.matchMedia('(pointer: fine)').matches) {
            document.addEventListener('mousemove', handleMouseMove);
        }
    }

    // ============================================
    // Navigation
    // ============================================
    function navigateTo(screenName, direction = 'down') {
        if (state.isAnimating) return;
        if (state.currentScreen === screenName) return;

        state.isAnimating = true;

        const currentScreenEl = document.querySelector(`[data-screen="${state.currentScreen}"]`);
        const nextScreenEl = document.querySelector(`[data-screen="${screenName}"]`);

        if (!nextScreenEl) {
            state.isAnimating = false;
            return;
        }

        // Animate out current screen
        if (currentScreenEl) {
            currentScreenEl.classList.remove('active');
            currentScreenEl.classList.add(direction === 'down' ? 'exiting-up' : 'exiting-down');

            setTimeout(() => {
                currentScreenEl.classList.remove('exiting-up', 'exiting-down');
            }, 600);
        }

        // Animate in next screen
        nextScreenEl.classList.add('active');

        // Update state
        state.currentScreen = screenName;

        // Update card index if on a card
        if (screenName.startsWith('card-')) {
            state.currentCardIndex = parseInt(screenName.split('-')[1]) - 1;
            updateBackground(state.currentCardIndex);
            updateProgress(state.currentCardIndex);
        }

        // Update UI visibility
        updateUIVisibility();

        // Reset animation lock
        setTimeout(() => {
            state.isAnimating = false;
        }, 600);
    }

    function navigateNext() {
        if (state.currentScreen === 'intro') {
            navigateTo('values', 'down');
        } else if (state.currentScreen === 'values') {
            navigateTo('card-1', 'down');
        } else if (state.currentScreen.startsWith('card-')) {
            const currentIndex = parseInt(state.currentScreen.split('-')[1]);
            if (currentIndex < 11) {
                navigateTo(`card-${currentIndex + 1}`, 'down');
            } else {
                navigateTo('final', 'down');
            }
        }
    }

    function navigatePrev() {
        if (state.currentScreen === 'final') {
            navigateTo('card-11', 'up');
        } else if (state.currentScreen.startsWith('card-')) {
            const currentIndex = parseInt(state.currentScreen.split('-')[1]);
            if (currentIndex > 1) {
                navigateTo(`card-${currentIndex - 1}`, 'up');
            } else {
                navigateTo('values', 'up');
            }
        } else if (state.currentScreen === 'values') {
            navigateTo('intro', 'up');
        }
    }

    // ============================================
    // Screen Display
    // ============================================
    function showScreen(screenName) {
        const screenEl = document.querySelector(`[data-screen="${screenName}"]`);
        if (screenEl) {
            screenEl.classList.add('active');
            state.currentScreen = screenName;
            updateUIVisibility();
        }
    }

    function updateUIVisibility() {
        const isCard = state.currentScreen.startsWith('card-');

        // Progress bar
        if (isCard) {
            elements.progressBar.classList.add('visible');
            elements.navButtons.classList.add('visible');
        } else {
            elements.progressBar.classList.remove('visible');
            elements.navButtons.classList.remove('visible');
        }

        // Nav button states
        elements.btnPrev.disabled = state.currentScreen === 'intro';
        elements.btnNext.disabled = state.currentScreen === 'final';
    }

    // ============================================
    // Background & Progress
    // ============================================
    function updateBackground(cardIndex) {
        const photoIndex = cardIndex !== undefined ? getPhotoForCard(cardIndex) : state.currentPhotoIndex;
        const photo = photos[photoIndex];

        // Use real photo as background
        elements.photoPlaceholder.style.backgroundImage = `url('${photo.src}')`;
        elements.photoPlaceholder.style.backgroundSize = 'cover';
        elements.photoPlaceholder.style.backgroundPosition = 'center';
        elements.photoLabel.textContent = photo.label;
        elements.photoPlaceholder.style.transform = 'scale(1.05)';
    }

    function updateProgress(cardIndex) {
        elements.progressDots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index === cardIndex) {
                dot.classList.add('active');
            } else if (index < cardIndex) {
                dot.classList.add('completed');
            }
        });
    }

    // ============================================
    // Modal Handling
    // ============================================
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('visible');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    // ============================================
    // Keyboard Navigation
    // ============================================
    function handleKeydown(e) {
        // Don't navigate if modal is open
        if (document.querySelector('.modal.visible')) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.visible').forEach(modal => {
                    closeModal(modal.id);
                });
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
            case 'PageDown':
                e.preventDefault();
                navigateNext();
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                navigatePrev();
                break;
            case 'Enter':
            case ' ':
                if (state.currentScreen === 'intro') {
                    e.preventDefault();
                    navigateTo('values', 'down');
                } else if (state.currentScreen === 'values') {
                    e.preventDefault();
                    navigateTo('card-1', 'down');
                }
                break;
        }
    }

    // ============================================
    // Touch Handling
    // ============================================
    function handleTouchStart(e) {
        state.touchStartY = e.touches[0].clientY;
        state.touchStartTime = Date.now();
    }

    function handleTouchMove(e) {
        if (state.isAnimating) return;

        const currentY = e.touches[0].clientY;
        const deltaY = state.touchStartY - currentY;

        // Parallax effect during touch
        const parallaxAmount = deltaY * 0.1;
        elements.photoPlaceholder.style.transform = `scale(1.05) translateY(${-parallaxAmount}px)`;

        // Prevent default scrolling when swiping
        if (Math.abs(deltaY) > 10) {
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = state.touchStartY - touchEndY;
        const deltaTime = Date.now() - state.touchStartTime;

        // Reset parallax
        elements.photoPlaceholder.style.transform = 'scale(1.05)';

        // Calculate velocity
        const velocity = Math.abs(deltaY) / deltaTime;

        // Swipe threshold: at least 50px or fast swipe
        const threshold = 50;
        const isValidSwipe = Math.abs(deltaY) > threshold || velocity > 0.5;

        if (isValidSwipe && !state.isAnimating) {
            if (deltaY > 0) {
                // Swipe up - next
                navigateNext();
            } else {
                // Swipe down - prev
                navigatePrev();
            }
        }
    }

    // ============================================
    // Wheel Handling
    // ============================================
    let wheelTimeout = null;

    function handleWheel(e) {
        e.preventDefault();

        if (state.isAnimating || wheelTimeout) return;

        wheelTimeout = setTimeout(() => {
            wheelTimeout = null;
        }, 100);

        if (e.deltaY > 0) {
            navigateNext();
        } else if (e.deltaY < 0) {
            navigatePrev();
        }
    }

    // ============================================
    // Parallax Effect
    // ============================================
    function handleMouseMove(e) {
        if (!state.currentScreen.startsWith('card-')) return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const deltaX = (e.clientX - centerX) / centerX;
        const deltaY = (e.clientY - centerY) / centerY;

        const moveX = deltaX * 10;
        const moveY = deltaY * 10;

        elements.photoPlaceholder.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
    }

    // ============================================
    // Initialize on DOM Ready
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

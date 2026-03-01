import { db, getKV, setKV } from './db.js';
import { parseChatFile, saveMessages } from './importTelegram.js';
import { escapeHtml, formatDate, uuid, clamp } from './utils.js';
import { startParticles } from './particles.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';

const appEl = document.getElementById('app');
const navEl = document.getElementById('nav');
const bg = document.getElementById('bg');

startParticles(bg);

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    navEl.classList.toggle('open');
  });
  // Close nav on route click
  navEl.querySelectorAll('a[data-route]').forEach(a => {
    a.addEventListener('click', () => navEl.classList.remove('open'));
  });
}

// ------------ Seed content (Plan) ------------

function tgMsg(from, date, text) {
  const cls = from === 'Слава' ? 'slava' : 'siri';
  const src = from === 'Слава' ? 'assets/avatar_slava.jpg' : 'assets/avatar_siri.jpg';
  return `<div class="tg-bubble tg-bubble--${cls}"><div class="tg-bubble__head"><img class="tg-bubble__avatar" src="${src}" alt="${from}"><span class="tg-bubble__name">${from}</span><span class="tg-bubble__date">${date}</span></div><div class="tg-bubble__text">${text}</div></div>`;
}

function tgPhoto(from, date, photoSrc, caption) {
  const cls = from === 'Слава' ? 'slava' : 'siri';
  const avatarSrc = from === 'Слава' ? 'assets/avatar_slava.jpg' : 'assets/avatar_siri.jpg';
  return `<div class="tg-bubble tg-bubble--${cls}"><div class="tg-bubble__head"><img class="tg-bubble__avatar" src="${avatarSrc}" alt="${from}"><span class="tg-bubble__name">${from}</span><span class="tg-bubble__date">${date}</span></div><div class="tg-bubble__photo-container"><img src="${photoSrc}" class="tg-bubble__photo" alt="Photo"></div>` + (caption ? `<div class="tg-bubble__text tg-bubble__caption">${caption}</div>` : '') + `</div>`;
}

const DEFAULT_PLAN_MD = `# План отношений — v1

---

## 1) Лидерство и вектор

Солнце, я хочу, чтобы у нас были отношения. Не на эмоциях и не «как получится», а спокойно и взросло. Я беру на себя лидерство не в смысле контроля, а в смысле: я задаю вектор, структуру и держу спокойствие, чтобы тебе было безопасно и легко. У тебя всегда остаётся право вето и право корректировать. Я хочу, чтобы мы росли, а не качались.

${tgMsg('Siri❤️', '14.01.2026 22:12', 'На самом деле, я правда хочу чтобы у нас получилось.')}

${tgMsg('Siri❤️', '14.01.2026 22:12', 'Плюс иногда я ощущала себя в них будто я главная, но хочу чувствовать нас на равных и главным тебя.')}

${tgMsg('Siri❤️', '01.02.2026 01:21', 'Честно я много хочу. Но я не хочу партнерства и видимо я не хочу это лечить. Я думала, что нужно это исправить. Но зачем. Я хочу человека сильнее меня в раз 100. Хочу гордиться им. И наслаждаться. Я не хочу много внимания и хочу свободы. Но может во мне говорит еще прошлое.')}

${tgMsg('Слава', '16.01.2026 22:13', 'Я хочу чтобы у нас были долгосрочные отношения) построенные на доверии) честности и понимании) с договорённостями и ответственностью друг перед другом за свои действия )')}

${tgMsg('Слава', '14.01.2026 22:55', 'Насчет равноправия я хочу чтобы мы обсуждали и принимали правильные решения которые будут правильные для нас двоих) <br>насчет твоих текущих отношений я не буду тебя подталкивать , если ты не попросишь, как посчитай нужным так и сделаем')}

---

## 2) База отношений (что у нас «по умолчанию»)

Мы пара. Мы любим друг друга и выбираем друг друга. Это значит: мы не изменяем, не играем в неопределённость и не держим друг друга в подвешенном состоянии.

**Определение верности:** поцелуи/секс — точно нет. Флирт — тоже нет, если он создаёт ощущение свидания или скрытности. Скрытность — это когда мы не говорим про человека или пытаемся скрыть общение с ним.

${tgMsg('Siri❤️', '11.01.2026 19:00', 'Я хочу хороших здоровых отношений в эмоциональном плане в первую очередь.<br>Я хочу близости со своим партнером. Не только физическую но и эмоциональную. Я хочу лучшего друга и парня. <br>Также я естественно хочу классный секс. <br>Мне важно быть любимой и любить. <br>Я хочу честности.')}

${tgMsg('Siri❤️', '05.02.2026 01:15', 'Я люблю тебя и хочу быть с тобой')}

${tgPhoto('Слава', '01.03.2026', 'assets/photo_flowers.jpg', 'Самые красивые цветы для самой прекрасной девушки на свете ❤️')}

${tgMsg('Слава', '22.01.2026 22:16', 'Давай подумаем логически<br>Мы с тобой побыли долгое время без друг друга<br>И тут все возвращается и я лично понимаю логикой в первую очередь что мне никого другого не надо<br>Все это мое и я хочу быть верен своему выбору и развивать его')}

${tgMsg('Siri❤️', '05.02.2026 01:14', 'Знаешь я люблю тебя за честность')}

---

## 3) Свобода и прозрачность (как мы живём без контроля)

Свобода у нас держится на доверии и честности. Правило простое: можно многое, если мы говорим заранее.

**Мини-правила:**
- Если идёшь с кем-то куда-то — говоришь заранее: куда, с кем, зачем. Это не контроль, это спокойствие и открытость перед друг другом.
- Если у кого-то появляется ревность — не копим, не проверяем, а обсуждаем спокойно и системно.
- Никаких скрытностей, которые выглядят как двойная жизнь.

> **Важно:** не проговаривай это как «мне нужно знать», говори как «так нам безопасно и спокойно за друг друга».

${tgMsg('Слава', '01.02.2026 02:25', 'Свобода должна быть построена на доверии и вере в это доверие  с двух сторон)')}

${tgMsg('Siri❤️', '16.01.2026 22:02', 'Спрашивай все)')}

${tgMsg('Siri❤️', '16.01.2026 22:43', 'Ты можешь говорить мне чего ты против, задавать любые вопросы')}

${tgMsg('Слава', '15.01.2026 00:01', 'Кстати одна из основ на чем мы строим отношения это доверие, и я хочу чтобы наши с тобой любые цифровые устройства не вызвали негатива друг у друга, чтобы мы могли спокойно взять друг у друга и быть уверенными в честности себя перед партнером')}

${tgMsg('Siri❤️', '12.01.2026 01:35', 'Мне нужно развивать доверие. Я вообще не верю, но и не показываю этого) даже если причин нет')}

${tgMsg('Слава', '05.02.2026 10:06', 'И помнить что отношения строятся на доверии и оно должно исходить от каждой стороны )')}

${tgPhoto('Слава', '01.03.2026', 'assets/photo_couple_mirror.jpg', 'Вместе — лучше всего. Обожаю наши моменты 🥰')}

---

## 4) Ритм пары (как выглядит обычная неделя)

Мы планируем неделю по свободному времени: работа, друзья, время на себя, но мы друг другу приоритет.

**Конкретика без жёсткого расписания:**
- В начале недели коротко синхронизируемся: когда мы вместе, куда хотим сходить, что делаем на выходных.
- Если неделя загруженная — делаем минимум: вечера вместе (по возможности).

${tgMsg('Siri❤️', '12.01.2026 01:35', 'Для меня ценность отношений в разделении эмоций вместе, поддержке и в наличие друга рядом. У тебя есть на кого положиться, с кем обсудить день/фильм/книгу и это круто) в ощущении близкого тебе по духу')}

${tgMsg('Siri❤️', '12.01.2026 01:35', 'Для меня это помощь без просьб в сложных ситуациях')}

${tgMsg('Слава', '29.01.2026 23:39', 'И знаешь я в первую очередь верю в то что у нас все будет хорошо и буду для этого стараться ) потому что мне нравится совместное будущее и я хочу его')}

---

## 5) Съезд 15 марта: пилот совместной жизни

15 марта предлагаю начать тестовый период совместной жизни у тебя — 7 дней из 7. У нас остаётся своё время, но мы проверяем комфорт быта и близости.

**Срок пилота:** первый цикл — 1 месяц. После месяца — сверка по метрикам. Если всё ок — продолжаем ещё месяц. Если нет — корректируем или честно останавливаемся.

${tgPhoto('Слава', '01.03.2026', 'assets/photo_kiss.jpg', 'С тобой я чувствую себя по-настоящему счастливым ✨')}

${tgMsg('Слава', '31.01.2026 21:28', 'Я хочу совместно жить , планомерно развивать отношения , чтобы это был совместный проект в который каждый вкладывается , мы ставим планы и реализовываем их ) ну если кратко )')}

---

## 6) Быт: где проявляется лидерство делом

Я беру на себя стабильно:
- Закупки и еда (план, покупки, готовка/организация).
- Помогаю с уборкой и поддержанием порядка.
- Организация выходных и досуга (куда пойти, что посмотреть, чем заняться).
- Мелкие бытовые задачи — беру и делаю.

> **«Я беру на себя много, потому что мне приятно и я хочу быть опорой. Но быт мы всё равно настраиваем так, чтобы обоим было комфортно и справедливо.»**

${tgMsg('Слава', '16.02.2026 01:09', 'Самое главное в этом всем это не сам факт предложения а то что за ним стоит) и какие действия направленны на то чтобы тебе было комфортно и хорошо) мне каждый день проведеный с тобой радует и вызывает эмоции) а без тебя скучаю) даже сообщения радуют и вызывают улыбку) поэтому нужно наслаждаться тем что есть) а остальное все придет и будет )я тебя люблю кот:3')}

${tgMsg('Siri❤️', '12.01.2026 01:35', 'Я не мечтаю. Я сразу ставлю цель и начинаю выполнять')}

---

## 7) Алгоритм конфликта

**Правило №1:** никакого игнора.

${tgPhoto('Siri❤️', '2021', 'assets/photo_full_mirror.jpg', '')}

**Правило №2:** пауза максимум до завтра.

**Фраза-пауза:**
«Мне эмоционально тяжело, давай до завтра возьмём паузу. Я вернусь к разговору в [время]. Я тебя люблю, просто нужно остыть.»

**Возврат** по структуре (коротко, 10 минут):
Факт → что я почувствовал → что мне нужно → что я предлагаю.

«Я не буду грузить. Если меня накрывает — я либо скажу кратко, либо предложу голосом.»

${tgMsg('Siri❤️', '12.01.2026 01:35', 'Нет неразрешимых проблем. Есть нежелание их решать)')}

---

## 8) Метрики месяца (контрольная точка раз в месяц)

Раз в месяц (или ровно через 30 дней после съезда) делаем «сверку» по 6 метрикам, шкала 1–10:

1. **Близость** (тепло, нежность, секс, контакт)
2. **Свобода** (воздух, личное время, отсутствие ощущения клетки)
3. **Доверие** (нет скрытности, нет игр, прозрачность)
4. **Опора** (ей спокойно, ты держишь слово, ты устойчив)
5. **Качество общения** (без игнора, умеете возвращаться к разговору)
6. **Комфорт совместной жизни** (быт, привычки, режим)

**Порог успеха:**
- Если в среднем 7+ и нет провалов ниже 5 по ключевым пунктам — мы идём правильно.
- Если есть провал — корректируем правила на следующий месяц.
- Если два месяца подряд провал — честно признаём несовместимость.

${tgMsg('Слава', '23.01.2026 00:59', 'А что по твоему постройка отношений ?) <br>Мне нравится метафора что отношения это домик который вы строите , главное строить совместно и помогать друг другу , не важно чем , просто помогать , когда-то кирпичиком , когда то просто словом ) но стараться строить и улучшать всегда ) и если что-то не получается думать почему не получается и находить решения проблем а не маскировать их )')}

---

## 9) Что она получает

Ты получаешь спокойствие, опору, инициативу, нежность, хороший секс и лёгкость. Я хочу, чтобы рядом со мной ты могла расслабляться и расцветать.

${tgMsg('Siri❤️', '18.02.2026 02:04', 'Люблю тебя)<br>С тобой всегда спокойно)')}
${tgMsg('Siri❤️', '11.01.2026 18:08', 'Это странно <br>Мне с тобой просто спокойно и хорошо<br>Приятно общаться <br>Мне редко с кем-то так')}
${tgMsg('Siri❤️', '26.01.2026 01:19', 'Я люблю тебя за то что мне хорошо с тобой и что ты всегда добрый надежный и милый <br>Я пока не привыкла к тебе и вообще не верю тебе что очень странно<br>Короче я когда уходила в зал мне было страшно оставлять тебя одного))<br>Хотя я знаю тебя 6 лет)')}
${tgMsg('Siri❤️', '25.02.2026 00:51', 'Уверена что все будет хорошо')}
${tgMsg('Слава', '07.02.2026 23:28', 'И я буду рад любой тебе ) но главное чтобы ты была рядом) я люблю тебя когда ты в любом состоянии)')}
${tgMsg('Слава', '19.10.2025 22:55', 'Я как цветок мне надо солнышко ) только мне один вид солнца подходит) а когда солнышко рядом и обнимает своими лучиками цветочек такой радостный радостный будет 🥰 будет светиться от счастья и распуститься еще сильнее : 3')}

---

## 10) Финальный вопрос

Как тебе такой план в целом? Что тебе откликается, а что хочется изменить? И какие 2 условия тебе важны, чтобы 15 марта зайти в съезд спокойно?

${tgMsg('Слава', '21.10.2025 00:40', 'Говорят, есть одно мистическое место) где обитают самые светлые эмоции. И есть легенда, что появилось оно только благодаря одному единственному чудесному и неповторимому единорогу)<br>И стоит этому единорогу прийти в свое же царство как мир вокруг начинает сиять ,и наполняться магией и чудесами: 3<br>Спасибо тебе, мой Единорог, за то, что ты вообще есть. : 3')}

${tgMsg('Слава', '29.01.2026 02:47', 'Кот ) все будет хорошо) я тебя люблю) и я знаю что ты меня тоже любишь) и я верю в искренность наших чувств ) и я знаю что они у нас одинаковые друг к другу ) не бойся чувствовать, да страшно где-то бывает) но ведь интересно и приятно это все ) и интригующее) радуйся эмоциями и направляй их в позитив ) а не в негатив) надо радоваться жизни а не грустить )')}
`;


// ------------ App State ------------
const state = {
  route: '',
  messagesLimit: 80,
  hideForwarded: true,
  msgQuery: '',
  quoteQuery: '',
  selectedTag: '',
};

function routeFromHash() {
  const raw = location.hash || '#/plan';
  const m = raw.match(/^#\/([a-z0-9-]+)/i);
  return m ? m[1] : 'plan';
}

function setActiveNav(route) {
  for (const a of navEl.querySelectorAll('a[data-route]')) {
    const href = a.getAttribute('href') || '';
    const isActive = href === `# / ${route} `;
    a.classList.toggle('active', isActive);
  }
}

async function ensureSeed() {
  const plan = await getKV('plan_md', null);
  if (!plan) await setKV('plan_md', DEFAULT_PLAN_MD);

  const flags = await getKV('flags', {});
  if (!flags?.inited) {
    await setKV('flags', { ...(flags || {}), inited: true });
  }
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

// ------------ Helpers (Photos) ------------
async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('File read error'));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}

async function makeThumbnail(file, maxSize = 520) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close && bmp.close();
    return c.toDataURL('image/jpeg', 0.82);
  } catch {
    // fallback — full data URL
    return await fileToDataUrl(file);
  }
}

// ------------ Renderers ------------
async function renderHome() {
  const messagesCount = await db.messages.count();
  const quotesCount = await db.quotes.count();
  const photosCount = await db.photos.count();
  const chatName = await getKV('chatName', '—');

  const pinnedQuotes = await db.quotes.where('pinned').equals(1).reverse().limit(3).toArray();

  appEl.innerHTML = `
  < section class="section" >
      <div class="h1"><span class="icon">✦</span> Home</div>
      <p class="sub">Персональное пространство вашей пары — план, цитаты, чек‑ины, фотки и таймлайн.</p>
    </section >

    <section class="section">
      <div class="grid">
        <div class="card" style="grid-column: span 4;">
          <div class="kpi-card">
            <div class="kpi-card__icon violet">💬</div>
            <h3>Чат</h3>
            <div class="kpi"><div class="kpi__num">${escapeHtml(chatName)}</div></div>
            <p class="small">Импортируй Telegram export, чтобы появились сообщения.</p>
          </div>
        </div>

        <div class="card" style="grid-column: span 3;">
          <div class="kpi-card">
            <div class="kpi-card__icon cyan">✉</div>
            <h3>Messages</h3>
            <div class="kpi"><div class="kpi__num">${messagesCount}</div><div class="kpi__label">сообщений</div></div>
          </div>
        </div>

        <div class="card" style="grid-column: span 3;">
          <div class="kpi-card">
            <div class="kpi-card__icon amber">✦</div>
            <h3>Quotes</h3>
            <div class="kpi"><div class="kpi__num">${quotesCount}</div><div class="kpi__label">сохранено</div></div>
          </div>
        </div>

        <div class="card" style="grid-column: span 2;">
          <div class="kpi-card">
            <div class="kpi-card__icon rose">◐</div>
            <h3>Gallery</h3>
            <div class="kpi"><div class="kpi__num">${photosCount}</div><div class="kpi__label">фото</div></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="quick-actions">
        <button class="quick-action" id="btnImport"><div class="quick-action__icon">⇪</div>Импорт чата</button>
        <a class="quick-action" href="#/plan"><div class="quick-action__icon">◈</div>План</a>
        <a class="quick-action" href="#/quotes"><div class="quick-action__icon">✦</div>Цитаты</a>
        <a class="quick-action" href="#/gallery"><div class="quick-action__icon">◐</div>Галерея</a>
        <a class="quick-action" href="#/checkins"><div class="quick-action__icon">◉</div>Чек‑ин</a>
        <a class="quick-action" href="#/timeline"><div class="quick-action__icon">⏤</div>Таймлайн</a>
      </div>
    </section>

    <section class="section">
      <div class="notice">
        <b>🔒 Local‑first.</b> Ничего не уходит "в облако". Данные живут в IndexedDB в браузере. Для переноса — Settings → Export/Import.
      </div>
    </section>

    <section class="section">
      <div class="h1" style="font-size:18px;">⭐ Закреплённые цитаты</div>
      <p class="sub" style="margin-bottom:12px;">Самые важные слова — ваши якоря спокойствия.</p>
      <div class="list">
        ${pinnedQuotes.length ? pinnedQuotes.map(q => quoteCard(q)).join('') : `
          <div class="notice">
            Пока пусто. Импортируй переписку → открой Messages → нажми «⭐ Quote» на важных сообщениях.
          </div>
        `}
      </div>
    </section>
`;

  document.getElementById('btnImport')?.addEventListener('click', () => openImportDialog());
}

function quoteCard(q) {
  const tags = (q.tags || []).map(t => `< span class="tag" > #${escapeHtml(t)}</span > `).join(' ');
  const meta = [
    q.from ? escapeHtml(q.from) : '—',
    q.date ? escapeHtml(formatDate(q.date)) : '',
  ].filter(Boolean).join(' · ');

  return `
  < div class="quote${q.pinned ? ' pinned' : ''}" >
      <div class="quote__meta">${q.pinned ? '⭐ ' : ''}${meta}</div>
      <div class="quote__text">${escapeHtml(q.text || '')}</div>
      <div class="row between" style="margin-top:10px;">
        <div class="row gap-sm">${tags || '<span class="small">без тегов</span>'}</div>
        <div class="row gap-sm">
          <button class="btn sm ghost" data-act="copy-quote" data-id="${q.id}">Copy</button>
          <button class="btn sm${q.pinned ? ' primary' : ''}" data-act="toggle-pin" data-id="${q.id}">${q.pinned ? '★ Pinned' : '☆ Pin'}</button>
          <button class="btn sm danger" data-act="del-quote" data-id="${q.id}">✕</button>
        </div>
      </div>
    </div >
  `;
}

function buildMapJourneyHTML(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const sections = [];
  let currentSection = [];

  Array.from(doc.body.childNodes).forEach(node => {
    if (node.tagName === 'HR') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    } else {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
      currentSection.push(node);
    }
  });
  if (currentSection.length > 0) sections.push(currentSection);

  let journeyHTML = '<div class="map-journey" id="mapJourney"><div class="map-path"><div class="map-path-fill" id="mapPathFill"></div></div>';

  sections.forEach((secNodes, index) => {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'map-node-content glass-card';
    secNodes.forEach(n => sectionDiv.appendChild(n.cloneNode(true)));

    journeyHTML += `
       <div class="map-node-wrapper">
         <div class="map-node-dot"></div>
         ${sectionDiv.outerHTML}
       </div>
     `;
  });

  journeyHTML += `
    <div class="map-node-wrapper final-node">
      <div class="map-node-dot heart-dot">❤️</div>
      <div class="final-message">Любовь — это совместное путешествие.</div>
    </div>
  </div>`;

  return journeyHTML;
}

async function renderPlan() {
  const planMd = await getKV('plan_md', DEFAULT_PLAN_MD);
  const edit = Boolean(await getKV('plan_edit', false));

  let viewerHTML = '';
  if (!edit) {
    const rawHTML = marked.parse(planMd);
    viewerHTML = buildMapJourneyHTML(rawHTML);
  }

  appEl.innerHTML = `
  <section class="section">
    <div class="row between">
      <div>
        <div class="h1">◈ Journey</div>
        <p class="sub">Карта вашего пути.</p>
      </div>
      <div class="row gap-sm">
        <button class="btn" id="btnToggleEdit">${edit ? '◉ Карта' : '✎ Изменить план'}</button>
        <button class="btn sm danger" id="btnResetPlan">Сбросить</button>
      </div>
    </div>
  </section>

  <section class="section">
    ${edit ? `
        <div class="card glass-card">
          <div class="label">Архитектура (Markdown)</div>
          <textarea class="textarea" id="planEditor" spellcheck="false">${escapeHtml(planMd)}</textarea>
          <div class="row between" style="margin-top:12px;">
            <button class="btn primary" id="btnSavePlan">💾 Сохранить</button>
            <span class="small">Совет: используйте --- для создания новой остановки</span>
          </div>
        </div>
      ` : `
        <div class="md">${viewerHTML}</div>
      `}
  </section>
`;

  document.getElementById('btnToggleEdit')?.addEventListener('click', async () => {
    await setKV('plan_edit', !edit);
    render();
  });

  document.getElementById('btnResetPlan')?.addEventListener('click', async () => {
    if (!confirm('Сбросить план к дефолтному черновику?')) return;
    await setKV('plan_md', DEFAULT_PLAN_MD);
    toast('Plan reset');
    render();
  });

  document.getElementById('btnSavePlan')?.addEventListener('click', async () => {
    const v = document.getElementById('planEditor')?.value ?? '';
    await setKV('plan_md', v);
    toast('Saved');
    await setKV('plan_edit', false);
    render();
  });

  if (!edit) {
    const nodes = document.querySelectorAll('.map-node-wrapper');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    nodes.forEach(node => observer.observe(node));

    const container = document.getElementById('mapJourney');
    const fillLine = document.getElementById('mapPathFill');
    if (container && fillLine) {
      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const rect = container.getBoundingClientRect();
            // Fallback for very tall pages where scrollHeight is less reliable
            const viewportHeight = window.innerHeight;
            const scrollDist = -rect.top + (viewportHeight * 0.5);
            const totalHeight = rect.height;
            let percentage = (scrollDist / totalHeight) * 100;
            fillLine.style.height = Math.max(0, Math.min(100, percentage)) + '%';
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      // Cleanup on navigating away
      setTimeout(() => {
        const routeCb = () => {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('hashchange', routeCb);
        };
        window.addEventListener('hashchange', routeCb);
      }, 0);
    }
  }
}

async function renderQuotes() {
  const q = state.quoteQuery.trim().toLowerCase();
  let quotes = await db.quotes.orderBy('createdAt').reverse().toArray();
  if (q) {
    quotes = quotes.filter(x =>
      (x.text || '').toLowerCase().includes(q) ||
      (x.from || '').toLowerCase().includes(q) ||
      (x.tags || []).some(t => String(t).toLowerCase().includes(q))
    );
  }
  const tagsAll = Array.from(new Set(quotes.flatMap(x => x.tags || []))).sort((a, b) => a.localeCompare(b));
  const activeTag = state.selectedTag;

  const filtered = activeTag ? quotes.filter(x => (x.tags || []).includes(activeTag)) : quotes;

  appEl.innerHTML = `
  < section class="section" >
    <div class="row between">
      <div>
        <div class="h1">✦ Quotes</div>
        <p class="sub">Сохраняй важные сообщения как «якоря». Перечитывай и вставляй в план.</p>
      </div>
      <button class="btn primary" id="btnAddManual">+ Добавить вручную</button>
    </div>
    </section >

  <section class="section">
    <div class="grid">
      <div class="card" style="grid-column: span 8;">
        <div class="row between" style="align-items:flex-end;">
          <div class="search-wrap" style="flex:1;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input class="input" id="quoteQuery" placeholder="доверие / спокойствие / люблю…" value="${escapeHtml(state.quoteQuery)}" />
          </div>
          <button class="btn sm ghost" id="btnClearQ">✕ Clear</button>
        </div>

        <div class="hr"></div>

        <div class="row gap-sm" style="flex-wrap:wrap;">
          <button class="tag${!activeTag ? ' active' : ''}" data-tag="">All</button>
          ${tagsAll.slice(0, 30).map(t => `
              <button class="tag${activeTag === t ? ' active' : ''}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>
            `).join('')}
        </div>

        <div class="hr"></div>

        <div class="quotes-wall" id="quotesList">
          ${filtered.length ? filtered.map(quoteCard).join('') : `<div class="notice">Пока нет цитат. Открой Messages и сохрани важные сообщения.</div>`}
        </div>
      </div>

      <div class="card" style="grid-column: span 4;">
        <h3>💡 Идеи тегов</h3>
        <div class="row gap-sm" style="flex-wrap:wrap;margin-top:8px;">
          <span class="tag">нежность</span><span class="tag">опора</span><span class="tag">доверие</span><span class="tag">юмор</span><span class="tag">планы</span><span class="tag">ритуалы</span><span class="tag">свобода</span>
        </div>
        <div class="hr"></div>
        <h3>⭐ Фишка</h3>
        <p class="small">Поставь Pin нескольким цитатам — они появятся на Home как «якоря» спокойствия.</p>
      </div>
    </div>
  </section>

    ${manualQuoteModal()}
`;

  document.getElementById('quoteQuery')?.addEventListener('input', (e) => {
    state.quoteQuery = e.target.value;
  });

  document.getElementById('quoteQuery')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') render();
  });

  document.getElementById('btnClearQ')?.addEventListener('click', () => {
    state.quoteQuery = '';
    state.selectedTag = '';
    render();
  });

  for (const btn of appEl.querySelectorAll('[data-tag]')) {
    btn.addEventListener('click', () => {
      state.selectedTag = btn.getAttribute('data-tag') || '';
      render();
    });
  }

  document.getElementById('btnAddManual')?.addEventListener('click', () => openModal('manualQuoteModal'));

  wireQuoteActions();
  wireManualQuoteModal();
}

function manualQuoteModal() {
  return `
  < div class="modal" id = "manualQuoteModal" >
    <div class="modal__panel">
      <div class="modal__head">
        <div class="mono">manual quote</div>
        <button class="btn" data-close>Close</button>
      </div>
      <div class="modal__body">
        <div class="label">Text</div>
        <textarea class="textarea" id="mqText" placeholder="Вставь цитату..."></textarea>

        <div class="grid" style="margin-top:12px;">
          <div style="grid-column: span 6;">
            <div class="label">From</div>
            <input class="input" id="mqFrom" placeholder="Слава / Siri❤️" />
          </div>
          <div style="grid-column: span 6;">
            <div class="label">Date (optional)</div>
            <input class="input" id="mqDate" placeholder="2026-02-01T00:36:49" />
          </div>
        </div>

        <div class="label">Tags (comma separated)</div>
        <input class="input" id="mqTags" placeholder="доверие, нежность, планы" />

        <div class="row" style="margin-top:12px;justify-content:space-between;">
          <button class="btn primary" id="mqSave">Save</button>
          <label class="small"><input type="checkbox" id="mqPin" /> Pin</label>
        </div>
      </div>
    </div>
  </div >
  `;
}

function wireManualQuoteModal() {
  const modal = document.getElementById('manualQuoteModal');
  modal?.querySelector('[data-close]')?.addEventListener('click', () => closeModal('manualQuoteModal'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal('manualQuoteModal'); });

  document.getElementById('mqSave')?.addEventListener('click', async () => {
    const text = document.getElementById('mqText')?.value?.trim() || '';
    if (!text) return toast('Нужен текст');

    const from = document.getElementById('mqFrom')?.value?.trim() || '';
    const date = document.getElementById('mqDate')?.value?.trim() || null;
    const tagsRaw = document.getElementById('mqTags')?.value || '';
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const pinned = document.getElementById('mqPin')?.checked ? 1 : 0;

    await db.quotes.add({
      messageId: null,
      text,
      from,
      date,
      tags,
      pinned,
      createdAt: new Date().toISOString()
    });

    closeModal('manualQuoteModal');
    toast('Saved quote');
    render();
  });
}

function wireQuoteActions() {
  appEl.querySelectorAll('[data-act="copy-quote"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-id'));
      const q = await db.quotes.get(id);
      if (!q) return;
      await navigator.clipboard.writeText(q.text || '');
      toast('Copied');
    });
  });

  appEl.querySelectorAll('[data-act="toggle-pin"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-id'));
      const q = await db.quotes.get(id);
      if (!q) return;
      await db.quotes.update(id, { pinned: q.pinned ? 0 : 1 });
      render();
    });
  });

  appEl.querySelectorAll('[data-act="del-quote"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-id'));
      if (!confirm('Удалить цитату?')) return;
      await db.quotes.delete(id);
      render();
    });
  });
}

async function renderMessages() {
  const messagesCount = await db.messages.count();
  const chatName = await getKV('chatName', '—');
  const hasMessages = messagesCount > 0;

  const q = state.msgQuery.trim().toLowerCase();
  const hideForwarded = state.hideForwarded;

  let msgs = await db.messages.orderBy('date').reverse().limit(Math.max(80, state.messagesLimit)).toArray();
  if (hideForwarded) msgs = msgs.filter(m => !m.is_forwarded);

  if (q) {
    msgs = msgs.filter(m =>
      (m.text || '').toLowerCase().includes(q) ||
      (m.from || '').toLowerCase().includes(q)
    );
  }

  appEl.innerHTML = `
  < section class="section" >
    <div class="row between">
      <div>
        <div class="h1">✉ Messages</div>
        <p class="sub">Поиск по сообщениям. Выделяй важное → ⭐ сохраняй в Quotes.</p>
      </div>
      <div class="row gap-sm">
        <button class="btn primary" id="btnImport2">⇪ Import</button>
        <button class="btn" id="btnLoadMore">Ещё</button>
      </div>
    </div>
    </section >

  <section class="section">
    <div class="grid">
      <div class="card" style="grid-column: span 8;">
        <div class="row between" style="align-items:flex-end;">
          <div class="search-wrap" style="flex:1;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input class="input" id="msgQuery" placeholder="хочу / люблю / доверие…" value="${escapeHtml(state.msgQuery)}" />
          </div>
          <label class="small" style="user-select:none;display:flex;align-items:center;gap:6px;white-space:nowrap;">
            <input type="checkbox" id="hideForwarded" ${hideForwarded ? 'checked' : ''} />
            скрыть пересланное
          </label>
        </div>

        <div class="hr"></div>

        <div class="list" id="msgList">
          ${hasMessages ? msgs.map(m => messageCard(m, q)).join('') : `
              <div class="notice">
                Сообщений пока нет. Нажми <b>Import</b> и выбери ваш Telegram export <code>result.json</code>.
              </div>
            `}
        </div>
      </div>

      <div class="card" style="grid-column: span 4;">
        <h3>📊 Статус</h3>
        <p class="small">Chat: <span class="mono">${escapeHtml(chatName)}</span></p>
        <p class="small">Messages: <span class="mono">${messagesCount}</span></p>
        <div class="hr"></div>
        <h3>💡 Подсказка</h3>
        <p class="small">Ищи «хочу», «люблю», «спокойно», «доверие» — это обычно самые сильные якоря.</p>
      </div>
    </div>
  </section>
`;

  document.getElementById('btnImport2')?.addEventListener('click', () => openImportDialog());
  document.getElementById('btnLoadMore')?.addEventListener('click', () => { state.messagesLimit += 120; render(); });

  document.getElementById('msgQuery')?.addEventListener('input', (e) => { state.msgQuery = e.target.value; });
  document.getElementById('msgQuery')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') render(); });

  document.getElementById('hideForwarded')?.addEventListener('change', (e) => {
    state.hideForwarded = e.target.checked;
    render();
  });

  wireMessageActions();
}

function messageCard(m, query) {
  const fromName = escapeHtml(m.from || '—');
  const initial = (m.from || '?')[0].toUpperCase();
  const avatarClass = initial <= 'M' ? 'a' : 'b';
  const dateStr = escapeHtml(formatDate(m.date || ''));
  const media = m.has_media ? `< span class="tag cyan" > ${escapeHtml(m.media_type || 'media')}</span > ` : '';
  const text = (m.text || '').trim();
  const safeText = text.length > 900 ? text.slice(0, 900) + '…' : text;

  // Simple highlight for search query
  let displayText = escapeHtml(safeText);
  if (query && query.length >= 2) {
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    displayText = displayText.replace(re, '<mark>$1</mark>');
  }

  return `
  < div class="msg" >
      <div class="msg__top">
        <div class="msg__from">
          <div class="msg__avatar ${avatarClass}">${initial}</div>
          <span>${fromName}</span>
          <span class="msg__date">${dateStr}${m.pinned ? ' · 📌' : ''}</span>
        </div>
        <div class="msg__actions">
          ${media}
          <button class="btn sm ghost" data-act="copy-msg" data-id="${m.id}">Copy</button>
          <button class="btn-quote" data-act="quote-msg" data-id="${m.id}">⭐ Quote</button>
        </div>
      </div>
      <div class="msg__text">${displayText}</div>
    </div >
  `;
}

function wireMessageActions() {
  appEl.querySelectorAll('[data-act="copy-msg"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-id'));
      const m = await db.messages.get(id);
      if (!m) return;
      await navigator.clipboard.writeText(m.text || '');
      toast('Copied');
    });
  });

  appEl.querySelectorAll('[data-act="quote-msg"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-id'));
      const m = await db.messages.get(id);
      if (!m) return;

      // Prevent duplicates
      const existing = await db.quotes.where('messageId').equals(id).first();
      if (existing) return toast('Уже сохранено');

      await db.quotes.add({
        messageId: id,
        text: m.text || '',
        from: m.from || '',
        date: m.date || null,
        tags: m.pinned ? ['пин'] : [],
        pinned: m.pinned ? 1 : 0,
        createdAt: new Date().toISOString(),
      });

      toast('Saved to Quotes');
    });
  });
}

async function renderCheckins() {
  const items = await db.checkins.orderBy('date').reverse().toArray();

  appEl.innerHTML = `
  < section class="section" >
      <div class="h1">◉ Check‑ins</div>
      <p class="sub">Ежемесячная «сверка» по 6 метрикам (1–10). Это настройка, а не экзамен.</p>
    </section >

  ${items.length >= 2 ? `<section class="section">
      <div class="card">
        <h3>📈 Тренд среднего</h3>
        ${buildSparkline(items)}
      </div>
    </section>` : ''
    }

<section class="section">
  <div class="grid">
    <div class="card" style="grid-column: span 6;">
      <h3>➕ Новый чек‑ин</h3>
      ${checkinForm()}
      <div class="row between" style="margin-top:16px;">
        <button class="btn primary" id="btnSaveCheckin">💾 Сохранить</button>
        <span class="small">Лучше обсудить голосом, а сюда записать итог.</span>
      </div>
    </div>

    <div class="card" style="grid-column: span 6;">
      <h3>📋 История</h3>
      <div class="small">Всего: <span class="mono">${items.length}</span></div>
      <div class="hr"></div>
      <div class="list">
        ${items.length ? items.map(checkinCard).join('') : `<div class="notice">Пока пусто. Добавь первый чек‑ин.</div>`}
      </div>
    </div>
  </div>
</section>
`;

  document.getElementById('btnSaveCheckin')?.addEventListener('click', async () => {
    const date = document.getElementById('ciDate')?.value || new Date().toISOString().slice(0, 10);
    const notes = document.getElementById('ciNotes')?.value || '';

    const payload = {
      date,
      closeness: Number(document.getElementById('ciCloseness')?.value || 7),
      freedom: Number(document.getElementById('ciFreedom')?.value || 7),
      trust: Number(document.getElementById('ciTrust')?.value || 7),
      support: Number(document.getElementById('ciSupport')?.value || 7),
      communication: Number(document.getElementById('ciCommunication')?.value || 7),
      cohabitation: Number(document.getElementById('ciCohabitation')?.value || 7),
      notes,
      createdAt: new Date().toISOString(),
    };

    await db.checkins.add(payload);
    toast('Saved');
    render();
  });
}

function checkinForm() {
  const today = new Date().toISOString().slice(0, 10);
  return `
  < div class="label" > Дата</div >
    <input class="input" id="ciDate" type="date" value="${today}" />

    ${rangeRow('Близость', 'ciCloseness', 7)}
    ${rangeRow('Свобода', 'ciFreedom', 7)}
    ${rangeRow('Доверие', 'ciTrust', 7)}
    ${rangeRow('Опора', 'ciSupport', 7)}
    ${rangeRow('Качество общения', 'ciCommunication', 7)}
    ${rangeRow('Комфорт быта', 'ciCohabitation', 7)}

    <div class="label">Заметки (итог разговоров)</div>
    <textarea class="textarea" id="ciNotes" placeholder="Что было хорошо? Что улучшаем в следующем месяце?"></textarea>
`;
}

function rangeRow(label, id, val) {
  return `
  < div class="slider-row" >
      <div class="slider-row__label">${escapeHtml(label)}</div>
      <div class="slider-row__track">
        <input type="range" min="1" max="10" value="${val}" id="${id}" />
      </div>
      <div class="slider-row__value" id="${id}Val">${val}</div>
    </div >
  `;
}

function checkinCard(ci) {
  const nums = [ci.closeness, ci.freedom, ci.trust, ci.support, ci.communication, ci.cohabitation].map(n => Number(n || 0));
  const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
  const labels = ['Близ.', 'Своб.', 'Дов.', 'Опора', 'Общ.', 'Быт'];

  return `
  < div class="quote" >
      <div class="quote__meta">${escapeHtml(ci.date || '')} · avg <span class="mono">${avg.toFixed(1)}</span></div>
      <div class="metric-bars">
        ${nums.map((n, i) => `
          <div class="metric-bar">
            <div class="metric-bar__label">${labels[i]}</div>
            <div class="metric-bar__fill" style="background: linear-gradient(to top, rgba(155,109,255,${n / 14}) ${n * 10}%, var(--glass2) ${n * 10}%);border-radius:var(--r-sm);"></div>
            <div class="metric-bar__value">${n}</div>
          </div>
        `).join('')}
      </div>
      ${ci.notes ? `<div class="hr"></div><div class="quote__text">${escapeHtml(ci.notes)}</div>` : ''}
<div class="row end" style="margin-top:10px;">
  <button class="btn sm danger" data-act="del-checkin" data-id="${ci.id}">✕ Delete</button>
</div>
    </div >
  `;
}

// ------------ Sparkline SVG for Checkins trend ------------
function buildSparkline(items) {
  const sorted = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const avgs = sorted.map(ci => {
    const nums = [ci.closeness, ci.freedom, ci.trust, ci.support, ci.communication, ci.cohabitation].map(n => Number(n || 0));
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  });
  if (avgs.length < 2) return '';
  const w = 300, h = 80, pad = 12;
  const min = Math.min(...avgs) - 0.5, max = Math.max(...avgs) + 0.5;
  const pts = avgs.map((v, i) => {
    const x = pad + (i / (avgs.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  const dots = pts.map(p => `< circle cx = "${p[0].toFixed(1)}" cy = "${p[1].toFixed(1)}" r = "3" class="sparkline-dot" /> `).join('');
  return `< svg class="sparkline" viewBox = "0 0 ${w} ${h}" preserveAspectRatio = "none" >
    <defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="var(--violet)"/><stop offset="100%" stop-color="var(--cyan)"/></linearGradient>
    <linearGradient id="sparkGradArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--violet)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--violet)" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" class="sparkline-area"/>
    <path d="${line}" class="sparkline-line"/>
    ${dots}
  </svg > `;
}

async function renderGallery() {
  const photos = await db.photos.orderBy('createdAt').reverse().toArray();

  appEl.innerHTML = `
  < section class="section" >
    <div class="row between">
      <div>
        <div class="h1">◐ Gallery</div>
        <p class="sub">Совместные фото. Хранение — локально в браузере.</p>
      </div>
      <label class="btn primary" style="cursor:pointer;">
        + Добавить фото
        <input type="file" id="photoInput" accept="image/*" multiple style="display:none" />
      </label>
    </div>
    </section >

  <section class="section">
    ${photos.length ? `
        <div class="gallery">
          ${photos.map(p => galleryItem(p)).join('')}
        </div>
      ` : `
        <div class="notice">
          Пока нет фоток. Нажми <b>Добавить фото</b> и загрузи пару кадров.
        </div>
      `}
  </section>

    ${photoModal()}
`;

  document.getElementById('photoInput')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const f of files) {
      const thumb = await makeThumbnail(f);
      await db.photos.add({
        createdAt: new Date().toISOString(),
        takenAt: null,
        caption: '',
        tags: [],
        mime: f.type || 'image/*',
        blob: f,
        thumb,
      });
    }

    toast('Photos added');
    render();
  });

  wireGallery();
}

function galleryItem(p) {
  const cap = (p.caption || '').trim();
  return `
  < div class="gimg" data - photo="${p.id}" >
    <img src="${escapeHtml(p.thumb || '')}" alt="" />
      ${cap ? `<div class="gimg__cap">${escapeHtml(cap)}</div>` : ''}
    </div >
  `;
}

function photoModal() {
  return `
  < div class="modal" id = "photoModal" >
    <div class="modal__panel">
      <div class="modal__head">
        <div class="mono small" id="pmTitle">photo</div>
        <div class="row gap-sm">
          <button class="btn sm danger" id="pmDelete">✕ Delete</button>
          <button class="btn sm" data-close>Close</button>
        </div>
      </div>
      <div class="modal__body">
        <img id="pmImg" class="modal__img" alt="" />
        <div class="grid" style="margin-top:16px;">
          <div style="grid-column: span 8;">
            <div class="label">Подпись</div>
            <input class="input" id="pmCaption" placeholder="Что на фото?" />
          </div>
          <div style="grid-column: span 4;">
            <div class="label">Теги</div>
            <input class="input" id="pmTags" placeholder="путешествия, дом" />
          </div>
        </div>
        <div class="row end" style="margin-top:12px;">
          <button class="btn primary" id="pmSave">💾 Save</button>
        </div>
      </div>
    </div>
  </div >
  `;
}

function wireGallery() {
  const modalId = 'photoModal';
  const modal = document.getElementById(modalId);
  modal?.querySelector('[data-close]')?.addEventListener('click', () => closeModal(modalId));
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(modalId); });

  let currentId = null;
  let currentUrl = null;

  function openPhoto(id) {
    currentId = id;
    openModal(modalId);

    (async () => {
      const p = await db.photos.get(id);
      if (!p) return;

      document.getElementById('pmTitle').textContent = `photo #${id} `;
      document.getElementById('pmCaption').value = p.caption || '';
      document.getElementById('pmTags').value = (p.tags || []).join(', ');

      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(p.blob);
      document.getElementById('pmImg').src = currentUrl;
    })();
  }

  appEl.querySelectorAll('[data-photo]').forEach(el => {
    el.addEventListener('click', () => openPhoto(Number(el.getAttribute('data-photo'))));
  });

  document.getElementById('pmSave')?.addEventListener('click', async () => {
    if (!currentId) return;
    const caption = document.getElementById('pmCaption')?.value || '';
    const tagsRaw = document.getElementById('pmTags')?.value || '';
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    await db.photos.update(currentId, { caption, tags });
    toast('Saved');
    closeModal(modalId);
    render();
  });

  document.getElementById('pmDelete')?.addEventListener('click', async () => {
    if (!currentId) return;
    if (!confirm('Удалить фото?')) return;
    await db.photos.delete(currentId);
    toast('Deleted');
    closeModal(modalId);
    render();
  });
}

async function renderTimeline() {
  // Very simple объединение: quotes + checkins + photos
  const quotes = await db.quotes.toArray();
  const checkins = await db.checkins.toArray();
  const photos = await db.photos.toArray();

  const items = [];

  for (const q of quotes) {
    items.push({
      kind: 'quote',
      date: q.date || q.createdAt,
      data: q,
    });
  }
  for (const c of checkins) {
    items.push({
      kind: 'checkin',
      date: c.date || c.createdAt,
      data: c,
    });
  }
  for (const p of photos) {
    items.push({
      kind: 'photo',
      date: p.takenAt || p.createdAt,
      data: p,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  appEl.innerHTML = `
  < section class="section" >
      <div class="h1">⏤ Timeline</div>
      <p class="sub">Единая лента: цитаты, чек‑ины, фотки — в хронологическом порядке.</p>
    </section >

  <section class="section">
    <div class="timeline">
      ${items.length ? items.slice(0, 120).map(timelineCard).join('') : `<div class="notice">Пока пусто. Добавь цитаты, фото или чек‑ины.</div>`}
    </div>
  </section>
`;
}

function timelineCard(it) {
  if (it.kind === 'quote') {
    const q = it.data;
    return `< div class="tl-item kind-quote" >
      <span class="tl-badge quote">quote</span><span class="tl-date">${escapeHtml(formatDate(it.date))}</span>
      <div class="tl-content">${escapeHtml(q.text || '')}</div>
    </div > `;
  }
  if (it.kind === 'checkin') {
    const c = it.data;
    const nums = [c.closeness, c.freedom, c.trust, c.support, c.communication, c.cohabitation].map(n => Number(n || 0));
    const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
    return `< div class="tl-item kind-checkin" >
      <span class="tl-badge checkin">check‑in</span><span class="tl-date">${escapeHtml(String(c.date || it.date))} · avg ${avg.toFixed(1)}</span>
      <div class="tl-content small">Близ. ${c.closeness} · Своб. ${c.freedom} · Дов. ${c.trust} · Опора ${c.support} · Общ. ${c.communication} · Быт ${c.cohabitation}</div>
    </div > `;
  }
  if (it.kind === 'photo') {
    const p = it.data;
    const cap = (p.caption || '').trim();
    return `< div class="tl-item kind-photo" >
      <span class="tl-badge photo">photo</span><span class="tl-date">${escapeHtml(formatDate(it.date))}</span>
      <div class="tl-photo">
        <img src="${escapeHtml(p.thumb || '')}" alt="" />
        <div>
          <div class="tl-content">${escapeHtml(cap || '—')}</div>
          <div class="small">${(p.tags || []).map(t => '#' + t).join(' ')}</div>
        </div>
      </div>
    </div > `;
  }
  return '';
}

async function renderSettings() {
  const chatName = await getKV('chatName', null);
  const messagesCount = await db.messages.count();
  const quotes = await db.quotes.toArray();
  const checkins = await db.checkins.toArray();
  const photos = await db.photos.toArray();
  const plan_md = await getKV('plan_md', DEFAULT_PLAN_MD);

  appEl.innerHTML = `
  < section class="section" >
      <div class="h1">⚙ Settings</div>
      <p class="sub">Экспорт/импорт данных + сброс. Local‑first, без сервера.</p>
    </section >

  <section class="section">
    <div class="settings-section">
      <h3>📦 Export</h3>
      <p class="small">Экспортируй план, цитаты, чек‑ины, фото. Полный экспорт с фото может быть тяжёлым.</p>
      <div class="row gap-sm" style="margin-top:12px;">
        <button class="btn primary" id="btnExportLight">Export (без фото)</button>
        <button class="btn" id="btnExportFull">Export (с фото)</button>
      </div>
    </div>

    <div class="settings-section">
      <h3>📥 Import</h3>
      <div class="row gap-sm" style="margin-top:8px;">
        <label class="btn" style="cursor:pointer;">
          Import LoveOS JSON
          <input type="file" id="importLoveos" accept="application/json" style="display:none" />
        </label>
      </div>
      <p class="small" style="margin-top:8px;">Добавляет цитаты/чек‑ины/фото. Сообщения чата — отдельно (Telegram).</p>
    </div>

    <div class="settings-section">
      <h3>💬 Telegram import</h3>
      <p class="small">Chat: <span class="mono">${escapeHtml(chatName || '—')}</span> · Messages: <span class="mono">${messagesCount}</span></p>
      <div class="row gap-sm" style="margin-top:12px;">
        <button class="btn primary" id="btnImportTelegram">⇪ Import result.json</button>
        <button class="btn danger" id="btnWipeMessages">Wipe messages</button>
      </div>
    </div>

    <div class="settings-section danger-zone">
      <h3>⚠ Danger zone</h3>
      <div class="notice danger" style="margin-bottom:12px;">
        <b>Осторожно:</b> удалит <b>все</b> данные LoveOS из браузера навсегда.
      </div>
      <button class="btn danger" id="btnResetAll">🗑 RESET ALL DATA</button>
    </div>
  </section>
`;

  document.getElementById('btnImportTelegram')?.addEventListener('click', () => openImportDialog());

  document.getElementById('btnWipeMessages')?.addEventListener('click', async () => {
    if (!confirm('Удалить все сообщения из LoveOS?')) return;
    await db.messages.clear();
    toast('Messages wiped');
    render();
  });

  document.getElementById('btnResetAll')?.addEventListener('click', async () => {
    if (!confirm('Точно сбросить ВСЁ?')) return;
    await db.delete();
    location.reload();
  });

  document.getElementById('btnExportLight')?.addEventListener('click', async () => {
    const payload = {
      v: 1,
      exportedAt: new Date().toISOString(),
      plan_md,
      quotes,
      checkins,
      photos: [], // no photos
    };
    downloadJson(payload, `loveos -export -light - ${Date.now()}.json`);
  });

  document.getElementById('btnExportFull')?.addEventListener('click', async () => {
    // Convert photo blobs to base64 (may be heavy!)
    const photosFull = [];
    for (const p of photos) {
      const dataUrl = await fileToDataUrl(p.blob);
      photosFull.push({
        id: p.id,
        createdAt: p.createdAt,
        takenAt: p.takenAt,
        caption: p.caption,
        tags: p.tags,
        mime: p.mime,
        thumb: p.thumb,
        dataUrl,
      });
    }

    const payload = {
      v: 1,
      exportedAt: new Date().toISOString(),
      plan_md,
      quotes,
      checkins,
      photos: photosFull,
    };
    downloadJson(payload, `loveos -export -full - ${Date.now()}.json`);
  });

  document.getElementById('importLoveos')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const json = JSON.parse(txt);
      if (!json || json.v !== 1) throw new Error('bad export');

      if (json.plan_md) await setKV('plan_md', String(json.plan_md));

      if (Array.isArray(json.quotes)) {
        for (const q of json.quotes) {
          // add, do not duplicate by messageId+text
          await db.quotes.add({
            messageId: q.messageId ?? null,
            text: q.text || '',
            from: q.from || '',
            date: q.date || null,
            tags: q.tags || [],
            pinned: q.pinned ? 1 : 0,
            createdAt: q.createdAt || new Date().toISOString(),
          });
        }
      }

      if (Array.isArray(json.checkins)) {
        for (const c of json.checkins) {
          await db.checkins.add({
            date: c.date,
            closeness: c.closeness,
            freedom: c.freedom,
            trust: c.trust,
            support: c.support,
            communication: c.communication,
            cohabitation: c.cohabitation,
            notes: c.notes || '',
            createdAt: c.createdAt || new Date().toISOString(),
          });
        }
      }

      if (Array.isArray(json.photos) && json.photos.length) {
        for (const p of json.photos) {
          // reconstruct blob from dataUrl
          const blob = await (await fetch(p.dataUrl)).blob();
          await db.photos.add({
            createdAt: p.createdAt || new Date().toISOString(),
            takenAt: p.takenAt || null,
            caption: p.caption || '',
            tags: p.tags || [],
            mime: p.mime || blob.type,
            blob,
            thumb: p.thumb || p.dataUrl,
          });
        }
      }

      toast('Imported');
      render();
    } catch (err) {
      console.error(err);
      alert('Не удалось импортировать файл.');
    }
  });

  document.getElementById('btnImportTelegram')?.addEventListener('click', () => openImportDialog());
}

// ------------ Modals ------------
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
}

// ------------ Import Dialog ------------
function openImportDialog() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();

    if (!file) return;

    let parsed;
    try {
      parsed = await parseChatFile(file);
    } catch (e) {
      alert(e.message || 'Import failed');
      return;
    }

    await setKV('chatName', parsed.chatName || file.name);
    await setKV('participants', parsed.participants || []);

    // Save messages with progress
    const prog = document.createElement('div');
    prog.className = 'notice';
    prog.textContent = 'Importing...';
    appEl.prepend(prog);

    await saveMessages(db, parsed.messages, {
      wipe: true,
      onProgress: ({ done, total }) => {
        prog.textContent = `Importing... ${done}/${total}`;
      }
    });

    // Auto-create quotes from pinned messages
    const pinned = parsed.messages.filter(m => m.pinned);
    for (const m of pinned) {
      const existing = await db.quotes.where('messageId').equals(m.id).first();
      if (!existing) {
        await db.quotes.add({
          messageId: m.id,
          text: m.text || '',
          from: m.from || '',
          date: m.date || null,
          tags: ['пин'],
          pinned: 1,
          createdAt: new Date().toISOString(),
        });
      }
    }

    toast('Imported!');
    render();
  });

  input.click();
}

// ------------ Export helper ------------
function downloadJson(obj, filename) {
  const data = JSON.stringify(obj, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------ Router ------------
async function render() {
  state.route = routeFromHash();
  setActiveNav(state.route);

  switch (state.route) {
    case 'home': return renderHome();
    case 'plan': return renderPlan();
    case 'quotes': return renderQuotes();
    case 'messages': return renderMessages();
    case 'checkins': return renderCheckins();
    case 'gallery': return renderGallery();
    case 'timeline': return renderTimeline();
    case 'settings': return renderSettings();
    default:
      location.hash = '#/home';
  }
}

window.addEventListener('hashchange', render);

await ensureSeed();
await render();

// Small dynamic: range value labels update
document.addEventListener('input', (e) => {
  const id = e.target?.id;
  if (!id) return;
  if (id.startsWith('ci')) {
    const label = document.getElementById(id + 'Val');
    if (label) label.textContent = e.target.value;
  }
});

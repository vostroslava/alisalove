export function startParticles(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const state = {
    w: 0, h: 0,
    particles: [],
    mouse: { x: -9999, y: -9999 },
    running: true,
    last: performance.now(),
  };

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.w = Math.floor(window.innerWidth);
    state.h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(state.w * dpr);
    canvas.height = Math.floor(state.h * dpr);
    canvas.style.width = state.w + 'px';
    canvas.style.height = state.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(n = 120) {
    state.particles = Array.from({ length: n }, () => ({
      x: rand(0, state.w),
      y: rand(0, state.h),
      vx: rand(-0.12, 0.12),
      vy: rand(-0.35, -0.08),
      r: rand(0.6, 2.0),
      a: rand(0.05, 0.16),
    }));
  }

  function step(t) {
    if (!state.running) return;
    const dt = Math.min(0.032, (t - state.last) / 1000);
    state.last = t;

    ctx.clearRect(0, 0, state.w, state.h);

    // subtle vignette
    const g = ctx.createRadialGradient(state.w*0.5, state.h*0.6, 50, state.w*0.5, state.h*0.6, Math.max(state.w, state.h));
    g.addColorStop(0, 'rgba(255,255,255,0.03)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,state.w,state.h);

    for (const p of state.particles) {
      // antigravity drift
      p.x += p.vx * (60 * dt);
      p.y += p.vy * (60 * dt);

      // mouse repulsion
      const dx = p.x - state.mouse.x;
      const dy = p.y - state.mouse.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < 180*180) {
        const d = Math.sqrt(d2) + 0.001;
        const push = (1 - d / 180);
        p.x += (dx / d) * push * 8;
        p.y += (dy / d) * push * 8;
      }

      // wrap
      if (p.x < -20) p.x = state.w + 20;
      if (p.x > state.w + 20) p.x = -20;
      if (p.y < -30) p.y = state.h + 30;
      if (p.y > state.h + 30) p.y = -30;

      // draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  function onMove(e) {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
  }
  function onLeave() {
    state.mouse.x = -9999;
    state.mouse.y = -9999;
  }

  resize();
  spawn(Math.min(180, Math.floor(state.w * state.h / 12000)));
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseleave', onLeave);

  requestAnimationFrame(step);

  return () => {
    state.running = false;
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseleave', onLeave);
  };
}

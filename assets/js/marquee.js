/* El nombre en el pie: corre solo, se puede arrastrar y lanzar, sigue al scroll,
   y cuanto más rápido va, más se estira (estirar y encoger, como en animación).
   Todo con transform: no recalcula el layout ni mueve nada alrededor.
   Tiene su botón de pausa. Sin JS o con movimiento reducido queda quieto. */

const BASE = 70;        // px por segundo en reposo
const MAX_THROW = 2600; // px por segundo
const STRETCH = 0.22;   // cuánto se estira a máxima velocidad

export function initMarquee({ gsap, Observer, ScrollTrigger }) {
  const wrap = document.querySelector('[data-marquee]');
  const track = wrap && wrap.querySelector('[data-marquee-track]');
  const first = track && track.firstElementChild;
  if (!first) return undefined;
  const footer = wrap.closest('footer') || wrap;
  const pauseBtn = document.querySelector('[data-marquee-pause]');
  const { clamp, wrap: loopAround } = gsap.utils;

  wrap.classList.add('is-live'); // primero: en movimiento el nombre usa su tamaño grande, y así se mide

  let loop = 1; // ancho de una vuelta (un nombre con su punto)
  let clones = [];
  const build = () => {
    clones.forEach((c) => c.remove());
    clones = [];
    loop = first.getBoundingClientRect().width || 1;
    const copies = Math.ceil((window.innerWidth * 1.2) / loop) + 1;
    for (let i = 0; i < copies; i += 1) {
      const clone = first.cloneNode(true);
      track.appendChild(clone);
      clones.push(clone);
    }
  };
  track.style.transform = 'none';
  build();

  let x = 0;         // posición en unidades de la pista sin estirar
  let extra = 0;     // velocidad sumada por el scroll o por un lanzamiento
  let dir = -1;      // hacia dónde deriva en reposo
  let scale = 1;
  let dragging = false;
  let dragSpeed = 0;
  let paused = false;
  let visible = false;

  const tick = (time, deltaTime) => {
    if (!visible) return;
    const dt = Math.min(deltaTime || 16.7, 64) / 1000;
    let speed;
    if (dragging) {
      speed = dragSpeed;
      dragSpeed *= Math.exp(-dt * 12);
    } else {
      extra *= Math.exp(-dt * 2.4);
      if (Math.abs(extra) < 1) extra = 0;
      speed = (paused ? 0 : BASE * dir) + extra;
      x += (speed * dt) / scale;
    }
    const target = 1 + STRETCH * clamp(0, 1, (Math.abs(speed) - BASE) / 1100);
    scale += (target - scale) * (1 - Math.exp(-dt * 9));
    x = loopAround(-loop, 0, x);
    track.style.transform = `translate3d(${(x * scale).toFixed(2)}px, 0, 0) scaleX(${scale.toFixed(4)})`;
  };
  gsap.ticker.add(tick);

  const st = ScrollTrigger.create({
    trigger: footer,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { visible = self.isActive; },
    onUpdate: (self) => {
      if (dragging) return;
      const v = clamp(-MAX_THROW, MAX_THROW, -self.getVelocity() * 0.4);
      if (Math.abs(v) > Math.abs(extra)) extra = v;
      if (Math.abs(v) > 60) dir = v < 0 ? -1 : 1;
    },
  });
  visible = st.isActive;

  const observer = Observer.create({
    target: wrap,
    type: 'touch,pointer',
    dragMinimum: 4,
    lockAxis: true,
    onDragStart: () => { dragging = true; extra = 0; wrap.classList.add('is-dragging'); },
    onDrag: (self) => {
      if (self.axis === 'y') return;
      x += self.deltaX / scale;
      dragSpeed = self.velocityX;
    },
    onDragEnd: (self) => {
      dragging = false;
      wrap.classList.remove('is-dragging');
      if (self.axis === 'y') return;
      extra = clamp(-MAX_THROW, MAX_THROW, self.velocityX);
      if (Math.abs(extra) > 60) dir = extra < 0 ? -1 : 1;
    },
  });

  const onPause = () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Reanudar el nombre' : 'Pausar el nombre';
  };
  if (pauseBtn) {
    pauseBtn.hidden = false;
    pauseBtn.addEventListener('click', onPause);
  }

  const rebuild = () => { track.style.transform = 'none'; build(); };
  ScrollTrigger.addEventListener('refreshInit', rebuild);

  return () => {
    gsap.ticker.remove(tick);
    ScrollTrigger.removeEventListener('refreshInit', rebuild);
    observer.kill();
    st.kill();
    clones.forEach((c) => c.remove());
    wrap.classList.remove('is-live', 'is-dragging');
    track.style.removeProperty('transform');
    if (pauseBtn) {
      pauseBtn.removeEventListener('click', onPause);
      pauseBtn.hidden = true;
      pauseBtn.setAttribute('aria-pressed', 'false');
      pauseBtn.textContent = 'Pausar el nombre';
    }
  };
}

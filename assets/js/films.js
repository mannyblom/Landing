/* Films: un carrete horizontal de piezas verticales.
   - Escritorio: la sección queda fija y el scroll (o arrastrar) mueve el carrete de lado.
   - Tablet, teléfono, sin JS o con movimiento reducido: es una fila que se desliza con el dedo.
   Cada video corre solo mientras su cuadro está en pantalla; hay un botón para pausarlos todos.
   Las piezas se leen del HTML: sumar un <li class="film"> alcanza. */
import { addResolver } from './targets.js';
import { cursorLabel } from './cursor.js';

const RATIO = 0.85; // px de scroll vertical por cada px que avanza el carrete

const play = (video) => {
  video.muted = true;
  const started = video.play();
  if (started && started.catch) started.catch(() => {});
};

export function initFilms({ gsap, ScrollTrigger, Observer, pinned, fine }) {
  const section = document.querySelector('[data-films]');
  const track = section && section.querySelector('[data-films-track]');
  if (!track) return undefined;

  const cards = gsap.utils.toArray('.film', track);
  const links = cards.map((card) => card.querySelector('.film__link'));
  const videos = gsap.utils.toArray('video', track);
  const pauseBtn = section.querySelector('[data-films-pause]');
  const n = cards.length;
  const pad = (v) => String(v).padStart(2, '0');
  const cleanups = [];

  /* ---------- Videos: solo corren en pantalla ---------- */
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  if (videos.length && !saveData && 'IntersectionObserver' in window) {
    let userPaused = false;
    const onScreen = new Set();
    const sync = (video) => (!userPaused && onScreen.has(video) ? play(video) : video.pause());
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) onScreen.add(entry.target); else onScreen.delete(entry.target);
        sync(entry.target);
      });
    }, { threshold: 0.35 });
    videos.forEach((video) => observer.observe(video));

    const onPause = () => {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.textContent = userPaused ? 'Reproducir videos' : 'Pausar videos';
      videos.forEach(sync);
    };
    if (pauseBtn) { pauseBtn.hidden = false; pauseBtn.addEventListener('click', onPause); }

    cleanups.push(() => {
      observer.disconnect();
      videos.forEach((video) => video.pause());
      if (pauseBtn) {
        pauseBtn.removeEventListener('click', onPause);
        pauseBtn.hidden = true;
        pauseBtn.setAttribute('aria-pressed', 'false');
        pauseBtn.textContent = 'Pausar videos';
      }
    });
  }

  /* ---------- Fila deslizable (sin fijar): no hace falta nada más ---------- */
  if (!pinned || n < 2) return () => cleanups.forEach((fn) => fn());

  /* ---------- Carrete fijo ---------- */
  const current = section.querySelector('[data-films-current]');
  const total = section.querySelector('[data-films-total]');
  const bar = section.querySelector('[data-films-bar]');
  section.classList.add('is-pinned');
  total.textContent = `/ ${pad(n)}`;
  current.textContent = pad(1);

  let travel = 0;
  const measure = () => {
    const first = cards[0];
    const last = cards[n - 1];
    // el último cuadro termina a la misma distancia del borde derecho que el primero del izquierdo
    travel = Math.max(0, last.offsetLeft + last.offsetWidth + first.offsetLeft - section.clientWidth);
    section.style.setProperty('--travel', `${Math.round(travel * RATIO)}px`);
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  gsap.set(bar, { scaleX: 1 / n });
  let shown = 1;
  const tween = gsap.to(track, {
    x: () => -travel,
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
    onUpdate() {
      const p = this.progress(); // `this` es la animación; corre también durante su creación
      gsap.set(bar, { scaleX: (1 + p * (n - 1)) / n });
      const index = Math.round(p * (n - 1)) + 1;
      if (index !== shown) { shown = index; current.textContent = pad(index); }
    },
  });
  const st = tween.scrollTrigger;

  const topOf = (card) => {
    const p = travel ? gsap.utils.clamp(0, 1, (card.offsetLeft - cards[0].offsetLeft) / travel) : 0;
    return st.start + (st.end - st.start) * p;
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const offResolver = addResolver((target) => (cards.includes(target) ? topOf(target) : null));
  const fromHash = cards.find((card) => `#${card.id}` === window.location.hash);
  if (fromHash) requestAnimationFrame(() => window.scrollTo({ top: topOf(fromHash), behavior: 'auto' }));

  // Teclado: al llegar con Tab a una pieza, el carrete la trae a la vista.
  const onFocus = (e) => {
    const i = links.indexOf(e.currentTarget);
    if (i > -1 && e.currentTarget.matches(':focus-visible')) {
      window.scrollTo({ top: topOf(cards[i]), behavior: reduce.matches ? 'auto' : 'smooth' });
    }
  };
  links.forEach((link) => link.addEventListener('focus', onFocus));

  // Arrastrar el carrete: mueve el scroll de la página, que es lo que lo hace avanzar.
  let dragged = 0;
  let glide = 0;
  const glideTick = (time, deltaTime) => {
    const dt = Math.min(deltaTime || 16.7, 64) / 1000;
    glide *= Math.exp(-dt * 4.5);
    if (Math.abs(glide) < 8) { glide = 0; gsap.ticker.remove(glideTick); return; }
    window.scrollBy(0, -glide * RATIO * dt);
  };
  const observer = Observer.create({
    target: track,
    type: 'pointer,touch',
    dragMinimum: 5,
    lockAxis: true,
    onPress: () => { dragged = 0; glide = 0; gsap.ticker.remove(glideTick); },
    onDragStart: () => section.classList.add('is-dragging'),
    onDrag: (self) => {
      if (self.axis === 'y') return;
      dragged += Math.abs(self.deltaX);
      window.scrollBy(0, -self.deltaX * RATIO);
    },
    onDragEnd: (self) => {
      section.classList.remove('is-dragging');
      if (self.axis === 'y') return;
      glide = gsap.utils.clamp(-3000, 3000, self.velocityX);
      gsap.ticker.add(glideTick);
    },
  });
  // Si hubo arrastre, el clic que lo cierra no abre el enlace.
  const onClickCapture = (e) => { if (dragged > 8) { e.preventDefault(); e.stopPropagation(); } };
  track.addEventListener('click', onClickCapture, true);

  const offCursor = fine
    ? cursorLabel({ gsap, host: section.querySelector('.films__stage'), label: section.querySelector('[data-films-cursor]'), targets: cards.map((card) => card.querySelector('.film__media')) })
    : null;

  cleanups.push(() => {
    offResolver();
    if (offCursor) offCursor();
    observer.kill();
    gsap.ticker.remove(glideTick);
    ScrollTrigger.removeEventListener('refreshInit', measure);
    track.removeEventListener('click', onClickCapture, true);
    links.forEach((link) => link.removeEventListener('focus', onFocus));
    section.classList.remove('is-pinned', 'is-dragging');
    section.style.removeProperty('--travel');
    total.textContent = '';
    current.textContent = '';
  });

  return () => cleanups.forEach((fn) => fn());
}

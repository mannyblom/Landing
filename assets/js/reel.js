/* Galería de Motion.
   - Escritorio: la sección queda fija; con el scroll los contenedores pasan de lado y el del centro
     crece. Detrás, el título del proyecto en grande: al cambiar de proyecto, sus letras salen hacia
     arriba y entran las del siguiente desde abajo. Un clic en un contenedor lateral lo trae al centro;
     en el del centro, abre el proyecto.
   - Celular: lista vertical; el contenedor que pasa por el centro de la pantalla crece y muestra su
     título detrás.
   Los videos corren solo cuando su proyecto está activo. */
import { addResolver } from './targets.js';

const SHRINK = 0.42; // cuánto se achica un contenedor lateral

const play = (video) => {
  video.muted = true;
  const p = video.play();
  if (p && p.catch) p.catch(() => {});
};

/** Ajusta el tamaño de letra para que el texto ocupe `width` px sin pasar `maxSize`. */
const fit = (el, width, maxSize) => {
  el.style.fontSize = '100px';
  const w = el.scrollWidth || 1;
  el.style.fontSize = `${Math.min(maxSize, (100 * width) / w)}px`;
};

export function initReel({ gsap, ScrollTrigger, SplitText, pinned }) {
  const section = document.querySelector('[data-reel]');
  if (!section) return undefined;
  const items = gsap.utils.toArray('.reel__item', section);
  const n = items.length;
  if (!n) return undefined;
  const links = items.map((item) => item.querySelector('.reel__link'));
  const medias = items.map((item) => item.querySelector('.reel__media'));
  const videos = items.map((item) => item.querySelector('video'));
  const current = section.querySelector('[data-reel-current]');
  const pad = (v) => String(v).padStart(2, '0');
  const cleanups = [];

  let active = -1;
  const setActive = (i, animate = true) => {
    if (i === active) return;
    const prev = active;
    active = i;
    items.forEach((item, k) => item.classList.toggle('is-active', k === i));
    videos.forEach((video, k) => { if (video) { if (k === i) play(video); else video.pause(); } });
    if (current) current.textContent = pad(i + 1);
    section.dispatchEvent(new CustomEvent('reel:change', { detail: { prev, next: i, animate } }));
  };

  /* ---------------- Celular / tablet: lista vertical ---------------- */
  if (!pinned) {
    section.classList.add('is-list');
    const bigs = items.map((item) => item.querySelector('.reel__big'));
    const refit = () => bigs.forEach((big, k) => fit(big, medias[k].parentElement.clientWidth * 0.96, 260));
    refit();
    ScrollTrigger.addEventListener('refreshInit', refit);
    items.forEach((item, k) => {
      gsap.fromTo(medias[k], { scale: 0.8 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: item, start: 'top bottom', end: 'center center', scrub: true } });
      gsap.fromTo(medias[k], { scale: 1 }, { scale: 0.8, ease: 'none', immediateRender: false, scrollTrigger: { trigger: item, start: 'center center', end: 'bottom top', scrub: true } });
      ScrollTrigger.create({
        trigger: item,
        start: 'top 55%',
        end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) setActive(k);
          else if (active === k) { item.classList.remove('is-active'); if (videos[k]) videos[k].pause(); active = -1; }
        },
      });
    });
    cleanups.push(() => {
      ScrollTrigger.removeEventListener('refreshInit', refit);
      section.classList.remove('is-list');
      items.forEach((item) => item.classList.remove('is-active'));
      bigs.forEach((big) => big.style.removeProperty('font-size'));
    });
    return () => cleanups.forEach((fn) => fn());
  }

  /* ---------------- Escritorio: carrete horizontal fijo ---------------- */
  section.classList.add('is-pinned');
  section.style.setProperty('--n', n);
  const track = section.querySelector('[data-reel-track]');
  const layer = section.querySelector('[data-reel-titles]');

  // Los títulos grandes viven en una capa detrás del carrete, uno por proyecto.
  const titles = items.map((item) => {
    const el = document.createElement('p');
    el.className = 'reel__title';
    el.textContent = item.dataset.title;
    layer.appendChild(el);
    return el;
  });
  const refit = () => titles.forEach((t) => fit(t, window.innerWidth * 0.94, window.innerHeight * 0.42));
  refit();
  const splits = titles.map((t) => SplitText.create(t, { type: 'chars', charsClass: 'reel__char' }));
  splits.forEach((sp) => gsap.set(sp.chars, { yPercent: 110 }));

  const onChange = (e) => {
    const { prev, next } = e.detail;
    if (prev > -1) gsap.to(splits[prev].chars, { yPercent: next > prev ? -110 : 110, duration: 0.5, ease: 'power3.in', stagger: 0.02, overwrite: true });
    gsap.fromTo(splits[next].chars, { yPercent: prev > next ? -110 : 110 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.03, delay: prev > -1 ? 0.18 : 0.1, overwrite: true });
  };
  section.addEventListener('reel:change', onChange);

  let step = 0; // distancia entre centros de contenedores, en px
  const measure = () => {
    step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 0;
    refit();
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  const fadeTo = items.map((item) => gsap.quickSetter(item.querySelector('.reel__meta'), 'opacity'));
  const render = (p) => {
    const pos = p * (n - 1);
    gsap.set(track, { x: -pos * step });
    items.forEach((_, k) => {
      const d = Math.min(1, Math.abs(k - pos));
      gsap.set(medias[k], { scale: 1 - SHRINK * d, opacity: 1 - 0.6 * d });
      fadeTo[k](Math.max(0, 1 - 1.6 * d));
    });
    setActive(Math.round(pos));
  };

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.7,
    snap: n > 1 ? { snapTo: 1 / (n - 1), duration: { min: 0.25, max: 0.7 }, ease: 'power2.inOut', delay: 0.08 } : false,
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => render(self.progress),
  });
  render(st.progress);

  const topOf = (k) => st.start + ((st.end - st.start) * k) / Math.max(1, n - 1);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const goTo = (k) => window.scrollTo({ top: topOf(k), behavior: reduce.matches ? 'auto' : 'smooth' });
  const offResolver = addResolver((target) => { const k = items.indexOf(target); return k < 0 ? null : topOf(k); });
  const fromHash = items.findIndex((item) => `#${item.id}` === window.location.hash);
  if (fromHash > 0) requestAnimationFrame(() => window.scrollTo({ top: topOf(fromHash), behavior: 'auto' }));

  // Un clic en un contenedor lateral lo trae al centro; el del centro abre el proyecto.
  const onClick = (e) => {
    const k = links.indexOf(e.currentTarget);
    if (k !== active) { e.preventDefault(); goTo(k); }
  };
  const onFocus = (e) => { const k = links.indexOf(e.currentTarget); if (k > -1 && e.currentTarget.matches(':focus-visible')) goTo(k); };
  links.forEach((link) => { link.addEventListener('click', onClick); link.addEventListener('focus', onFocus); });

  cleanups.push(() => {
    st.kill();
    offResolver();
    ScrollTrigger.removeEventListener('refreshInit', measure);
    section.removeEventListener('reel:change', onChange);
    links.forEach((link) => { link.removeEventListener('click', onClick); link.removeEventListener('focus', onFocus); });
    splits.forEach((sp) => sp.revert());
    layer.innerHTML = '';
    gsap.set([track, ...medias, ...items.map((item) => item.querySelector('.reel__meta'))], { clearProps: 'all' });
    section.classList.remove('is-pinned');
    section.style.removeProperty('--n');
    items.forEach((item) => item.classList.remove('is-active'));
    videos.forEach((video) => video && video.pause());
    active = -1;
  });
  return () => cleanups.forEach((fn) => fn());
}

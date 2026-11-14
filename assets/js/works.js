/* Trabajos.
   - Fija (escritorio): la sección queda en pantalla con position: sticky y el scroll pasa de un
     proyecto al siguiente: cada cuadro tapa al anterior desde abajo. Va y vuelve con la barra.
   - Apilada (tablet y teléfono): cada cuadro se abre una vez al entrar en pantalla.
   Los proyectos se leen del HTML: sumar un <li class="work"> alcanza.
   Un cuadro puede llevar <img> o <video muted loop playsinline poster="…">: el video corre solo
   mientras su proyecto está en pantalla. */

let resolver = null;

/** Posición de scroll de un proyecto cuando la sección está fija; null si no aplica. */
export function chapterTop(target) {
  return resolver ? resolver(target) : null;
}

const play = (video) => {
  if (!video) return;
  video.muted = true;
  const started = video.play();
  if (started && started.catch) started.catch(() => {});
};
const pause = (video) => { if (video) video.pause(); };

export function initWorks({ gsap, ScrollTrigger, pinned, fine }) {
  const section = document.querySelector('[data-works]');
  if (!section) return undefined;

  const items = gsap.utils.toArray('[data-work]', section);
  const n = items.length;
  if (!n) return undefined;
  const medias = items.map((item) => item.querySelector('.work__media'));
  const visuals = medias.map((m) => m.querySelector('img, video'));
  const videos = medias.map((m) => m.querySelector('video'));
  const OPEN = 'inset(0% 0% 0% 0%)';
  const SHUT = 'inset(100% 0% 0% 0%)';

  /* ---------- Apilada ---------- */
  if (!pinned || n < 2) {
    medias.forEach((media, i) => {
      const scrollTrigger = { trigger: media, start: 'top 88%', once: true };
      gsap.fromTo(media, { clipPath: SHUT }, { clipPath: OPEN, duration: 1.1, ease: 'expo.out', scrollTrigger });
      gsap.fromTo(visuals[i], { scale: 1.14 }, { scale: 1, duration: 1.5, ease: 'expo.out', scrollTrigger: { ...scrollTrigger } });
      if (videos[i]) {
        ScrollTrigger.create({
          trigger: media,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => (self.isActive ? play(videos[i]) : pause(videos[i])),
        });
      }
    });
    return () => videos.forEach(pause);
  }

  /* ---------- Fija ---------- */
  const details = items.map((item) => item.querySelector('.work__detail'));
  const links = items.map((item) => item.querySelector('.work__link'));
  const roll = section.querySelector('[data-works-roll]');
  const total = section.querySelector('[data-works-total]');
  const bar = section.querySelector('[data-works-bar]');
  const pad = (v) => String(v).padStart(2, '0');

  section.classList.add('is-pinned');
  section.style.setProperty('--n', n);
  roll.innerHTML = items.map((_, i) => `<span>${pad(i + 1)}</span>`).join('');
  total.textContent = `/ ${pad(n)}`;
  visuals.forEach((el) => { if (el.tagName === 'IMG') el.loading = 'eager'; });

  gsap.set(medias, { zIndex: (i) => i + 1 });
  gsap.set(medias.slice(1), { clipPath: SHUT });
  gsap.set(visuals.slice(1), { scale: 1.14 });
  gsap.set(details, { autoAlpha: 0, y: 14 });
  gsap.set(details[0], { autoAlpha: 1, y: 0 });
  gsap.set(bar, { scaleX: 1 / n });

  let active = -1;
  let inView = false;
  const syncVideos = () => videos.forEach((video, i) => (inView && i === active ? play(video) : pause(video)));
  const setActive = (index) => {
    if (index === active) return;
    active = index;
    items.forEach((item, i) => item.classList.toggle('is-active', i === index));
    syncVideos();
  };
  setActive(0);

  // El primer cuadro se abre desde abajo mientras la banda oscura entra en pantalla.
  gsap.fromTo(medias[0], { clipPath: SHUT }, {
    clipPath: OPEN,
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top 82%', end: 'top 12%', scrub: 0.6 },
  });
  gsap.fromTo(visuals[0], { scale: 1.14 }, {
    scale: 1,
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top 82%', end: 'top top', scrub: 0.6 },
  });

  // Una unidad de tiempo por proyecto. El cambio ocupa la mitad; el resto, el cuadro queda quieto.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate() { setActive(Math.min(n - 1, Math.floor(tl.time() + 0.5))); },
  });
  for (let i = 1; i < n; i += 1) {
    const t = i - 1;
    tl.to(medias[i], { clipPath: OPEN, duration: 0.5, ease: 'power2.inOut' }, t + 0.25)
      .to(visuals[i], { scale: 1, duration: 0.6, ease: 'power2.out' }, t + 0.25)
      .to(visuals[i - 1], { yPercent: -5, duration: 0.5 }, t + 0.25)
      .to(details[i - 1], { autoAlpha: 0, y: -10, duration: 0.14, ease: 'power1.in' }, t + 0.36)
      .to(details[i], { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, t + 0.52)
      .to(roll, { yPercent: (-100 * i) / n, duration: 0.3, ease: 'power2.inOut' }, t + 0.35)
      .to(bar, { scaleX: (i + 1) / n, duration: 0.5 }, t + 0.25);
  }
  tl.to({}, { duration: 0.001 }, n - 1 - 0.001); // el timeline dura exactamente n - 1

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.6,
    animation: tl,
  });
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { inView = self.isActive; syncVideos(); },
  });

  const topOf = (i) => st.start + ((st.end - st.start) * i) / (n - 1);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const goTo = (i) => window.scrollTo({ top: topOf(i), behavior: reduce.matches ? 'auto' : 'smooth' });

  // Enlaces a #trabajo-… (las filas de Servicios) y la carga con ese ancla en la URL.
  resolver = (target) => {
    const i = items.indexOf(target);
    return i < 0 ? null : topOf(i);
  };
  const fromHash = items.findIndex((item) => `#${item.id}` === window.location.hash);
  if (fromHash > 0) requestAnimationFrame(() => window.scrollTo({ top: topOf(fromHash), behavior: 'auto' }));

  // Teclado: al llegar con Tab a un título, la página va a ese proyecto.
  const onFocus = (e) => {
    const i = links.indexOf(e.currentTarget);
    if (i > -1 && e.currentTarget.matches(':focus-visible')) goTo(i);
  };
  links.forEach((link) => link.addEventListener('focus', onFocus));

  // Mouse: el cuadro abre el proyecto que se está viendo, con una etiqueta que sigue al puntero.
  const onFrameClick = () => {
    const link = links[active];
    if (link) window.open(link.href, '_blank', 'noopener');
  };
  medias.forEach((media) => media.addEventListener('click', onFrameClick));

  let offCursor = null;
  if (fine) {
    const cursor = section.querySelector('[data-works-cursor]');
    const grid = section.querySelector('.works__grid');
    section.classList.add('has-cursor');
    gsap.set(cursor, { autoAlpha: 0, scale: 0.7, transformOrigin: '0% 0%' });
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
    const place = (e, jump) => {
      const r = grid.getBoundingClientRect();
      const x = e.clientX - r.left + 16;
      const y = e.clientY - r.top + 18;
      if (jump) { xTo(x, x); yTo(y, y); } else { xTo(x); yTo(y); }
    };
    const onEnter = (e) => { place(e, true); gsap.to(cursor, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power3.out', overwrite: 'auto' }); };
    const onMove = (e) => place(e, false);
    const onLeave = () => gsap.to(cursor, { autoAlpha: 0, scale: 0.7, duration: 0.2, ease: 'power2.in', overwrite: 'auto' });
    medias.forEach((media) => {
      media.addEventListener('pointerenter', onEnter);
      media.addEventListener('pointermove', onMove, { passive: true });
      media.addEventListener('pointerleave', onLeave);
    });
    offCursor = () => {
      section.classList.remove('has-cursor');
      medias.forEach((media) => {
        media.removeEventListener('pointerenter', onEnter);
        media.removeEventListener('pointermove', onMove);
        media.removeEventListener('pointerleave', onLeave);
      });
    };
  }

  return () => {
    resolver = null;
    videos.forEach(pause);
    if (offCursor) offCursor();
    links.forEach((link) => link.removeEventListener('focus', onFocus));
    medias.forEach((media) => media.removeEventListener('click', onFrameClick));
    items.forEach((item) => item.classList.remove('is-active'));
    section.classList.remove('is-pinned');
    section.style.removeProperty('--n');
    roll.innerHTML = '';
    total.textContent = '';
  };
}

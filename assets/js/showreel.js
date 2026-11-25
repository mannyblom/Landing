/* Video horizontal de borde a borde.
   - Reproducción: corre solo mientras se ve; tiene botón Pausar / Reproducir. Con "reducir
     movimiento" no arranca solo (queda el póster y el botón). Sin JavaScript, controles del navegador.
   - Animación: al acercarse, el cuadro arranca dentro de los márgenes de la página, con esquinas
     redondeadas, y se abre hasta ocupar todo el ancho; el video se acomoda de un leve zoom. */

export function initShowreelPlayback() {
  const section = document.querySelector('[data-showreel]');
  const video = section && section.querySelector('video');
  const toggle = section && section.querySelector('[data-showreel-toggle]');
  if (!video || !toggle) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = reduce.matches;
  let inView = false;

  video.controls = false;
  toggle.hidden = false;
  const label = () => {
    toggle.textContent = userPaused ? 'Reproducir' : 'Pausar';
    toggle.setAttribute('aria-pressed', String(userPaused));
  };
  const sync = () => {
    if (inView && !userPaused) {
      video.muted = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    } else video.pause();
  };
  label();
  toggle.addEventListener('click', () => { userPaused = !userPaused; label(); sync(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0.25 }).observe(video);
  } else { inView = true; sync(); }
}

export function initShowreelMotion({ gsap }) {
  const section = document.querySelector('[data-showreel]');
  if (!section) return undefined;
  const frame = section.querySelector('.showreel__frame');
  const video = section.querySelector('video');
  const gut = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gut')) || 24;
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 0.8, invalidateOnRefresh: true },
  });
  tl.fromTo(frame, { clipPath: () => `inset(0px ${gut() + window.innerWidth * 0.08}px round 24px)` }, { clipPath: 'inset(0px 0px round 0px)', ease: 'none' }, 0)
    .fromTo(video, { scale: 1.2 }, { scale: 1, ease: 'none' }, 0);
  return () => {
    if (tl.scrollTrigger) tl.scrollTrigger.kill();
    tl.kill();
    gsap.set([frame, video], { clearProps: 'all' });
  };
}

/* Hero de Motion: las letras suben, las formas aparecen girando desde el centro, siguen apenas al
   puntero y se dispersan cuando el hero sale de pantalla. Las formas cambian de círculo a cuadrado
   redondeado al pasar el mouse (eso lo hace el CSS). */

export function initMotionHero({ gsap, SplitText, ScrollTrigger, fine }) {
  const root = document.documentElement;
  const hero = document.querySelector('[data-motion-hero]');
  if (!hero) return undefined;

  const word = hero.querySelector('.mhero__word');
  const sub = hero.querySelector('.mhero__sub');
  const shapes = gsap.utils.toArray('.shape', hero);
  const rises = gsap.utils.toArray('[data-rise]', hero);
  const split = SplitText.create(word, { type: 'chars', charsClass: 'mchar' });
  const mid = (shapes.length - 1) / 2;

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => root.classList.add('is-entered') });
  tl.from(split.chars, { yPercent: 115, duration: 1.1, stagger: 0.06 }, 0)
    .from(sub, { autoAlpha: 0, y: 12, duration: 0.7, ease: 'power3.out' }, 0.45)
    .from(shapes, {
      scale: 0.3,
      rotation: (i) => (i - mid) * 18,
      autoAlpha: 0,
      duration: 1.1,
      ease: 'back.out(1.5)',
      stagger: { each: 0.08, from: 'center' },
    }, 0.3)
    .from(rises, { autoAlpha: 0, y: 14, duration: 0.7, stagger: 0.09, ease: 'power3.out' }, 0.75);
  root.classList.add('is-ready');

  // Al salir el hero, las formas se separan y giran un poco (va y vuelve con el scroll).
  const drift = gsap.to(shapes, {
    yPercent: (i) => (i % 2 ? -14 : 10),
    rotation: (i) => (i - mid) * 6,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
  });

  // Con mouse: cada forma sigue al puntero con una intensidad distinta.
  let offPointer = null;
  if (fine) {
    const movers = shapes.map((el, i) => ({
      x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3' }),
      k: 6 + ((i * 7) % 5) * 3,
    }));
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      movers.forEach((m) => { m.x(nx * m.k * 2); m.y(ny * m.k * 2); });
    };
    const onLeave = () => movers.forEach((m) => { m.x(0); m.y(0); });
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    offPointer = () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }

  return () => {
    if (offPointer) offPointer();
    tl.kill();
    if (drift.scrollTrigger) drift.scrollTrigger.kill();
    drift.kill();
    gsap.set(shapes, { clearProps: 'all' });
    split.revert();
  };
}

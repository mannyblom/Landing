/* Punto de entrada. La página está completa sin este archivo: el movimiento solo se suma.
   GSAP (gsap, ScrollTrigger, SplitText, Observer) se carga antes, desde assets/vendor/gsap-3.15.1. */
import { initNav } from './nav.js';
import { initClock } from './clock.js';
import { initContact } from './contact.js';
import { initAnchors } from './anchors.js';
import { initHero } from './hero.js';
import { initMotionHero } from './motion-hero.js';
import { initTransition } from './transition.js';
import { initFilms } from './films.js';
import { initWorks } from './works.js';
import { initStatement } from './statement.js';
import { initMarquee } from './marquee.js';

const root = document.documentElement;
const { gsap, ScrollTrigger, SplitText, Observer } = window;
const ready = () => root.classList.add('is-ready');
// Sin movimiento nada arranca solo: los videos quedan en su póster (los de Motion, con controles).
const still = () => {
  ready();
  document.querySelectorAll('.work__media video').forEach((video) => { video.controls = true; });
};

initNav(gsap);
initTransition(gsap);
initClock();
initContact();
initAnchors();

if (!gsap || !ScrollTrigger || !SplitText || !Observer) {
  still();
} else {
  gsap.registerPlugin(ScrollTrigger, SplitText, Observer);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const MOTION = '(prefers-reduced-motion: no-preference)';
  const FINE = '(hover: hover) and (pointer: fine)';
  // Las secciones fijas (Films y Motion) necesitan lugar: ancho de escritorio y una ventana no muy baja.
  const WIDE = '(min-width: 1024px) and (min-height: 700px)';

  if (!window.matchMedia(MOTION).matches) still();

  // Se espera a la tipografía (máximo 1,5 s) para medir y partir el texto con la fuente real.
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));

  Promise.race([fonts, timeout]).then(() => {
    const mm = gsap.matchMedia();

    // Las secciones fijas van primero: al fijarse cambian el alto de la página y lo demás se mide después.
    mm.add({ motion: MOTION, wide: WIDE, fine: FINE }, (ctx) => {
      const { motion, wide, fine } = ctx.conditions;
      if (!motion) return undefined;
      const cleanups = [
        initFilms({ gsap, ScrollTrigger, Observer, pinned: wide, fine }),
        initWorks({ gsap, ScrollTrigger, pinned: wide, fine }),
      ];
      return () => cleanups.forEach((fn) => typeof fn === 'function' && fn());
    });

    mm.add({ motion: MOTION, fine: FINE }, (ctx) => {
      const { motion, fine } = ctx.conditions;
      if (!motion) { ready(); return undefined; }
      const cleanups = [
        initHero({ gsap, SplitText, ScrollTrigger, fine }),
        initMotionHero({ gsap, SplitText, ScrollTrigger, fine }),
        initStatement({ gsap, SplitText }),
        initMarquee({ gsap, Observer, ScrollTrigger }),
      ];
      return () => cleanups.forEach((fn) => typeof fn === 'function' && fn());
    });

    ScrollTrigger.refresh();
  });
}

/* Hero: el título entra una vez y después cada letra responde al puntero.
   Todo pasa sobre los dos ejes de Archivo: ancho (--w) y peso (--g). */

let entered = false;

const BULGE_W = 21;   // cuánto se ensancha la letra bajo el puntero (unidades del eje de ancho)
const BULGE_G = 200;  // cuánto gana de peso
const MIN_W = 62;     // límites de la tipografía
const MAX_W = 125;
const MAX_THIN = 110; // lo máximo que adelgazan las letras lejanas

export function initHero({ gsap, SplitText, ScrollTrigger, fine }) {
  const root = document.documentElement;
  const hero = document.querySelector('[data-hero]');
  if (!hero) { root.classList.add('is-ready'); return undefined; }

  const title = hero.querySelector('.hero__title');
  const lines = gsap.utils.toArray('.hero__line-in', title);
  const pills = gsap.utils.toArray('.pill', title);
  const rises = gsap.utils.toArray('[data-rise]', hero);

  const split = SplitText.create(title.querySelectorAll('.k'), {
    type: 'chars',
    charsClass: 'char',
    tag: 'span',
    aria: 'none', // el h1 ya lleva su texto en aria-label
  });
  const chars = split.chars;
  // Las letras de cada renglón: el ancho se reparte dentro del renglón, nunca entre renglones.
  const groups = lines
    .map((line) => chars.map((c, i) => (line.contains(c) ? i : -1)).filter((i) => i > -1))
    .filter((group) => group.length);

  const num = (cs, name, fallback) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };

  /* Si la ventana es baja, el cuerpo del título se achica para entrar en la primera pantalla.
     --t ensancha las letras lo justo para que el renglón siga llenando el ancho de la página. */
  const fit = () => {
    title.style.setProperty('--t', '0');
    const cs = getComputedStyle(title);
    const span = num(cs, '--fitspan', 0);
    const size = parseFloat(cs.fontSize);
    const need = title.getBoundingClientRect().width / size; // em que debe medir el renglón largo
    const t = span > 0 ? gsap.utils.clamp(0, 1, (need - num(cs, '--fit0', need)) / span) : 0;
    title.style.setProperty('--t', t.toFixed(4));
  };
  fit();
  ScrollTrigger.addEventListener('refreshInit', fit);

  const readRest = () => {
    const cs = getComputedStyle(title);
    return {
      w: num(cs, '--w0', 104) + num(cs, '--wspan', 0) * num(cs, '--t', 0),
      g: num(cs, '--g', 540),
    };
  };

  let stopPointer = null;

  /* --- Las letras responden al puntero (solo mouse o trackpad) ---
     La letra bajo el puntero se ensancha y engorda; las demás de su renglón ceden justo lo que
     ella gana, así el renglón conserva su largo y no se sale del borde de la página. */
  const startPointer = () => {
    if (!fine || stopPointer) return;
    let rest = readRest();
    let centers = [];
    let radius = 140;
    const state = chars.map(() => ({ w: rest.w, g: rest.g }));
    const target = chars.map(() => ({ w: rest.w, g: rest.g }));
    let px = -9999;
    let py = -9999;
    let running = false;

    const measure = () => {
      rest = readRest();
      radius = parseFloat(getComputedStyle(title).fontSize) * 0.8;
      const sx = window.scrollX;
      const sy = window.scrollY;
      centers = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2 + sx, y: r.top + r.height / 2 + sy };
      });
    };

    const tick = (time, deltaTime) => {
      const k = 1 - Math.exp(-(deltaTime || 16.7) / 110); // suavizado independiente de los fps
      const gainW = Math.min(BULGE_W, MAX_W - rest.w);
      let near = 0;

      groups.forEach((group) => {
        let sum = 0;
        const fall = group.map((i) => {
          const dx = px - centers[i].x;
          const dy = py - centers[i].y;
          const f = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
          sum += f;
          if (f > near) near = f;
          return f;
        });
        const others = group.length - sum; // cuántas letras quedan para ceder
        // ceden un poco más de lo que gana la vecina: el peso también ensancha la letra
        const giveW = others > 0.01 ? Math.min(rest.w - MIN_W, (sum * (gainW + 3)) / others) : 0;
        const giveG = others > 0.01 ? Math.min(MAX_THIN, (sum * BULGE_G) / others) : 0;
        group.forEach((i, j) => {
          const f = fall[j];
          target[i].w = rest.w + gainW * f - giveW * (1 - f);
          target[i].g = rest.g + BULGE_G * f - giveG * (1 - f);
        });
      });

      let moving = false;
      for (let i = 0; i < chars.length; i += 1) {
        const s = state[i];
        const t = target[i];
        s.w += (t.w - s.w) * k;
        s.g += (t.g - s.g) * k;
        if (Math.abs(t.w - s.w) > 0.05 || Math.abs(t.g - s.g) > 0.5) moving = true;
        chars[i].style.setProperty('--w', s.w.toFixed(2));
        chars[i].style.setProperty('--g', s.g.toFixed(0));
      }
      if (!moving) {
        gsap.ticker.remove(tick);
        running = false;
        if (near < 0.001) chars.forEach((c) => { c.style.removeProperty('--w'); c.style.removeProperty('--g'); });
      }
    };
    const wake = () => { if (!running) { running = true; gsap.ticker.add(tick); } };

    const onMove = (e) => { px = e.pageX; py = e.pageY; wake(); };
    const onLeave = () => { px = -9999; py = -9999; wake(); };

    measure();
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave, { passive: true });
    ScrollTrigger.addEventListener('refresh', measure);

    stopPointer = () => {
      gsap.ticker.remove(tick);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      ScrollTrigger.removeEventListener('refresh', measure);
      stopPointer = null;
    };
  };

  /* --- Las píldoras cortan al otro proyecto, como un corte de edición --- */
  const cut = (pill) => {
    pill.classList.toggle('is-b');
    gsap.fromTo(pill.querySelectorAll('img'), { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'power3.out', overwrite: true });
  };
  const onPillEnter = (e) => cut(e.currentTarget);
  if (fine) pills.forEach((p) => p.addEventListener('pointerenter', onPillEnter));

  /* --- La entrada: una sola vez por visita --- */
  if (entered) {
    root.classList.add('is-ready', 'is-entered');
    startPointer();
  } else {
    entered = true;
    const rest = readRest();
    gsap.set(lines, { yPercent: 118 });
    gsap.set(rises, { autoAlpha: 0, y: 14 });

    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete() {
        title.style.removeProperty('--w');
        title.style.removeProperty('--g');
        root.classList.add('is-entered');
        startPointer();
      },
    });

    // 1. Los renglones suben desde su máscara, angostos y pesados, y se sueltan hasta su ancho.
    tl.to(lines, { yPercent: 0, duration: 1.05, stagger: 0.09, clearProps: 'transform' }, 0)
      .fromTo(title, { '--w': Math.max(MIN_W, rest.w - 22), '--g': 680 }, { '--w': rest.w, '--g': rest.g, duration: 1.1 }, 0.05);

    // 2. Las píldoras se abren de izquierda a derecha; la palabra que sigue a una píldora corre con
    //    ella. Recorte y transform: nada cambia de tamaño, así que la página no salta.
    const gap = parseFloat(getComputedStyle(lines[0]).columnGap) || 0;
    pills.forEach((pill, i) => {
      const at = 0.3 + i * 0.14;
      const follower = pill.nextElementSibling;
      tl.fromTo(pill,
        { clipPath: 'inset(0% 100% 0% 0% round 999px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 0.95, clearProps: 'clipPath' }, at);
      if (follower) {
        tl.fromTo(follower, { x: -(pill.offsetWidth + gap) }, { x: 0, duration: 0.95, clearProps: 'transform' }, at);
      }
    });

    //    Adentro, cortes rápidos entre proyectos.
    tl.call(() => cut(pills[0]), null, 0.62)
      .call(() => pills[1] && cut(pills[1]), null, 0.8)
      .call(() => cut(pills[0]), null, 0.98)
      // 3. Después del nombre, qué hacer: el texto, los botones y los datos.
      .to(rises, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.09, ease: 'power3.out' }, 0.5);

    root.classList.add('is-ready');
  }

  return () => {
    if (stopPointer) stopPointer();
    ScrollTrigger.removeEventListener('refreshInit', fit);
    title.style.removeProperty('--t');
    pills.forEach((p) => p.removeEventListener('pointerenter', onPillEnter));
    chars.forEach((c) => { c.style.removeProperty('--w'); c.style.removeProperty('--g'); });
    split.revert();
  };
}

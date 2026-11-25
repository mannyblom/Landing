/* Archivo: grilla de todos los trabajos por año y un visor a pantalla completa.
   El mismo visor abre los proyectos de la página de Motion: sirve cualquier enlace con data-arch
   cuyo trabajo esté en el JSON #archivo-data de la página.
   - Con mouse, el cuadro reproduce su loop mientras el puntero está encima.
   - Al elegir un trabajo, el visor se abre desde ese cuadro y muestra todas sus piezas (fotos y
     clips) en una fila que se recorre con flechas, teclado, rueda o el dedo.
   Sin JavaScript, cada cuadro lleva a su publicación (Instagram o Behance). */

const BASE = 'assets/archivo/';

export function initArchive(gsap) {
  const dialog = document.querySelector('[data-viewer]');
  const dataEl = document.getElementById('archivo-data');
  if (!dialog || !dataEl || typeof dialog.showModal !== 'function') return;

  let data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  const order = Object.keys(data);
  const links = [...document.querySelectorAll('[data-arch]')].filter((l) => data[l.dataset.arch]);
  if (!links.length) return;
  const mediaOf = (tile) => tile.querySelector('.arch__media, .film__media') || tile;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const animate = () => Boolean(gsap) && !reduce.matches;

  /* ---------- Vista previa al pasar el mouse ---------- */
  links.forEach((link) => {
    const video = link.querySelector('video[data-src]');
    if (!video) return;
    link.addEventListener('pointerenter', () => {
      if (!fine.matches || reduce.matches) return;
      if (!video.src) video.src = video.dataset.src;
      video.muted = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
      link.classList.add('is-previewing');
    });
    link.addEventListener('pointerleave', () => { video.pause(); link.classList.remove('is-previewing'); });
  });

  /* ---------- Visor ---------- */
  const root = document.documentElement;
  const stage = dialog.querySelector('[data-v-stage]');
  const el = (k) => dialog.querySelector(`[data-v-${k}]`);
  const title = el('title');
  const kind = el('kind');
  const year = el('year');
  const count = el('count');
  const ig = el('link');
  let current = null;
  let from = null; // el cuadro desde el que se abrió
  let slides = [];
  let index = 0;
  let observer = null;

  const inset = (rect) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return `inset(${Math.max(0, rect.top)}px ${Math.max(0, w - rect.right)}px ${Math.max(0, h - rect.bottom)}px ${Math.max(0, rect.left)}px round 12px)`;
  };

  const updateCount = () => { count.textContent = `${index + 1} / ${slides.length}`; };

  // Cada trabajo se ve siempre desde su primera pieza. El salto es instantáneo: corta cualquier
  // desplazamiento suave que haya quedado en curso.
  const toStart = () => {
    stage.scrollTo({ left: 0, behavior: 'instant' });
    index = 0;
    updateCount();
  };

  const fill = (slug) => {
    const work = data[slug];
    current = slug;
    title.textContent = work.title;
    kind.textContent = work.kind;
    year.textContent = work.year;
    ig.href = work.href || '#';
    ig.hidden = !work.href; // un trabajo sin publicación no muestra el enlace
    if (observer) observer.disconnect();
    stage.innerHTML = '';
    slides = work.items.map((item, i) => {
      const fig = document.createElement('figure');
      fig.className = 'viewer__slide';
      fig.style.setProperty('--r', (item.w / item.h).toFixed(4));
      const img = document.createElement('img');
      img.src = BASE + slug + '/' + item.src;
      img.width = item.w;
      img.height = item.h;
      img.alt = `${work.title}, pieza ${i + 1} de ${work.items.length}`;
      img.decoding = 'async';
      if (i > 2) img.loading = 'lazy';
      fig.appendChild(img);
      if (item.video) {
        const v = document.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = 'none';
        v.poster = img.src;
        v.dataset.src = BASE + slug + '/' + item.video;
        v.setAttribute('aria-hidden', 'true');
        fig.appendChild(v);
      }
      stage.appendChild(fig);
      return fig;
    });
    toStart();

    // Cada clip corre solo mientras su pieza se ve en el visor.
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const v = entry.target.querySelector('video');
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          if (v && !reduce.matches) {
            if (!v.src) v.src = v.dataset.src;
            const p = v.play();
            if (p && p.catch) p.catch(() => {});
          }
        } else if (v) v.pause();
      });
    }, { root: stage, threshold: [0, 0.6, 1] });
    slides.forEach((s) => observer.observe(s));
  };

  // La pieza actual es la más cerca del centro del visor.
  let raf = 0;
  stage.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const mid = stage.scrollLeft + stage.clientWidth / 2;
      let best = 0;
      slides.forEach((s, i) => { if (Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid) < Math.abs(slides[best].offsetLeft + slides[best].offsetWidth / 2 - mid)) best = i; });
      if (stage.scrollLeft < 4) best = 0;
      if (stage.scrollLeft + stage.clientWidth > stage.scrollWidth - 4) best = slides.length - 1;
      if (best !== index) { index = best; updateCount(); }
    });
  }, { passive: true });

  const goTo = (i) => {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const s = slides[index];
    stage.scrollTo({ left: s.offsetLeft - (stage.clientWidth - s.offsetWidth) / 2, behavior: reduce.matches ? 'auto' : 'smooth' });
    updateCount();
  };

  const open = (slug, tile) => {
    from = tile;
    fill(slug);
    dialog.showModal();
    root.classList.add('viewer-open');
    toStart(); // recién ahora el visor tiene medidas: antes de abrirse, el navegador ignora el scroll
    if (animate() && tile) {
      const r = mediaOf(tile).getBoundingClientRect();
      gsap.fromTo(dialog, { clipPath: inset(r) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.8, ease: 'expo.inOut', clearProps: 'clipPath' });
      gsap.fromTo(slides, { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.35 });
      gsap.fromTo(dialog.querySelectorAll('.viewer__bar > *, .viewer__foot > *'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05, delay: 0.45 });
    }
    stage.focus({ preventScroll: true });
  };

  const close = () => {
    const finish = () => {
      if (observer) observer.disconnect();
      stage.querySelectorAll('video').forEach((v) => v.pause());
      toStart();
      dialog.close();
      root.classList.remove('viewer-open');
      if (from) from.focus({ preventScroll: true });
    };
    if (animate() && from) {
      const r = mediaOf(from).getBoundingClientRect();
      gsap.to(dialog, { clipPath: inset(r), duration: 0.6, ease: 'expo.inOut', onComplete: () => { gsap.set(dialog, { clearProps: 'clipPath' }); finish(); } });
    } else finish();
  };

  links.forEach((link) => link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // abrir en otra pestaña sigue yendo a la publicación
    e.preventDefault();
    open(link.dataset.arch, link);
  }));
  el('close').addEventListener('click', close);
  el('prev').addEventListener('click', () => goTo(index - 1));
  el('next').addEventListener('click', () => goTo(index + 1));
  el('next-work').addEventListener('click', () => {
    const next = order[(order.indexOf(current) + 1) % order.length];
    from = links.find((l) => l.dataset.arch === next) || from;
    if (animate()) {
      gsap.to(slides, { autoAlpha: 0, x: -60, duration: 0.35, ease: 'power2.in', stagger: 0.03, onComplete: () => {
        fill(next);
        gsap.fromTo(slides, { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 });
      } });
    } else fill(next);
  });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Escape
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  });
  // La rueda vertical también recorre la fila.
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { stage.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
}

/* Aparición de la grilla al bajar (solo con movimiento permitido). */
export function initArchiveMotion({ gsap, ScrollTrigger, SplitText }) {
  const section = document.querySelector('#archivo');
  if (!section) return undefined;
  const years = [...section.querySelectorAll('.arch__y')];
  const splits = years.map((y) => SplitText.create(y, { type: 'chars', charsClass: 'arch__char', mask: 'chars' }));
  const triggers = [];
  splits.forEach((sp, i) => {
    gsap.set(sp.chars, { yPercent: 110 });
    triggers.push(ScrollTrigger.create({
      trigger: years[i],
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(sp.chars, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.07 }),
    }));
  });
  const tiles = [...section.querySelectorAll('.arch__media')];
  gsap.set(tiles, { clipPath: 'inset(100% 0% 0% 0%)' });
  const batch = ScrollTrigger.batch(tiles, {
    start: 'top 92%',
    once: true,
    onEnter: (els) => gsap.to(els, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out', stagger: 0.08 }),
  });
  return () => {
    triggers.forEach((t) => t.kill());
    batch.forEach((t) => t.kill());
    splits.forEach((sp) => sp.revert());
    gsap.set(tiles, { clearProps: 'clipPath' });
  };
}

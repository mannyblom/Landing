/* Transición entre las dos páginas (Film y Motion): una cortina del color de la página de destino
   sube, con el nombre de la página, y al llegar se va hacia arriba. Solo en enlaces con data-wipe.
   Sin GSAP, con movimiento reducido o abriendo en otra pestaña, el enlace funciona normal. */

const INK = { '#0a0a0a': '#dedad3', '#dedad3': '#0a0a0a' };

export function initTransition(gsap) {
  const root = document.documentElement;
  const layer = document.querySelector('[data-wipe-layer]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!layer) return;

  const word = document.createElement('span');
  word.className = 'wipe__word';
  layer.appendChild(word);

  // Llegada: la página arrancó tapada (lo decide un script en el <head>); se destapa.
  if (root.classList.contains('is-wiping')) {
    word.textContent = root.dataset.wipeLabel || '';
    if (gsap) {
      gsap.fromTo(layer, { yPercent: 0 }, {
        yPercent: -100,
        duration: 0.8,
        delay: 0.1,
        ease: 'expo.inOut',
        onComplete() { root.classList.remove('is-wiping'); gsap.set(layer, { clearProps: 'transform' }); },
      });
      gsap.fromTo(word, { yPercent: 0 }, { yPercent: -60, duration: 0.8, delay: 0.1, ease: 'expo.inOut' });
    } else {
      root.classList.remove('is-wiping');
    }
  }

  // Salida.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-wipe]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!gsap || reduce.matches) return;
    e.preventDefault();
    const bg = link.dataset.wipe;
    const label = link.dataset.wipeLabel || (link.getAttribute('href') === '/' ? 'Film' : 'Motion');
    layer.style.background = bg;
    layer.style.color = INK[bg] || '';
    word.textContent = label;
    try { sessionStorage.setItem('wipe', label); } catch (error) { /* sin almacenamiento: solo no hay cortina al llegar */ }
    gsap.set(layer, { visibility: 'visible' });
    gsap.fromTo(layer, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.inOut', onComplete: () => { window.location.href = link.href; } });
    gsap.fromTo(word, { yPercent: 80 }, { yPercent: 0, duration: 0.6, ease: 'expo.inOut' });
  });

  // Volver con el botón "atrás" del navegador puede mostrar la página tapada desde la memoria: se limpia.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    root.classList.remove('is-wiping');
    if (gsap) gsap.set([layer, word], { clearProps: 'all' });
    layer.style.background = '';
    layer.style.color = '';
  });
}

/* Enlaces internos (#trabajos, #servicios…): desplazamiento suave si el visitante no pidió
   movimiento reducido, y el foco pasa al destino para que el teclado siga desde ahí. */
import { chapterTop } from './works.js';

export function initAnchors() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    e.preventDefault();
    const behavior = reduce.matches ? 'auto' : 'smooth';
    const top = chapterTop(target); // un proyecto dentro de la sección fija tiene su propia posición
    if (top !== null) window.scrollTo({ top, behavior });
    else target.scrollIntoView({ behavior, block: 'start' });

    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    if (e.detail > 0) { // clic o toque (con teclado, detail es 0): foco sin anillo
      target.setAttribute('data-quiet-focus', '');
      target.addEventListener('blur', () => target.removeAttribute('data-quiet-focus'), { once: true });
    }
    target.focus({ preventScroll: true });
  });
}

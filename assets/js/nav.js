/* Menú de tablet y teléfono: una hoja a pantalla completa bajo el encabezado.
   Funciona sin GSAP; con GSAP, baja como una cortina y los enlaces entran en orden. */

/* El encabezado marca la sección que se está viendo (una línea bajo su palabra). */
function initSpy() {
  const links = [...document.querySelectorAll('[data-spy]')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const sections = links.map((link) => document.getElementById(link.dataset.spy)).filter(Boolean);
  const inView = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? inView.add(entry.target.id) : inView.delete(entry.target.id)));
    const current = sections.find((section) => inView.has(section.id));
    links.forEach((link) => {
      if (current && link.dataset.spy === current.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-45% 0px -55% 0px' }); // una franja a media pantalla
  sections.forEach((section) => observer.observe(section));
}

export function initNav(gsap) {
  initSpy();
  const toggle = document.querySelector('[data-menu-toggle]');
  const sheet = document.querySelector('[data-menu]');
  if (!toggle || !sheet) return;

  const label = toggle.querySelector('.nav__toggle-label');
  const behind = [document.querySelector('main'), document.querySelector('footer')].filter(Boolean);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animate = () => Boolean(gsap) && !reduce.matches;
  let open = false;
  let tl = null;

  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Cerrar' : 'Menú';
    behind.forEach((el) => { el.inert = open; });
    document.documentElement.classList.toggle('menu-open', open);
    if (tl) tl.kill();

    if (open) {
      sheet.hidden = false;
      sheet.scrollTop = 0;
      if (animate()) {
        tl = gsap.timeline()
          .fromTo(sheet, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'expo.out' })
          .fromTo(sheet.querySelectorAll('.sheet__links a, .sheet__cta'), { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.1);
      }
    } else if (animate()) {
      tl = gsap.timeline({ onComplete: () => { sheet.hidden = true; } })
        .to(sheet, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.28, ease: 'power2.in' });
    } else {
      sheet.hidden = true;
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { setOpen(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}

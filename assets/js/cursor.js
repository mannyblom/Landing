/* Una etiqueta que sigue al puntero sobre los cuadros que abren algo ("Ver en Instagram").
   Solo con mouse o trackpad. `host` es el contenedor posicionado donde vive la etiqueta. */

export function cursorLabel({ gsap, host, label, targets }) {
  if (!host || !label || !targets.length) return () => {};
  host.classList.add('has-cursor');
  gsap.set(label, { autoAlpha: 0, scale: 0.7, transformOrigin: '0% 0%' });
  const xTo = gsap.quickTo(label, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(label, 'y', { duration: 0.35, ease: 'power3' });

  const place = (e, jump) => {
    const r = host.getBoundingClientRect();
    const x = e.clientX - r.left + 16;
    const y = e.clientY - r.top + 18;
    if (jump) { xTo(x, x); yTo(y, y); } else { xTo(x); yTo(y); }
  };
  const onEnter = (e) => {
    if (e.pointerType === 'touch') return;
    place(e, true);
    gsap.to(label, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
  };
  const onMove = (e) => { if (e.pointerType !== 'touch') place(e, false); };
  const onLeave = () => gsap.to(label, { autoAlpha: 0, scale: 0.7, duration: 0.2, ease: 'power2.in', overwrite: 'auto' });

  targets.forEach((el) => {
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
  });

  return () => {
    host.classList.remove('has-cursor');
    targets.forEach((el) => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    });
  };
}

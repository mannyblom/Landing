/* La hora de Córdoba junto al lugar, para quien escribe desde otro huso. Sin JS no aparece. */

export function initClock() {
  const el = document.querySelector('[data-clock]');
  if (!el) return;
  let format;
  try {
    format = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Cordoba',
    });
  } catch (error) {
    return;
  }
  const tick = () => { el.textContent = ` · ${format.format(new Date())}`; };
  tick();
  window.setInterval(tick, 15000);
}

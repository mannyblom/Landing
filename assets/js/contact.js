/* Contacto: el botón "Copiar mail". Sin JavaScript queda oculto; el mail se ve igual y su enlace
   abre un mail nuevo. Con JavaScript copia la dirección y avisa "Copiado" (también a lectores de pantalla). */

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Respaldo para navegadores sin permiso de portapapeles: copiar desde un campo temporal.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    field.remove();
    return ok;
  }
};

export function initContact() {
  const status = document.querySelector('[data-copy-status]');
  document.querySelectorAll('[data-copy]').forEach((button) => {
    const label = button.querySelector('[data-copy-label]') || button;
    const rest = label.textContent;
    let timer = 0;
    button.hidden = false;
    button.addEventListener('click', async () => {
      const ok = await copyText(button.dataset.copy);
      button.classList.toggle('is-done', ok);
      label.textContent = ok ? 'Copiado' : 'No se pudo copiar';
      if (status) status.textContent = ok ? `Mail copiado: ${button.dataset.copy}` : 'No se pudo copiar el mail';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        button.classList.remove('is-done');
        label.textContent = rest;
        if (status) status.textContent = '';
      }, 2200);
    });
  });
}

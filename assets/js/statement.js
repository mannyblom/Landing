/* Sobre mí: la frase descansa en gris legible y se enciende palabra por palabra
   mientras cruza la pantalla. Va y vuelve con el scroll. Una palabra toma el acento. */

export function initStatement({ gsap, SplitText }) {
  const blocks = gsap.utils.toArray('[data-highlight]');
  if (!blocks.length) return undefined;

  const splits = blocks.map((el) => {
    const cs = getComputedStyle(el);
    const rest = cs.getPropertyValue('--rest').trim() || '#696660';
    const ink = cs.color;
    const accent = cs.getPropertyValue('--accent').trim() || ink;

    const split = SplitText.create(el, { type: 'words', wordsClass: 'word', tag: 'span', aria: 'none' });
    gsap.fromTo(
      split.words,
      { color: rest },
      {
        color: (i, word) => (word.closest('em') ? accent : ink),
        ease: 'none',
        duration: 0.2,
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true },
      },
    );
    return split;
  });

  return () => splits.forEach((split) => split.revert());
}

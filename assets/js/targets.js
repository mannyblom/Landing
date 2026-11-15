/* Algunas secciones quedan fijas mientras se recorren (Films, Motion). Un destino que vive
   adentro de ellas no tiene una posición propia en la página: cada sección registra acá
   cómo calcularla, y los enlaces internos preguntan antes de desplazarse. */

const resolvers = new Set();

/** Registra una función (elemento) => posición de scroll | null. Devuelve cómo darla de baja. */
export function addResolver(fn) {
  resolvers.add(fn);
  return () => resolvers.delete(fn);
}

/** Posición de scroll para llegar a ese elemento, o null si es un destino común. */
export function resolveTop(target) {
  for (const fn of resolvers) {
    const top = fn(target);
    if (top !== null && top !== undefined) return top;
  }
  return null;
}

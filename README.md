# Manny Blom — portfolio

Sitio de una sola página: filmmaker y motion designer en Córdoba, Argentina.
HTML, CSS y JavaScript sin paso de build. Las animaciones son de [GSAP](https://gsap.com) 3.15.1.

## Verlo en tu compu

Desde esta carpeta, cualquiera de los dos:

```bash
npx serve -l 4173        # con Node
python3 -m http.server 4173
```

Y abrí <http://localhost:4173>. Al guardar un cambio, recargá la página.

## Qué hay en cada lugar

```
index.html                 todo el contenido: textos, proyectos, enlaces
404.html                   página de enlace roto
assets/css/site.css        el sistema visual (colores, tipografía, espacios) y cada sección
assets/js/main.js          enciende el movimiento según pantalla y preferencias
assets/js/hero.js          entrada del título y letras que responden al puntero
assets/js/works.js         sección Trabajos: fija en escritorio, apilada en teléfono
assets/js/statement.js     la frase de "Sobre mí" que se enciende con el scroll
assets/js/marquee.js       el nombre del pie: corre, se arrastra, se estira
assets/js/nav.js           menú del teléfono y marca de la sección actual
assets/js/anchors.js       enlaces internos con desplazamiento suave
assets/js/clock.js         la hora de Córdoba en el pie
assets/work/               imágenes (y videos) de los proyectos
assets/fonts/              Archivo variable, alojada acá
assets/vendor/gsap-3.15.1/ GSAP y sus plugins
vercel.json                caché y cabeceras para Vercel
```

## Cambiar el contenido

Todo se edita en `index.html`. Los textos están a la vista; no hay que tocar JavaScript.

### Sumar un proyecto

En la sección `<section class="works">`, copiá un `<li class="work" …>` completo, pegalo donde
quieras que aparezca y cambiá:

- `id="trabajo-…"`: un nombre corto sin espacios (sirve para enlazarlo).
- el `href` del enlace y el número (`01`, `02`…).
- el título, la línea de tipo (`work__kind`) y la descripción (`work__text`).
- la imagen o el video (abajo) y su texto alternativo (`alt`): qué se ve, en una frase.

El contador, la barra de avance y el largo del scroll se calculan solos.

### Poner un video en un proyecto

Guardá el archivo en `assets/work/` (mp4 H.264, sin audio, idealmente 6 a 12 segundos y menos
de 4 MB) y reemplazá el bloque `<picture>…</picture>` del proyecto por:

```html
<video muted loop playsinline preload="metadata"
       poster="assets/work/mi-proyecto-poster.jpg"
       src="assets/work/mi-proyecto.mp4"></video>
```

El video corre solo mientras su proyecto está en pantalla y se pausa al salir. Si quien visita
pidió "reducir movimiento" en su sistema, queda en pausa con el póster y los controles.

Si los cuadros pasan a ser 16:9, cambiá una línea en `assets/css/site.css`:
`--frame-r: 1.7778;` (dentro de `.works`).

### Imágenes

Las portadas actuales vienen de Behance (808 px de ancho). Con originales más grandes se ven
más nítidas: lo ideal es 1700 px de ancho o más, en `.avif`/`.webp` con un `.jpg` de respaldo.

### El título del inicio

El título llena el ancho de la página porque sus medidas están calculadas para ese texto
(`--fit0`, `--p10`, `--p20` y sus pares `…span` en `.hero__title`, dentro de `site.css`).
Si cambia el texto del título hay que volver a medir esos números.

## Qué se mueve y por qué

| Dónde | Qué pasa | Para qué |
|---|---|---|
| Inicio, al cargar | Los renglones suben, las letras se sueltan de angostas a su ancho, las píldoras se abren con cortes entre proyectos | Primero llega el título; después, qué hacer |
| Inicio, con el mouse | La letra bajo el puntero se ensancha y engorda; las demás ceden ese ancho | La tipografía como instrumento: es el oficio |
| Trabajos, con el scroll | La sección queda fija y cada cuadro tapa al anterior desde abajo; cambian título, ficha y contador | Cuatro proyectos en el espacio de una pantalla |
| Trabajos, con el mouse | Una etiqueta sigue al puntero sobre el cuadro | Dice a dónde lleva el clic |
| Sobre mí, con el scroll | La frase se enciende palabra por palabra | Marca el ritmo de lectura |
| Servicios, con el mouse | El nombre se ensancha y la píldora se abre | Cada servicio lleva a su proyecto |
| Pie | El nombre corre, se arrastra y se estira con la velocidad | La firma; tiene botón de pausa |

Reglas que cumple todo el movimiento:

- La página está completa sin JavaScript y con "reducir movimiento" activado: nada queda oculto.
- En teléfono y tablet la sección Trabajos no se fija: los cuadros se abren una vez al entrar.
- No hay librería de scroll suave: el scroll es el del navegador.

## Publicar

1. **GitHub.** En VS Code: panel *Source Control* → *Publish to GitHub* (pide iniciar sesión la
   primera vez y deja elegir repositorio público o privado).
2. **Vercel.** En <https://vercel.com/new>, importá ese repositorio. No hay nada que configurar:
   *Framework Preset* "Other", sin comando de build. Cada `git push` vuelve a publicar.
3. **Cuando tengas la dirección final**, en `index.html` reemplazá la imagen para compartir por su
   URL completa (`<meta property="og:image" content="https://tu-dominio/share.jpg">`) y activá la
   línea de `canonical` que está comentada al lado.

## Créditos

- Animación: [GSAP](https://gsap.com) 3.15.1 con ScrollTrigger, SplitText y Observer, bajo su
  [licencia estándar sin costo](https://gsap.com/standard-license).
- Tipografía: [Archivo](https://github.com/Omnibus-Type/Archivo), de Omnibus-Type, bajo SIL Open
  Font License 1.1 (`assets/fonts/OFL.txt`).

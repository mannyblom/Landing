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
index.html                 todo el contenido: textos, piezas, enlaces
404.html                   página de enlace roto
assets/css/site.css        el sistema visual (colores, tipografía, espacios) y cada sección
assets/js/main.js          enciende el movimiento según pantalla y preferencias
assets/js/hero.js          entrada del título y letras que responden al puntero
assets/js/archive.js       sección Archivo: grilla por año y visor de cada trabajo
assets/archivo/            fotos y clips de cada trabajo, para el visor del Archivo
assets/js/films.js         sección Films: carrete horizontal fijo en escritorio, fila deslizable en teléfono
motion.html                la página de motion design (/motion): la de Film en negativo
assets/js/transition.js    la cortina al pasar de Film a Motion
assets/js/statement.js     la frase de "Sobre mí" que se enciende con el scroll
assets/js/marquee.js       el nombre del pie: corre, se arrastra, se estira
assets/js/nav.js           menú del teléfono y marca de la sección actual
assets/js/anchors.js       enlaces internos con desplazamiento suave
assets/js/targets.js       posiciones de scroll de las piezas dentro de las secciones fijas
assets/js/cursor.js        la etiqueta que sigue al puntero sobre los cuadros
assets/js/clock.js         la hora de Córdoba en el pie
assets/js/contact.js       el botón "Copiar mail" de Contacto
assets/films/              loops, pósters y fotos de los films (de tus publicaciones de Instagram)
assets/work/               imágenes de los proyectos de motion (de tus fichas de Behance)
assets/fonts/              Archivo variable, alojada acá
assets/vendor/gsap-3.15.1/ GSAP y sus plugins
vercel.json                caché y cabeceras para Vercel
```

## Cambiar el contenido

Todo se edita en `index.html`. Los textos están a la vista; no hay que tocar JavaScript.

### Datos de contacto

Están en la sección Contacto, al final de `index.html` (`<ul class="contact">`), una fila por canal.
Cada fila tiene el texto que se ve y su enlace:

- **Mail:** `mailto:tu@mail.com?subject=…` y, en el botón de copiar, `data-copy="tu@mail.com"`.
- **WhatsApp:** `https://wa.me/5493517739150?text=…` — el número va sin `+` ni espacios; lo que
  sigue a `text=` es el mensaje que aparece escrito cuando alguien abre el chat.
- **Instagram:** el enlace al perfil.

Los botones "Escribime" del menú y del inicio llevan a esta sección. Si cambiás el mail o el
teléfono, actualizalos también en el bloque `application/ld+json` del `<head>`.

### Video de la home

Entre el inicio y el Archivo hay un video horizontal de borde a borde. Para cambiarlo, reemplazá
`assets/video/showreel.mp4` y `assets/video/showreel-poster.jpg` (la imagen que se ve mientras carga),
o cambiá `src` y `poster` en la sección `showreel` de `index.html`. Conviene H.264, sin audio y de menos
de 8 MB. Corre solo mientras se ve y tiene botón Pausar.

La página de Motion tiene su propia sección igual, entre el inicio y el Archivo, pensada para un
reel de motion. Hoy usa el mismo video de prueba: para cambiarlo, subí el reel (por ejemplo
`assets/video/reel-motion.mp4` y su póster) y cambiá `src` y `poster` en la sección `showreel` de
`motion.html`.

### Archivo

La sección Archivo (en `index.html`) muestra todos los trabajos por año. Cada uno tiene:

- un cuadro `<li class="arch__item">` dentro de su año (con `data-arch="nombre-del-trabajo"`), y
- su entrada en el bloque `<script type="application/json" id="archivo-data">`: título, tipo, año,
  enlace y la lista de piezas (`src` de la foto, `w`/`h` en px y, si es un clip, `video`).

Los archivos van en `assets/archivo/nombre-del-trabajo/` (fotos `.webp`, clips `.mp4` cortos y sin audio).

### Sumar un film

En `<section class="films">`, copiá un `<li class="film">` completo, pegalo donde quieras en el
orden y cambiá:

- `id="film-…"`: un nombre corto sin espacios (sirve para enlazarlo desde Servicios).
- el `href` (tu publicación de Instagram) y el número (`01`, `02`…).
- el título, la línea de abajo (`film__kind`) y el texto alternativo (`alt`).
- los archivos: un póster `.jpg` y un `.mp4` en `assets/films/`, o solo una foto (dejando el
  bloque `<picture>` como en Dolores Reynal). Una pieza apaisada lleva `class="film film--wide"`.

El video ideal: mp4 H.264, sin audio, 6 a 12 segundos, menos de 2 MB, con el póster sacado del
primer cuadro del loop. Los videos corren solo cuando su cuadro está en pantalla; el botón
"Pausar videos" los detiene todos.

### Página de motion (/motion)

Es la misma página que Film, en negativo. Sus proyectos están en una sección Archivo igual a la de
Film: una grilla por año y, al elegir uno, el mismo visor. Para sumar o cambiar un proyecto, en
`motion.html`:

- un `<li class="arch__item">` dentro de su año (con `data-arch="nombre-del-proyecto"`), y
- su entrada en el bloque `<script type="application/json" id="archivo-data">`, con el mismo nombre.

Las piezas del visor van en `assets/archivo/nombre-del-proyecto/` (`01.webp`, `02.webp`… con su
`w`/`h` en px; un clip suma `"video": "02.mp4"` junto a su foto). Hoy cada proyecto tiene una sola
pieza, su portada.

### Sumar un proyecto de motion (sección vieja, hoy sin uso)

Igual, en `<section class="works">`: copiá un `<li class="work" …>` completo y cambiá id,
enlace, número, textos e imagen. El contador, la barra y el largo del scroll se calculan solos.
Un proyecto de motion también acepta video: reemplazá su `<picture>` por
`<video muted loop playsinline poster="…" src="…"></video>`. Si esos cuadros pasan a ser 16:9,
cambiá `--frame-r: 1.7778;` en `.works` (en `site.css`).

### Imágenes

Los recortes actuales vienen de tus publicaciones (720 a 1440 px). Con los archivos originales
de cada campaña se ven más nítidos: lo ideal es 1700 px de ancho o más por pieza.

### El título del inicio

El título llena el ancho de la página porque sus medidas están calculadas para ese texto
(`--fit0`, `--p10`, `--p20` y sus pares `…span` en `.hero__title`, dentro de `site.css`).
Si cambia el texto del título hay que volver a medir esos números.

## Qué se mueve y por qué

| Dónde | Qué pasa | Para qué |
|---|---|---|
| Inicio, al cargar | Los renglones suben, las letras se sueltan de angostas a su ancho, las píldoras se abren con cortes entre films | Primero llega el título; después, qué hacer |
| Inicio, con el mouse | La letra bajo el puntero se ensancha y engorda; las demás ceden ese ancho | La tipografía como instrumento: es el oficio |
| Films, con el scroll | La sección queda fija y el scroll (o arrastrar) mueve el carrete de lado; los videos corren solos | Doce piezas, una al lado de la otra, sin salir de la pantalla |
| Films, con el mouse | Una etiqueta sigue al puntero ("Ver en Instagram") | Dice a dónde lleva el clic |
| Motion, con el scroll | La sección queda fija y cada cuadro tapa al anterior desde abajo; cambian título, ficha y contador | Cuatro proyectos en el espacio de una pantalla |
| Sobre mí, con el scroll | La frase se enciende palabra por palabra | Marca el ritmo de lectura |
| Servicios, con el mouse | El nombre se ensancha y la píldora se abre | Cada servicio lleva a su pieza |
| Contacto | "Copiar mail" copia la dirección y confirma con un tilde; los datos se ensanchan con el mouse | Escribir sin depender de Instagram |
| Pie | El nombre corre, se arrastra y se estira con la velocidad | La firma; tiene botón de pausa |

Reglas que cumple todo el movimiento:

- La página está completa sin JavaScript y con "reducir movimiento" activado: nada queda oculto
  y ningún video arranca solo (quedan con su póster y controles).
- En teléfono y tablet nada se fija: Films es una fila que se desliza con el dedo y los cuadros
  de Motion se abren una vez al entrar.
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

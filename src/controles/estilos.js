import { CSS_TEMA } from '../pintor/tema.js';

// Los estilos viven dentro del componente (en su shadow DOM) para que la escena
// se vea igual en Starlight, en una página de un alumno o en cualquier sitio:
// los estilos de la página no le llegan, salvo los colores, que entran a
// propósito por las variables --motor-*.

export const ESTILOS = `
${CSS_TEMA}

:host {
    display: block;
    position: relative;
}
:host([hidden]) {
    display: none;
}

/* Una grilla de tres renglones: el dibujo, los subtítulos y los controles.
   Cuando los controles flotan (o los subtítulos, en pantalla completa), van
   en el mismo renglón que el dibujo, encima de él. */
.ma-raiz {
    container-type: inline-size;
    font-family: var(--ma-fuente);
    color: var(--ma-texto);
    background: var(--ma-fondo);
    border-radius: 12px;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "escena" "subtitulo" "controles";
}

.ma-lienzo {
    grid-area: escena;
    position: relative;
    outline: none;
    overflow: hidden;
    /* Con el dedo se puede seguir bajando por la página; el pellizco para
       el zoom lo maneja el componente. Con zoom, arrastrar mueve el dibujo. */
    touch-action: pan-y;
}
[data-arrastrable] {
    cursor: grab;
    touch-action: none;
}
.ma-raiz.con-zoom .ma-lienzo {
    touch-action: none;
    cursor: grab;
}
.ma-raiz.arrastrando .ma-lienzo,
.ma-raiz.arrastrando [data-arrastrable],
.ma-raiz.con-zoom.arrastrando .ma-lienzo {
    cursor: grabbing;
}
.ma-lienzo:focus-visible {
    box-shadow: inset 0 0 0 3px var(--ma-acento);
}
.ma-lienzo svg {
    display: block;
    width: 100%;
    height: auto;
    font-family: var(--ma-fuente);
    user-select: none;
}

/* Los subtítulos van DEBAJO del dibujo y no encima: en un celular de 360px,
   encima taparían la mitad de la escena. El alto mínimo es para que la página
   no salte cada vez que aparece o desaparece uno. */
.ma-subtitulo {
    grid-area: subtitulo;
    min-height: 2.8em;
    padding: 0.35em 1em;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: clamp(15px, 2.4cqi, 28px);
    line-height: 1.35;
    text-wrap: balance;
}
.ma-raiz:not(.con-subtitulos) .ma-subtitulo,
.ma-raiz.sin-textos .ma-subtitulo,
.ma-raiz.sin-textos [data-accion="subtitulos"],
.ma-raiz:not(.con-sonidos) [data-accion="sonido"] {
    display: none;
}

/* ---- Subtítulos de reel ----
   Grandes, encima del dibujo, de a pocas palabras, con la que se está
   diciendo resaltada. Los pide el estilo (subtitulos: { modo: 'reel' }). */
.ma-raiz.subs-reel .ma-subtitulo,
:host([pantalla]) .ma-raiz.subs-reel .ma-subtitulo,
:host(:fullscreen) .ma-raiz.subs-reel .ma-subtitulo {
    grid-area: escena;
    z-index: 2;
    align-self: end;
    justify-self: center;
    max-width: 90%;
    min-height: 0;
    margin: 0 0 6%;
    padding: 0.1em 0.4em;
    background: none;
    pointer-events: none;
    font-size: calc(clamp(15px, 2.6cqi, 40px) * var(--ma-sub-tamano, 1.6));
    font-weight: var(--ma-sub-peso, 800);
    text-transform: var(--ma-sub-mayusculas, none);
    line-height: 1.15;
    letter-spacing: 0.01em;
    transform: translateY(calc(-1 * var(--ma-sub-esquiva, 0px)));
    transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.ma-raiz.subs-reel[data-sub-posicion="centro"] .ma-subtitulo { align-self: center; margin: 0; }
.ma-raiz.subs-reel[data-sub-posicion="arriba"] .ma-subtitulo { align-self: start; margin: 5% 0 0; }
.ma-raiz.subs-reel .ma-subtitulo:empty { display: none; }
/* En un celular, dentro de la página, el dibujo es chico: los subtítulos de
   reel encima lo taparían entero. Van abajo, como los comunes, pero grandes.
   En pantalla completa sí van encima (sobra alto). */
@container (max-width: 600px) {
    :host(:not([pantalla]):not(:fullscreen)) .ma-raiz.subs-reel[data-sub-posicion] .ma-subtitulo {
        grid-area: subtitulo;
        align-self: center;
        margin: 0;
        min-height: 2.6em;
        font-size: clamp(18px, 6cqi, 30px);
    }
}
.ma-reel {
    display: inline-block;
    animation: ma-entra-grupo 0.22s cubic-bezier(0.3, 1.6, 0.5, 1);
}
/* Dos nombres de animación que se turnan: así cada grupo nuevo la reinicia. */
.ma-reel[data-grupo="1"] { animation-name: ma-entra-grupo-b; }
@keyframes ma-entra-grupo { from { transform: scale(0.82); opacity: 0.4; } }
@keyframes ma-entra-grupo-b { from { transform: scale(0.82); opacity: 0.4; } }
.ma-palabra {
    display: inline-block;
    /* Lo que crece la palabra resaltada, para que no se coma el espacio. */
    margin: 0 0.06em;
    opacity: 0.55;
    transition: opacity 0.12s, transform 0.12s, color 0.12s;
}
.ma-palabra[hidden] { display: none; }
.ma-palabra.dicha { opacity: 1; }
.ma-palabra.actual {
    color: var(--ma-sub-resaltado, var(--ma-acento));
    transform: scale(1.08);
}
.ma-raiz.subs-reel[data-sub-caja="caja"] .ma-reel {
    background: color-mix(in srgb, var(--ma-fondo) 80%, transparent);
    border-radius: 0.3em;
    padding: 0.05em 0.35em;
}
/* Letras con borde y sin fondo, como en los reels: se leen sobre cualquier dibujo. */
.ma-raiz.subs-reel[data-sub-caja="contorno"] .ma-reel {
    -webkit-text-stroke: 0.14em var(--ma-fondo);
    paint-order: stroke fill;
    text-shadow: 0 0.06em 0.18em color-mix(in srgb, var(--ma-fondo) 70%, transparent);
}
@media (prefers-reduced-motion: reduce) {
    .ma-reel, .ma-palabra { animation: none; transition: none; }
    .ma-palabra.actual { transform: none; }
}

/* ---- Controles ---- */
.ma-controles {
    grid-area: controles;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    padding: 6px 8px 8px;
    border-top: 1px solid var(--ma-borde);
    background: var(--ma-superficie);
}
.ma-raiz.sin-controles .ma-controles,
.ma-raiz.sin-controles .ma-zoom {
    display: none;
}

/* Con mouse (y siempre en pantalla completa), los controles flotan sobre la
   parte de abajo del dibujo y se esconden mientras corre la animación: así
   el dibujo usa todo el lugar. Vuelven al mover el mouse, al tocar, al llegar
   con el teclado o al pausar. En un celular, fuera de la pantalla completa,
   quedan fijos abajo: no hay un mouse que pase por encima para mostrarlos. */
.ma-raiz.flotantes .ma-controles {
    grid-area: escena;
    align-self: end;
    z-index: 3;
    border-top: 0;
    padding-top: 36px;
    /* Un velo que se oscurece de a poco, sin un borde donde empieza: con dos
       paradas el ojo ve una franja. */
    background: linear-gradient(
        transparent,
        color-mix(in srgb, var(--ma-superficie) 25%, transparent) 14px,
        color-mix(in srgb, var(--ma-superficie) 60%, transparent) 30px,
        color-mix(in srgb, var(--ma-superficie) 85%, transparent) 48px,
        color-mix(in srgb, var(--ma-superficie) 92%, transparent));
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.ma-raiz.flotantes:not(.ver-controles) .ma-controles,
.ma-raiz.flotantes:not(.ver-controles) .ma-zoom {
    opacity: 0;
}
/* Al irse bajan un poquito: se van, no se apagan de golpe. */
.ma-raiz.flotantes:not(.ver-controles) .ma-controles {
    transform: translateY(8px);
}
.ma-raiz.sin-cursor,
.ma-raiz.sin-cursor .ma-lienzo,
.ma-raiz.sin-cursor [data-arrastrable] {
    cursor: none;
}

/* ---- El hilo ----
   Cuando los controles flotantes se esconden, queda una línea finita abajo:
   cuánto pasó, y puntitos donde hay un capítulo o una pregunta. Apenas se ve;
   alcanza para saber dónde se está sin tapar nada. */
.ma-hilo {
    grid-area: escena;
    align-self: end;
    position: relative;
    z-index: 2;
    height: 3px;
    margin: 0 10px 6px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--ma-texto) 18%, transparent);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
}
.ma-raiz.flotantes:not(.ver-controles):not(.sin-controles) .ma-hilo {
    opacity: 0.7;
}
.ma-hilo-avance {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--ma-acento);
    transform-origin: left;
    transform: scaleX(0);
}
.ma-hilo-marcas span {
    position: absolute;
    top: -1.5px;
    width: 6px;
    height: 6px;
    margin-left: -3px;
    border-radius: 50%;
    background: var(--ma-texto);
    opacity: 0.8;
}
/* Las preguntas, del color del acento y un poco más grandes. */
.ma-hilo-marcas span[class] {
    top: -2.5px;
    width: 8px;
    height: 8px;
    margin-left: -4px;
    background: var(--ma-acento2);
    opacity: 1;
}

/* ---- Zoom ---- */
.ma-zoom {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 3;
    display: flex;
    gap: 6px;
    transition: opacity 0.25s;
}
.ma-zoom button {
    min-width: 40px;
    height: 40px;
    padding: 0 8px;
    border: 1px solid var(--ma-borde);
    border-radius: 20px;
    background: color-mix(in srgb, var(--ma-superficie) 92%, transparent);
    color: var(--ma-texto);
    font: 700 18px/1 var(--ma-fuente);
    cursor: pointer;
}
.ma-zoom button:hover {
    border-color: var(--ma-acento);
}
.ma-zoom button:focus-visible {
    outline: 3px solid var(--ma-acento);
    outline-offset: 1px;
}
.ma-zoom [data-zoom="normal"] {
    font-size: 15px;
}
.ma-raiz:not(.con-zoom) .ma-zoom [data-zoom="normal"] {
    display: none;
}
/* Con el dedo se hace zoom pellizcando: los botones de + y − sobran y
   taparían el dibujo de un celular. Queda solo el de volver al tamaño normal. */
.ma-raiz:not(.flotantes) .ma-zoom [data-zoom="acercar"],
.ma-raiz:not(.flotantes) .ma-zoom [data-zoom="alejar"] {
    display: none;
}
/* La lupa: el botón siempre (salvo sin-lupa); su forma y su aumento, solo
   con la lupa prendida. El de volver a su lugar, solo si se corrió algo. */
.ma-zoom svg {
    width: 22px;
    height: 22px;
    vertical-align: middle;
}
.ma-zoom [data-zoom="lupa"][aria-pressed="true"] {
    background: var(--ma-acento);
    border-color: var(--ma-acento);
    color: var(--ma-fondo);
}
.ma-raiz.sin-lupa .ma-zoom [data-zoom^="lupa"],
.ma-raiz:not(.con-lupa) .ma-zoom [data-zoom="lupa-forma"],
.ma-raiz:not(.con-lupa) .ma-zoom [data-zoom="lupa-zoom"],
.ma-raiz:not(.con-arrastres) .ma-zoom [data-zoom="lugar"] {
    display: none;
}
/* En un celular, dentro de la página, los botones de arriba no se esconden
   (no hay un mouse que pase): el de la lupa quedaría tapando para siempre la
   esquina del dibujo. Ahí aparece en pantalla completa, o si ya está prendida. */
.ma-raiz:not(.flotantes):not(.con-lupa) .ma-zoom [data-zoom="lupa"] {
    display: none;
}
.ma-lupa {
    cursor: grab;
    touch-action: none;
}
.ma-lupa-asa {
    cursor: nwse-resize;
}
.ma-controles button {
    min-width: 44px;
    height: 44px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ma-texto);
    font: 600 15px/1 var(--ma-fuente);
    cursor: pointer;
}
.ma-controles button:hover {
    background: color-mix(in srgb, var(--ma-acento) 14%, transparent);
}
.ma-controles button:focus-visible,
.ma-controles input:focus-visible {
    outline: 3px solid var(--ma-acento);
    outline-offset: 1px;
}
.ma-controles button[aria-pressed="false"] {
    opacity: 0.55;
}
.ma-controles svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
}
.ma-linea {
    position: relative;
    flex: 1 1 160px;
    min-width: 120px;
    display: flex;
    align-items: center;
    height: 44px;
}
.ma-linea input {
    width: 100%;
    margin: 0;
    accent-color: var(--ma-acento);
    cursor: pointer;
}
/* Una marquita por capítulo sobre la barra. Es orientativa: la posición exacta
   del "botón" del range depende del navegador. */
.ma-marcas {
    position: absolute;
    inset: 0 8px;
    pointer-events: none;
}
.ma-marcas span {
    position: absolute;
    top: 8px;
    width: 2px;
    height: 7px;
    border-radius: 1px;
    background: var(--ma-suave);
}
/* Una pregunta: un "?" chiquito arriba de la barra. Dice "acá te van a
   preguntar algo" sin adelantar qué, y sirve para volver a esa parte. */
.ma-marcas span.pregunta {
    top: -1px;
    width: 15px;
    height: 15px;
    margin-left: -7.5px;
    border-radius: 50%;
    background: var(--ma-acento);
    color: var(--ma-fondo);
    font: 800 11px/15px var(--ma-fuente);
    text-align: center;
}
.ma-tiempo {
    font: 500 14px/1 var(--ma-fuente);
    font-variant-numeric: tabular-nums;
    color: var(--ma-suave);
    white-space: nowrap;
    padding: 0 4px;
}
.ma-capitulo {
    flex: 1 1 100%;
    order: 10;
    font-size: 14px;
    color: var(--ma-suave);
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.ma-capitulo:empty {
    display: none;
}

/* En la columna de una clase (unos 650px) todo entra en un renglón si los
   botones se aprietan un poco; si no, el último se cae solo a un renglón nuevo. */
@container (max-width: 720px) {
    .ma-controles {
        gap: 4px 2px;
    }
    .ma-controles button {
        min-width: 40px;
        padding: 0 4px;
    }
}

/* En angosto (un celular), la barra de tiempo va sola en su renglón y los
   botones abajo: no entran todos en 360px con un tamaño que se pueda tocar. */
@container (max-width: 520px) {
    .ma-controles {
        gap: 0 2px;
    }
    /* 32px sigue siendo cómodo para un dedo (el mínimo de WCAG es 24) y deja
       que los siete botones (con el del sonido) y el tiempo entren en un
       renglón a 360px. */
    .ma-controles button {
        min-width: 32px;
        padding: 0 2px;
    }
    .ma-tiempo {
        font-size: 13px;
    }
    .ma-linea {
        flex-basis: 100%;
        order: -1;
    }
    .ma-tiempo {
        margin-right: auto;
    }
}

/* ---- Pantalla entera: la Expo, un televisor, un proyector ---- */
:host([pantalla]),
:host(:fullscreen) {
    position: fixed;
    inset: 0;
    z-index: 1000;
}
/* Todo va en un solo renglón: el dibujo ocupa la pantalla entera, y los
   subtítulos y los controles van encima. Si los subtítulos fueran en un
   renglón propio, el dibujo quedaría más chico en pantalla completa que en la
   página. */
:host([pantalla]) .ma-raiz,
:host(:fullscreen) .ma-raiz {
    height: 100%;
    border-radius: 0;
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: "escena";
}
:host([pantalla]) .ma-lienzo,
:host(:fullscreen) .ma-lienzo {
    min-height: 0;
}
:host([pantalla]) .ma-lienzo svg,
:host(:fullscreen) .ma-lienzo svg {
    height: 100%;
}
/* El subtítulo, como en el cine: un renglón sobre la parte de abajo. El
   dibujo se pega arriba (preserveAspectRatio), así que si la pantalla es más
   alta que la escena el subtítulo cae en el lugar que sobra, sin tapar nada. */
:host([pantalla]) .ma-subtitulo,
:host(:fullscreen) .ma-subtitulo {
    grid-area: escena;
    align-self: end;
    justify-self: center;
    z-index: 2;
    min-height: 0;
    max-width: min(92%, 64ch);
    margin-bottom: max(12px, 2.5vh);
    padding: 0.25em 0.8em;
    border-radius: 0.4em;
    background: color-mix(in srgb, var(--ma-fondo) 85%, transparent);
    font-size: clamp(18px, 2.2cqi, 46px);
    pointer-events: none;
    /* --ma-sub-esquiva: cuánto sube para no tapar algo (lo calcula el componente). */
    transform: translateY(calc(-1 * var(--ma-sub-esquiva, 0px)));
    transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
/* Si no encontró un lugar libre, un fondo más firme: tapa, pero se lee. */
:host([pantalla]) .sub-tapa .ma-subtitulo,
:host(:fullscreen) .sub-tapa .ma-subtitulo {
    background: color-mix(in srgb, var(--ma-fondo) 96%, transparent);
}
:host([pantalla]) .ma-subtitulo:empty,
:host(:fullscreen) .ma-subtitulo:empty {
    display: none;
}
/* Cuando aparecen los controles, el subtítulo sube para no quedar abajo de ellos. */
:host([pantalla]) .ver-controles .ma-subtitulo,
:host(:fullscreen) .ver-controles .ma-subtitulo {
    transform: translateY(calc(-1 * (var(--ma-alto-controles, 0px) + var(--ma-sub-esquiva, 0px))));
}
/* Con una pregunta abierta (en <motor-leccion>), la pregunta ocupa la parte
   de abajo: el subtítulo sube y queda justo encima de ella. Arriba de todo
   taparía el título de la escena. --ma-alto-pregunta lo mide la lección. */
:host([pantalla]) .con-pregunta .ma-subtitulo,
:host(:fullscreen) .con-pregunta .ma-subtitulo {
    transform: translateY(calc(-1 * (var(--ma-alto-pregunta, 0px) + var(--ma-sub-esquiva, 0px))));
}
:host([pantalla]) .con-pregunta.ver-controles .ma-subtitulo,
:host(:fullscreen) .con-pregunta.ver-controles .ma-subtitulo {
    transform: translateY(calc(-1 * (var(--ma-alto-pregunta, 0px) + var(--ma-alto-controles, 0px) + var(--ma-sub-esquiva, 0px))));
}

.ma-oculto {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
`;

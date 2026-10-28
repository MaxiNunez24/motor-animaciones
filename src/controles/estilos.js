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
.ma-raiz.sin-textos [data-accion="subtitulos"] {
    display: none;
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
.ma-raiz.flotantes.sin-cursor {
    cursor: none;
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
    /* 36px sigue siendo cómodo para un dedo (el mínimo de WCAG es 24) y deja
       que los seis botones y el tiempo entren en un renglón a 360px. */
    .ma-controles button {
        min-width: 36px;
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
    transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
:host([pantalla]) .ma-subtitulo:empty,
:host(:fullscreen) .ma-subtitulo:empty {
    display: none;
}
/* Cuando aparecen los controles, el subtítulo sube para no quedar abajo de ellos. */
:host([pantalla]) .ver-controles .ma-subtitulo,
:host(:fullscreen) .ver-controles .ma-subtitulo {
    transform: translateY(calc(-1 * var(--ma-alto-controles, 0px)));
}
/* Con una pregunta abierta (en <motor-leccion>), la pregunta ocupa la parte
   de abajo: el subtítulo sube y queda justo encima de ella. Arriba de todo
   taparía el título de la escena. --ma-alto-pregunta lo mide la lección. */
:host([pantalla]) .con-pregunta .ma-subtitulo,
:host(:fullscreen) .con-pregunta .ma-subtitulo {
    transform: translateY(calc(-1 * var(--ma-alto-pregunta, 0px)));
}
:host([pantalla]) .con-pregunta.ver-controles .ma-subtitulo,
:host(:fullscreen) .con-pregunta.ver-controles .ma-subtitulo {
    transform: translateY(calc(-1 * (var(--ma-alto-pregunta, 0px) + var(--ma-alto-controles, 0px))));
}
/* Sin controles no hay nada que apuntar: que el mouse no quede en el medio
   de la pantalla de la Expo. */
:host([pantalla][sin-controles]) {
    cursor: none;
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

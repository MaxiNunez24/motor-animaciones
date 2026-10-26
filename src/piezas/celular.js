import { definirPieza } from './definir.js';
import { el, poner, texto as ponerTexto, idUnico } from './svg.js';
import { aCss } from '../nucleo/colores.js';

// La pantalla de un celular. Adentro se pueden poner otras piezas con
// `dentro: 'id-del-celular'`, y para ellas la pantalla mide siempre 360 × 740,
// como un celular de verdad: se diseña lo de adentro pensando en un teléfono,
// y el tamaño del celular en la escena se elige aparte, con `alto`.

const PANTALLA_ANCHO = 360;
const PANTALLA_ALTO = 740;
const BISEL = 16;
const CUERPO_ANCHO = PANTALLA_ANCHO + 2 * BISEL;
const CUERPO_ALTO = PANTALLA_ALTO + 2 * BISEL;
const BARRA = 40;
const ENCABEZADO = 64;

export const celular = definirPieza({
    nombre: 'celular',
    predeterminados: {
        // Cuánto mide de alto en la escena. El ancho sale de la proporción.
        alto: 640,
        // Si tiene, la barra de la aplicación arriba de todo.
        titulo: '',
        hora: '18:30',
        pantalla: 'superficie',
        marco: 'marco',
        barraTitulo: 'acento',
        colorTitulo: 'fondo',
    },
    colores: ['pantalla', 'marco', 'barraTitulo', 'colorTitulo'],

    crear(grupo) {
        const cuerpo = el('g', {}, grupo);
        const recorte = idUnico('ma-pantalla');
        const clip = el('clipPath', { id: recorte }, el('defs', {}, cuerpo));
        el('rect', { x: 0, y: 0, width: PANTALLA_ANCHO, height: PANTALLA_ALTO, rx: 30 }, clip);

        const marco = el('rect', { x: 0, y: 0, width: CUERPO_ANCHO, height: CUERPO_ALTO, rx: 46 }, cuerpo);
        const pantalla = el('g', { transform: `translate(${BISEL} ${BISEL})`, 'clip-path': `url(#${recorte})` }, cuerpo);
        const fondo = el('rect', { x: 0, y: 0, width: PANTALLA_ANCHO, height: PANTALLA_ALTO }, pantalla);
        const barraApp = el('rect', { x: 0, y: BARRA, width: PANTALLA_ANCHO, height: ENCABEZADO }, pantalla);
        const titulo = el('text', {
            x: 20, y: BARRA + ENCABEZADO / 2, 'dominant-baseline': 'central', 'font-size': 24, 'font-weight': 700,
        }, pantalla);
        const hora = el('text', { x: 26, y: BARRA / 2 + 2, 'dominant-baseline': 'central', 'font-size': 15, 'font-weight': 600 }, pantalla);
        // La batería y la señal: dibujitos, no datos.
        const iconos = el('g', { transform: `translate(${PANTALLA_ANCHO - 70} ${BARRA / 2 - 6})` }, pantalla);
        [4, 7, 10].forEach((h, i) => el('rect', { x: i * 6, y: 12 - h, width: 4, height: h, rx: 1 }, iconos));
        el('rect', { x: 24, y: 0, width: 24, height: 12, rx: 3, fill: 'none', 'stroke-width': 1.5 }, iconos);
        el('rect', { x: 26.5, y: 2.5, width: 15, height: 7, rx: 1.5 }, iconos);
        // Lo que va dentro del celular se dibuja acá.
        const contenido = el('g', {}, pantalla);
        const camara = el('rect', { x: CUERPO_ANCHO / 2 - 40, y: BISEL + 10, width: 80, height: 18, rx: 9 }, cuerpo);
        return { cuerpo, marco, fondo, barraApp, titulo, hora, iconos, contenido, camara };
    },

    actualizar(partes, p) {
        const k = p.alto / CUERPO_ALTO;
        poner(partes.cuerpo, { transform: `scale(${k}) translate(${-CUERPO_ANCHO / 2} ${-CUERPO_ALTO / 2})` });
        poner(partes.marco, { fill: aCss(p.marco) });
        poner(partes.camara, { fill: aCss(p.marco) });
        poner(partes.fondo, { fill: aCss(p.pantalla) });
        const conTitulo = p.titulo !== '';
        poner(partes.barraApp, { fill: aCss(p.barraTitulo), visibility: conTitulo ? null : 'hidden' });
        poner(partes.titulo, { fill: aCss(p.colorTitulo), visibility: conTitulo ? null : 'hidden' });
        ponerTexto(partes.titulo, p.titulo);
        poner(partes.hora, { fill: 'var(--ma-texto)' });
        ponerTexto(partes.hora, p.hora);
        poner(partes.iconos, { fill: 'var(--ma-texto)', stroke: 'var(--ma-texto)' });
    },

    tamano: (p) => ({ ancho: (p.alto * CUERPO_ANCHO) / CUERPO_ALTO, alto: p.alto }),
    contenedor: (partes) => partes.contenido,
    // El (0, 0) de lo que va adentro es la esquina de arriba a la izquierda de
    // la pantalla, y una unidad es un "pixel de celular".
    origenContenedor(p) {
        const k = p.alto / CUERPO_ALTO;
        return { x: (BISEL - CUERPO_ANCHO / 2) * k, y: (BISEL - CUERPO_ALTO / 2) * k, escala: k };
    },
});

/** Lo que mide la pantalla para las piezas de adentro. */
export const PANTALLA = { ancho: PANTALLA_ANCHO, alto: PANTALLA_ALTO, arriba: BARRA, debajoDelTitulo: BARRA + ENCABEZADO };

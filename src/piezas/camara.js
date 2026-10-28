import { definirPieza } from './definir.js';
import { el, poner, idUnico } from './svg.js';
import { aCss } from '../nucleo/colores.js';

// Una cámara: las piezas que van `dentro: 'camara'` se ven a través de ella,
// y moverla (o acercarla) mueve todo lo de adentro junto.
//
// Sirve sobre todo para el celular: en vez de achicar una escena ancha hasta
// que no se lea, la cámara se acerca a la parte que se está contando. Lo que
// NO va dentro de la cámara (un título, un cartel) queda quieto en la pantalla.
//
// x e y son el centro de la pantalla donde se ve; mirarX y mirarY, el punto
// de lo de adentro que queda en ese centro; zoom, cuánto se acerca. Con ancho y
// alto, lo de adentro se recorta a esa ventana: así no pasa por debajo de un
// título fijo y no hace falta taparlo.
//
// La ventana puede tener las esquinas redondeadas (`radio`) o ser un círculo
// (`forma: 'circulo'`, como una lupa de verdad), con un aro alrededor (`aro`,
// su grosor) y una sombra debajo, para que se lea como algo que está encima.
export const camara = definirPieza({
    nombre: 'camara',
    predeterminados: {
        mirarX: 0,
        mirarY: 0,
        zoom: 1,
        // La ventana, centrada en (x, y). 0: sin recortar.
        ancho: 0,
        alto: 0,
        // 'rect' o 'circulo' (de diámetro el menor entre ancho y alto).
        forma: 'rect',
        radio: 0,
        aro: 0,
        colorAro: 'borde',
        sombra: false,
        // El fondo de la ventana: lo que se ve donde no hay nada adentro. '' es transparente.
        fondo: '',
    },
    colores: ['colorAro', 'fondo'],

    validar(p) {
        if (!['rect', 'circulo'].includes(p.forma)) throw new Error(`Una cámara es 'rect' o 'circulo', no "${p.forma}".`);
    },

    crear(grupo) {
        const id = idUnico('ma-camara');
        const clip = el('clipPath', { id }, el('defs', {}, grupo));
        const sombra = el('rect', {}, grupo);
        const ventana = el('g', {}, grupo);
        const contenido = el('g', {}, ventana);
        return { id, recorte: el('rect', {}, clip), sombra, ventana, contenido, aro: el('rect', { fill: 'none' }, grupo) };
    },

    actualizar(partes, p) {
        const recorta = p.ancho > 0 && p.alto > 0;
        const forma = ventanaDe(p);
        poner(partes.recorte, forma);
        poner(partes.ventana, { 'clip-path': recorta ? `url(#${partes.id})` : null });
        poner(partes.contenido, {
            transform: `scale(${p.zoom}) translate(${-p.mirarX} ${-p.mirarY})`,
        });
        poner(partes.sombra, {
            ...forma,
            fill: p.fondo ? aCss(p.fondo) : 'var(--ma-fondo)',
            visibility: recorta && (p.sombra || p.fondo) ? null : 'hidden',
            filter: p.sombra ? 'drop-shadow(0 6px 14px rgb(0 0 0 / 0.28))' : null,
        });
        poner(partes.aro, {
            ...forma,
            stroke: aCss(p.colorAro),
            'stroke-width': p.aro,
            visibility: recorta && p.aro > 0 ? null : 'hidden',
        });
    },

    tamano: (p) => (p.forma === 'circulo' ? { ancho: Math.min(p.ancho, p.alto), alto: Math.min(p.ancho, p.alto) } : { ancho: p.ancho, alto: p.alto }),
    contenedor: (partes) => partes.contenido,
    origenContenedor: (p) => ({ x: -p.mirarX * p.zoom, y: -p.mirarY * p.zoom, escala: p.zoom }),
});

// El rectángulo de la ventana, centrado en (0, 0). Un círculo es un
// rectángulo cuadrado con el radio a la mitad: así el recorte, la sombra y el
// aro son siempre el mismo nodo, y pasar de una forma a la otra no rearma nada.
function ventanaDe(p) {
    const circulo = p.forma === 'circulo';
    const ancho = circulo ? Math.min(p.ancho, p.alto) : p.ancho;
    const alto = circulo ? ancho : p.alto;
    const radio = circulo ? ancho / 2 : Math.min(Math.max(p.radio, 0), ancho / 2, alto / 2);
    return { x: -ancho / 2, y: -alto / 2, width: ancho, height: alto, rx: radio, ry: radio };
}

import { definirPieza } from './definir.js';
import { el, poner, idUnico } from './svg.js';

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
export const camara = definirPieza({
    nombre: 'camara',
    predeterminados: {
        mirarX: 0,
        mirarY: 0,
        zoom: 1,
        // La ventana, centrada en (x, y). 0: sin recortar.
        ancho: 0,
        alto: 0,
    },

    crear(grupo) {
        const id = idUnico('ma-camara');
        const rect = el('rect', {}, el('clipPath', { id }, el('defs', {}, grupo)));
        const ventana = el('g', {}, grupo);
        return { id, rect, ventana, contenido: el('g', {}, ventana) };
    },

    actualizar(partes, p) {
        const recorta = p.ancho > 0 && p.alto > 0;
        poner(partes.rect, { x: -p.ancho / 2, y: -p.alto / 2, width: p.ancho, height: p.alto });
        poner(partes.ventana, { 'clip-path': recorta ? `url(#${partes.id})` : null });
        poner(partes.contenido, {
            transform: `scale(${p.zoom}) translate(${-p.mirarX} ${-p.mirarY})`,
        });
    },

    contenedor: (partes) => partes.contenido,
    origenContenedor: (p) => ({ x: -p.mirarX * p.zoom, y: -p.mirarY * p.zoom, escala: p.zoom }),
});

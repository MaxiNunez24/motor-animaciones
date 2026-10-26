import { definirPieza } from '../../piezas/definir.js';
import { el, poner, texto as ponerTexto } from '../../piezas/svg.js';
import { aCss } from '../../nucleo/colores.js';
import { limitar } from '../../nucleo/interpolar.js';
import { tokenizar, COLORES_CODIGO } from '../resaltar.js';

// Cuánto ocupa un caracter de una fuente monoespaciada, en proporción a su
// tamaño. En las monoespaciadas de verdad (Consolas, Cascadia) es 0,55; se usa
// un poco más para que nada se pise si la compu tiene otra.
export const ANCHO_MONO = 0.6;

// Un programa con la línea que corre resaltada. `linea` acepta decimales: al
// animarla de 3 a 4, la marca baja de una línea a la otra, en vez de saltar,
// y se ve que el programa "avanza".
export const codigo = definirPieza({
    nombre: 'codigo',
    predeterminados: {
        codigo: '',
        lenguaje: 'python',
        ancho: 700,
        tamano: 26,
        interlineado: 1.6,
        // La línea que está por correr, contando desde 1.
        linea: 1,
        // De 0 a 1: cuánto se ve la marca de la línea (0: el programa terminó).
        marca: 0,
        colorMarca: 'acento',
        numeros: true,
        // Arriba, como la pestaña de un editor: "programa.py".
        titulo: '',
        relleno: 'superficie',
        borde: 'borde',
    },
    colores: ['colorMarca', 'relleno', 'borde'],

    crear(grupo) {
        return { grupo, clave: '', lineas: [] };
    },

    actualizar(partes, p) {
        const medidas = medir(p);
        const { arriba, izq, alto, altoLinea, xCodigo } = medidas;
        const clave = `${p.lenguaje}|${p.tamano}|${p.ancho}|${p.titulo}|${p.numeros}|${p.codigo}`;
        // La estructura (un <text> por línea, con sus pedazos de colores) se
        // arma solo cuando cambia el programa: en cada cuadro solo se mueve la marca.
        if (partes.clave !== clave) {
            partes.grupo.replaceChildren();
            partes.fondo = el('rect', {}, partes.grupo);
            partes.pestana = el('text', { 'font-size': p.tamano * 0.75, 'dominant-baseline': 'central' }, partes.grupo);
            partes.barra = el('rect', {}, partes.grupo);
            partes.borde = el('rect', {}, partes.grupo);
            partes.lineas = medidas.lineas.map((linea, i) => {
                const y = arriba + medidas.encabezado + (i + 0.5) * altoLinea + medidas.margen;
                const numero = el('text', {
                    x: izq + 16 + 2 * p.tamano * ANCHO_MONO, y, 'text-anchor': 'end', 'dominant-baseline': 'central',
                    'font-size': p.tamano * 0.8, fill: 'var(--ma-suave)', 'font-family': 'var(--ma-fuente-mono)',
                    visibility: p.numeros ? null : 'hidden',
                }, partes.grupo);
                ponerTexto(numero, String(i + 1));
                const texto = el('text', {
                    x: xCodigo, y, 'dominant-baseline': 'central', 'font-size': p.tamano,
                    'font-family': 'var(--ma-fuente-mono)', style: 'white-space: pre',
                }, partes.grupo);
                for (const pedazo of tokenizar(linea, p.lenguaje)) {
                    const tspan = el('tspan', {
                        fill: aCss(COLORES_CODIGO[pedazo.clase]),
                        'font-weight': pedazo.clase === 'palabra' || pedazo.clase === 'funcion' ? 700 : null,
                    }, texto);
                    ponerTexto(tspan, pedazo.texto);
                }
                return { numero, texto };
            });
            partes.clave = clave;
        }

        poner(partes.fondo, {
            x: izq, y: arriba, width: p.ancho, height: alto, rx: 14,
            fill: aCss(p.relleno), stroke: aCss(p.borde), 'stroke-width': 2,
        });
        poner(partes.pestana, {
            x: izq + 20, y: arriba + medidas.encabezado / 2, fill: 'var(--ma-suave)',
            'font-family': 'var(--ma-fuente-mono)', visibility: p.titulo ? null : 'hidden',
        });
        ponerTexto(partes.pestana, p.titulo);

        // La marca: una banda suave sobre toda la línea y un borde fuerte a la
        // izquierda, como en los depuradores.
        const n = medidas.lineas.length;
        const y = arriba + medidas.encabezado + medidas.margen + (limitar(p.linea, 1, Math.max(n, 1)) - 1) * altoLinea;
        const marca = limitar(p.marca, 0, 1);
        poner(partes.barra, {
            x: izq + 2, y, width: p.ancho - 4, height: altoLinea,
            fill: `color-mix(in srgb, ${aCss(p.colorMarca)} 20%, transparent)`,
            opacity: marca, visibility: marca > 0 ? null : 'hidden',
        });
        poner(partes.borde, {
            x: izq + 2, y, width: 7, height: altoLinea, fill: aCss(p.colorMarca),
            opacity: marca, visibility: marca > 0 ? null : 'hidden',
        });
    },

    tamano(p) {
        const m = medir(p);
        return { ancho: p.ancho, alto: m.alto };
    },
});

function medir(p) {
    const lineas = String(p.codigo).replace(/\n$/, '').split('\n');
    const altoLinea = p.tamano * p.interlineado;
    const encabezado = p.titulo ? p.tamano * 1.6 : 0;
    const margen = p.tamano * 0.5;
    const alto = encabezado + 2 * margen + lineas.length * altoLinea;
    const izq = -p.ancho / 2;
    const xCodigo = izq + 16 + (p.numeros ? 2 * p.tamano * ANCHO_MONO + p.tamano * 0.9 : 8);
    return { lineas, altoLinea, encabezado, margen, alto, arriba: -alto / 2, izq, xCodigo };
}

/** Cuántos caracteres entran en un renglón de un código de ese ancho y tamaño. */
export function caracteresPorLinea({ ancho, tamano, numeros = true }) {
    const usado = 16 + (numeros ? 2 * tamano * ANCHO_MONO + tamano * 0.9 : 8) + 16;
    return Math.floor((ancho - usado) / (tamano * ANCHO_MONO));
}

import { definirPieza } from './definir.js';
import { el, poner, texto as ponerTexto } from './svg.js';
import { aCss } from '../nucleo/colores.js';
import { limitar } from '../nucleo/interpolar.js';

// Una tabla: una planilla, el resultado de una consulta, una lista de alumnos.
// Las filas pueden ir apareciendo de a una con `filasVisibles`, que acepta
// decimales: 2.5 es "dos filas y la tercera a medio aparecer".
export const tabla = definirPieza({
    nombre: 'tabla',
    predeterminados: {
        columnas: [],
        filas: [],
        // El ancho de cada columna. Si no se dice, se reparte `ancho` en partes iguales.
        anchos: null,
        ancho: 640,
        altoFila: 56,
        tamano: 24,
        filasVisibles: Infinity,
        // El índice de una fila para destacarla (-1: ninguna).
        resaltarFila: -1,
        relleno: 'superficie',
        borde: 'borde',
        encabezado: 'acento',
        colorEncabezado: 'fondo',
        color: 'texto',
        // 'centro': y es el centro (como las demás piezas). 'arriba': y es el borde de
        // arriba, para una tabla que va creciendo y no tiene que saltar.
        anclaje: 'centro',
    },
    colores: ['relleno', 'borde', 'encabezado', 'colorEncabezado', 'color'],

    validar(p) {
        if (!Array.isArray(p.columnas) || p.columnas.length === 0) {
            throw new Error('Una tabla necesita sus columnas: columnas: ["Nombre", "DNI"].');
        }
    },

    crear(grupo) {
        return { grupo, forma: '', filas: [] };
    },

    actualizar(partes, p) {
        const anchos = p.anchos ?? p.columnas.map(() => p.ancho / p.columnas.length);
        const total = anchos.reduce((a, b) => a + b, 0);
        const izq = -total / 2;
        const arriba = p.anclaje === 'arriba' ? 0 : -((p.filas.length + 1) * p.altoFila) / 2;

        // La estructura se rearma solo si cambia la cantidad de filas o de
        // columnas; en cada cuadro se cambian textos y opacidades, que es barato.
        const forma = `${p.columnas.length}x${p.filas.length}`;
        if (partes.forma !== forma) {
            partes.grupo.replaceChildren();
            partes.filas = [];
            for (let i = 0; i <= p.filas.length; i++) {
                const g = el('g', {}, partes.grupo);
                const fondo = el('rect', {}, g);
                const celdas = p.columnas.map(() => el('text', { 'dominant-baseline': 'central' }, g));
                partes.filas.push({ g, fondo, celdas });
            }
            partes.forma = forma;
        }

        partes.filas.forEach((fila, i) => {
            const esEncabezado = i === 0;
            const datos = esEncabezado ? p.columnas : p.filas[i - 1];
            // La fila i (contando desde 1) se ve entera cuando filasVisibles >= i.
            const visible = esEncabezado ? 1 : limitar(p.filasVisibles - (i - 1), 0, 1);
            const y = arriba + i * p.altoFila;
            poner(fila.g, {
                opacity: visible,
                // Las filas nuevas entran desde un poco más abajo.
                transform: `translate(0 ${Math.round((1 - visible) * 16 * 100) / 100})`,
                visibility: visible > 0 ? null : 'hidden',
            });
            const resaltada = !esEncabezado && Math.round(p.resaltarFila) === i - 1;
            poner(fila.fondo, {
                x: izq, y, width: total, height: p.altoFila,
                fill: esEncabezado ? aCss(p.encabezado) : resaltada
                    ? `color-mix(in srgb, ${aCss('acento')} 22%, ${aCss(p.relleno)})`
                    : aCss(p.relleno),
                stroke: aCss(p.borde),
                'stroke-width': 2,
            });
            let x = izq;
            fila.celdas.forEach((celda, j) => {
                poner(celda, {
                    x: x + 16,
                    y: y + p.altoFila / 2,
                    'font-size': p.tamano,
                    'font-weight': esEncabezado || resaltada ? 700 : 400,
                    fill: esEncabezado ? aCss(p.colorEncabezado) : aCss(p.color),
                });
                ponerTexto(celda, String(datos?.[j] ?? ''));
                x += anchos[j];
            });
        });
    },

    tamano(p) {
        const anchos = p.anchos ?? p.columnas.map(() => p.ancho / p.columnas.length);
        return { ancho: anchos.reduce((a, b) => a + b, 0), alto: (p.filas.length + 1) * p.altoFila };
    },
});

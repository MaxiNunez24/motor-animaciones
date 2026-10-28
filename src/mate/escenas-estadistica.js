import { caja } from '../piezas/caja.js';
import { crearNarrador } from '../pedagogico/narrar.js';
import { plano, grafica, punto, recta, segmento, area, curvasNivel } from './plano.js';
import { numero, descensoGradiente } from './calculo.js';
import { lienzo, piezaTitulo, panel, rangoDatos, nivelesAutomaticos } from './escenas.js';
import {
    student, normal, resumen, muestraNormal, intervaloMedia, decidir, testMedia, inferenciaRegresion,
} from './estadistica.js';

// Escenas de estadística que se arman solas: un intervalo de confianza, qué
// quiere decir "95 %", un test de hipótesis, cómo se reparte la variabilidad
// en una regresión, las bandas de confianza y de predicción, y el descenso
// del gradiente con tres tasas.
//
// Como las de escenas.js: las cuentas las hace estadistica.js, y acá se decide
// qué se muestra y en qué orden se cuenta. Todo lo que se dice sale de las
// cuentas, así que con otros datos la explicación sigue siendo cierta.

const pct = (p) => `${numero(p * 100, 1)} %`;

/** Un p-valor para mostrar: los muy chicos no se escriben con todos sus ceros. */
function pValor(p) {
    return p < 0.0001 ? 'menos de 0,0001' : numero(p, 4);
}

/**
 * El plano de una campana (la t o la normal) y su curva. Los números del eje
 * y no se muestran: la altura de una densidad no se lee, se leen las áreas.
 */
function campana(piezas, id, { gl, limite, x, y, ancho, alto, angosta }) {
    const f = Number.isFinite(gl) ? (v) => student(v, gl) : (v) => normal(v);
    piezas[id] = plano({
        x, y, ancho, alto, xmin: -limite, xmax: limite, ymin: -0.04, ymax: 0.46, pasoY: 10, pasoX: limite > 5 ? 2 : 1,
        etiquetaX: Number.isFinite(gl) ? 't' : 'z', etiquetaY: '', tamano: angosta ? 15 : 19, grilla: false,
    });
    piezas[`${id}Curva`] = grafica({ plano: id, f, trazo: 0, color: 'texto', grosor: 3.5 });
    return f;
}

// ======================= El intervalo, paso a paso =======================

/**
 * Cómo se arma un intervalo de confianza para la media, con una muestra:
 * la media, el error estándar, el valor crítico de la t y el margen.
 *
 * @param {{
 *     datos: number[], confianza?: number, otraConfianza?: number, etiqueta?: string, unidad?: string,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `otraConfianza` (por ejemplo 0.99) agrega al final cómo cambia el intervalo.
 *     `preguntas` acepta 'confianza' (antes de cambiarla).
 */
export function desdeIntervalo(opciones) {
    const { datos, confianza = 0.95, otraConfianza = 0.99, etiqueta = 'x', unidad = '', titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const m = resumen(datos);
    const ic = intervaloMedia({ media: m.media, desvio: m.desvio, n: m.n, confianza });
    const otro = otraConfianza ? intervaloMedia({ media: m.media, desvio: m.desvio, n: m.n, confianza: otraConfianza }) : null;
    const u = unidad ? ` ${unidad}` : '';
    const lo = Math.min(...datos);
    const hi = Math.max(...datos);
    const holgura = Math.max((hi - lo) * 0.12, (otro ?? ic).margen * 1.3);
    const rango = { xmin: Math.min(lo, (otro ?? ic).desde) - holgura, xmax: Math.max(hi, (otro ?? ic).hasta) + holgura };

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const recta1 = angosta ? { x: 320, y: arriba + 140, ancho: 600, alto: 230 } : { x: 540, y: arriba + 170, ancho: 1000, alto: 290 };
        const camp = angosta ? { x: 320, y: arriba + 430, ancho: 600, alto: 300 } : { x: 540, y: arriba + 530, ancho: 1000, alto: 360 };
        const pan = angosta ? { x: 24, y: arriba + 620, ancho: 600, tamano: 23 } : { x: 1090, y: arriba + 90, ancho: 490, tamano: 27 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.linea = plano({ ...recta1, ...rango, ymin: 0, ymax: 1, pasoY: 10, etiquetaX: etiqueta, etiquetaY: '', tamano: angosta ? 15 : 19, grilla: false });
        // Los puntos, apilados un poco en altura para que no se tapen.
        datos.forEach((v, i) => {
            piezas[`d${i}`] = punto({ plano: 'linea', mx: v, my: 0.2 + 0.5 * ((i * 0.618034) % 1), radio: angosta ? 6 : 8, color: 'acento', opacidad: 0 });
        });
        piezas.intervalo = segmento({ plano: 'linea', x1: m.media, y1: 0.12, x2: m.media, y2: 0.12, color: 'exito', grosor: 9, opacidad: 0 });
        piezas.media = punto({ plano: 'linea', mx: m.media, my: 0.12, radio: 11, color: 'acento2', etiqueta: 'x̄', lado: 'arriba', opacidad: 0 });
        const f = campana(piezas, 'campana', { gl: m.n - 1, limite: 4.2, ...camp, angosta });
        piezas.centro = area({ plano: 'campana', f, desde: 0, hasta: 0, color: 'exito', relleno: 0.35, etiqueta: pct(confianza), etiquetaY: 0.12 });
        piezas.colaIzq = area({ plano: 'campana', f, desde: -4.3, hasta: -ic.critico, color: 'error', relleno: 0.35, opacidad: 0 });
        piezas.colaDer = area({ plano: 'campana', f, desde: ic.critico, hasta: 4.3, color: 'error', relleno: 0.35, opacidad: 0 });
        piezas.critIzq = punto({ plano: 'campana', mx: -ic.critico, my: 0, radio: 7, color: 'error', etiqueta: `−${numero(ic.critico, 3)}`, lado: 'abajo', opacidad: 0 });
        piezas.critDer = punto({ plano: 'campana', mx: ic.critico, my: 0, radio: 7, color: 'error', etiqueta: numero(ic.critico, 3), lado: 'abajo', opacidad: 0 });
        panel(piezas, ['cantidad', 'promedio', 'desvio', 'error', 'critico', 'margen', 'resultado'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const ids = datos.map((_, i) => `d${i}`);

        n.capitulo('La muestra');
        n.animar([
            { pieza: ids, a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.1, 1.6 / datos.length) },
            { pieza: 'cantidad', a: { texto: `n = ${m.n} mediciones`, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`Tenemos una muestra de ${m.n} mediciones de ${etiqueta}. Queremos estimar la media μ de TODA la población, que no conocemos.`);
        n.animar([
            { pieza: 'media', a: { opacidad: 1 }, dur: 0.5 },
            { pieza: 'promedio', a: { texto: `x̄ = ${numero(m.media, 2)}${u}`, opacidad: 1, color: 'acento2', peso: 700 }, dur: 0.4 },
            { pieza: 'desvio', a: { texto: `s = ${numero(m.desvio, 2)}${u}`, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`El promedio de la muestra es x̄ = ${numero(m.media, 2)}${u}. Es nuestra mejor estimación de μ, pero con otras ${m.n} mediciones daría otro número.`);

        n.capitulo('El error estándar');
        n.animar({ pieza: 'error', a: { texto: `EE = s / √n = ${numero(ic.error, 3)}`, opacidad: 1 }, dur: 0.4 });
        n.decir(`Cuánto cambia x̄ de una muestra a otra lo mide el error estándar: s / √n = ${numero(ic.error, 3)}. Con más datos, x̄ varía menos.`);

        n.capitulo('El valor crítico');
        n.animar({ pieza: 'campanaCurva', a: { trazo: 1 }, dur: 1.2 });
        n.decir(`Como s también es una estimación, no se usa la normal sino la t de Student, con n − 1 = ${m.n - 1} grados de libertad. Se parece a la normal, con colas un poco más gordas.`);
        n.animar([
            { pieza: 'centro', a: { desde: -ic.critico, hasta: ic.critico }, dur: 1.2 },
            { pieza: ['colaIzq', 'colaDer'], a: { opacidad: 1 }, dur: 0.5, en: n.tiempo + 1 },
            { pieza: ['critIzq', 'critDer'], a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1 },
            { pieza: 'critico', a: { texto: `t = ${numero(ic.critico, 3)} (deja ${pct(ic.alfa / 2)} en cada cola)`, opacidad: 1 }, dur: 0.4, en: n.tiempo + 1 },
        ]);
        n.decir(`Buscamos el valor t que deja el ${pct(confianza)} del área en el medio: ${numero(ic.critico, 3)}. Lo que queda, ${pct(ic.alfa)}, se reparte entre las dos colas.`);

        n.capitulo('El intervalo');
        n.animar([
            { pieza: 'margen', a: { texto: `margen = t · EE = ${numero(ic.margen, 3)}`, opacidad: 1 }, dur: 0.4 },
            { pieza: 'intervalo', a: { x1: ic.desde, x2: ic.hasta, opacidad: 1 }, dur: 1 },
            { pieza: 'resultado', a: { texto: `IC ${pct(confianza)}: [${numero(ic.desde, 2)} ; ${numero(ic.hasta, 2)}]`, opacidad: 1, color: 'exito', peso: 800 }, dur: 0.4 },
        ]);
        n.decir(`El margen es t por el error estándar: ${numero(ic.margen, 3)}. El intervalo es x̄ ± margen: de ${numero(ic.desde, 2)} a ${numero(ic.hasta, 2)}${u}.`);
        n.decir(`Ojo con cómo se dice: μ no "tiene un ${pct(confianza)} de probabilidad" de estar ahí. μ es un número fijo; lo que varía es el intervalo. El ${pct(confianza)} habla del método: de cada 100 muestras, unos ${numero(confianza * 100, 0)} intervalos atrapan a μ.`);

        if (otro) {
            n.preguntar('confianza');
            n.capitulo(`Con ${pct(otraConfianza)}`);
            n.animar([
                { pieza: 'centro', a: { desde: -otro.critico, hasta: otro.critico, etiqueta: pct(otraConfianza) }, dur: 1 },
                { pieza: 'colaIzq', a: { hasta: -otro.critico }, dur: 1 },
                { pieza: 'colaDer', a: { desde: otro.critico }, dur: 1 },
                { pieza: 'critIzq', a: { mx: -otro.critico, etiqueta: `−${numero(otro.critico, 3)}` }, dur: 1 },
                { pieza: 'critDer', a: { mx: otro.critico, etiqueta: numero(otro.critico, 3) }, dur: 1 },
                { pieza: 'critico', a: { texto: `t = ${numero(otro.critico, 3)} (deja ${pct(otro.alfa / 2)} en cada cola)` }, dur: 0.3 },
                { pieza: 'margen', a: { texto: `margen = t · EE = ${numero(otro.margen, 3)}` }, dur: 0.3 },
                { pieza: 'intervalo', a: { x1: otro.desde, x2: otro.hasta }, dur: 1 },
                { pieza: 'resultado', a: { texto: `IC ${pct(otraConfianza)}: [${numero(otro.desde, 2)} ; ${numero(otro.hasta, 2)}]` }, dur: 0.3 },
            ]);
            n.decir(`Para estar más seguros hay que abrir más la red: con ${pct(otraConfianza)} el valor crítico sube a ${numero(otro.critico, 3)} y el intervalo se estira, de ${numero(otro.desde, 2)} a ${numero(otro.hasta, 2)}. Más confianza, menos precisión.`);
            n.decir('La única forma de tener las dos cosas es juntar más datos: el error estándar se achica con √n.');
        }

        return {
            titulo: titulo || 'Un intervalo de confianza',
            descripcion: descripcion || `El intervalo de confianza del ${pct(confianza)} para la media, con n = ${m.n}: de ${numero(ic.desde, 2)} a ${numero(ic.hasta, 2)}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Qué quiere decir 95 % =======================

/**
 * Muchas muestras de una población que (por una vez) sí conocemos, cada una
 * con su intervalo. La mayoría atrapa a la media verdadera; algunas no.
 *
 * @param {{
 *     media: number, desvio: number, n: number, muestras?: number, confianza?: number, otraConfianza?: number,
 *     semilla?: number, etiqueta?: string, unidad?: string,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `preguntas` acepta 'cuantos' (antes de mostrar todas las muestras).
 */
export function desdeCobertura(opciones) {
    const {
        media, desvio, n: tam, muestras = 20, confianza = 0.95, otraConfianza = null, semilla = 7, etiqueta = 'x', unidad = '',
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    const u = unidad ? ` ${unidad}` : '';
    const calcular = (conf) => Array.from({ length: muestras }, (_, i) => {
        const r = resumen(muestraNormal({ n: tam, media, desvio, semilla: semilla * 1000 + i }));
        const ic = intervaloMedia({ media: r.media, desvio: r.desvio, n: tam, confianza: conf });
        return { ...ic, atrapa: ic.desde <= media && media <= ic.hasta };
    });
    const ics = calcular(confianza);
    const otros = otraConfianza ? calcular(otraConfianza) : null;
    const aciertos = (lista) => lista.filter((i) => i.atrapa).length;
    const ancho = Math.max(...(otros ?? ics).map((i) => Math.max(media - i.desde, i.hasta - media)));

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 320, y: arriba + 330, ancho: 600, alto: 640 } : { x: 560, y: arriba + 385, ancho: 1040, alto: 740 };
        const pan = angosta ? { x: 24, y: arriba + 700, ancho: 600, tamano: 23 } : { x: 1120, y: arriba + 110, ancho: 460, tamano: 28 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.plano = plano({
            ...pl, xmin: media - ancho * 1.15, xmax: media + ancho * 1.15, ymin: 0, ymax: muestras + 1.5, pasoY: 1000,
            etiquetaX: etiqueta, etiquetaY: '', tamano: angosta ? 15 : 19, grilla: false,
        });
        piezas.mu = recta({ plano: 'plano', mx: media, my: 0, vertical: true, color: 'acento2', progreso: 0, etiqueta: `μ = ${numero(media)}`, grosor: 3 });
        ics.forEach((ic, i) => {
            const y = muestras - i;
            piezas[`i${i}`] = segmento({ plano: 'plano', x1: ic.desde, y1: y, x2: ic.hasta, y2: y, progreso: 0, grosor: angosta ? 5 : 6, color: ic.atrapa ? 'exito' : 'error' });
            piezas[`m${i}`] = punto({ plano: 'plano', mx: ic.centro, my: y, radio: angosta ? 5 : 6, color: 'texto', opacidad: 0 });
        });
        panel(piezas, ['poblacion', 'muestra', 'cuenta', 'otra'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });
        n.capitulo('La media de verdad');
        n.animar([
            { pieza: 'mu', a: { progreso: 1 }, dur: 0.8 },
            { pieza: 'poblacion', a: { texto: `Población: μ = ${numero(media)}${u}`, opacidad: 1, color: 'acento2', peso: 700 }, dur: 0.4 },
        ]);
        n.decir(`Hagamos trampa: imaginemos que conocemos la media de toda la población, μ = ${numero(media)}${u}. En la vida real nunca la conocemos: por eso estimamos.`);

        n.capitulo('Una muestra, un intervalo');
        n.animar([
            { pieza: 'm0', a: { opacidad: 1 }, dur: 0.3 },
            { pieza: 'i0', a: { progreso: 1 }, dur: 0.8 },
            { pieza: 'muestra', a: { texto: `n = ${tam} por muestra · IC ${pct(confianza)}`, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`Sacamos una muestra de ${tam} y armamos su intervalo del ${pct(confianza)}: de ${numero(ics[0].desde, 1)} a ${numero(ics[0].hasta, 1)}. ${ics[0].atrapa ? 'Este atrapó a μ.' : 'Este no atrapó a μ: pasa.'}`);

        n.preguntar('cuantos');
        n.capitulo('Muchas muestras');
        const cada = Math.min(0.35, 7 / muestras);
        let llevados = 0;
        ics.forEach((ic, i) => {
            if (i === 0) {
                llevados += ic.atrapa ? 1 : 0;
                return;
            }
            const en = n.tiempo + (i - 1) * cada;
            n.linea.push({ pieza: `i${i}`, a: { progreso: 1 }, dur: 0.4, en }, { pieza: `m${i}`, a: { opacidad: 1 }, dur: 0.2, en: en + 0.2 });
            llevados += ic.atrapa ? 1 : 0;
            n.linea.push({ pieza: 'cuenta', a: { texto: `Atraparon a μ: ${llevados} de ${i + 1}`, opacidad: 1 }, dur: 0, en: en + 0.4 });
        });
        n.decir(`Repetimos con otras ${muestras - 1} muestras. Cada una da otro x̄ y otro intervalo: los verdes atrapan a μ, los rojos no.`, 0);
        n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en + 0.6);
        const k = aciertos(ics);
        n.animar({ pieza: 'cuenta', a: { texto: `Atraparon a μ: ${k} de ${muestras} (${pct(k / muestras)})`, color: 'exito', peso: 800 }, dur: 0.4 });

        n.capitulo(`Qué quiere decir ${pct(confianza)}`);
        n.decir(`${k} de ${muestras}. Eso es el ${pct(confianza)}: no habla de UN intervalo, habla del método. Si lo repetimos muchísimas veces, el ${pct(confianza)} de los intervalos atrapa a μ.`);
        n.decir('Con una sola muestra, que es lo que pasa en la realidad, no sabemos si nos tocó uno verde o uno rojo. Confiamos en el método.');

        if (otros) {
            const k2 = aciertos(otros);
            n.capitulo(`Con ${pct(otraConfianza)}`);
            n.animar(otros.flatMap((ic, i) => [
                { pieza: `i${i}`, a: { x1: ic.desde, x2: ic.hasta, color: ic.atrapa ? 'exito' : 'error' }, dur: 1 },
            ]));
            n.animar({ pieza: 'otra', a: { texto: `Con ${pct(otraConfianza)}: ${k2} de ${muestras}`, opacidad: 1, peso: 700 }, dur: 0.4 }, 1);
            n.decir(`Con ${pct(otraConfianza)} los mismos intervalos se estiran: ahora atrapan ${k2} de ${muestras}. Más seguridad, a cambio de intervalos más anchos.`);
        }

        return {
            titulo: titulo || `Qué quiere decir ${pct(confianza)}`,
            descripcion: descripcion || `${muestras} muestras de tamaño ${tam}, cada una con su intervalo del ${pct(confianza)}: ${k} atrapan a la media verdadera.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= El test de hipótesis =======================

/**
 * Un test de hipótesis contado con la campana: qué pasaría si H₀ fuera
 * cierta, la región de rechazo, dónde cae el estadístico, el p-valor y la
 * decisión dicha en el idioma del problema.
 *
 * Se le da una muestra (media, desvio, n, mu0: el test t para la media) o
 * directamente el estadístico y sus grados de libertad (el de la pendiente
 * de una regresión, por ejemplo).
 *
 * @param {{
 *     media?: number, desvio?: number, n?: number, mu0?: number,
 *     estadistico?: number, gl?: number, cuenta?: string, formula?: string,
 *     alfa?: number, cola?: 'dos' | 'derecha' | 'izquierda',
 *     h0: string, h1: string, siRechaza: string, siNoRechaza: string, notas?: string[],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `preguntas` acepta 'decision' (antes de calcular el estadístico).
 */
export function desdeTest(opciones) {
    const { alfa = 0.05, cola = 'dos', h0, h1, siRechaza, siNoRechaza, notas = [], titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    if (!h0 || !h1) throw new Error('desdeTest necesita las dos hipótesis: h0: "μ = 50", h1: "μ ≠ 50".');
    let test;
    let formula = opciones.formula;
    let cuenta = opciones.cuenta;
    if (opciones.estadistico != null) {
        test = decidir({ estadistico: opciones.estadistico, gl: opciones.gl ?? Infinity, alfa, cola });
        formula ??= 'T';
        cuenta ??= `T = ${numero(test.estadistico, 3)}`;
    } else {
        const { media, desvio, n, mu0 } = opciones;
        if ([media, desvio, n, mu0].some((v) => v == null)) {
            throw new Error('desdeTest necesita la muestra (media, desvio, n, mu0) o el estadístico (estadistico, gl).');
        }
        test = testMedia({ media, desvio, n, mu0, alfa, cola });
        formula ??= 'T = (x̄ − μ₀) / (s / √n)';
        cuenta ??= `T = (${numero(media, 2)} − ${numero(mu0, 2)}) / (${numero(desvio, 2)} / √${n}) = ${numero(test.estadistico, 3)}`;
    }
    const T = test.estadistico;
    const gl = test.gl;
    // Si el estadístico cae muy lejos, la campana no se achica hasta hacerse
    // una raya: se lo marca en el borde, con una flecha.
    const limite = Math.min(7, Math.max(4.5, Math.abs(T) * 1.2, Math.abs(test.critico) * 1.4));
    const afuera = Math.abs(T) > limite * 0.94;
    const marca = afuera ? Math.sign(T) * limite * 0.94 : T;
    const nombreDist = Number.isFinite(gl) ? `t con ${numero(gl, 0)} grados de libertad` : 'normal estándar';

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const camp = angosta ? { x: 320, y: arriba + 230, ancho: 600, alto: 420 } : { x: 520, y: arriba + 360, ancho: 960, alto: 600 };
        const pan = angosta ? { x: 24, y: arriba + 500, ancho: 600, tamano: 22 } : { x: 1050, y: arriba + 90, ancho: 530, tamano: 26 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        const f = campana(piezas, 'campana', { gl, limite, ...camp, angosta });
        const fuera = limite + 0.2;
        const c = Math.abs(test.critico);
        const zonas = cola === 'dos' ? [[-fuera, -c], [c, fuera]] : cola === 'derecha' ? [[c, fuera]] : [[-fuera, -c]];
        zonas.forEach(([a, b], i) => {
            piezas[`rechazo${i}`] = area({ plano: 'campana', f, desde: a, hasta: b, color: 'error', relleno: 0.3, opacidad: 0 });
        });
        const criticos = cola === 'dos' ? [-c, c] : [test.critico];
        criticos.forEach((v, i) => {
            piezas[`crit${i}`] = punto({ plano: 'campana', mx: v, my: 0, radio: 7, color: 'error', etiqueta: numero(v, 3), lado: 'abajo', opacidad: 0 });
        });
        const aT = Math.abs(T);
        const colasP = cola === 'dos' ? [[-fuera, -aT], [aT, fuera]] : cola === 'derecha' ? [[T, fuera]] : [[-fuera, T]];
        colasP.forEach(([a, b], i) => {
            piezas[`p${i}`] = area({ plano: 'campana', f, desde: a, hasta: b, color: 'acento2', relleno: 0.55, opacidad: 0 });
        });
        piezas.guia = segmento({ plano: 'campana', x1: 0, y1: 0, x2: 0, y2: 0.42, color: 'acento2', grosor: 3, punteada: true, opacidad: 0 });
        piezas.T = punto({
            plano: 'campana', mx: 0, my: 0, radio: 11, color: 'acento2', lado: 'arriba', opacidad: 0,
            etiqueta: afuera ? `T = ${numero(T, 2)} ${T > 0 ? '→' : '←'}` : `T = ${numero(T, 2)}`,
        });
        panel(piezas, ['h0', 'h1', 'regla', 'formula', 'cuenta', 'pvalor', 'decision'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });
        n.capitulo('Las hipótesis');
        n.animar([
            { pieza: 'h0', a: { texto: `H₀: ${h0}`, opacidad: 1, peso: 700 }, dur: 0.4 },
            { pieza: 'h1', a: { texto: `H₁: ${h1}`, opacidad: 1, peso: 700 }, dur: 0.4, en: n.tiempo + 0.6 },
        ]);
        n.decir(`H₀ es la hipótesis de "no pasa nada": ${h0}. H₁ es lo que queremos ver si hay evidencia para afirmar: ${h1}.`);
        n.decir('El test funciona como un juicio: se supone H₀ y solo se la rechaza si los datos son muy difíciles de explicar con ella.');

        n.capitulo('Si H₀ fuera cierta');
        n.animar({ pieza: 'campanaCurva', a: { trazo: 1 }, dur: 1.2 });
        n.decir(`Si H₀ es cierta, el estadístico sigue una ${nombreDist}: casi siempre cae cerca de 0.`);
        n.animar([
            { pieza: zonas.map((_, i) => `rechazo${i}`), a: { opacidad: 1 }, dur: 0.6 },
            { pieza: criticos.map((_, i) => `crit${i}`), a: { opacidad: 1 }, dur: 0.4 },
            {
                pieza: 'regla',
                a: { texto: cola === 'dos' ? `α = ${numero(alfa, 3)}: rechazo si |T| > ${numero(c, 3)}` : `α = ${numero(alfa, 3)}: rechazo si T ${cola === 'derecha' ? '>' : '<'} ${numero(test.critico, 3)}`, opacidad: 1, color: 'error' },
                dur: 0.4,
            },
        ]);
        n.decir(cola === 'dos'
            ? `Las zonas rojas suman α = ${numero(alfa, 3)}: ${pct(alfa / 2)} en cada cola. Si H₀ es cierta, caer ahí es muy raro. Los bordes son ±${numero(c, 3)}, el valor crítico de la tabla.`
            : `La zona roja tiene área α = ${numero(alfa, 3)}. Si H₀ es cierta, caer ahí es muy raro. Su borde, ${numero(test.critico, 3)}, es el valor crítico.`);

        n.preguntar('decision');
        n.capitulo('El estadístico');
        n.animar([
            { pieza: 'formula', a: { texto: formula, opacidad: 1 }, dur: 0.4 },
            { pieza: 'cuenta', a: { texto: cuenta, opacidad: 1, color: 'acento2', peso: 700 }, dur: 0.4, en: n.tiempo + 0.5 },
            { pieza: ['T', 'guia'], a: { opacidad: 1 }, dur: 0.3, en: n.tiempo + 1 },
            { pieza: 'T', a: { mx: marca }, dur: 1.4, en: n.tiempo + 1.3 },
            { pieza: 'guia', a: { x1: marca, x2: marca }, dur: 1.4, en: n.tiempo + 1.3 },
        ]);
        n.decir(afuera
            ? `Con los datos, T = ${numero(T, 2)}. Está tan lejos que ni entra en el dibujo: la campana, a esa distancia, es prácticamente cero.`
            : `Con los datos, T = ${numero(T, 2)}. ${test.rechaza ? 'Cayó en la zona roja.' : 'Cayó en la zona blanca, la de lo esperable.'}`);

        n.capitulo('El p-valor');
        n.animar([
            { pieza: colasP.map((_, i) => `p${i}`), a: { opacidad: 1 }, dur: 0.6 },
            { pieza: 'pvalor', a: { texto: `p-valor = ${pValor(test.pValor)}`, opacidad: 1, color: 'acento2', peso: 700 }, dur: 0.4 },
        ]);
        n.decir(`El p-valor es el área ${cola === 'dos' ? 'de las dos colas' : 'de la cola'} más allá de T: la probabilidad de ver algo tan extremo como esto, o más, si H₀ fuera cierta. Da ${pValor(test.pValor)}.`);
        n.decir(test.rechaza
            ? `Como es menor que α = ${numero(alfa, 3)}, llegamos a lo mismo que con la zona roja: los dos caminos siempre coinciden.`
            : `Como es mayor que α = ${numero(alfa, 3)}, llegamos a lo mismo que con la zona roja: los dos caminos siempre coinciden.`);

        n.capitulo('La decisión');
        n.animar({
            pieza: 'decision',
            a: { texto: test.rechaza ? 'Se rechaza H₀' : 'No se rechaza H₀', opacidad: 1, color: test.rechaza ? 'exito' : 'alerta', peso: 800 },
            dur: 0.4,
        });
        n.decir(test.rechaza ? siRechaza : siNoRechaza);
        if (!test.rechaza) n.decir('No rechazar H₀ no prueba que sea cierta: solo dice que estos datos no alcanzan para descartarla.');
        for (const nota of notas) n.decir(nota);

        return {
            titulo: titulo || 'Un test de hipótesis',
            descripcion: descripcion || `H₀: ${h0} contra H₁: ${h1}. T = ${numero(T, 3)}, p-valor ${pValor(test.pValor)}: ${test.rechaza ? 'se rechaza' : 'no se rechaza'} H₀ con α = ${numero(alfa, 3)}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Cómo se reparte la variabilidad =======================

/**
 * STC = SCR + SCE, con un punto y después con todos: cuánto se aleja cada y
 * de su promedio, cuánto de eso explica la recta y cuánto queda en el error.
 *
 * @param {{
 *     datos: [number, number][], etiquetaX?: string, etiquetaY?: string, destacar?: number, rango?: any,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `destacar` es el índice del punto que se usa de ejemplo. `preguntas` acepta 'r2'.
 */
export function desdeVariabilidad(opciones) {
    const { datos, etiquetaX = 'x', etiquetaY = 'y', titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const r = inferenciaRegresion(datos);
    const rango = opciones.rango ?? rangoDatos(datos);
    // El de ejemplo: si no se dice, el que más se aleja del promedio.
    const destacar = opciones.destacar ?? datos.reduce((mejor, [, y], i) => (Math.abs(y - r.mediaY) > Math.abs(datos[mejor][1] - r.mediaY) ? i : mejor), 0);
    const [xd, yd] = datos[destacar];
    const yhat = r.prediccion(xd);
    const corrida = (rango.xmax - rango.xmin) * 0.012;

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 320, y: arriba + 280, ancho: 600, alto: 540 } : { x: 500, y: arriba + 380, ancho: 900, alto: 730 };
        const pan = angosta ? { x: 24, y: arriba + 600, ancho: 600, tamano: 22 } : { x: 1000, y: arriba + 90, ancho: 580, tamano: 27 };
        const barra = angosta ? { x: 24, y: arriba + 990, ancho: 592, alto: 44 } : { x: 1000, y: arriba + 640, ancho: 560, alto: 56 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.plano = plano({ ...pl, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 15 : 19 });
        piezas.promedio = recta({ plano: 'plano', mx: r.mediaX, my: r.mediaY, pendiente: 0, color: 'suave', punteada: true, progreso: 0, etiqueta: 'ȳ' });
        piezas.recta = recta({ plano: 'plano', mx: r.mediaX, my: r.mediaY, pendiente: r.b1, color: 'acento2', progreso: 0, etiqueta: 'ŷ' });
        datos.forEach(([x, y], i) => {
            const yh = r.prediccion(x);
            piezas[`exp${i}`] = segmento({ plano: 'plano', x1: x, y1: r.mediaY, x2: x, y2: yh, color: 'exito', grosor: 2.5, opacidad: 0 });
            piezas[`res${i}`] = segmento({ plano: 'plano', x1: x, y1: yh, x2: x, y2: y, color: 'error', grosor: 2.5, opacidad: 0 });
        });
        datos.forEach(([x, y], i) => {
            piezas[`d${i}`] = punto({ plano: 'plano', mx: x, my: y, radio: angosta ? 5 : 7, color: 'acento', opacidad: 0 });
        });
        piezas.total = segmento({ plano: 'plano', x1: xd - corrida * 2.5, y1: r.mediaY, x2: xd - corrida * 2.5, y2: yd, color: 'texto', grosor: 5, progreso: 0, etiqueta: '' });
        piezas.expD = segmento({ plano: 'plano', x1: xd + corrida * 2.5, y1: r.mediaY, x2: xd + corrida * 2.5, y2: yhat, color: 'exito', grosor: 5, progreso: 0 });
        piezas.resD = segmento({ plano: 'plano', x1: xd + corrida * 2.5, y1: yhat, x2: xd + corrida * 2.5, y2: yd, color: 'error', grosor: 5, progreso: 0 });
        piezas.destacado = punto({ plano: 'plano', mx: xd, my: yd, radio: 10, color: 'acento', resaltado: 0, opacidad: 0 });
        panel(piezas, ['identidad', 'stc', 'scr', 'sce', 'suma', 'r2', 'sigma'], pan);
        // La barra de STC, partida en lo explicado y lo que no.
        const parte = r.scr / r.stc;
        piezas.barraExp = caja({ x: barra.x, y: barra.y + barra.alto / 2, ancho: 1, alto: barra.alto, radio: 6, relleno: 'exito', borde: 'exito', grosorBorde: 0, opacidad: 0 });
        piezas.barraErr = caja({ x: barra.x + barra.ancho, y: barra.y + barra.alto / 2, ancho: 1, alto: barra.alto, radio: 6, relleno: 'error', borde: 'error', grosorBorde: 0, opacidad: 0 });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const ids = datos.map((_, i) => `d${i}`);
        n.capitulo('Los datos y la recta');
        n.animar([
            { pieza: ids, a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.08, 1.5 / datos.length) },
            { pieza: 'promedio', a: { progreso: 1 }, dur: 0.8, en: n.tiempo + 0.8 },
            { pieza: 'recta', a: { progreso: 1 }, dur: 0.8, en: n.tiempo + 1.4 },
        ]);
        n.decir(`La línea punteada es el promedio ȳ = ${numero(r.mediaY, 2)}; la otra, la recta de mínimos cuadrados. La pregunta es cuánto mejor que el promedio predice la recta.`);

        n.capitulo('Un punto');
        n.animar([
            { pieza: 'destacado', a: { opacidad: 1, resaltado: 1 }, dur: 0.5 },
            { pieza: 'total', a: { progreso: 1 }, dur: 0.8, en: n.tiempo + 0.4 },
            { pieza: 'identidad', a: { texto: 'y − ȳ = (ŷ − ȳ) + (y − ŷ)', opacidad: 1, peso: 700 }, dur: 0.4 },
        ]);
        n.decir(`Este punto está a ${numero(yd - r.mediaY, 2)} del promedio: es la desviación total, y − ȳ.`);
        n.animar([
            { pieza: 'expD', a: { progreso: 1 }, dur: 0.7 },
            { pieza: 'resD', a: { progreso: 1 }, dur: 0.7, en: n.tiempo + 0.8 },
        ]);
        n.decir(`Se parte en dos: lo que la recta explica, ŷ − ȳ = ${numero(yhat - r.mediaY, 2)} (verde), y lo que queda sin explicar, el residuo y − ŷ = ${numero(yd - yhat, 2)} (rojo).`);

        n.capitulo('Todos los puntos');
        n.animar([
            { pieza: ['total', 'expD', 'resD'], a: { opacidad: 0 }, dur: 0.4 },
            { pieza: 'destacado', a: { resaltado: 0 }, dur: 0.4 },
            { pieza: datos.map((_, i) => `exp${i}`), a: { opacidad: 0.8 }, dur: 0.4, escalonar: 0.02 },
            { pieza: datos.map((_, i) => `res${i}`), a: { opacidad: 0.8 }, dur: 0.4, escalonar: 0.02, en: n.tiempo + 0.8 },
        ]);
        n.decir('Hacemos lo mismo con todos, elevamos al cuadrado y sumamos. Lo bueno es que la cuenta cierra también con los cuadrados.');
        n.animar([
            { pieza: 'stc', a: { texto: `STC = Σ(y − ȳ)² = ${numero(r.stc, 2)}`, opacidad: 1 }, dur: 0.4 },
            { pieza: 'scr', a: { texto: `SCR = Σ(ŷ − ȳ)² = ${numero(r.scr, 2)}`, opacidad: 1, color: 'exito' }, dur: 0.4, en: n.tiempo + 0.6 },
            { pieza: 'sce', a: { texto: `SCE = Σ(y − ŷ)² = ${numero(r.sce, 2)}`, opacidad: 1, color: 'error' }, dur: 0.4, en: n.tiempo + 1.2 },
            { pieza: 'suma', a: { texto: `${numero(r.scr, 2)} + ${numero(r.sce, 2)} = ${numero(r.scr + r.sce, 2)} ✓`, opacidad: 1, color: 'exito' }, dur: 0.4, en: n.tiempo + 1.8 },
            { pieza: ['barraExp', 'barraErr'], a: { opacidad: 1 }, dur: 0.3, en: n.tiempo + 2.2 },
            { pieza: 'barraExp', a: { ancho: barra.ancho * parte, x: barra.x + (barra.ancho * parte) / 2 }, dur: 1, en: n.tiempo + 2.2 },
            { pieza: 'barraErr', a: { ancho: barra.ancho * (1 - parte), x: barra.x + barra.ancho * parte + (barra.ancho * (1 - parte)) / 2 }, dur: 1, en: n.tiempo + 2.2 },
        ]);
        n.decir(`STC = SCR + SCE: la variabilidad total es la que explica la regresión más la que queda en los errores. Acá, ${numero(r.stc, 2)} = ${numero(r.scr, 2)} + ${numero(r.sce, 2)}.`);
        n.decir('Que cierre no es casualidad: pasa porque los residuos de mínimos cuadrados suman cero y no tienen relación con x. Por eso al verificarlo con los datos tiene que dar exacto, salvo redondeo.');

        n.preguntar('r2');
        n.capitulo('R² y la varianza');
        n.animar({ pieza: 'r2', a: { texto: `R² = 1 − SCE/STC = ${numero(r.r2, 4)}`, opacidad: 1, peso: 800, color: 'acento2' }, dur: 0.4 });
        n.decir(`R² es la parte verde de la barra: 1 − SCE/STC = ${numero(r.r2, 4)}. La recta explica el ${pct(r.r2)} de la variabilidad de ${etiquetaY}.`);
        n.animar({ pieza: 'sigma', a: { texto: `σ̂² = SCE / (n − 2) = ${numero(r.sigma2, 3)}`, opacidad: 1 }, dur: 0.4 });
        n.decir(`Y con lo que queda en los errores se estima la varianza del modelo: σ̂² = SCE / (n − 2) = ${numero(r.sigma2, 3)}. Se divide por n − 2 porque para calcular los residuos ya se estimaron dos números, b₀ y b₁.`);

        n.capitulo('Lo que R² NO dice');
        n.decir(`R² no dice que ${etiquetaX} cause ${etiquetaY}: una correlación alta puede venir de una tercera variable que mueve a las dos.`);
        n.decir('Tampoco dice que la recta sea el modelo correcto: una curva clarísima puede dar un R² alto igual. Para eso hay que mirar el gráfico de los residuos.');
        n.decir('Y no dice qué tan precisa es una predicción en las unidades del problema: eso lo dice σ̂, o el intervalo de predicción.');

        return {
            titulo: titulo || 'STC = SCR + SCE',
            descripcion: descripcion || `La descomposición de la variabilidad de una regresión con ${r.n} puntos: STC = ${numero(r.stc, 2)}, SCR = ${numero(r.scr, 2)}, SCE = ${numero(r.sce, 2)}, R² = ${numero(r.r2, 4)}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}



// ======================= Bandas de confianza y de predicción =======================

/**
 * El intervalo de confianza para la respuesta media y el de predicción, en
 * un x* y como bandas a lo largo de toda la recta.
 *
 * @param {{
 *     datos: [number, number][], xEstrella: number, confianza?: number, etiquetaX?: string, etiquetaY?: string,
 *     unidadY?: string, rango?: any,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `preguntas` acepta 'ancho' (antes de mostrar el intervalo de predicción).
 */
export function desdeBandas(opciones) {
    const { datos, xEstrella, confianza = 0.95, etiquetaX = 'x', etiquetaY = 'y', unidadY = '', titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const r = inferenciaRegresion(datos, { confianza });
    const rango = opciones.rango ?? rangoDatos(datos);
    const icm = r.icm(xEstrella);
    const ip = r.ip(xEstrella);
    const u = unidadY ? ` ${unidadY}` : '';
    const xs = datos.map(([x]) => x);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const intervalo = (i) => `[${numero(i.desde, 2)} ; ${numero(i.hasta, 2)}]`;

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 320, y: arriba + 280, ancho: 600, alto: 540 } : { x: 500, y: arriba + 380, ancho: 900, alto: 730 };
        const pan = angosta ? { x: 24, y: arriba + 600, ancho: 600, tamano: 21 } : { x: 990, y: arriba + 90, ancho: 590, tamano: 25 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.plano = plano({ ...pl, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 15 : 19 });
        piezas.bandaIP = area({ plano: 'plano', f: (x) => r.ip(x).hasta, g: (x) => r.ip(x).desde, desde: x0, hasta: x0, color: 'alerta', relleno: 0.16, borde: false });
        piezas.bandaICM = area({ plano: 'plano', f: (x) => r.icm(x).hasta, g: (x) => r.icm(x).desde, desde: x0, hasta: x0, color: 'acento2', relleno: 0.4, borde: false });
        datos.forEach(([x, y], i) => {
            piezas[`d${i}`] = punto({ plano: 'plano', mx: x, my: y, radio: angosta ? 5 : 7, color: 'acento', opacidad: 0 });
        });
        piezas.recta = recta({ plano: 'plano', mx: r.mediaX, my: r.mediaY, pendiente: r.b1, color: 'acento2', progreso: 0 });
        piezas.vertical = recta({ plano: 'plano', mx: xEstrella, my: 0, vertical: true, color: 'suave', punteada: true, progreso: 0, grosor: 2, etiqueta: `x* = ${numero(xEstrella)}` });
        // Cada intervalo es una barra vertical en x* que se abre desde ŷ*.
        piezas.ip = segmento({ plano: 'plano', x1: xEstrella, y1: ip.centro, x2: xEstrella, y2: ip.centro, color: 'alerta', grosor: 7, opacidad: 0 });
        piezas.icm = segmento({ plano: 'plano', x1: xEstrella, y1: icm.centro, x2: xEstrella, y2: icm.centro, color: 'acento2', grosor: 13, opacidad: 0 });
        piezas.yhat = punto({ plano: 'plano', mx: xEstrella, my: icm.centro, radio: 8, color: 'texto', opacidad: 0, etiqueta: 'ŷ*', lado: 'izquierda' });
        panel(piezas, ['estimacion', 'formulaICM', 'textoICM', 'formulaIP', 'textoIP', 'limite'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const t0 = () => n.tiempo;

        n.capitulo('La recta en x*');
        n.animar([
            { pieza: datos.map((_, i) => `d${i}`), a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.06, 1.2 / datos.length) },
            { pieza: 'recta', a: { progreso: 1 }, dur: 0.8, en: t0() + 0.8 },
            { pieza: 'vertical', a: { progreso: 1 }, dur: 0.6, en: t0() + 1.4 },
            { pieza: 'yhat', a: { opacidad: 1 }, dur: 0.4, en: t0() + 1.8 },
            {
                pieza: 'estimacion',
                a: { texto: `ŷ* = ${numero(r.b0, 3)} + ${numero(r.b1, 3)} · ${numero(xEstrella)} = ${numero(icm.centro, 3)}${u}`, opacidad: 1, peso: 700 },
                dur: 0.4, en: t0() + 1.8,
            },
        ]);
        n.decir(`En x* = ${numero(xEstrella)} la recta da ŷ* = ${numero(icm.centro, 3)}${u}. Pero la recta salió de una muestra: con otros datos sería otra. ¿Qué tan seguros estamos?`);
        n.decir('Hay dos preguntas distintas, y cada una tiene su intervalo.');


        n.capitulo('La respuesta media');
        n.animar({ pieza: 'formulaICM', a: { texto: 'ICM: ŷ* ± t · √(σ̂² (1/n + (x* − x̄)²/Sxx))', opacidad: 1 }, dur: 0.4 });
        n.animar({ pieza: 'icm', a: { opacidad: 1, y1: icm.desde, y2: icm.hasta }, dur: 0.8 }, 0.4);
        n.animar({ pieza: 'textoICM', a: { texto: `ICM ${pct(confianza)}: ${intervalo(icm)}`, opacidad: 1, color: 'acento2', peso: 700 }, dur: 0.4 }, 0.8);
        n.decir(`La primera: ¿dónde está la recta VERDADERA en x*? Es decir, el consumo promedio de todos los casos con x = ${numero(xEstrella)}. Ese es el intervalo de confianza para la respuesta media: ${intervalo(icm)}.`);
        n.animar({ pieza: 'bandaICM', a: { hasta: x1 }, dur: 1.6 });
        n.decir('Si lo calculamos para cada x, queda una banda. Es más angosta cerca de x̄ y se abre hacia los costados: lejos del centro de los datos, un error chico en la pendiente pesa más.');

        n.preguntar('ancho');
        n.capitulo('Un valor nuevo');
        n.animar({ pieza: 'formulaIP', a: { texto: 'IP: ŷ* ± t · √(σ̂² (1 + 1/n + (x* − x̄)²/Sxx))', opacidad: 1 }, dur: 0.4 });
        n.animar({ pieza: 'ip', a: { opacidad: 1, y1: ip.desde, y2: ip.hasta }, dur: 0.8 }, 0.4);
        n.animar({ pieza: 'textoIP', a: { texto: `IP ${pct(confianza)}: ${intervalo(ip)}`, opacidad: 1, color: 'alerta', peso: 700 }, dur: 0.4 }, 0.8);
        n.decir(`La segunda: ¿dónde va a caer UNA observación nueva con x = ${numero(xEstrella)}? Es el intervalo de predicción: ${intervalo(ip)}. Es mucho más ancho.`);
        n.animar({ pieza: 'bandaIP', a: { hasta: x1 }, dur: 1.6 });
        n.decir('La diferencia es el 1 de adentro de la raíz: además de no saber dónde está la recta, cada valor se aparta de ella por su cuenta, con varianza σ². Por eso la banda de predicción abarca a casi todos los puntos.');

        n.capitulo('Con muchísimos datos');
        n.animar({ pieza: 'limite', a: { texto: `n → ∞: ICM → 0;  IP → ± t·σ̂ ≈ ± ${numero(r.critico * r.sigma, 2)}`, opacidad: 1 }, dur: 0.4 });
        n.decir('Si juntamos cada vez más datos, 1/n y (x* − x̄)²/Sxx se van a cero: la banda de confianza se cierra sobre la recta. La de predicción no: le queda el 1, la variabilidad propia de cada caso.');
        n.decir('Con miles de datos, la recta media se conoce casi exacta; un caso individual sigue siendo tan incierto como siempre.');

        return {
            titulo: titulo || 'Intervalo de confianza y de predicción',
            descripcion: descripcion || `En x* = ${numero(xEstrella)}: ŷ* = ${numero(icm.centro, 3)}, ICM ${intervalo(icm)} e IP ${intervalo(ip)}, al ${pct(confianza)}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= El descenso con tres tasas =======================

/**
 * El descenso del gradiente con varias tasas de aprendizaje a la vez: a la
 * izquierda, los caminos sobre las curvas de nivel; a la derecha, f en
 * función del número de iteración, para las tres en los mismos ejes.
 *
 * @param {{
 *     f: (x: number, y: number) => number, gradiente?: (x: number, y: number) => [number, number],
 *     inicio: [number, number], tasas: { tasa: number, nombre: string }[], pasos?: number,
 *     rango?: { xmin: number, xmax: number, ymin: number, ymax: number }, niveles?: number[],
 *     etiquetaX?: string, etiquetaY?: string, minimo?: [number, number],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `minimo` es la solución exacta, si se conoce (para compararla al final).
 *     `preguntas` acepta 'grande' (antes de correr la tasa más grande).
 */
export function desdeTasas(opciones) {
    const {
        f, inicio, tasas, pasos = 20, etiquetaX = 'x', etiquetaY = 'y', minimo = null,
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    if (!Array.isArray(tasas) || !tasas.length) throw new Error('desdeTasas necesita las tasas: tasas: [{ tasa: 0.01, nombre: "chica" }, ...].');
    const corridas = tasas.map((t) => ({ ...t, ...descensoGradiente(f, { inicio, tasa: t.tasa, pasos, gradiente: opciones.gradiente, tolerancia: 0 }) }));
    const rango = opciones.rango ?? { xmin: -4, xmax: 4, ymin: -4, ymax: 4 };
    const niveles = opciones.niveles ?? nivelesAutomaticos(f, rango);
    const f0 = f(inicio[0], inicio[1]);
    // El piso: el mínimo exacto si se conoce, o lo más bajo que llegó alguna corrida.
    const fmin = minimo ? f(minimo[0], minimo[1]) : Math.min(...corridas.flatMap((c) => c.puntos.map((p) => p.z)));
    const COLORES = ['suave', 'exito', 'error', 'acento'];

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const izq = angosta ? { x: 320, y: arriba + 250, ancho: 480, alto: 480 } : { x: 400, y: arriba + 380, ancho: 700, alto: 700 };
        const der = angosta ? { x: 320, y: arriba + 720, ancho: 600, alto: 380 } : { x: 1190, y: arriba + 300, ancho: 720, alto: 520 };
        const pan = angosta ? { x: 24, y: arriba + 935, ancho: 600, tamano: 20, interlineado: 1.8 } : { x: 840, y: arriba + 610, ancho: 740, tamano: 24, interlineado: 1.9 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.mapa = plano({ ...izq, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 14 : 18 });
        piezas.curvas = curvasNivel({ plano: 'mapa', f, niveles, progreso: 0 });
        piezas.costo = plano({ ...der, xmin: 0, xmax: pasos, ymin: 0, ymax: f0 * 1.25, etiquetaX: 'k', etiquetaY: 'f', tamano: angosta ? 14 : 18 });
        piezas.inicio = punto({ plano: 'mapa', mx: inicio[0], my: inicio[1], radio: 9, color: 'texto', opacidad: 0, etiqueta: 'inicio' });
        if (minimo) piezas.minimo = punto({ plano: 'mapa', mx: minimo[0], my: minimo[1], radio: 8, color: 'acento2', opacidad: 0, etiqueta: 'mínimo', lado: 'abajo-derecha' });
        corridas.forEach((c, i) => {
            const color = COLORES[i % COLORES.length];
            piezas[`camino${i}`] = grafica({ plano: 'mapa', datos: c.puntos.map((p) => [p.x, p.y]), trazo: 0, color, grosor: 3.5 });
            piezas[`curva${i}`] = grafica({ plano: 'costo', datos: c.puntos.map((p, k) => [k, p.z]), trazo: 0, color, grosor: 4, etiqueta: `α = ${numero(c.tasa, 4)}` });
        });
        panel(piezas, corridas.map((_, i) => `texto${i}`).concat('criterio'), pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });
        n.capitulo('El terreno');
        n.animar([
            { pieza: 'curvas', a: { progreso: niveles.length }, dur: 1.6 },
            { pieza: 'inicio', a: { opacidad: 1 }, dur: 0.4 },
            ...(minimo ? [{ pieza: 'minimo', a: { opacidad: 1 }, dur: 0.4 }] : []),
        ]);
        n.decir('A la izquierda, las curvas de nivel de la función que queremos minimizar. Todas las corridas arrancan del mismo punto.');
        n.decir('Cada paso hace b ← b − α ∇f(b): el gradiente apunta hacia donde f sube más rápido, así que restarlo es bajar por la pendiente más empinada. α decide qué tan largo es el paso.');

        corridas.forEach((c, i) => {
            if (i === corridas.length - 1) n.preguntar('grande');
            n.capitulo(`α = ${numero(c.tasa, 4)} (${c.nombre})`);
            const final = c.puntos.at(-1);
            const durTrazo = 2.4;
            n.animar([
                { pieza: `camino${i}`, a: { trazo: 1 }, dur: durTrazo, curva: 'lineal' },
                { pieza: `curva${i}`, a: { trazo: 1 }, dur: durTrazo, curva: 'lineal' },
            ]);
            const resumenTexto = c.motivo === 'diverge'
                ? `α = ${numero(c.tasa, 4)}: diverge (f se dispara en la iteración ${c.puntos.length})`
                : `α = ${numero(c.tasa, 4)}: f = ${numero(final.z, 4)} en ${c.puntos.length - 1} iteraciones`;
            n.animar({ pieza: `texto${i}`, a: { texto: resumenTexto, opacidad: 1, color: COLORES[i % COLORES.length], peso: 700 }, dur: 0.4 }, durTrazo);
            const sube = c.puntos.length > 1 && c.puntos.at(-1).z > c.puntos[0].z;
            if (c.motivo === 'diverge' || sube) {
                n.decir(`Con α = ${numero(c.tasa, 4)} el paso es tan largo que se pasa del otro lado del valle, cada vez más arriba. f crece en vez de bajar: el algoritmo diverge.`);
            } else if (final.z - fmin > (f0 - fmin) * 0.03) {
                n.decir(`Con α = ${numero(c.tasa, 4)} va en la dirección correcta, pero con pasitos tan cortos que después de ${c.puntos.length - 1} iteraciones sigue lejos del mínimo. Converge, pero lentísimo.`);
            } else {
                n.decir(`Con α = ${numero(c.tasa, 4)} baja rápido y se acomoda en el fondo del valle: f cae casi a su mínimo en pocas iteraciones.`);
            }
        });

        n.capitulo('Cuándo parar');
        n.animar({ pieza: 'criterio', a: { texto: 'Parar cuando ‖∇f‖ < ε, o cuando f casi no cambia, o al llegar a un máximo de iteraciones.', opacidad: 1 }, dur: 0.4 });
        n.decir('Hace falta un criterio de detención: cortar cuando el gradiente es casi cero (estamos en el fondo), cuando f deja de bajar, o al llegar a un tope de iteraciones por si diverge.');
        if (minimo) n.decir(`Al final se compara con la solución exacta de mínimos cuadrados, (${numero(minimo[0], 3)}, ${numero(minimo[1], 3)}): con una buena tasa, tienen que coincidir en varios decimales.`);
        n.decir('Un detalle que cambia todo: si las variables tienen escalas muy distintas (segundos contra porcentajes, por ejemplo), las curvas de nivel quedan larguísimas y no hay una tasa que sirva para todas. Por eso se suelen estandarizar antes.');

        return {
            titulo: titulo || 'Tres tasas de aprendizaje',
            descripcion: descripcion || `El descenso del gradiente desde el mismo punto con α = ${corridas.map((c) => numero(c.tasa, 4)).join(', ')}, y f en función de la iteración.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

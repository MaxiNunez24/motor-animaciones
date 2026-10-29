import { crearNarrador } from '../pedagogico/narrar.js';
import { plano, grafica, punto, recta, segmento, area } from '../mate/plano.js';
import { lienzo, piezaTitulo, panel, muestrear } from '../mate/escenas.js';
import { numero } from '../mate/calculo.js';
import {
    caminoPrecio, rendimientos, volatilidad, valorFuturo, valorPresente, pagoAlVencer, blackScholes, griegas,
    densidadFinal, montecarlo, normalesConSemilla, plata, fijo,
} from './calculo.js';

// Escenas de finanzas que se arman solas: qué es una acción y cómo se mueve
// su precio, el valor del dinero en el tiempo, qué paga una opción al vencer,
// de dónde sale la fórmula de Black-Scholes y qué miden las griegas.
//
// Como las de matemática: las cuentas las hace calculo.js y acá se decide qué
// se muestra y en qué orden se cuenta. Todos los números que se dicen salen
// de las cuentas, así que con otros datos la explicación sigue siendo cierta.
// Los nombres de empresas y los precios son inventados: no es una
// recomendación de nada.

const pct = (p, d = 1) => `${numero(p * 100, d)} %`;

/** Un entero con punto de miles: 20.000. */
const miles = (v) => numero(v, 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Cómo se dice un plazo en años: "6 meses", "1 año", "2 años", "1 semana". */
function plazo(T) {
    if (T >= 1 && Math.abs(T - Math.round(T)) < 1e-9) return `${Math.round(T)} año${Math.round(T) === 1 ? '' : 's'}`;
    const meses = T * 12;
    if (meses >= 1 && Math.abs(meses - Math.round(meses)) < 1e-6) return `${Math.round(meses)} mes${Math.round(meses) === 1 ? '' : 'es'}`;
    const semanas = Math.round(T * 52);
    if (semanas >= 1) return `${semanas} semana${semanas === 1 ? '' : 's'}`;
    return `${Math.max(1, Math.round(T * 365))} días`;
}

/** Un paso redondo para los números de un eje que va de 0 a `alto`. */
function pasoPara(alto, marcas = 5) {
    const crudo = alto / marcas;
    const base = 10 ** Math.floor(Math.log10(crudo));
    return [1, 2, 5, 10].map((m) => m * base).find((p) => p >= crudo) ?? base * 10;
}

// ======================= Una acción y su precio =======================

/**
 * Qué es una acción, cómo camina su precio, qué es un rendimiento y qué es
 * la volatilidad: dos acciones con el mismo rendimiento esperado y distinta
 * volatilidad, con las mismas "sorpresas" (la misma semilla).
 *
 * @param {{
 *     S0?: number, mu?: number, sigma?: number, sigmaAlta?: number, dias?: number, semilla?: number,
 *     nombres?: [string, string],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} [opciones]
 *     `preguntas` acepta 'derecho' (antes de presentar las opciones).
 */
export function desdeAccion(opciones = {}) {
    const {
        S0 = 100, mu = 0.08, sigma = 0.2, sigmaAlta = 0.45, dias = 126, semilla = 4, nombres = ['Tranquila S.A.', 'Montaña Rusa S.A.'],
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    const calmo = caminoPrecio({ S0, mu, sigma, dias, semilla });
    const movido = caminoPrecio({ S0, mu, sigma: sigmaAlta, dias, semilla });
    const todos = [...calmo, ...movido];
    const lo = Math.min(...todos);
    const hi = Math.max(...todos);
    const margen = (hi - lo) * 0.08;
    const rango = { ymin: Math.floor((lo - margen) / 5) * 5, ymax: Math.ceil((hi + margen) / 5) * 5 };
    const volC = volatilidad(calmo);
    const volM = volatilidad(movido);
    const fin = calmo.at(-1);
    const cambio = fin / S0 - 1;

    // El día para mirar de cerca: el de la suba más grande (que se note), sin
    // irse a las puntas.
    const rend = rendimientos(calmo, { logaritmicos: false });
    let dia = Math.floor(dias / 2);
    for (let i = 5; i < dias - 5; i++) if (rend[i] > rend[dia]) dia = i;
    const p0 = calmo[dia];
    const p1 = calmo[dia + 1];
    const ventana = { xmin: dia - 2, xmax: dia + 3 };
    const cerca = calmo.slice(ventana.xmin, ventana.xmax + 1);
    const holgura = (Math.max(...cerca) - Math.min(...cerca)) * 0.35 + 0.2;
    const zoom = { ...ventana, ymin: Math.min(...cerca) - holgura, ymax: Math.max(...cerca) + holgura };
    // Las marcas de los ejes cambian de golpe al final del acercamiento (un paso
    // que se interpola daría marcas en 7,3 días).
    const marcasCerca = { pasoX: 1, pasoY: pasoPara(zoom.ymax - zoom.ymin, 4) };

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 330, y: arriba + 250, ancho: 580, alto: 420 } : { x: 560, y: arriba + 360, ancho: 1000, alto: 600 };
        const pan = angosta ? { x: 24, y: arriba + 540, ancho: 600, tamano: 23 } : { x: 1100, y: arriba + 90, ancho: 480, tamano: 24 };
        const chico = angosta ? 15 : 19;
        const marcasLejos = { pasoX: dias > 100 ? 21 : 10, pasoY: pasoPara(rango.ymax - rango.ymin, angosta ? 4 : 6) };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.precio = plano({
            ...pl, xmin: 0, xmax: dias, ...rango, ...marcasLejos,
            etiquetaX: 'días de bolsa', etiquetaY: '$', tamano: chico, decimales: 1,
        });
        piezas.calmo = grafica({ plano: 'precio', datos: calmo.map((p, i) => [i, p]), trazo: 0, color: 'acento', grosor: angosta ? 3 : 3.5 });
        piezas.movido = grafica({ plano: 'precio', datos: movido.map((p, i) => [i, p]), trazo: 0, color: 'acento2', grosor: angosta ? 3 : 3.5 });
        piezas.hoy = punto({ plano: 'precio', mx: 0, my: S0, radio: 9, color: 'acento', etiqueta: plata(S0), lado: 'arriba-derecha', opacidad: 0 });
        piezas.final = punto({ plano: 'precio', mx: dias, my: fin, radio: 9, color: 'acento', etiqueta: plata(fin), lado: 'arriba-izquierda', opacidad: 0 });
        piezas.antes = punto({ plano: 'precio', mx: dia, my: p0, radio: 10, color: 'acento', etiqueta: 'P₀', lado: 'abajo', opacidad: 0 });
        piezas.despues = punto({ plano: 'precio', mx: dia + 1, my: p1, radio: 10, color: 'exito', etiqueta: 'P₁', lado: 'arriba', opacidad: 0 });
        piezas.salto = segmento({ plano: 'precio', x1: dia + 1, y1: p0, x2: dia + 1, y2: p0, color: 'exito', grosor: 5, opacidad: 0 });
        panel(piezas, ['que', 'hoyTxt', 'simple', 'logaritmico', 'volCalmo', 'volMovido', 'cierre'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });

        n.capitulo('Una acción');
        n.animar([
            { pieza: 'que', a: { texto: 'Acción: una parte de una empresa', opacidad: 1, peso: 700 }, dur: 0.4 },
        ]);
        n.decir('Una acción es un pedacito de una empresa. Quien la tiene es dueño de una parte, chiquita, de lo que la empresa vale y de lo que gana.');
        n.animar([
            { pieza: 'hoy', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'hoyTxt', a: { texto: `${nombres[0]} hoy: ${plata(S0)}`, opacidad: 1, color: 'acento' }, dur: 0.4 },
        ]);
        n.decir(`En la bolsa se compran y se venden todo el día. El precio es el de la última operación: lo que alguien pagó y otro aceptó. Hoy, ${nombres[0]} cotiza a ${plata(S0)}.`);

        n.capitulo('El precio camina');
        n.animar({ pieza: 'calmo', a: { trazo: 1 }, dur: 5 });
        n.decir('Día a día, el precio sube o baja según lo que compradores y vendedores creen que vale la empresa: noticias, resultados, el humor del mercado. Nadie sabe cuál va a ser el próximo paso.');
        n.animar([
            { pieza: 'final', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'hoyTxt', a: { texto: `${plata(S0, 0)} → ${plata(fin)} (${cambio >= 0 ? '+' : '−'}${pct(Math.abs(cambio))})` }, dur: 0.3 },
        ]);
        n.decir(`Después de ${dias} días de bolsa terminó en ${plata(fin)}: ${cambio >= 0 ? 'subió' : 'bajó'} un ${pct(Math.abs(cambio))}. Por eso, para pensar el precio de mañana, se lo trata como algo al azar.`);

        n.capitulo('El rendimiento');
        n.animar([
            { pieza: 'precio', a: zoom, dur: 1.4 },
            { pieza: 'precio', a: marcasCerca, dur: 0, en: n.tiempo + 1.4 },
            { pieza: ['hoy', 'final'], a: { opacidad: 0 }, dur: 0.3 },
            { pieza: 'antes', a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.2 },
            { pieza: 'despues', a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.5 },
            { pieza: 'salto', a: { y2: p1, opacidad: 1 }, dur: 0.6, en: n.tiempo + 1.6 },
        ]);
        n.esperar(1.6);
        n.animar({
            pieza: 'simple',
            a: { texto: `(P₁ − P₀) / P₀ = ${pct(p1 / p0 - 1, 2)}`, opacidad: 1 },
            dur: 0.4,
        });
        n.decir(`Miremos de cerca el día ${dia}. De un día al otro pasó de ${plata(p0)} a ${plata(p1)}. Lo que importa no es cuántos pesos subió, sino cuánto en proporción: el rendimiento, ${pct(p1 / p0 - 1, 2)}.`);
        n.animar({ pieza: 'logaritmico', a: { texto: `ln(P₁ / P₀) = ${fijo(Math.log(p1 / p0), 4)}`, opacidad: 1 }, dur: 0.4 });
        n.decir(`En finanzas se usa más el rendimiento logarítmico, ln(P₁ / P₀) = ${fijo(Math.log(p1 / p0), 4)}. Cuando es chico es casi igual, y tiene una ventaja: el de varios días es la suma de los de cada día.`);

        n.capitulo('La volatilidad');
        n.animar([
            { pieza: 'precio', a: { xmin: 0, xmax: dias, ...rango }, dur: 1.4 },
            { pieza: 'precio', a: marcasLejos, dur: 0 },
            { pieza: ['antes', 'despues', 'salto'], a: { opacidad: 0 }, dur: 0.3 },
            { pieza: 'movido', a: { trazo: 1 }, dur: 5, en: n.tiempo + 1.4 },
        ]);
        n.esperar(1.4);
        n.decir(`Ahora sumemos otra acción, ${nombres[1]}. Las dos rinden lo mismo en promedio, pero la naranja se sacude mucho más: sube más fuerte, baja más fuerte.`);
        n.animar([
            { pieza: 'volCalmo', a: { texto: `σ ${nombres[0]}: ${pct(volC)} anual`, opacidad: 1, color: 'acento', peso: 700 }, dur: 0.4 },
            { pieza: 'volMovido', a: { texto: `σ ${nombres[1]}: ${pct(volM)} anual`, opacidad: 1, color: 'acento2', peso: 700 }, dur: 0.4, en: n.tiempo + 0.5 },
        ]);
        n.decir(`Eso es la volatilidad, σ (sigma): cuánto se dispersan los rendimientos. Se calcula como el desvío estándar de los rendimientos diarios, pasado a un año multiplicando por √252, los días de bolsa de un año. Acá da ${pct(volC)} y ${pct(volM)}.`);
        n.decir('La volatilidad es la medida del riesgo: con la naranja se puede ganar mucho más, y perder mucho más.');

        n.preguntar('derecho');
        n.capitulo('Un derecho');
        n.animar({ pieza: 'cierre', a: { texto: 'Pérdida acotada, ganancia sin techo', opacidad: 1, color: 'exito', peso: 700 }, dur: 0.4 });
        n.decir('Ahora imaginá que en vez de la acción tenés solo el derecho a comprarla a un precio fijo, más adelante, si te conviene. Si se dispara, ganás; si se desploma, no la comprás y listo. Con una acción que se sacude más, ese derecho vale más.');
        n.decir('Ese derecho se llama opción, y es lo que sigue.');

        return {
            titulo: titulo || 'Una acción y su precio',
            descripcion: descripcion || `Dos acciones inventadas con la misma tendencia y distinta volatilidad (${pct(volC)} y ${pct(volM)}): el rendimiento de un día y cómo se mide el riesgo.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= El valor del dinero en el tiempo =======================

/**
 * Por qué un peso de hoy vale más que uno de mañana: el interés compuesto
 * (anual, mensual y continuo) y, al revés, el valor presente: e^(−rT), que
 * es lo que aparece en Black-Scholes.
 *
 * @param {{
 *     monto?: number, tasa?: number, anios?: number, promesa?: number,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} [opciones]
 *     `promesa` es lo que te prometen cobrar al final (para el valor presente).
 *     `preguntas` acepta 'tasa' (antes de cerrar).
 */
export function desdeInteres(opciones = {}) {
    const {
        monto = 1000, tasa = 0.12, anios = 5, promesa = 2000,
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    const anual = valorFuturo(monto, tasa, anios, 1);
    const mensual = valorFuturo(monto, tasa, anios, 12);
    const continua = valorFuturo(monto, tasa, anios);
    const presente = valorPresente(promesa, tasa, anios);
    const escalones = (veces) => {
        const datos = [];
        for (let j = 0; j < veces * anios; j++) {
            const v = valorFuturo(monto, tasa, j / veces, veces);
            datos.push([j / veces, v], [(j + 1) / veces, v]);
        }
        datos.push([anios, valorFuturo(monto, tasa, anios, veces)]);
        return datos;
    };
    const ymax = Math.ceil(Math.max(continua, promesa) * 1.12 / 250) * 250;

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 330, y: arriba + 250, ancho: 580, alto: 420 } : { x: 560, y: arriba + 360, ancho: 1000, alto: 600 };
        const pan = angosta ? { x: 24, y: arriba + 540, ancho: 600, tamano: 23 } : { x: 1100, y: arriba + 90, ancho: 480, tamano: 24 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.tiempo = plano({
            ...pl, xmin: 0, xmax: anios * 1.04, ymin: 0, ymax, pasoX: 1, pasoY: pasoPara(ymax, angosta ? 4 : 6),
            etiquetaX: 'años', etiquetaY: '$', tamano: angosta ? 15 : 19, decimales: 0,
        });
        piezas.inicio = punto({ plano: 'tiempo', mx: 0, my: monto, radio: 9, color: 'acento', etiqueta: plata(monto, 0), lado: 'abajo-derecha', opacidad: 0 });
        piezas.anual = grafica({ plano: 'tiempo', datos: escalones(1), trazo: 0, color: 'suave', grosor: 3 });
        piezas.mensual = grafica({ plano: 'tiempo', datos: escalones(12), trazo: 0, color: 'acento2', grosor: 3 });
        piezas.continua = grafica({ plano: 'tiempo', f: (t) => valorFuturo(monto, tasa, t), desde: 0, hasta: anios, trazo: 0, color: 'acento', grosor: 4 });
        piezas.futuro = punto({ plano: 'tiempo', mx: anios, my: continua, radio: 9, color: 'acento', etiqueta: plata(continua, 0), lado: 'izquierda', opacidad: 0 });
        piezas.promesa = punto({ plano: 'tiempo', mx: anios, my: promesa, radio: 10, color: 'exito', etiqueta: `K = ${plata(promesa, 0)}`, lado: 'izquierda', opacidad: 0 });
        // El camino de vuelta: de lo prometido (al final) a lo que vale hoy (en el 0).
        piezas.descuento = grafica({
            plano: 'tiempo', parametrica: (u) => [anios * (1 - u), valorPresente(promesa, tasa, anios * u)], trazo: 0, color: 'exito', grosor: 4, punteada: true,
        });
        piezas.hoy = punto({ plano: 'tiempo', mx: 0, my: presente, radio: 10, color: 'exito', etiqueta: plata(presente, 0), lado: 'arriba-derecha', opacidad: 0 });
        panel(piezas, ['regla', 'lAnual', 'lMensual', 'lContinua', 'lPresente', 'lFormula'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });

        n.capitulo('Un peso hoy vale más');
        n.animar([
            { pieza: 'inicio', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'regla', a: { texto: `${plata(monto, 0)} al ${pct(tasa, 0)} anual`, opacidad: 1, peso: 700 }, dur: 0.4 },
        ]);
        n.decir(`¿Qué preferís: ${plata(monto, 0)} hoy o ${plata(monto, 0)} dentro de un año? Hoy, aunque no haya inflación: la plata de hoy se puede prestar o invertir y genera interés. Supongamos una tasa del ${pct(tasa, 0)} anual, sin riesgo.`);

        n.capitulo('Interés compuesto');
        n.animar([
            { pieza: 'anual', a: { trazo: 1 }, dur: 2 },
            { pieza: 'lAnual', a: { texto: `Una vez por año: ${plata(anual)}`, opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.6 },
        ]);
        n.decir(`Si los intereses se suman una vez por año, al año siguiente también ganan interés: eso es el interés compuesto. En ${plazo(anios)} se llega a ${plata(anual)}.`);
        n.animar([
            { pieza: 'mensual', a: { trazo: 1 }, dur: 2 },
            { pieza: 'lMensual', a: { texto: `Una vez por mes: ${plata(mensual)}`, opacidad: 1, color: 'acento2' }, dur: 0.4, en: n.tiempo + 1.6 },
        ]);
        n.decir(`Si se suman cada mes (un ${pct(tasa / 12, 0)} mensual), los escalones son más chiquitos y se llega a un poco más: ${plata(mensual)}.`);
        n.animar([
            { pieza: 'continua', a: { trazo: 1 }, dur: 2 },
            { pieza: 'futuro', a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.8 },
            { pieza: 'lContinua', a: { texto: `Continuo, e^(rT): ${plata(continua)}`, opacidad: 1, color: 'acento', peso: 700 }, dur: 0.4, en: n.tiempo + 1.6 },
        ]);
        n.decir(`Y si se suman a cada instante, los escalones desaparecen y queda una curva: monto · e^(rT) = ${plata(continua)}. Es la capitalización continua, y es la que usan los modelos de finanzas porque las cuentas quedan más simples.`);

        n.capitulo('Para atrás: el valor presente');
        n.animar([
            { pieza: ['anual', 'mensual'], a: { opacidad: 0.25 }, dur: 0.5 },
            { pieza: 'promesa', a: { opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`Ahora al revés: te prometen ${plata(promesa, 0)} dentro de ${plazo(anios)}, seguro. ¿Cuánto vale esa promesa hoy?`);
        n.animar([
            { pieza: 'descuento', a: { trazo: 1 }, dur: 2.4 },
            { pieza: 'hoy', a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 2.2 },
            { pieza: 'lPresente', a: { texto: `Hoy: K · e^(−rT) = ${plata(presente)}`, opacidad: 1, color: 'exito', peso: 700 }, dur: 0.4, en: n.tiempo + 2.2 },
        ]);
        n.decir(`Es la misma cuenta dada vuelta: ${plata(promesa, 0)} · e^(−${numero(tasa, 2)} · ${anios}) = ${plata(presente)}. Si hoy pusieras ${plata(presente)} al ${pct(tasa, 0)}, en ${plazo(anios)} tendrías justo ${plata(promesa, 0)}. A esto se le dice descontar.`);
        n.animar({ pieza: 'lFormula', a: { texto: 'En Black-Scholes: K · e^(−rT)', opacidad: 1 }, dur: 0.4 });
        n.decir('Guardá esta cuenta: en la fórmula de Black-Scholes aparece K · e^(−rT), el precio de ejercicio de una opción traído a hoy.');

        n.preguntar('tasa');
        n.capitulo('Si sube la tasa');
        const presenteAlta = valorPresente(promesa, tasa * 2, anios);
        n.decir(`Con una tasa del ${pct(tasa * 2, 0)}, esa misma promesa vale hoy ${plata(presenteAlta)}: menos. Cuanto más rinde la plata de hoy, menos hace falta poner para llegar a lo mismo.`);

        return {
            titulo: titulo || 'El valor del dinero en el tiempo',
            descripcion: descripcion || `${plata(monto, 0)} al ${pct(tasa, 0)} durante ${plazo(anios)}, con interés anual, mensual y continuo; y lo que vale hoy cobrar ${plata(promesa, 0)} al final.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Qué paga una opción =======================

/**
 * Un call y un put el día que vencen: lo que paga el contrato, la ganancia de
 * quien lo compró (descontando la prima), el punto de empate y la ganancia de
 * quien lo vendió.
 *
 * @param {{
 *     K?: number, prima?: number, primaPut?: number, accion?: string,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} [opciones]
 *     `preguntas` acepta 'techo' (antes de mostrar a quien lo vendió).
 */
export function desdePago(opciones = {}) {
    const {
        K = 100, prima = 6, primaPut = 4, accion = 'la acción',
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    const xmin = K * 0.6;
    const xmax = K * 1.4;
    const tope = K * 0.4;
    const abajo = K * 0.3;
    // k = 0 es el call; k = 1, el put (y en el medio, un poco de cada uno, mientras se transforma).
    const pago = (S, k) => (1 - k) * pagoAlVencer('call', S, K) + k * pagoAlVencer('put', S, K);
    const ganancia = (S, k) => pago(S, k) - ((1 - k) * prima + k * primaPut);
    const casoBajo = K * 0.7;
    const casoAlto = K * 1.3;

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 330, y: arriba + 260, ancho: 580, alto: 440 } : { x: 560, y: arriba + 360, ancho: 1000, alto: 620 };
        const pan = angosta ? { x: 24, y: arriba + 560, ancho: 600, tamano: 23 } : { x: 1100, y: arriba + 90, ancho: 480, tamano: 24 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.pl = plano({
            ...pl, xmin, xmax, ymin: -abajo, ymax: tope, pasoX: pasoPara(xmax - xmin, angosta ? 4 : 8), pasoY: pasoPara(tope + abajo, angosta ? 4 : 7),
            etiquetaX: 'S al vencer', etiquetaY: 'ganancia', tamano: angosta ? 15 : 19, decimales: 0,
        });
        piezas.strike = recta({ plano: 'pl', mx: K, my: 0, vertical: true, color: 'suave', punteada: true, progreso: 0, etiqueta: `K = ${plata(K, 0)}`, grosor: 2.5 });
        piezas.pago = grafica({ plano: 'pl', f: pago, k: 0, trazo: 0, color: 'suave', grosor: 3, punteada: true });
        piezas.ganancia = grafica({ plano: 'pl', f: ganancia, k: 0, trazo: 0, color: 'acento', grosor: 5 });
        piezas.vendedor = grafica({ plano: 'pl', f: (S) => -ganancia(S, 0), trazo: 0, color: 'acento2', grosor: 4 });
        piezas.caso = punto({ plano: 'pl', mx: casoBajo, my: ganancia(casoBajo, 0), radio: 11, color: 'acento', etiqueta: '', lado: 'arriba', opacidad: 0 });
        piezas.empate = punto({ plano: 'pl', mx: K + prima, my: 0, radio: 9, color: 'exito', etiqueta: `empate ${plata(K + prima, 0)}`, lado: 'abajo-derecha', opacidad: 0 });
        panel(piezas, ['que', 'lPrima', 'lPago', 'lGanancia', 'lEmpate', 'lCaso'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const enCaso = (S, k = 0) => {
            const g = ganancia(S, k);
            return { mx: S, my: g, etiqueta: g >= 0 ? `+${plata(g, 0)}` : plata(g, 0) };
        };

        n.capitulo('Un derecho, no una obligación');
        n.animar([
            { pieza: 'que', a: { texto: `Call: derecho a COMPRAR a K = ${plata(K, 0)}`, opacidad: 1, peso: 800, color: 'acento' }, dur: 0.4 },
            { pieza: 'strike', a: { progreso: 1 }, dur: 0.8 },
        ]);
        n.decir(`Un call es un contrato que da el derecho, pero no la obligación, de comprar ${accion} a un precio fijo, K = ${plata(K, 0)} (el precio de ejercicio), en una fecha: el vencimiento.`);
        n.animar({ pieza: 'lPrima', a: { texto: `Prima (lo que cuesta hoy): ${plata(prima, 0)}`, opacidad: 1 }, dur: 0.4 });
        n.decir(`Ese derecho se paga por adelantado: es la prima, ${plata(prima, 0)}. Pase lo que pase, es todo lo que podés perder.`);

        n.capitulo('Si termina abajo de K');
        n.animar([
            { pieza: 'caso', a: { ...enCaso(casoBajo), opacidad: 1 }, dur: 0.4 },
            { pieza: 'lCaso', a: { texto: `S = ${plata(casoBajo, 0)}: no ejercés → ${plata(-prima, 0)}`, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`Si al vencer ${accion} vale ${plata(casoBajo, 0)}, ¿quién va a querer comprarla a ${plata(K, 0)}? Nadie: no ejercés el derecho. El contrato no paga nada y perdiste la prima: ${plata(-prima, 0)}.`);

        n.capitulo('Si termina arriba de K');
        n.animar([
            { pieza: 'caso', a: enCaso(casoAlto), dur: 1.2 },
            { pieza: 'lCaso', a: { texto: `S = ${plata(casoAlto, 0)}: paga ${plata(casoAlto - K, 0)} → +${plata(casoAlto - K - prima, 0)}` }, dur: 0.3, en: n.tiempo + 1 },
        ]);
        n.decir(`Si vale ${plata(casoAlto, 0)}, ejercés: comprás a ${plata(K, 0)} algo que vale ${plata(casoAlto, 0)}. El contrato te deja ${plata(casoAlto - K, 0)}; menos la prima, ganaste ${plata(casoAlto - K - prima, 0)}.`);
        n.animar([
            { pieza: 'pago', a: { trazo: 1 }, dur: 1.4 },
            { pieza: 'lPago', a: { texto: 'Paga al vencer: máx(S − K, 0)', opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir('Haciendo lo mismo para cada precio posible queda la línea punteada: lo que paga el contrato, máx(S − K, 0). Cero mientras S no pase a K, y de ahí sube peso por peso.');
        n.animar([
            { pieza: 'ganancia', a: { trazo: 1 }, dur: 1.4 },
            { pieza: 'lGanancia', a: { texto: 'Ganancia = pago − prima', opacidad: 1, color: 'acento', peso: 700 }, dur: 0.4 },
        ]);
        n.decir(`La línea llena es tu ganancia: la misma, corrida ${plata(prima, 0)} para abajo. Por su forma le dicen "palo de hockey".`);
        // El caso recorre la ganancia de punta a punta: así se lee qué pasa en cada precio.
        const recorrido = 3.2;
        muestrear(n, recorrido, 0.1, (f, en, dur) => {
            const S = casoAlto + (xmin + 2 - casoAlto) * Math.sin((f * Math.PI) / 2) ** 2;
            n.linea.push({ pieza: 'caso', a: enCaso(S), dur, en });
        });
        n.tiempo += recorrido;
        muestrear(n, 2.4, 0.1, (f, en, dur) => {
            const S = xmin + 2 + (K + prima - xmin - 2) * f;
            n.linea.push({ pieza: 'caso', a: enCaso(S), dur, en });
        });

        n.capitulo('El punto de empate');
        n.animar([
            { pieza: 'empate', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'caso', a: { opacidad: 0 }, dur: 0.3 },
            { pieza: 'lEmpate', a: { texto: `Empate: S = K + prima = ${plata(K + prima, 0)}`, opacidad: 1, color: 'exito' }, dur: 0.4 },
            { pieza: 'lCaso', a: { opacidad: 0 }, dur: 0.3 },
        ]);
        n.decir(`Ojo: no alcanza con que ${accion} pase de ${plata(K, 0)}. Recién ganás si supera K + prima = ${plata(K + prima, 0)}: ahí recuperás lo que pagaste.`);

        n.preguntar('techo');
        n.capitulo('Del otro lado');
        n.animar([
            { pieza: 'vendedor', a: { trazo: 1 }, dur: 1.4 },
            { pieza: 'lCaso', a: { texto: 'Quien lo vendió: gana la prima, nada más', opacidad: 1, color: 'acento2' }, dur: 0.4 },
        ]);
        n.decir(`Del otro lado del contrato hay alguien que vendió (o "lanzó") el call: cobró los ${plata(prima, 0)} y queda obligado a vender a ${plata(K, 0)} si se lo piden. Su ganancia es la tuya dada vuelta, la línea naranja.`);
        n.decir(`Gana, como mucho, la prima. Pero si ${accion} se dispara tiene que entregarla igual a ${plata(K, 0)}, y su pérdida no tiene techo. Lo que gana uno lo pierde el otro.`);

        n.capitulo('El put');
        n.animar([
            { pieza: 'vendedor', a: { opacidad: 0 }, dur: 0.5 },
            { pieza: ['pago', 'ganancia'], a: { k: 1 }, dur: 1.8, en: n.tiempo + 0.4 },
            { pieza: 'empate', a: { mx: K - primaPut, etiqueta: `empate ${plata(K - primaPut, 0)}` }, dur: 1.8, en: n.tiempo + 0.4 },
            { pieza: 'que', a: { texto: `Put: derecho a VENDER a K = ${plata(K, 0)}` }, dur: 0.3 },
            { pieza: 'lPrima', a: { texto: `Prima: ${plata(primaPut, 0)}` }, dur: 0.3 },
            { pieza: 'lPago', a: { texto: 'Paga al vencer: máx(K − S, 0)' }, dur: 0.3 },
            { pieza: 'lEmpate', a: { texto: `Empate: S = K − prima = ${plata(K - primaPut, 0)}` }, dur: 0.3 },
            { pieza: 'lCaso', a: { texto: 'Un seguro contra la caída', color: 'exito' }, dur: 0.3 },
        ]);
        n.decir(`El put es el espejo: el derecho a VENDER a ${plata(K, 0)}. Paga máx(K − S, 0): gana cuando ${accion} baja. Si la tenés y se desploma, igual la podés vender a ${plata(K, 0)}: funciona como un seguro.`);
        n.decir('Esto es lo que pasa el día que vence. Pero la prima se paga HOY, sin saber dónde va a terminar. ¿Cuánto debería costar? Esa es la pregunta que responde Black-Scholes.');

        return {
            titulo: titulo || 'Qué paga una opción',
            descripcion: descripcion || `Un call y un put con precio de ejercicio ${plata(K, 0)}: lo que pagan al vencer, la ganancia después de la prima y el punto de empate.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Black-Scholes =======================

/**
 * De dónde sale la fórmula de Black-Scholes: lo que paga el call en cada
 * futuro posible, qué tan probable es cada uno, el promedio traído a hoy
 * (por simulación y por la fórmula), qué es cada letra, y qué pasa si sube
 * la volatilidad.
 *
 * @param {{
 *     S?: number, K?: number, T?: number, r?: number, sigma?: number, sigmaAlta?: number,
 *     simulaciones?: number, semilla?: number,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} [opciones]
 *     `preguntas` acepta 'volatilidad' (antes de subirla).
 */
export function desdeBlackScholes(opciones = {}) {
    const {
        S = 100, K = 105, T = 0.5, r = 0.05, sigma = 0.25, sigmaAlta = 0.4, simulaciones = 20000, semilla = 11,
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    const bs = blackScholes({ S, K, T, r, sigma });
    const bsAlto = blackScholes({ S, K, T, r, sigma: sigmaAlta });
    const mc = montecarlo({ S, K, T, r, sigma, n: simulaciones, semilla });
    const ancho = Math.max(sigma, sigmaAlta) * Math.sqrt(T);
    const xmin = Math.max(0, Math.floor((S * Math.exp(-2.2 * ancho)) / 5) * 5);
    const xmax = Math.ceil((S * Math.exp(2.3 * ancho)) / 5) * 5;
    const dens = (x, s) => densidadFinal(x, { S, T, r, sigma: s });
    let pico = 0;
    for (let i = 0; i <= 200; i++) pico = Math.max(pico, dens(xmin + ((xmax - xmin) * i) / 200, Math.min(sigma, sigmaAlta)));
    const topePago = xmax - K;
    // Unos pocos futuros para ver (los 20.000 de la cuenta no se dibujan).
    const cuantos = 36;
    const azarPuntos = normalesConSemilla(cuantos * 2, semilla + 1);
    const futuros = Array.from({ length: cuantos }, (_, i) => {
        const ST = S * Math.exp((r - (sigma * sigma) / 2) * T + sigma * Math.sqrt(T) * azarPuntos[i]);
        const alto = (0.15 + 0.7 * ((Math.abs(azarPuntos[cuantos + i]) * 0.37) % 1)) * dens(ST, sigma);
        return { ST, alto, pago: pagoAlVencer('call', ST, K) };
    });
    const descuentoK = K * bs.descuento;

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const arribaPl = angosta ? { x: 330, y: arriba + 150, ancho: 580, alto: 230 } : { x: 520, y: arriba + 175, ancho: 900, alto: 290 };
        const abajoPl = angosta ? { x: 330, y: arriba + 420, ancho: 580, alto: 230 } : { x: 520, y: arriba + 535, ancho: 900, alto: 330 };
        const pan = angosta ? { x: 24, y: arriba + 590, ancho: 600, tamano: 22 } : { x: 1010, y: arriba + 70, ancho: 570, tamano: 24 };
        const chico = angosta ? 15 : 19;

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.pago = plano({
            ...arribaPl, xmin, xmax, ymin: -topePago * 0.08, ymax: topePago * 1.05, pasoX: pasoPara(xmax - xmin, angosta ? 4 : 7), pasoY: pasoPara(topePago, 3),
            etiquetaX: 'S al vencer', etiquetaY: 'paga', tamano: chico, decimales: 0,
        });
        piezas.prob = plano({
            ...abajoPl, xmin, xmax, ymin: 0, ymax: pico * 1.12, pasoX: pasoPara(xmax - xmin, angosta ? 4 : 7), pasoY: pico * 100,
            etiquetaX: 'S al vencer', etiquetaY: 'probabilidad', tamano: chico, decimales: 0,
        });
        piezas.pagoCurva = grafica({ plano: 'pago', f: (x) => pagoAlVencer('call', x, K), trazo: 0, color: 'acento', grosor: 4 });
        piezas.kArriba = recta({ plano: 'pago', mx: K, my: 0, vertical: true, color: 'suave', punteada: true, progreso: 0, grosor: 2.5, etiqueta: `K = ${plata(K, 0)}` });
        piezas.kAbajo = recta({ plano: 'prob', mx: K, my: 0, vertical: true, color: 'suave', punteada: true, progreso: 0, grosor: 2.5 });
        piezas.densidad = area({ plano: 'prob', f: dens, k: sigma, desde: xmin, hasta: xmax, color: 'acento', relleno: 0.18, opacidad: 0 });
        piezas.enDinero = area({
            plano: 'prob', f: dens, k: sigma, desde: K, hasta: xmax, color: 'exito', relleno: 0.4, opacidad: 0,
            etiqueta: `N(d2) = ${pct(bs.Nd2)}`, etiquetaX: K + (xmax - K) * 0.42, etiquetaY: pico * 0.62, tamanoEtiqueta: angosta ? 19 : 23,
        });
        piezas.hoy = punto({ plano: 'prob', mx: S, my: 0, radio: 9, color: 'acento2', etiqueta: `hoy ${plata(S, 0)}`, lado: 'arriba-izquierda', opacidad: 0 });
        futuros.forEach((fu, i) => {
            const color = fu.pago > 0 ? 'exito' : 'suave';
            piezas[`f${i}`] = punto({ plano: 'prob', mx: fu.ST, my: fu.alto, radio: angosta ? 5 : 6, color, opacidad: 0 });
            piezas[`g${i}`] = punto({ plano: 'pago', mx: fu.ST, my: fu.pago, radio: angosta ? 5 : 6, color, opacidad: 0 });
        });
        panel(piezas, ['l0', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6'], { ...pan, interlineado: 1.75 });
        const lineas = ['l0', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6'];

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const escribir = (textos, demora = 0, estilos = {}) => {
            n.animar(lineas.map((l, i) => ({
                pieza: l, a: { texto: textos[i] ?? '', opacidad: textos[i] ? 1 : 0, color: estilos[i]?.color ?? 'texto', peso: estilos[i]?.peso ?? 400 }, dur: 0.3, en: n.tiempo + demora + i * 0.15,
            })));
        };

        n.capitulo('Las cinco letras');
        escribir([
            `S = ${plata(S, 0)}  precio de hoy`,
            `K = ${plata(K, 0)}  precio de ejercicio`,
            `T = ${numero(T, 3)}  años al vencimiento (${plazo(T)})`,
            `r = ${pct(r, 1)}  tasa sin riesgo, anual`,
            `σ = ${pct(sigma, 0)}  volatilidad, anual`,
        ], 0, { 4: { color: 'acento2', peso: 700 } });
        n.decir(`Para ponerle precio a un call hacen falta cinco cosas. Cuatro se leen en el contrato o en la pantalla: el precio de hoy S, el de ejercicio K, el tiempo que falta T (en años) y la tasa sin riesgo r.`);
        n.decir('La quinta, σ, la volatilidad, es la única que hay que estimar. Y fijate lo que NO está: si la acción va a subir o a bajar. Black-Scholes no necesita adivinarlo.');

        n.capitulo('Lo que paga al vencer');
        n.animar([
            { pieza: 'pagoCurva', a: { trazo: 1 }, dur: 1.2 },
            { pieza: ['kArriba', 'kAbajo'], a: { progreso: 1 }, dur: 0.8 },
        ]);
        n.decir(`Arriba, lo que paga el call el día que vence, como ya vimos: nada si ${'la acción'} termina abajo de ${plata(K, 0)}, y S − K si termina arriba.`);

        n.capitulo('¿Dónde puede terminar?');
        n.animar([
            { pieza: 'densidad', a: { opacidad: 1 }, dur: 0.8 },
            { pieza: 'hoy', a: { opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`Abajo, qué tan probable es cada precio dentro de ${plazo(T)}. El modelo supone que los rendimientos son normales; entonces el precio queda "lognormal": una campana torcida, con la cola larga a la derecha. Puede subir mucho, pero nunca bajar de $ 0.`);
        n.decir(`Lo ancho de la campana lo decide σ·√T = ${fijo(sigma * Math.sqrt(T), 3)}: con más volatilidad, o con más tiempo, el precio puede terminar más lejos de donde está hoy.`);

        n.capitulo('Muchos futuros posibles');
        n.animar([
            ...futuros.map((_, i) => ({ pieza: `f${i}`, a: { opacidad: 1 }, dur: 0.25, en: n.tiempo + i * 0.06 })),
            ...futuros.map((_, i) => ({ pieza: `g${i}`, a: { opacidad: 1 }, dur: 0.25, en: n.tiempo + 2.4 + i * 0.06 })),
        ]);
        const verdes = futuros.filter((f) => f.pago > 0).length;
        n.decir(`Inventemos ${cuantos} futuros posibles, sacados de esa campana. En ${verdes} de ellos (los verdes) la acción termina arriba de ${plata(K, 0)} y el call paga algo; en el resto, nada.`);
        escribir([
            `Con ${miles(simulaciones)} futuros simulados:`,
            `paga en promedio ${plata(mc.pagoPromedio)}`,
            `traído a hoy: × e^(−rT) = ${plata(mc.precio)}`,
        ], 0, { 2: { color: 'exito', peso: 800 } });
        n.decir(`Si en vez de ${cuantos} inventamos ${miles(simulaciones)}, el call paga en promedio ${plata(mc.pagoPromedio)}. Pero eso se cobra dentro de ${plazo(T)}: traído a hoy con e^(−rT), da ${plata(mc.precio)}. Ese es el precio justo de la prima.`);
        n.decir('Un detalle importante: los futuros se simulan como si la acción creciera a la tasa sin riesgo r, no a lo que uno espera que rinda. Es la idea genial de Black y Scholes: la opción se puede cubrir comprando y vendiendo la acción, el riesgo se cancela, y entonces alcanza con r.');

        n.capitulo('La fórmula');
        escribir([
            'd1 = [ln(S/K) + (r + σ²/2)·T] / (σ√T)',
            `     = ${fijo(bs.d1, 3)}`,
            `d2 = d1 − σ√T = ${fijo(bs.d2, 3)}`,
            `N(d1) = ${fijo(bs.Nd1, 3)}   N(d2) = ${fijo(bs.Nd2, 3)}`,
            'C = S·N(d1) − K·e^(−rT)·N(d2)',
            `   = ${numero(S, 2)}·${fijo(bs.Nd1, 3)} − ${numero(descuentoK, 2)}·${fijo(bs.Nd2, 3)}`,
            `   = ${plata(bs.precio)}`,
        ], 0, { 4: { color: 'acento', peso: 700 }, 6: { color: 'exito', peso: 800 } });
        n.decir('Black-Scholes hace ese promedio con una fórmula, sin simular nada. d1 y d2 miden cuántos desvíos (σ√T) está el precio de hoy por encima de K, con una corrección por la tasa y el tiempo.');
        n.animar({ pieza: 'enDinero', a: { opacidad: 1 }, dur: 0.6 });
        n.decir(`N es la normal acumulada: la probabilidad de que una normal estándar quede debajo de un número (en Python, scipy.stats.norm.cdf). N(d2) = ${pct(bs.Nd2)} es el área verde: la probabilidad de que el call termine "en el dinero", con S > K.`);
        n.decir(`Entonces K·e^(−rT)·N(d2) = ${plata(descuentoK * bs.Nd2)} es lo que esperás pagar al ejercer, traído a hoy, y S·N(d1) = ${plata(S * bs.Nd1)} lo que esperás recibir. La diferencia es el precio: ${plata(bs.precio)}. Lo mismo que la simulación.`);

        n.preguntar('volatilidad');
        n.capitulo('Más volatilidad');
        n.animar([
            { pieza: ['densidad', 'enDinero'], a: { k: sigmaAlta }, dur: 2 },
            { pieza: 'enDinero', a: { etiqueta: `N(d2) = ${pct(bsAlto.Nd2)}` }, dur: 2 },
            ...futuros.flatMap((_, i) => [
                { pieza: `f${i}`, a: { opacidad: 0 }, dur: 0.4 },
                { pieza: `g${i}`, a: { opacidad: 0 }, dur: 0.4 },
            ]),
        ]);
        escribir([
            `σ = ${pct(sigma, 0)} → ${pct(sigmaAlta, 0)}`,
            `d1 = ${fijo(bsAlto.d1, 3)}   d2 = ${fijo(bsAlto.d2, 3)}`,
            `N(d1) = ${fijo(bsAlto.Nd1, 3)}   N(d2) = ${fijo(bsAlto.Nd2, 3)}`,
            `C = ${plata(bs.precio)} → ${plata(bsAlto.precio)}`,
        ], 0.6, { 0: { color: 'acento2', peso: 700 }, 3: { color: 'exito', peso: 800 } });
        n.decir(`Con σ = ${pct(sigmaAlta, 0)} la campana se ensancha: hay más futuros muy arriba, que pagan mucho, y más muy abajo, que pagan cero (igual que antes). Lo malo está acotado y lo bueno no: el call sube de ${plata(bs.precio)} a ${plata(bsAlto.precio)}.`);
        n.decir('Y al revés: como todo lo demás se lee en pantalla, del precio al que se negocia una opción se puede despejar qué σ está suponiendo el mercado. Es la volatilidad implícita, el número que más se mira en una pantalla de opciones.');

        return {
            titulo: titulo || 'De dónde sale Black-Scholes',
            descripcion: descripcion || `Un call con S = ${plata(S, 0)}, K = ${plata(K, 0)}, ${plazo(T)}, r = ${pct(r)} y σ = ${pct(sigma, 0)}: vale ${plata(bs.precio)} por la fórmula y ${plata(mc.precio)} simulando.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Las griegas =======================

/**
 * Las griegas de un call, cada una como lo que es: cuánto se mueve el precio
 * cuando se mueve una sola cosa. Delta es la pendiente, gamma la curvatura,
 * theta lo que se pierde por cada día, vega lo que se gana por cada punto de
 * volatilidad, rho por cada punto de tasa.
 *
 * @param {{
 *     S?: number, K?: number, T?: number, r?: number, sigma?: number,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} [opciones]
 *     `preguntas` acepta 'theta' (antes de dejar pasar el tiempo).
 */
export function desdeGriegas(opciones = {}) {
    const {
        S = 100, K = 100, T = 0.5, r = 0.05, sigma = 0.25,
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    const base = { K, T, r, sigma };
    const precioCon = (x, cambios = {}) => blackScholes({ ...base, S: x, ...cambios }).precio;
    const griegasEn = (x, cambios = {}) => griegas({ ...base, S: x, ...cambios });
    const g0 = griegasEn(S);
    const c0 = precioCon(S);
    const xmin = K * 0.6;
    const xmax = K * 1.4;
    const sigmaAlta = sigma * 1.8;
    const rAlta = r + 0.05;
    const Tfin = 1 / 52;
    const topePrecio = Math.ceil(precioCon(xmax, { sigma: sigmaAlta }) * 1.08 / 5) * 5;
    const xs = Array.from({ length: 121 }, (_, i) => xmin + ((xmax - xmin) * i) / 120);
    const extremo = (fn) => xs.reduce((m, x) => Math.max(m, Math.abs(fn(x))), 0);
    const rangos = {
        delta: { ymin: -0.08, ymax: 1.1, pasoY: 0.5, etiquetaY: 'Δ' },
        gamma: { ymin: -extremo((x) => griegasEn(x).gamma) * 0.08, ymax: extremo((x) => griegasEn(x).gamma) * 1.15, etiquetaY: 'Γ' },
        theta: { ymin: -extremo((x) => griegasEn(x).theta) * 1.15, ymax: extremo((x) => griegasEn(x).theta) * 0.12, etiquetaY: 'Θ por día' },
        vega: { ymin: -extremo((x) => griegasEn(x).vega) * 0.08, ymax: extremo((x) => griegasEn(x).vega) * 1.15, etiquetaY: 'ν por punto' },
    };
    for (const rg of Object.values(rangos)) rg.pasoY ??= pasoPara(rg.ymax - rg.ymin, 3);

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const arribaPl = angosta ? { x: 330, y: arriba + 170, ancho: 580, alto: 300 } : { x: 520, y: arriba + 200, ancho: 900, alto: 360 };
        const abajoPl = angosta ? { x: 330, y: arriba + 470, ancho: 580, alto: 220 } : { x: 520, y: arriba + 580, ancho: 900, alto: 280 };
        const pan = angosta ? { x: 24, y: arriba + 640, ancho: 600, tamano: 22 } : { x: 1010, y: arriba + 80, ancho: 570, tamano: 24 };
        const chico = angosta ? 15 : 19;

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.precio = plano({
            ...arribaPl, xmin, xmax, ymin: -topePrecio * 0.06, ymax: topePrecio, pasoX: pasoPara(xmax - xmin, angosta ? 4 : 8), pasoY: pasoPara(topePrecio, 4),
            etiquetaX: 'S (precio de la acción)', etiquetaY: 'call', tamano: chico, decimales: 0,
        });
        piezas.griega = plano({
            ...abajoPl, xmin, xmax, ...rangos.delta, pasoX: pasoPara(xmax - xmin, angosta ? 4 : 8),
            etiquetaX: 'S', tamano: chico, decimales: 3,
        });
        piezas.pagoG = grafica({ plano: 'precio', f: (x) => pagoAlVencer('call', x, K), trazo: 0, color: 'suave', grosor: 3, punteada: true });
        // La misma curva, tres veces: cada una deja animar una cosa distinta (el tiempo, la volatilidad, la tasa).
        piezas.curvaT = grafica({ plano: 'precio', f: (x, t) => precioCon(x, { T: t }), k: T, trazo: 0, color: 'acento', grosor: 4.5 });
        piezas.curvaV = grafica({ plano: 'precio', f: (x, s) => precioCon(x, { sigma: s }), k: sigma, color: 'acento', grosor: 4.5, opacidad: 0 });
        piezas.curvaR = grafica({ plano: 'precio', f: (x, tasa) => precioCon(x, { r: tasa }), k: r, color: 'acento', grosor: 4.5, opacidad: 0 });
        piezas.aqui = punto({ plano: 'precio', mx: S, my: c0, radio: 10, color: 'acento2', etiqueta: '', lado: 'arriba-izquierda', opacidad: 0 });
        piezas.tangente = recta({ plano: 'precio', mx: S, my: c0, pendiente: g0.delta, color: 'acento2', grosor: 3, progreso: 0 });
        piezas.deltaCurva = grafica({ plano: 'griega', f: (x) => griegasEn(x).delta, trazo: 0, color: 'acento2', grosor: 4 });
        piezas.gammaCurva = grafica({ plano: 'griega', f: (x) => griegasEn(x).gamma, trazo: 0, color: 'exito', grosor: 4 });
        piezas.thetaCurva = grafica({ plano: 'griega', f: (x) => griegasEn(x).theta, trazo: 0, color: 'error', grosor: 4 });
        piezas.vegaCurva = grafica({ plano: 'griega', f: (x) => griegasEn(x).vega, trazo: 0, color: 'acento', grosor: 4 });
        piezas.aquiAbajo = punto({ plano: 'griega', mx: S, my: g0.delta, radio: 9, color: 'acento2', opacidad: 0 });
        piezas.tanGamma = recta({ plano: 'griega', mx: S, my: g0.delta, pendiente: g0.gamma, color: 'exito', grosor: 3, progreso: 0 });
        piezas.kLinea = recta({ plano: 'griega', mx: K, my: 0, vertical: true, color: 'suave', punteada: true, grosor: 2, progreso: 0, etiqueta: 'K' });
        const lineas = ['l0', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6'];
        panel(piezas, lineas, { ...pan, interlineado: 1.75 });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const escribir = (textos, estilos = {}) => {
            n.animar(lineas.map((l, i) => ({
                pieza: l, a: { texto: textos[i] ?? '', opacidad: textos[i] ? 1 : 0, color: estilos[i]?.color ?? 'texto', peso: estilos[i]?.peso ?? 400 }, dur: 0.3, en: n.tiempo + i * 0.12,
            })));
        };
        // Lleva el punto de arriba (y su tangente, y el de abajo) a otro precio.
        const irA = (x, en, dur, conGamma = false) => {
            const g = griegasEn(x);
            const c = precioCon(x);
            n.linea.push(
                { pieza: 'aqui', a: { mx: x, my: c }, dur, en },
                { pieza: 'tangente', a: { mx: x, my: c, pendiente: g.delta }, dur, en },
                { pieza: 'aquiAbajo', a: { mx: x, my: g.delta }, dur, en },
                { pieza: 'l1', a: { texto: `S = ${plata(x)} → Δ = ${fijo(g.delta, 3)}` }, dur: 0, en: en + dur },
            );
            if (conGamma) {
                n.linea.push(
                    { pieza: 'tanGamma', a: { mx: x, my: g.delta, pendiente: g.gamma }, dur, en },
                    { pieza: 'l3', a: { texto: `Γ = ${fijo(g.gamma, 4)}` }, dur: 0, en: en + dur },
                );
            }
        };
        const pasear = (desde, hasta, dur, conGamma) => {
            muestrear(n, dur, 0.1, (f, en, d) => irA(desde + (hasta - desde) * (0.5 - Math.cos(Math.PI * f) / 2), en, d, conGamma));
            n.tiempo += dur;
        };

        n.capitulo('El precio antes de vencer');
        n.animar([
            { pieza: 'pagoG', a: { trazo: 1 }, dur: 1 },
            { pieza: 'curvaT', a: { trazo: 1 }, dur: 1.6, en: n.tiempo + 0.8 },
        ]);
        escribir([`Un call: K = ${plata(K, 0)}, ${plazo(T)}, σ = ${pct(sigma, 0)}, r = ${pct(r)}`]);
        n.decir(`La punteada es lo que paga el call al vencer. La azul es lo que vale HOY según Black-Scholes, para cada precio posible de la acción. Siempre queda por encima: todavía faltan ${plazo(T)} y puede pasar de todo.`);
        n.animar([
            { pieza: 'aqui', a: { opacidad: 1, etiqueta: plata(c0) }, dur: 0.4 },
            { pieza: 'l1', a: { texto: `Con S = ${plata(S, 0)}, el call vale ${plata(c0)}`, opacidad: 1 }, dur: 0.3 },
        ]);
        n.decir(`Con la acción a ${plata(S, 0)}, el call vale ${plata(c0)}. Las griegas responden una sola pregunta, cinco veces: si cambia una de las cosas de las que depende el precio, y las demás quedan quietas, ¿cuánto cambia el precio? Son derivadas parciales.`);

        n.capitulo('Δ delta: la pendiente');
        n.animar([
            { pieza: 'tangente', a: { progreso: 1 }, dur: 0.8 },
            { pieza: 'aqui', a: { etiqueta: '' }, dur: 0.1 },
            { pieza: 'l0', a: { texto: 'Δ delta: por cada $ 1 de la acción', color: 'acento2', peso: 700 }, dur: 0.3 },
            { pieza: 'l1', a: { texto: `S = ${plata(S)} → Δ = ${fijo(g0.delta, 3)}` }, dur: 0.3 },
        ]);
        n.decir(`Delta es la pendiente de la curva: cuánto sube el call si la acción sube $ 1. Acá Δ = ${fijo(g0.delta, 3)}: si la acción pasa a ${plata(S + 1, 0)}, el call sube unos ${numero(g0.delta * 100, 0)} centavos.`);
        n.animar([
            { pieza: 'deltaCurva', a: { trazo: 1 }, dur: 1.4 },
            { pieza: ['aquiAbajo'], a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.2 },
            { pieza: 'kLinea', a: { progreso: 1 }, dur: 0.6 },
        ]);
        n.esperar(1.4);
        pasear(S, xmin + (xmax - xmin) * 0.08, 2.4, false);
        n.decir('Abajo está delta para cada precio. Muy por debajo de K (el call está "fuera del dinero") la curva es casi plana: Δ ≈ 0, el call casi no reacciona.', 0.2);
        pasear(xmin + (xmax - xmin) * 0.08, xmax - (xmax - xmin) * 0.06, 3.6, false);
        n.decir('Muy por encima de K ("en el dinero") la curva es casi una recta de pendiente 1: Δ ≈ 1, el call se mueve peso por peso con la acción.', 0.2);
        pasear(xmax - (xmax - xmin) * 0.06, S, 2.4, false);
        n.decir(`Delta también dice cómo cubrirse: quien vendió un call compra ${fijo(g0.delta, 2)} acciones por cada uno, y si la acción se mueve un poco, lo que gana por un lado lo pierde por el otro. Para un put, delta es negativa: gana cuando la acción baja.`);

        n.capitulo('Γ gamma: la curvatura');
        n.animar([
            { pieza: 'tanGamma', a: { progreso: 1 }, dur: 0.8 },
            { pieza: 'l2', a: { texto: 'Γ gamma: cuánto cambia Δ por $ 1', opacidad: 1, color: 'exito', peso: 700 }, dur: 0.3 },
            { pieza: 'l3', a: { texto: `Γ = ${fijo(g0.gamma, 4)}`, opacidad: 1 }, dur: 0.3 },
        ]);
        n.decir(`Gamma es la pendiente de delta, la verde de abajo: cuánto cambia delta por cada $ 1. Acá Γ = ${fijo(g0.gamma, 4)}: si la acción sube $ 1, delta pasa de ${fijo(g0.delta, 3)} a unos ${fijo(g0.delta + g0.gamma, 3)}. Es lo que hace que la curva de arriba se doble.`);
        n.animar([
            { pieza: ['deltaCurva', 'aquiAbajo', 'tanGamma'], a: { opacidad: 0 }, dur: 0.5 },
            { pieza: 'griega', a: { ymin: rangos.gamma.ymin, ymax: rangos.gamma.ymax, etiquetaY: rangos.gamma.etiquetaY }, dur: 1 },
            { pieza: 'griega', a: { pasoY: rangos.gamma.pasoY }, dur: 0, en: n.tiempo + 1 },
            { pieza: 'gammaCurva', a: { trazo: 1 }, dur: 1.4, en: n.tiempo + 0.9 },
        ]);
        n.esperar(1);
        n.decir('Si dibujamos gamma para cada precio, es una campana: es máxima cerca de K. Ahí delta cambia más rápido, y quien se cubre tiene que reacomodarse más seguido. Lejos de K, delta casi no cambia y gamma es casi cero.');

        n.preguntar('theta');
        n.capitulo('Θ theta: el tiempo cuesta');
        n.animar([
            { pieza: 'tangente', a: { progreso: 0 }, dur: 0.4 },
            { pieza: 'gammaCurva', a: { opacidad: 0 }, dur: 0.5 },
            { pieza: 'griega', a: { ymin: rangos.theta.ymin, ymax: rangos.theta.ymax, etiquetaY: rangos.theta.etiquetaY }, dur: 1 },
            { pieza: 'griega', a: { pasoY: rangos.theta.pasoY }, dur: 0, en: n.tiempo + 1 },
            { pieza: 'thetaCurva', a: { trazo: 1 }, dur: 1.4, en: n.tiempo + 0.9 },
        ]);
        escribir([
            'Θ theta: lo que pierde por cada día',
            `Θ = ${plata(g0.theta, 3)} por día`,
        ], { 0: { color: 'error', peso: 700 } });
        n.decir(`Theta es lo que pierde el call por cada día que pasa, si todo lo demás queda igual: ${plata(g0.theta, 3)} por día. Abajo está para cada precio: siempre negativa, y peor cerca de K.`);
        const duracionTiempo = 4.5;
        n.animar({ pieza: 'curvaT', a: { k: Tfin }, dur: duracionTiempo, curva: 'lineal' });
        muestrear(n, duracionTiempo, 0.1, (f, en, dur) => {
            const t = T + (Tfin - T) * f;
            n.linea.push(
                { pieza: 'aqui', a: { mx: S, my: precioCon(S, { T: t }) }, dur, en },
                { pieza: 'l2', a: { texto: `Faltan ${plazo(t)}: vale ${plata(precioCon(S, { T: t }))}`, opacidad: 1, color: 'texto', peso: 400 }, dur: 0, en: en + dur },
            );
        });
        n.decir(`Miremos qué pasa si dejamos correr el reloj, sin que la acción se mueva: la curva se va hundiendo hasta pegarse a lo que paga al vencer. Con una semana por delante, el call vale ${plata(precioCon(S, { T: Tfin }))}.`);
        n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en + 0.4);
        n.decir('El que compra opciones pierde un poco cada día (por eso theta es negativa), y el que las vende lo cobra. Y se acelera al final: el último mes se pierde mucho más que el primero.');
        n.animar([
            { pieza: 'curvaT', a: { k: T }, dur: 1.2 },
            { pieza: 'aqui', a: { my: c0 }, dur: 1.2 },
        ]);
        n.esperar(1.2);

        n.capitulo('ν vega: la volatilidad');
        n.animar([
            { pieza: 'thetaCurva', a: { opacidad: 0 }, dur: 0.5 },
            { pieza: 'griega', a: { ymin: rangos.vega.ymin, ymax: rangos.vega.ymax, etiquetaY: rangos.vega.etiquetaY }, dur: 1 },
            { pieza: 'griega', a: { pasoY: rangos.vega.pasoY }, dur: 0, en: n.tiempo + 1 },
            { pieza: 'vegaCurva', a: { trazo: 1 }, dur: 1.4, en: n.tiempo + 0.9 },
            { pieza: 'curvaV', a: { opacidad: 1 }, dur: 0.1 },
            { pieza: 'curvaT', a: { opacidad: 0 }, dur: 0.1 },
        ]);
        escribir([
            'ν vega: por cada punto (1 %) de σ',
            `ν = ${plata(g0.vega, 3)} por punto`,
        ], { 0: { color: 'acento', peso: 700 } });
        n.decir(`Vega (que no es una letra griega, pero se le dice así; se escribe ν) es cuánto sube el call si la volatilidad sube un punto: ${plata(g0.vega, 3)}. Abajo, también es máxima cerca de K.`);
        n.animar([
            { pieza: 'curvaV', a: { k: sigmaAlta }, dur: 2.4 },
            { pieza: 'aqui', a: { my: precioCon(S, { sigma: sigmaAlta }) }, dur: 2.4 },
            { pieza: 'l2', a: { texto: `σ = ${pct(sigmaAlta, 0)}: vale ${plata(precioCon(S, { sigma: sigmaAlta }))}`, opacidad: 1, color: 'texto', peso: 400 }, dur: 0.3, en: n.tiempo + 2.2 },
        ]);
        n.decir(`Con σ = ${pct(sigmaAlta, 0)} toda la curva sube: el call pasa a valer ${plata(precioCon(S, { sigma: sigmaAlta }))}. Más incertidumbre, más chances de terminar muy arriba, y lo de abajo sigue acotado.`);
        n.animar([
            { pieza: 'curvaV', a: { k: sigma }, dur: 1.2 },
            { pieza: 'aqui', a: { my: c0 }, dur: 1.2 },
        ]);
        n.esperar(1.2);

        n.capitulo('ρ rho: la tasa');
        n.animar([
            { pieza: 'curvaR', a: { opacidad: 1 }, dur: 0.1 },
            { pieza: 'curvaV', a: { opacidad: 0 }, dur: 0.1 },
            { pieza: 'curvaR', a: { k: rAlta }, dur: 2, en: n.tiempo + 0.2 },
            { pieza: 'aqui', a: { my: precioCon(S, { r: rAlta }) }, dur: 2, en: n.tiempo + 0.2 },
        ]);
        escribir([
            'ρ rho: por cada punto (1 %) de r',
            `ρ = ${plata(g0.rho, 3)} por punto`,
            `r = ${pct(rAlta)}: vale ${plata(precioCon(S, { r: rAlta }))}`,
        ], { 0: { color: 'acento2', peso: 700 } });
        n.decir(`Rho es por cada punto de tasa: ${plata(g0.rho, 3)}. Con una tasa más alta, K·e^(−rT) (lo que vas a pagar, traído a hoy) es más chico, así que el call vale un poco más. En opciones de pocos meses casi no se nota: es la griega que menos se mira.`);
        n.animar({ pieza: 'curvaR', a: { k: r }, dur: 1 });

        n.capitulo('Las cinco juntas');
        escribir([
            `Con S = ${plata(S, 0)}, el call vale ${plata(c0)}`,
            `Δ = ${fijo(g0.delta, 3)}   por $ 1 de la acción`,
            `Γ = ${fijo(g0.gamma, 4)}   cambio de Δ por $ 1`,
            `Θ = ${plata(g0.theta, 3)}   por día`,
            `ν = ${plata(g0.vega, 3)}   por punto de σ`,
            `ρ = ${plata(g0.rho, 3)}   por punto de r`,
        ], { 0: { peso: 700 }, 1: { color: 'acento2' }, 2: { color: 'exito' }, 3: { color: 'error' }, 4: { color: 'acento' } });
        n.animar({ pieza: 'aqui', a: { my: c0 }, dur: 0.6 });
        n.decir('Las cinco juntas dicen cómo reacciona una opción a todo lo que se mueve. Con ellas se arma una cobertura: por ejemplo, comprar y vender acciones hasta que delta dé cero, y así no importa (por un rato) si la acción sube o baja.');
        n.decir('En Python son cinco funciones de la fórmula. Y cuando no hay fórmula, se calculan igual: se mueve un poquito cada cosa, se recalcula el precio y se divide. Son las diferencias finitas, la misma idea que la derivada.');

        return {
            titulo: titulo || 'Las griegas',
            descripcion: descripcion || `Delta, gamma, theta, vega y rho de un call con S = ${plata(S, 0)} y K = ${plata(K, 0)}: Δ = ${fijo(g0.delta, 3)}, Θ = ${plata(g0.theta, 3)} por día.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Estrategias con opciones =======================

/** Las estrategias que se muestran si no se dice otra cosa. */
const ESTRATEGIAS = [
    {
        nombre: 'Put protector',
        patas: [{ tipo: 'accion', cantidad: 1 }, { tipo: 'put', K: 95, cantidad: 1 }],
        idea: 'Tenés la acción y comprás un put: si se desploma, la vendés igual a K. Es un seguro: se paga la prima y la pérdida queda acotada.',
    },
    {
        nombre: 'Call cubierto',
        patas: [{ tipo: 'accion', cantidad: 1 }, { tipo: 'call', K: 110, cantidad: -1 }],
        idea: 'Tenés la acción y vendés un call: cobrás la prima hoy, a cambio de resignar lo que suba por encima de K. Una renta extra, con techo.',
    },
    {
        nombre: 'Straddle (cono)',
        patas: [{ tipo: 'call', K: 100, cantidad: 1 }, { tipo: 'put', K: 100, cantidad: 1 }],
        idea: 'Un call y un put con el mismo K: no importa para qué lado se mueva la acción, sino cuánto. Es una apuesta a la volatilidad: pierde si la acción se queda quieta.',
    },
    {
        nombre: 'Spread alcista',
        patas: [{ tipo: 'call', K: 100, cantidad: 1 }, { tipo: 'call', K: 115, cantidad: -1 }],
        idea: 'Comprás un call y vendés otro más arriba: la prima que cobrás abarata la que pagás. Ganás si sube, pero con techo; y lo que podés perder también es menos.',
    },
];

/**
 * Estrategias que combinan opciones (y la acción): cada pata con su ganancia
 * al vencer, en punteado, y la suma, que es la estrategia. Las primas salen
 * de Black-Scholes, así que son coherentes entre sí.
 *
 * @param {{
 *     S?: number, T?: number, r?: number, sigma?: number,
 *     estrategias?: { nombre: string, patas: { tipo: 'accion' | 'call' | 'put', K?: number, cantidad: number }[], idea: string }[],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} [opciones]
 *     `cantidad` es 1 si se compra y −1 si se vende. `preguntas` acepta
 *     'straddle' (antes de la tercera estrategia, si hay tres o más).
 */
export function desdeEstrategias(opciones = {}) {
    const {
        S = 100, T = 0.25, r = 0.05, sigma = 0.25, estrategias = ESTRATEGIAS,
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    const xmin = S * 0.65;
    const xmax = S * 1.35;
    const conPrimas = estrategias.map((e) => ({
        ...e,
        patas: e.patas.map((p) => ({ ...p, prima: p.tipo === 'accion' ? S : blackScholes({ S, K: p.K, T, r, sigma, tipo: p.tipo }).precio })),
    }));
    const deLaPata = (p) => (x) => p.cantidad * ((p.tipo === 'accion' ? x : pagoAlVencer(p.tipo, x, p.K)) - p.prima);
    const total = (e) => (x) => e.patas.reduce((suma, p) => suma + deLaPata(p)(x), 0);
    const xs = Array.from({ length: 701 }, (_, i) => xmin + ((xmax - xmin) * i) / 700);
    const resumen = conPrimas.map((e) => {
        const f = total(e);
        const ys = xs.map(f);
        // Si en la punta derecha la curva sigue subiendo, no tiene techo; si
        // sigue bajando, no tiene piso. A la izquierda el precio frena en 0:
        // ahí se mira el valor en 0, no la pendiente.
        const pendDer = (ys.at(-1) - ys.at(-2)) / (xs[1] - xs[0]);
        const empates = [];
        for (let i = 1; i < xs.length; i++) {
            if ((ys[i - 1] < 0) !== (ys[i] < 0)) empates.push(xs[i - 1] + (xs[i] - xs[i - 1]) * (-ys[i - 1] / (ys[i] - ys[i - 1])));
        }
        return {
            maximo: Math.max(...ys, f(0)), minimo: Math.min(...ys, f(0)), sinTecho: pendDer > 0.01, sinPiso: pendDer < -0.01, empates,
            costo: e.patas.reduce((c, p) => c + p.cantidad * p.prima, 0),
        };
    });
    // El eje va de la peor a la mejor de todas las estrategias (las patas
    // sueltas pueden salirse: se recortan).
    const todas = conPrimas.flatMap((e) => xs.map(total(e)));
    const piso = Math.max(-S * 0.4, Math.floor((Math.min(...todas) * 1.6) / 5) * 5);
    const tope = Math.min(S * 0.4, Math.ceil((Math.max(...todas) * 1.1) / 5) * 5);
    const coloresPata = ['acento2', 'exito', 'error'];

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 330, y: arriba + 260, ancho: 580, alto: 440 } : { x: 560, y: arriba + 360, ancho: 1000, alto: 620 };
        const pan = angosta ? { x: 24, y: arriba + 560, ancho: 600, tamano: 22 } : { x: 1100, y: arriba + 80, ancho: 480, tamano: 24 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.pl = plano({
            ...pl, xmin, xmax, ymin: piso, ymax: tope, pasoX: pasoPara(xmax - xmin, angosta ? 4 : 7), pasoY: pasoPara(tope - piso, angosta ? 4 : 6),
            etiquetaX: 'S al vencer', etiquetaY: 'ganancia', tamano: angosta ? 15 : 19, decimales: 0,
        });
        piezas.hoy = recta({ plano: 'pl', mx: S, my: 0, vertical: true, color: 'suave', punteada: true, grosor: 2, progreso: 0, etiqueta: `hoy ${plata(S, 0)}` });
        conPrimas.forEach((e, i) => {
            e.patas.forEach((p, j) => {
                piezas[`e${i}p${j}`] = grafica({ plano: 'pl', f: deLaPata(p), trazo: 0, color: coloresPata[j % 3], grosor: 3, punteada: true });
            });
            piezas[`e${i}`] = grafica({ plano: 'pl', f: total(e), trazo: 0, color: 'acento', grosor: 6 });
            resumen[i].empates.forEach((x, j) => {
                piezas[`e${i}z${j}`] = punto({
                    plano: 'pl', mx: x, my: 0, radio: 8, color: 'texto', etiqueta: plata(x, 1), lado: j % 2 ? 'abajo-derecha' : 'abajo-izquierda', opacidad: 0,
                });
            });
        });
        const lineas = ['l0', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6'];
        panel(piezas, lineas, { ...pan, interlineado: 1.75 });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const escribir = (textos, estilos = {}) => {
            n.animar(lineas.map((l, i) => ({
                pieza: l,
                a: { texto: textos[i] ?? '', opacidad: textos[i] ? 1 : 0, color: estilos[i]?.color ?? 'texto', peso: estilos[i]?.peso ?? 400 },
                dur: 0.3, en: n.tiempo + i * 0.12,
            })));
        };
        // "+" es comprar y "−", vender: como en una planilla de posiciones.
        const nombrePata = (p) => {
            const signo = p.cantidad > 0 ? '+' : '−';
            if (p.tipo === 'accion') return `${signo} acción a ${plata(S, 0)}`;
            return `${signo} ${p.tipo} K = ${plata(p.K, 0)} · prima ${plata(p.prima)}`;
        };

        n.capitulo('Las piezas de un lego');
        n.animar({ pieza: 'hoy', a: { progreso: 1 }, dur: 0.6 });
        escribir([`Primas de Black-Scholes: ${plazo(T)}, σ = ${pct(sigma, 0)}`]);
        n.decir('Calls, puts y la acción se pueden combinar como piezas de un lego. La ganancia de una combinación, al vencer, es simplemente la suma de lo que gana cada pata. Veamos las más conocidas.');

        conPrimas.forEach((e, i) => {
            const res = resumen[i];
            if (i === 2) n.preguntar('straddle');
            n.capitulo(e.nombre);
            if (i > 0) {
                const antes = conPrimas[i - 1];
                n.animar({
                    pieza: [`e${i - 1}`, ...antes.patas.map((_, j) => `e${i - 1}p${j}`), ...resumen[i - 1].empates.map((_, j) => `e${i - 1}z${j}`)],
                    a: { opacidad: 0 }, dur: 0.5,
                });
                n.esperar(0.4);
            }
            n.animar(e.patas.map((_, j) => ({ pieza: `e${i}p${j}`, a: { trazo: 1 }, dur: 1.2, en: n.tiempo + j * 0.8 })));
            const maximo = res.sinTecho ? 'sin techo' : plata(res.maximo);
            const minimo = res.sinPiso ? 'sin piso' : plata(res.minimo);
            escribir([
                e.nombre,
                ...e.patas.map(nombrePata),
                `Ganancia máxima: ${maximo}`,
                `Pérdida máxima: ${minimo}`,
                res.empates.length ? `Empate en ${res.empates.map((x) => plata(x, 1)).join(' y ')}` : '',
            ].slice(0, 7), Object.fromEntries([[0, { peso: 800, color: 'acento' }], ...e.patas.map((_, j) => [j + 1, { color: coloresPata[j % 3] }])]));
            n.decir(e.idea);
            n.animar([
                { pieza: `e${i}`, a: { trazo: 1 }, dur: 1.6 },
                ...res.empates.map((_, j) => ({ pieza: `e${i}z${j}`, a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.4 })),
            ]);
            const armado = e.patas.some((p) => p.tipo === 'accion')
                ? ''
                : res.costo >= 0 ? ` Armarla cuesta ${plata(res.costo)} de primas.` : ` Armarla deja ${plata(-res.costo)} de primas a favor.`;
            n.decir(`La línea azul es la suma de las punteadas: la estrategia. Ganancia máxima: ${maximo}; pérdida máxima: ${minimo}.${armado}`);
        });

        n.capitulo('Una forma de pensar');
        n.decir('Cada estrategia es una opinión sobre lo que puede pasar, con un riesgo elegido: protegerse de una caída, cobrar algo por resignar subas, apostar a que se mueva mucho, o a que suba un poco. Con opciones se elige la forma del riesgo.');

        return {
            titulo: titulo || 'Estrategias con opciones',
            descripcion: descripcion || `${conPrimas.map((e) => e.nombre).join(', ')}: cada pata y su suma, al vencer, con primas de Black-Scholes.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

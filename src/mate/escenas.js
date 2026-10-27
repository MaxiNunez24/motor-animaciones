import { texto } from '../piezas/texto.js';
import { caja } from '../piezas/caja.js';
import { tabla } from '../piezas/tabla.js';
import { grafo } from '../piezas/grafo.js';
import { crearNarrador } from '../pedagogico/narrar.js';
import { plano, grafica, punto, vector, recta, segmento, curvasNivel, campo } from './plano.js';
import {
    derivada, gradiente, cocienteIncremental, descensoGradiente, regresionLineal, sumaResiduos,
    euclides, modulo, propiedadesRelacion, matrizRelacion, numero,
} from './calculo.js';

// Escenas de matemática que se arman solas a partir de los datos: una
// función y un punto, unos datos para ajustar, dos números para el mcd.
//
// Todas siguen la misma idea que desdeTraza: las cuentas las hace calculo.js,
// y acá solo se decide qué se muestra y en qué orden se cuenta. Cada una
// devuelve una función de la disposición, para que en el celular el plano
// vaya arriba y las cuentas abajo, en vez de achicar todo.

/** Las medidas de la escena según la disposición. */
function lienzo(disposicion, titulo) {
    const angosta = disposicion.nombre === 'angosta';
    const W = angosta ? 640 : 1600;
    const H = angosta ? 1140 : 900;
    const arriba = titulo ? (angosta ? 96 : 104) : 24;
    return { angosta, W, H, arriba };
}

function piezaTitulo(titulo, W, angosta) {
    return texto({ x: W / 2, y: angosta ? 48 : 52, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
}

/** Una columna de renglones de texto (el panel de las cuentas), que se pueden ir cambiando. */
function panel(piezas, nombres, { x, y, ancho, tamano, interlineado = 1.9 }) {
    nombres.forEach((nombre, i) => {
        piezas[nombre] = texto({
            x, y: y + i * tamano * interlineado, texto: '', tamano, alineacion: 'inicio', anchoMax: ancho, opacidad: 0,
        });
    });
}

// Muestrea una animación que no es una recta entre dos valores (un punto que
// camina sobre una curva, una recta que gira y arrastra a los residuos):
// se agregan cuadros clave cada `cada` segundos, y el motor interpola entre
// ellos. Con 0,1 s no se nota que entre cuadro y cuadro va en línea recta.
function muestrear(n, duracion, cada, alPaso) {
    const cuantos = Math.max(1, Math.round(duracion / cada));
    for (let i = 1; i <= cuantos; i++) alPaso(i / cuantos, n.tiempo + ((i - 1) * duracion) / cuantos, duracion / cuantos);
}

// ======================= La derivada =======================

/**
 * La derivada como límite: la secante entre P y Q se va volviendo la tangente
 * a medida que h se achica.
 *
 * @param {{
 *     f: (x: number) => number, x0: number, h?: number, hFinal?: number,
 *     expresion?: string, rango?: { xmin: number, xmax: number, ymin: number, ymax: number },
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `expresion` es cómo se escribe f, para los textos ("x²"). `preguntas` acepta la clave 'limite'.
 */
export function desdeDerivada(opciones) {
    const { f, x0, h: h0 = 2, hFinal = 0.02, expresion = '', titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    if (typeof f !== 'function') throw new Error('desdeDerivada necesita la función: f: (x) => x * x.');
    const y0 = f(x0);
    const pendiente = derivada(f, x0);
    const nombreF = expresion ? `f(x) = ${expresion}` : 'f';
    const rango = opciones.rango ?? rangoAlrededor(f, x0, h0);

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta
            ? { x: 320, y: arriba + 300, ancho: 600, alto: 580 }
            : { x: 520, y: arriba + 380, ancho: 940, alto: 740 };
        const pan = angosta
            ? { x: 24, y: arriba + 630, ancho: 600, tamano: 24 }
            : { x: 1040, y: arriba + 120, ancho: 540, tamano: 30 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.plano = plano({ ...pl, ...rango, tamano: angosta ? 16 : 20 });
        piezas.f = grafica({ plano: 'plano', f, trazo: 0, etiqueta: expresion ? `y = ${expresion}` : '' });
        piezas.catetoH = segmento({ plano: 'plano', x1: x0, y1: y0, x2: x0 + h0, y2: y0, color: 'suave', punteada: true, etiqueta: 'h', opacidad: 0 });
        piezas.catetoV = segmento({ plano: 'plano', x1: x0 + h0, y1: y0, x2: x0 + h0, y2: f(x0 + h0), color: 'suave', punteada: true, opacidad: 0 });
        piezas.secante = recta({ plano: 'plano', mx: x0, my: y0, pendiente: cocienteIncremental(f, x0, h0), color: 'acento2', progreso: 0, etiqueta: 'secante' });
        piezas.tangente = recta({ plano: 'plano', mx: x0, my: y0, pendiente, color: 'exito', grosor: 4.5, progreso: 0, etiqueta: 'tangente' });
        piezas.P = punto({ plano: 'plano', mx: x0, my: y0, etiqueta: 'P', color: 'acento2', lado: 'arriba-izquierda', opacidad: 0, guias: true });
        piezas.Q = punto({ plano: 'plano', mx: x0 + h0, my: f(x0 + h0), etiqueta: 'Q', color: 'acento2', lado: 'abajo-derecha', opacidad: 0 });
        panel(piezas, ['formula', 'valorH', 'valorPendiente', 'valorDerivada'], pan);
        piezas.formula.props.fuente = 'mono';
        piezas.formula.props.tamano = pan.tamano * 0.82;

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const textos = (h) => ({
            valorH: `h = ${numero(h, 3)}`,
            valorPendiente: `pendiente de la secante = ${numero(cocienteIncremental(f, x0, h), 3)}`,
        });

        n.capitulo('La función');
        n.animar({ pieza: 'f', a: { trazo: 1 }, dur: 1.6 * ritmo });
        n.decir(`Esta es la gráfica de ${nombreF}. ¿Qué tan empinada es en x = ${numero(x0)}?`);

        n.capitulo('Una secante');
        n.animar([
            { pieza: ['P', 'Q'], a: { opacidad: 1 }, dur: 0.5 },
            { pieza: ['catetoH', 'catetoV'], a: { opacidad: 1 }, dur: 0.5 },
            { pieza: 'secante', a: { progreso: 1 }, dur: 1 },
            { pieza: 'formula', a: { texto: 'pendiente = (f(x₀ + h) − f(x₀)) / h', opacidad: 1 }, dur: 0.4 },
            { pieza: 'valorH', a: { texto: textos(h0).valorH, opacidad: 1 }, dur: 0.4 },
            { pieza: 'valorPendiente', a: { texto: textos(h0).valorPendiente, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`Tomamos P = (${numero(x0)}, ${numero(y0)}) y otro punto Q, h más a la derecha. La recta que los une es una secante.`);
        n.decir('Su pendiente es lo que sube dividido lo que avanza: el cociente incremental.');

        n.preguntar('limite');
        n.capitulo('h se achica');
        const T = 6 * ritmo;
        n.decir('Ahora acercamos Q a P: h se hace cada vez más chico. Mirá la secante.', 0);
        muestrear(n, T, 0.1, (u, en, dur) => {
            // h baja exponencialmente: así se ve tanto el tramo grande como el chiquito.
            const h = h0 * (hFinal / h0) ** u;
            linea(n, en, dur, 'Q', { mx: x0 + h, my: f(x0 + h) });
            linea(n, en, dur, 'secante', { pendiente: cocienteIncremental(f, x0, h) });
            linea(n, en, dur, 'catetoH', { x2: x0 + h });
            linea(n, en, dur, 'catetoV', { x1: x0 + h, x2: x0 + h, y2: f(x0 + h) });
            n.linea.push({ pieza: 'valorH', a: { texto: textos(h).valorH }, dur: 0, en: en + dur });
            n.linea.push({ pieza: 'valorPendiente', a: { texto: textos(h).valorPendiente }, dur: 0, en: en + dur });
        });
        n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en) + 0.6;

        n.capitulo('La tangente');
        n.animar([
            { pieza: 'tangente', a: { progreso: 1 }, dur: 1 },
            { pieza: ['secante', 'catetoH', 'catetoV', 'Q'], a: { opacidad: 0 }, dur: 0.6 },
            { pieza: 'valorDerivada', a: { texto: `f′(${numero(x0)}) = ${numero(pendiente, 3)}`, opacidad: 1, color: 'exito', peso: 800 }, dur: 0.5 },
        ]);
        n.decir(`Cuando h tiende a 0, la secante se vuelve la recta tangente. Su pendiente es la derivada: f′(${numero(x0)}) = ${numero(pendiente, 3)}.`);
        n.decir('La derivada es eso: la pendiente de la recta que apenas toca la curva en ese punto.');

        return {
            titulo: titulo || 'La derivada, como límite',
            descripcion: descripcion || `La secante entre dos puntos de ${nombreF} se vuelve la tangente en x = ${numero(x0)} cuando h tiende a 0.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// Una animación lineal entre cuadros clave muestreados.
function linea(n, en, dur, pieza, a) {
    n.linea.push({ pieza, a, dur, en, curva: 'lineal' });
}

function rangoAlrededor(f, x0, h) {
    const xmin = x0 - Math.max(1.5, h * 0.9);
    const xmax = x0 + h * 1.35 + 0.5;
    const ys = [];
    for (let i = 0; i <= 60; i++) {
        const y = f(xmin + ((xmax - xmin) * i) / 60);
        if (Number.isFinite(y)) ys.push(y);
    }
    const ymin = Math.min(0, ...ys);
    const ymax = Math.max(...ys);
    const aire = (ymax - ymin) * 0.12 || 1;
    return { xmin, xmax, ymin: ymin - aire, ymax: ymax + aire };
}

// ======================= El descenso del gradiente =======================

/**
 * El descenso del gradiente sobre las curvas de nivel de f(x, y): el
 * gradiente apunta hacia donde f sube más rápido, y se camina al revés.
 *
 * @param {{
 *     f: (x: number, y: number) => number, inicio: [number, number], tasa: number, pasos?: number,
 *     gradiente?: (x: number, y: number) => [number, number],
 *     expresion?: string, rango?: { xmin: number, xmax: number, ymin: number, ymax: number }, niveles?: number[],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `preguntas` acepta la clave 'direccion' (antes de bajar) y 'final' (antes del último tramo).
 */
export function desdeDescenso(opciones) {
    const { f, inicio, tasa, pasos = 12, expresion = '', titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    if (typeof f !== 'function') throw new Error('desdeDescenso necesita la función: f: (x, y) => x * x + y * y.');
    const { puntos, motivo } = descensoGradiente(f, { inicio, tasa, pasos, gradiente: opciones.gradiente });
    const rango = opciones.rango ?? rangoCuadrado(puntos);
    const niveles = opciones.niveles ?? nivelesAutomaticos(f, rango);
    const nombreF = expresion ? `f(x, y) = ${expresion}` : 'f';

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        // El plano es cuadrado, y el rango también: si no, las curvas se ven
        // aplastadas y el gradiente no parece perpendicular a ellas.
        const lado = angosta ? 600 : 740;
        const pl = angosta ? { x: 320, y: arriba + 310, ancho: lado, alto: lado } : { x: 470, y: arriba + 385, ancho: lado, alto: lado };
        const pan = angosta ? { x: 24, y: arriba + 650, ancho: 600, tamano: 23 } : { x: 900, y: arriba + 110, ancho: 680, tamano: 29 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.plano = plano({ ...pl, ...rango, tamano: angosta ? 16 : 19 });
        piezas.curvas = curvasNivel({ plano: 'plano', f, niveles, progreso: 0, tamanoEtiqueta: angosta ? 14 : 17 });
        piezas.campo = campo({ plano: 'plano', f, progreso: 0, cantidad: angosta ? 9 : 11, largo: angosta ? 30 : 38 });
        piezas.camino = grafica({ plano: 'plano', datos: [[inicio[0], inicio[1]]], color: 'acento2', grosor: 3.5, trazo: 1, opacidad: 0 });
        piezas.paso = vector({ plano: 'plano', mx: inicio[0], my: inicio[1], dx: 0, dy: 0, progreso: 0, color: 'error', grosor: 4.5, etiqueta: '−α∇f' });
        piezas.x = punto({ plano: 'plano', mx: inicio[0], my: inicio[1], color: 'acento2', etiqueta: 'x₀', opacidad: 0 });
        panel(piezas, ['regla', 'tasa', 'iteracion', 'posicion', 'valor', 'grad'], pan);
        piezas.regla.props.fuente = 'mono';

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const [gx0, gy0] = puntos[0].gradiente;

        n.capitulo('Curvas de nivel');
        n.animar({ pieza: 'curvas', a: { progreso: niveles.length }, dur: 2 * ritmo });
        n.decir(`Estas son curvas de nivel de ${nombreF}: cada una junta los puntos donde f vale lo mismo, como las líneas de un mapa de montaña.`);

        n.capitulo('El gradiente');
        n.animar({ pieza: 'campo', a: { progreso: 1 }, dur: 1.2 });
        n.decir('En cada punto, el gradiente ∇f apunta hacia donde f sube más rápido. Fijate que siempre cruza las curvas en ángulo recto.');
        n.animar([
            { pieza: 'campo', a: { opacidad: 0 }, dur: 0.4 },
            { pieza: 'campo', a: { sentido: 'bajada', color: 'error' }, dur: 0, demora: 0.4 },
            { pieza: 'campo', a: { opacidad: 0.75 }, dur: 0.5, demora: 0.45 },
        ].map(({ demora = 0, ...i }) => ({ ...i, en: n.tiempo + demora })));
        n.decir('Para bajar lo más rápido posible hay que ir al revés: en la dirección de −∇f.');

        n.preguntar('direccion');
        n.capitulo('Un paso');
        n.animar([
            { pieza: 'campo', a: { opacidad: 0.25 }, dur: 0.5 },
            { pieza: 'x', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'regla', a: { texto: 'x(t+1) = x(t) − α · ∇f(x(t))', opacidad: 1 }, dur: 0.4 },
            { pieza: 'tasa', a: { texto: `α = ${numero(tasa, 3)} (la tasa de aprendizaje)`, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir(`Arrancamos en x₀ = (${numero(inicio[0])}, ${numero(inicio[1])}). La regla es una sola: moverse un poquito en la dirección de −∇f.`);

        const datos = [[inicio[0], inicio[1]]];
        const estado = (i) => {
            const q = puntos[i];
            return {
                iteracion: `paso ${i}`,
                posicion: `x = (${numero(q.x, 3)}, ${numero(q.y, 3)})`,
                valor: `f(x) = ${numero(q.z, 4)}`,
                grad: `∇f(x) = (${numero(q.gradiente[0], 3)}, ${numero(q.gradiente[1], 3)})`,
            };
        };
        n.animar(Object.entries(estado(0)).map(([pieza, t]) => ({ pieza, a: { texto: t, opacidad: 1 }, dur: 0.3 })));
        n.animar({ pieza: 'camino', a: { opacidad: 1 }, dur: 0.3 });

        for (let i = 1; i < puntos.length; i++) {
            const antes = puntos[i - 1];
            const q = puntos[i];
            const detallado = i <= 2;
            const rapido = detallado ? 1 : 0.55;
            if (i === puntos.length - 1) n.preguntar('final');
            n.animar([
                { pieza: 'paso', a: { mx: antes.x, my: antes.y, dx: q.x - antes.x, dy: q.y - antes.y, progreso: 0 }, dur: 0 },
                { pieza: 'paso', a: { progreso: 1 }, dur: 0.6 * rapido * ritmo },
            ]);
            if (detallado) {
                n.decir(i === 1
                    ? `El gradiente acá es (${numero(gx0, 2)}, ${numero(gy0, 2)}). Lo multiplicamos por α y le restamos eso a x: la flecha roja es el paso.`
                    : 'Otra vez: se calcula el gradiente en el punto nuevo, y se da otro paso.', 0);
            } else {
                n.esperar(0.6 * rapido);
            }
            datos.push([q.x, q.y]);
            n.animar([
                { pieza: 'x', a: { mx: q.x, my: q.y, etiqueta: `x${subindice(i)}` }, dur: 0.6 * rapido * ritmo },
                { pieza: 'camino', a: { datos: datos.map((d) => [...d]) }, dur: 0, demora: 0.6 * rapido * ritmo },
                { pieza: 'paso', a: { progreso: 0 }, dur: 0.2, demora: 0.6 * rapido * ritmo },
                ...Object.entries(estado(i)).map(([pieza, t]) => ({ pieza, a: { texto: t }, dur: 0, demora: 0.6 * rapido * ritmo })),
            ].map(({ demora = 0, ...it }) => ({ ...it, en: n.tiempo + demora })));
            n.esperar(0.9 * rapido + (detallado ? 0.3 : 0));
        }

        const ultimo = puntos.at(-1);
        n.capitulo('¿Dónde terminó?');
        if (motivo === 'diverge') {
            n.decir('Se fue lejísimos: con una tasa tan grande, cada paso se pasa del mínimo y cae cada vez más arriba. El método diverge.');
        } else if (motivo === 'minimo') {
            n.decir(`Llegó a un punto donde el gradiente es casi cero: (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}). Ahí f no sube ni baja hacia ningún lado: es el mínimo.`);
        } else if (rebota(puntos)) {
            n.decir(`Después de ${puntos.length - 1} pasos va por (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}), pero rebotando de un lado al otro del valle: cada paso se pasa del fondo. La tasa es grande; un poco más, y diverge.`);
        } else {
            const cerca = Math.hypot(...ultimo.gradiente) < 0.05;
            n.decir(cerca
                ? `Después de ${puntos.length - 1} pasos quedó en (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}), con el gradiente casi en cero: está pegado al mínimo.`
                : `Después de ${puntos.length - 1} pasos va por (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}). Todavía le falta: con más pasos, o una tasa un poco mayor, llegaría.`);
        }
        n.decir('Cada paso es más corto que el anterior porque, cerca del mínimo, el gradiente se achica.');

        return {
            titulo: titulo || 'Descenso del gradiente',
            descripcion: descripcion || `El descenso del gradiente sobre ${nombreF}, desde (${numero(inicio[0])}, ${numero(inicio[1])}) con tasa ${numero(tasa, 3)}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// Si alguna coordenada cambia de dirección en la mayoría de los pasos, el
// punto está rebotando entre las dos laderas del valle.
function rebota(puntos) {
    if (puntos.length < 4) return false;
    for (const eje of ['x', 'y']) {
        let vueltas = 0;
        for (let i = 2; i < puntos.length; i++) {
            const a = puntos[i - 1][eje] - puntos[i - 2][eje];
            const b = puntos[i][eje] - puntos[i - 1][eje];
            if (a * b < 0) vueltas++;
        }
        if (vueltas >= (puntos.length - 2) * 0.6) return true;
    }
    return false;
}

function subindice(i) {
    return String(i).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
}

function rangoCuadrado(puntos) {
    const xs = puntos.map((p) => p.x).filter(Number.isFinite);
    const ys = puntos.map((p) => p.y).filter(Number.isFinite);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const media = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1) * 0.7;
    return { xmin: cx - media, xmax: cx + media, ymin: cy - media, ymax: cy + media };
}

// Los niveles se eligen por percentiles de los valores de f en el rango: así
// hay más curvas cerca del mínimo, donde pasa lo interesante, y no quedan
// todas amontonadas en un borde.
function nivelesAutomaticos(f, rango) {
    const valores = [];
    for (let j = 0; j <= 30; j++) {
        for (let i = 0; i <= 30; i++) {
            const v = f(rango.xmin + ((rango.xmax - rango.xmin) * i) / 30, rango.ymin + ((rango.ymax - rango.ymin) * j) / 30);
            if (Number.isFinite(v)) valores.push(v);
        }
    }
    valores.sort((a, b) => a - b);
    const lindos = [0.03, 0.09, 0.18, 0.3, 0.45, 0.62, 0.82].map((q) => valores[Math.floor(q * (valores.length - 1))]);
    // Redondeados a dos cifras significativas, para que los rótulos se lean.
    return [...new Set(lindos.map((v) => Number(v.toPrecision(2))))];
}

// ======================= Regresión lineal =======================

/**
 * Mínimos cuadrados: una recta que pasa por el punto promedio gira hasta que
 * la suma de los residuos al cuadrado es la más chica posible.
 *
 * @param {{
 *     datos: [number, number][], etiquetaX?: string, etiquetaY?: string,
 *     rango?: { xmin: number, xmax: number, ymin: number, ymax: number }, predecir?: number[],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `predecir` son valores de x para estimar con la recta (si caen afuera de
 *     los datos, se avisa que es extrapolar). `preguntas` acepta 'recta' y 'prediccion'.
 */
export function desdeRegresion(opciones) {
    const { datos, etiquetaX = 'x', etiquetaY = 'y', predecir = [], titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const r = regresionLineal(datos);
    const rango = opciones.rango ?? rangoDatos(datos);
    const xs = datos.map(([x]) => x);
    const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 320, y: arriba + 290, ancho: 600, alto: 560 } : { x: 520, y: arriba + 380, ancho: 940, alto: 740 };
        const pan = angosta ? { x: 24, y: arriba + 620, ancho: 600, tamano: 23 } : { x: 1040, y: arriba + 110, ancho: 540, tamano: 29 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.plano = plano({ ...pl, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 15 : 19 });
        datos.forEach(([x, y], i) => {
            piezas[`e${i}`] = segmento({ plano: 'plano', x1: x, y1: y, x2: x, y2: r.mediaY, color: 'error', grosor: 2.5, opacidad: 0 });
        });
        piezas.recta = recta({ plano: 'plano', mx: r.mediaX, my: r.mediaY, pendiente: 0, color: 'acento2', progreso: 0 });
        datos.forEach(([x, y], i) => {
            piezas[`d${i}`] = punto({ plano: 'plano', mx: x, my: y, radio: angosta ? 6 : 8, color: 'acento', opacidad: 0 });
        });
        piezas.media = punto({ plano: 'plano', mx: r.mediaX, my: r.mediaY, color: 'acento2', etiqueta: '(x̄, ȳ)', radio: 10, opacidad: 0, lado: 'arriba-izquierda' });
        piezas.prediccion = punto({ plano: 'plano', mx: r.mediaX, my: r.mediaY, color: 'exito', guias: true, radio: 10, opacidad: 0 });
        panel(piezas, ['cantidad', 'medias', 'ssr', 'ecuacion', 'r2', 'juicio', 'estimacion'], pan);

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const ids = datos.map((_, i) => `d${i}`);
        const residuos = datos.map((_, i) => `e${i}`);

        n.capitulo('Los datos');
        n.animar({ pieza: ids, a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.12, 1.8 / datos.length) });
        n.animar({ pieza: 'cantidad', a: { texto: `${r.n} puntos (${etiquetaX}, ${etiquetaY})`, opacidad: 1 }, dur: 0.4 });
        n.decir(`Tenemos ${r.n} mediciones. Parece que cuando ${etiquetaX} crece, ${etiquetaY} también: ¿qué recta las representa mejor?`);

        n.capitulo('Una recta cualquiera');
        n.animar([
            { pieza: 'media', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'medias', a: { texto: `x̄ = ${numero(r.mediaX)},  ȳ = ${numero(r.mediaY)}`, opacidad: 1 }, dur: 0.4 },
            { pieza: 'recta', a: { progreso: 1 }, dur: 1 },
        ]);
        n.decir('Probemos primero con una recta horizontal, a la altura del promedio ȳ.');
        n.animar([
            { pieza: residuos, a: { opacidad: 1 }, dur: 0.4, escalonar: 0.04 },
            { pieza: 'ssr', a: { texto: `Suma de residuos² = ${numero(sumaResiduos(datos, r.mediaY, 0), 1)}`, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir('Cada segmento rojo es un residuo: cuánto le erra la recta a ese punto. Los elevamos al cuadrado y los sumamos.');

        n.preguntar('recta');
        n.capitulo('Mínimos cuadrados');
        n.decir('Ahora la giramos sobre el punto promedio. Mirá cómo baja la suma.', 0);
        muestrear(n, 4.5 * ritmo, 0.1, (u, en, dur) => {
            const b1 = r.b1 * (1 - (1 - u) ** 2);
            const b0 = r.mediaY - b1 * r.mediaX;
            linea(n, en, dur, 'recta', { pendiente: b1 });
            datos.forEach(([x], i) => linea(n, en, dur, `e${i}`, { y2: b0 + b1 * x }));
            n.linea.push({ pieza: 'ssr', a: { texto: `Suma de residuos² = ${numero(sumaResiduos(datos, b0, b1), 1)}` }, dur: 0, en: en + dur });
        });
        n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en) + 0.5;
        n.animar([
            { pieza: 'ecuacion', a: { texto: `ŷ = ${numero(r.b0, 3)} + ${numero(r.b1, 3)} · ${etiquetaX}`, opacidad: 1, peso: 800, color: 'acento2' }, dur: 0.4 },
        ]);
        n.decir(`Esta es la recta con la menor suma posible: ŷ = ${numero(r.b0, 3)} + ${numero(r.b1, 3)}·${etiquetaX}. Por eso se llama de mínimos cuadrados.`);
        n.decir(`La pendiente dice cuánto cambia ${etiquetaY}, en promedio, por cada unidad de ${etiquetaX}: ${numero(r.b1, 3)}.`);

        n.capitulo('¿Ajusta bien?');
        const juicio = r.r2 > 0.9 ? 'muy bueno' : r.r2 > 0.7 ? 'bueno' : r.r2 > 0.4 ? 'regular' : 'malo';
        n.animar([
            { pieza: 'r2', a: { texto: `R² = ${numero(r.r2, 3)},  r = ${numero(r.r, 3)}`, opacidad: 1 }, dur: 0.4 },
            { pieza: 'juicio', a: { texto: `Ajuste ${juicio}`, opacidad: 1, color: r.r2 > 0.7 ? 'exito' : 'alerta', peso: 700 }, dur: 0.4 },
            { pieza: residuos, a: { opacidad: 0.35 }, dur: 0.5 },
        ]);
        n.decir(`R² = ${numero(r.r2, 3)}: la recta explica el ${numero(r.r2 * 100, 0)} % de la variación de ${etiquetaY}. El ajuste es ${juicio}.`);

        for (const x of predecir) {
            const y = r.b0 + r.b1 * x;
            const afuera = x < xMin || x > xMax;
            n.preguntar('prediccion');
            n.capitulo(`Predecir con ${etiquetaX} = ${numero(x)}`);
            n.animar([
                { pieza: 'prediccion', a: { mx: x, my: y, etiqueta: `ŷ ≈ ${numero(y, 1)}`, opacidad: 1, color: afuera ? 'alerta' : 'exito' }, dur: 0.6 },
                { pieza: 'estimacion', a: { texto: `${etiquetaX} = ${numero(x)}  →  ŷ ≈ ${numero(y, 2)}`, opacidad: 1 }, dur: 0.4 },
            ]);
            n.decir(afuera
                ? `Para ${etiquetaX} = ${numero(x)} la recta da ${numero(y, 1)}. Pero ojo: los datos van de ${numero(xMin)} a ${numero(xMax)}. Afuera de ese rango es extrapolar, y nada garantiza que siga siendo una recta.`
                : `Para ${etiquetaX} = ${numero(x)}, la recta estima ${etiquetaY} ≈ ${numero(y, 1)}. Está dentro del rango de los datos, así que es una estimación razonable.`);
        }

        return {
            titulo: titulo || 'Regresión lineal',
            descripcion: descripcion || `La recta de mínimos cuadrados para ${r.n} puntos: ŷ = ${numero(r.b0, 3)} + ${numero(r.b1, 3)}x, con R² = ${numero(r.r2, 3)}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

function rangoDatos(datos) {
    const xs = datos.map(([x]) => x);
    const ys = datos.map(([, y]) => y);
    const ax = (Math.max(...xs) - Math.min(...xs)) * 0.12 || 1;
    const ay = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
    return { xmin: Math.min(0, Math.min(...xs) - ax), xmax: Math.max(...xs) + ax, ymin: Math.min(0, Math.min(...ys) - ay), ymax: Math.max(...ys) + ay };
}

// ======================= El algoritmo de Euclides =======================

/**
 * El máximo común divisor con el algoritmo de Euclides, en dos dibujos a la
 * vez: la tabla de divisiones, y un rectángulo de a × b que se va llenando
 * con los cuadrados más grandes que entran. El último cuadrado que lo llena
 * justo es el mcd.
 *
 * @param {{ a: number, b: number, titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any> }} opciones
 *     `preguntas` acepta 'resto' (después de la primera división).
 */
export function desdeEuclides(opciones) {
    const { a, b, titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const { mcd, pasos } = euclides(a, b);
    const grande = Math.max(Math.abs(a), Math.abs(b));
    const chico = Math.min(Math.abs(a), Math.abs(b));

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        // El rectángulo, escalado para que entre.
        const zona = angosta ? { x: 320, y: arriba + 230, ancho: 600, alto: 400 } : { x: 470, y: arriba + 360, ancho: 860, alto: 600 };
        const escala = Math.min(zona.ancho / grande, zona.alto / chico);
        const R = { ancho: grande * escala, alto: chico * escala };
        const origen = { x: zona.x - R.ancho / 2, y: zona.y - R.alto / 2 };

        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.rect = caja({ x: zona.x, y: zona.y, ancho: R.ancho, alto: R.alto, radio: 2, relleno: 'papel', grosorBorde: 3, texto: `${grande} × ${chico}`, tamano: angosta ? 22 : 30, color: 'suave', opacidad: 0 });

        // Los cuadrados: en cada paso, q cuadrados de lado b, alternando la dirección.
        const cuadrados = [];
        let x = origen.x;
        let y = origen.y;
        let w = R.ancho;
        let h = R.alto;
        const colores = ['acento', 'acento2', 'exito', 'alerta'];
        pasos.forEach((p, i) => {
            const lado = p.b * escala;
            const horizontal = w >= h - 1e-6;
            // Muchos cuadrados chiquitos no se distinguen: más de 10 van juntos, en una sola franja.
            const juntos = p.q > 10;
            const cuantos = juntos ? 1 : p.q;
            for (let k = 0; k < cuantos; k++) {
                const largo = juntos ? lado * p.q : lado;
                const cx = horizontal ? x + k * lado + largo / 2 : x + lado / 2;
                const cy = horizontal ? y + lado / 2 : y + k * lado + largo / 2;
                cuadrados.push({
                    id: `c${i}_${k}`,
                    paso: i,
                    pieza: caja({
                        x: cx, y: cy, ancho: horizontal ? largo : lado, alto: horizontal ? lado : largo, radio: 2,
                        relleno: colores[i % colores.length], borde: 'superficie', grosorBorde: 2,
                        texto: lado > 44 ? (juntos ? `${p.q} × ${p.b}` : String(p.b)) : '', color: 'fondo', tamano: Math.min(30, lado * 0.35),
                        opacidad: 0,
                    }),
                });
            }
            if (horizontal) {
                x += p.q * lado;
                w -= p.q * lado;
            } else {
                y += p.q * lado;
                h -= p.q * lado;
            }
        });
        for (const c of cuadrados) piezas[c.id] = c.pieza;

        const tab = angosta
            ? { x: 320, y: arriba + 470, ancho: 560, altoFila: 40, tamano: 21 }
            : { x: 1250, y: arriba + 100, ancho: 560, altoFila: 54, tamano: 28 };
        piezas.divisiones = tabla({
            ...tab, anclaje: 'arriba', columnas: ['División', 'Resto'], filas: pasos.map((p) => [`${p.a} = ${p.q} · ${p.b} + ${p.r}`, String(p.r)]),
            filasVisibles: 0, opacidad: 0,
        });
        piezas.resultado = texto({
            x: tab.x, y: tab.y + (pasos.length + 1) * tab.altoFila + (angosta ? 44 : 70), texto: `mcd(${a}, ${b}) = ${mcd}`,
            tamano: angosta ? 30 : 40, peso: 800, color: 'exito', opacidad: 0,
        });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        n.capitulo('El rectángulo');
        n.animar([{ pieza: 'rect', a: { opacidad: 1 }, dur: 0.5 }, { pieza: 'divisiones', a: { opacidad: 1 }, dur: 0.5 }]);
        n.decir(`Queremos el máximo común divisor de ${a} y ${b}. Pensalo como un rectángulo de ${grande} por ${chico}: buscamos el cuadrado más grande que lo llene justo, sin que sobre nada.`);

        pasos.forEach((p, i) => {
            const ids = cuadrados.filter((c) => c.paso === i).map((c) => c.id);
            n.capitulo(`${p.a} = ${p.q} · ${p.b} + ${p.r}`);
            n.animar([
                { pieza: 'rect', a: { texto: '' }, dur: 0 },
                { pieza: ids, a: { opacidad: 1 }, dur: 0.35, escalonar: Math.min(0.25, 1.5 / ids.length) },
                { pieza: 'divisiones', a: { filasVisibles: i + 1, resaltarFila: i }, dur: 0.4 },
            ]);
            if (i === 0) {
                n.decir(`Entran ${p.q} cuadrados de ${p.b} de lado, y sobra una tira de ${p.r}. Eso es dividir: ${p.a} = ${p.q} · ${p.b} + ${p.r}.`);
                n.preguntar('resto');
                if (p.r !== 0) n.decir(`El truco de Euclides: el mcd de ${a} y ${b} es el mismo que el de ${p.b} y ${p.r}. Así que seguimos con lo que sobró.`);
            } else if (p.r !== 0) {
                n.decir(`En lo que sobró entran ${p.q} de ${p.b}, y sobra ${p.r}.`);
            } else {
                n.decir(`Ahora entran ${p.q} cuadrados de ${p.b} justos: el resto es 0. No sobra nada.`);
            }
        });

        n.capitulo('El mcd');
        n.animar([
            { pieza: 'divisiones', a: { resaltarFila: -1 }, dur: 0.3 },
            { pieza: 'resultado', a: { opacidad: 1 }, dur: 0.5 },
        ]);
        n.decir(mcd === 1
            ? `El último cuadrado mide 1: mcd(${a}, ${b}) = 1. No tienen ningún divisor en común salvo el 1: son coprimos.`
            : `El último resto que no es cero es ${mcd}: mcd(${a}, ${b}) = ${mcd}. Un cuadrado de ${mcd} por ${mcd} llena el rectángulo entero.`);

        return {
            titulo: titulo || 'El algoritmo de Euclides',
            descripcion: descripcion || `El máximo común divisor de ${a} y ${b} con divisiones sucesivas: da ${mcd}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Relaciones =======================

/**
 * Una relación sobre un conjunto finito, en sus tres formas (los pares, el
 * dígrafo y la matriz), y cuáles de las propiedades cumple, con el
 * contraejemplo a la vista cuando no.
 *
 * @param {{ conjunto: (string | number)[], pares: [any, any][], nombre?: string, titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any> }} opciones
 *     `preguntas` acepta 'reflexiva', 'simetrica', 'antisimetrica' y 'transitiva'.
 */
export function desdeRelacion(opciones) {
    const { conjunto, pares, nombre = 'R', titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const props = propiedadesRelacion(conjunto, pares);
    const matriz = matrizRelacion(conjunto, pares);
    const s = (v) => String(v);
    const par = ([x, y]) => `(${x}, ${y})`;
    const flecha = ([x, y]) => `${s(x)}→${s(y)}`;

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.pares = texto({
            x: W / 2, y: arriba + (angosta ? 20 : 26), texto: `${nombre} = { ${pares.map(par).join(', ')} }`,
            tamano: angosta ? 19 : 26, fuente: 'mono', anchoMax: W - 40, opacidad: 0,
        });
        const g = angosta ? { x: 320, y: arriba + 300, radio: 170, radioNodo: 32 } : { x: 450, y: arriba + 400, radio: 230, radioNodo: 40 };
        piezas.grafo = grafo({
            ...g, nodos: conjunto.map(s), aristas: pares.map(([x, y]) => [s(x), s(y)]), visibles: 0, nodosVisibles: 0,
            tamano: angosta ? 24 : 30,
        });
        const anchoCelda = angosta ? 54 : 70;
        const tab = angosta
            ? { x: 320, y: arriba + 560, tamano: 20, altoFila: 38 }
            : { x: 1180, y: arriba + 90, tamano: 26, altoFila: 52 };
        const filaMatriz = (hasta) => conjunto.map((a, i) => [s(a), ...conjunto.map((b, j) => {
            const k = pares.findIndex(([x, y]) => x === a && y === b);
            return k !== -1 && k < hasta ? String(matriz[i][j]) : (k === -1 && hasta >= pares.length ? '0' : '');
        })]);
        piezas.matriz = tabla({
            ...tab, anclaje: 'arriba', columnas: [nombre, ...conjunto.map(s)], filas: filaMatriz(0),
            anchos: [anchoCelda, ...conjunto.map(() => anchoCelda)], opacidad: 0,
        });
        const listaY = tab.y + (conjunto.length + 1) * tab.altoFila + (angosta ? 40 : 60);
        const nombres = ['reflexiva', 'simetrica', 'antisimetrica', 'transitiva'];
        const titulos = { reflexiva: 'Reflexiva', simetrica: 'Simétrica', antisimetrica: 'Antisimétrica', transitiva: 'Transitiva' };
        nombres.forEach((p, i) => {
            piezas[p] = texto({
                x: angosta ? 40 : tab.x - (conjunto.length + 1) * anchoCelda / 2, y: listaY + i * (angosta ? 34 : 48),
                texto: `${titulos[p]}: ¿?`, tamano: angosta ? 21 : 28, alineacion: 'inicio', opacidad: 0,
            });
        });
        piezas.conclusion = texto({
            x: angosta ? 320 : tab.x, y: listaY + 4 * (angosta ? 34 : 48) + (angosta ? 20 : 30), texto: '',
            tamano: angosta ? 22 : 30, peso: 800, anchoMax: angosta ? 600 : 620, opacidad: 0,
        });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        n.capitulo('Tres formas de verla');
        n.animar([
            { pieza: 'pares', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'grafo', a: { nodosVisibles: conjunto.length }, dur: 0.8 },
            { pieza: 'matriz', a: { opacidad: 1 }, dur: 0.5 },
        ]);
        n.decir(`La relación ${nombre} sobre {${conjunto.join(', ')}} se puede escribir como pares, dibujar como un dígrafo o poner en una matriz.`);
        n.animar({ pieza: 'grafo', a: { visibles: pares.length }, dur: Math.min(4, 0.5 * pares.length) * ritmo, curva: 'lineal' });
        muestrear(n, Math.min(4, 0.5 * pares.length) * ritmo, Math.min(4, 0.5 * pares.length) * ritmo / pares.length, (u, en, dur) => {
            n.linea.push({ pieza: 'matriz', a: { filas: filaMatriz(Math.round(u * pares.length)) }, dur: 0, en: en + dur });
        });
        n.decir('Cada par (a, b) es una flecha de a hacia b, y un 1 en la fila a, columna b. Un par (a, a) es un lazo, que vuelve al mismo nodo.');

        const comprobar = (p, explicar) => {
            n.preguntar(p);
            n.capitulo(titulos[p]);
            const { cumple, resaltar, texto: dicho } = explicar(props[p]);
            n.animar([
                { pieza: 'grafo', a: { resaltar }, dur: 0 },
                { pieza: p, a: { texto: `${titulos[p]}: ${cumple ? 'sí ✓' : 'no ✗'}`, color: cumple ? 'exito' : 'error', opacidad: 1, peso: 700 }, dur: 0.4 },
            ]);
            n.decir(dicho);
        };

        comprobar('reflexiva', ({ cumple, contraejemplo }) => ({
            cumple,
            resaltar: cumple ? conjunto.map((a) => `${s(a)}→${s(a)}`) : [s(contraejemplo[0])],
            texto: cumple
                ? 'Reflexiva: todos los elementos tienen su lazo. Cada uno está relacionado consigo mismo.'
                : `Reflexiva no: a ${contraejemplo[0]} le falta el lazo, (${contraejemplo[0]}, ${contraejemplo[0]}) no está en ${nombre}.`,
        }));
        comprobar('simetrica', ({ cumple, contraejemplo }) => ({
            cumple,
            resaltar: cumple ? [] : [flecha(contraejemplo)],
            texto: cumple
                ? 'Simétrica: cada flecha tiene su vuelta. Si a está relacionado con b, b también con a.'
                : `Simétrica no: está ${par(contraejemplo)}, pero no ${par([contraejemplo[1], contraejemplo[0]])}. Esa flecha no tiene vuelta.`,
        }));
        comprobar('antisimetrica', ({ cumple, contraejemplo }) => ({
            cumple,
            resaltar: cumple ? [] : [flecha(contraejemplo), flecha([contraejemplo[1], contraejemplo[0]])],
            texto: cumple
                ? 'Antisimétrica: entre dos elementos distintos nunca hay ida y vuelta.'
                : `Antisimétrica no: ${contraejemplo[0]} y ${contraejemplo[1]} son distintos, y hay flecha de ida y de vuelta.`,
        }));
        comprobar('transitiva', ({ cumple, contraejemplo }) => ({
            cumple,
            resaltar: cumple ? [] : contraejemplo.pares.map(flecha),
            texto: cumple
                ? 'Transitiva: siempre que se puede ir de a a b y de b a c, también hay flecha directa de a a c.'
                : `Transitiva no: está ${par(contraejemplo.pares[0])} y ${par(contraejemplo.pares[1])}, pero falta ${par(contraejemplo.falta)}: no hay atajo de ${contraejemplo.falta[0]} a ${contraejemplo.falta[1]}.`,
        }));

        n.capitulo('Conclusión');
        const conclusion = props.equivalencia
            ? `${nombre} es una relación de equivalencia.`
            : props.reflexiva.cumple && props.antisimetrica.cumple && props.transitiva.cumple
                ? `${nombre} es una relación de orden.`
                : `${nombre} no es de equivalencia ni de orden.`;
        n.animar([{ pieza: 'grafo', a: { resaltar: [] }, dur: 0 }, { pieza: 'conclusion', a: { texto: conclusion, opacidad: 1 }, dur: 0.5 }]);
        n.decir(props.equivalencia
            ? `Es reflexiva, simétrica y transitiva: ${nombre} es una relación de equivalencia.`
            : `${conclusion} Para ser de equivalencia necesita ser reflexiva, simétrica y transitiva; para ser de orden, reflexiva, antisimétrica y transitiva.`);

        return {
            titulo: titulo || `Las propiedades de ${nombre}`,
            descripcion: descripcion || `La relación ${nombre} = { ${pares.map(par).join(', ')} } como dígrafo y como matriz, y cuáles propiedades cumple.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Aritmética modular =======================

/**
 * La aritmética módulo n como un reloj de n horas: sumar es avanzar, y al
 * pasar del n − 1 se vuelve a empezar desde 0.
 *
 * @param {{ n: number, cuentas: string[], titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any> }} opciones
 *     Cada cuenta es "a + b", "a - b", "a * b" o un número solo ("387": su clase).
 *     `preguntas` se indexa por número de cuenta: { 0: { pregunta, opciones, correcta } }.
 */
export function desdeModulo(opciones) {
    const { n: m, cuentas, titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    if (!(Number.isInteger(m) && m >= 2 && m <= 24)) throw new Error('El módulo de desdeModulo tiene que ser un entero entre 2 y 24 (si no, el reloj no se lee).');
    const analizadas = cuentas.map(analizarCuenta);

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const g = angosta ? { x: 320, y: arriba + 300, radio: 200, radioNodo: 30 } : { x: 520, y: arriba + 390, radio: 290, radioNodo: 38 };
        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        const nodos = Array.from({ length: m }, (_, i) => String(i));
        piezas.reloj = grafo({ ...g, nodos, aristas: [], tamano: angosta ? 24 : 30 });
        piezas.centro = texto({ x: g.x, y: g.y, texto: `mód ${m}`, tamano: angosta ? 30 : 40, peso: 800, color: 'suave' });
        const pan = angosta ? { x: 24, y: arriba + 600, ancho: 600, tamano: 25 } : { x: 1000, y: arriba + 160, ancho: 580, tamano: 32 };
        panel(piezas, ['cuenta', 'detalle', 'resultado'], { ...pan, interlineado: 2.1 });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        n.capitulo(`Un reloj de ${m}`);
        n.decir(`En aritmética módulo ${m} solo hay ${m} números, del 0 al ${m - 1}, en ronda como las horas de un reloj. Al pasar el ${m - 1}, se vuelve al 0.`);

        analizadas.forEach((c, k) => {
            const r = modulo(c.valor, m);
            n.preguntar(k);
            n.capitulo(c.texto);
            n.animar([
                { pieza: 'reloj', a: { aristas: [], resaltar: [], visibles: 0 }, dur: 0 },
                { pieza: 'cuenta', a: { texto: `${c.texto} (mód ${m})`, opacidad: 1, peso: 700 }, dur: 0.3 },
                { pieza: ['detalle', 'resultado'], a: { opacidad: 0 }, dur: 0.2 },
            ]);
            if (c.op === null) {
                const vueltas = Math.floor(c.a / m);
                n.animar({ pieza: 'reloj', a: { resaltar: [String(r)] }, dur: 0, demora: 0 });
                n.animar({ pieza: 'detalle', a: { texto: `${c.a} = ${vueltas} · ${m} + ${r}`, opacidad: 1 }, dur: 0.3 });
                n.decir(`${c.a} dividido ${m} da ${vueltas} y sobra ${r}: es dar ${vueltas} vueltas enteras al reloj y avanzar ${r} más. Así que ${c.a} ≡ ${r}.`);
            } else {
                // El recorrido: desde dónde arranca y de a cuánto salta.
                const desde = c.op === '*' ? 0 : modulo(c.a, m);
                const salto = c.op === '*' ? modulo(c.a, m) : c.op === '+' ? 1 : -1;
                const veces = c.b;
                const aristas = [];
                let actual = desde;
                for (let i = 0; i < veces; i++) {
                    const siguiente = modulo(actual + salto, m);
                    aristas.push([String(actual), String(siguiente)]);
                    actual = siguiente;
                }
                n.animar([
                    { pieza: 'reloj', a: { resaltar: [String(desde)] }, dur: 0 },
                    { pieza: 'detalle', a: { texto: c.op === '*' ? `${c.b} saltos de a ${modulo(c.a, m)}, desde el 0` : `desde el ${desde}, ${c.b} ${c.op === '+' ? 'para adelante' : 'para atrás'}`, opacidad: 1 }, dur: 0.3 },
                ]);
                n.decir(c.op === '*'
                    ? `Multiplicar es sumar varias veces: ${c.b} saltos de ${modulo(c.a, m)}, arrancando en 0.`
                    : `Arrancamos en ${desde} y avanzamos ${c.b} ${c.op === '+' ? 'lugares' : 'lugares para atrás'}.`, 0);
                const dur = Math.min(0.5, 4 / Math.max(veces, 1)) * ritmo;
                n.animar({ pieza: 'reloj', a: { aristas, visibles: 0 }, dur: 0 });
                aristas.forEach((ar, i) => {
                    n.animar([
                        { pieza: 'reloj', a: { visibles: i + 1 }, dur, curva: 'lineal' },
                        { pieza: 'reloj', a: { resaltar: [ar[1], `${ar[0]}→${ar[1]}`] }, dur: 0, demora: dur },
                    ].map(({ demora = 0, ...it }) => ({ ...it, en: n.tiempo + demora })));
                    n.tiempo += dur;
                });
                n.esperar(0.3);
            }
            n.animar({ pieza: 'resultado', a: { texto: `${c.texto} ≡ ${r} (mód ${m})`, opacidad: 1, color: 'exito', peso: 800 }, dur: 0.4 });
            n.decir(c.op === null
                ? `${c.a} y ${r} están en la misma clase: dejan el mismo resto al dividir por ${m}.`
                : `Terminamos en ${r}: ${c.texto} ≡ ${r} (mód ${m}).${c.valor !== r ? ` En los enteros daría ${c.valor}, y ${c.valor} ≡ ${r} porque dejan el mismo resto.` : ''}`);
        });

        return {
            titulo: titulo || `Aritmética módulo ${m}`,
            descripcion: descripcion || `Cuentas módulo ${m} en un reloj de ${m} números: ${cuentas.join('; ')}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

/** "9 + 5" → { a: 9, op: '+', b: 5, valor: 14, texto: '9 + 5' }. */
export function analizarCuenta(cuenta) {
    const t = String(cuenta).trim().replace(/[·×]/g, '*').replace(/−/g, '-');
    let m = t.match(/^(-?\d+)\s*([+*-])\s*(\d+)$/);
    if (m) {
        const a = Number(m[1]);
        const b = Number(m[3]);
        const op = m[2];
        const valor = op === '+' ? a + b : op === '-' ? a - b : a * b;
        return { a, op, b, valor, texto: `${a} ${op === '*' ? '·' : op === '-' ? '−' : '+'} ${b}` };
    }
    m = t.match(/^(\d+)$/);
    if (m) return { a: Number(m[1]), op: null, b: 0, valor: Number(m[1]), texto: m[1] };
    throw new Error(`No entiendo la cuenta "${cuenta}": tiene que ser "a + b", "a - b", "a * b" o un número solo.`);
}


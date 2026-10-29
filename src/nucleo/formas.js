// Formas que se transforman unas en otras: un círculo que se vuelve estrella,
// una flecha que se vuelve tilde.
//
// Dos caminos de SVG no se pueden mezclar tal cual: uno tiene cuatro curvas y
// el otro diez rectas. Así que cada camino se pasa a una lista de puntos
// repartidos parejo a lo largo del borde (siempre la misma cantidad), y lo que
// se mezcla son los puntos: el primero con el primero, el segundo con el
// segundo. Es lo mismo que hace Manim con Transform.
//
// Todo es cuenta pura, sin navegador: el mismo camino y el mismo p dan siempre
// el mismo texto, así que la escena sigue dependiendo solo de t.

/** Cuántos puntos tiene cada borde mientras se transforma. */
const PUNTOS = 96;

/**
 * Lee un camino de SVG ("M 0 0 L 10 0 C ...") y lo pasa a una lista de bordes,
 * cada uno una lista de puntos. Entiende M L H V C S Q T Z, en mayúscula y en
 * minúscula. Los arcos (A) no: las figuras de acá los arman con curvas.
 * @param {string} d
 * @returns {{ puntos: number[][], cerrado: boolean }[]}
 */
export function leerCamino(d) {
    const fichas = String(d).match(/[a-df-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
    const bordes = [];
    /** @type {{ puntos: number[][], cerrado: boolean }} */
    let actual = null;
    let x = 0, y = 0, x0 = 0, y0 = 0;
    // El último punto de control, para S y T (que lo reflejan).
    let cx = 0, cy = 0, ultimo = '';
    let i = 0;
    let comando = '';
    const num = () => {
        const v = Number(fichas[i++]);
        if (!Number.isFinite(v)) throw new Error(`El camino "${String(d).slice(0, 40)}…" está mal escrito.`);
        return v;
    };
    const empezar = () => {
        actual = { puntos: [[x, y]], cerrado: false };
        bordes.push(actual);
    };
    const curva = (pts) => {
        // Una curva de Bézier se recorre en 16 tramos: alcanza para que el
        // muestreo parejo de después no note la diferencia.
        const [p0, ...resto] = pts;
        for (let k = 1; k <= 16; k++) {
            const t = k / 16;
            actual.puntos.push(bezier([p0, ...resto], t));
        }
    };
    while (i < fichas.length) {
        if (/[a-z]/i.test(fichas[i])) comando = fichas[i++];
        else if (!comando) throw new Error(`El camino "${String(d).slice(0, 40)}…" tiene que empezar con M.`);
        const rel = comando === comando.toLowerCase();
        const C = comando.toUpperCase();
        const bx = rel ? x : 0, by = rel ? y : 0;
        if (C === 'A') {
            throw new Error('Las formas que se transforman no entienden arcos (A): usá figuras.circulo() o pasá el arco a curvas (C).');
        }
        if (C === 'Z') {
            if (actual) actual.cerrado = true;
            x = x0; y = y0;
            ultimo = 'Z';
            // Una Z no lleva números: el que sigue tiene que traer su comando.
            comando = '';
            continue;
        }
        if (C === 'M') {
            x = bx + num(); y = by + num();
            x0 = x; y0 = y;
            empezar();
            // Los pares que siguen a una M son L.
            comando = rel ? 'l' : 'L';
            ultimo = 'M';
            continue;
        }
        if (!actual) empezar();
        if (C === 'L') { x = bx + num(); y = by + num(); actual.puntos.push([x, y]); }
        else if (C === 'H') { x = bx + num(); actual.puntos.push([x, y]); }
        else if (C === 'V') { y = by + num(); actual.puntos.push([x, y]); }
        else if (C === 'C' || C === 'S') {
            let c1;
            if (C === 'C') c1 = [bx + num(), by + num()];
            else c1 = /[CS]/.test(ultimo) ? [2 * x - cx, 2 * y - cy] : [x, y];
            const c2 = [bx + num(), by + num()];
            const fin = [bx + num(), by + num()];
            curva([[x, y], c1, c2, fin]);
            [cx, cy] = c2; [x, y] = fin;
        } else if (C === 'Q' || C === 'T') {
            let c1;
            if (C === 'Q') c1 = [bx + num(), by + num()];
            else c1 = /[QT]/.test(ultimo) ? [2 * x - cx, 2 * y - cy] : [x, y];
            const fin = [bx + num(), by + num()];
            curva([[x, y], c1, fin]);
            [cx, cy] = c1; [x, y] = fin;
        } else {
            throw new Error(`El camino tiene un comando "${comando}" que no conozco.`);
        }
        ultimo = C;
    }
    return bordes.filter((b) => b.puntos.length > 1);
}

function bezier(pts, t) {
    // De Casteljau: sirve igual para cuadráticas y cúbicas.
    let capa = pts;
    while (capa.length > 1) {
        const sig = [];
        for (let k = 0; k < capa.length - 1; k++) {
            sig.push([capa[k][0] + (capa[k + 1][0] - capa[k][0]) * t, capa[k][1] + (capa[k + 1][1] - capa[k][1]) * t]);
        }
        capa = sig;
    }
    return capa[0];
}

/**
 * Reparte n puntos parejo a lo largo de un borde.
 * @param {number[][]} puntos
 * @param {boolean} cerrado
 * @param {number} n
 */
export function repartir(puntos, cerrado, n = PUNTOS) {
    const pts = cerrado ? [...puntos, puntos[0]] : puntos;
    const acum = [0];
    for (let k = 1; k < pts.length; k++) {
        acum.push(acum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    }
    const largo = acum.at(-1);
    if (!(largo > 0)) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]]);
    const salida = [];
    let j = 1;
    // Cerrado, el último no repite al primero; abierto, sí llega a la punta.
    const pasos = cerrado ? n : n - 1;
    for (let k = 0; k < n; k++) {
        const objetivo = (k / pasos) * largo;
        while (j < acum.length - 1 && acum[j] < objetivo) j++;
        const tramo = acum[j] - acum[j - 1] || 1;
        const u = Math.min(Math.max((objetivo - acum[j - 1]) / tramo, 0), 1);
        salida.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]);
    }
    return salida;
}

// Para que la transformación no dé vueltas raras: el borde de llegada se gira
// (se elige otro punto de partida) y, si hace falta, se recorre al revés,
// hasta que quede lo más cerca posible del de salida.
function alinear(a, b) {
    const n = a.length;
    let mejor = b;
    let menor = Infinity;
    for (const sentido of [b, [...b].reverse()]) {
        for (let corr = 0; corr < n; corr += 2) {
            let suma = 0;
            for (let k = 0; k < n; k++) {
                const q = sentido[(k + corr) % n];
                suma += (a[k][0] - q[0]) ** 2 + (a[k][1] - q[1]) ** 2;
            }
            if (suma < menor) {
                menor = suma;
                mejor = sentido.slice(corr).concat(sentido.slice(0, corr));
            }
        }
    }
    return mejor;
}

function centro(puntos) {
    let sx = 0, sy = 0;
    for (const [x, y] of puntos) { sx += x; sy += y; }
    return [sx / puntos.length, sy / puntos.length];
}

// Los caminos ya leídos y repartidos, por texto: en cada cuadro se pide el
// mismo par, y leerlo de nuevo cada vez sería tirar el tiempo.
const preparados = new Map();

function preparar(d) {
    let listo = preparados.get(d);
    if (!listo) {
        listo = leerCamino(d).map((b) => ({ puntos: repartir(b.puntos, b.cerrado), cerrado: b.cerrado }));
        if (preparados.size > 400) preparados.clear();
        preparados.set(d, listo);
    }
    return listo;
}

const pares = new Map();

/**
 * El camino a mitad de transformarse de `desde` a `hasta`. En p = 0 y p = 1
 * devuelve los caminos tal cual, con sus curvas; en el medio, un polígono de
 * muchos puntos (que a ojo es la misma curva).
 * @param {string} desde
 * @param {string} hasta
 * @param {number} p puede pasarse de 0..1 (con un resorte, por ejemplo)
 */
export function mezclarFormas(desde, hasta, p) {
    if (p === 0 || !hasta) return desde;
    if (p === 1 || !desde) return hasta;
    const clave = `${desde}\u0000${hasta}`;
    let par = pares.get(clave);
    if (!par) {
        const a = preparar(desde);
        const b = preparar(hasta);
        // Si uno tiene más bordes que el otro (una "i" con su punto), los que
        // sobran nacen (o se apagan) en un punto: el centro del más cercano.
        const n = Math.max(a.length, b.length);
        par = [];
        for (let k = 0; k < n; k++) {
            const ba = a[k] ?? encoger(b[k], a.at(-1));
            const bb = b[k] ?? encoger(a[k], b.at(-1));
            const cerrado = ba.cerrado || bb.cerrado;
            par.push({ a: ba.puntos, b: cerrado ? alinear(ba.puntos, bb.puntos) : bb.puntos, cerrado });
        }
        if (pares.size > 400) pares.clear();
        pares.set(clave, par);
    }
    return par.map(({ a, b, cerrado }) => {
        let texto = '';
        for (let k = 0; k < a.length; k++) {
            const x = a[k][0] + (b[k][0] - a[k][0]) * p;
            const y = a[k][1] + (b[k][1] - a[k][1]) * p;
            texto += `${k === 0 ? 'M' : 'L'}${r(x)} ${r(y)}`;
        }
        return cerrado ? `${texto}Z` : texto;
    }).join('');
}

function encoger(borde, cerca) {
    const [x, y] = centro((cerca ?? borde).puntos);
    return { puntos: borde.puntos.map(() => [x, y]), cerrado: borde.cerrado };
}

function r(n) {
    return Math.round(n * 100) / 100;
}

// ---------------- Figuras ----------------
// Todas centradas en (0, 0) y armadas solo con rectas y curvas, para que se
// puedan transformar entre sí (y con cualquier camino que se escriba a mano).

const K = 0.5523; // las curvas de un cuarto de círculo

const n2 = (v) => r(v);

export const figuras = {
    /** @param {number} radio */
    circulo(radio = 60) {
        return figuras.elipse(radio * 2, radio * 2);
    },
    elipse(ancho = 160, alto = 100) {
        const a = ancho / 2, b = alto / 2, ka = a * K, kb = b * K;
        return `M${n2(a)} 0C${n2(a)} ${n2(kb)} ${n2(ka)} ${n2(b)} 0 ${n2(b)}C${n2(-ka)} ${n2(b)} ${n2(-a)} ${n2(kb)} ${n2(-a)} 0` +
            `C${n2(-a)} ${n2(-kb)} ${n2(-ka)} ${n2(-b)} 0 ${n2(-b)}C${n2(ka)} ${n2(-b)} ${n2(a)} ${n2(-kb)} ${n2(a)} 0Z`;
    },
    rectangulo(ancho = 160, alto = 100, radio = 0) {
        const a = ancho / 2, b = alto / 2, q = Math.min(radio, a, b);
        if (q <= 0) return `M${n2(-a)} ${n2(-b)}H${n2(a)}V${n2(b)}H${n2(-a)}Z`;
        const k = q * (1 - K);
        return `M${n2(-a + q)} ${n2(-b)}H${n2(a - q)}C${n2(a - k)} ${n2(-b)} ${n2(a)} ${n2(-b + k)} ${n2(a)} ${n2(-b + q)}` +
            `V${n2(b - q)}C${n2(a)} ${n2(b - k)} ${n2(a - k)} ${n2(b)} ${n2(a - q)} ${n2(b)}H${n2(-a + q)}` +
            `C${n2(-a + k)} ${n2(b)} ${n2(-a)} ${n2(b - k)} ${n2(-a)} ${n2(b - q)}V${n2(-b + q)}` +
            `C${n2(-a)} ${n2(-b + k)} ${n2(-a + k)} ${n2(-b)} ${n2(-a + q)} ${n2(-b)}Z`;
    },
    /** Un polígono regular: 3 es un triángulo, 6 un hexágono. */
    poligono(lados = 6, radio = 60, giro = -90) {
        const pts = [];
        for (let k = 0; k < lados; k++) {
            const a = ((giro + (360 * k) / lados) * Math.PI) / 180;
            pts.push(`${n2(radio * Math.cos(a))} ${n2(radio * Math.sin(a))}`);
        }
        return `M${pts.join('L')}Z`;
    },
    estrella(puntas = 5, radio = 70, adentro = 0.45) {
        const pts = [];
        for (let k = 0; k < puntas * 2; k++) {
            const rr = k % 2 ? radio * adentro : radio;
            const a = ((-90 + (180 * k) / puntas) * Math.PI) / 180;
            pts.push(`${n2(rr * Math.cos(a))} ${n2(rr * Math.sin(a))}`);
        }
        return `M${pts.join('L')}Z`;
    },
    corazon(tamano = 120) {
        const s = tamano / 120;
        const p = (x, y) => `${n2(x * s)} ${n2(y * s)}`;
        return `M${p(0, 45)}C${p(-20, 30)} ${p(-60, 5)} ${p(-60, -18)}C${p(-60, -40)} ${p(-42, -52)} ${p(-28, -52)}` +
            `C${p(-14, -52)} ${p(-4, -44)} ${p(0, -34)}C${p(4, -44)} ${p(14, -52)} ${p(28, -52)}` +
            `C${p(42, -52)} ${p(60, -40)} ${p(60, -18)}C${p(60, 5)} ${p(20, 30)} ${p(0, 45)}Z`;
    },
    /** Una flecha gruesa que apunta a la derecha. */
    flecha(largo = 160, grosor = 40) {
        const a = largo / 2, g = grosor / 2, punta = Math.min(grosor * 1.2, largo / 2);
        return `M${n2(-a)} ${n2(-g)}H${n2(a - punta)}V${n2(-g * 2)}L${n2(a)} 0L${n2(a - punta)} ${n2(g * 2)}V${n2(g)}H${n2(-a)}Z`;
    },
    /** Una tilde de "bien": es abierta, se dibuja con borde. */
    tilde(tamano = 100) {
        const s = tamano / 100;
        return `M${n2(-40 * s)} ${n2(2 * s)}L${n2(-12 * s)} ${n2(30 * s)}L${n2(42 * s)} ${n2(-28 * s)}`;
    },
    /** Una cruz de "mal", abierta como la tilde (dos trazos). */
    cruz(tamano = 100) {
        const a = tamano * 0.35;
        return `M${n2(-a)} ${n2(-a)}L${n2(a)} ${n2(a)}M${n2(a)} ${n2(-a)}L${n2(-a)} ${n2(a)}`;
    },
    /** Una línea recta, de (x1, y1) a (x2, y2). */
    linea(x1 = -80, y1 = 0, x2 = 80, y2 = 0) {
        return `M${n2(x1)} ${n2(y1)}L${n2(x2)} ${n2(y2)}`;
    },
};

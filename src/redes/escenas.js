import { texto } from '../piezas/texto.js';
import { caja } from '../piezas/caja.js';
import { flecha } from '../piezas/flecha.js';
import { crearNarrador } from '../pedagogico/narrar.js';
import { plano, grafica, punto } from '../mate/plano.js';
import { secuencia, direccionIp, ventanaDeslizante } from './piezas.js';
import { analizarIp, simularArq, simularCongestion } from './calculo.js';

// Escenas de redes que se arman solas: un intercambio de mensajes (el saludo
// de TCP, un pedido HTTP, una consulta DNS), un protocolo de ventana con
// pérdidas, la ventana de congestión de TCP y una subred.

function lienzo(disposicion, titulo) {
    const angosta = disposicion.nombre === 'angosta';
    const W = angosta ? 640 : 1600;
    const H = angosta ? 1140 : 900;
    const arriba = titulo ? (angosta ? 96 : 100) : 24;
    return { angosta, W, H, arriba };
}

function piezaTitulo(titulo, W, angosta) {
    return texto({ x: W / 2, y: angosta ? 48 : 50, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
}

// ======================= Un intercambio de mensajes =======================

/**
 * Un intercambio de mensajes entre dos o más extremos, contado mensaje por
 * mensaje. Sirve para el saludo de tres vías, un pedido HTTP, una consulta
 * DNS iterativa, una sesión SMTP.
 *
 * Cada mensaje sale cuando llegó el anterior (salvo `junto: true`, que sale
 * casi a la vez), tarda `viaje` (1, si no se dice) y, al llegar, se dice su
 * `explicacion`. Con `estado` se escribe al costado del que lo manda o lo
 * recibe en qué estado queda (SYN-SENT, ESTABLISHED).
 *
 * @param {{
 *     extremos: (string | { texto: string, icono?: string })[],
 *     mensajes: { de: number | string, a: number | string, texto: string, explicacion?: string, junto?: boolean, viaje?: number,
 *                 perdido?: number, color?: string, capitulo?: string, estados?: { extremo: number | string, texto: string, al?: 'salir' | 'llegar', color?: string }[] }[],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `preguntas` se indexa por número de mensaje: la pregunta se hace antes de mandarlo.
 */
export function desdeIntercambio(opciones) {
    const { extremos, titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const nombres = extremos.map((e) => (typeof e === 'object' ? e.texto : e));
    const indice = (x) => {
        const i = typeof x === 'number' ? x : nombres.indexOf(x);
        if (!(i >= 0 && i < nombres.length)) throw new Error(`"${x}" no es ninguno de los extremos: ${nombres.join(', ')}.`);
        return i;
    };

    // Los tiempos del diagrama.
    const mensajes = [];
    const notas = [];
    let anterior = null;
    for (const m of opciones.mensajes) {
        const sale = anterior ? (m.junto ? anterior.sale + 0.2 : anterior.llega + 0.15) : 0;
        const llega = sale + (m.viaje ?? 1);
        const msg = { ...m, de: indice(m.de), a: indice(m.a), sale, llega };
        mensajes.push(msg);
        for (const e of m.estados ?? []) {
            notas.push({ extremo: indice(e.extremo), t: e.al === 'salir' ? sale : llega, texto: e.texto, color: e.color ?? 'acento2' });
        }
        anterior = msg;
    }
    const duracion = Math.max(...mensajes.map((m) => m.llega)) + 0.3;

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        const alto = H - arriba - (angosta ? 30 : 30);
        piezas.diagrama = secuencia({
            x: W / 2, y: arriba + alto / 2, ancho: angosta ? 620 : Math.min(1500, 520 + 300 * nombres.length), alto,
            extremos, notas, duracion, tamano: angosta ? 17 : 23,
            mensajes: mensajes.map(({ de, a, sale, llega, texto: t, perdido, color }) => ({ de, a, sale, llega, texto: t, perdido, color })),
        });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const segundosPorViaje = 1.3 * ritmo;
        mensajes.forEach((m, i) => {
            if (m.capitulo) n.capitulo(m.capitulo);
            else if (i === 0) n.capitulo(m.texto);
            n.preguntar(i);
            const desde = i === 0 ? 0 : mensajes[i - 1].llega;
            // Los que salen juntos se ven viajar juntos: se avanza hasta que llega el último del grupo.
            if (mensajes[i + 1]?.junto) return;
            const hasta = m.llega;
            n.animar([
                { pieza: 'diagrama', a: { resaltar: i }, dur: 0 },
                { pieza: 'diagrama', a: { tiempo: hasta }, dur: (hasta - desde) * segundosPorViaje, curva: 'lineal' },
            ]);
            n.tiempo += (hasta - desde) * segundosPorViaje;
            const grupo = [m];
            for (let k = i - 1; k >= 0 && mensajes[k + 1].junto; k--) grupo.unshift(mensajes[k]);
            const explicacion = grupo.map((x) => x.explicacion).filter(Boolean).join(' ');
            if (explicacion) n.decir(explicacion, 0.3);
            else n.esperar(0.4);
        });
        n.animar({ pieza: 'diagrama', a: { resaltar: -1, tiempo: duracion }, dur: 0.4 });

        return {
            titulo: titulo || 'Un intercambio de mensajes',
            descripcion: descripcion || `${nombres.join(' y ')} intercambian ${mensajes.length} mensajes: ${mensajes.map((m) => m.texto).join(', ')}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Protocolos de ventana =======================

const NOMBRES_ARQ = { 'stop-and-wait': 'Stop-and-wait', 'go-back-n': 'Go-Back-N', 'selective-repeat': 'Selective Repeat' };

/**
 * Un protocolo de ventana con pérdidas: stop-and-wait, Go-Back-N o Selective
 * Repeat. Arriba, la ventana del emisor; abajo, el diagrama con cada paquete
 * y cada ACK. Se frena a explicar cuando algo se pierde y cuando vence un timer.
 *
 * @param {{
 *     protocolo: 'stop-and-wait' | 'go-back-n' | 'selective-repeat', paquetes: number, ventana?: number,
 *     perdidos?: number[], acksPerdidos?: number[],
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `preguntas` acepta 'timeout' (antes del primer timeout) y 'final'.
 */
export function desdeVentana(opciones) {
    const { protocolo, paquetes, titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const sim = simularArq({ envio: 0.45, timeout: 3, ...opciones });
    const N = sim.ventana;
    const individual = protocolo === 'selective-repeat';

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        const lado = angosta ? Math.min(52, 560 / paquetes) : Math.min(72, 900 / paquetes);
        const yVentana = arriba + lado / 2 + 10;
        piezas.ventana = ventanaDeslizante({
            x: W / 2 + (angosta ? 40 : 60), y: yVentana, cantidad: paquetes, ventana: N, base: 0, siguiente: 0, lado, tamano: lado * 0.42,
            rotulo: 'Emisor',
        });
        const altoDiagrama = H - (yVentana + lado / 2 + 30) - 20;
        piezas.diagrama = secuencia({
            x: W / 2, y: yVentana + lado / 2 + 30 + altoDiagrama / 2, ancho: angosta ? 620 : 1300, alto: altoDiagrama,
            extremos: ['Emisor', 'Receptor'], duracion: sim.fin + 0.2, tamano: angosta ? 15 : 20, regla: !angosta, rotulos: 'origen',
            mensajes: sim.mensajes.map((m) => ({
                de: m.tipo === 'datos' ? 0 : 1,
                a: m.tipo === 'datos' ? 1 : 0,
                sale: m.sale,
                llega: m.llega,
                perdido: m.perdido ? 0.55 : 0,
                texto: m.tipo === 'datos' ? `${m.retransmision ? '↻ ' : ''}Paq ${m.numero}` : `ACK ${m.numero}`,
                color: m.tipo === 'ack' ? (m.duplicado ? 'alerta' : 'exito') : m.retransmision ? 'acento2' : 'acento',
                punteada: m.tipo === 'ack' && m.duplicado,
            })),
            notas: sim.hechos.filter((h) => h.tipo === 'timeout').map((h) => ({ extremo: 0, t: h.t, texto: '⏰ timeout', color: 'error' })),
        });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const v = 1.5 * ritmo; // segundos de escena por unidad de tiempo del diagrama

        // Las paradas: los momentos en que conviene frenar a explicar.
        /** @type {{ t: number, texto: string, timeout?: boolean }[]} */
        const paradas = [];
        const perdidos = sim.mensajes.filter((m) => m.perdido);
        for (const m of perdidos) {
            paradas.push({
                t: m.sale + 0.55,
                texto: m.tipo === 'datos'
                    ? `El paquete ${m.numero} se pierde en el camino: nunca llega al receptor.`
                    : `El ACK ${m.numero} se pierde: el receptor sí recibió el paquete, pero el emisor no se entera.`,
            });
        }
        const primerDescarte = sim.hechos.find((h) => h.tipo === 'descarte');
        if (primerDescarte && protocolo === 'go-back-n') {
            paradas.push({ t: primerDescarte.t, texto: `Llega el ${primerDescarte.numero}, pero el receptor esperaba otro: en Go-Back-N lo descarta y repite el último ACK que mandó (en amarillo).` });
        }
        if (individual) {
            const fueraDeOrden = sim.mensajes.find((m) => m.tipo === 'ack' && perdidos.some((p) => p.tipo === 'datos' && p.numero < m.numero && m.sale < p.sale + 3));
            if (fueraDeOrden) paradas.push({ t: fueraDeOrden.sale, texto: `En Selective Repeat el receptor guarda los que llegan fuera de orden y confirma cada uno por separado.` });
        }
        sim.hechos.filter((h) => h.tipo === 'timeout').forEach((h, i) => {
            paradas.push({ t: h.t, texto: h.texto, timeout: i === 0 });
        });
        paradas.sort((a, b) => a.t - b.t);

        // Para ubicar en la escena lo que pasa en el diagrama (los cambios de la ventana), se guardan los tramos.
        const tramos = [];
        let d = 0;
        const avanzarHasta = (hasta) => {
            if (hasta <= d) return;
            tramos.push({ d0: d, d1: hasta, s0: n.tiempo });
            n.animar({ pieza: 'diagrama', a: { tiempo: hasta }, dur: (hasta - d) * v, curva: 'lineal' });
            n.tiempo += (hasta - d) * v;
            d = hasta;
        };
        const enEscena = (t) => {
            const tramo = tramos.find((x) => t >= x.d0 && t <= x.d1 + 1e-9);
            return tramo ? tramo.s0 + (t - tramo.d0) * v : n.tiempo;
        };

        n.capitulo(NOMBRES_ARQ[protocolo]);
        n.decir(protocolo === 'stop-and-wait'
            ? 'En stop-and-wait el emisor manda un paquete y espera su ACK antes de mandar el siguiente. Si el ACK no llega a tiempo, lo reenvía.'
            : `En ${NOMBRES_ARQ[protocolo]} el emisor puede tener hasta ${N} paquetes en viaje sin confirmar: es su ventana, el recuadro de arriba.`);
        for (const parada of paradas) {
            if (parada.timeout) n.preguntar('timeout');
            avanzarHasta(parada.t);
            if (parada.timeout) n.capitulo(`Timeout en t = ${redondeo(parada.t)}`);
            n.decir(parada.texto, 0.3);
        }
        avanzarHasta(sim.fin + 0.2);

        // La ventana: se actualiza en el instante de la escena en que pasa cada cosa.
        const confirmados = new Set();
        for (const h of sim.hechos) {
            if (h.tipo === 'ack' && individual) confirmados.add(h.numero);
            if (h.base === undefined) continue;
            n.linea.push({ pieza: 'ventana', a: { base: h.base, siguiente: h.siguiente, confirmados: [...confirmados] }, dur: 0.35, en: enEscena(h.t) });
        }
        n.linea.sort((a, b) => (a.en ?? 0) - (b.en ?? 0));

        n.preguntar('final');
        n.capitulo('Resumen');
        n.decir(`Llegaron los ${paquetes} paquetes. Hubo ${sim.retransmisiones} ${sim.retransmisiones === 1 ? 'retransmisión' : 'retransmisiones'}${protocolo === 'go-back-n' && sim.retransmisiones > perdidos.length ? ': Go-Back-N reenvía también los que habían llegado bien después del perdido' : ''}.`);

        return {
            titulo: titulo || NOMBRES_ARQ[protocolo],
            descripcion: descripcion || `${NOMBRES_ARQ[protocolo]} con ${paquetes} paquetes${N > 1 ? ` y ventana ${N}` : ''}. ${perdidos.length ? `Se pierde${perdidos.length > 1 ? 'n' : ''} ${perdidos.map((m) => (m.tipo === 'ack' ? `el ACK ${m.numero}` : `el paquete ${m.numero}`)).join(' y ')}.` : ''}`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

function redondeo(t) {
    return String(Math.round(t * 10) / 10).replace('.', ',');
}

// ======================= Control de congestión =======================

/**
 * La ventana de congestión de TCP, ronda por ronda: slow start,
 * congestion avoidance, y qué pasa con un timeout o con tres ACK duplicados.
 *
 * @param {{
 *     rondas: number, umbral?: number, eventos?: Record<number, 'timeout' | '3dup'>, variante?: 'tahoe' | 'reno',
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `preguntas` se indexa por número de ronda: la pregunta se hace antes de dibujarla.
 */
export function desdeCongestion(opciones) {
    const { titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {}, variante = 'reno' } = opciones;
    const rondas = simularCongestion(opciones);
    const maximo = Math.max(...rondas.map((r) => Math.max(r.cwnd, r.umbral)));

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const pl = angosta ? { x: 320, y: arriba + 300, ancho: 600, alto: 560 } : { x: 560, y: arriba + 375, ancho: 1020, alto: 720 };
        const pan = angosta ? { x: 24, y: arriba + 630, tamano: 24 } : { x: 1110, y: arriba + 140, tamano: 30 };
        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        piezas.plano = plano({
            ...pl, xmin: 0, xmax: rondas.length + 1, ymin: 0, ymax: Math.ceil(maximo * 1.15) + 1,
            etiquetaX: 'ronda (RTT)', etiquetaY: 'cwnd (segmentos)', tamano: angosta ? 15 : 19, decimales: 0,
        });
        // El umbral, como escalones.
        const escalones = [];
        rondas.forEach((r, i) => {
            if (i > 0 && rondas[i - 1].umbral !== r.umbral) escalones.push([r.ronda - 0.5, rondas[i - 1].umbral], [r.ronda - 0.5, r.umbral]);
            escalones.push([r.ronda, r.umbral]);
        });
        piezas.umbral = grafica({ plano: 'plano', datos: [[0.5, rondas[0].umbral], ...escalones, [rondas.length + 0.5, rondas.at(-1).umbral]], color: 'alerta', punteada: true, grosor: 3, trazo: 0, etiqueta: 'umbral' });
        piezas.cwnd = grafica({ plano: 'plano', datos: [[1, rondas[0].cwnd]], color: 'acento', grosor: 4.5, trazo: 1 });
        piezas.marca = punto({ plano: 'plano', mx: 1, my: rondas[0].cwnd, color: 'acento', radio: 9, opacidad: 0 });
        const nombres = ['ronda', 'ventana', 'umbralTexto', 'fase'];
        nombres.forEach((nombre, i) => {
            piezas[nombre] = texto({ x: pan.x, y: pan.y + i * pan.tamano * 1.9, texto: '', tamano: pan.tamano, alineacion: 'inicio', opacidad: 0, anchoMax: angosta ? 600 : 470 });
        });
        piezas.fase.props.peso = 700;

        const n = crearNarrador({ ritmo, lectura, preguntas });
        const datos = [];
        const panel = (r, extra = {}) => [
            { pieza: 'ronda', a: { texto: `Ronda ${r.ronda}`, opacidad: 1 }, dur: 0 },
            { pieza: 'ventana', a: { texto: `cwnd = ${r.cwnd}`, opacidad: 1 }, dur: 0 },
            { pieza: 'umbralTexto', a: { texto: `umbral = ${r.umbral}`, opacidad: 1 }, dur: 0 },
            { pieza: 'fase', a: { texto: extra.fase ?? r.fase, color: r.fase === 'slow start' ? 'acento' : 'exito', opacidad: 1 }, dur: 0 },
        ];

        n.capitulo('Slow start');
        n.animar({ pieza: 'umbral', a: { trazo: 1 }, dur: 1 });
        n.decir(`TCP no sabe cuánto aguanta la red, así que arranca con una ventana de ${rondas[0].cwnd} y la va agrandando. La línea punteada es el umbral: ${rondas[0].umbral}.`);

        let faseAnterior = rondas[0].fase;
        rondas.forEach((r, i) => {
            n.preguntar(r.ronda);
            datos.push([r.ronda, r.cwnd]);
            n.animar([
                { pieza: 'cwnd', a: { datos: datos.map((x) => [...x]) }, dur: 0 },
                { pieza: 'marca', a: { mx: r.ronda, my: r.cwnd, opacidad: 1, color: r.fase === 'slow start' ? 'acento' : 'exito' }, dur: 0.35 * ritmo },
                ...panel(r),
            ]);
            if (i === 0) {
                n.decir('En slow start, por cada ACK la ventana crece un segmento: en cada ronda se duplica.', 0.2);
            } else if (r.fase !== faseAnterior && r.fase === 'congestion avoidance') {
                n.capitulo('Congestion avoidance');
                n.decir(`La ventana llegó al umbral (${r.umbral}): de acá en más crece de a un segmento por ronda. Es congestion avoidance.`, 0.2);
            } else if (r.fase !== faseAnterior && r.fase === 'slow start') {
                n.decir('Como volvió a 1, arranca otra vez en slow start, duplicando hasta el umbral nuevo.', 0.2);
            } else {
                n.esperar(0.55);
            }
            faseAnterior = r.fase;
            if (r.evento) {
                const siguiente = rondas[i + 1];
                n.capitulo(r.evento === 'timeout' ? `Timeout en la ronda ${r.ronda}` : `Tres ACK duplicados en la ronda ${r.ronda}`);
                n.animar({ pieza: 'marca', a: { color: 'error' }, dur: 0.3 });
                const nuevoUmbral = siguiente ? siguiente.umbral : Math.max(Math.floor(r.cwnd / 2), 2);
                const nuevaVentana = siguiente ? siguiente.cwnd : 1;
                n.decir(r.evento === 'timeout'
                    ? `Vence un timer: algo se perdió y no llegan ACK. Es la señal más grave. El umbral pasa a la mitad de la ventana (${nuevoUmbral}) y la ventana vuelve a ${nuevaVentana}.`
                    : variante === 'reno'
                        ? `Llegan tres ACK duplicados: se perdió un segmento, pero los siguientes llegan. Es una congestión leve. El umbral pasa a la mitad (${nuevoUmbral}) y, en Reno, la ventana sigue desde ahí: ${nuevaVentana}.`
                        : `Llegan tres ACK duplicados. En Tahoe se trata igual que un timeout: el umbral pasa a la mitad (${nuevoUmbral}) y la ventana vuelve a 1.`);
            }
        });

        n.capitulo('El serrucho');
        n.decir('Así se ve TCP en una conexión larga: sube hasta que algo se pierde, baja, y vuelve a subir. Va tanteando cuánto aguanta la red.');

        return {
            titulo: titulo || 'Control de congestión de TCP',
            descripcion: descripcion || `La ventana de congestión de TCP ${variante === 'reno' ? 'Reno' : 'Tahoe'} durante ${rondas.length} rondas: ${rondas.map((r) => r.cwnd).join(', ')}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Subredes =======================

/**
 * Una dirección con su prefijo, desarmada: la dirección en bits, la máscara,
 * la dirección de red (IP AND máscara), la de broadcast, y cuántos hosts entran.
 *
 * @param {{ direccion: string, titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any> }} opciones
 *     `direccion` es como '192.168.10.77/26'. `preguntas` acepta 'red' y 'hosts'.
 */
export function desdeSubred(opciones) {
    const { titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {} } = opciones;
    const ip = analizarIp(opciones.direccion);

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
        const fila = angosta
            ? { x: 320, ancho: 600, tamano: 24, alto: 108, y0: arriba + 70 }
            : { x: 800, ancho: 1400, tamano: 34, alto: 110, y0: arriba + 90 };
        const filas = [
            ['ip', 'IP', ip.direccion, ip.bits.direccion],
            ['mascara', `Máscara /${ip.prefijo}`, ip.mascara, ip.bits.mascara],
            ['red', 'Red', ip.red, ip.bits.red],
            ['broadcast', 'Broadcast', ip.broadcast, ip.bits.broadcast],
        ];
        filas.forEach(([id, rotulo, decimal, bits], i) => {
            piezas[id] = direccionIp({
                x: fila.x, y: fila.y0 + i * fila.alto, ancho: fila.ancho, tamano: fila.tamano, rotulo, decimal, bits,
                prefijo: ip.prefijo, verBits: 0, verMascara: 0, opacidad: 0,
            });
        });
        const yPanel = fila.y0 + 4 * fila.alto + (angosta ? 30 : 20);
        ['hosts', 'rango', 'clase'].forEach((id, i) => {
            piezas[id] = texto({
                x: angosta ? 24 : 200, y: yPanel + i * (angosta ? 60 : 56), texto: '', tamano: angosta ? 23 : 32,
                alineacion: 'inicio', anchoMax: angosta ? 600 : 1300, opacidad: 0,
            });
        });

        const n = crearNarrador({ ritmo, lectura, preguntas });
        n.capitulo(`${ip.direccion}/${ip.prefijo}`);
        n.animar({ pieza: 'ip', a: { opacidad: 1 }, dur: 0.4 });
        n.decir(`La dirección ${ip.direccion}/${ip.prefijo}. Son cuatro números de 0 a 255, uno por octeto.`);
        n.animar({ pieza: 'ip', a: { verBits: 1 }, dur: 0.8 });
        n.decir('Cada octeto son 8 bits: en total, 32. Las cuentas de subredes se hacen con los bits, no con los números.');

        n.capitulo('La máscara');
        n.animar({ pieza: 'mascara', a: { opacidad: 1, verBits: 1 }, dur: 0.6 });
        n.decir(`El /${ip.prefijo} dice cuántos bits, desde la izquierda, son de la red: ${ip.prefijo} unos y ${ip.bitsHost} ceros. En decimal, ${ip.mascara}.`);
        n.animar({ pieza: ['ip', 'mascara'], a: { verMascara: 1 }, dur: 0.6 });
        n.decir(`En azul, los ${ip.prefijo} bits de red: son iguales para toda la subred. En naranja, los ${ip.bitsHost} bits de host: cambian de una máquina a otra.`);

        n.preguntar('red');
        n.capitulo('La dirección de red');
        n.animar({ pieza: 'red', a: { opacidad: 1, verBits: 1, verMascara: 1, resaltado: 1 }, dur: 0.6 });
        n.decir(`La dirección de red es la IP con todos los bits de host en 0: un AND bit a bit con la máscara. Da ${ip.red}.`);
        n.animar({ pieza: 'red', a: { resaltado: 0 }, dur: 0.3 });

        n.capitulo('Broadcast');
        n.animar({ pieza: 'broadcast', a: { opacidad: 1, verBits: 1, verMascara: 1, resaltado: 1 }, dur: 0.6 });
        n.decir(`Y la de broadcast, con todos los bits de host en 1: ${ip.broadcast}. Un mensaje a esa dirección le llega a todas las máquinas de la subred.`);
        n.animar({ pieza: 'broadcast', a: { resaltado: 0 }, dur: 0.3 });

        n.preguntar('hosts');
        n.capitulo('¿Cuántos hosts?');
        n.animar([
            { pieza: 'hosts', a: { texto: `Hosts: 2^${ip.bitsHost} − 2 = ${ip.hosts}`, opacidad: 1, peso: 700 }, dur: 0.4 },
            { pieza: 'rango', a: { texto: `Rango: de ${ip.primero} a ${ip.ultimo}`, opacidad: 1 }, dur: 0.4 },
            { pieza: 'clase', a: { texto: `Clase ${ip.clase}${ip.privada ? ', privada' : ', pública'}${ip.esRed ? ' · es la dirección de red' : ip.esBroadcast ? ' · es la de broadcast' : ''}`, opacidad: 1, color: 'suave' }, dur: 0.4 },
        ]);
        n.decir(`Con ${ip.bitsHost} bits de host hay 2^${ip.bitsHost} = ${2 ** ip.bitsHost} combinaciones, pero dos no se pueden usar: la de red y la de broadcast. Quedan ${ip.hosts} hosts, de ${ip.primero} a ${ip.ultimo}.`);

        return {
            titulo: titulo || `La subred de ${ip.direccion}/${ip.prefijo}`,
            descripcion: descripcion || `${ip.direccion}/${ip.prefijo}: máscara ${ip.mascara}, red ${ip.red}, broadcast ${ip.broadcast}, ${ip.hosts} hosts de ${ip.primero} a ${ip.ultimo}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

// ======================= Un pedido y su respuesta =======================

const RAZONES = {
    200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
    409: 'Conflict', 422: 'Unprocessable Entity', 500: 'Internal Server Error',
};

/** El color de una respuesta, por su familia: 2xx bien, 3xx a otro lado, 4xx y 5xx error. */
export function colorDeCodigo(codigo) {
    return codigo < 300 ? 'exito' : codigo < 400 ? 'alerta' : 'error';
}

/** Un cuerpo (objeto, lista o texto) como se ve en el cable: JSON con sangría. */
function cuerpoComoTexto(cuerpo) {
    if (cuerpo == null || cuerpo === '') return '';
    return typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo, null, 2);
}

function encabezadosComoTexto(encabezados, cuerpo) {
    const lista = encabezados ?? (cuerpo != null ? { 'Content-Type': 'application/json' } : {});
    return Object.entries(lista).map(([k, v]) => `${k}: ${v}`);
}

/** Lo que viaja en un pedido, como texto: la primera línea, los encabezados y el cuerpo. */
export function textoDelPedido(p) {
    const cuerpo = cuerpoComoTexto(p.cuerpo);
    return [`${(p.metodo ?? 'GET').toUpperCase()} ${p.url}`, ...encabezadosComoTexto(p.encabezados, p.cuerpo), ...(cuerpo ? ['', cuerpo] : [])].join('\n');
}

/** Lo que viaja en una respuesta, como texto: el código, los encabezados y el cuerpo. */
export function textoDeLaRespuesta(r) {
    const cuerpo = cuerpoComoTexto(r.cuerpo);
    const estado = `${r.codigo} ${r.razon ?? RAZONES[r.codigo] ?? ''}`.trim();
    return [estado, ...encabezadosComoTexto(r.encabezados, r.cuerpo), ...(cuerpo ? ['', cuerpo] : [])].join('\n');
}

/**
 * Un pedido HTTP y su respuesta, con lo que viaja adentro: el navegador (o un
 * fetch) arma el pedido —método, URL, encabezados, cuerpo—, el pedido viaja,
 * el servidor lo atiende (con la ruta de Flask que le toca, si se da) y la
 * respuesta vuelve con su código y su JSON. Al final, lo que el navegador hace
 * con ella.
 *
 * Pensada para Flask y para fetch/APIs: varios pedidos seguidos cuentan una
 * API entera (listar, crear, pedir uno que no existe).
 *
 * @param {{
 *     pedidos: {
 *         metodo?: string, url: string, encabezados?: Record<string, string>, cuerpo?: any,
 *         ruta?: string,
 *         respuesta: { codigo: number, razon?: string, encabezados?: Record<string, string>, cuerpo?: any },
 *         resultado?: string, explicacion?: string, explicacionRespuesta?: string, capitulo?: string,
 *     }[],
 *     cliente?: string, servidor?: string,
 *     titulo?: string, descripcion?: string, ritmo?: number, lectura?: number, preguntas?: Record<string, any>,
 * }} opciones
 *     `ruta`: el código del servidor que atiende ese pedido (se muestra en el
 *     servidor mientras lo atiende). `resultado`: lo que muestra el navegador
 *     después. `preguntas` va por número de pedido: se pregunta antes de que
 *     vuelva la respuesta ("¿qué código va a devolver?").
 */
export function desdePedidoHttp(opciones) {
    const {
        pedidos, cliente = '🌐 Navegador', servidor = '🖥️ Servidor (Flask)',
        titulo = '', descripcion = '', ritmo = 1, lectura = 13, preguntas = {},
    } = opciones;
    if (!Array.isArray(pedidos) || !pedidos.length) throw new Error('Hace falta al menos un pedido: pedidos: [{ metodo, url, respuesta: { codigo } }].');
    for (const p of pedidos) {
        if (!p.url) throw new Error('Cada pedido necesita su url, por ejemplo "/api/alumnos".');
        if (!(p.respuesta?.codigo >= 100)) throw new Error(`El pedido a ${p.url} necesita su respuesta: respuesta: { codigo: 200, cuerpo: {...} }.`);
    }

    return function (disposicion) {
        const { angosta, W, H, arriba } = lienzo(disposicion, titulo);
        const piezas = {};
        if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);

        // Los dos extremos: a los costados en ancho, arriba y abajo en angosto.
        const ext = angosta
            ? { ancho: 600, alto: 250, cli: { x: W / 2, y: arriba + 135 }, srv: { x: W / 2, y: H - 165 } }
            : { ancho: 380, alto: 560, cli: { x: 230, y: arriba + 330 }, srv: { x: W - 230, y: arriba + 330 } };
        const tam = angosta ? 22 : 28;
        const mono = angosta ? 17 : 21;
        /** @type {[string, { x: number, y: number }, string][]} */
        const extremos = [['cliente', ext.cli, cliente], ['servidor', ext.srv, servidor]];
        for (const [id, lugar, nombre] of extremos) {
            piezas[id] = caja({ ...lugar, ancho: ext.ancho, alto: ext.alto, texto: '', relleno: 'superficie' });
            piezas[`${id}Nombre`] = texto({ x: lugar.x, y: lugar.y - ext.alto / 2 + 34, texto: nombre, tamano: tam, peso: 800 });
        }
        // En el navegador: la barra con la dirección y, abajo, lo que muestra.
        piezas.barra = caja({
            x: ext.cli.x, y: ext.cli.y - ext.alto / 2 + 84, ancho: ext.ancho - 30, alto: angosta ? 44 : 50,
            texto: ' ', tamano: mono, peso: 500, relleno: 'fondo', borde: 'borde', radio: 25, color: 'suave',
        });
        piezas.resultado = texto({
            x: ext.cli.x, y: ext.cli.y + (angosta ? 40 : 60), texto: ' ', tamano: angosta ? 20 : 24,
            anchoMax: ext.ancho - 50, opacidad: 0,
        });
        // En el servidor: la ruta que atiende el pedido.
        piezas.ruta = texto({
            x: ext.srv.x - ext.ancho / 2 + 24, y: ext.srv.y + (angosta ? 20 : 10), texto: ' ', tamano: angosta ? 16 : 20,
            fuente: 'mono', alineacion: 'inicio', opacidad: 0,
        });

        // Las dos tarjetas que viajan: el pedido y la respuesta. Cada una es
        // una caja y un texto de código que se mueven juntos (el texto, contra
        // el costado izquierdo de la caja).
        const largoMax = Math.max(...pedidos.flatMap((p) => [textoDelPedido(p), textoDeLaRespuesta(p.respuesta)])
            .flatMap((t) => t.split('\n')).map((l) => l.length));
        const anchoTarjeta = Math.min(angosta ? 600 : 640, Math.max(260, largoMax * mono * 0.6 + 40));
        /** Dónde va el texto de una tarjeta que está en `lugar`. */
        const junto = (lugar) => ({ x: lugar.x - anchoTarjeta / 2 + 20, y: lugar.y });
        const yMedio = angosta ? (ext.cli.y + ext.srv.y) / 2 : ext.cli.y;
        const salidaCli = angosta
            ? { x: W / 2, y: yMedio - 60 }
            : { x: ext.cli.x + ext.ancho / 2 + anchoTarjeta / 2 + 24, y: yMedio };
        const llegadaSrv = angosta
            ? { x: W / 2, y: yMedio + 60 }
            : { x: ext.srv.x - ext.ancho / 2 - anchoTarjeta / 2 - 24, y: yMedio };
        for (const id of ['pedido', 'respuesta']) {
            piezas[id] = caja({ ...salidaCli, ancho: anchoTarjeta, alto: 100, texto: '', relleno: 'papel', borde: 'acento', grosorBorde: 3, opacidad: 0, radio: 14 });
            piezas[`${id}Texto`] = texto({ ...junto(salidaCli), texto: ' ', tamano: mono, fuente: 'mono', alineacion: 'inicio', opacidad: 0 });
        }
        piezas.cable = flecha({
            desde: angosta ? { x: W / 2 - ext.ancho / 2 + 20, y: ext.cli.y + ext.alto / 2 + 6 } : { x: ext.cli.x + ext.ancho / 2 + 6, y: yMedio + 230 },
            hasta: angosta ? { x: W / 2 - ext.ancho / 2 + 20, y: ext.srv.y - ext.alto / 2 - 6 } : { x: ext.srv.x - ext.ancho / 2 - 6, y: yMedio + 230 },
            punta: false, punteada: true, color: 'borde', etiqueta: 'internet', ladoEtiqueta: -1, separacion: 0,
        });

        const altoDe = (t) => t.split('\n').length * mono * 1.3 + 30;
        // Mover una tarjeta es mover la caja y su texto, con el mismo tiempo y la misma curva.
        const llevar = (id, lugar, extra = {}) => [
            { pieza: id, a: lugar, ...extra },
            { pieza: `${id}Texto`, a: junto(lugar), ...extra },
        ];
        const n = crearNarrador({ ritmo, lectura, preguntas });
        pedidos.forEach((p, i) => {
            const metodo = (p.metodo ?? 'GET').toUpperCase();
            const razon = p.respuesta.razon ?? RAZONES[p.respuesta.codigo] ?? '';
            n.capitulo(p.capitulo ?? `${metodo} ${p.url}`);
            const tp = textoDelPedido(p);
            const tr = textoDeLaRespuesta(p.respuesta);
            const color = colorDeCodigo(p.respuesta.codigo);
            // Se arma el pedido en el navegador.
            n.animar([
                { pieza: ['respuesta', 'respuestaTexto', 'resultado', 'ruta'], a: { opacidad: 0 }, dur: 0.3 },
                { pieza: 'barra', a: { texto: p.url, color: 'texto' }, dur: 0 },
                { pieza: 'barra', a: { resaltado: 1 }, dur: 0.25 },
                { pieza: 'barra', a: { resaltado: 0 }, dur: 0.4, en: n.tiempo + 0.35 },
                ...llevar('pedido', salidaCli, { dur: 0 }),
                { pieza: 'pedido', a: { alto: altoDe(tp) }, dur: 0 },
                { pieza: 'pedidoTexto', a: { texto: tp }, dur: 0 },
                { pieza: ['pedido', 'pedidoTexto'], a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 0.3 },
            ]);
            n.esperar(0.7);
            n.decir(p.explicacion ?? `El navegador arma el pedido: ${metodo} ${p.url}${p.cuerpo != null ? ', con un cuerpo en JSON' : ''}.`, 0.2);
            // Viaja.
            n.animar(llevar('pedido', llegadaSrv, { dur: 1.1 }));
            n.esperar(1.1);
            // El servidor lo atiende.
            n.animar([
                { pieza: 'servidor', a: { resaltado: 1 }, dur: 0.25 },
                ...(p.ruta ? [{ pieza: 'ruta', a: { texto: p.ruta }, dur: 0 }, { pieza: 'ruta', a: { opacidad: 1 }, dur: 0.35 }] : []),
                { pieza: ['pedido', 'pedidoTexto'], a: { opacidad: 0 }, dur: 0.35, en: n.tiempo + 0.6 },
            ]);
            n.esperar(0.5);
            if (p.ruta) n.decir(`En el servidor lo atiende la ruta que coincide con ${metodo} y esa dirección.`, 0.2);
            n.preguntar(i);
            // La respuesta sale del servidor y vuelve.
            n.animar([
                { pieza: 'servidor', a: { resaltado: 0 }, dur: 0.4 },
                ...llevar('respuesta', llegadaSrv, { dur: 0 }),
                { pieza: 'respuesta', a: { alto: altoDe(tr), borde: color }, dur: 0 },
                { pieza: 'respuestaTexto', a: { texto: tr }, dur: 0 },
                { pieza: ['respuesta', 'respuestaTexto'], a: { opacidad: 1 }, dur: 0.35 },
                ...llevar('respuesta', salidaCli, { dur: 1.1, en: n.tiempo + 0.5 }),
            ]);
            n.esperar(1.7);
            if (p.resultado) {
                n.animar([
                    { pieza: 'resultado', a: { texto: p.resultado, color: color === 'error' ? 'error' : 'texto' }, dur: 0 },
                    { pieza: 'resultado', a: { opacidad: 1 }, dur: 0.4 },
                ]);
            }
            n.decir(p.explicacionRespuesta ?? `Vuelve un ${p.respuesta.codigo} ${razon}`.trim() + '.', 0.4);
        });

        return {
            titulo: titulo || 'Un pedido HTTP y su respuesta',
            descripcion: descripcion || `Un navegador hace ${pedidos.length === 1 ? 'un pedido' : `${pedidos.length} pedidos`} a un servidor: ` +
                `${pedidos.map((p) => `${(p.metodo ?? 'GET').toUpperCase()} ${p.url} → ${p.respuesta.codigo}`).join('; ')}.`,
            ancho: W, alto: H, lectura, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    };
}

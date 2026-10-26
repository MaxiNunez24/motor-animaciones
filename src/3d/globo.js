import {
    WebGLRenderer, Scene, PerspectiveCamera, SphereGeometry, Mesh, MeshPhongMaterial, MeshBasicMaterial,
    CanvasTexture, SRGBColorSpace, AmbientLight, DirectionalLight, Group, ArrowHelper, Vector3,
} from 'three';
import { definirPieza } from '../piezas/definir.js';
import { el, poner } from '../piezas/svg.js';
import { aPixel, posicionEnEsfera, haciaElEste, giroParaMirar } from './esfera.js';

// Un globo terráqueo en 3D, dentro de una escena común.
//
// Se dibuja con Three.js en un <canvas> metido en el SVG (un foreignObject),
// pero se anima igual que cualquier pieza: el globo no tiene su propio reloj ni
// gira solo. Cada vez que el motor le pasa otras propiedades (hacia dónde mira,
// cuánto se ve cada capa) vuelve a dibujar UN cuadro. Así sigue siendo
// determinista: el mismo t da el mismo globo, en vivo y en el video.
//
// Como cada globo es distinto (qué manchas, qué vientos), no hay un solo
// "globo": se define con definirGlobo(), y lo que se define (cada capa, cada
// región, cada viento) pasa a ser una propiedad que se puede animar de 0 a 1.
//
//     const globo = Motor3D.definirGlobo({
//         mapa: Motor.datos.mapa,
//         capas: { calido: { color: '#f97316', manchas: [{ lon: -120, lat: 0, ancho: 50, alto: 10 }] } },
//         regiones: { argentina: { color: '#facc15', anillos: Motor.datos.mapa.argentina } },
//         vientos: { alisios: { color: '#ffffff', lat: [-6, 6], lon: [-95, -175], cantidad: 5 } },
//     });
//     // y en la escena: globo({ x: 800, y: 450, lon: -120, calido: 0 }) → { pieza: 'g', a: { calido: 1 } }

const RESOLUCIONES = [256, 384, 512, 768, 1024, 1280];

/**
 * @param {{
 *     mapa: { tierra: number[][] },
 *     colores?: { mar?: string, tierra?: string, costa?: string, grilla?: string, texto?: string },
 *     etiquetas?: { texto: string, lon: number, lat: number, tamano?: number }[],
 *     capas?: Record<string, { color: string, manchas: { lon: number, lat: number, ancho: number, alto: number }[] }>,
 *     regiones?: Record<string, { color: string, anillos: number[][] }>,
 *     vientos?: Record<string, { color?: string, lat: number[], lon: [number, number], cantidad?: number, largo?: number }>,
 * }} definicion
 */
export function definirGlobo(definicion) {
    const capas = definicion.capas ?? {};
    const regiones = definicion.regiones ?? {};
    const vientos = definicion.vientos ?? {};
    const animables = [...Object.keys(capas), ...Object.keys(regiones), ...Object.keys(vientos)];
    for (const nombre of animables) {
        if (['lon', 'lat', 'zoom', 'tamano'].includes(nombre)) {
            throw new Error(`Una capa del globo no se puede llamar "${nombre}": ya es una propiedad del globo.`);
        }
    }

    return definirPieza({
        nombre: 'globo',
        predeterminados: {
            // Cuánto mide en la escena (es un cuadrado).
            tamano: 700,
            // El punto de la Tierra que queda de frente.
            lon: -60,
            lat: 0,
            zoom: 1,
            // Cada capa, región y viento: cuánto se ve, de 0 a 1.
            ...Object.fromEntries(animables.map((n) => [n, 0])),
        },

        crear(grupo, props) {
            const fo = el('foreignObject', {}, grupo);
            const caja = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
            // Redondo: con zoom, el globo se ve como a través de una lupa, y no
            // como un mapa cuadrado recortado.
            caja.style.cssText = 'width:100%;height:100%;border-radius:50%;overflow:hidden;';
            const lienzo = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
            lienzo.style.cssText = 'width:100%;height:100%;display:block;';
            caja.appendChild(lienzo);
            fo.appendChild(caja);
            const partes = { fo, lienzo, resolucion: 0, ultimo: null };
            try {
                Object.assign(partes, armarEscena(lienzo, definicion, capas, regiones, vientos));
            } catch {
                // Sin WebGL (una compu muy vieja, o con la aceleración apagada)
                // se muestra un círculo con el aviso, en vez de romper la escena.
                partes.sinWebGL = el('g', {}, grupo);
                el('circle', { r: props.tamano / 2.2, fill: definicion.colores?.mar ?? '#245a9c' }, partes.sinWebGL);
                const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-size': props.tamano / 18 }, partes.sinWebGL);
                t.textContent = 'Este navegador no muestra 3D';
            }
            return partes;
        },

        actualizar(partes, p) {
            poner(partes.fo, { x: -p.tamano / 2, y: -p.tamano / 2, width: p.tamano, height: p.tamano });
            if (!partes.renderer) return;
            partes.ultimo = p;
            dibujar(partes, p, capas, regiones, vientos);
        },

        tamano: (p) => ({ ancho: p.tamano, alto: p.tamano }),
    });
}

// ---------------- La escena de Three.js ----------------

function armarEscena(lienzo, definicion, capas, regiones, vientos) {
    // preserveDrawingBuffer: para que una captura (el render a video) vea el
    // último cuadro dibujado y no un lienzo vacío.
    const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;

    const escena = new Scene();
    const camara = new PerspectiveCamera(30, 1, 0.1, 100);
    // A esta distancia, con zoom 1, el globo ocupa casi todo el cuadrado.
    camara.position.set(0, 0, 1 / Math.sin(15 * Math.PI / 180) * 1.06);
    escena.add(new AmbientLight(0xffffff, 1.6));
    const sol = new DirectionalLight(0xffffff, 1.4);
    // La luz viene de arriba a la izquierda y un poco de adelante, fija respecto
    // de la cámara: así el globo siempre se ve con volumen, gire como gire.
    sol.position.set(-2, 1.5, 3);
    escena.add(sol);

    const tierra = new Group();
    escena.add(tierra);
    const esfera = (radio, material) => {
        const m = new Mesh(new SphereGeometry(radio, 96, 64), material);
        tierra.add(m);
        return m;
    };

    esfera(1, new MeshPhongMaterial({ map: texturaBase(definicion), shininess: 6 }));

    // Cada capa y cada región es otra esfera, apenas más grande, transparente:
    // animar cuánto se ve es solo cambiarle la opacidad, sin redibujar mapas.
    const mallas = {};
    let radio = 1.004;
    for (const [nombre, capa] of Object.entries(capas)) {
        mallas[nombre] = esfera(radio, superposicion(texturaManchas(capa)));
        radio += 0.002;
    }
    for (const [nombre, region] of Object.entries(regiones)) {
        mallas[nombre] = esfera(radio, superposicion(texturaRegion(region)));
        radio += 0.002;
    }

    // Los vientos: flechas tangentes a la esfera, apuntando de lon[0] a lon[1].
    const flechas = {};
    for (const [nombre, v] of Object.entries(vientos)) {
        const cantidad = v.cantidad ?? 4;
        const lista = [];
        const hacia = Math.sign(v.lon[1] - v.lon[0]);
        for (const lat of v.lat) {
            for (let i = 0; i < cantidad; i++) {
                const lon = v.lon[0] + ((v.lon[1] - v.lon[0]) * (i + 0.5)) / cantidad;
                const o = posicionEnEsfera(lon, lat, 1.03);
                const e = haciaElEste(lon);
                const f = new ArrowHelper(new Vector3(e.x * hacia, e.y, e.z * hacia), new Vector3(o.x, o.y, o.z), 0.1, v.color ?? '#ffffff');
                f.line.material.transparent = true;
                f.cone.material.transparent = true;
                tierra.add(f);
                lista.push({ flecha: f, largo: ((v.largo ?? Math.abs(v.lon[1] - v.lon[0]) / cantidad * 0.7) * Math.PI) / 180 });
            }
        }
        flechas[nombre] = lista;
    }
    return { renderer, escena, camara, tierra, mallas, flechas };
}

function superposicion(textura) {
    return new MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false, opacity: 0 });
}

function dibujar(partes, p, capas, regiones, vientos) {
    const { renderer, escena, camara, tierra, mallas, flechas } = partes;

    // Resolución del lienzo según lo que ocupa en la pantalla, en escalones:
    // si cambiara en cada cuadro de una animación, cada cuadro rearmaría el lienzo.
    const lado = (partes.fo.getBoundingClientRect().width || p.tamano) * Math.min(globalThis.devicePixelRatio || 1, 2);
    const resolucion = RESOLUCIONES.find((r) => r >= lado) ?? RESOLUCIONES[RESOLUCIONES.length - 1];
    if (resolucion !== partes.resolucion) {
        renderer.setSize(resolucion, resolucion, false);
        partes.resolucion = resolucion;
    }

    const giro = giroParaMirar(p.lon, p.lat);
    tierra.rotation.set(giro.x, giro.y, 0);
    camara.zoom = p.zoom;
    camara.updateProjectionMatrix();

    for (const nombre of [...Object.keys(capas), ...Object.keys(regiones)]) {
        const v = Math.min(Math.max(p[nombre], 0), 1);
        mallas[nombre].material.opacity = v;
        mallas[nombre].visible = v > 0;
    }
    for (const nombre of Object.keys(vientos)) {
        const v = Math.min(Math.max(p[nombre], 0), 1);
        for (const { flecha, largo } of flechas[nombre]) {
            flecha.visible = v > 0.02;
            if (!flecha.visible) continue;
            const l = largo * v;
            flecha.setLength(l, Math.min(l * 0.45, 0.05), 0.035);
            flecha.line.material.opacity = Math.min(1, v * 1.4);
            flecha.cone.material.opacity = Math.min(1, v * 1.4);
        }
    }
    renderer.render(escena, camara);
}

// ---------------- Las texturas (mapas planos que se pegan sobre la esfera) ----------------

const ANCHO = 2048;
const ALTO = 1024;

function lienzo2d(ancho = ANCHO, alto = ALTO) {
    const c = document.createElement('canvas');
    c.width = ancho;
    c.height = alto;
    return { c, ctx: c.getContext('2d') };
}

function textura(c) {
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

function anillo(ctx, puntos, ancho, alto) {
    ctx.beginPath();
    for (let i = 0; i < puntos.length; i += 2) {
        const { x, y } = aPixel(puntos[i], puntos[i + 1], ancho, alto);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

// El mapa de fondo: mar, continentes, el ecuador y los nombres.
function texturaBase(definicion) {
    const col = {
        mar: '#245a9c', tierra: '#c9b98d', costa: '#8c7b52', grilla: 'rgba(255,255,255,0.18)', texto: '#ffffff',
        ...definicion.colores,
    };
    const { c, ctx } = lienzo2d();
    ctx.fillStyle = col.mar;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    // Una cuadrícula cada 30°: ayuda a ver que el globo gira.
    ctx.strokeStyle = col.grilla;
    ctx.lineWidth = 1.5;
    for (let lon = -180; lon <= 180; lon += 30) {
        const { x } = aPixel(lon, 0, ANCHO, ALTO);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ALTO);
        ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
        const { y } = aPixel(0, lat, ANCHO, ALTO);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ANCHO, y);
        ctx.stroke();
    }
    // El ecuador, más marcado: casi todo lo que pasa en El Niño pasa sobre él.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(0, ALTO / 2);
    ctx.lineTo(ANCHO, ALTO / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = col.tierra;
    ctx.strokeStyle = col.costa;
    ctx.lineWidth = 2;
    for (const puntos of definicion.mapa.tierra) {
        anillo(ctx, puntos, ANCHO, ALTO);
        ctx.fill();
        ctx.stroke();
    }

    ctx.fillStyle = col.texto;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const e of definicion.etiquetas ?? []) {
        ctx.font = `700 ${e.tamano ?? 30}px system-ui, "Segoe UI", sans-serif`;
        const { x, y } = aPixel(e.lon, e.lat, ANCHO, ALTO);
        ctx.fillText(e.texto, x, y);
    }
    return textura(c);
}

// Manchas suaves (un óvalo que se desvanece en los bordes): el agua más
// caliente o más fría que lo normal, una zona con más lluvia.
function texturaManchas(capa) {
    const { c, ctx } = lienzo2d(1024, 512);
    for (const m of capa.manchas) {
        const { x, y } = aPixel(m.lon, m.lat, 1024, 512);
        const rx = (m.ancho / 360) * 1024;
        const ry = (m.alto / 180) * 512;
        // Dibujada tres veces, corrida un mapa entero a cada lado: una mancha
        // sobre el meridiano 180 no queda cortada a la mitad.
        for (const corrimiento of [-1024, 0, 1024]) {
            ctx.save();
            ctx.translate(x + corrimiento, y);
            ctx.scale(rx, ry);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
            g.addColorStop(0, capa.color);
            g.addColorStop(0.55, capa.color + 'cc');
            g.addColorStop(1, capa.color + '00');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    return textura(c);
}

function texturaRegion(region) {
    const { c, ctx } = lienzo2d();
    ctx.fillStyle = region.color + '99';
    ctx.strokeStyle = region.color;
    ctx.lineWidth = 4;
    for (const puntos of region.anillos) {
        anillo(ctx, puntos, ANCHO, ALTO);
        ctx.fill();
        ctx.stroke();
    }
    return textura(c);
}

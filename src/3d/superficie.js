import {
    WebGLRenderer, Scene, PerspectiveCamera, Mesh, MeshPhongMaterial, MeshBasicMaterial, BufferGeometry,
    Float32BufferAttribute, DoubleSide, AmbientLight, DirectionalLight, Group, LineSegments, LineBasicMaterial,
    SphereGeometry, TubeGeometry, CatmullRomCurve3, Vector3, PlaneGeometry, Sprite, SpriteMaterial, CanvasTexture, SRGBColorSpace, Color,
} from 'three';
import { definirPieza } from '../piezas/definir.js';
import { el, poner } from '../piezas/svg.js';
import { curvaDeNivel, gradiente, numero } from '../mate/calculo.js';

// La gráfica de una función de dos variables, z = f(x, y), en 3D.
//
// Igual que el globo: Three.js dibuja UN cuadro cada vez que el motor le pasa
// otras propiedades, sin reloj propio. Girarla es animar `azimut`; cortarla
// con un plano horizontal es animar `corte`; mostrar el plano tangente es
// animar `verTangente` de 0 a 1.
//
//     superficie({
//         x: 800, y: 450, f: (x, y) => x * x + y * y,
//         rango: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 },
//         azimut: -40, elevacion: 28,
//         niveles: [1, 2, 3], verNiveles: 0,
//     })
//
// Los colores van como CSS de verdad ('#2563eb'), no como papeles del tema:
// WebGL no sabe leer las variables del tema.

const RESOLUCIONES = [256, 384, 512, 768, 1024, 1280];
// La superficie ocupa el cubo de −1 a 1 en x e y; en z, de −ALTO a ALTO.
const ALTO = 0.62;
const PISO = -ALTO - 0.14;

export const superficie = definirPieza({
    nombre: 'superficie',
    predeterminados: {
        f: null,
        rango: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 },
        // El rango de z que se ve. null: el de la función en el rango.
        zmin: null,
        zmax: null,
        ancho: 760,
        alto: 640,
        // Desde dónde se mira, en grados: el giro alrededor del eje z, y la altura.
        azimut: -50,
        elevacion: 28,
        zoom: 1,
        // Cuántos cuadraditos por lado tiene la malla.
        malla: 72,
        // De 0 a 1.
        verSuperficie: 1,
        verGrilla: 0.6,
        verEjes: 1,
        // Un corte horizontal z = corte, con la curva que deja sobre la superficie.
        corte: 0,
        verCorte: 0,
        // Las curvas de nivel, proyectadas sobre el piso.
        niveles: [],
        verNiveles: 0,
        // Un punto sobre la superficie, y el plano tangente en ese punto.
        px: 0,
        py: 0,
        verPunto: 0,
        verTangente: 0,
        // Caminos sobre la superficie: [{ puntos: [[x, y], ...], color }]. Se dibujan hasta `recorrido` (0 a 1).
        caminos: [],
        recorrido: 1,
        colores: { bajo: '#1d4ed8', medio: '#14b8a6', alto: '#f59e0b', tope: '#dc2626', ejes: '#8a94a6', corte: '#f43f5e', tangente: '#a855f7', punto: '#f43f5e', texto: '#8a94a6' },
        etiquetas: { x: 'x', y: 'y', z: 'z' },
    },

    validar(p) {
        if (typeof p.f !== 'function') throw new Error('Una superficie necesita la función: f: (x, y) => x * x + y * y.');
    },

    crear(grupo, props) {
        const fo = el('foreignObject', {}, grupo);
        const lienzo = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        lienzo.style.cssText = 'width:100%;height:100%;display:block;';
        fo.appendChild(lienzo);
        const partes = { fo, lienzo, resolucion: '' };
        try {
            Object.assign(partes, armar(lienzo));
        } catch {
            partes.sinWebGL = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'currentColor', 'font-size': 28 }, grupo);
            partes.sinWebGL.textContent = 'Este navegador no muestra 3D';
        }
        return partes;
    },

    actualizar(partes, p) {
        poner(partes.fo, { x: -p.ancho / 2, y: -p.alto / 2, width: p.ancho, height: p.alto });
        if (!partes.renderer) return;
        dibujar(partes, p);
    },

    tamano: (p) => ({ ancho: p.ancho, alto: p.alto }),
});

function armar(lienzo) {
    const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    const escena = new Scene();
    const camara = new PerspectiveCamera(30, 1, 0.1, 100);
    escena.add(new AmbientLight(0xffffff, 1.5));
    const luz = new DirectionalLight(0xffffff, 1.3);
    escena.add(luz);
    const mundo = new Group();
    escena.add(mundo);
    return { renderer, escena, camara, luz, mundo, cache: {} };
}

/** De coordenadas de la función a coordenadas de Three (y para arriba). */
function aMundo(c, x, y, z) {
    const nx = ((x - c.rango.xmin) / (c.rango.xmax - c.rango.xmin)) * 2 - 1;
    const ny = ((y - c.rango.ymin) / (c.rango.ymax - c.rango.ymin)) * 2 - 1;
    const zz = Math.min(Math.max(z, c.zmin), c.zmax);
    const nz = ((zz - c.zmin) / (c.zmax - c.zmin || 1)) * 2 * ALTO - ALTO;
    // El eje y de la función va "hacia el fondo": en Three es −z.
    return [nx, nz, -ny];
}

function dibujar(partes, p) {
    const { renderer, escena, camara, luz, mundo } = partes;
    const ancho = (partes.fo.getBoundingClientRect().width || p.ancho) * Math.min(globalThis.devicePixelRatio || 1, 2);
    const rw = RESOLUCIONES.find((r) => r >= ancho) ?? RESOLUCIONES.at(-1);
    const rh = Math.round((rw * p.alto) / p.ancho);
    if (partes.resolucion !== `${rw}x${rh}`) {
        renderer.setSize(rw, rh, false);
        partes.resolucion = `${rw}x${rh}`;
        camara.aspect = p.ancho / p.alto;
    }

    // Lo caro (la malla, las curvas de nivel) se rearma solo si cambia la función o el rango.
    const clave = JSON.stringify([p.rango, p.zmin, p.zmax, p.malla, p.niveles, p.colores, p.etiquetas]);
    if (partes.cache.clave !== clave || partes.cache.f !== p.f) {
        mundo.clear();
        partes.cache = construir(p);
        partes.cache.clave = clave;
        partes.cache.f = p.f;
        mundo.add(partes.cache.grupo);
    }
    const c = partes.cache;

    // La cámara gira alrededor del centro: azimut alrededor del eje vertical, elevación desde el piso.
    const az = (p.azimut * Math.PI) / 180;
    const elev = (p.elevacion * Math.PI) / 180;
    const distancia = 5.2;
    camara.position.set(Math.sin(az) * Math.cos(elev) * distancia, Math.sin(elev) * distancia, Math.cos(az) * Math.cos(elev) * distancia);
    camara.lookAt(0, -0.05, 0);
    camara.zoom = p.zoom;
    camara.updateProjectionMatrix();
    luz.position.copy(camara.position).add({ x: -2, y: 3, z: 0 });

    const v = (n) => Math.min(Math.max(n, 0), 1);
    c.malla.material.opacity = v(p.verSuperficie);
    c.malla.material.transparent = v(p.verSuperficie) < 1;
    c.malla.visible = v(p.verSuperficie) > 0;
    c.grilla.material.opacity = v(p.verGrilla) * 0.5;
    c.grilla.visible = v(p.verGrilla) > 0;
    c.ejes.visible = v(p.verEjes) > 0;
    c.ejes.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = v(p.verEjes); } });
    c.niveles.material.opacity = v(p.verNiveles);
    c.niveles.visible = v(p.verNiveles) > 0;

    // El corte: un plano horizontal translúcido y la curva de nivel sobre la superficie.
    c.corte.visible = v(p.verCorte) > 0;
    if (c.corte.visible) {
        const [, altura] = aMundo(c, 0, 0, p.corte);
        c.planoCorte.position.y = altura;
        c.planoCorte.material.opacity = 0.28 * v(p.verCorte);
        const segmentos = curvaDeNivel(p.f, p.rango, p.corte, 64);
        const pos = [];
        for (const [x1, y1, x2, y2] of segmentos) pos.push(...aMundo(c, x1, y1, p.corte), ...aMundo(c, x2, y2, p.corte));
        c.curvaCorte.geometry.setAttribute('position', new Float32BufferAttribute(pos.length ? pos : [0, 0, 0, 0, 0, 0], 3));
        c.curvaCorte.material.opacity = v(p.verCorte);
        // La misma curva, abajo en el piso: es la curva de nivel que se "ve desde arriba".
        const piso = [];
        for (const [x1, y1, x2, y2] of segmentos) piso.push(...aPiso(c, x1, y1), ...aPiso(c, x2, y2));
        c.sombraCorte.geometry.setAttribute('position', new Float32BufferAttribute(piso.length ? piso : [0, 0, 0, 0, 0, 0], 3));
        c.sombraCorte.material.opacity = v(p.verCorte);
    }

    // El punto y el plano tangente.
    const z0 = p.f(p.px, p.py);
    c.punto.visible = v(p.verPunto) > 0 && Number.isFinite(z0);
    if (c.punto.visible) {
        c.punto.position.set(...aMundo(c, p.px, p.py, z0));
        c.punto.material.opacity = v(p.verPunto);
    }
    c.tangente.visible = v(p.verTangente) > 0 && Number.isFinite(z0);
    if (c.tangente.visible) {
        const [fx, fy] = gradiente(p.f, p.px, p.py);
        const dx = (c.rango.xmax - c.rango.xmin) * 0.22;
        const dy = (c.rango.ymax - c.rango.ymin) * 0.22;
        const esquinas = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
            const x = p.px + sx * dx;
            const y = p.py + sy * dy;
            // Sin recortar en z: el plano tangente puede salirse del rango de la superficie.
            const n = aMundoSinTope(c, x, y, z0 + fx * (x - p.px) + fy * (y - p.py));
            return n;
        });
        const pos = [...esquinas[0], ...esquinas[1], ...esquinas[2], ...esquinas[0], ...esquinas[2], ...esquinas[3]];
        c.tangente.geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
        c.tangente.geometry.computeVertexNormals();
        c.tangente.material.opacity = 0.55 * v(p.verTangente);
    }

    // Los caminos: se arman de nuevo si cambian (son pocos puntos).
    const claveCaminos = JSON.stringify(p.caminos);
    if (c.claveCaminos !== claveCaminos) {
        for (const l of c.caminos) c.grupo.remove(l);
        c.caminos = p.caminos.map((camino) => {
            const pos = [];
            // Cada tramo se subdivide para que la línea vaya pegada a la superficie y no la atraviese.
            for (let i = 0; i < camino.puntos.length; i++) {
                const [x, y] = camino.puntos[i];
                if (i > 0) {
                    const [xa, ya] = camino.puntos[i - 1];
                    for (let k = 1; k < 12; k++) {
                        const xx = xa + ((x - xa) * k) / 12;
                        const yy = ya + ((y - ya) * k) / 12;
                        pos.push(...encima(c, p.f, xx, yy));
                    }
                }
                pos.push(...encima(c, p.f, x, y));
            }
            const puntos3 = [];
            for (let k = 0; k < pos.length; k += 3) puntos3.push(new Vector3(pos[k], pos[k + 1], pos[k + 2]));
            const tramos = Math.max(2, puntos3.length - 1);
            const g = new TubeGeometry(new CatmullRomCurve3(puntos3, false, 'centripetal'), tramos * 2, 0.016, 8, false);
            const linea = new Mesh(g, new MeshBasicMaterial({ color: camino.color ?? p.colores.punto, depthTest: false }));
            linea.renderOrder = 5;
            // Los índices del tubo van en orden a lo largo del camino: dibujar
            // una parte es dibujar los primeros.
            linea.userData.cantidad = g.index.count;
            c.grupo.add(linea);
            return linea;
        });
        c.claveCaminos = claveCaminos;
    }
    for (const l of c.caminos) {
        // De a seis índices: cada cuadradito del tubo son dos triángulos.
        const n = Math.max(0, Math.round((l.userData.cantidad * v(p.recorrido)) / 6) * 6);
        l.geometry.setDrawRange(0, n);
        l.visible = n > 0;
    }

    renderer.render(escena, camara);
}

function aMundoSinTope(c, x, y, z) {
    const [nx, , nzFondo] = aMundo(c, x, y, c.zmin);
    const nz = ((z - c.zmin) / (c.zmax - c.zmin || 1)) * 2 * ALTO - ALTO;
    return [nx, nz, nzFondo];
}

function aPiso(c, x, y) {
    const [nx, , nz] = aMundo(c, x, y, c.zmin);
    return [nx, PISO + 0.002, nz];
}

// Un poquito por encima de la superficie, para que la línea no quede tapada por ella.
function encima(c, f, x, y) {
    const [nx, ny, nz] = aMundo(c, x, y, f(x, y));
    return [nx, ny + 0.012, nz];
}

function construir(p) {
    const { f, rango, malla: N } = p;
    // El rango de z, si no viene: el de la función en una grilla (sin infinitos).
    let zmin = p.zmin;
    let zmax = p.zmax;
    if (zmin == null || zmax == null) {
        const zs = [];
        for (let j = 0; j <= 40; j++) {
            for (let i = 0; i <= 40; i++) {
                const z = f(rango.xmin + ((rango.xmax - rango.xmin) * i) / 40, rango.ymin + ((rango.ymax - rango.ymin) * j) / 40);
                if (Number.isFinite(z)) zs.push(z);
            }
        }
        zs.sort((a, b) => a - b);
        // Percentiles y no extremos: un pico aislado (1/(x² + y²) en el 0) no aplasta todo lo demás.
        zmin ??= zs[Math.floor(zs.length * 0.005)] ?? -1;
        zmax ??= zs[Math.floor(zs.length * 0.995)] ?? 1;
        if (zmax - zmin < 1e-9) {
            zmin -= 1;
            zmax += 1;
        }
    }
    const c = { rango, zmin, zmax, grupo: new Group(), caminos: [], claveCaminos: '' };

    // La malla, con un color por altura.
    const pos = [];
    const col = [];
    const indices = [];
    const validos = [];
    const escala = [p.colores.bajo, p.colores.medio, p.colores.alto, p.colores.tope].map((h) => new Color(h));
    const colorDe = (z) => {
        const t = Math.min(Math.max((z - zmin) / (zmax - zmin || 1), 0), 1) * (escala.length - 1);
        const i = Math.min(Math.floor(t), escala.length - 2);
        return escala[i].clone().lerp(escala[i + 1], t - i);
    };
    for (let j = 0; j <= N; j++) {
        for (let i = 0; i <= N; i++) {
            const x = rango.xmin + ((rango.xmax - rango.xmin) * i) / N;
            const y = rango.ymin + ((rango.ymax - rango.ymin) * j) / N;
            const z = f(x, y);
            // Lo que no está definido o se sale del rango de z no se dibuja: un
            // borde recortado se entiende; una meseta plana parece parte de la función.
            const valida = Number.isFinite(z) && z >= zmin - 1e-9 && z <= zmax + 1e-9;
            validos.push(valida);
            pos.push(...aMundo(c, x, y, valida ? z : zmin));
            const k = colorDe(valida ? z : zmin);
            col.push(k.r, k.g, k.b);
        }
    }
    const idx = (i, j) => j * (N + 1) + i;
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const [a, b, c2, d] = [idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)];
            if (validos[a] && validos[b] && validos[c2]) indices.push(a, b, c2);
            if (validos[a] && validos[c2] && validos[d]) indices.push(a, c2, d);
        }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    c.malla = new Mesh(geo, new MeshPhongMaterial({ vertexColors: true, side: DoubleSide, shininess: 25, transparent: false }));
    c.grupo.add(c.malla);

    // La grilla: una línea cada tanto, encima de la malla. Ayuda a ver la forma.
    const g = [];
    const cada = Math.max(1, Math.round(N / 12));
    for (let j = 0; j <= N; j += cada) {
        for (let i = 0; i < N; i++) if (validos[idx(i, j)] && validos[idx(i + 1, j)]) g.push(...pos.slice(idx(i, j) * 3, idx(i, j) * 3 + 3), ...pos.slice(idx(i + 1, j) * 3, idx(i + 1, j) * 3 + 3));
    }
    for (let i = 0; i <= N; i += cada) {
        for (let j = 0; j < N; j++) if (validos[idx(i, j)] && validos[idx(i, j + 1)]) g.push(...pos.slice(idx(i, j) * 3, idx(i, j) * 3 + 3), ...pos.slice(idx(i, j + 1) * 3, idx(i, j + 1) * 3 + 3));
    }
    const geoGrilla = new BufferGeometry();
    geoGrilla.setAttribute('position', new Float32BufferAttribute(g.map((v, k) => (k % 3 === 1 ? v + 0.003 : v)), 3));
    c.grilla = new LineSegments(geoGrilla, new LineBasicMaterial({ color: '#0f172a', transparent: true, opacity: 0.3 }));
    c.grupo.add(c.grilla);

    // Los ejes: el contorno del piso y una arista vertical, con sus nombres y extremos.
    c.ejes = new Group();
    const lineaEjes = [];
    const esquinas = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) {
        const [a, b] = [esquinas[k], esquinas[(k + 1) % 4]];
        lineaEjes.push(a[0], PISO, -a[1], b[0], PISO, -b[1]);
    }
    lineaEjes.push(-1, PISO, 1, -1, ALTO + 0.1, 1);
    const geoEjes = new BufferGeometry();
    geoEjes.setAttribute('position', new Float32BufferAttribute(lineaEjes, 3));
    c.ejes.add(new LineSegments(geoEjes, new LineBasicMaterial({ color: p.colores.ejes })));
    const rotulo = (txt, x, y, z, tam = 0.16) => {
        const s = textoSprite(txt, p.colores.texto);
        s.position.set(x, y, z);
        s.scale.set(tam * s.userData.proporcion, tam, 1);
        c.ejes.add(s);
    };
    rotulo(p.etiquetas.x, 0, PISO - 0.02, 1.22, 0.2);
    rotulo(p.etiquetas.y, 1.22, PISO - 0.02, 0, 0.2);
    rotulo(p.etiquetas.z, -1.12, ALTO + 0.2, 1.12, 0.2);
    rotulo(numero(rango.xmin), -1, PISO - 0.05, 1.14, 0.12);
    rotulo(numero(rango.xmax), 1, PISO - 0.05, 1.14, 0.12);
    rotulo(numero(rango.ymin), 1.14, PISO - 0.05, 1, 0.12);
    rotulo(numero(rango.ymax), 1.14, PISO - 0.05, -1, 0.12);
    rotulo(numero(zmin), -1.14, -ALTO, 1.14, 0.12);
    rotulo(numero(zmax), -1.14, ALTO, 1.14, 0.12);
    c.grupo.add(c.ejes);

    // Las curvas de nivel en el piso, todas en una sola geometría.
    const niv = [];
    for (const nivel of p.niveles) {
        for (const [x1, y1, x2, y2] of curvaDeNivel(f, rango, nivel, 64)) niv.push(...aPiso(c, x1, y1), ...aPiso(c, x2, y2));
    }
    const geoNiv = new BufferGeometry();
    geoNiv.setAttribute('position', new Float32BufferAttribute(niv.length ? niv : [0, 0, 0, 0, 0, 0], 3));
    c.niveles = new LineSegments(geoNiv, new LineBasicMaterial({ color: p.colores.medio, transparent: true, opacity: 0 }));
    c.grupo.add(c.niveles);

    // El corte.
    c.corte = new Group();
    c.planoCorte = new Mesh(new PlaneGeometry(2.3, 2.3), new MeshBasicMaterial({ color: p.colores.corte, transparent: true, opacity: 0.25, side: DoubleSide, depthWrite: false }));
    c.planoCorte.rotation.x = -Math.PI / 2;
    c.corte.add(c.planoCorte);
    c.curvaCorte = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: p.colores.corte, transparent: true, depthTest: false }));
    c.curvaCorte.renderOrder = 4;
    c.corte.add(c.curvaCorte);
    c.sombraCorte = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: p.colores.corte, transparent: true }));
    c.corte.add(c.sombraCorte);
    c.grupo.add(c.corte);

    c.punto = new Mesh(new SphereGeometry(0.035, 24, 16), new MeshBasicMaterial({ color: p.colores.punto, transparent: true, depthTest: false }));
    c.punto.renderOrder = 6;
    c.grupo.add(c.punto);
    c.tangente = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ color: p.colores.tangente, transparent: true, side: DoubleSide, depthWrite: false }));
    c.grupo.add(c.tangente);
    return c;
}

function textoSprite(texto, color) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const tam = 64;
    ctx.font = `600 ${tam}px system-ui, "Segoe UI", sans-serif`;
    const ancho = Math.ceil(ctx.measureText(texto).width) + 16;
    c.width = ancho;
    c.height = tam + 16;
    ctx.font = `600 ${tam}px system-ui, "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, ancho / 2, c.height / 2);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    const s = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    s.userData.proporcion = ancho / c.height;
    return s;
}

// Graba una escena a video, sola, sin que nadie mire.
//
//     node herramientas/video.js --url ejemplos/expo/pantalla.html --salida salida/expo.mp4
//     node herramientas/video.js --url ejemplos/conceptos/ --escena 0 --narrar --salida salida/for.mp4
//     node herramientas/video.js --url ejemplos/expo/pantalla.html --ancho 1080 --alto 1920   (vertical, para Shorts)
//
// Deja, al lado del video:
//   .srt               los subtítulos, para subir a YouTube aparte
//   .vtt               los mismos, para un <video> en una página web
//   .descripcion.txt   el título, la descripción y los capítulos, para pegar en YouTube
//
// Cómo funciona: como el estado depende solo de t, no se graba la pantalla.
// Se pone la escena en cada instante (t = 0, 1/30, 2/30...), se le saca una
// foto y la foto va derecho a ffmpeg. Un cuadro que tarda en dibujarse no se
// pierde ni sale movido, y la compu puede ser lenta: solo tarda más.
//
// Con --narrar, cada subtítulo se lee en voz alta con Piper (una voz que
// corre en la compu, sin internet), y la voz entra justo cuando aparece el
// subtítulo.

import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { aSrt, aVtt, capitulosYouTube, duracionWav } from './lib/textos-video.js';

const { values: op } = parseArgs({
    options: {
        // Sin barra adelante: en Git Bash, /ejemplos se convierte en una ruta de Windows.
        url: { type: 'string', default: 'ejemplos/prueba.html' },
        base: { type: 'string', default: 'http://localhost:4173' },
        // Cuál de las escenas de la página, si hay varias (desde 0).
        escena: { type: 'string', default: '0' },
        salida: { type: 'string', default: 'salida/video.mp4' },
        ancho: { type: 'string', default: '1920' },
        alto: { type: 'string', default: '1080' },
        fps: { type: 'string', default: '30' },
        tema: { type: 'string', default: 'oscuro' },
        // srt (aparte, lo recomendado), quemados (en la imagen), ambos, no.
        subtitulos: { type: 'string', default: 'srt' },
        narrar: { type: 'boolean', default: false },
        voz: { type: 'string', default: join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? '.', '.local', 'share'), 'motor-animaciones', 'voces', 'es_AR-daniela-high.onnx') },
        // Más de 1: habla más despacio.
        pausado: { type: 'string', default: '1.05' },
        desde: { type: 'string', default: '0' },
        hasta: { type: 'string' },
        calidad: { type: 'string', default: '20' },
    },
});

const fps = Number(op.fps);
const salida = resolve(op.salida);
mkdirSync(dirname(salida), { recursive: true });
const ffmpeg = buscarFfmpeg();

// ---------------- La página ----------------
// WebGL por software, para que las piezas 3D se graben igual en cualquier compu.
const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pagina = await navegador.newPage({ viewport: { width: Number(op.ancho), height: Number(op.alto) } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto(`${op.base}/${op.url.replace(/^\/+/, '')}`);
await pagina.waitForFunction((i) => document.querySelectorAll('motor-escena, motor-leccion')[i]?.compilada, Number(op.escena));

const info = await pagina.evaluate(({ i, tema, quemados }) => {
    const m = document.querySelectorAll('motor-escena, motor-leccion')[i];
    // Toda la ventana, sin controles, y en modo video: las preguntas no frenan,
    // se muestran como cartel durante su tramo.
    document.documentElement.style.overflow = 'hidden';
    m.setAttribute('pantalla', '');
    m.setAttribute('sin-controles', '');
    m.setAttribute('video', '');
    m.setAttribute('movimiento', 'completo');
    m.setAttribute('tema', tema);
    m.toggleAttribute('sin-subtitulos', !quemados);
    m.pausar();
    // Rearmar ya, con el tamaño de pantalla completa (y su disposición).
    m.escena = m.escena;
    const c = m.compilada;
    return {
        titulo: c.titulo, descripcion: c.descripcion, duracion: c.duracion, disposicion: c.disposicion,
        capitulos: c.capitulos, subtitulos: c.subtitulos,
    };
}, { i: Number(op.escena), tema: op.tema, quemados: ['quemados', 'ambos'].includes(op.subtitulos) });
await pagina.evaluate(() => document.fonts.ready);

const desde = Number(op.desde);
const hasta = Math.min(op.hasta ? Number(op.hasta) : info.duracion, info.duracion);
const duracion = hasta - desde;
const total = Math.round(duracion * fps);
console.log(`«${info.titulo}»: ${duracion.toFixed(1)} s, ${total} cuadros a ${fps} fps, ${op.ancho}×${op.alto} (${info.disposicion}).`);

// ---------------- La voz ----------------
const voces = op.narrar ? narrar(info.subtitulos.filter((s) => s.hasta > desde && s.desde < hasta)) : [];

// ---------------- ffmpeg ----------------
const argumentos = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
for (const v of voces) argumentos.push('-i', v.archivo);
if (voces.length) {
    // Cada voz entra cuando aparece su subtítulo (adelay, en milisegundos), y
    // se suman todas en una sola pista.
    const filtros = voces.map((v, i) => `[${i + 1}:a]adelay=${Math.round((v.desde - desde) * 1000)}:all=1[v${i}]`);
    filtros.push(`${voces.map((_, i) => `[v${i}]`).join('')}amix=inputs=${voces.length}:normalize=0:dropout_transition=0[voz]`);
    argumentos.push('-filter_complex', filtros.join(';'), '-map', '0:v', '-map', '[voz]', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000');
}
argumentos.push(
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', op.calidad, '-pix_fmt', 'yuv420p',
    // Que se pueda ver mientras se descarga, y que dure exactamente la escena.
    '-movflags', '+faststart', '-t', duracion.toFixed(3), salida,
);
const proceso = spawn(ffmpeg, argumentos, { stdio: ['pipe', 'inherit', 'inherit'] });
const termino = new Promise((ok, mal) => proceso.on('close', (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg terminó con el código ${c}`)))));

// ---------------- Los cuadros ----------------
const inicio = Date.now();
let ultimoAviso = 0;
for (let i = 0; i < total; i++) {
    // El instante sale de multiplicar, no de ir sumando: sumando 1/30 una y
    // otra vez, los redondeos se acumulan y el cuadro 2000 cae corrido.
    const t = desde + i / fps;
    await pagina.evaluate(({ i, t }) => document.querySelectorAll('motor-escena, motor-leccion')[i].irA(t), { i: Number(op.escena), t });
    const cuadro = await pagina.screenshot({ type: 'png' });
    if (!proceso.stdin.write(cuadro)) await new Promise((r) => proceso.stdin.once('drain', r));
    const avance = Math.floor(((i + 1) / total) * 10);
    if (avance > ultimoAviso) {
        ultimoAviso = avance;
        const seg = (Date.now() - inicio) / 1000;
        console.log(`  ${avance * 10} %  (${(i + 1) / seg > 0 ? ((i + 1) / seg).toFixed(1) : '?'} cuadros por segundo)`);
    }
}
proceso.stdin.end();
await termino;
await navegador.close();
if (errores.length) console.warn('⚠️ La página tuvo errores:\n  ' + errores.join('\n  '));

// ---------------- Los textos ----------------
const base = salida.replace(/\.[^.\\/]+$/, '');
const subtitulosDelTramo = info.subtitulos
    .filter((s) => s.hasta > desde && s.desde < hasta)
    .map((s) => ({ ...s, desde: Math.max(s.desde - desde, 0), hasta: Math.min(s.hasta, hasta) - desde }));
if (op.subtitulos !== 'no' && subtitulosDelTramo.length) {
    writeFileSync(`${base}.srt`, aSrt(subtitulosDelTramo), 'utf-8');
    // El mismo texto para un <video> en una página web.
    writeFileSync(`${base}.vtt`, aVtt(subtitulosDelTramo), 'utf-8');
}

const capitulos = info.capitulos.filter((c) => c.t >= desde && c.t < hasta).map((c) => ({ ...c, t: c.t - desde }));
const yt = capitulosYouTube(capitulos, duracion);
const creditos = op.narrar
    ? '\n\nVoz: Piper, es_AR-daniela (datos de OpenSLR 61, CC BY-SA 4.0).'
    : '';
writeFileSync(`${base}.descripcion.txt`, `${info.titulo}\n\n${info.descripcion}\n\n${yt.texto}${creditos}\n`, 'utf-8');
for (const p of yt.problemas) console.warn(`⚠️ Capítulos: ${p}`);

const seg = (Date.now() - inicio) / 1000;
console.log(`Listo en ${seg.toFixed(0)} s → ${salida}`);

// ---------------- Ayudas ----------------

function buscarFfmpeg() {
    if (process.env.FFMPEG) return process.env.FFMPEG;
    try {
        return createRequire(import.meta.url)('ffmpeg-static');
    } catch {
        // Si no está el paquete, el que esté instalado en la compu.
    }
    try {
        execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
        return 'ffmpeg';
    } catch {
        throw new Error('Falta ffmpeg. Instalalo con "npm install" (viene ffmpeg-static) o ponelo en FFMPEG.');
    }
}

// Cada subtítulo, en voz alta. Los audios se guardan por texto: si se vuelve a
// grabar la escena sin cambiar lo que dice, no se vuelven a generar.
function narrar(subtitulos) {
    if (!existsSync(op.voz)) {
        throw new Error(`No encuentro la voz en ${op.voz}. Está en huggingface.co/rhasspy/piper-voices (es/es_AR/daniela/high).`);
    }
    const cache = join(dirname(salida), '.voz');
    mkdirSync(cache, { recursive: true });
    const python = process.env.PYTHON ?? 'python';
    const resultado = [];
    let largos = 0;
    for (const s of subtitulos) {
        const clave = createHash('sha1').update(`${op.voz}|${op.pausado}|${s.texto}`).digest('hex').slice(0, 16);
        const archivo = join(cache, `${clave}.wav`);
        if (!existsSync(archivo)) {
            execFileSync(python, ['-m', 'piper', '-m', op.voz, '--length-scale', op.pausado, '-f', archivo, '--', s.texto], { stdio: 'ignore' });
        }
        const dura = duracionWav(readFileSync(archivo));
        const lugar = s.hasta - s.desde;
        // La voz puede pasarse un poco del subtítulo, pero no pisar al que sigue.
        if (dura > lugar + 0.3) {
            largos += 1;
            console.warn(`⚠️ La voz dura ${dura.toFixed(1)} s y el subtítulo ${lugar.toFixed(1)} s: «${s.texto}»`);
        }
        resultado.push({ ...s, archivo, dura });
    }
    if (largos) console.warn('   Para que no se pisen: bajá `lectura` en la escena, o dale más `dur` a esos subtítulos.');
    console.log(`Voz: ${resultado.length} frases.`);
    return resultado;
}

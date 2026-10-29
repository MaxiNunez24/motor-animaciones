// Graba una escena a video, sola, sin que nadie mire.
//
//     node herramientas/video.js --url ejemplos/expo/pantalla.html --salida salida/expo.mp4
//     node herramientas/video.js --url ejemplos/conceptos/ --escena 0 --narrar --salida salida/for.mp4
//     node herramientas/video.js --url ejemplos/expo/pantalla.html --ancho 1080 --alto 1920   (vertical, para Shorts)
//     node herramientas/video.js --url ejemplos/estilos/ --estilo reel --desenfoque 8   (con el arte de un reel)
//
// Deja, al lado del video:
//   .srt               los subtítulos, para subir a YouTube aparte
//   .vtt               los mismos, para un <video> en una página web
//   .gif               con --gif, una versión liviana para mandar por mensaje
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
//
// Los efectos de sonido de la escena (y los que agrega su estilo) se fabrican
// acá mismo, con las recetas de src/sonido/, y van en la misma pista. La
// música de fondo, si la hay, baja sola mientras habla la voz.
//
// Desenfoque de movimiento (--desenfoque 8): cada cuadro es el promedio de 8
// fotos sacadas en instantes muy cercanos, como el obturador abierto de una
// cámara. Es posible justamente porque la escena depende solo de t: se le
// puede pedir el instante 1,0021 igual que el 1. Tarda tantas veces más como
// fotos por cuadro. --obturador dice cuánto del cuadro queda abierto (0,5 es
// lo de cine: medio cuadro).

import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { aSrt, aVtt, capitulosYouTube, duracionWav, prepararParaVoz } from './lib/textos-video.js';
import { mezclarPista, aWav } from '../src/sonido/sintetizar.js';

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
        // El arte: un estilo registrado (neon, reel, pizarra, papel) o un .json.
        estilo: { type: 'string' },
        // Si no se dicen, los toma del estilo (video: { desenfoque, obturador }).
        desenfoque: { type: 'string' },
        obturador: { type: 'string' },
        // Los efectos de sonido de la escena. --sin-sonidos para un video mudo (o solo con voz).
        'sin-sonidos': { type: 'boolean', default: false },
        'volumen-sonidos': { type: 'string', default: '1' },
        // srt (aparte, lo recomendado), quemados (en la imagen), ambos, no.
        subtitulos: { type: 'string', default: 'srt' },
        narrar: { type: 'boolean', default: false },
        voz: { type: 'string', default: join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? '.', '.local', 'share'), 'motor-animaciones', 'voces', 'es_AR-daniela-high.onnx') },
        // Cómo habla la voz. Los valores por defecto se eligieron de oído: con los
        // de Piper sola, el final de cada frase sonaba apurado y plano.
        //   pausado    más de 1: más despacio
        //   expresion  cuánto varía la entonación (Piper: noise_scale)
        //   ritmo      cuánto varía la duración de cada sonido (Piper: noise_w)
        //   silencio   segundos de pausa al terminar cada oración
        pausado: { type: 'string', default: '1.08' },
        expresion: { type: 'string', default: '0.72' },
        ritmo: { type: 'string', default: '0.9' },
        silencio: { type: 'string', default: '0.35' },
        desde: { type: 'string', default: '0' },
        hasta: { type: 'string' },
        calidad: { type: 'string', default: '20' },
        // Además del video, un GIF (para WhatsApp, una presentación, un mensaje).
        gif: { type: 'boolean', default: false },
        'gif-ancho': { type: 'string', default: '800' },
        'gif-fps': { type: 'string', default: '12' },
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

const info = await pagina.evaluate(async ({ i, tema, quemados, estilo }) => {
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
    if (estilo) m.setAttribute('estilo', estilo);
    m.pausar();
    // Rearmar ya, con el tamaño de pantalla completa (y su disposición).
    const antes = m.compilada;
    m.escena = m.escena;
    // Un estilo en un archivo llega después: se espera a que la escena se rearme con él.
    for (let k = 0; k < 100 && estilo && m.compilada === antes; k++) await new Promise((r) => setTimeout(r, 50));
    const c = m.compilada;
    const e = m.estiloResuelto ?? {};
    return {
        titulo: c.titulo, descripcion: c.descripcion, duracion: c.duracion, disposicion: c.disposicion,
        capitulos: c.capitulos, subtitulos: c.subtitulos, sonidos: c.sonidos, base: location.href,
        musica: c.musica ? { ...c.musica, archivo: new URL(c.musica.archivo, location.href).href } : null,
        video: e.video ?? {}, paquete: e.sonidos?.paquete ?? {}, volumenSonidos: e.sonidos?.volumenGeneral ?? 1,
    };
}, { i: Number(op.escena), tema: op.tema, quemados: ['quemados', 'ambos'].includes(op.subtitulos), estilo: op.estilo ?? '' });
await pagina.evaluate(() => document.fonts.ready);
// Las fuentes de Google pueden tardar un poco más que el aviso.
if (op.estilo) await pagina.waitForTimeout(400);

const desde = Number(op.desde);
const hasta = Math.min(op.hasta ? Number(op.hasta) : info.duracion, info.duracion);
const duracion = hasta - desde;
const total = Math.round(duracion * fps);
// Fotos por cuadro (1: sin desenfoque) y cuánto del cuadro queda abierto.
const fotos = Math.max(1, Math.round(Number(op.desenfoque ?? info.video.desenfoque ?? 1)));
const obturador = Math.min(Math.max(Number(op.obturador ?? info.video.obturador ?? 0.5), 0.05), 1);
console.log(`«${info.titulo}»: ${duracion.toFixed(1)} s, ${total} cuadros a ${fps} fps, ${op.ancho}×${op.alto} (${info.disposicion})` +
    `${op.estilo ? `, estilo ${op.estilo}` : ''}${fotos > 1 ? `, desenfoque de ${fotos} fotos por cuadro` : ''}.`);

// ---------------- La voz ----------------
const voces = op.narrar ? narrar(info.subtitulos.filter((s) => s.hasta > desde && s.desde < hasta)) : [];

// ---------------- Los efectos de sonido ----------------
// Todos mezclados acá en una sola pista: cien sonidos serían cien entradas
// de ffmpeg, y la línea de comandos de Windows no da para tanto.
const sonidos = op['sin-sonidos'] ? [] : info.sonidos.filter((s) => s.t >= desde && s.t < hasta);
let pistaSonidos = null;
if (sonidos.length) {
    const muestras = mezclarPista(sonidos, duracion + 1, {
        paquete: info.paquete, volumen: Number(op['volumen-sonidos']) * info.volumenSonidos, desde,
    });
    const cache = join(dirname(salida), '.voz');
    mkdirSync(cache, { recursive: true });
    pistaSonidos = join(cache, `sonidos-${createHash('sha1').update(JSON.stringify([sonidos, info.paquete, op['volumen-sonidos'], desde])).digest('hex').slice(0, 12)}.wav`);
    writeFileSync(pistaSonidos, aWav(muestras));
    console.log(`Sonidos: ${sonidos.length}.`);
}

// ---------------- ffmpeg ----------------
const argumentos = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * fotos), '-c:v', 'png', '-i', '-'];
const filtros = [];
// El video: con desenfoque, cada cuadro es el promedio de sus fotos (tmix) y
// de cada tanda queda uno solo (select), con el tiempo de un cuadro común.
let videoFinal = '0:v';
if (fotos > 1) {
    filtros.push(`[0:v]tmix=frames=${fotos},select='eq(mod(n\\,${fotos})\\,${fotos - 1})',setpts=N/(${fps}*TB)[v]`);
    videoFinal = '[v]';
}
let entrada = 1;
const pistas = [];
for (const v of voces) argumentos.push('-i', v.archivo);
if (voces.length) {
    // Cada voz entra cuando aparece su subtítulo (adelay, en milisegundos), y
    // se suman todas en una sola pista.
    voces.forEach((v, i) => filtros.push(`[${entrada + i}:a]adelay=${Math.round((v.desde - desde) * 1000)}:all=1[v${i}]`));
    filtros.push(`${voces.map((_, i) => `[v${i}]`).join('')}amix=inputs=${voces.length}:normalize=0:dropout_transition=0[voz]`);
    entrada += voces.length;
}
if (pistaSonidos) {
    argumentos.push('-i', pistaSonidos);
    pistas.push(`[${entrada}:a]`);
    entrada += 1;
}
if (info.musica) {
    // Da vueltas si es más corta que el video, y empieza donde empieza el tramo.
    argumentos.push('-stream_loop', '-1', '-i', info.musica.archivo);
    const vol = Number(info.musica.volumen ?? 0.3);
    filtros.push(`[${entrada}:a]atrim=start=${desde.toFixed(3)},asetpts=PTS-STARTPTS,volume=${vol}[musica0]`);
    if (voces.length) {
        // La música baja sola cuando habla la voz (el compresor escucha a la voz).
        filtros.push('[voz]asplit=2[vozSola][vozGuia]');
        filtros.push('[musica0][vozGuia]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[musica]');
    } else filtros.push('[musica0]anull[musica]');
    pistas.push('[musica]');
    entrada += 1;
}
if (voces.length) pistas.unshift(info.musica ? '[vozSola]' : '[voz]');
if (pistas.length > 1) filtros.push(`${pistas.join('')}amix=inputs=${pistas.length}:normalize=0:dropout_transition=0:duration=longest[audio]`);
const audioFinal = pistas.length === 0 ? null : pistas.length === 1 ? pistas[0] : '[audio]';
if (filtros.length) argumentos.push('-filter_complex', filtros.join(';'));
argumentos.push('-map', videoFinal);
if (audioFinal) {
    // Una entrada sin filtro se nombra "1:a", no "[1:a]".
    argumentos.push('-map', audioFinal.replace(/^\[(\d+:a)\]$/, '$1'), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000');
}
argumentos.push(
    // La salida, a los cuadros por segundo de siempre (la entrada, con
    // desenfoque, trae varias fotos por cuadro).
    '-r', String(fps),
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
    for (let k = 0; k < fotos; k++) {
        // Las fotos de un cuadro se reparten alrededor de su instante, en el
        // tramo que el obturador queda abierto.
        const tk = fotos > 1 ? t + (((k + 0.5) / fotos) - 0.5) * (obturador / fps) : t;
        await pagina.evaluate(({ i, t }) => document.querySelectorAll('motor-escena, motor-leccion')[i].irA(Math.max(0, t)), { i: Number(op.escena), t: tk });
        const cuadro = await pagina.screenshot({ type: 'png' });
        if (!proceso.stdin.write(cuadro)) await new Promise((r) => proceso.stdin.once('drain', r));
    }
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
// Sin capítulos es normal (una lección corta): solo se avisa si hay y no sirven.
if (capitulos.length) for (const p of yt.problemas) console.warn(`⚠️ Capítulos: ${p}`);

// ---------------- El GIF ----------------
// Sale del MP4, en dos pasadas: la primera arma una paleta de 256 colores con
// los que de verdad aparecen, la segunda la usa. Con la paleta genérica, los
// degradés y el texto chico quedarían manchados.
if (op.gif) {
    const gif = `${base}.gif`;
    const escala = `fps=${op['gif-fps']},scale=${op['gif-ancho']}:-1:flags=lanczos`;
    execFileSync(ffmpeg, [
        '-y', '-loglevel', 'error', '-i', salida,
        '-vf', `${escala},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
        gif,
    ]);
    console.log(`GIF → ${gif} (${(readFileSync(gif).length / 1024 / 1024).toFixed(1)} MB)`);
}

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
        const dicho = prepararParaVoz(s.texto);
        const ajustes = ['--length-scale', op.pausado, '--noise-scale', op.expresion, '--noise-w-scale', op.ritmo, '--sentence-silence', op.silencio];
        const clave = createHash('sha1').update(`${op.voz}|${ajustes.join(' ')}|${dicho}`).digest('hex').slice(0, 16);
        const archivo = join(cache, `${clave}.wav`);
        if (!existsSync(archivo)) {
            execFileSync(python, ['-m', 'piper', '-m', op.voz, ...ajustes, '-f', archivo, '--', dicho], { stdio: 'ignore' });
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

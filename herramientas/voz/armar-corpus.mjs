// Arma herramientas/voz/corpus.txt: las frases para grabar tu propia voz.
//
//     node herramientas/servir.js        (en otra terminal)
//     node herramientas/voz/armar-corpus.mjs
//
// Junta dos cosas: lo que dicen las escenas del motor (los subtítulos de los
// ejemplos, que es justo lo que la voz va a tener que leer después) y
// frases-propias.txt (lo que a esas les falta: la erre, la elle, preguntas,
// números). Cada frase pasa por prepararParaVoz, la misma función que usa
// video.js antes de narrar: así lo que se graba y lo que se narra están
// escritos igual.
//
// Cada frase tiene un id que sale de su texto, no de su lugar en la lista:
// si mañana se agregan escenas y se vuelve a armar, lo ya grabado sigue
// valiendo.

import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { prepararParaVoz } from '../lib/textos-video.js';

const BASE = 'http://localhost:4173';
// La Expo no: es de un solo evento, y sus frases no le enseñan nada nuevo a la voz.
const PAGINAS = ['conceptos', 'funciones-y-objetos', 'sql', 'tests', 'matematica', 'matematica-3d', 'estadistica', 'regresion', 'redes', 'vinculos', 'el-nino'];

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pagina = await navegador.newPage();
const subtitulos = [];
for (const p of PAGINAS) {
    await pagina.goto(`${BASE}/ejemplos/${p}/`);
    await pagina.waitForFunction(() => [...document.querySelectorAll('motor-escena, motor-leccion')].every((m) => m.compilada), null, { timeout: 30000 });
    subtitulos.push(...await pagina.evaluate(() => [...document.querySelectorAll('motor-escena, motor-leccion')]
        .flatMap((m) => m.compilada.subtitulos.map((s) => s.texto))));
}
await navegador.close();

// Un subtítulo puede tener varias oraciones: se graba de a una (las frases
// largas cuestan más de leer sin trabarse, y el entrenamiento las prefiere cortas).
const deEscenas = subtitulos.flatMap((s) => s.replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[¿¡A-ZÁÉÍÓÚÑ0-9])/)
    .map((f) => f.replace(/^Respuesta:\s*/, '')));

const propias = readFileSync(new URL('./frases-propias.txt', import.meta.url), 'utf-8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

// Lo que no se puede leer en voz alta sin dudar (código con paréntesis,
// fórmulas que quedaron con símbolos o letras griegas) no se graba.
const legible = (f) => f.length >= 6 && f.length <= 220 && !/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\d\s.,;:¿?¡!'%-]/.test(f);

const vistas = new Set();
const frases = [];
for (const [origen, lista] of [['propia', propias], ['escena', deEscenas]]) {
    for (const cruda of lista) {
        const f = prepararParaVoz(cruda);
        const clave = f.toLowerCase();
        if (!legible(f) || vistas.has(clave)) continue;
        vistas.add(clave);
        frases.push({ id: createHash('sha1').update(f).digest('hex').slice(0, 8), f, origen });
    }
}

// Mezcladas, pero siempre igual (el orden sale del id): una tanda de
// grabación no es toda de preguntas ni toda de números.
frases.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(new URL('./corpus.txt', import.meta.url), frases.map(({ id, f }) => `${id}|${f}`).join('\n') + '\n');

const minutos = frases.reduce((s, { f }) => s + f.length / 14, 0) / 60;
console.log(`${frases.length} frases (${frases.filter((x) => x.origen === 'propia').length} propias), unos ${Math.round(minutos)} minutos leídas a ritmo tranquilo.`);

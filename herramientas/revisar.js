// Revisa los ejemplos (o una página) y avisa qué se tapa: subtítulos que caen
// encima de algo en pantalla completa, y textos que se pisan entre sí.
//
//     node herramientas/servir.js            (en otra terminal)
//     npm run revisar                        todos los ejemplos
//     npm run revisar -- --url ejemplos/expo/pantalla.html
//
// Revisa cada escena en su disposición ancha (una pantalla de 1600 × 900):
// es donde los subtítulos van encima del dibujo. En un celular parado, en
// pantalla completa, el subtítulo cae en el lugar que sobra abajo del dibujo.
// Los tamaños son estimados: es un aviso para mirar, no un error. Un subtítulo que tapa algo pero tiene un lugar libre más arriba
// no es grave: en pantalla completa sube solo.

import { chromium } from '@playwright/test';
import { readdirSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: op } = parseArgs({
    options: {
        url: { type: 'string' },
        base: { type: 'string', default: 'http://localhost:4173' },
    },
});

const paginas = op.url
    ? [op.url.replace(/^\/+/, '')]
    : readdirSync('ejemplos', { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(`ejemplos/${d.name}/index.html`) && !['tests', 'editor'].includes(d.name))
        .map((d) => `ejemplos/${d.name}/`)
        .concat('ejemplos/expo/pantalla.html');

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let avisos = 0;
let graves = 0;
for (const [nombre, tamano] of [['ancha', { width: 1600, height: 900 }]]) {
    const pagina = await navegador.newPage({ viewport: tamano });
    for (const url of paginas) {
        await pagina.goto(`${op.base}/${url}`);
        await pagina.waitForFunction(() => [...document.querySelectorAll('motor-escena, motor-leccion')].every((m) => m.compilada), null, { timeout: 30000 })
            .catch(() => {});
        const r = await pagina.evaluate(() => [...document.querySelectorAll('motor-escena, motor-leccion')].map((m) => {
            const c = m.compilada;
            if (!c) return null;
            const revision = Motor.revisarSuperposiciones(c);
            return {
                texto: Motor.describirSuperposiciones(revision, `«${c.titulo || m.getAttribute('escena')}»`),
                graves: revision.subtitulos.filter((s) => !s.libre).length + revision.textos.length,
                cuantos: revision.subtitulos.length + revision.textos.length,
            };
        }).filter(Boolean));
        for (const e of r) {
            if (!e.texto) continue;
            console.log(`\n[${nombre}] ${url}\n${e.texto}`);
            avisos += e.cuantos;
            graves += e.graves;
        }
    }
    await pagina.close();
}
await navegador.close();
console.log(avisos
    ? `\n${avisos} avisos; ${graves} sin arreglo automático (los subtítulos que suben solos no cuentan).`
    : '\nNada se tapa.');

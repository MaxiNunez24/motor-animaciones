// Saca cuadros de una escena: uno por cada instante, a los cuadros por segundo
// que se pidan. Es el primer paso del render a video (fase 4) y ya sirve para
// armar GIFs y capturas de revisión.
//
//     node herramientas/capturar.js --url /ejemplos/prueba.html --fps 12 --ancho 960
//
// Como el estado depende solo de t, no hace falta "grabar la pantalla": se
// pone la escena en cada instante y se le saca una foto. Un cuadro que tarda
// en dibujarse no se pierde ni sale movido.

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: op } = parseArgs({
    options: {
        url: { type: 'string', default: '/ejemplos/prueba.html' },
        base: { type: 'string', default: 'http://localhost:4173' },
        salida: { type: 'string', default: 'salida/cuadros' },
        fps: { type: 'string', default: '12' },
        ancho: { type: 'string', default: '960' },
        alto: { type: 'string', default: '700' },
        tema: { type: 'string', default: 'claro' },
        desde: { type: 'string', default: '0' },
        hasta: { type: 'string' },
        escala: { type: 'string', default: '1' },
    },
});

const navegador = await chromium.launch();
const pagina = await navegador.newPage({
    viewport: { width: Number(op.ancho), height: Number(op.alto) },
    deviceScaleFactor: Number(op.escala),
});
await pagina.goto(op.base + op.url);
await pagina.waitForFunction(() => document.querySelector('motor-escena')?.compilada);
const duracion = await pagina.evaluate((tema) => {
    const m = document.querySelector('motor-escena');
    m.setAttribute('tema', tema);
    m.pausar();
    return m.duracion;
}, op.tema);
// Las fuentes (y los emojis) tienen que estar cargados antes de la primera foto.
await pagina.evaluate(() => document.fonts.ready);

await mkdir(op.salida, { recursive: true });
const escena = pagina.locator('motor-escena');
const fps = Number(op.fps);
const desde = Number(op.desde);
const hasta = op.hasta ? Number(op.hasta) : duracion;
const total = Math.floor((hasta - desde) * fps) + 1;
for (let i = 0; i < total; i++) {
    // El instante sale de multiplicar, no de ir sumando 1/fps: sumando, los
    // errores de redondeo se acumulan y el cuadro 300 cae un poquito corrido.
    const t = desde + i / fps;
    await pagina.evaluate((t) => document.querySelector('motor-escena').irA(t), t);
    await escena.screenshot({ path: join(op.salida, `cuadro-${String(i).padStart(5, '0')}.png`) });
}
await navegador.close();
console.log(`${total} cuadros en ${op.salida} (${(hasta - desde).toFixed(1)} s a ${fps} fps)`);

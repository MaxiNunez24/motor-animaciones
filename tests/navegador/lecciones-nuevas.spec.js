// Las páginas nuevas: funciones y objetos, SQL, tests animados y el editor.

import { test, expect } from '@playwright/test';

async function abrir(page, url) {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.goto(url);
    await page.waitForFunction(() => [...document.querySelectorAll('motor-leccion')].every((m) => m.compilada));
    await page.evaluate(() => document.querySelectorAll('motor-leccion').forEach((m) => m.pausar()));
    return errores;
}

for (const [pagina, cuantas] of [['/ejemplos/funciones-y-objetos/', 4], ['/ejemplos/sql/', 2], ['/ejemplos/tests/', 1]]) {
    test(`${pagina}: las lecciones se arman y se recorren sin errores`, async ({ page }) => {
        const errores = await abrir(page, pagina);
        const n = await page.evaluate(() => {
            const todas = [...document.querySelectorAll('motor-leccion')];
            for (const m of todas) for (let t = 0; t <= m.duracion; t += 0.5) m.irA(t);
            return todas.length;
        });
        expect(n).toBe(cuantas);
        expect(errores).toEqual([]);
    });

    test(`${pagina}: en un celular de 360px entra todo`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 740 });
        await abrir(page, pagina);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    });
}

test('la recursión: la pila llega a cuatro llamadas y se vacía al final', async ({ page }) => {
    await abrir(page, '/ejemplos/funciones-y-objetos/');
    const { maximo, alFinal } = await page.locator('motor-leccion').nth(1).evaluate((m) => {
        let maximo = 0;
        for (let t = 0; t <= m.duracion; t += 0.25) maximo = Math.max(maximo, m.compilada.estado(t).piezas.pila.marcos.length);
        return { maximo, alFinal: m.compilada.estado(m.duracion).piezas.pila.marcos.length };
    });
    expect(maximo).toBe(4);
    expect(alFinal).toBe(0);
});

test('la tabla del resultado de SQL termina con lo que devuelve la consulta', async ({ page }) => {
    await abrir(page, '/ejemplos/sql/');
    const filas = await page.locator('motor-leccion').first().evaluate((m) => m.compilada.estado(m.duracion).piezas.destino.filas);
    expect(filas).toEqual([['Diego', '14'], ['Lucía', '12'], ['Sofía', '9']]);
});

test('los tests: el primero falla con "esperaba 50, y dio 0", y al final todos pasan', async ({ page }) => {
    await abrir(page, '/ejemplos/tests/');
    const l = page.locator('motor-leccion');
    const { detalles, final } = await l.evaluate((m) => {
        const detalles = new Set();
        for (let t = 0; t <= m.duracion; t += 0.25) detalles.add(m.compilada.estado(t).piezas.detalle.texto);
        return { detalles: [...detalles], final: m.compilada.estado(m.duracion).piezas.resumen.texto };
    });
    expect(detalles.some((d) => d.includes('esperaba 50, y dio 0'))).toBe(true);
    expect(final).toBe('3 de 3: todos pasan');
});

test.describe('el editor de escenas', () => {
    test('todas las plantillas se arman sin errores', async ({ page }) => {
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        await page.goto('/ejemplos/editor/');
        await page.waitForFunction(() => document.getElementById('vista').compilada);
        const nombres = await page.evaluate(() => Object.keys(window.PLANTILLAS));
        for (const nombre of nombres) {
            await page.selectOption('#plantilla', nombre);
            await expect(page.locator('#error')).toBeHidden();
            await expect(page.locator('#estado')).toContainText('Lista');
        }
        expect(errores).toEqual([]);
    });

    test('un error se explica al lado del código, y la vista se queda con la última que anduvo', async ({ page }) => {
        await page.goto('/ejemplos/editor/');
        await page.evaluate(() => { try { localStorage.clear(); } catch { /* sin almacenamiento */ } });
        await page.reload();
        await page.waitForFunction(() => document.getElementById('vista').compilada);
        await page.evaluate(() => {
            const e = document.getElementById('codigo');
            e.value = e.value.replace("texto: 'Una idea'", "texot: 'Una idea'");
            e.dispatchEvent(new Event('input'));
        });
        await expect(page.locator('#error')).toContainText('Una caja no tiene "texot"');
        expect(await page.evaluate(() => Boolean(document.getElementById('vista').compilada))).toBe(true);
    });

    test('Tab escribe cuatro espacios', async ({ page }) => {
        await page.goto('/ejemplos/editor/');
        await page.waitForFunction(() => document.getElementById('vista').compilada);
        await page.evaluate(() => { const e = document.getElementById('codigo'); e.focus(); e.setSelectionRange(0, 0); });
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.getElementById('codigo').value.slice(0, 4))).toBe('    ');
    });

    test('"Bajar el .html" arma una página completa, con la escena adentro', async ({ page }) => {
        await page.goto('/ejemplos/editor/');
        await page.waitForFunction(() => document.getElementById('vista').compilada);
        const html = await page.evaluate(() => window.comoPagina());
        expect(html).toContain('cdn.jsdelivr.net/gh/MaxiNunez24/motor-animaciones@v');
        expect(html).toContain("Motor.registrar('mi-escena'");
        expect(html).toContain('const { ');
    });
});

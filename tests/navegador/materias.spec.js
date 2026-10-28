// Las páginas de matemática (2D y 3D), estadística, regresión y redes, en un navegador de verdad:
// que todas las lecciones se dibujen y se recorran enteras sin errores.

import { test, expect } from '@playwright/test';

async function abrir(page, url) {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.goto(url);
    await page.waitForFunction(() => [...document.querySelectorAll('motor-leccion')].every((m) => m.compilada), null, { timeout: 30000 });
    await page.evaluate(() => document.querySelectorAll('motor-leccion').forEach((m) => m.pausar()));
    return errores;
}

for (const [pagina, cuantas] of [
    ['/ejemplos/matematica/', 9], ['/ejemplos/matematica-3d/', 4], ['/ejemplos/redes/', 9],
    ['/ejemplos/estadistica/', 4], ['/ejemplos/regresion/', 6],
]) {
    test(`${pagina}: las lecciones se dibujan y se recorren sin errores`, async ({ page }) => {
        test.setTimeout(90000);
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
        expect(await page.evaluate(() => document.querySelector('motor-leccion').compilada.disposicion)).toBe('angosta');
    });
}

test('la derivada: al final la tangente está dibujada, y la secante ya no', async ({ page }) => {
    await abrir(page, '/ejemplos/matematica/');
    const leccion = page.locator('motor-leccion').first();
    await leccion.evaluate((m) => m.irA(m.duracion));
    const visibles = await leccion.evaluate((m) => {
        const raiz = m.shadowRoot;
        const visible = (id) => {
            const g = raiz.querySelector(`[data-pieza="${id}"]`);
            return g && getComputedStyle(g).opacity !== '0' && g.querySelector('path:not([visibility="hidden"])') !== null;
        };
        return { tangente: visible('tangente'), secante: raiz.querySelector('[data-pieza="secante"]').getAttribute('opacity') };
    });
    expect(visibles.tangente).toBe(true);
    expect(Number(visibles.secante)).toBe(0);
});

test('la superficie 3D dibuja algo en el lienzo (no queda vacío)', async ({ page }) => {
    await abrir(page, '/ejemplos/matematica-3d/');
    const leccion = page.locator('motor-leccion').first();
    await leccion.evaluate((m) => m.irA(3));
    const pintados = await leccion.evaluate((m) => {
        const lienzo = m.shadowRoot.querySelector('canvas');
        const copia = document.createElement('canvas');
        copia.width = 64;
        copia.height = 64;
        const ctx = copia.getContext('2d');
        ctx.drawImage(lienzo, 0, 0, 64, 64);
        const datos = ctx.getImageData(0, 0, 64, 64).data;
        let n = 0;
        for (let i = 3; i < datos.length; i += 4) if (datos[i] > 0) n++;
        return n;
    });
    expect(pintados).toBeGreaterThan(400);
});

test('Go-Back-N: el paquete perdido lleva su cruz, y al final la ventana confirmó todo', async ({ page }) => {
    await abrir(page, '/ejemplos/redes/');
    const leccion = page.locator('motor-leccion').nth(5);
    await leccion.evaluate((m) => m.irA(m.duracion));
    const { cruces, base } = await leccion.evaluate((m) => ({
        cruces: [...m.shadowRoot.querySelectorAll('[data-pieza="diagrama"] text')].filter((t) => t.textContent === '✗' && t.getAttribute('visibility') !== 'hidden').length,
        base: m.compilada.estado(m.duracion).piezas.ventana.base,
    }));
    expect(cruces).toBe(1);
    expect(base).toBe(7);
});

test('el test que rechaza: al final dice que se rechaza H₀ y el p-valor es chico', async ({ page }) => {
    await abrir(page, '/ejemplos/estadistica/');
    const textos = await page.locator('motor-leccion').nth(3).evaluate((m) => {
        const fin = m.compilada.estado(m.duracion).piezas;
        return [fin.decision.texto, fin.pvalor.texto];
    });
    expect(textos[0]).toBe('Se rechaza H₀');
    expect(textos[1]).toMatch(/p-valor = 0,00/);
});

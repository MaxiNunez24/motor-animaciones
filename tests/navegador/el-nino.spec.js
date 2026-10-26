// El Niño, con el globo 3D: que se dibuje, que sea determinista como todo lo
// demás, y que en una compu sin 3D no se rompa.

import { test, expect, chromium } from '@playwright/test';

async function abrir(page) {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.goto('/ejemplos/el-nino/');
    await page.waitForFunction(() => document.querySelector('motor-leccion')?.compilada);
    await page.evaluate(() => document.querySelector('motor-leccion').pausar());
    return errores;
}

const leccion = (page) => page.locator('motor-leccion');

test('se arma con el globo en 3D y se recorre entera sin errores', async ({ page }) => {
    const errores = await abrir(page);
    // En t = 0 el globo todavía no apareció: aparece con un fundido.
    await leccion(page).evaluate((m) => m.irA(10));
    await expect(leccion(page).locator('foreignObject canvas')).toBeVisible();
    await page.evaluate(() => {
        const m = document.querySelector('motor-leccion');
        for (let t = 0; t <= m.duracion; t += 1) m.irA(t);
    });
    expect(errores).toEqual([]);
});

test('cuenta la historia en orden, y pregunta antes de mostrar El Niño', async ({ page }) => {
    await abrir(page);
    const { capitulos, pregunta, conNino } = await page.evaluate(() => {
        const c = document.querySelector('motor-leccion').compilada;
        return {
            capitulos: c.capitulos.map((x) => x.nombre),
            pregunta: c.marcas.find((m) => m.tipo === 'pregunta'),
            conNino: c.capitulos.find((x) => x.nombre === 'Con El Niño').t,
        };
    });
    expect(capitulos).toEqual(['¿Qué es El Niño?', 'Un año normal', 'Con El Niño', '¿Y en la Argentina?', 'Qué esperar en 2026']);
    expect(pregunta.datos.opciones[pregunta.datos.correcta]).toBe('Se corre hacia Sudamérica');
    expect(pregunta.t).toBeLessThan(conNino);
});

test('el globo 3D también es determinista: el mismo instante se ve igual', async ({ page }) => {
    await abrir(page);
    const l = leccion(page);
    await l.evaluate((m) => m.irA(84));
    const una = await l.screenshot();
    await l.evaluate((m) => { m.irA(10); m.irA(100); m.irA(84); });
    expect((await l.screenshot()).equals(una)).toBe(true);
});

test('los datos de 2026 dicen de dónde salen', async ({ page }) => {
    await abrir(page);
    const texto = await leccion(page).evaluate((m) => { m.irA(m.duracion); return m.shadowRoot.querySelector('svg').textContent; });
    expect(texto).toContain('NOAA CPC (8/10/2026)');
    expect(texto).toContain('SMN');
    expect(texto).toContain('esquemas, no datos medidos');
    // No es solo el Litoral: el SMN también espera más lluvia en la Patagonia norte.
    expect(texto).toContain('Patagonia');
});

test('en un celular de 360px usa la disposición angosta y entra todo', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await abrir(page);
    expect(await leccion(page).evaluate((m) => m.compilada.disposicion)).toBe('angosta');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('sin 3D en el navegador, avisa y el resto de la escena sigue andando', async () => {
    const navegador = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
    const page = await navegador.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await page.goto('http://localhost:4173/ejemplos/el-nino/');
    await page.waitForFunction(() => document.querySelector('motor-leccion')?.compilada);
    await page.evaluate(() => { const m = document.querySelector('motor-leccion'); m.pausar(); m.irA(10); });
    await expect(page.locator('motor-leccion').getByText('Este navegador no muestra 3D')).toBeVisible();
    await page.evaluate(() => document.querySelector('motor-leccion').irA(30));
    // El corte (que es SVG, no 3D) se sigue viendo.
    await expect(page.locator('motor-leccion svg text').filter({ hasText: /^agua cálida$/ })).toBeVisible();
    expect(errores).toEqual([]);
    await navegador.close();
});

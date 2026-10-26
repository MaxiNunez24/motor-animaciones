// Las lecciones: que frenen a preguntar, que se puedan contestar, y que el paso
// a paso vaya de a un paso.

import { test, expect } from '@playwright/test';

async function abrir(page) {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.goto('/ejemplos/conceptos/');
    await page.waitForFunction(() => [...document.querySelectorAll('motor-leccion')].every((m) => m.compilada));
    await page.evaluate(() => document.querySelectorAll('motor-leccion').forEach((m) => m.pausar()));
    return errores;
}

const leccion = (page, i = 0) => page.locator('motor-leccion').nth(i);

test('las tres lecciones se arman y se recorren sin errores', async ({ page }) => {
    const errores = await abrir(page);
    await page.evaluate(() => {
        for (const m of document.querySelectorAll('motor-leccion')) {
            for (let t = 0; t <= m.duracion; t += 0.25) m.irA(t);
        }
    });
    expect(errores).toEqual([]);
});

test('frena antes de mostrar la respuesta, y pregunta', async ({ page }) => {
    await abrir(page);
    const l = leccion(page);
    const qt = await l.evaluate((m) => {
        const q = m.compilada.marcas.find((x) => x.tipo === 'pregunta');
        m.irA(q.t - 0.3);
        m.reproducir();
        return q.t;
    });
    await expect(l.getByText('Pensalo antes de seguir')).toBeVisible();
    expect(await l.evaluate((m) => ({ t: m.t, corriendo: m.corriendo }))).toEqual({ t: qt, corriendo: false });
    // Con la pregunta abierta, el espacio no la saltea.
    await page.keyboard.press('Space');
    expect(await l.evaluate((m) => m.corriendo)).toBe(false);
});

test('al contestar dice si estuvo bien, y "Seguir" continúa', async ({ page }) => {
    await abrir(page);
    const l = leccion(page);
    const respuestas = [];
    await page.exposeFunction('anotar', (d) => respuestas.push(d));
    await l.evaluate((m) => {
        m.addEventListener('respuesta', (e) => window.anotar(e.detail));
        const q = m.compilada.marcas.find((x) => x.tipo === 'pregunta');
        m.irA(q.t - 0.2);
        m.reproducir();
    });
    await l.getByRole('button', { name: '27' }).click();
    await expect(l.getByText('¡Bien!')).toBeVisible();
    expect(respuestas).toEqual([expect.objectContaining({ elegida: 1, correcta: 1, bien: true })]);

    await l.getByRole('button', { name: 'Seguir' }).click();
    await expect(l.getByText('Pensalo antes de seguir')).toBeHidden();
    expect(await l.evaluate((m) => m.corriendo)).toBe(true);
});

test('una respuesta equivocada muestra cuál era la correcta', async ({ page }) => {
    await abrir(page);
    const l = leccion(page);
    await l.evaluate((m) => {
        const q = m.compilada.marcas.find((x) => x.tipo === 'pregunta');
        m.irA(q.t - 0.2);
        m.reproducir();
    });
    await l.getByRole('button', { name: '15' }).click();
    await expect(l.getByText('No era esa.')).toBeVisible();
    await expect(l.getByRole('button', { name: '27' })).toHaveClass(/correcta/);
});

test('paso a paso: frena al final de cada paso, y ⏭ va al siguiente', async ({ page }) => {
    await abrir(page);
    const l = leccion(page);
    await l.getByRole('button', { name: 'Paso a paso' }).click();
    await expect(l.getByRole('button', { name: 'Paso a paso' })).toHaveAttribute('aria-pressed', 'true');
    const pasos = await l.evaluate((m) => m.compilada.marcas.filter((x) => x.tipo === 'paso').map((x) => x.t));

    // Arranca un poco antes del primer paso: así no depende de lo rápida que
    // sea la compu (con ocho navegadores a la vez, el reloj va más lento).
    await l.evaluate((m, t) => { m.irA(t - 0.3); m.reproducir(); }, pasos[0]);
    await expect.poll(() => l.evaluate((m) => m.corriendo)).toBe(false);
    expect(await l.evaluate((m) => m.t)).toBe(pasos[0]);

    await l.getByRole('button', { name: 'Paso siguiente' }).click();
    expect(await l.evaluate((m) => m.t)).toBe(pasos[1]);
    await l.getByRole('button', { name: 'Paso anterior' }).click();
    expect(await l.evaluate((m) => m.t)).toBe(pasos[0]);
});

test('en modo video no frena: la pregunta es un cartel durante su tramo', async ({ page }) => {
    await abrir(page);
    const l = leccion(page);
    await l.evaluate((m) => m.setAttribute('video', ''));
    const { t, hasta } = await l.evaluate((m) => {
        const q = m.compilada.marcas.find((x) => x.tipo === 'pregunta');
        return { t: q.t, hasta: q.hasta };
    });
    await l.evaluate((m, t) => m.irA(t + 0.5), t);
    await expect(l.getByText('Pausá y pensalo')).toBeVisible();
    await expect(l.getByRole('button', { name: '27' })).toBeDisabled();
    await l.evaluate((m, t) => m.irA(t + 0.1), hasta);
    await expect(l.getByText('Pensalo antes de seguir')).toBeHidden();
    // Y reproducir pasa de largo.
    await l.evaluate((m, t) => { m.irA(t - 0.2); m.reproducir(); }, t);
    await page.waitForTimeout(500);
    expect(await l.evaluate((m) => m.corriendo)).toBe(true);
});

test('en un celular de 360px entra todo, sin correrse de costado', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await abrir(page);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(sobra).toBe(0);
    expect(await leccion(page).evaluate((m) => m.compilada.disposicion)).toBe('angosta');
});

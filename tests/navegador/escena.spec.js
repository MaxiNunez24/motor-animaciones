// La escena de prueba, abierta en un navegador de verdad.

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Espera a que la escena esté armada y la deja quieta en el instante t.
async function abrirEn(page, t, url = '/ejemplos/prueba.html') {
    await page.goto(url);
    await page.waitForFunction(() => document.querySelector('motor-escena')?.compilada);
    // Las fuentes (y la de los emojis) tienen que estar cargadas: si no, con la
    // compu cargada, la primera captura sale sin el emoji y la segunda con él.
    // Se recorre toda la escena antes, porque una fuente se pide recién cuando
    // aparece en pantalla el primer texto que la usa.
    await page.evaluate(async () => {
        const m = document.querySelector('motor-escena');
        for (let t = 0; t <= m.duracion; t += 0.5) m.irA(t);
        await document.fonts.ready;
    });
    await page.evaluate((t) => {
        const m = document.querySelector('motor-escena');
        m.pausar();
        m.irA(t);
    }, t);
    return page.locator('motor-escena');
}

test('se dibuja sin errores', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    const escena = await abrirEn(page, 10);
    await expect(escena.locator('[data-pieza="pedidos"]')).toBeVisible();
    expect(errores).toEqual([]);
});

test('el mismo instante se ve exactamente igual, llegue como llegue', async ({ page }) => {
    const escena = await abrirEn(page, 9);
    const directo = await escena.screenshot();

    // Ahora se llega al mismo instante después de reproducir un rato y de
    // saltar para adelante y para atrás.
    await page.evaluate(() => {
        const m = document.querySelector('motor-escena');
        m.irA(0);
        m.reproducir();
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
        const m = document.querySelector('motor-escena');
        m.pausar();
        m.irA(13);
        m.irA(2);
        m.irA(9);
    });
    const despues = await escena.screenshot();
    expect(despues.equals(directo)).toBe(true);
});

test('se ve como la captura de referencia', async ({ page }) => {
    const escena = await abrirEn(page, 10);
    await expect(escena).toHaveScreenshot('pedido-ancha-t10.png');
});

test('en un celular de 360px usa la disposición angosta y no se sale de la pantalla', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await abrirEn(page, 10);
    const { disposicion, sobra } = await page.evaluate(() => ({
        disposicion: document.querySelector('motor-escena').compilada.disposicion,
        sobra: document.documentElement.scrollWidth - innerWidth,
    }));
    expect(disposicion).toBe('angosta');
    expect(sobra).toBe(0);
});

test('respeta prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrirEn(page, 1);
    const movimiento = await page.evaluate(() => document.querySelector('motor-escena').compilada.movimiento);
    expect(movimiento).toBe('reducido');
});

test('sigue el tema del sitio (data-theme, como Starlight) y el del sistema', async ({ page }) => {
    const escena = await abrirEn(page, 1);
    const tema = () => escena.evaluate((m) => m.shadowRoot.querySelector('.ma-raiz').dataset.tema);
    expect(await tema()).toBe('claro');
    await page.getByRole('button', { name: 'Página oscura' }).click();
    await expect.poll(tema).toBe('oscuro');
    await page.getByRole('button', { name: 'Como el sistema' }).click();
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(tema).toBe('oscuro');
});

test('los controles: reproducir, pausar y saltar de capítulo', async ({ page }) => {
    const escena = await abrirEn(page, 0);
    const boton = escena.getByRole('button', { name: 'Reproducir' });
    await boton.click();
    await expect(escena.getByRole('button', { name: 'Pausar' })).toBeVisible();
    await escena.getByRole('button', { name: 'Pausar' }).click();

    await escena.getByRole('button', { name: 'Capítulo siguiente' }).click();
    const { t, capitulo } = await page.evaluate(() => {
        const m = document.querySelector('motor-escena');
        return { t: m.t, capitulo: m.compilada.capitulos[1].t };
    });
    expect(t).toBeCloseTo(capitulo, 5);
    await expect(escena.getByText('2/3 · Viaja a la cocina')).toBeVisible();
});

test('con el teclado: espacio reproduce, la coma y el punto van cuadro por cuadro', async ({ page }) => {
    const escena = await abrirEn(page, 5);
    await escena.evaluate((m) => m.shadowRoot.querySelector('.ma-lienzo').focus());
    await page.keyboard.press('.');
    expect(await page.evaluate(() => document.querySelector('motor-escena').t)).toBeCloseTo(5 + 1 / 30, 5);
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => document.querySelector('motor-escena').corriendo)).toBe(true);
});

test('anda abriendo el archivo con doble clic (file://)', async ({ page }) => {
    const archivo = pathToFileURL(resolve('ejemplos/prueba.html')).href;
    const escena = await abrirEn(page, 10, archivo);
    await expect(escena.locator('[data-pieza="cel"]')).toBeVisible();
});

test('tiene un texto alternativo con los capítulos y lo que se cuenta', async ({ page }) => {
    const escena = await abrirEn(page, 0);
    await expect(escena.getByRole('img', { name: 'Un pedido de empanadas' })).toBeVisible();
    const descripcion = await escena.evaluate((m) => m.shadowRoot.querySelector('#ma-descripcion').textContent);
    expect(descripcion).toContain('Capítulos: 1. El pedido; 2. Viaja a la cocina; 3. Queda anotado.');
    expect(descripcion).toContain('Alguien arma su pedido desde el celular.');
});

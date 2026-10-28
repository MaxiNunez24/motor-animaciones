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
    // Los controles flotantes aparecen y se esconden según el mouse y un
    // temporizador: acá se los deja fijos, porque lo que se compara es el dibujo.
    await escena.evaluate((m) => m.setAttribute('controles-fijos', ''));
    // Las transiciones (los controles que aparecen al pausar) se dan por
    // terminadas: lo que se compara es el dibujo, no un fundido a medias.
    const directo = await escena.screenshot({ animations: 'disabled' });

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
    const despues = await escena.screenshot({ animations: 'disabled' });
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

test('el zoom: los botones acercan y vuelven, y arrastrar mueve la vista sin pausar', async ({ page }) => {
    const escena = await abrirEn(page, 5);
    const vista = () => escena.evaluate((m) => m.shadowRoot.querySelector('svg').getAttribute('viewBox'));
    expect(await vista()).toBe('0 0 1600 900');
    await escena.getByRole('button', { name: 'Acercar' }).click();
    const [vx, vy, vw, vh] = (await vista()).split(' ').map(Number);
    expect(vw).toBeCloseTo(1600 / 1.5, 1);
    expect(vh).toBeCloseTo(900 / 1.5, 1);
    expect(vx).toBeCloseTo((1600 - 1600 / 1.5) / 2, 1);
    expect(vy).toBeCloseTo((900 - 900 / 1.5) / 2, 1);
    await expect(escena.getByRole('button', { name: 'Volver al tamaño normal' })).toHaveText('1,5×');
    const caja = await escena.boundingBox();
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 3);
    await page.mouse.down();
    await page.mouse.move(caja.x + caja.width / 2 - 120, caja.y + caja.height / 3, { steps: 6 });
    await page.mouse.up();
    const [x] = (await vista()).split(' ').map(Number);
    expect(x).toBeGreaterThan((1600 - 1600 / 1.5) / 2);
    expect(await page.evaluate(() => document.querySelector('motor-escena').corriendo)).toBe(false);
    await escena.getByRole('button', { name: 'Volver al tamaño normal' }).click();
    expect(await vista()).toBe('0 0 1600 900');
});

test('los controles flotan y se esconden mientras corre, y vuelven al mover el mouse', async ({ page }) => {
    const escena = await abrirEn(page, 0);
    const clases = () => escena.evaluate((m) => m.shadowRoot.querySelector('.ma-raiz').className);
    expect(await clases()).toContain('flotantes');
    await escena.evaluate((m) => m.reproducir());
    await page.mouse.move(1, 1);
    await expect.poll(clases, { timeout: 5000 }).not.toContain('ver-controles');
    const caja = await escena.boundingBox();
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await expect.poll(clases).toContain('ver-controles');
    await escena.evaluate((m) => m.setAttribute('controles-fijos', ''));
    expect(await clases()).not.toContain('flotantes');
});

test('en pantalla completa, el subtítulo va encima del dibujo y no lo achica', async ({ page }) => {
    const escena = await abrirEn(page, 2);
    await escena.evaluate((m) => m.setAttribute('pantalla', ''));
    const medidas = await escena.evaluate((m) => {
        const r = m.shadowRoot;
        return {
            lienzo: r.querySelector('.ma-lienzo').getBoundingClientRect().height,
            alto: innerHeight,
            encuadre: r.querySelector('svg').getAttribute('preserveAspectRatio'),
        };
    });
    expect(medidas.lienzo).toBeCloseTo(medidas.alto, 0);
    expect(medidas.encuadre).toBe('xMidYMin meet');
});

test('al hacer zoom, el botón de volver aparece a la izquierda y no corre al − ni al +', async ({ page }) => {
    const escena = await abrirEn(page, 2);
    const lugares = () => escena.evaluate((m) => ['alejar', 'acercar'].map((z) => {
        const r = m.shadowRoot.querySelector(`[data-zoom="${z}"]`).getBoundingClientRect();
        return Math.round(r.x);
    }));
    await page.mouse.move(300, 200);
    const antes = await lugares();
    await escena.evaluate((m) => m.shadowRoot.querySelector('[data-zoom="acercar"]').click());
    await escena.evaluate((m) => m.shadowRoot.querySelector('[data-zoom="acercar"]').click());
    expect(await lugares()).toEqual(antes);
    const normal = await escena.evaluate((m) => m.shadowRoot.querySelector('[data-zoom="normal"]').getBoundingClientRect().right);
    expect(normal).toBeLessThanOrEqual(antes[0]);
});

test('la rueda hace zoom solo en pantalla completa; en la página baja por la página', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 500 });
    const escena = await abrirEn(page, 2);
    const caja = await escena.boundingBox();
    const vista = () => escena.evaluate((m) => m.shadowRoot.querySelector('svg').getAttribute('viewBox'));
    const antes = await vista();
    await page.mouse.move(caja.x + caja.width / 2, caja.y + 100);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    expect(await vista()).toBe(antes);
    // Con Ctrl tampoco: es el zoom de la página entera, no el de la escena.
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -200);
    await page.keyboard.up('Control');
    expect(await vista()).toBe(antes);

    await escena.evaluate((m) => m.setAttribute('pantalla', ''));
    await page.mouse.move(500, 250);
    await page.mouse.wheel(0, -300);
    await expect.poll(vista).not.toBe(antes);
});

test('en pantalla completa el mouse se esconde al quedarse quieto, aunque esté en pausa', async ({ page }) => {
    const escena = await abrirEn(page, 2);
    await escena.evaluate((m) => m.setAttribute('pantalla', ''));
    const sinCursor = () => escena.evaluate((m) => m.shadowRoot.querySelector('.ma-raiz').classList.contains('sin-cursor'));
    await page.mouse.move(400, 300);
    await page.mouse.move(420, 310);
    expect(await sinCursor()).toBe(false);
    expect(await escena.evaluate((m) => m.corriendo)).toBe(false);
    await expect.poll(sinCursor, { timeout: 5000 }).toBe(true);
    await page.mouse.move(430, 320);
    expect(await sinCursor()).toBe(false);
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

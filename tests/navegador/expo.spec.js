// La escena de la Expo: lo que tiene que cumplir para la pantalla grande y
// para el celular.

import { test, expect } from '@playwright/test';

async function abrir(page, url = '/ejemplos/expo/pantalla.html') {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.goto(url);
    await page.waitForFunction(() => document.querySelector('motor-escena')?.compilada);
    await page.evaluate(() => document.querySelector('motor-escena').pausar());
    return errores;
}

// Recorre toda la escena de a medio segundo y junta todo el texto que se ve:
// el del dibujo y el de los subtítulos.
async function textoDeToda(page) {
    return page.evaluate(() => {
        const m = document.querySelector('motor-escena');
        const vistos = new Set();
        for (let t = 0; t <= m.duracion; t += 0.5) {
            m.irA(t);
            vistos.add(m.shadowRoot.querySelector('svg').textContent);
            vistos.add(m.shadowRoot.querySelector('.ma-subtitulo').textContent);
        }
        vistos.add(m.shadowRoot.querySelector('#ma-descripcion').textContent);
        return [...vistos].join('\n');
    });
}

for (const [nombre, tamano] of [
    ['pantalla grande', { width: 1920, height: 1080 }],
    ['celular', { width: 360, height: 740 }],
]) {
    test.describe(`en ${nombre}`, () => {
        test.use({ viewport: tamano });

        test('se recorre entera sin errores', async ({ page }) => {
            const errores = await abrir(page);
            await textoDeToda(page);
            expect(errores).toEqual([]);
        });

        test('no menciona al bot del SiGeS (es interno)', async ({ page }) => {
            await abrir(page);
            const texto = await textoDeToda(page);
            expect(texto).not.toMatch(/\bbot\b/i);
            expect(texto).not.toMatch(/siges/i);
        });

        test('ocupa toda la pantalla sin pasarse', async ({ page }) => {
            await abrir(page);
            const r = await page.evaluate(() => {
                const caja = document.querySelector('motor-escena').getBoundingClientRect();
                return {
                    ancho: caja.width, alto: caja.height,
                    sobraX: document.documentElement.scrollWidth - innerWidth,
                    sobraY: document.documentElement.scrollHeight - innerHeight,
                };
            });
            expect(r).toEqual({ ancho: tamano.width, alto: tamano.height, sobraX: 0, sobraY: 0 });
        });
    });
}

test('en el celular usa la disposición angosta, y en la pantalla grande la ancha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await abrir(page);
    expect(await page.evaluate(() => document.querySelector('motor-escena').compilada.disposicion)).toBe('angosta');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect.poll(() => page.evaluate(() => document.querySelector('motor-escena').compilada.disposicion)).toBe('ancha');
});

test('cuenta la historia en orden: hoy, cómo va a funcionar, una sola vez', async ({ page }) => {
    await abrir(page);
    const capitulos = await page.evaluate(() => document.querySelector('motor-escena').compilada.capitulos.map((c) => c.nombre));
    expect(capitulos).toEqual(['Hoy', 'Cómo va a funcionar', 'Una sola vez']);
});

test('dura entre uno y dos minutos, para verla entera de pasada', async ({ page }) => {
    await abrir(page);
    const duracion = await page.evaluate(() => document.querySelector('motor-escena').duracion);
    expect(duracion).toBeGreaterThan(45);
    expect(duracion).toBeLessThan(120);
});

test('ningún subtítulo se pisa con el siguiente', async ({ page }) => {
    await abrir(page);
    const subs = await page.evaluate(() => document.querySelector('motor-escena').compilada.subtitulos);
    for (let i = 1; i < subs.length; i++) {
        expect(subs[i].desde, `"${subs[i].texto}" empieza antes de que termine "${subs[i - 1].texto}"`)
            .toBeGreaterThanOrEqual(subs[i - 1].hasta);
    }
});

test('en loop: al terminar vuelve a empezar, y el principio y el final se ven vacíos', async ({ page }) => {
    await abrir(page);
    const escena = page.locator('motor-escena');
    const { duracion } = await page.evaluate(() => ({ duracion: document.querySelector('motor-escena').duracion }));
    await page.evaluate((d) => document.querySelector('motor-escena').irA(d), duracion);
    const final = await escena.screenshot();
    await page.evaluate(() => document.querySelector('motor-escena').irA(0));
    const principio = await escena.screenshot();
    // Si el final y el principio se ven igual, el salto del loop no se nota.
    expect(final.equals(principio)).toBe(true);

    await page.evaluate((d) => {
        const m = document.querySelector('motor-escena');
        m.irA(d - 0.2);
        m.reproducir();
    }, duracion);
    await page.waitForTimeout(600);
    const { t, corriendo } = await page.evaluate(() => {
        const m = document.querySelector('motor-escena');
        return { t: m.t, corriendo: m.corriendo };
    });
    expect(corriendo).toBe(true);
    expect(t).toBeLessThan(2);
});

test('el mismo instante se ve igual en dos cargas distintas', async ({ page, browser }) => {
    await abrir(page);
    await page.evaluate(() => document.querySelector('motor-escena').irA(40));
    const una = await page.locator('motor-escena').screenshot();
    const otra = await browser.newPage({ viewport: page.viewportSize() });
    await abrir(otra);
    await otra.evaluate(() => {
        const m = document.querySelector('motor-escena');
        m.irA(12);
        m.irA(40);
    });
    expect((await otra.locator('motor-escena').screenshot()).equals(una)).toBe(true);
});

test('la versión para el celular, con controles, se puede pausar', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await abrir(page, '/ejemplos/expo/');
    await page.evaluate(() => document.querySelector('motor-escena').reproducir());
    await page.locator('motor-escena').getByRole('button', { name: 'Pausar' }).click();
    expect(await page.evaluate(() => document.querySelector('motor-escena').corriendo)).toBe(false);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(sobra).toBe(0);
});

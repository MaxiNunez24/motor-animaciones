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

for (const [pagina, cuantas] of [['/ejemplos/funciones-y-objetos/', 5], ['/ejemplos/sql/', 2], ['/ejemplos/tests/', 1], ['/ejemplos/vinculos/', 4]]) {
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

test('la lupa: en la columna de 650 px el código va en una cámara que acerca y lo sigue', async ({ page }) => {
    await abrir(page, '/ejemplos/funciones-y-objetos/');
    const r = await page.locator('motor-leccion[escena="pila"]').evaluate((m) => {
        const c = m.compilada;
        const posiciones = new Set();
        let marcos = 0;
        for (let t = 0; t <= c.duracion; t += 0.25) {
            const p = c.estado(t).piezas;
            posiciones.add(Math.round(p.lupa.mirarY));
            marcos = Math.max(marcos, p.pila.marcos.length);
        }
        return { disposicion: c.disposicion, zoom: c.estado(0).piezas.lupa.zoom, posiciones: posiciones.size, marcos };
    });
    expect(r.disposicion).toBe('media');
    expect(r.zoom).toBeGreaterThan(1.1);
    expect(r.posiciones).toBeGreaterThan(2);
    expect(r.marcos).toBe(3);
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

test('el espejo muestra la misma línea que el código, y quien mira lo puede arrastrar sin cambiar la escena', async ({ page }) => {
    await abrir(page, '/ejemplos/vinculos/');
    const l = page.locator('motor-leccion[escena="espejo-linea"]');
    await l.scrollIntoViewIfNeeded();
    const leer = () => l.evaluate((m) => {
        const g = m.shadowRoot.querySelector('[data-pieza="lente"]');
        const uso = g.querySelector('use');
        return {
            transform: g.getAttribute('transform'),
            // El <use> apunta al grupo del código: es la misma línea, no una copia.
            apunta: m.shadowRoot.querySelector(uso.getAttribute('href')).getAttribute('data-pieza'),
            x: m.compilada.estado(m.t).piezas.lente.x,
        };
    });
    await l.evaluate((m) => m.irA(m.duracion / 2));
    const antes = await leer();
    expect(antes.apunta).toBe('codigo');
    const caja = await l.evaluate((m) => {
        const r = m.shadowRoot.querySelector('[data-pieza="lente"] > rect:last-of-type').getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(caja.x, caja.y);
    await page.mouse.down();
    await page.mouse.move(caja.x - 120, caja.y - 60, { steps: 6 });
    await page.mouse.up();
    const despues = await leer();
    expect(despues.transform).not.toBe(antes.transform);
    // La escena no cambió: es de la vista, como el zoom. Y arrastrar no pausó ni reprodujo.
    expect(despues.x).toBe(antes.x);
    expect(await l.evaluate((m) => m.corriendo)).toBe(false);
});

test('la flecha de "la misma lista" se corre cuando las listas crecen', async ({ page }) => {
    await abrir(page, '/ejemplos/vinculos/');
    const xs = await page.locator('motor-leccion[escena="vinculos-listas"]').evaluate((m) => {
        const punta = (t) => {
            m.irA(t);
            const d = m.shadowRoot.querySelector('[data-pieza="alias"] path').getAttribute('d');
            return Number(d.match(/^M([-\d.]+)/)[1]);
        };
        return [punta(m.duracion * 0.3), punta(m.duracion)];
    });
    // Las listas crecen para los dos lados (están centradas): el costado izquierdo se corre a la izquierda.
    expect(xs[1]).toBeLessThan(xs[0] - 100);
});

test('la portada: las escenas en vivo se arman, y el código de cada ejemplo es el que corre', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await page.goto('/');
    // La derivada se carga recién cuando está por verse.
    await page.locator('[escena="mate-derivada"]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('motor-escena, motor-leccion')].every((m) => m.compilada));
    const codigos = await page.evaluate(() => [...document.querySelectorAll('[data-codigo-de]')].map((c) => ({
        mostrado: c.textContent,
        script: document.getElementById(c.dataset.codigoDe).textContent.trim(),
    })));
    expect(codigos).toHaveLength(3);
    for (const { mostrado, script } of codigos) expect(mostrado).toBe(script);
    expect(errores).toEqual([]);
});

test('la flecha de "la misma lista" arranca y termina a la altura de las listas, aunque la escena se haya centrado', async ({ page }) => {
    await abrir(page, '/ejemplos/funciones-y-objetos/');
    const r = await page.locator('[escena="referencias"]').evaluate((m) => {
        m.irA(m.duracion * 0.7);
        const s = m.shadowRoot;
        const caja = (el) => el.getBoundingClientRect();
        const flecha = caja(s.querySelector('[data-pieza^="alias"] path'));
        const a = caja(s.querySelector('[data-pieza="var_a"] rect'));
        const b = caja(s.querySelector('[data-pieza="var_b"] rect'));
        return { arriba: flecha.top, abajo: flecha.bottom, a: [a.top, a.bottom], b: [b.top, b.bottom] };
    });
    expect(r.arriba).toBeGreaterThan(r.a[0]);
    expect(r.arriba).toBeLessThan(r.a[1]);
    expect(r.abajo).toBeGreaterThan(r.b[0]);
    expect(r.abajo).toBeLessThan(r.b[1]);
});

// Los estilos, los trazos, los subtítulos de reel y las dos lupas, en un
// navegador de verdad.

import { test, expect } from '@playwright/test';

async function abrir(page, url, selector = 'motor-escena, motor-leccion') {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    await page.goto(url);
    await page.waitForFunction((s) => [...document.querySelectorAll(s)].every((m) => m.compilada), selector, { timeout: 30000 });
    return errores;
}

test('la misma escena se recorre entera con cada estilo, sin errores', async ({ page }) => {
    test.setTimeout(90000);
    const errores = await abrir(page, '/ejemplos/estilos/');
    for (const estilo of ['', 'pizarra', 'neon', 'papel', 'reel', './mi-estilo.json']) {
        const r = await page.evaluate(async (estilo) => {
            const d = document.getElementById('demo');
            const antes = d.compilada;
            if (estilo) d.setAttribute('estilo', estilo); else d.removeAttribute('estilo');
            for (let k = 0; k < 60 && d.compilada === antes; k++) await new Promise((r) => setTimeout(r, 50));
            d.pausar();
            for (let t = 0; t <= d.duracion; t += 0.25) d.irA(t);
            await new Promise((r) => setTimeout(r, 0));
            const marcado = document.querySelector('[data-estilo][aria-pressed="true"]').dataset.estilo;
            return { estilo: d.shadowRoot.querySelector('.ma-raiz').hasAttribute('data-estilo'), marcado };
        }, estilo);
        expect(r.estilo).toBe(estilo !== '');
        // El botón marcado dice el estilo que se ve, aunque se haya cambiado desde código.
        expect(r.marcado).toBe(estilo);
    }
    expect(errores).toEqual([]);
});

test('un estilo cambia los colores sin tocar la escena', async ({ page }) => {
    await abrir(page, '/ejemplos/estilos/');
    const colores = await page.evaluate(async () => {
        const d = document.getElementById('demo');
        const fondo = () => getComputedStyle(d.shadowRoot.querySelector('.ma-raiz')).getPropertyValue('--ma-fondo').trim();
        const sobrio = fondo();
        d.setAttribute('estilo', 'pizarra');
        await new Promise((r) => setTimeout(r, 100));
        return { sobrio, pizarra: fondo(), piezas: Object.keys(d.compilada.estado(0).piezas).length };
    });
    expect(colores.pizarra).toBe('#1d3a2f');
    expect(colores.sobrio).not.toBe(colores.pizarra);
    expect(colores.piezas).toBe(8);
});

test('el trazo: a mitad de dibujarse, el borde va cortado; al terminar, la forma queda limpia', async ({ page }) => {
    await abrir(page, '/ejemplos/estilos/');
    const r = await page.evaluate(() => {
        const d = document.getElementById('demo');
        d.pausar();
        const camino = () => d.shadowRoot.querySelector('g[data-pieza="idea"] path');
        d.irA(1.4);
        const medio = { largo: camino().getAttribute('pathLength'), guion: camino().style.strokeDasharray };
        d.irA(2.2);
        return { medio, fin: { largo: camino().getAttribute('pathLength'), guion: camino().style.strokeDasharray } };
    });
    expect(r.medio.largo).toBe('1');
    expect(r.medio.guion).toMatch(/^0\.\d+(px)?,? 1(px)?$/);
    expect(r.fin).toEqual({ largo: null, guion: '' });
});

test('subtítulos de reel: de a tres palabras, con la que se dice resaltada', async ({ page }) => {
    await abrir(page, '/ejemplos/estilos/');
    const r = await page.evaluate(async () => {
        const d = document.getElementById('demo');
        d.setAttribute('estilo', 'reel');
        await new Promise((r) => setTimeout(r, 100));
        d.pausar();
        d.irA(7.6);
        const palabras = [...d.shadowRoot.querySelectorAll('.ma-palabra')];
        return {
            visibles: palabras.filter((p) => getComputedStyle(p).display !== 'none').length,
            actual: palabras.filter((p) => p.classList.contains('actual')).length,
            leido: d.shadowRoot.querySelector('.ma-subtitulo .ma-oculto').textContent,
        };
    });
    expect(r.visibles).toBeLessThanOrEqual(3);
    expect(r.visibles).toBeGreaterThan(0);
    expect(r.actual).toBe(1);
    expect(r.leido).toBe('El del medio se adelanta un poco y vuelve.');
});

test('la lupa animada no se arrastra; un espejo arrastrado nunca sale del dibujo y vuelve a su lugar', async ({ page }) => {
    await abrir(page, '/ejemplos/vinculos/');
    const r = await page.evaluate(() => {
        const m = (e) => [...document.querySelectorAll('motor-leccion')].find((x) => x.getAttribute('escena') === e);
        const lupa = m('espejo-lupa').shadowRoot.querySelector('g[data-pieza="lupa"]');
        const linea = m('espejo-linea');
        linea.pausar();
        linea.irA(5);
        const g = linea.shadowRoot.querySelector('g[data-arrastrable]');
        const b = g.getBoundingClientRect();
        const ev = (t, x, y) => g.dispatchEvent(new PointerEvent(t, { bubbles: true, composed: true, pointerId: 3, clientX: x, clientY: y }));
        ev('pointerdown', b.x + 10, b.y + 10);
        ev('pointermove', b.x + 9000, b.y + 9000);
        ev('pointerup', b.x + 9000, b.y + 9000);
        // Después se mueve sola: igual tiene que quedar adentro.
        linea.irA(linea.duracion);
        const pos = linea._pintor.posicion(g.dataset.pieza);
        const c = linea._arrastres[g.dataset.pieza];
        const caja = { derecha: pos.x + c.x + pos.ancho / 2, abajo: pos.y + c.y + pos.alto / 2 };
        linea.shadowRoot.querySelector('[data-zoom="lugar"]').click();
        return { lupaArrastrable: lupa.hasAttribute('data-arrastrable'), caja, quedan: Object.keys(linea._arrastres).length };
    });
    expect(r.lupaArrastrable).toBe(false);
    expect(r.caja.derecha).toBeLessThanOrEqual(1600.5);
    expect(r.caja.abajo).toBeLessThanOrEqual(900.5);
    expect(r.quedan).toBe(0);
});

test('la lupa de quien mira: se prende, se lleva, se agranda y cambia de forma, sin salir del dibujo', async ({ page }) => {
    await abrir(page, '/ejemplos/vinculos/');
    const r = await page.evaluate(() => {
        const m = [...document.querySelectorAll('motor-leccion')].find((x) => x.getAttribute('escena') === 'espejo-lupa');
        const sh = m.shadowRoot;
        sh.querySelector('[data-zoom="lupa"]').click();
        const ev = (el, t, x, y) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, composed: true, pointerId: 4, clientX: x, clientY: y }));
        const cuerpo = sh.querySelector('.ma-lupa');
        const b = cuerpo.getBoundingClientRect();
        ev(cuerpo, 'pointerdown', b.x + b.width / 2, b.y + b.height / 2);
        ev(cuerpo, 'pointermove', b.x + 9000, b.y + 9000);
        ev(cuerpo, 'pointerup', b.x + 9000, b.y + 9000);
        const llevada = { ...m._lupa };
        sh.querySelector('[data-zoom="lupa-forma"]').click();
        sh.querySelector('[data-zoom="lupa-zoom"]').click();
        const asa = sh.querySelector('.ma-lupa-asa').getBoundingClientRect();
        const a = sh.querySelector('.ma-lupa-asa');
        ev(a, 'pointerdown', asa.x + 4, asa.y + 4);
        ev(a, 'pointermove', asa.x - 40, asa.y + 30);
        ev(a, 'pointerup', asa.x - 40, asa.y + 30);
        return { llevada, final: { ...m._lupa }, uso: !!sh.querySelector('.ma-lupa use') };
    });
    expect(r.llevada.x + r.llevada.ancho / 2).toBeCloseTo(1600, 0);
    expect(r.llevada.y + r.llevada.alto / 2).toBeCloseTo(900, 0);
    expect(r.final.forma).toBe('rect');
    expect(r.final.zoom).toBe(3);
    expect(r.final.ancho).toBeLessThan(r.final.alto);
    expect(r.uso).toBe(true);
});

test('en un celular de 360px entra todo, y los subtítulos de reel van abajo del dibujo', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await abrir(page, '/ejemplos/estilos/');
    const r = await page.evaluate(async () => {
        const d = document.getElementById('demo');
        d.setAttribute('estilo', 'reel');
        await new Promise((r) => setTimeout(r, 100));
        d.pausar();
        d.irA(7.6);
        const lienzo = d.shadowRoot.querySelector('.ma-lienzo').getBoundingClientRect();
        const sub = d.shadowRoot.querySelector('.ma-subtitulo').getBoundingClientRect();
        const controles = d.shadowRoot.querySelector('.ma-controles').getBoundingClientRect();
        const botones = [...d.shadowRoot.querySelectorAll('.ma-controles button')].filter((b) => b.offsetParent);
        return {
            sobra: document.documentElement.scrollWidth - innerWidth,
            debajo: sub.top >= lienzo.bottom - 1,
            renglones: new Set(botones.map((b) => Math.round(b.getBoundingClientRect().top))).size,
            disposicion: d.compilada.disposicion,
            controles: controles.height,
        };
    });
    expect(r.sobra).toBe(0);
    expect(r.debajo).toBe(true);
    expect(r.renglones).toBe(1);
    expect(r.disposicion).toBe('angosta');
});

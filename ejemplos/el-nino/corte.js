// Un corte del océano Pacífico sobre el ecuador, visto de costado: a la
// izquierda Indonesia, a la derecha Sudamérica. Es una pieza propia de esta
// escena, hecha con Motor.definirPieza(): así se agregan piezas nuevas sin
// tocar el motor.
//
// Todo lo que cambia entre un año normal y El Niño es una propiedad de 0 a 1:
//   viento     qué tan fuerte soplan los alisios (1: normal; poco: El Niño)
//   calido     0: el agua cálida apilada al oeste; 1: repartida hasta Sudamérica
//   surgencia  cuánta agua fría sube frente a Perú
//   lluvia     dónde llueve: 0 sobre Indonesia, 1 cerca de Sudamérica
//
// Es un esquema: las proporciones están exageradas para que se vea la idea.

(function () {
    const { definirPieza, el, poner, aCss, limitar } = Motor;

    const mezcla = (a, b, t) => a + (b - a) * t;
    // Un color entre dos (en hexa #rrggbb), para el agua que se va calentando.
    function mezclarHex(a, b, t) {
        const n = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
        return '#' + [0, 1, 2].map((i) => Math.round(mezcla(n(a, i), n(b, i), t)).toString(16).padStart(2, '0')).join('');
    }

    let contador = 0;

    Motor.piezasPropias = Motor.piezasPropias || {};
    Motor.piezasPropias.corte = definirPieza({
        nombre: 'corte',
        predeterminados: {
            ancho: 960,
            alto: 500,
            viento: 1,
            calido: 0,
            surgencia: 1,
            lluvia: 0,
            // De 0 a 1: los nombres de cada cosa (agua cálida, termoclina...).
            rotulos: 1,
        },

        crear(g) {
            const id = `corte-${++contador}`;
            const defs = el('defs', {}, g);
            const degrade = el('linearGradient', { id: `${id}-calido`, x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
            const stops = [0, 0.5, 1].map((o) => el('stop', { offset: o }, degrade));
            const flecha = el('marker', { id: `${id}-punta`, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' }, defs);
            el('path', { d: 'M0 0 L10 5 L0 10 Z', fill: 'context-stroke' }, flecha);
            const partes = {
                id,
                stops,
                cielo: el('rect', {}, g),
                profundo: el('rect', {}, g),
                calido: el('path', {}, g),
                termoclina: el('path', { fill: 'none', 'stroke-dasharray': '10 8' }, g),
                subida: el('g', {}, g),
                oeste: el('rect', {}, g),
                este: el('path', {}, g),
                vientos: el('g', {}, g),
                nube: el('g', {}, g),
                rotulos: el('g', {}, g),
                textos: {},
            };
            partes.flechasViento = [0, 1, 2, 3].map(() => el('line', { 'marker-end': `url(#${id}-punta)`, 'stroke-linecap': 'round' }, partes.vientos));
            partes.flechasSubida = [0, 1, 2].map(() => el('path', { fill: 'none', 'marker-end': `url(#${id}-punta)`, 'stroke-linecap': 'round' }, partes.subida));
            for (const [i, x] of [[0, 0], [1, 34], [2, 64]]) el('circle', { cx: x - 32, cy: i === 1 ? -14 : 0, r: i === 1 ? 34 : 26, fill: '#94a3b8' }, partes.nube);
            partes.gotas = [0, 1, 2, 3, 4].map(() => el('line', { stroke: '#60a5fa', 'stroke-linecap': 'round' }, partes.nube));
            const texto = (clave, ancla = 'middle') => {
                partes.textos[clave] = el('text', { 'text-anchor': ancla, 'dominant-baseline': 'central', 'font-weight': 700 }, partes.rotulos);
            };
            ['indonesia', 'sudamerica', 'alisios', 'calidoTxt', 'frioTxt', 'termoTxt', 'subidaTxt', 'lluviaTxt', 'oesteTxt', 'esteTxt']
                .forEach((k) => texto(k));
            return partes;
        },

        actualizar(pt, p) {
            const W = p.ancho;
            const H = p.alto;
            const izq = -W / 2;
            const der = W / 2;
            const arriba = -H / 2;
            const abajo = H / 2;
            const y0 = arriba + H * 0.38; // el nivel del mar
            const xa = izq + W * 0.09; // donde termina Indonesia
            const xb = der - W * 0.11; // donde empieza Sudamérica
            const fs = H * 0.048;
            const calido = limitar(p.calido, 0, 1);

            poner(pt.cielo, { x: izq, y: arriba, width: W, height: y0 - arriba, rx: 14, fill: 'color-mix(in srgb, var(--ma-acento) 10%, var(--ma-superficie))' });
            poner(pt.profundo, { x: xa, y: y0, width: xb - xa, height: abajo - y0, fill: '#1e3a8a' });

            // La capa de agua cálida: gruesa al oeste y finita al este en un año
            // normal; pareja en El Niño. Su borde de abajo es la termoclina.
            const profundidad = (u) => (abajo - y0) * mezcla(mezcla(0.62, 0.1, u ** 0.9), mezcla(0.36, 0.3, u), calido);
            const puntos = [];
            for (let i = 0; i <= 24; i++) {
                const u = i / 24;
                puntos.push([mezcla(xa, xb, u), y0 + profundidad(u)]);
            }
            const borde = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
            // La superficie de oeste a este, y la termoclina de vuelta, de este a oeste.
            const vuelta = [...puntos].reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
            poner(pt.calido, { d: `M${xa} ${y0} L${xb} ${y0} ${vuelta} Z`, fill: `url(#${pt.id}-calido)` });
            const colores = ['#dc2626', mezclarHex('#f59e0b', '#f97316', calido), mezclarHex('#38bdf8', '#fb923c', calido)];
            pt.stops.forEach((s, i) => poner(s, { 'stop-color': colores[i] }));
            poner(pt.termoclina, { d: borde, stroke: 'rgba(255,255,255,0.75)', 'stroke-width': 3 });

            // Agua fría que sube frente a Perú.
            const s = limitar(p.surgencia, 0, 1);
            pt.flechasSubida.forEach((f, i) => {
                const x = xb - W * (0.04 + i * 0.045);
                poner(f, {
                    d: `M${x} ${abajo - H * 0.06} C ${x - 20} ${mezcla(abajo, y0, 0.5)}, ${x + 10} ${y0 + 40}, ${x - 6} ${y0 + 14}`,
                    stroke: '#7dd3fc', 'stroke-width': 5, opacity: s, visibility: s > 0.02 ? null : 'hidden',
                });
            });

            // Las costas.
            poner(pt.oeste, { x: izq, y: y0 - H * 0.05, width: xa - izq, height: abajo - y0 + H * 0.05, fill: '#8b6b43', rx: 8 });
            poner(pt.este, {
                d: `M${xb} ${abajo} L${xb} ${y0 - H * 0.03} L${der - W * 0.07} ${y0 - H * 0.2} L${der - W * 0.03} ${y0 - H * 0.08} L${der} ${y0 - H * 0.06} L${der} ${abajo} Z`,
                fill: '#8b6b43',
            });

            // Los alisios: del este al oeste, más largos cuanto más soplan.
            const v = limitar(p.viento, 0, 1);
            pt.flechasViento.forEach((f, i) => {
                const xEmpieza = mezcla(xb - W * 0.02, xa + W * 0.2, i / 3.6);
                const y = arriba + H * (0.13 + (i % 2) * 0.08);
                poner(f, {
                    x1: xEmpieza, y1: y, x2: xEmpieza - W * 0.15 * v, y2: y,
                    stroke: 'var(--ma-texto)', 'stroke-width': 6, opacity: Math.min(1, v * 1.3), visibility: v > 0.03 ? null : 'hidden',
                });
            });

            // La lluvia viaja con el agua cálida.
            const xn = mezcla(xa + W * 0.1, xb - W * 0.3, limitar(p.lluvia, 0, 1));
            poner(pt.nube, { transform: `translate(${xn.toFixed(1)} ${(arriba + H * 0.1).toFixed(1)})` });
            pt.gotas.forEach((gota, i) => {
                const x = -40 + i * 20;
                poner(gota, { x1: x, y1: 30, x2: x - 8, y2: y0 - (arriba + H * 0.1) - 8, 'stroke-width': 4, opacity: 0.85 });
            });

            // Los nombres de cada cosa.
            const r = limitar(p.rotulos, 0, 1);
            poner(pt.rotulos, { opacity: r, visibility: r > 0 ? null : 'hidden' });
            const t = (clave, x, y, txt, tam = fs, color = 'var(--ma-texto)') => {
                poner(pt.textos[clave], { x, y, 'font-size': tam, fill: color });
                if (pt.textos[clave].textContent !== txt) pt.textos[clave].textContent = txt;
            };
            t('indonesia', izq + (xa - izq) / 2 + W * 0.02, y0 - H * 0.1, 'Indonesia', fs * 0.9);
            t('sudamerica', der - W * 0.07, y0 - H * 0.26, 'Sudamérica', fs * 0.9);
            // A la derecha, donde la nube de lluvia no llega nunca.
            t('alisios', xb - W * 0.13, arriba + H * 0.05, 'vientos alisios  ←', fs * 0.85);
            t('calidoTxt', xa + W * 0.14, y0 + profundidad(0.1) * 0.45, 'agua cálida', fs, '#ffffff');
            t('frioTxt', mezcla(xa, xb, 0.5), abajo - H * 0.08, 'agua fría, profunda', fs, '#dbeafe');
            t('termoTxt', mezcla(xa, xb, 0.42), y0 + profundidad(0.42) + fs * 0.9, 'termoclina', fs * 0.75, '#dbeafe');
            t('subidaTxt', xb - W * 0.1, abajo - H * 0.25, 'sube agua fría', fs * 0.75, '#e0f2fe');
            poner(pt.textos.subidaTxt, { opacity: s });
            t('lluviaTxt', xn, arriba + H * 0.03, 'lluvias', fs * 0.8);
            t('oesteTxt', izq + W * 0.045, abajo - fs, 'Oeste', fs * 0.75, '#fef3c7');
            t('esteTxt', der - W * 0.055, abajo - fs, 'Este', fs * 0.75, '#fef3c7');
        },

        tamano: (p) => ({ ancho: p.ancho, alto: p.alto }),
    });
})();

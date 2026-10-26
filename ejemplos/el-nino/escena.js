// El Niño, explicado: por qué pasa, qué cambia en la Argentina, y qué
// esperar en 2026.
//
// Combina dos miradas: un globo en 3D para el DÓNDE (el Pacífico, el agua que
// se calienta, la Argentina) y un corte en 2D para el POR QUÉ (los vientos, el
// agua cálida que se corre, la lluvia que se muda). En el medio, una pregunta:
// antes de ver qué pasa cuando los vientos se debilitan, hay que adivinarlo.
//
// Los datos de 2026 son de NOAA (diagnóstico del 8/10/2026) y del SMN
// (informe sobre El Niño del 1/10/2026, con la perspectiva de octubre a
// diciembre). Ojo: no es solo el Litoral. El SMN también espera más lluvia
// (y nieve) en la cordillera de Cuyo y en la Patagonia norte y central,
// Neuquén incluido, y menos en la Puna y el sur patagónico. El globo y
// el corte son esquemas, no mediciones: las manchas muestran la idea, no la
// temperatura real de cada lugar.

(function () {
    const { caja, texto } = Motor;
    const { definirGlobo } = Motor3D;
    const { corte } = Motor.piezasPropias;

    const globo = definirGlobo({
        mapa: Motor.datos.mapa,
        etiquetas: [
            { texto: 'OCÉANO PACÍFICO', lon: -140, lat: 22, tamano: 36 },
            { texto: 'OCÉANO ATLÁNTICO', lon: -28, lat: -22, tamano: 30 },
            { texto: 'ecuador', lon: -160, lat: -3.6, tamano: 22 },
            { texto: 'Perú', lon: -88, lat: -12, tamano: 24 },
            { texto: 'Indonesia', lon: 118, lat: -14, tamano: 26 },
        ],
        capas: {
            // Un año normal: la lengua de agua fría frente a Sudamérica.
            frio: { color: '#38bdf8', manchas: [{ lon: -100, lat: -2, ancho: 70, alto: 12 }, { lon: -83, lat: -7, ancho: 16, alto: 16 }] },
            // El Niño: el agua más caliente que lo normal, del centro del Pacífico a Perú.
            calido: { color: '#f97316', manchas: [{ lon: -130, lat: 0, ancho: 85, alto: 16 }, { lon: -92, lat: -3, ancho: 30, alto: 15 }] },
            // Más lluvia que lo normal en primavera (SMN): la Mesopotamia y el
            // centro-este, y la cordillera de Cuyo y de la Patagonia norte y central.
            lluvia: {
                color: '#1d4ed8',
                manchas: [
                    { lon: -58, lat: -28, ancho: 13, alto: 11 },
                    { lon: -61, lat: -33, ancho: 13, alto: 8 },
                    { lon: -55.5, lat: -31, ancho: 9, alto: 10 },
                    { lon: -69.8, lat: -35, ancho: 5, alto: 8 },
                    { lon: -70.8, lat: -39.5, ancho: 6, alto: 9 },
                    { lon: -71.2, lat: -44, ancho: 5, alto: 7 },
                ],
            },
        },
        regiones: { argentina: { color: '#facc15', anillos: Motor.datos.mapa.argentina } },
        vientos: { alisios: { color: '#ffffff', lat: [-5, 5], lon: [-88, -172], cantidad: 4 } },
    });

    Motor.registrar('el-nino', function (disposicion) {
        const angosta = disposicion.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 1140 : 900;

        // Dónde va el globo en cada parte, y lo demás.
        const L = angosta
            ? {
                titulo: { x: 320, y: 46, tamano: 34 }, bajada: { x: 320, y: 96, tamano: 24, anchoMax: 600 },
                tamanoGlobo: 600,
                inicio: { x: 320, y: 560, escala: 1 },
                chico: { x: 320, y: 340, escala: 0.6 },
                corte: { x: 320, y: 790, ancho: 620, alto: 400 },
                argentina: { x: 320, y: 500, escala: 1 },
                nota: { x: 320, y: 970, ancho: 600, alto: 170, tamano: 24 },
                esquina: { x: 320, y: 300, escala: 0.52 },
                tarjetas: { x: 320, ys: [570, 750, 930], ancho: 610, alto: 165, titulo: 25, cuerpo: 20, anchoTexto: 570 },
                fuente: { x: 320, y: 1085, tamano: 15, anchoMax: 610 },
            }
            : {
                titulo: { x: 800, y: 54, tamano: 44 }, bajada: { x: 800, y: 102, tamano: 26 },
                tamanoGlobo: 720,
                inicio: { x: 800, y: 505, escala: 1 },
                chico: { x: 300, y: 500, escala: 0.62 },
                corte: { x: 1060, y: 500, ancho: 960, alto: 500 },
                argentina: { x: 560, y: 505, escala: 1 },
                nota: { x: 1250, y: 500, ancho: 560, alto: 230, tamano: 30 },
                esquina: { x: 330, y: 500, escala: 0.66 },
                tarjetas: { x: 1080, ys: [285, 490, 695], ancho: 900, alto: 180, titulo: 30, cuerpo: 25, anchoTexto: 1020 },
                fuente: { x: 1080, y: 850, tamano: 18, anchoMax: 900 },
            };

        const T = L.tarjetas;
        const tarjetas = {};
        const TEXTOS = [
            ['🌡️ Un Niño fuerte', 'En septiembre, el centro del Pacífico estuvo 2,1 °C más caliente que lo normal. Para NOAA es muy probable (más del 83 %) que siga fuerte o muy fuerte hasta el verano.'],
            ['🌧️ Más lluvias en gran parte del país', 'Para octubre, noviembre y diciembre, el SMN espera lluvias por encima de lo normal en la Mesopotamia, la región pampeana, Cuyo y el norte y centro de la Patagonia. En la Puna y el sur patagónico, menos.'],
            ['⚠️ Son tendencias', 'Dicen qué es más probable en el promedio de tres meses: no qué día va a llover, ni si va a haber una tormenta.'],
        ];
        TEXTOS.forEach(([titulo, cuerpo], i) => {
            const y = T.ys[i];
            const izq = T.x - T.ancho / 2 + 24;
            tarjetas['tarjeta' + i] = caja({ x: T.x, y, ancho: T.ancho, alto: T.alto, radio: 14, opacidad: 0 });
            tarjetas['tarjetaTitulo' + i] = texto({ x: izq, y: y - T.alto / 2 + T.titulo * 1.1, texto: titulo, tamano: T.titulo, peso: 800, alineacion: 'inicio', opacidad: 0 });
            tarjetas['tarjetaCuerpo' + i] = texto({
                x: izq, y: y + T.titulo * 0.55, texto: cuerpo, tamano: T.cuerpo, alineacion: 'inicio', anchoMax: T.anchoTexto, color: 'suave', opacidad: 0,
            });
        });
        const idsTarjeta = (i) => ['tarjeta' + i, 'tarjetaTitulo' + i, 'tarjetaCuerpo' + i];

        const piezas = {
            titulo: texto({ ...L.titulo, texto: 'El Niño, explicado', peso: 800, escrito: 0 }),
            bajada: texto({ ...L.bajada, texto: 'Por qué pasa, y qué esperar en la Argentina', color: 'acento', peso: 700, opacidad: 0 }),
            corte: corte({ ...L.corte, opacidad: 0 }),
            globo: globo({ ...L.inicio, tamano: L.tamanoGlobo, lon: -15, lat: 5, opacidad: 0 }),
            nota: caja({
                ...L.nota, texto: '🌧️ Con El Niño, en primavera: más lluvias en el Litoral y el noreste, y más lluvias y nevadas en la cordillera, de Mendoza a la Patagonia.',
                relleno: 'superficie', borde: 'acento', opacidad: 0, peso: 600,
            }),
            ...tarjetas,
            fuente: texto({
                ...L.fuente, color: 'suave', opacidad: 0,
                texto: 'Fuentes: NOAA CPC (8/10/2026) y SMN (informe El Niño del 1/10/2026). El globo y el corte son esquemas, no datos medidos.',
            }),
        };

        // Cada paso arranca con su subtítulo y espera a que se termine de leer.
        const leer = (subtitulo) => [{ espera: 'subtitulo' }, { espera: 0.4 }, { subtitulo, en: '>' }];
        const mover = (lugar, dur = 1.4, extra = {}) => ({ pieza: 'globo', a: { x: lugar.x, y: lugar.y, escala: lugar.escala, ...extra }, dur, en: '<' });

        const PREGUNTA = {
            pregunta: '¿Qué creés que pasa con el agua cálida si los alisios se debilitan?',
            opciones: ['Se queda del lado de Indonesia', 'Se corre hacia Sudamérica', 'Se enfría de golpe'],
            correcta: 1,
            explicacion: 'Sin el viento que la empuja hacia el oeste, el agua cálida se reparte hacia el este, hasta Sudamérica.',
        };

        const linea = [
            // ======== ¿Qué es El Niño? ========
            { capitulo: '¿Qué es El Niño?' },
            { pieza: 'titulo', a: { escrito: 1 }, dur: 1, curva: 'lineal' },
            { pieza: 'bajada', a: { opacidad: 1 }, dur: 0.6, en: '<0.6' },
            { pieza: 'globo', a: { opacidad: 1 }, dur: 0.8, en: '<0.2' },
            { pieza: 'globo', a: { lon: -120, lat: 0 }, dur: 6, en: '<', curva: 'suave' },
            { subtitulo: 'En el océano Pacífico, sobre el ecuador, pasa algo que cambia el clima de medio mundo.', en: 1.2 },
            ...leer('Cada dos a siete años, el agua de la superficie se calienta más de lo normal: eso es El Niño.'),
            { pieza: 'globo', a: { calido: 1 }, dur: 1.6, en: '<0.6' },
            { espera: 'subtitulo' },
            { pieza: 'globo', a: { calido: 0 }, dur: 0.8, en: '+0.3' },

            // ======== Un año normal ========
            { capitulo: 'Un año normal', en: '+0.2' },
            { pieza: 'bajada', a: { texto: 'Un año normal' }, dur: 0 },
            mover(L.chico),
            { pieza: 'corte', a: { opacidad: 1 }, dur: 0.8, en: '<0.5' },
            ...leer('Un año normal, los vientos alisios soplan del este al oeste: de Sudamérica hacia Indonesia.'),
            { pieza: 'globo', a: { alisios: 1 }, dur: 1.2, en: '<' },
            ...leer('Empujan el agua cálida de la superficie, que se apila del lado de Indonesia. Ahí el mar está caliente, y llueve mucho.'),
            ...leer('Frente a Perú, en cambio, sube agua fría de las profundidades, y el mar es más frío.'),
            { pieza: 'globo', a: { frio: 1 }, dur: 1.2, en: '<' },
            { espera: 'subtitulo' },
            { marca: 'pregunta', datos: PREGUNTA, en: '+0.4', dur: 6.5 },
            { subtitulo: `${PREGUNTA.pregunta} Pausá y pensalo.`, en: '<', dur: 6.5 },

            // ======== Con El Niño ========
            { capitulo: 'Con El Niño' },
            { pieza: 'bajada', a: { texto: 'Con El Niño' }, dur: 0 },
            ...leer('Respuesta: se corre hacia Sudamérica. Con El Niño, los alisios se debilitan.'),
            { pieza: 'corte', a: { viento: 0.25 }, dur: 2, en: '<' },
            { pieza: 'globo', a: { alisios: 0.25 }, dur: 2, en: '<' },
            ...leer('Sin el viento que la empuja, el agua cálida se reparte hacia el este, y frente a Perú deja de subir agua fría.'),
            { pieza: 'corte', a: { calido: 1, surgencia: 0.1 }, dur: 3.2, en: '<' },
            { pieza: 'globo', a: { frio: 0, calido: 1 }, dur: 3.2, en: '<' },
            ...leer('Las lluvias se mudan con el agua cálida, y la atmósfera de todo el planeta se reacomoda.'),
            { pieza: 'corte', a: { lluvia: 0.8 }, dur: 2.5, en: '<' },

            // ======== ¿Y en la Argentina? ========
            { espera: 'subtitulo' },
            { capitulo: '¿Y en la Argentina?', en: '+0.3' },
            { pieza: 'bajada', a: { texto: '¿Y en la Argentina?' }, dur: 0 },
            { pieza: 'corte', a: { opacidad: 0 }, dur: 0.6 },
            // Centrado un poco más al sur que el Litoral: también tiene que verse Neuquén.
            mover(L.argentina, 2.6, { lon: -64, lat: -34, zoom: 1.6, alisios: 0 }),
            ...leer('Ese reacomodo llega hasta acá: en la Argentina, El Niño suele traer más lluvias en primavera y en verano.'),
            { pieza: 'globo', a: { argentina: 1 }, dur: 1, en: '<1.2' },
            ...leer('En el Litoral y el noreste, donde también aumenta el riesgo de que crezcan ríos como el Paraná y el Uruguay.'),
            { pieza: 'globo', a: { lluvia: 1, argentina: 0.45 }, dur: 1.4, en: '<' },
            { pieza: 'nota', a: { opacidad: 1 }, dur: 0.6, en: '<0.6' },
            ...leer('Y en la cordillera, de Mendoza a la Patagonia, Neuquén incluido: ahí llegan más lluvias y más nevadas.'),

            // ======== Qué esperar en 2026 ========
            { espera: 'subtitulo' },
            { capitulo: 'Qué esperar en 2026', en: '+0.3' },
            { pieza: 'bajada', a: { texto: 'Qué esperar en 2026' }, dur: 0 },
            { pieza: 'nota', a: { opacidad: 0 }, dur: 0.5 },
            mover(L.esquina, 1.4, { zoom: 1.6 }),
            ...leer('Y este año, ¿qué esperar? En septiembre, el centro del Pacífico estuvo dos grados más caliente que lo normal: es un Niño fuerte.'),
            { pieza: idsTarjeta(0), a: { opacidad: 1 }, dur: 0.6, en: '<0.4' },
            ...leer('Según NOAA, lo más probable es que siga fuerte, o muy fuerte, hasta el verano.'),
            ...leer('Y para octubre, noviembre y diciembre, el Servicio Meteorológico Nacional espera más lluvias que lo normal en gran parte del país: del Litoral a la Patagonia norte, Neuquén y Río Negro incluidos.'),
            { pieza: idsTarjeta(1), a: { opacidad: 1 }, dur: 0.6, en: '<' },
            ...leer('Ojo: son tendencias para tres meses, no un pronóstico de qué día va a llover.'),
            { pieza: [...idsTarjeta(2), 'fuente'], a: { opacidad: 1 }, dur: 0.6, en: '<' },
            { espera: 'subtitulo' },
            { espera: 3 },
        ];

        return {
            titulo: 'El Niño, explicado',
            descripcion:
                'Por qué se produce El Niño: los vientos alisios se debilitan, el agua cálida del Pacífico ecuatorial se corre hacia ' +
                'Sudamérica y las lluvias se mudan con ella. En la Argentina suele traer más lluvias en primavera y verano, sobre todo en ' +
                'el Litoral y en la cordillera de Cuyo y la Patagonia. En 2026 es un Niño fuerte: según NOAA y el SMN, se esperan lluvias ' +
                'por encima de lo normal de octubre a diciembre en gran parte del país, del Litoral a la Patagonia norte.',
            ancho: W,
            alto: H,
            lectura: 13,
            pausaFinal: 1,
            piezas,
            linea,
        };
    });
})();

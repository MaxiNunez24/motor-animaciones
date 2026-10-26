// Escena de prueba: un pedido de empanadas que sale del celular, llega a la
// cocina y queda anotado. No es de ningún curso: está para probar las cinco
// piezas, los capítulos, los subtítulos, el azar con semilla y las dos
// disposiciones (ancha para la compu, angosta para el celular).
//
// Es un script clásico, no un módulo, a propósito: así el ejemplo también anda
// abriendo el .html con doble clic.

(function () {
    const { caja, texto, flecha, tabla, celular, azar } = Motor;

    Motor.registrar('pedido', function (disposicion) {
        const angosta = disposicion.nombre === 'angosta';

        // Dónde va cada cosa en cada disposición. Todo lo demás es igual.
        const lugar = angosta
            ? {
                ancho: 900, alto: 1600,
                titulo: { x: 450, y: 80 },
                cel: { x: 450, y: 500, alto: 700 },
                cocina: { x: 450, y: 1040 },
                tabla: { x: 450, y: 1390, ancho: 820 },
            }
            : {
                ancho: 1600, alto: 900,
                titulo: { x: 800, y: 70 },
                cel: { x: 270, y: 490, alto: 720 },
                cocina: { x: 820, y: 300 },
                tabla: { x: 1180, y: 650, ancho: 700 },
            };

        // Las comandas quedan desparramadas cerca de la cocina, donde no las
        // cruce ninguna flecha: en fila arriba (ancha) o apiladas al costado
        // (angosta). Con semilla: caen siempre igual, en vivo y en el video.
        const r = azar('comandas');
        const comandas = {};
        for (let i = 0; i < 4; i++) {
            const enFila = { x: -150 + i * 100, y: -150 };
            const apiladas = { x: 230 + (i % 2) * 40, y: -75 + i * 50 };
            const lugarComanda = angosta ? apiladas : enFila;
            comandas['comanda' + i] = caja({
                x: lugar.cocina.x + lugarComanda.x + r.entre(-12, 12),
                y: lugar.cocina.y + lugarComanda.y + r.entre(-10, 10),
                rotacion: r.entre(-14, 14),
                ancho: 90, alto: 60, radio: 4,
                relleno: 'papel', borde: 'alerta', grosorBorde: 2,
                texto: '#' + (i + 1), tamano: 22,
                opacidad: 0, escala: 0.6,
            });
        }

        return {
            titulo: 'Un pedido de empanadas',
            descripcion: 'Un pedido sale de un celular, llega a la cocina y queda anotado en una tabla de pedidos.',
            ancho: lugar.ancho,
            alto: lugar.alto,
            pausaFinal: 2.5,
            piezas: {
                titulo: texto({
                    ...lugar.titulo, texto: 'Un pedido de empanadas', tamano: angosta ? 56 : 52, peso: 700, escrito: 0,
                }),
                cel: celular({ ...lugar.cel, titulo: 'Empanadas', opacidad: 0, escala: 0.9 }),
                carne: caja({
                    dentro: 'cel', x: 180, y: 175, ancho: 320, alto: 84, texto: '🥟 Carne × 6', tamano: 26, opacidad: 0,
                }),
                jyq: caja({
                    dentro: 'cel', x: 180, y: 275, ancho: 320, alto: 84, texto: '🧀 Jamón y queso × 6', tamano: 26, opacidad: 0,
                }),
                pedir: caja({
                    dentro: 'cel', x: 180, y: 650, ancho: 320, alto: 76,
                    relleno: 'acento', borde: 'acento', color: 'fondo', texto: 'Pedir', tamano: 30, opacidad: 0,
                }),
                cocina: caja({
                    ...lugar.cocina, ancho: 300, alto: 170, icono: '🍳', texto: 'La cocina', opacidad: 0,
                }),
                ...comandas,
                pedidos: tabla({
                    ...lugar.tabla,
                    columnas: ['#', 'Pedido', 'Hora'],
                    anchos: [80, lugar.tabla.ancho - 240, 160],
                    filas: [
                        ['1', 'Humita × 12', '20:05'],
                        ['2', 'Carne × 6', '20:11'],
                        ['3', 'Carne × 6, JyQ × 6', '20:14'],
                    ],
                    filasVisibles: 0,
                    opacidad: 0,
                }),
                ida: flecha({ desde: 'pedir', hasta: 'cocina', progreso: 0, curvatura: angosta ? 0 : 0.3, etiqueta: 'el pedido' }),
                anota: flecha({ desde: 'cocina', hasta: 'pedidos', progreso: 0, curvatura: angosta ? 0 : 0.2, color: 'acento' }),
            },
            linea: [
                { capitulo: 'El pedido' },
                { pieza: 'titulo', a: { escrito: 1 }, dur: 1.2, curva: 'lineal' },
                { pieza: 'cel', a: { opacidad: 1, escala: 1 }, dur: 0.7, curva: 'salir', en: '<0.3' },
                { subtitulo: 'Alguien arma su pedido desde el celular.', en: '<', dur: 3.2 },
                { pieza: ['carne', 'jyq'], a: { opacidad: 1 }, escalonar: 0.5, dur: 0.5 },
                { pieza: 'pedir', a: { opacidad: 1 }, dur: 0.4 },
                { pieza: 'pedir', a: { resaltado: 1, escala: 1.06 }, dur: 0.3, en: '+0.3' },
                { pieza: 'pedir', a: { escala: 1 }, dur: 0.3 },

                { capitulo: 'Viaja a la cocina', en: '+1' },
                { subtitulo: 'Cuando toca «Pedir», el pedido viaja a la cocina.', en: '<', dur: 3.4 },
                { pieza: 'cocina', a: { opacidad: 1 }, dur: 0.5 },
                { pieza: 'ida', a: { progreso: 1 }, dur: 1.1, en: '<0.2' },
                { pieza: Object.keys(comandas), a: { opacidad: 1, escala: 1 }, escalonar: 0.18, dur: 0.4, curva: 'pasarse' },
                { pieza: 'cocina', a: { resaltado: 1 }, dur: 0.3, en: '<' },

                { capitulo: 'Queda anotado', en: '+1' },
                { subtitulo: 'Y queda anotado una sola vez, en la tabla de pedidos.', en: '<', dur: 4 },
                { pieza: 'pedidos', a: { opacidad: 1 }, dur: 0.5 },
                { pieza: 'anota', a: { progreso: 1 }, dur: 0.9, en: '<' },
                { pieza: 'pedidos', a: { filasVisibles: 3 }, dur: 1.5, curva: 'lineal' },
                { pieza: 'pedidos', a: { resaltarFila: 2 }, dur: 0 },
                { pieza: 'cocina', a: { resaltado: 0 }, dur: 0.4, en: '<' },
            ],
        };
    });
})();

// Lecciones de matemática que se arman solas a partir de los datos: una
// función y un punto, unos datos para ajustar, dos números para el mcd.
// Los datos de la regresión son inventados.

(function () {
    const { desdeDerivada, desdeDescenso, desdeRegresion, desdeEuclides, desdeModulo, desdeRelacion } = MotorMate;

    Motor.registrar('mate-derivada', desdeDerivada({
        titulo: 'La derivada, como límite',
        f: (x) => x * x,
        expresion: 'x²',
        x0: 1,
        h: 2,
        preguntas: {
            limite: {
                pregunta: 'Si acercamos Q a P, ¿a qué número se va a acercar la pendiente de la secante?',
                opciones: ['1', '2', '4'],
                correcta: 1,
                explicacion: 'Con f(x) = x², la pendiente de la secante es 2 + h: cuando h tiende a 0, tiende a 2.',
            },
        },
    }));

    const cuenco = (x, y) => x * x + 3 * y * y;
    Motor.registrar('mate-descenso', desdeDescenso({
        titulo: 'Descenso del gradiente',
        f: cuenco,
        gradiente: (x, y) => [2 * x, 6 * y],
        expresion: 'x² + 3y²',
        inicio: [-3.2, 2.2],
        tasa: 0.1,
        pasos: 14,
        rango: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
        niveles: [0.5, 2, 5, 10, 18, 30],
        preguntas: {
            direccion: {
                pregunta: 'Para llegar al mínimo, ¿para dónde conviene moverse?',
                opciones: ['Para donde apunta ∇f', 'Al revés de ∇f', 'Siempre hacia el (0, 0)'],
                correcta: 1,
                explicacion: 'El gradiente apunta hacia donde f sube más rápido: para bajar, hay que ir al revés.',
            },
        },
    }));

    Motor.registrar('mate-descenso-zigzag', desdeDescenso({
        titulo: 'Con una tasa más grande',
        f: cuenco,
        gradiente: (x, y) => [2 * x, 6 * y],
        expresion: 'x² + 3y²',
        inicio: [-3.2, 2.2],
        tasa: 0.3,
        pasos: 10,
        rango: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
        niveles: [0.5, 2, 5, 10, 18, 30],
        preguntas: {
            final: {
                pregunta: 'Con α = 0,3 el punto rebota de un lado al otro del valle. ¿Qué pasaría con α = 0,4?',
                opciones: ['Llega más rápido', 'Rebota cada vez más lejos: diverge', 'Da lo mismo'],
                correcta: 1,
                explicacion: 'En y, cada paso multiplica por 1 − 6α. Con 0,4 es −1,4: cada rebote es más grande que el anterior.',
            },
        },
    }));

    Motor.registrar('mate-regresion', desdeRegresion({
        titulo: '¿Cuánto tarda en bajar un archivo?',
        etiquetaX: 'MB',
        etiquetaY: 'segundos',
        datos: [[5, 1.9], [10, 3.1], [15, 4.6], [20, 5.7], [25, 7.4], [30, 8.1], [40, 11.2], [50, 13.6]],
        predecir: [35, 120],
        rango: { xmin: 0, xmax: 130, ymin: 0, ymax: 36 },
        preguntas: {
            recta: {
                pregunta: 'Si la giramos, ¿qué le va a pasar a la suma de los residuos al cuadrado?',
                opciones: ['Sube', 'Baja hasta un mínimo', 'Queda igual'],
                correcta: 1,
            },
        },
    }));

    Motor.registrar('mate-euclides', desdeEuclides({
        titulo: 'El algoritmo de Euclides',
        a: 1071,
        b: 462,
        preguntas: {
            resto: {
                pregunta: 'Sobró una tira de 462 × 147. ¿Cuál es el cuadrado más grande que entra en ella?',
                opciones: ['147', '462', '21'],
                correcta: 0,
            },
        },
    }));

    Motor.registrar('mate-modulo', desdeModulo({
        titulo: 'Aritmética modular: un reloj',
        n: 12,
        cuentas: ['9 + 5', '4 * 5', '100', '2 - 5'],
        preguntas: {
            0: {
                pregunta: 'Son las 9. ¿Qué hora va a ser dentro de 5 horas?',
                opciones: ['14', '2', '4'],
                correcta: 1,
                explicacion: 'En un reloj de 12, después del 11 viene el 0.',
            },
        },
    }));

    Motor.registrar('mate-relacion', desdeRelacion({
        titulo: '¿Qué propiedades tiene R?',
        conjunto: [1, 2, 3, 4],
        pares: [[1, 1], [2, 2], [3, 3], [4, 4], [1, 2], [2, 1], [3, 4]],
        preguntas: {
            simetrica: {
                pregunta: '¿R es simétrica?',
                opciones: ['Sí', 'No'],
                correcta: 1,
                explicacion: 'Está (3, 4) pero no (4, 3).',
            },
        },
    }));

    Motor.registrar('mate-equivalencia', desdeRelacion({
        titulo: 'Tener el mismo resto al dividir por 2',
        conjunto: [1, 2, 3, 4],
        pares: [[1, 1], [1, 3], [3, 1], [3, 3], [2, 2], [2, 4], [4, 2], [4, 4]],
    }));

    // Una escena escrita a mano, con las piezas del plano: las raíces sextas
    // de 1 son los vértices de un hexágono sobre la circunferencia unidad.
    const { plano, grafica, punto, segmento, numero } = MotorMate;
    const n = 6;
    const raices = Array.from({ length: n }, (_, k) => [Math.cos((2 * Math.PI * k) / n), Math.sin((2 * Math.PI * k) / n)]);
    Motor.registrar('mate-raices', (d) => {
        const angosta = d.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 900 : 900;
        const lado = angosta ? 600 : 700;
        const piezas = {
            titulo: Motor.texto({ x: W / 2, y: 50, texto: 'Las raíces sextas de 1', tamano: angosta ? 30 : 40, peso: 800 }),
            p: plano({ x: angosta ? 320 : 520, y: angosta ? 440 : 480, ancho: lado, alto: lado, xmin: -1.5, xmax: 1.5, ymin: -1.5, ymax: 1.5, etiquetaX: 'Re', etiquetaY: 'Im' }),
            circulo: grafica({ plano: 'p', parametrica: (t) => [Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t)], trazo: 0, color: 'suave', grosor: 3, punteada: true }),
            nota: Motor.texto({ x: angosta ? 320 : 1200, y: angosta ? 830 : 470, texto: '', tamano: angosta ? 24 : 32, anchoMax: angosta ? 600 : 620, opacidad: 0 }),
        };
        raices.forEach(([x, y], k) => {
            const [x2, y2] = raices[(k + 1) % n];
            piezas[`l${k}`] = segmento({ plano: 'p', x1: x, y1: y, x2, y2, color: 'acento', progreso: 0 });
        });
        raices.forEach(([x, y], k) => {
            piezas[`r${k}`] = punto({
                plano: 'p', mx: x, my: y, color: 'acento2', opacidad: 0,
                etiqueta: k === 0 ? 'z₀ = 1' : `z${'₀₁₂₃₄₅'[k]}`, lado: x >= 0 ? (y >= 0 ? 'arriba-derecha' : 'abajo-derecha') : (y >= 0 ? 'arriba-izquierda' : 'abajo-izquierda'),
            });
        });
        const ids = raices.map((_, k) => `r${k}`);
        return {
            titulo: 'Las raíces sextas de 1',
            descripcion: 'Las seis soluciones de z⁶ = 1 en el plano complejo: los vértices de un hexágono regular sobre la circunferencia de radio 1.',
            ancho: W, alto: H,
            piezas,
            linea: [
                { capitulo: 'La circunferencia' },
                { pieza: 'circulo', a: { trazo: 1 }, dur: 1.5 },
                { subtitulo: 'Todas las raíces de z⁶ = 1 tienen módulo 1: están sobre la circunferencia de radio 1.', dur: 4 },
                { capitulo: 'Las seis raíces' },
                { pieza: ids, a: { opacidad: 1 }, dur: 0.4, escalonar: 0.5 },
                { pieza: 'nota', a: { texto: `zₖ = cos(2πk/6) + i·sen(2πk/6)`, opacidad: 1 }, dur: 0.4, en: '<0.5' },
                { subtitulo: `Arrancan en 1 y se separan de a 360°/6 = 60°. Por ejemplo, z₁ = ${numero(raices[1][0], 2)} + ${numero(raices[1][1], 2)}i.`, dur: 5 },
                { capitulo: 'Un polígono regular' },
                { pieza: raices.map((_, k) => `l${k}`), a: { progreso: 1 }, dur: 0.4, escalonar: 0.25 },
                { pieza: 'nota', a: { texto: 'Unidas, forman un hexágono regular.' }, dur: 0.3 },
                { subtitulo: 'Las raíces n-ésimas de cualquier número complejo son siempre los vértices de un polígono regular de n lados.', dur: 5 },
            ],
        };
    });
}());

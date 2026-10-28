// La regresión de punta a punta, con el consumo eléctrico de una fábrica
// inventada: una cuadrática y su punto crítico, cómo se reparte la
// variabilidad, el test de la pendiente, los intervalos para la respuesta
// media y de predicción, el descenso del gradiente con tres tasas, y la
// regresión múltiple con el R² ajustado.
//
// Los datos son inventados (con semilla, para que sean siempre los mismos).
// Sirven para ver qué significa cada cuenta, no para sacar conclusiones de
// ninguna fábrica real.

(function () {
    const {
        desdeVariabilidad, desdeTest, desdeBandas, desdeTasas, inferenciaRegresion, minimosCuadrados, muestraNormal,
        regresionLineal, plano, grafica, punto, recta, numero,
    } = MotorMate;
    const { texto, caja, crearNarrador } = Motor;

    // ---------------- Los datos ----------------
    // 40 intervalos: potencia reactiva (kVarh) y consumo (kWh), con ruido.
    const ruido = muestraNormal({ n: 40, desvio: 7, semilla: 2026 });
    const xs = muestraNormal({ n: 40, media: 22, desvio: 12, semilla: 77 }).map((v) => Math.round(Math.min(58, Math.max(1, v)) * 10) / 10);
    const datos = xs.map((x, i) => [x, Math.round(Math.max(2, 6 + 1.25 * x + ruido[i]) * 10) / 10]);
    const rango = { xmin: 0, xmax: 62, ymin: 0, ymax: 95 };

    // ---------------- 1. La cuadrática y su punto crítico ----------------
    // El consumo promedio de cada hora del día: bajo de noche, alto en el turno.
    const horas = Array.from({ length: 24 }, (_, h) => h + 0.5);
    const ruidoHora = muestraNormal({ n: 24, desvio: 5, semilla: 9 });
    const consumoHora = horas.map((h, i) => Math.round(Math.max(5, 62 - 0.4 * (h - 13.5) ** 2 + ruidoHora[i]) * 10) / 10);
    const cuad = minimosCuadrados(horas.map((h) => [h, h * h]), consumoHora);
    const [a0, a1, a2] = cuad.coeficientes;
    const lin = regresionLineal(horas.map((h, i) => [h, consumoHora[i]]));
    const fq = (x) => a0 + a1 * x + a2 * x * x;
    const dq = (x) => a1 + 2 * a2 * x;
    const critico = -a1 / (2 * a2);

    Motor.registrar('reg-cuadratica', (d) => {
        const angosta = d.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 1140 : 900;
        const arriba = angosta ? 96 : 104;
        const pl = angosta ? { x: 320, y: arriba + 280, ancho: 600, alto: 520 } : { x: 520, y: arriba + 380, ancho: 940, alto: 720 };
        const pan = angosta ? { x: 24, y: arriba + 590, ancho: 600, tamano: 22 } : { x: 1040, y: arriba + 90, ancho: 540, tamano: 26 };
        const piezas = {
            titulo: texto({ x: W / 2, y: angosta ? 48 : 52, texto: 'El consumo a lo largo del día', tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 }),
            p: plano({ ...pl, xmin: 0, xmax: 24, ymin: 0, ymax: 80, pasoX: angosta ? 4 : 2, etiquetaX: 'hora', etiquetaY: 'kWh', tamano: angosta ? 15 : 19 }),
            lineal: grafica({ plano: 'p', f: (x) => lin.b0 + lin.b1 * x, trazo: 0, color: 'suave', punteada: true, grosor: 3, etiqueta: 'lineal' }),
            curva: grafica({ plano: 'p', f: fq, trazo: 0, color: 'acento2', grosor: 4.5, etiqueta: 'cuadrática' }),
            t1: recta({ plano: 'p', mx: 7, my: fq(7), pendiente: dq(7), progreso: 0, color: 'exito', grosor: 3 }),
            t2: recta({ plano: 'p', mx: 19, my: fq(19), pendiente: dq(19), progreso: 0, color: 'error', grosor: 3 }),
            p1: punto({ plano: 'p', mx: 7, my: fq(7), color: 'exito', opacidad: 0, etiqueta: '7 h', lado: 'arriba-izquierda' }),
            p2: punto({ plano: 'p', mx: 19, my: fq(19), color: 'error', opacidad: 0, etiqueta: '19 h', lado: 'arriba-derecha' }),
            tc: recta({ plano: 'p', mx: critico, my: fq(critico), pendiente: 0, progreso: 0, color: 'texto', grosor: 3, punteada: true }),
            vc: punto({ plano: 'p', mx: critico, my: fq(critico), color: 'texto', radio: 11, opacidad: 0, guias: true, etiqueta: 'máximo', lado: 'arriba' }),
        };
        horas.forEach((h, i) => {
            piezas[`d${i}`] = punto({ plano: 'p', mx: h, my: consumoHora[i], radio: angosta ? 5 : 7, color: 'acento', opacidad: 0 });
        });
        ['modelo', 'derivada', 'd1', 'd2', 'dlin', 'critico', 'segunda'].forEach((id, i) => {
            piezas[id] = texto({ x: pan.x, y: pan.y + i * pan.tamano * 1.9, texto: '', tamano: pan.tamano, alineacion: 'inicio', anchoMax: pan.ancho, opacidad: 0 });
        });

        const n = crearNarrador({});
        const s = (v) => (v >= 0 ? '+ ' : '− ') + numero(Math.abs(v), 3);
        n.capitulo('Los datos');
        n.animar({ pieza: horas.map((_, i) => `d${i}`), a: { opacidad: 1 }, dur: 0.3, escalonar: 0.06 });
        n.decir('El consumo promedio de cada hora del día. De noche es bajo, sube con el turno y vuelve a bajar: una recta no va a poder seguir eso.');
        n.animar({ pieza: 'lineal', a: { trazo: 1 }, dur: 1 });
        n.animar({ pieza: 'curva', a: { trazo: 1 }, dur: 1.4 }, 1.2);
        n.animar({ pieza: 'modelo', a: { texto: `ŷ = ${numero(a0, 3)} ${s(a1)}x ${s(a2)}x²`, opacidad: 1, peso: 700, color: 'acento2' }, dur: 0.4 }, 1.2);
        n.decir(`La recta queda casi plana. La cuadrática ŷ = β₀ + β₁x + β₂x², ajustada por mínimos cuadrados, sí sigue la forma: es una parábola que abre para abajo porque β₂ = ${numero(a2, 3)} es negativo.`);

        n.capitulo('La derivada');
        n.animar({ pieza: 'derivada', a: { texto: `dŷ/dx = ${numero(a1, 3)} ${s(2 * a2)}x`, opacidad: 1 }, dur: 0.4 });
        n.decir('La derivada dice cuánto cambia el consumo por cada hora que pasa, en kWh por hora. Y no es una sola: depende de la hora.');
        n.animar([
            { pieza: 'p1', a: { opacidad: 1 }, dur: 0.3 },
            { pieza: 't1', a: { progreso: 1 }, dur: 0.8 },
            { pieza: 'd1', a: { texto: `a las 7 h: ${numero(dq(7), 2)} kWh por hora`, opacidad: 1, color: 'exito' }, dur: 0.4 },
        ]);
        n.decir(`A las 7, la derivada vale ${numero(dq(7), 2)}: a esa hora el consumo sube unos ${numero(dq(7), 1)} kWh por cada hora que pasa.`);
        n.animar([
            { pieza: 'p2', a: { opacidad: 1 }, dur: 0.3 },
            { pieza: 't2', a: { progreso: 1 }, dur: 0.8 },
            { pieza: 'd2', a: { texto: `a las 19 h: ${numero(dq(19), 2)} kWh por hora`, opacidad: 1, color: 'error' }, dur: 0.4 },
        ]);
        n.decir(`A las 19 es negativa, ${numero(dq(19), 2)}: el consumo ya está bajando.`);
        n.animar({ pieza: 'dlin', a: { texto: `en la recta: siempre ${numero(lin.b1, 2)} kWh por hora`, opacidad: 1, color: 'suave' }, dur: 0.4 });
        n.decir(`En el modelo lineal la derivada es siempre la pendiente, ${numero(lin.b1, 2)}: supone que el consumo cambia igual a cualquier hora. El cuadrático supone que la tasa de cambio va cambiando, y que en algún momento se da vuelta.`);
        n.decir('Ojo con las unidades: si x está en segundos desde la medianoche (y no en horas), la derivada da kWh por segundo. Para leerla por hora, se multiplica por 3600.');

        n.capitulo('El punto crítico');
        n.animar([
            { pieza: 'tc', a: { progreso: 1 }, dur: 0.8 },
            { pieza: 'vc', a: { opacidad: 1 }, dur: 0.4 },
            { pieza: 'critico', a: { texto: `dŷ/dx = 0  →  x = −β₁/(2β₂) = ${numero(critico, 2)} h`, opacidad: 1, peso: 700 }, dur: 0.4 },
        ]);
        n.decir(`Donde la derivada vale cero, la tangente queda horizontal: x = −β₁ / (2β₂) = ${numero(critico, 2)}, alrededor de las ${Math.floor(critico)}:${String(Math.round((critico % 1) * 60)).padStart(2, '0')}.`);
        n.animar({ pieza: 'segunda', a: { texto: `d²ŷ/dx² = 2β₂ = ${numero(2 * a2, 3)} < 0  →  máximo`, opacidad: 1, color: 'exito', peso: 700 }, dur: 0.4 });
        n.decir(`La derivada segunda es 2β₂ = ${numero(2 * a2, 3)}, negativa: la curva es cóncava y el punto crítico es un máximo. Es la hora de mayor consumo según el modelo.`);
        n.decir('Y está dentro del rango de horas observado, de 0 a 24, así que tiene sentido interpretarlo. Si hubiera caído afuera, sería una extrapolación del modelo, no algo que dicen los datos.');
        return {
            titulo: 'El consumo a lo largo del día', descripcion: 'Un modelo cuadrático del consumo según la hora, su derivada en dos horas y su punto crítico.',
            ancho: W, alto: H, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    });

    // ---------------- 2. STC = SCR + SCE ----------------
    Motor.registrar('reg-variabilidad', desdeVariabilidad({
        titulo: 'Cuánto explica la recta',
        datos,
        etiquetaX: 'kVarh',
        etiquetaY: 'kWh',
        rango,
        preguntas: {
            r2: {
                pregunta: 'La parte verde de la barra es la variabilidad que explica la recta. ¿Qué número es esa proporción?',
                opciones: ['r', 'R²', 'σ̂²'],
                correcta: 1,
            },
        },
    }));

    // ---------------- 3. El test de la pendiente ----------------
    const inf = inferenciaRegresion(datos);
    Motor.registrar('reg-pendiente', desdeTest({
        titulo: '¿La pendiente es distinta de cero?',
        estadistico: inf.t,
        gl: inf.gl,
        formula: 'T = β̂₁ / √(σ̂² / Sxx)',
        cuenta: `T = ${numero(inf.b1, 4)} / √(${numero(inf.sigma2, 2)} / ${numero(inf.sxx, 1)}) = ${numero(inf.t, 2)}`,
        h0: 'β₁ = 0 (la potencia reactiva no sirve para predecir el consumo)',
        h1: 'β₁ ≠ 0',
        siRechaza: `Se rechaza H₀: hay evidencia de que el consumo está relacionado linealmente con la potencia reactiva. Cada kVarh más se asocia, en promedio, con unos ${numero(inf.b1, 2)} kWh más de consumo.`,
        siNoRechaza: 'No hay evidencia de una relación lineal entre la potencia reactiva y el consumo.',
        notas: [
            'Que la pendiente sea significativa no dice que sea grande ni que la relación sea causal: dice que, si no hubiera relación, sería rarísimo ver una pendiente así.',
            'Con decenas de miles de datos el error estándar se achica tanto que casi cualquier pendiente da significativa. Ahí importa más el tamaño del efecto (β̂₁ y su intervalo) que el p-valor.',
        ],
        preguntas: {
            decision: {
                pregunta: 'Si β₁ fuera 0, ¿qué forma tendría la nube de puntos?',
                opciones: ['Una recta que sube', 'Una nube sin tendencia', 'Una recta que baja'],
                correcta: 1,
                explicacion: 'Con β₁ = 0, saber x no cambia lo que esperamos de y.',
            },
        },
    }));

    // ---------------- 4. Intervalos para la media y de predicción ----------------
    Motor.registrar('reg-bandas', desdeBandas({
        titulo: 'Dos intervalos en x* = 20',
        datos,
        xEstrella: 20,
        etiquetaX: 'kVarh',
        etiquetaY: 'kWh',
        unidadY: 'kWh',
        rango,
        preguntas: {
            ancho: {
                pregunta: '¿Cuál va a ser más ancho: el intervalo para el consumo promedio con x = 20, o el de un intervalo puntual con x = 20?',
                opciones: ['El del promedio', 'El de un valor puntual', 'Son iguales'],
                correcta: 1,
            },
        },
    }));

    // ---------------- 5. El descenso del gradiente con tres tasas ----------------
    // f(b₀, b₁) = promedio de los errores al cuadrado, con x centrada y
    // achicada (z = 0,63 · (x − x̄)/s). Centrada, para que las curvas de nivel
    // no sean larguísimas; no del todo estandarizada, para que sean elipses y
    // cada tasa haga un camino distinto (con círculos, los tres irían por la
    // misma recta). Dividir por n no cambia dónde está el mínimo.
    const mx = datos.reduce((s, [x]) => s + x, 0) / datos.length;
    const sx = Math.sqrt(datos.reduce((s, [x]) => s + (x - mx) ** 2, 0) / datos.length);
    const zs = datos.map(([x, y]) => [(0.63 * (x - mx)) / sx, y]);
    const ecm = (b0, b1) => zs.reduce((s, [z, y]) => s + (y - b0 - b1 * z) ** 2, 0) / zs.length;
    const gradEcm = (b0, b1) => {
        let g0 = 0;
        let g1 = 0;
        for (const [z, y] of zs) {
            const e = y - b0 - b1 * z;
            g0 += -2 * e;
            g1 += -2 * e * z;
        }
        return [g0 / zs.length, g1 / zs.length];
    };
        const exacta = regresionLineal(zs);
    Motor.registrar('reg-tasas', desdeTasas({
        titulo: 'Tres tasas de aprendizaje',
        f: ecm,
        gradiente: gradEcm,
        inicio: [0, 0],
        tasas: [{ tasa: 0.02, nombre: 'muy chica' }, { tasa: 0.3, nombre: 'adecuada' }, { tasa: 1.04, nombre: 'demasiado grande' }],
        pasos: 24,
        rango: { xmin: -20, xmax: 80, ymin: -35, ymax: 65 },
        niveles: [10, 60, 200, 450, 800, 1300, 2000].map((v) => v + ecm(exacta.b0, exacta.b1)),
        etiquetaX: 'b₀',
        etiquetaY: 'b₁',
        minimo: [exacta.b0, exacta.b1],
        preguntas: {
            grande: {
                pregunta: 'Si α = 0,3 anduvo bien, ¿qué pasará con α = 1,04, más del triple?',
                opciones: ['Llega en menos pasos', 'Se pasa de largo y diverge', 'Llega igual que con 0,3'],
                correcta: 1,
                explicacion: 'En la dirección de b₀, cada paso multiplica la distancia al mínimo por 1 − 2α: con 1,04 es −1,08, un poco más lejos cada vez, del otro lado.',
            },
        },
    }));

    // ---------------- 6. Regresión múltiple y R² ajustado ----------------
    // Cuatro variables que sí aportan y una que es puro ruido.
    const nM = 60;
    const v = [11, 12, 13, 14, 15].map((sem) => muestraNormal({ n: nM, semilla: sem }));
    const yM = muestraNormal({ n: nM, desvio: 1.2, semilla: 16 }).map((e, i) => 10 + 3 * v[0][i] + 1.4 * v[1][i] + 0.8 * v[2][i] + 0.5 * v[3][i] + e);
    const nombres = ['x₁', 'x₂', 'x₃', 'x₄', 'x₅ (ruido)'];
    const modelos = nombres.map((_, k) => minimosCuadrados(Array.from({ length: nM }, (_, i) => v.slice(0, k + 1).map((col) => col[i])), yM));

    Motor.registrar('reg-multiple', (d) => {
        const angosta = d.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 1140 : 900;
        const base = angosta ? 820 : 740;
        const alto = angosta ? 420 : 460;
        const ancho = angosta ? 100 : 170;
        const x0 = angosta ? 80 : 330;
        const paso = angosta ? 118 : 200;
        const piezas = {
            titulo: texto({ x: W / 2, y: angosta ? 48 : 52, texto: 'Más variables, ¿mejor modelo?', tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 }),
            formula: texto({ x: W / 2, y: angosta ? 130 : 140, texto: 'β̂ = (XᵀX)⁻¹ Xᵀy', tamano: angosta ? 30 : 38, peso: 700, color: 'acento2', opacidad: 0 }),
            dimensiones: texto({ x: W / 2, y: angosta ? 190 : 196, texto: '', tamano: angosta ? 20 : 25, color: 'suave', anchoMax: W - 60, opacidad: 0 }),
            leyenda: texto({ x: W / 2, y: angosta ? 260 : 250, texto: 'R²   ·   R² ajustado', tamano: angosta ? 22 : 26, opacidad: 0 }),
        };
        modelos.forEach((m, k) => {
            const x = x0 + k * paso;
            piezas[`r${k}`] = caja({ x: x - ancho / 4, y: base, ancho: ancho / 2 - 6, alto: 2, radio: 4, relleno: 'acento', borde: 'acento', grosorBorde: 0, opacidad: 0 });
            piezas[`a${k}`] = caja({ x: x + ancho / 4, y: base, ancho: ancho / 2 - 6, alto: 2, radio: 4, relleno: 'exito', borde: 'exito', grosorBorde: 0, opacidad: 0 });
            piezas[`n${k}`] = texto({ x, y: base + 34, texto: `+ ${nombres[k]}`, tamano: angosta ? 17 : 22, opacidad: 0 });
            piezas[`v${k}`] = texto({ x, y: base - 24, texto: `${numero(m.r2, 3)} · ${numero(m.r2Ajustado, 3)}`, tamano: angosta ? 15 : 21, opacidad: 0 });
        });
        // Las barras muestran de 0,5 a 1: si arrancaran en 0, las diferencias no se verían.
        const piso = 0.5;
        const altura = (r) => Math.max(4, ((r - piso) / (1 - piso)) * alto);
        const n = crearNarrador({});
        n.capitulo('Las ecuaciones normales');
        n.animar([
            { pieza: 'formula', a: { opacidad: 1 }, dur: 0.5 },
            { pieza: 'dimensiones', a: { texto: `X: ${nM} filas × (k + 1) columnas (la primera, de unos)  ·  y: ${nM} × 1`, opacidad: 1 }, dur: 0.4 },
        ]);
        n.decir('Con varias variables, las ecuaciones normales se escriben con matrices: XᵀX β = Xᵀy. Cada fila de X es un caso, cada columna una variable, más una columna de unos para la ordenada al origen.');
        n.decir('Es lo mismo que con la recta: igualar a cero las derivadas parciales de la suma de los errores al cuadrado, ahora respecto de cada β.');

        n.capitulo('Agregar variables');
        n.animar({ pieza: 'leyenda', a: { opacidad: 1 }, dur: 0.4 });
        modelos.forEach((m, k) => {
            n.animar([
                { pieza: [`r${k}`, `a${k}`, `n${k}`, `v${k}`], a: { opacidad: 1 }, dur: 0.3 },
                { pieza: `r${k}`, a: { alto: altura(m.r2), y: base - altura(m.r2) / 2 }, dur: 0.7 },
                { pieza: `a${k}`, a: { alto: altura(m.r2Ajustado), y: base - altura(m.r2Ajustado) / 2 }, dur: 0.7 },
                { pieza: `v${k}`, a: { y: base - altura(m.r2) - 24 }, dur: 0.7 },
            ]);
            n.esperar(1.2);
        });
        const [m4, m5] = [modelos[3], modelos[4]];
        n.decir(`Cada variable que se agrega sube el R², aunque sea un poquito: con la de ruido pasa de ${numero(m4.r2, 4)} a ${numero(m5.r2, 4)}. El R² nunca baja, porque mínimos cuadrados puede usar la variable nueva aunque sea para ajustar casualidades.`);
        n.decir(`El R² ajustado, 1 − (1 − R²)(n − 1)/(n − k − 1), le cobra cada variable. Con la de ruido baja de ${numero(m4.r2Ajustado, 4)} a ${numero(m5.r2Ajustado, 4)}: la variable no aporta.`);
        n.decir('Por eso, para comparar un modelo simple con uno múltiple, se usa el R² ajustado.');
        return {
            titulo: 'Más variables, ¿mejor modelo?', descripcion: 'El R² y el R² ajustado de cinco modelos con cada vez más variables; la última es puro ruido.',
            ancho: W, alto: H, pausaFinal: 1.5, piezas, linea: n.linea,
        };
    });
}());

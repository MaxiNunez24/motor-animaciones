// Piezas que se acomodan solas y ventanas que agrandan otra parte:
//   - una fila que corre a sus piezas cuando una crece, con cosas pegadas a ellas;
//   - dos nombres para la misma lista, con la flecha enganchada a las listas;
//   - un espejo que muestra agrandada la línea que corre, al lado de las variables;
//   - una lupa redonda que pasa por una tabla.

(function () {
    const { caja, texto, flecha, fila, espejo, tabla, crearNarrador, codigo, lista, variable, lineaDeCodigo } = Motor;

    const titulo = (d, t) => texto({ x: 800, y: 60, texto: t, tamano: 44, peso: 800 });

    // ---------------- 1. Una fila que se acomoda ----------------
    Motor.registrar('vinculos-fila', (d) => {
        const paso = (id, t, extra = {}) => caja({ ancho: 240, alto: 120, texto: t, tamano: 30, ...extra });
        const piezas = {
            titulo: titulo(d, 'Una fila que se acomoda sola'),
            // La fila va antes que sus piezas: su caja queda detrás.
            f: fila({ x: 800, y: 400, piezas: ['a', 'b', 'c', 'd'], separacion: 70, margen: 28, borde: 'borde', radio: 22 }),
            a: paso('a', 'leer'),
            b: paso('b', 'procesar'),
            c: paso('c', 'guardar'),
            d: paso('d', 'avisar', { escala: 0, borde: 'exito' }),
            ab: flecha({ desde: 'a', hasta: 'b', separacion: 8, grosor: 4 }),
            bc: flecha({ desde: 'b', hasta: 'c', separacion: 8, grosor: 4 }),
            cd: flecha({ desde: 'c', hasta: 'd', separacion: 8, grosor: 4, progreso: 0, color: 'exito' }),
            nota: caja({
                x: 1300, y: 160, ancho: 300, alto: 70, texto: 'pegada a «guardar»', tamano: 22, relleno: 'fondo', borde: 'acento2',
                pegar: { a: 'c', lado: 'arriba', separacion: 50 },
            }),
            nc: flecha({ desde: 'nota', hasta: 'c', grosor: 3, color: 'acento2', separacion: 6 }),
            pie: texto({ texto: 'Debajo de la fila, centrado: va adonde vaya ella.', tamano: 26, color: 'suave', pegar: { a: 'f', lado: 'abajo', separacion: 50 } }),
        };
        const n = crearNarrador({ ritmo: 1.2 });
        n.decir('Una fila acomoda sus piezas una al lado de la otra. Nadie escribió dónde va cada caja: solo en qué orden van.');
        n.decir('Si una crece, corre a las que vienen después. Y la nota, pegada arriba de «guardar», la acompaña.', 0);
        n.animar({ pieza: 'b', a: { ancho: 480, texto: 'procesar con cuidado' }, dur: 1.4 }, 0.6);
        n.esperar(0.8);
        n.decir('Una pieza nueva entra con la escala de 0 a 1: va abriendo su lugar de a poco, sin empujones.', 0);
        n.animar([
            { pieza: 'd', a: { escala: 1 }, dur: 1.2 },
            { pieza: 'cd', a: { progreso: 1 }, dur: 0.8, en: '<0.6' },
        ], 0.6);
        n.esperar(1);
        n.decir('Si se mueve la fila, se mueve todo lo que está acomodado en ella y pegado a ella.', 0);
        n.animar({ pieza: 'f', a: { y: 470 }, dur: 1.2 }, 0.5);
        n.esperar(0.8);
        n.decir('Con pegado de 1 a 0, la nota se despega de a poco y vuelve a su lugar propio.', 0);
        n.animar({ pieza: 'nota', a: { pegado: 0 }, dur: 1.4 }, 0.6);
        n.esperar(1);
        return {
            titulo: 'Una fila que se acomoda sola', ancho: 1600, alto: 900, piezas, linea: n.linea, pausaFinal: 1,
            descripcion: 'Cuatro pasos en fila; uno crece y corre a los demás, entra uno nuevo, y una nota pegada a «guardar» los acompaña.',
        };
    });

    // ---------------- 2. La flecha pegada a las listas ----------------
    Motor.registrar('vinculos-listas', () => {
        const piezas = {
            titulo: titulo(null, 'Dos nombres, la misma lista'),
            a: lista({ x: 860, y: 320, nombre: 'a', items: ['1', '2'], celda: 100 }),
            b: lista({ x: 860, y: 600, nombre: 'b', items: ['1', '2'], celda: 100, opacidad: 0 }),
            alias: flecha({
                desde: { pieza: 'a', lado: 'izquierda', dx: -16 }, hasta: { pieza: 'b', lado: 'izquierda', dx: -16 },
                curvatura: 0.45, separacion: 0, color: 'acento2', etiqueta: 'la misma lista', colorEtiqueta: 'acento2',
                ladoEtiqueta: -1, girarEtiqueta: true, progreso: 0,
            }),
            codigoA: texto({ texto: 'a.append(…)', fuente: 'mono', tamano: 28, color: 'suave', alineacion: 'inicio', pegar: { a: 'a', lado: 'derecha', separacion: 40 } }),
        };
        const n = crearNarrador({ ritmo: 1.2 });
        n.decir('a es una lista. Con b = a, b no es una copia: es otro nombre para la misma lista.');
        n.animar([{ pieza: 'b', a: { opacidad: 1 }, dur: 0.6 }, { pieza: 'alias', a: { progreso: 1 }, dur: 1, en: '<0.3' }], -1.5);
        let items = ['1', '2'];
        n.decir('La flecha está enganchada al costado izquierdo de las dos listas. Cuando crecen, se corre con ellas.', 0);
        for (const v of ['3', '4', '5', '6']) {
            items = [...items, v];
            n.animar([{ pieza: ['a', 'b'], a: { items }, dur: 0.01 }], 0.8);
            n.esperar(1.1);
        }
        n.decir('Lo de la derecha está pegado al costado derecho de a: también se corre, sin que nadie calcule cuánto.');
        return {
            titulo: 'Dos nombres, la misma lista', ancho: 1600, alto: 900, piezas, linea: n.linea, pausaFinal: 1,
            descripcion: 'Dos nombres para la misma lista; la lista crece y la flecha que los une se corre con ella.',
        };
    });

    // ---------------- 3. Un espejo de la línea que corre ----------------
    const programa = [
        'precios = [1200, 850, 430, 2100]',
        'descuento = 0.1',
        'total = 0',
        'for p in precios:',
        '    con_descuento = p - p * descuento',
        '    total = total + con_descuento',
        'envio = 0 if total > 3000 else 500',
        'print("Total:", total + envio)',
    ].join('\n');
    // Línea por línea: qué línea corre y qué variables cambian.
    const pasos = [
        [1, {}], [2, { descuento: '0.1' }], [3, { total: '0' }],
        [4, { p: '1200' }], [5, { con: '1080.0' }], [6, { total: '1080.0' }],
        [4, { p: '850' }], [5, { con: '765.0' }], [6, { total: '1845.0' }],
        [4, { p: '430' }], [5, { con: '387.0' }], [6, { total: '2232.0' }],
        [4, { p: '2100' }], [5, { con: '1890.0' }], [6, { total: '4122.0' }],
        [7, { envio: '0' }], [8, {}],
    ];
    Motor.registrar('espejo-linea', () => {
        const cod = codigo({ x: 420, y: 470, ancho: 760, codigo: programa, tamano: 22, linea: 0, marca: 0, titulo: 'compras.py' });
        const vars = ['descuento', 'total', 'p', 'con', 'envio'];
        const piezas = {
            titulo: titulo(null, 'Un espejo de la línea que corre'),
            codigo: cod,
            ...Object.fromEntries(vars.map((v, i) => [v, variable({
                x: 1060 + (i % 2) * 300, y: 220 + Math.floor(i / 2) * 130, nombre: v === 'con' ? 'con_descuento' : v, valor: '', ancho: 260, tamano: 24, opacidad: 0,
            })])),
            // Del alto justo de una línea, y del ancho de la más larga.
            lente: espejo({
                x: 1060, y: 720, ancho: 1000, alto: lineaDeCodigo(cod, 1).alto * 1.8 + 6, zoom: 1.8, fuente: 'codigo', marco: true,
                // A lo ancho, desde el principio de la línea.
                mirarX: cod.props.x - cod.props.ancho / 2 + 1000 / 1.8 / 2,
                mirarY: lineaDeCodigo(cod, 1).y, opacidad: 0,
            }),
            rotulo: texto({ texto: 'La línea que corre, agrandada (se puede arrastrar)', tamano: 20, color: 'suave', pegar: { a: 'lente', lado: 'arriba', separacion: 14 } }),
        };
        const n = crearNarrador({ ritmo: 1 });
        n.decir('En la columna de una clase el código se ve chico. El espejo muestra agrandada la línea que corre, al lado de las variables.');
        n.animar([{ pieza: ['lente', 'rotulo'], a: { opacidad: 1 }, dur: 0.6 }, { pieza: 'codigo', a: { linea: 1, marca: 1 }, dur: 0.4 }], -2);
        n.decir('No es una copia: es la misma línea vista otra vez. Lo que se marca allá se marca acá.', 0.2);
        pasos.forEach(([k, cambios], i) => {
            const items = [
                { pieza: 'codigo', a: { linea: k }, dur: 0.35 },
                { pieza: 'lente', a: { mirarY: lineaDeCodigo(cod, k).y }, dur: 0.35, en: '<' },
            ];
            for (const [v, valor] of Object.entries(cambios)) {
                items.push({ pieza: v, a: { valor, opacidad: 1, destello: 1 }, dur: 0.3, en: '<0.2' }, { pieza: v, a: { destello: 0 }, dur: 0.5, en: '>' });
            }
            if (i > 0) n.animar(items);
            n.esperar(i === 0 ? 0 : 1);
        });
        n.decir('El total pasó de 3000: el envío es gratis. El espejo siguió a la marca todo el tiempo.');
        return {
            titulo: 'Un espejo de la línea que corre', ancho: 1600, alto: 900, piezas, linea: n.linea, pausaFinal: 1,
            descripcion: 'Un programa que suma precios con descuento; un espejo muestra agrandada la línea que corre, junto a las variables.',
        };
    });

    // ---------------- 4. Una lupa sobre una tabla ----------------
    const filas = [
        ['Ana', 'Electricidad', '12', '8,5'], ['Bruno', 'Programación', '9', '7'], ['Carla', 'Gastronomía', '14', '9,5'],
        ['Diego', 'Programación', '5', '4'], ['Eva', 'Electricidad', '11', '8'], ['Facundo', 'Gastronomía', '7', '6,5'],
        ['Gala', 'Programación', '13', '9'], ['Hugo', 'Electricidad', '3', '2'], ['Inés', 'Gastronomía', '10', '7,5'],
    ];
    Motor.registrar('espejo-lupa', () => {
        const t = tabla({ x: 800, y: 500, columnas: ['nombre', 'curso', 'presentes', 'nota'], filas, ancho: 760, altoFila: 46, tamano: 18 });
        const yFila = (i) => 500 - (filas.length + 1) * 46 / 2 + 46 * (i + 1.5);
        // Donde arranca lo escrito en cada columna (el texto va a la izquierda de la celda).
        const xCol = (j) => 800 - 760 / 2 + (760 / 4) * j + 50;
        const lupa = (x, y) => ({ x, y });
        const piezas = {
            titulo: titulo(null, 'Una lupa sobre la tabla'),
            t,
            // Una lupa animada: mira siempre lo que tiene debajo (seguir) y la
            // mueve la escena, así que no se arrastra.
            lupa: espejo({ ...lupa(xCol(2), yFila(0)), seguir: true, forma: 'circulo', ancho: 230, alto: 230, zoom: 2, aro: 8, colorAro: 'texto', opacidad: 0 }),
        };
        const n = crearNarrador({ ritmo: 1 });
        n.decir('Un espejo redondo que mira justo el lugar donde está es una lupa: agranda lo que tiene abajo.');
        n.animar({ pieza: 'lupa', a: { opacidad: 1 }, dur: 0.5 }, -2);
        n.decir('Pasa por la columna de los presentes, fila por fila.', 0);
        filas.forEach((_, i) => {
            if (i > 0) n.animar({ pieza: 'lupa', a: lupa(xCol(2), yFila(i)), dur: 0.7 }, 0.2);
            n.esperar(0.9);
        });
        n.decir('Esta lupa la mueve la animación. Para una propia, que se mueve y se agranda a gusto, está el botón de la lupa, arriba a la derecha.');
        n.animar({ pieza: 'lupa', a: lupa(xCol(0), yFila(4)), dur: 1.2 }, -2);
        return {
            titulo: 'Una lupa sobre la tabla', ancho: 1600, alto: 900, piezas, linea: n.linea, pausaFinal: 1,
            descripcion: 'Una lupa redonda recorre la columna de presentes de una tabla de alumnos inventados.',
        };
    });
})();

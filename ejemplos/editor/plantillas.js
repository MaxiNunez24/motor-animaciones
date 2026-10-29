// Las plantillas del editor: con qué se puede arrancar. Cada una es el texto
// que aparece en el editor, tal cual (por eso son textos y no objetos).

window.PLANTILLAS = {
    'Cajas y una flecha': `// Dos cajas y una flecha que las une. Probá cambiar los textos,
// los colores ('acento', 'exito', 'error', 'papel'...) o los tiempos.
return {
    // titulo es el nombre de la escena (lo lee un lector de pantalla y va en
    // la descripción del video); no se dibuja. Lo que se ve es la pieza encabezado.
    titulo: 'De la idea al programa',
    ancho: 1600,
    alto: 900,
    piezas: {
        encabezado: texto({ x: 800, y: 110, texto: 'De la idea al programa', tamano: 56, peso: 800, escrito: 0 }),
        idea: caja({ x: 450, y: 450, texto: 'Una idea', icono: '💡', opacidad: 0 }),
        programa: caja({ x: 1150, y: 450, texto: 'Un programa', icono: '🐍', relleno: 'papel', opacidad: 0 }),
        camino: flecha({ desde: 'idea', hasta: 'programa', progreso: 0, etiqueta: 'pensamiento computacional', curvatura: -0.2 }),
    },
    linea: [
        { capitulo: 'Empieza' },
        { pieza: 'encabezado', a: { escrito: 1 }, dur: 0.8, curva: 'lineal' },
        { pieza: 'idea', a: { opacidad: 1 } },
        { subtitulo: 'Todo arranca con una idea.', en: '<' },
        { pieza: 'camino', a: { progreso: 1 }, dur: 1.2 },
        { pieza: 'programa', a: { opacidad: 1, escala: 1.05 }, curva: 'pasarse' },
        { subtitulo: 'Y paso a paso se convierte en un programa.', en: '<' },
        { espera: 'subtitulo' },
    ],
};`,

    'Un celular': `// Un celular con una app adentro: las piezas con dentro: 'cel'
// usan las medidas de la pantalla (360 de ancho, como un celular de verdad).
return {
    titulo: 'Mi app',
    ancho: 1600,
    alto: 900,
    piezas: {
        encabezado: texto({ x: 330, y: 450, texto: 'Mi app', tamano: 64, peso: 800, opacidad: 0 }),
        cel: celular({ x: 800, y: 470, alto: 760, titulo: 'Lista de compras', opacidad: 0 }),
        item1: caja({ dentro: 'cel', x: 180, y: 170, ancho: 320, alto: 76, texto: '🍞 Pan', opacidad: 0 }),
        item2: caja({ dentro: 'cel', x: 180, y: 260, ancho: 320, alto: 76, texto: '🥛 Leche', opacidad: 0 }),
        item3: caja({ dentro: 'cel', x: 180, y: 350, ancho: 320, alto: 76, texto: '🍎 Manzanas', opacidad: 0 }),
    },
    linea: [
        { pieza: ['encabezado', 'cel'], a: { opacidad: 1 } },
        { pieza: ['item1', 'item2', 'item3'], a: { opacidad: 1 }, escalonar: 0.4 },
        { pieza: 'item2', a: { relleno: 'exito', color: 'fondo' }, en: '+0.5' },
        { subtitulo: 'Tocás un elemento y queda marcado.', en: '<' },
        { espera: 'subtitulo' },
    ],
};`,

    'Una tabla que se llena': `// Una tabla que se va llenando, y un contador que la sigue.
return {
    titulo: 'Asistencia de hoy',
    ancho: 1600,
    alto: 900,
    piezas: {
        encabezado: texto({ x: 800, y: 110, texto: 'Asistencia de hoy', tamano: 56, peso: 800 }),
        lista: tabla({
            x: 600, y: 470, ancho: 700,
            columnas: ['Alumno', 'Llegó'],
            filas: [['Ana', '18:02'], ['Beto', '18:05'], ['Cami', '18:11'], ['Dani', '18:20']],
            filasVisibles: 0,
        }),
        cuantos: contador({ x: 1250, y: 450, valor: 0, tamano: 140, color: 'acento' }),
        rotulo: texto({ x: 1250, y: 560, texto: 'presentes', color: 'suave' }),
    },
    linea: [
        { pieza: 'lista', a: { filasVisibles: 4 }, dur: 3, curva: 'lineal' },
        { pieza: 'cuantos', a: { valor: 4 }, dur: 3, curva: 'lineal', en: '<' },
        { subtitulo: 'A medida que llegan, la cuenta sube sola.', en: '<' },
        { espera: 'subtitulo' },
    ],
};`,

    'Un programa, paso a paso': `// Un programa de Python, paso a paso. Acá la traza está escrita a mano;
// con herramientas/trazar.py (o con Pyodide) sale sola de un programa de verdad.
return desdeTraza({
    titulo: 'Una variable que cambia',
    archivo: 'contar.py',
    codigo: 'cuenta = 0\\ncuenta = cuenta + 1\\ncuenta = cuenta + 1\\nprint(cuenta)',
    explicar: true,
    traza: [
        { linea: 1, variables: {} },
        { linea: 2, variables: { cuenta: { tipo: 'int', repr: '0' } } },
        { linea: 3, variables: { cuenta: { tipo: 'int', repr: '1' } } },
        { linea: 4, variables: { cuenta: { tipo: 'int', repr: '2' } } },
        { linea: 0, variables: { cuenta: { tipo: 'int', repr: '2' } }, salida: '2\\n' },
    ],
    preguntas: {
        2: { pregunta: '¿Cuánto va a valer cuenta después de esta línea?', opciones: ['1', '2'], correcta: 1 },
    },
});`,

    'Vacía': `return {
    ancho: 1600,
    alto: 900,
    piezas: {
        hola: texto({ x: 800, y: 450, texto: 'Hola', tamano: 120, peso: 800, escrito: 0 }),
    },
    linea: [
        { pieza: 'hola', a: { escrito: 1 }, dur: 1, curva: 'lineal' },
    ],
};`,
};

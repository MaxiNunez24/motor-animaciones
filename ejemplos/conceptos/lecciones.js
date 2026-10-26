// Tres conceptos, paso a paso:
//
//   - bucle-for:   un for que recorre una lista y va sumando.
//   - diccionario: claves y valores, y el KeyError de pedir una que no está.
//   - evento-clic: una función que no corre hasta que alguien toca el botón.
//
// Las dos primeras salen de programas de verdad (programas/*.py), trazados con
// herramientas/trazar.py. La de JavaScript está escrita a mano, en el mismo
// formato: en el navegador no hay un settrace para JavaScript.
//
// Lo que se escribe acá es lo que no sale del programa: qué decir en cada
// paso, y dónde frenar a preguntar.

(function () {
    const { desdeTraza, caja, texto } = Motor;

    Motor.registrar('bucle-for', desdeTraza({
        ...Motor.trazas['bucle-for'],
        titulo: 'Un for que va sumando',
        archivo: 'suma.py',
        descripcion: 'Un programa que recorre la lista [4, 8, 15] con un for y va sumando sus elementos en total.',
        punteros: { numeros: 'n' },
        explicaciones: {
            0: 'El programa arranca por la primera línea.',
            1: 'numeros guarda una lista con tres números.',
            2: 'total arranca en 0: ahí vamos a ir sumando.',
            3: 'El for toma el primer elemento de la lista: n vale 4.',
            4: 'total + n da 4. Vuelve al for, a buscar el siguiente.',
            5: 'Segunda vuelta: n ahora vale 8.',
            6: '4 + 8 = 12, y otra vez al for.',
            7: 'Tercera vuelta: n vale 15.',
            8: 'Ya no quedan elementos: el for termina.',
            9: 'Muestra el resultado.',
            10: 'Listo. El for repitió la línea 4 una vez por cada elemento de la lista.',
        },
        preguntas: {
            7: {
                pregunta: 'total vale 12 y n vale 15. ¿Cuánto va a valer total después de la línea 4?',
                opciones: ['15', '27', '12'],
                correcta: 1,
                explicacion: 'total + n es 12 + 15, y eso se guarda en total: 27.',
            },
        },
    }));

    Motor.registrar('diccionario', desdeTraza({
        ...Motor.trazas['diccionario'],
        titulo: 'Un diccionario, y una clave que no está',
        archivo: 'edades.py',
        descripcion: 'Un diccionario de edades: se agrega una clave, se lee otra, y al pedir una que no existe el programa se corta con KeyError.',
        ritmo: 1.8,
        explicaciones: {
            0: 'El programa arranca.',
            1: 'edades es un diccionario: a cada nombre (la clave) le corresponde una edad (el valor).',
            2: 'Asignarle algo a una clave nueva la agrega: ahora también está Cami.',
            3: 'edades["Ana"] busca la clave "Ana" y muestra su valor.',
            4: 'KeyError: la clave "Lucía" no está, y el programa se corta en esa línea.',
        },
        preguntas: {
            3: {
                pregunta: '"Lucía" no está en el diccionario. ¿Qué pasa en la línea 4?',
                opciones: ['Muestra None', 'Se corta con un error (KeyError)', 'Muestra 0'],
                correcta: 1,
                explicacion: 'Un diccionario no inventa valores: si la clave no está, es un error. Para no cortarse está edades.get("Lucía").',
            },
        },
    }));

    // ---- El evento, escrito a mano ----
    const PROGRAMA_JS = [
        'let clics = 0;',
        'const boton = document.querySelector("button");',
        'boton.addEventListener("click", function () {',
        '    clics = clics + 1;',
        '    console.log("Clics:", clics);',
        '});',
    ].join('\n');
    const numero = (n) => ({ tipo: 'number', repr: String(n) });
    const BOTON = { tipo: 'HTMLButtonElement', repr: '<button>' };
    // El clic: la mano aprieta y el botón se hunde un poquito.
    const clic = [
        { pieza: 'mano', a: { opacidad: 1 }, dur: 0.25 },
        { pieza: ['mano', 'boton'], a: { escala: 0.9 }, dur: 0.12, en: 0.3 },
        { pieza: ['mano', 'boton'], a: { escala: 1 }, dur: 0.2, en: 0.42 },
        { pieza: 'mano', a: { opacidad: 0 }, dur: 0.3, en: 0.9 },
    ];

    Motor.registrar('evento-clic', desdeTraza({
        codigo: PROGRAMA_JS,
        lenguaje: 'js',
        titulo: 'Un evento: la función espera el clic',
        archivo: 'pagina.js',
        descripcion: 'Un programa de JavaScript que cuenta los clics de un botón. La función no corre al cargar la página: corre cada vez que alguien hace clic.',
        ritmo: 1.6,
        traza: [
            { linea: 1, variables: {} },
            { linea: 2, variables: { clics: numero(0) } },
            { linea: 3, variables: { clics: numero(0), boton: BOTON } },
            { linea: 0, variables: { clics: numero(0), boton: BOTON } },
            { linea: 4, variables: { clics: numero(0), boton: BOTON }, animar: clic },
            { linea: 5, variables: { clics: numero(1), boton: BOTON } },
            { linea: 0, variables: { clics: numero(1), boton: BOTON }, salida: 'Clics: 1\n' },
            { linea: 4, variables: { clics: numero(1), boton: BOTON }, salida: 'Clics: 1\n', animar: clic },
            { linea: 5, variables: { clics: numero(2), boton: BOTON }, salida: 'Clics: 1\n' },
            { linea: 0, variables: { clics: numero(2), boton: BOTON }, salida: 'Clics: 1\nClics: 2\n' },
        ],
        explicaciones: {
            0: 'El programa arranca.',
            1: 'clics empieza en 0.',
            2: 'boton es el botón de la página.',
            3: 'addEventListener no ejecuta la función: la deja anotada para cuando haya un clic. El programa terminó, y la página espera.',
            4: '¡Clic! Recién ahora se ejecuta la función.',
            5: 'clics + 1: ahora vale 1.',
            6: 'Muestra la cuenta, y la función termina. La página vuelve a esperar.',
            7: 'Otro clic: la misma función, otra vez desde el principio.',
            8: 'clics no volvió a 0: está afuera de la función, y guarda la cuenta entre un clic y otro.',
            9: 'Cada clic es una ejecución nueva de la función.',
        },
        preguntas: {
            3: {
                pregunta: 'Si nadie toca el botón, ¿se ejecuta la función?',
                opciones: ['Sí, una vez, al cargar', 'No: espera el clic'],
                correcta: 1,
                explicacion: 'La función queda esperando: corre una vez por cada clic, y si no hay clics, nunca.',
            },
            7: {
                pregunta: 'Es el segundo clic. ¿Qué va a mostrar la consola?',
                opciones: ['Clics: 1', 'Clics: 2'],
                correcta: 1,
                explicacion: 'clics guardaba 1 del clic anterior: 1 + 1 = 2.',
            },
        },
        // La "página": el botón, y la mano que lo toca.
        piezas: (disposicion, lugar) => {
            const y = lugar.y + 40;
            return {
                pagina: texto({ x: lugar.col.x, y: y - 50, texto: 'La página', tamano: 22, color: 'suave', peso: 700 }),
                boton: caja({
                    x: lugar.col.x, y: y + 20, ancho: 240, alto: 84, texto: 'Tocame', tamano: 30,
                    relleno: 'acento', borde: 'acento', color: 'fondo',
                }),
                mano: texto({ x: lugar.col.x + 70, y: y + 70, texto: '👆', tamano: 64, opacidad: 0 }),
            };
        },
    }));
})();

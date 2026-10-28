// Funciones, recursión, referencias y objetos: lo que hace falta para entender
// las clases de Funciones I y II, y de POO.
//
// Las cuatro salen de programas de verdad (../conceptos/programas/*.py),
// trazados con herramientas/trazar.py, y se explican SOLAS (explicar: true):
// acá solo se escribe dónde frenar a preguntar. Es lo mismo que va a pasar con
// cualquier programa de un alumno.

(function () {
    const { desdeTraza } = Motor;
    const comun = { explicar: true, ritmo: 1.6 };

    Motor.registrar('funciones', desdeTraza({
        ...Motor.trazas.funciones,
        ...comun,
        titulo: 'Una función, llamada dos veces',
        archivo: 'sumar.py',
        descripcion: 'Una función sumar que se llama dos veces: cada llamada tiene sus propias variables, y devuelve un resultado.',
        preguntas: {
            5: {
                pregunta: 'x vale 7. ¿Cuánto va a valer y después de llamar a sumar(x, 10)?',
                opciones: ['10', '17', '7'],
                correcta: 1,
                explicacion: 'Adentro de sumar, a vale 7 y b vale 10: devuelve 17, y eso se guarda en y.',
            },
        },
    }));

    Motor.registrar('recursion', desdeTraza({
        ...Motor.trazas.recursion,
        ...comun,
        titulo: 'Una función que se llama a sí misma',
        archivo: 'factorial.py',
        descripcion: 'El factorial de 4 con recursión: la función se llama a sí misma con un número cada vez más chico, hasta llegar a 1, y después cada llamada devuelve su resultado a la de abajo.',
        preguntas: {
            9: {
                pregunta: 'Hay cuatro factorial esperando, y el de arriba va a devolver 1. ¿Qué va a devolver el factorial(4) del final?',
                opciones: ['4', '10', '24'],
                correcta: 2,
                explicacion: 'Cada llamada multiplica su n por lo que le devuelve la de arriba: 4 × 3 × 2 × 1 = 24.',
            },
        },
    }));

    Motor.registrar('pila', desdeTraza({
        ...Motor.trazas.pila,
        ...comun,
        titulo: 'Tres funciones, una pila',
        archivo: 'ticket.py',
        descripcion: 'ticket llama a subtotal, que llama a precio_con_iva: la pila de llamadas llega a tener tres marcos, y cada uno devuelve su resultado al de abajo.',
        lupa: true,
        lupaDebajoDe: 900,
    }));

    Motor.registrar('referencias', desdeTraza({
        ...Motor.trazas.referencias,
        ...comun,
        titulo: 'Dos nombres, una sola lista',
        archivo: 'referencias.py',
        descripcion: 'b = a no copia la lista: le pone otro nombre a la misma. Por eso agregar algo a b también cambia a. Una copia de verdad se hace con a.copy().',
        preguntas: {
            2: {
                pregunta: 'b.append(4) le agrega un 4 a b. ¿Qué pasa con a?',
                opciones: ['Sigue siendo [1, 2, 3]', 'También queda [1, 2, 3, 4]'],
                correcta: 1,
                explicacion: 'a y b son la misma lista: no hay dos listas, hay una sola con dos nombres.',
            },
        },
    }));

    Motor.registrar('objetos', desdeTraza({
        ...Motor.trazas.objetos,
        ...comun,
        titulo: 'Un objeto, sus atributos y self',
        archivo: 'alumno.py',
        descripcion: 'Una clase Alumno con su __init__ y un método marcar. self es el objeto sobre el que se llama al método, y otra = lucia no crea otra alumna: es la misma.',
        preguntas: {
            9: {
                pregunta: 'otra.marcar() le suma un presente a otra. ¿Cuánto va a valer lucia.presentes?',
                opciones: ['1', '2'],
                correcta: 1,
                explicacion: 'otra y lucia son el mismo objeto: el presente se le suma a una sola alumna, que ya tenía 1.',
            },
        },
    }));
})();

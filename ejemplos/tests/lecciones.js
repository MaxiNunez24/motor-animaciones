// Un test que falla, el error que encuentra, y el test que pasa.
//
// La función calcula el porcentaje de asistencia, como en el proyecto del
// curso. La primera versión divide antes de multiplicar: con números enteros,
// 10 // 20 da 0, y el porcentaje sale 0. Los tests lo encuentran.

(function () {
    Motor.registrar('tests-porcentaje', Motor.desdeTests({
        titulo: 'Un test que falla, y por qué es buena noticia',
        archivo: 'test_porcentaje.py',
        descripcion: 'Tres tests para una función que calcula el porcentaje de asistencia. Con la primera versión, uno falla: dividir antes de multiplicar da 0. Se corrige, y los tres pasan.',
        corridas: [
            { ...Motor.pruebas['con-error'], titulo: 'Corren los tests' },
            {
                ...Motor.pruebas.corregido,
                titulo: 'Corregido',
                explicacion: 'El error: 10 // 20 da 0, porque la división entera redondea para abajo, y 0 por 100 es 0. Se corrige multiplicando primero: 10 * 100 // 20 da 50.',
            },
        ],
        preguntas: {
            '0.test_mitad': {
                pregunta: 'Con este código, ¿qué va a dar porcentaje(10, 20)?',
                opciones: ['50', '0', '0.5'],
                correcta: 1,
                explicacion: 'presentes // clases es 10 // 20, que da 0 (la división entera redondea para abajo), y 0 * 100 es 0.',
            },
        },
    }));
})();

// La bolsa, las opciones y Black-Scholes, armados solos a partir de los
// números. Las empresas y los precios son inventados: no son una
// recomendación de nada.

(function () {
    const { desdeAccion, desdeInteres, desdePago, desdeBlackScholes, desdeGriegas, desdeEstrategias } = MotorFinanzas;

    Motor.registrar('fin-accion', desdeAccion({
        titulo: 'Una acción y su precio',
        S0: 100,
        sigma: 0.2,
        sigmaAlta: 0.45,
        dias: 126,
        preguntas: {
            derecho: {
                pregunta: 'Si pudieras tener el derecho (no la obligación) de comprar una de las dos a $ 110 dentro de seis meses, ¿cuál elegirías?',
                opciones: ['La tranquila', 'La que se sacude', 'Da lo mismo'],
                correcta: 1,
                explicacion: 'La que se sacude tiene más chances de terminar muy arriba de $ 110, y si termina abajo no estás obligado a comprar: no perdés más por eso.',
            },
        },
    }));

    Motor.registrar('fin-interes', desdeInteres({
        titulo: 'El valor del dinero en el tiempo',
        monto: 1000,
        tasa: 0.12,
        anios: 5,
        promesa: 2000,
        preguntas: {
            tasa: {
                pregunta: 'Si la tasa sube, lo que te prometen cobrar dentro de 5 años, ¿vale hoy más o menos?',
                opciones: ['Más', 'Menos', 'Lo mismo'],
                correcta: 1,
                explicacion: 'Se divide por un e^(rT) más grande.',
            },
        },
    }));

    Motor.registrar('fin-pago', desdePago({
        titulo: 'Qué paga una opción',
        K: 100,
        prima: 6,
        primaPut: 4,
        preguntas: {
            techo: {
                pregunta: '¿Cuánto es lo máximo que puede ganar quien compró el call?',
                opciones: ['La prima', 'K', 'No tiene techo'],
                correcta: 2,
                explicacion: 'Cuanto más suba la acción, más paga el call.',
            },
        },
    }));

    Motor.registrar('fin-bs', desdeBlackScholes({
        titulo: 'De dónde sale Black-Scholes',
        S: 100,
        K: 105,
        T: 0.5,
        r: 0.05,
        sigma: 0.25,
        sigmaAlta: 0.4,
        preguntas: {
            volatilidad: {
                pregunta: 'Si la volatilidad sube de 25 % a 40 %, ¿el call vale más o menos?',
                opciones: ['Más', 'Menos', 'Igual: el precio de hoy no cambió'],
                correcta: 0,
                explicacion: 'Lo que puede perder sigue siendo la prima, pero lo que puede ganar crece.',
            },
        },
    }));

    Motor.registrar('fin-griegas', desdeGriegas({
        titulo: 'Las griegas',
        S: 100,
        K: 100,
        T: 0.5,
        r: 0.05,
        sigma: 0.25,
        preguntas: {
            theta: {
                pregunta: 'Si pasa una semana y la acción no se mueve, ¿qué le pasa al precio del call?',
                opciones: ['Sube', 'Baja', 'Queda igual'],
                correcta: 1,
                explicacion: 'Queda menos tiempo para que la acción pase de K: el derecho vale menos.',
            },
        },
    }));

    Motor.registrar('fin-estrategias', desdeEstrategias({
        titulo: 'Estrategias con opciones',
        S: 100,
        T: 0.25,
        r: 0.05,
        sigma: 0.25,
        preguntas: {
            straddle: {
                pregunta: 'Comprás un call y un put con el mismo K = $ 100. ¿Qué tiene que pasar para que ganes?',
                opciones: ['Que suba', 'Que baje', 'Que se mueva mucho, para cualquier lado'],
                correcta: 2,
                explicacion: 'Si sube gana el call; si baja, el put. Lo único que no sirve es que se quede quieta.',
            },
        },
    }));
})();

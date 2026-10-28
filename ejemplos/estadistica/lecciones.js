// Intervalos de confianza y tests de hipótesis, armados solos a partir de los
// datos. Todos los datos son inventados.

(function () {
    const { desdeIntervalo, desdeCobertura, desdeTest, muestraNormal } = MotorMate;

    // Dieciséis esperas del colectivo, en minutos (inventadas, con semilla:
    // siempre las mismas).
    const esperas = muestraNormal({ n: 16, media: 12, desvio: 4, semilla: 31 }).map((v) => Math.round(Math.max(1, v) * 10) / 10);

    Motor.registrar('est-intervalo', desdeIntervalo({
        titulo: '¿Cuánto se espera el colectivo?',
        datos: esperas,
        etiqueta: 'minutos',
        unidad: 'min',
        confianza: 0.95,
        otraConfianza: 0.99,
        preguntas: {
            confianza: {
                pregunta: 'Si en vez del 95 % queremos un intervalo del 99 %, ¿qué le pasa?',
                opciones: ['Se achica', 'Se agranda', 'Queda igual'],
                correcta: 1,
                explicacion: 'Para atrapar a μ más seguido, la red tiene que ser más ancha.',
            },
        },
    }));

    Motor.registrar('est-cobertura', desdeCobertura({
        titulo: '¿Qué quiere decir 95 %?',
        media: 12,
        desvio: 4,
        n: 16,
        muestras: 25,
        confianza: 0.95,
        otraConfianza: 0.99,
        etiqueta: 'minutos',
        unidad: 'min',
        semilla: 6,
        preguntas: {
            cuantos: {
                pregunta: 'Si sacamos 25 muestras y armamos 25 intervalos del 95 %, ¿cuántos van a atrapar a μ?',
                opciones: ['Los 25, siempre', 'Más o menos 24', 'Más o menos la mitad'],
                correcta: 1,
                explicacion: 'El 95 % de 25 es 23,75: alrededor de 24, a veces uno más o uno menos.',
            },
        },
    }));

    Motor.registrar('est-test-no', desdeTest({
        titulo: '¿La máquina llena bien los paquetes?',
        media: 498.6,
        desvio: 4.1,
        n: 20,
        mu0: 500,
        alfa: 0.05,
        h0: 'μ = 500 g (llena bien)',
        h1: 'μ ≠ 500 g (está desajustada)',
        siRechaza: 'Hay evidencia de que la máquina está desajustada.',
        siNoRechaza: 'Con estos 20 paquetes no hay evidencia suficiente para decir que la máquina esté desajustada: un promedio de 498,6 g es esperable por azar aunque llene bien.',
        preguntas: {
            decision: {
                pregunta: 'El promedio dio 498,6 g, 1,4 g menos que 500. ¿Alcanza para decir que está desajustada?',
                opciones: ['Sí, claramente', 'Depende de cuánto varían los paquetes', 'No, nunca'],
                correcta: 1,
                explicacion: 'Una diferencia de 1,4 g es mucho o poco según el desvío y la cantidad de datos: eso mide T.',
            },
        },
    }));

    Motor.registrar('est-test-si', desdeTest({
        titulo: 'Después de cambiar una pieza',
        media: 503.1,
        desvio: 4.4,
        n: 25,
        mu0: 500,
        alfa: 0.05,
        h0: 'μ = 500 g (llena bien)',
        h1: 'μ ≠ 500 g (está desajustada)',
        siRechaza: 'Se rechaza H₀: hay evidencia de que, después del cambio, la máquina llena en promedio más de 500 g. Conviene volver a calibrarla.',
        siNoRechaza: 'No hay evidencia suficiente para decir que la máquina esté desajustada.',
        notas: ['Rechazar H₀ con α = 0,05 quiere decir que, si la máquina llenara bien, un resultado así aparecería menos de 5 veces cada 100. Es el riesgo de equivocarnos que aceptamos: el error de tipo I.'],
    }));
}());

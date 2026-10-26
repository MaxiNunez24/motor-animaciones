// Consultas SQL, paso a paso, sobre una tabla de alumnos inventada (los
// nombres no son de nadie). El motor recorre la tabla igual que SQLite: un
// test corre las mismas consultas en SQLite de verdad y compara el resultado.

(function () {
    const { desdeConsulta } = Motor;

    const alumnos = {
        nombre: 'alumnos',
        columnas: ['nombre', 'curso', 'presentes'],
        filas: [
            ['Lucía', 'Programación', 12],
            ['Martín', 'Electricidad', 5],
            ['Sofía', 'Programación', 9],
            ['Diego', 'Gastronomía', 14],
            ['Ana', 'Electricidad', 3],
            ['Pablo', 'Programación', 7],
        ],
    };
    Motor.datos = Motor.datos || {};
    Motor.datos.alumnos = alumnos;

    Motor.registrar('sql-filtrar', desdeConsulta({
        tabla: alumnos,
        titulo: 'Filtrar y ordenar',
        sql: 'SELECT nombre, presentes FROM alumnos WHERE presentes >= 8 ORDER BY presentes DESC',
        preguntas: {
            donde: {
                pregunta: '¿Cuántas filas van a cumplir presentes >= 8?',
                opciones: ['2', '3', '4'],
                correcta: 1,
                explicacion: 'Lucía (12), Sofía (9) y Diego (14). Martín, Ana y Pablo tienen menos de 8.',
            },
            orden: {
                pregunta: 'Con ORDER BY presentes DESC, ¿quién va a quedar primero?',
                opciones: ['Lucía', 'Diego', 'Sofía'],
                correcta: 1,
                explicacion: 'DESC es de mayor a menor, y Diego tiene 14.',
            },
        },
    }));

    Motor.registrar('sql-y', desdeConsulta({
        tabla: alumnos,
        titulo: 'Dos condiciones a la vez',
        sql: "SELECT nombre FROM alumnos WHERE curso = 'Programación' AND presentes > 8",
        preguntas: {
            donde: {
                pregunta: 'Con AND, una fila tiene que cumplir las dos condiciones. ¿Cuántas van a quedar?',
                opciones: ['1', '2', '3'],
                correcta: 1,
                explicacion: 'Son de Programación Lucía, Sofía y Pablo; de esos, solo Lucía y Sofía tienen más de 8.',
            },
        },
    }));
})();

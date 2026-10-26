// El Sistema de Gestión de Alumnos: cómo se va a ver.
//
// Para la Expo CFP del 13/11/2026. Se ve en loop en una pantalla grande y en
// el celular. Cuenta el problema de hoy (la asistencia en papel, pasada a
// planillas que se copian a mano) y cómo va a funcionar (el alumno avisa que
// llegó, el docente pasa lista desde el celular, los datos quedan en una base
// y la planilla oficial sale sola).
//
// De dónde salen los datos: de "El proyecto, por partes" (proyecto.mdx), que es
// público, y de lo GENERAL de "Cómo trabaja cada uno" (casos.mdx), que no lo
// es: acá no hay citas, ni fechas de entrevistas, ni nada que identifique a
// nadie. Los nombres y el DNI son inventados, los mismos de los bocetos.
// El bot del SiGeS no va: es interno.
//
// Lo de adentro (el "mundo") se arma una sola vez, en coordenadas de 1600 × 900.
// Lo que cambia entre la compu y el celular es por dónde lo mira la cámara: en
// ancho se ve entero; en angosto la cámara se acerca a la parte que se cuenta.

(function () {
    const { caja, texto, flecha, tabla, celular, camara, contador, cilindro } = Motor;

    const ALUMNOS = ['GÓMEZ, L.', 'ALVAREZ, N.', 'BENITEZ, M.', 'CABRERA, J.'];
    const LLEGADAS = ['17:58', '18:02', '18:21', '—'];
    const LISTA = ['P', 'P', 'T', 'A'];
    const COLOR_LISTA = { P: 'exito', T: 'alerta', A: 'error' };

    Motor.registrar('expo-siges', function (disposicion) {
        const angosta = disposicion.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 1140 : 900;

        // ---------------- El mundo ----------------
        // Todo esto va dentro de la cámara. Cada pieza arranca invisible.
        const enMundo = (fabrica, props) => fabrica({ dentro: 'cam', opacidad: 0, ...props });

        const hoy = {
            papelTitulo: enMundo(texto, { x: 330, y: 280, texto: '📝 En papel', tamano: 32, peso: 700 }),
            papel: enMundo(tabla, {
                x: 330, y: 500, ancho: 420, altoFila: 62, tamano: 28, rotacion: -2,
                columnas: ['Alumno', 'Vie 13'], anchos: [280, 140],
                filas: [['ALVAREZ, N.', '✓'], ['BENITEZ, M.', '✓'], ['CABRERA, J.', ''], ['GÓMEZ, L.', '✓']],
                relleno: 'papel', encabezado: 'alerta', borde: 'alerta', filasVisibles: 0,
            }),
            planillaTitulo: enMundo(texto, { x: 850, y: 280, texto: '💻 En una planilla', tamano: 32, peso: 700 }),
            planilla: enMundo(tabla, {
                x: 850, y: 500, ancho: 420, altoFila: 62, tamano: 28,
                columnas: ['Alumno', '13/11'], anchos: [280, 140],
                filas: [['ALVAREZ, N.', 'P'], ['BENITEZ, M.', 'P'], ['CABRERA, J.', 'A'], ['GÓMEZ, L.', 'P']],
                filasVisibles: 0,
            }),
        };
        const COPIAS = ['Ficha de curso', 'Listado de cursos', 'La planilla del mes', 'Otro sistema'];
        COPIAS.forEach((nombre, i) => {
            hoy['copia' + i] = enMundo(caja, {
                x: 1330, y: 330 + i * 110, ancho: 380, alto: 92, radio: 6,
                texto: '✍️ ' + nombre, tamano: 28, relleno: 'papel', borde: 'alerta', escala: 0.9,
            });
        });

        const manana = {
            entran: enMundo(texto, { x: 300, y: 225, texto: 'ENTRAN', tamano: 24, peso: 800, color: 'suave' }),
            guardan: enMundo(texto, { x: 800, y: 225, texto: 'SE GUARDAN', tamano: 24, peso: 800, color: 'suave' }),
            salen: enMundo(texto, { x: 1300, y: 225, texto: 'SALEN', tamano: 24, peso: 800, color: 'suave' }),
            teclado: enMundo(caja, {
                x: 300, y: 360, ancho: 380, alto: 180, icono: '🔢', tamanoIcono: 48,
                texto: 'DNI: 41 678 277', tamano: 30, escrito: 0,
            }),
            base: enMundo(cilindro, { x: 800, y: 330, ancho: 200, alto: 140, texto: 'Base de datos', tamano: 22 }),
            datos: enMundo(tabla, {
                x: 800, y: 590, ancho: 460, altoFila: 56, tamano: 24,
                columnas: ['Alumno', 'Llegó', 'Lista'], anchos: [220, 120, 120],
                filas: ALUMNOS.map((a, i) => [a, LLEGADAS[i], '']),
                filasVisibles: 0,
            }),
            cel: enMundo(celular, { x: 300, y: 690, alto: 400, titulo: 'Pasar lista · 13/11' }),
            guardar: caja({
                dentro: 'cel', x: 180, y: 640, ancho: 320, alto: 80, texto: 'Guardar', tamano: 30,
                relleno: 'acento', borde: 'acento', color: 'fondo', opacidad: 0,
            }),
            oficialTitulo: enMundo(texto, { x: 1300, y: 280, texto: '🖨️ Planilla oficial', tamano: 30, peso: 700 }),
            oficial: enMundo(tabla, {
                x: 1300, y: 420, ancho: 360, altoFila: 46, tamano: 24,
                columnas: ['Alumno', '13/11'], anchos: [240, 120],
                // Otra forma de mirar los mismos datos: en orden alfabético.
                filas: [['ALVAREZ, N.', 'P'], ['BENITEZ, M.', 'T'], ['CABRERA, J.', 'A'], ['GÓMEZ, L.', 'P']],
                relleno: 'papel', encabezado: 'texto', filasVisibles: 0,
            }),
            merienda: enMundo(caja, { x: 1300, y: 700, ancho: 340, alto: 210 }),
            meriendaTitulo: enMundo(texto, { x: 1300, y: 630, texto: '🍫 Para la merienda', tamano: 24, peso: 700 }),
            meriendaNumero: enMundo(contador, { x: 1300, y: 705, valor: 0, tamano: 90, color: 'acento' }),
            meriendaPie: enMundo(texto, { x: 1300, y: 772, texto: 'alumnos hoy en el CFP', tamano: 22, color: 'suave' }),
        };
        // La lista del celular: el nombre y lo que se marcó. Arranca con lo que
        // avisaron en la puerta (✓ llegó) y el docente lo confirma o lo corrige.
        ALUMNOS.forEach((alumno, i) => {
            const y = 150 + i * 92;
            manana['celNombre' + i] = caja({
                dentro: 'cel', x: 128, y, ancho: 232, alto: 76, texto: alumno, tamano: 24, opacidad: 0,
            });
            manana['celMarca' + i] = caja({
                dentro: 'cel', x: 298, y, ancho: 92, alto: 76, texto: LLEGADAS[i] === '—' ? '—' : '✓',
                tamano: 30, opacidad: 0,
            });
        });

        const idsHoy = Object.keys(hoy);
        const idsManana = Object.keys(manana).filter((id) => !id.startsWith('cel') || id === 'cel');

        // ---------------- Las flechas (sobre la pantalla, siguen a las piezas) ----------------
        const flechas = {
            aMano: flecha({ dentro: 'cam', desde: 'papel', hasta: 'planilla', progreso: 0, etiqueta: 'a mano', separacion: 16 }),
            otraVez: flecha({ dentro: 'cam', desde: 'planilla', hasta: 'copia1', progreso: 0, etiqueta: 'otra vez', separacion: 16 }),
            llega: flecha({ dentro: 'cam', desde: 'teclado', hasta: 'datos', progreso: 0, color: 'acento', curvatura: 0.15 }),
            pasaLista: flecha({ dentro: 'cam', desde: 'cel', hasta: 'datos', progreso: 0, color: 'acento', curvatura: -0.12 }),
            saleSola: flecha({ dentro: 'cam', desde: 'datos', hasta: 'oficial', progreso: 0, color: 'acento', curvatura: -0.15 }),
            aMerienda: flecha({ dentro: 'cam', desde: 'datos', hasta: 'merienda', progreso: 0, color: 'acento', curvatura: 0.12 }),
        };

        // ---------------- Lo que queda quieto en la pantalla ----------------
        const fijo = angosta
            ? {
                titulo: { x: 320, y: 50, tamano: 34 },
                bajada: { x: 320, y: 104, tamano: 28 },
                bandaY: 1062, cuenta1: { x: 320, y: 1030, tamano: 30 }, cuenta2: { x: 320, y: 1080, tamano: 30 },
                // En angosto los renglones se cortan a mano, donde se lee mejor.
                cierre1: { x: 320, y: 540, tamano: 62, texto: 'Se carga\nuna sola vez.' },
                cierre2: { x: 320, y: 700, tamano: 34, texto: 'Y le sirve a cada uno\na su manera.' },
                firma: { x: 320, y: 1060, tamano: 24, texto: 'Pensamiento Computacional y Testing\nCFP 401 Ensenada' },
            }
            : {
                titulo: { x: 800, y: 58, tamano: 44 },
                bajada: { x: 800, y: 108, tamano: 28 },
                bandaY: 832, cuenta1: null, cuenta2: { x: 800, y: 832, tamano: 38 },
                cierre1: { x: 800, y: 400, tamano: 76 },
                cierre2: { x: 800, y: 490, tamano: 38 },
                firma: { x: 800, y: 820, tamano: 26 },
            };

        const pantalla = {
            // Tapa lo de la cámara detrás del cartel de abajo, mientras se ve.
            banda: caja({ x: W / 2, y: fijo.bandaY, ancho: W, alto: angosta ? 150 : 90, radio: 0, relleno: 'fondo', borde: 'ninguno', opacidad: 0 }),
            titulo: texto({ ...fijo.titulo, texto: 'El Sistema de Gestión de Alumnos', peso: 800, escrito: 0 }),
            bajada: texto({ ...fijo.bajada, texto: 'Hoy', peso: 700, color: 'acento', opacidad: 0 }),
            cuenta1: texto({ ...(fijo.cuenta1 ?? { x: 0, y: 0 }), texto: 'Los mismos datos,', peso: 600, opacidad: 0 }),
            cuenta2: contador({
                ...fijo.cuenta2, valor: 2, peso: 700, opacidad: 0,
                prefijo: angosta ? 'escritos a mano en ' : 'Los mismos datos, escritos a mano en ', sufijo: ' lugares',
            }),
            cierre1: texto({ texto: 'Se carga una sola vez.', ...fijo.cierre1, peso: 800, opacidad: 0, escala: 0.94 }),
            cierre2: texto({ texto: 'Y le sirve a cada uno a su manera.', ...fijo.cierre2, color: 'suave', opacidad: 0 }),
            firma: texto({
                texto: 'Pensamiento Computacional y Testing · CFP 401 Ensenada', ...fijo.firma, color: 'suave', opacidad: 0,
            }),
        };

        // ---------------- La cámara ----------------
        // En angosto va a cada parte. En ancho muestra todo, y solo se acerca
        // al celular: es lo único que, entero, queda chico en una pantalla.
        // La ventana de la cámara es todo lo que queda debajo del título (que
        // ocupa los primeros 140): lo de adentro nunca pasa por detrás de él.
        const ventana = { x: W / 2, y: (140 + H) / 2, ancho: W, alto: H - 140 };
        const TODO = [800, ventana.y, 1];
        const MIRAR = angosta
            ? {
                papel: [330, 470, 1.35],
                planilla: [850, 470, 1.35],
                copias: [1330, 495, 1.35],
                todo: [825, 520, 0.42],
                teclado: [300, 360, 1.5],
                datos: [800, 500, 1.25],
                cel: [300, 690, 2.2],
                oficial: [1300, 410, 1.5],
                merienda: [1300, 700, 1.6],
            }
            : { cel: [420, 723, 1.5], datos: TODO, todo: TODO };
        const inicio = MIRAR.papel ?? TODO;
        const cam = camara({ ...ventana, mirarX: inicio[0], mirarY: inicio[1], zoom: inicio[2] });
        // Un movimiento de cámara, si en esta disposición hay a dónde ir.
        const mirar = (donde, en = '<', dur = 1.2) => {
            if (!MIRAR[donde]) return null;
            const [x, y, z] = MIRAR[donde];
            return { pieza: 'cam', a: { mirarX: x, mirarY: y, zoom: z }, dur, en, curva: 'suave' };
        };
        const aparecer = (ids, extra = {}) => ({ pieza: ids, a: { opacidad: 1 }, dur: 0.5, ...extra });
        // Cambiar el texto de la bajada sin que salte: se apaga, cambia y se prende.
        const bajada = (nuevo) => [
            { pieza: 'bajada', a: { opacidad: 0 }, dur: 0.3 },
            { pieza: 'bajada', a: { texto: nuevo }, dur: 0 },
            { pieza: 'bajada', a: { opacidad: 1 }, dur: 0.4 },
        ];
        // Cada paso arranca con su subtítulo y termina cuando se terminó de
        // leer, aunque sus animaciones hayan terminado antes. La espera corta
        // de en medio marca dónde empieza el paso: lo que sigue con '<' arranca
        // con el subtítulo (los subtítulos no cuentan como "lo anterior").
        const leer = (subtitulo) => [{ espera: 'subtitulo' }, { espera: 0.4 }, { subtitulo, en: '>' }];
        const cuenta = angosta ? ['banda', 'cuenta1', 'cuenta2'] : ['banda', 'cuenta2'];

        const linea = [
            // ======== Hoy ========
            { capitulo: 'Hoy' },
            { pieza: 'titulo', a: { escrito: 1 }, dur: 1.4, curva: 'lineal' },
            { pieza: 'bajada', a: { opacidad: 1 }, dur: 0.5, en: '<0.8' },
            { subtitulo: 'Hoy, la asistencia se anota en papel.', en: 1 },
            aparecer(['papelTitulo', 'papel'], { en: '<0.2' }),
            { pieza: 'papel', a: { filasVisibles: 4 }, dur: 2.2, curva: 'lineal' },

            ...leer('Después, alguien la pasa a mano a una planilla.'),
            mirar('planilla', '<'),
            aparecer(['planillaTitulo', 'planilla'], { en: '<0.6' }),
            { pieza: 'aMano', a: { progreso: 1 }, dur: 0.9, en: '<' },
            { pieza: 'planilla', a: { filasVisibles: 4 }, dur: 2.2, curva: 'lineal' },
            aparecer(cuenta, { en: '<1.2' }),

            ...leer('Y los mismos datos se vuelven a escribir en cada planilla nueva, y en otro sistema.'),
            mirar('copias', '<'),
            { pieza: 'otraVez', a: { progreso: 1 }, dur: 0.8, en: '<0.6' },
            { pieza: idsHoy.filter((id) => id.startsWith('copia')), a: { opacidad: 1, escala: 1 }, dur: 0.45, escalonar: 0.9, curva: 'pasarse' },
            { pieza: 'cuenta2', a: { valor: 6 }, dur: 3.2, en: '<0.3', curva: 'lineal' },

            ...leer('Es mucho trabajo, y es muy fácil equivocarse.'),
            mirar('todo', '<', 1.4),
            { espera: 'subtitulo' },
            { pieza: [...idsHoy, 'aMano', 'otraVez', ...cuenta], a: { opacidad: 0 }, dur: 0.8, en: '+0.6' },

            // ======== Cómo va a funcionar ========
            { capitulo: 'Cómo va a funcionar', en: '+0.2' },
            ...bajada('Cómo va a funcionar'),
            mirar('teclado', '<', 0.01),
            aparecer(['entran', 'guardan', 'salen'], { escalonar: 0.15 }),

            { subtitulo: 'El alumno avisa que llegó: escribe su DNI en la puerta.', en: '<' },
            aparecer('teclado', { en: '<0.3' }),
            { pieza: 'teclado', a: { escrito: 1 }, dur: 1.3, curva: 'lineal' },
            { pieza: 'teclado', a: { texto: '¿Sos Lucía G.?\n✓ Llegó: 17:58', escrito: 0 }, dur: 0, en: '+0.5' },
            { pieza: 'teclado', a: { escrito: 1, borde: 'exito' }, dur: 0.8, curva: 'lineal' },

            ...leer('Y así cada uno: las llegadas quedan guardadas en una base de datos.'),
            mirar('datos', '<'),
            aparecer(['base', 'datos'], { en: '<0.3' }),
            { pieza: 'llega', a: { progreso: 1 }, dur: 0.9, en: '<' },
            { pieza: 'datos', a: { filasVisibles: 3 }, dur: 1.8, curva: 'lineal' },
            { pieza: 'base', a: { nivel: 0.45 }, dur: 1.8, en: '<' },

            ...leer('El docente pasa lista desde el celular: confirma o corrige.'),
            mirar('cel', '<'),
            aparecer('cel', { en: '<0.3' }),
            aparecer(ALUMNOS.flatMap((_, i) => ['celNombre' + i, 'celMarca' + i]), { escalonar: 0.08, dur: 0.35 }),
            aparecer('guardar', { dur: 0.3 }),
            ...LISTA.map((marca, i) => ({
                pieza: 'celMarca' + i,
                a: { texto: marca, relleno: COLOR_LISTA[marca], borde: COLOR_LISTA[marca], color: 'fondo' },
                dur: 0.35,
                en: i === 0 ? '+0.4' : '+0.3',
            })),
            { pieza: 'guardar', a: { resaltado: 1, escala: 1.05 }, dur: 0.3, en: '+0.3' },
            { pieza: 'guardar', a: { escala: 1 }, dur: 0.3 },

            mirar('datos', '+0.2'),
            { pieza: 'pasaLista', a: { progreso: 1 }, dur: 0.9, en: '<' },
            { pieza: 'datos', a: { filas: ALUMNOS.map((a, i) => [a, LLEGADAS[i], LISTA[i]]) }, dur: 0, en: '>' },
            { pieza: 'datos', a: { filasVisibles: 4 }, dur: 0.6, en: '<' },
            { pieza: 'base', a: { nivel: 0.75 }, dur: 0.8, en: '<' },

            ...leer('La planilla oficial sale sola, lista para imprimir.'),
            mirar('oficial', '<'),
            { pieza: 'saleSola', a: { progreso: 1 }, dur: 0.9, en: '<0.3' },
            aparecer(['oficialTitulo', 'oficial'], { en: '>-0.2' }),
            { pieza: 'oficial', a: { filasVisibles: 4 }, dur: 1.4, curva: 'lineal' },

            ...leer('Y la pantalla de la merienda sabe cuántos hay hoy.'),
            mirar('merienda', '<'),
            { pieza: 'aMerienda', a: { progreso: 1 }, dur: 0.9, en: '<0.3' },
            aparecer(['merienda', 'meriendaTitulo', 'meriendaNumero', 'meriendaPie'], { en: '>-0.2' }),
            { pieza: 'meriendaNumero', a: { valor: 83 }, dur: 1.8, curva: 'salir' },

            ...leer('Los mismos datos le sirven a cada uno de otra manera.'),
            mirar('todo', '<', 1.4),
            { espera: 'subtitulo' },
            { espera: 1 },

            // ======== Una sola vez ========
            { capitulo: 'Una sola vez' },
            ...bajada('Una sola vez'),
            {
                pieza: [...idsManana, ...Object.keys(flechas).filter((id) => !['aMano', 'otraVez'].includes(id))],
                a: { opacidad: 0.12 }, dur: 0.8, en: '<',
            },
            { pieza: 'cierre1', a: { opacidad: 1, escala: 1 }, dur: 0.7, curva: 'salir', en: '<0.4' },
            aparecer('cierre2', { en: '<0.6' }),
            aparecer('firma', { en: '<0.3' }),
            { espera: 6.5 },

            // Todo se apaga, y el loop vuelve a empezar de una pantalla vacía.
            {
                pieza: [...idsManana, ...Object.keys(flechas), 'titulo', 'bajada', 'cierre1', 'cierre2', 'firma'],
                a: { opacidad: 0 }, dur: 1,
            },
        ].filter(Boolean);

        return {
            titulo: 'El Sistema de Gestión de Alumnos: cómo se va a ver',
            descripcion:
                'Hoy la asistencia se anota en papel, se pasa a mano a una planilla y se vuelve a escribir en varias más. ' +
                'Con el sistema, el alumno avisa que llegó con su DNI, el docente pasa lista desde el celular, los datos ' +
                'quedan en una base de datos, y de ahí salen solas la planilla oficial y la cuenta para la merienda. ' +
                'Se carga una sola vez y le sirve a cada uno a su manera.',
            ancho: W,
            alto: H,
            pausaFinal: 0.6,
            // Más lento que un subtítulo de película: esto se lee de pasada, y parado.
            lectura: 11,
            piezas: { cam, ...hoy, ...manana, ...flechas, ...pantalla },
            linea,
        };
    });
})();

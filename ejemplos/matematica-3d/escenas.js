// Superficies en 3D: z = f(x, y) con cortes, curvas de nivel, el plano
// tangente, caminos que se acercan a un punto, y el descenso del gradiente.
// Escritas a mano con la pieza `superficie`, para mostrar cómo se usa.

(function () {
    const { superficie } = Motor3D;
    const { descensoGradiente, numero } = MotorMate;

    // Lo común: el título y la superficie, ubicados según el ancho.
    function base(d, titulo, props) {
        const angosta = d.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 760 : 900;
        return {
            angosta, W, H,
            piezas: {
                titulo: Motor.texto({ x: W / 2, y: angosta ? 44 : 52, texto: titulo, tamano: angosta ? 28 : 40, peso: 800, anchoMax: W - 40 }),
                s: superficie({ x: W / 2, y: angosta ? 410 : 480, ancho: angosta ? 620 : 1100, alto: angosta ? 640 : 800, ...props }),
            },
        };
    }

    // ---- Cortar la superficie para ver las curvas de nivel ----
    const paraboloide = (x, y) => x * x + y * y;
    Motor.registrar('sup-curvas', (d) => {
        const { W, H, piezas } = base(d, 'Cortar para ver las curvas de nivel', {
            f: paraboloide, rango: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }, zmin: 0, zmax: 8,
            azimut: -35, elevacion: 24, niveles: [1, 2, 3, 4, 5, 6, 7], corte: 1,
        });
        return {
            titulo: 'Cortar para ver las curvas de nivel',
            descripcion: 'El paraboloide z = x² + y² cortado por planos horizontales: cada corte es una circunferencia, y vistas desde arriba forman las curvas de nivel.',
            ancho: W, alto: H, piezas,
            linea: [
                { capitulo: 'La superficie' },
                { pieza: 's', a: { azimut: 35 }, dur: 6, curva: 'suave' },
                { subtitulo: 'Esta es la gráfica de f(x, y) = x² + y²: para cada punto (x, y) del piso, la altura es f(x, y).', dur: 6, en: 0 },
                { espera: 'subtitulo' },
                { capitulo: 'Un corte' },
                { pieza: 's', a: { verCorte: 1 }, dur: 0.8 },
                { subtitulo: 'Cortamos con un plano horizontal a la altura z = 1. Donde lo toca, queda una curva: x² + y² = 1, una circunferencia.', dur: 6, en: '<0' },
                { espera: 'subtitulo' },
                { pieza: 's', a: { corte: 6 }, dur: 5, curva: 'suave' },
                { subtitulo: 'Si subimos el plano, la circunferencia se agranda: x² + y² = c tiene radio √c.', dur: 5, en: '<0' },
                { espera: 'subtitulo' },
                { capitulo: 'Todas juntas' },
                { pieza: 's', a: { verCorte: 0, verNiveles: 1 }, dur: 1 },
                { subtitulo: 'Cada altura deja su curva. Proyectadas sobre el piso, son las curvas de nivel.', dur: 4.5, en: '<0' },
                { espera: 'subtitulo' },
                { pieza: 's', a: { elevacion: 88, azimut: 0, verSuperficie: 0.15, verGrilla: 0 }, dur: 3, curva: 'suave' },
                { subtitulo: 'Vistas desde arriba son circunferencias, cada vez más juntas: la superficie se empina hacia afuera.', dur: 5, en: '<0' },
                { espera: 'subtitulo' },
            ],
        };
    });

    // ---- El plano tangente ----
    const ondas = (x, y) => Math.sin(x) * Math.cos(y);
    Motor.registrar('sup-tangente', (d) => {
        const { W, H, piezas } = base(d, 'El plano tangente', {
            f: ondas, rango: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 }, zmin: -1.6, zmax: 1.6,
            azimut: -40, elevacion: 30, px: -1.5, py: 0.6,
        });
        return {
            titulo: 'El plano tangente',
            descripcion: 'El plano tangente a z = sen(x)·cos(y) acompaña a un punto que recorre la superficie: en cada lugar es el plano que mejor la aproxima.',
            ancho: W, alto: H, piezas,
            linea: [
                { capitulo: 'Un punto' },
                { pieza: 's', a: { verPunto: 1 }, dur: 0.6 },
                { subtitulo: 'La superficie z = sen(x)·cos(y), y un punto sobre ella.', dur: 3.5, en: '<0' },
                { espera: 'subtitulo' },
                { capitulo: 'Su plano tangente' },
                { pieza: 's', a: { verTangente: 1 }, dur: 1 },
                { subtitulo: 'El plano tangente es el que apenas toca la superficie en ese punto: tiene la misma inclinación en todas las direcciones.', dur: 6, en: '<0' },
                { espera: 'subtitulo' },
                { subtitulo: 'Su ecuación usa las dos derivadas parciales: z = f(a, b) + fx(a, b)·(x − a) + fy(a, b)·(y − b).', dur: 6 },
                { espera: 'subtitulo' },
                { capitulo: 'Que se mueva' },
                { pieza: 's', a: { px: 1.5, py: -0.4, azimut: 20 }, dur: 7, curva: 'suave' },
                { subtitulo: 'Si el punto se mueve, el plano lo acompaña. En la cima y en el fondo queda horizontal: ahí las dos derivadas parciales valen 0.', dur: 7, en: '<0' },
                { espera: 'subtitulo' },
                { pieza: 's', a: { px: Math.PI / 2, py: 0 }, dur: 2, curva: 'suave' },
                { subtitulo: 'En (π/2, 0) la función tiene un máximo: el plano tangente es horizontal, z = 1.', dur: 5, en: '<0' },
                { espera: 'subtitulo' },
            ],
        };
    });

    // ---- Un límite que no existe ----
    // 2xy/(x² + y²) vale 0 sobre los ejes, 1 sobre y = x y −1 sobre y = −x.
    const silla = (x, y) => (x === 0 && y === 0 ? 0 : (2 * x * y) / (x * x + y * y));
    const camino = (fx, fy) => Array.from({ length: 41 }, (_, i) => {
        const t = 1.8 * (1 - i / 40) + 0.02;
        return [fx(t), fy(t)];
    });
    Motor.registrar('sup-limite', (d) => {
        const { W, H, piezas } = base(d, 'Un límite que no existe', {
            f: silla, rango: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }, zmin: -1.1, zmax: 1.1, malla: 96,
            azimut: -30, elevacion: 30, caminos: [], recorrido: 0,
        });
        return {
            titulo: 'Un límite que no existe',
            descripcion: 'f(x, y) = 2xy/(x² + y²) cerca del origen: por el eje x vale 0, por la recta y = x vale 1, y por y = −x vale −1. Como da distinto según el camino, el límite en (0, 0) no existe.',
            ancho: W, alto: H, piezas,
            linea: [
                { capitulo: 'La función' },
                { pieza: 's', a: { azimut: 30 }, dur: 6, curva: 'suave' },
                { subtitulo: 'f(x, y) = 2xy / (x² + y²). En el (0, 0) no está definida: ¿a qué valor se acerca f cuando (x, y) tiende a (0, 0)?', dur: 6, en: 0 },
                { espera: 'subtitulo' },
                { capitulo: 'Por el eje x' },
                { pieza: 's', a: { caminos: [{ puntos: camino((t) => t, () => 0), color: '#22c55e' }], recorrido: 0 }, dur: 0 },
                { pieza: 's', a: { recorrido: 1 }, dur: 3 },
                { subtitulo: 'Si nos acercamos por el eje x (y = 0), f vale 0 todo el tiempo: el límite por ese camino es 0.', dur: 5, en: '<0' },
                { espera: 'subtitulo' },
                { capitulo: 'Por la recta y = x' },
                { pieza: 's', a: { caminos: [{ puntos: camino((t) => t, () => 0), color: '#22c55e' }, { puntos: camino((t) => t, (t) => t), color: '#f43f5e' }], recorrido: 0.5 }, dur: 0 },
                { pieza: 's', a: { recorrido: 1 }, dur: 3 },
                { subtitulo: 'Pero por la recta y = x, f vale 2x²/2x² = 1 en todos lados: el límite por ese camino es 1.', dur: 5, en: '<0' },
                { espera: 'subtitulo' },
                { capitulo: 'No existe' },
                { pieza: 's', a: { azimut: 100, elevacion: 40 }, dur: 4, curva: 'suave' },
                { subtitulo: 'Dos caminos, dos valores distintos: el límite en (0, 0) no existe. Por y = −x daría −1.', dur: 5, en: '<0' },
                { espera: 'subtitulo' },
                { subtitulo: 'Ojo: los límites iterados dan 0 los dos, y aun así el límite no existe. Que coincidan no alcanza para probar que existe; que difieran sí alcanza para probar que no.', dur: 8 },
                { espera: 'subtitulo' },
            ],
        };
    });

    // ---- El descenso del gradiente, sobre la superficie ----
    const cuenco = (x, y) => x * x + 3 * y * y;
    const { puntos } = descensoGradiente(cuenco, { inicio: [-3.2, 2.2], tasa: 0.1, pasos: 14, gradiente: (x, y) => [2 * x, 6 * y] });
    const recorrido = puntos.map((q) => [q.x, q.y]);
    Motor.registrar('sup-descenso', (d) => {
        const { W, H, piezas } = base(d, 'Bajar por la superficie', {
            f: cuenco, rango: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 }, zmin: 0, zmax: 40,
            azimut: -55, elevacion: 32, px: recorrido[0][0], py: recorrido[0][1], niveles: [0.5, 2, 5, 10, 18, 30], verNiveles: 0.8,
            caminos: [{ puntos: recorrido, color: '#f43f5e' }], recorrido: 0,
        });
        const linea = [
            { capitulo: 'El punto de partida' },
            { pieza: 's', a: { verPunto: 1 }, dur: 0.5 },
            { subtitulo: `f(x, y) = x² + 3y², desde (−3,2; 2,2), donde f vale ${numero(puntos[0].z, 1)}.`, dur: 4, en: '<0' },
                { espera: 'subtitulo' },
            { capitulo: 'Paso a paso' },
            { subtitulo: 'Cada paso va en la dirección de −∇f, la de mayor bajada. Mirá la sombra en el piso: es el mismo camino que sobre las curvas de nivel.', dur: 7 },
        ];
        // El punto salta de un paso al otro, y el camino se dibuja detrás.
        recorrido.slice(1).forEach(([x, y], i) => {
            linea.push({ pieza: 's', a: { px: x, py: y, recorrido: (i + 1) / (recorrido.length - 1) }, dur: 0.55, en: '+0.2' });
        });
        linea.push(
            { capitulo: 'El fondo' },
            { pieza: 's', a: { azimut: 20, elevacion: 55 }, dur: 3, curva: 'suave' },
            { subtitulo: `Termina cerca del fondo del cuenco, en (${numero(puntos.at(-1).x, 2)}; ${numero(puntos.at(-1).y, 2)}), donde f vale casi 0: el mínimo.`, dur: 5, en: '<0' },
            { espera: 'subtitulo' },
        );
        return {
            titulo: 'Bajar por la superficie',
            descripcion: 'El descenso del gradiente sobre la superficie z = x² + 3y²: el punto baja paso a paso hasta el fondo.',
            ancho: W, alto: H, piezas, linea,
        };
    });
}());

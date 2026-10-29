// Una escena sola, para verla con distintos estilos. Nada de acá dice cómo
// se ve: ni colores de verdad, ni fuentes, ni sonidos. Eso lo pone el estilo.

(function () {
    const { caja, texto, flecha, forma, figuras, aparecer, dibujar, transformar, mover, decir, sonar } = Motor;

    Motor.registrar('estilos-demo', (d) => {
        const angosta = d.nombre === 'angosta';
        const ancho = angosta ? 900 : 1600;
        const alto = 900;
        const cx = ancho / 2;
        // Tres pasos de un proceso: en fila en la compu, en columna en el celular.
        const lugar = (i) => (angosta ? { x: cx, y: 400 + i * 160 } : { x: 330 + i * 470, y: 560 });
        const pasos = ['Leer', 'Pensar', 'Escribir'].map((t, i) => caja({
            ...lugar(i), ancho: 300, alto: 120, texto: t, opacidad: 0, relleno: i === 1 ? 'acento' : 'superficie',
            color: i === 1 ? 'fondo' : 'texto',
        }));
        const piezas = {
            titulo: texto({ x: cx, y: 90, texto: 'La misma escena, otro arte', tamano: angosta ? 52 : 60, peso: 700, opacidad: 0 }),
            idea: forma({ x: cx, y: angosta ? 225 : 300, d: figuras.circulo(70), relleno: 'acento2', trazo: 0 }),
            p0: pasos[0], p1: pasos[1], p2: pasos[2],
            f1: flecha({ desde: 'p0', hasta: 'p1', opacidad: 0, trazo: 0 }),
            f2: flecha({ desde: 'p1', hasta: 'p2', opacidad: 0, trazo: 0 }),
            listo: forma({ x: cx, y: angosta ? 835 : 790, d: figuras.tilde(90), relleno: 'ninguno', borde: 'exito', grosor: 14, trazo: 0 }),
        };
        const linea = [
            aparecer('titulo', { dur: 0.6 }),
            decir('Una idea aparece como un círculo que se dibuja.', { en: 0.3 }),
            dibujar('idea', { en: 0.8 }),
            transformar('idea', figuras.estrella(5, 85), { en: '+0.3', curva: 'resorte', dur: 1.1, sonido: 'chispa' }),
            decir('Se transforma en una estrella, y después en un corazón.', { en: '<' }),
            transformar('idea', figuras.corazon(150), { en: '+0.4', relleno: 'error', dur: 1 }),
            decir('Los tres pasos entran escalonados; cada estilo elige cómo.', { en: '+0.3' }),
            aparecer(['p0', 'p1', 'p2'], { crecer: true, dur: 0.7 }),
            dibujar(['f1', 'f2'], { en: '+0.1', escalonar: 0.4, dur: 0.8 }),
            decir('El del medio se adelanta un poco y vuelve.', { en: '+0.3' }),
            mover('p1', angosta ? { x: cx + 160 } : { y: 400 }, { en: '+0.2', dur: 0.7 }),
            mover('p1', lugar(1), { en: '+0.5', dur: 0.7 }),
            decir('Y al final, listo: la tilde se dibuja sola.', { en: '+0.3' }),
            dibujar('listo', { en: '+0.2', dur: 0.8 }),
            sonar('exito', { en: '<0.5' }),
        ];
        return {
            titulo: 'La misma escena, otro arte', ancho, alto, piezas, linea, pausaFinal: 1.2,
            descripcion: 'Un círculo que se dibuja y se transforma en estrella y en corazón, tres pasos que entran escalonados y una tilde que se dibuja.',
        };
    });
})();

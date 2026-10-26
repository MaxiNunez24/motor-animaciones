// Los textos que acompañan a un video: .srt, capítulos de YouTube y la duración
// de un .wav.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tiempoSrt, aSrt, aVtt, reloj, capitulosYouTube, duracionWav, prepararParaVoz } from '../../herramientas/lib/textos-video.js';

describe('subtítulos .srt', () => {
    test('el tiempo va con horas, minutos, segundos y milisegundos', () => {
        assert.equal(tiempoSrt(0), '00:00:00,000');
        assert.equal(tiempoSrt(75.25), '00:01:15,250');
        assert.equal(tiempoSrt(3725.0004), '01:02:05,000');
    });

    test('cada subtítulo numerado, en orden, separados por una línea en blanco', () => {
        const srt = aSrt([
            { texto: 'Después', desde: 3, hasta: 5 },
            { texto: 'Primero', desde: 1, hasta: 2.5 },
        ]);
        assert.equal(srt, '1\n00:00:01,000 --> 00:00:02,500\nPrimero\n\n2\n00:00:03,000 --> 00:00:05,000\nDespués\n');
    });
});

describe('capítulos para YouTube', () => {
    test('el formato que pide YouTube, empezando en 0:00', () => {
        const { texto, problemas } = capitulosYouTube(
            [{ nombre: 'Hoy', t: 0 }, { nombre: 'Cómo va a funcionar', t: 23.07 }, { nombre: 'Una sola vez', t: 59.4 }],
            70,
        );
        assert.equal(texto, '0:00 Hoy\n0:23 Cómo va a funcionar\n0:59 Una sola vez');
        assert.deepEqual(problemas, []);
    });

    test('avisa lo que YouTube no acepta', () => {
        const { problemas } = capitulosYouTube([{ nombre: 'Uno', t: 0 }, { nombre: 'Dos', t: 5 }], 30);
        assert.ok(problemas.some((p) => p.includes('al menos 3')));
        assert.ok(problemas.some((p) => p.includes('"Uno" dura 5.0 s')));
    });

    test('si el primero no arranca en 0:00, agrega un "Inicio"', () => {
        const { texto } = capitulosYouTube([{ nombre: 'A', t: 12 }, { nombre: 'B', t: 30 }], 60);
        assert.ok(texto.startsWith('0:00 Inicio\n0:12 A'));
    });

    test('pasada la hora, también las horas', () => {
        assert.equal(reloj(3725), '1:02:05');
        assert.equal(reloj(65), '1:05');
    });
});

describe('duración de un .wav', () => {
    // Un WAV mínimo: 22050 muestras por segundo, 16 bits, mono.
    function wav(segundos, tamanoEnCabecera = true) {
        const datos = Math.round(segundos * 22050) * 2;
        const b = new Uint8Array(44 + datos);
        const v = new DataView(b.buffer);
        const poner = (o, s) => [...s].forEach((c, i) => { b[o + i] = c.charCodeAt(0); });
        poner(0, 'RIFF');
        v.setUint32(4, 36 + datos, true);
        poner(8, 'WAVE');
        poner(12, 'fmt ');
        v.setUint32(16, 16, true);
        v.setUint16(20, 1, true);
        v.setUint16(22, 1, true);
        v.setUint32(24, 22050, true);
        v.setUint32(28, 44100, true);
        v.setUint16(32, 2, true);
        v.setUint16(34, 16, true);
        poner(36, 'data');
        v.setUint32(40, tamanoEnCabecera ? datos : 0, true);
        return b;
    }

    test('lee la duración del encabezado', () => {
        assert.equal(duracionWav(wav(2.5)), 2.5);
    });

    test('si el encabezado no dice el tamaño, cuenta hasta el final', () => {
        assert.equal(duracionWav(wav(1, false)), 1);
    });

    test('algo que no es un WAV es un error claro', () => {
        assert.throws(() => duracionWav(new Uint8Array(44)), /No es un archivo WAV/);
    });
});

describe('subtítulos .vtt, para la web', () => {
    test('encabezado WEBVTT y punto en los milisegundos', () => {
        assert.equal(aVtt([{ texto: 'Hola', desde: 1, hasta: 2.5 }]), 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.500\nHola\n');
    });
});

describe('el texto que lee la voz', () => {
    test('sin emojis, y los símbolos en palabras', () => {
        assert.equal(prepararParaVoz('🌡️ Estuvo 2,1 °C más caliente: 83 % de chances'), 'Estuvo 2,1 grados más caliente: 83 por ciento de chances.');
    });

    test('el código se dice como se lee', () => {
        assert.equal(prepararParaVoz('WHERE presentes >= 8'), 'WHERE presentes mayor o igual a 8.');
        assert.equal(prepararParaVoz('porcentaje(10, 20) == 50'), 'porcentaje(10, 20) igual a 50.');
        assert.equal(prepararParaVoz('test_mitad falla'), 'test mitad falla.');
        assert.equal(prepararParaVoz('marcar() sobre Alumno #1'), 'marcar sobre Alumno número 1.');
    });

    test('siempre termina en punto, para que la entonación baje', () => {
        assert.equal(prepararParaVoz('¿Qué pasa con a?'), '¿Qué pasa con a?');
        assert.equal(prepararParaVoz('Listo'), 'Listo.');
    });
});

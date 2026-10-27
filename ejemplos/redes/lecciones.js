// Lecciones de redes que se arman solas: intercambios de mensajes, protocolos
// de ventana con pérdidas, el control de congestión de TCP y una subred.
// Las direcciones son de redes privadas o de los rangos reservados para
// documentación (203.0.113.0/24), y los dominios, de ejemplo.

(function () {
    const { desdeIntercambio, desdeVentana, desdeCongestion, desdeSubred } = MotorRedes;

    Motor.registrar('redes-saludo', desdeIntercambio({
        titulo: 'El saludo de tres vías de TCP',
        extremos: [{ texto: 'Cliente', icono: '💻' }, { texto: 'Servidor', icono: '🖥️' }],
        mensajes: [
            {
                de: 0, a: 1, texto: 'SYN · seq = 1000',
                explicacion: 'El cliente pide abrir una conexión: manda un segmento con el flag SYN y su número de secuencia inicial (ISN), acá 1000.',
                estados: [{ extremo: 0, texto: 'SYN-SENT', al: 'salir' }, { extremo: 1, texto: 'SYN-RECEIVED' }],
            },
            {
                de: 1, a: 0, texto: 'SYN, ACK · seq = 5000 · ack = 1001',
                explicacion: 'El servidor acepta: confirma el SYN del cliente con ack = 1001 (el próximo byte que espera) y manda su propio SYN, con su ISN, 5000.',
                estados: [{ extremo: 0, texto: 'ESTABLISHED', color: 'exito' }],
            },
            {
                de: 0, a: 1, texto: 'ACK · seq = 1001 · ack = 5001',
                explicacion: 'El cliente confirma el SYN del servidor con ack = 5001. Tres segmentos, y la conexión queda abierta en los dos sentidos.',
                estados: [{ extremo: 1, texto: 'ESTABLISHED', color: 'exito' }],
            },
        ],
        preguntas: {
            1: {
                pregunta: 'El cliente mandó seq = 1000. ¿Qué número de ack le va a contestar el servidor?',
                opciones: ['1000', '1001', '5000'],
                correcta: 1,
                explicacion: 'El SYN ocupa un número de secuencia: el próximo que espera es el 1001.',
            },
        },
    }));

    Motor.registrar('redes-cierre', desdeIntercambio({
        titulo: 'Cerrar una conexión TCP',
        extremos: [{ texto: 'Cliente', icono: '💻' }, { texto: 'Servidor', icono: '🖥️' }],
        mensajes: [
            { de: 0, a: 1, texto: 'FIN', explicacion: 'El cliente terminó de mandar datos y avisa con FIN.', estados: [{ extremo: 0, texto: 'FIN-WAIT-1', al: 'salir' }, { extremo: 1, texto: 'CLOSE-WAIT' }] },
            { de: 1, a: 0, texto: 'ACK', explicacion: 'El servidor lo confirma. Pero todavía puede seguir mandando: la conexión se cierra de a un sentido por vez.', estados: [{ extremo: 0, texto: 'FIN-WAIT-2' }] },
            { de: 1, a: 0, texto: 'FIN', explicacion: 'Cuando el servidor también termina, manda su FIN.', estados: [{ extremo: 1, texto: 'LAST-ACK', al: 'salir' }, { extremo: 0, texto: 'TIME-WAIT' }] },
            { de: 0, a: 1, texto: 'ACK', explicacion: 'El cliente confirma y espera un rato en TIME-WAIT, por si ese último ACK se pierde y hay que repetirlo.', estados: [{ extremo: 1, texto: 'CLOSED', color: 'suave' }] },
        ],
    }));

    Motor.registrar('redes-http', desdeIntercambio({
        titulo: 'Un pedido HTTP',
        extremos: [{ texto: 'Navegador', icono: '🌐' }, { texto: 'Servidor web', icono: '🖥️' }],
        mensajes: [
            { de: 0, a: 1, texto: 'SYN', capitulo: 'La conexión TCP' },
            { de: 1, a: 0, texto: 'SYN, ACK' },
            { de: 0, a: 1, texto: 'ACK', explicacion: 'Antes de hablar HTTP hace falta una conexión TCP: el saludo de tres vías, al puerto 80.' },
            {
                de: 0, a: 1, texto: 'GET /index.html HTTP/1.1', capitulo: 'El pedido',
                explicacion: 'El navegador pide un recurso: el método GET, la ruta /index.html y la versión. Abajo van los encabezados, como Host: www.ejemplo.com.ar.',
            },
            {
                de: 1, a: 0, texto: 'HTTP/1.1 200 OK + el HTML', capitulo: 'La respuesta',
                explicacion: 'El servidor contesta con un código de estado (200: todo bien), sus encabezados (Content-Type: text/html) y el contenido.',
            },
            {
                de: 0, a: 1, texto: 'GET /estilos.css', capitulo: 'Lo que sigue',
                explicacion: 'Al leer el HTML, el navegador encuentra más recursos y los pide. Con HTTP/1.1 reusa la misma conexión: es persistente.',
            },
            { de: 1, a: 0, texto: '200 OK + el CSS', explicacion: 'Sin conexión persistente, cada recurso pagaría otra vez el saludo de tres vías.' },
        ],
        preguntas: {
            4: {
                pregunta: 'Si el archivo no existiera, ¿qué código de estado devolvería el servidor?',
                opciones: ['200', '301', '404', '500'],
                correcta: 2,
            },
        },
    }));

    Motor.registrar('redes-dns', desdeIntercambio({
        titulo: 'Una consulta DNS',
        extremos: [
            { texto: 'PC', icono: '💻' }, { texto: 'Resolver', icono: '🗂️' }, { texto: 'Raíz', icono: '🌍' },
            { texto: '.ar', icono: '🇦🇷' }, { texto: 'ejemplo.com.ar', icono: '🏢' },
        ],
        mensajes: [
            { de: 0, a: 1, texto: '¿www.ejemplo.com.ar?', capitulo: 'La pregunta', explicacion: 'La PC le pregunta a su resolver. Es una consulta recursiva: quiere la respuesta final, no una pista.' },
            { de: 1, a: 2, texto: '¿www.ejemplo.com.ar?', capitulo: 'Iterativa', explicacion: 'El resolver no la sabe (ni la tiene en caché), así que arranca por un servidor raíz.' },
            { de: 2, a: 1, texto: 'NS de .ar', explicacion: 'La raíz no la sabe, pero sabe quién maneja .ar: le contesta con los servidores de ese dominio. Es una respuesta iterativa.' },
            { de: 1, a: 3, texto: '¿www.ejemplo.com.ar?' },
            { de: 3, a: 1, texto: 'NS de ejemplo.com.ar', explicacion: 'El servidor de .ar tampoco: deriva a los servidores de ejemplo.com.ar, que tienen la delegación.' },
            { de: 1, a: 4, texto: '¿www.ejemplo.com.ar?' },
            { de: 4, a: 1, texto: 'A 203.0.113.10 (autoritativa)', explicacion: 'Este sí: es el autoritativo de la zona, y contesta con el registro A.' },
            { de: 1, a: 0, texto: '203.0.113.10', capitulo: 'La respuesta', explicacion: 'El resolver le pasa la respuesta a la PC y la guarda en caché durante el TTL: la próxima vez contesta sin preguntarle a nadie.' },
        ],
    }));

    // Los tres protocolos de ventana, con el mismo paquete perdido: así se comparan.
    Motor.registrar('redes-sw', desdeVentana({
        titulo: 'Stop-and-wait: se pierde un ACK',
        protocolo: 'stop-and-wait',
        paquetes: 3,
        acksPerdidos: [1],
    }));

    Motor.registrar('redes-gbn', desdeVentana({
        titulo: 'Go-Back-N: se pierde el paquete 2',
        protocolo: 'go-back-n',
        paquetes: 7,
        ventana: 4,
        perdidos: [2],
        preguntas: {
            timeout: {
                pregunta: 'Vence el timer del paquete 2. ¿Qué paquetes va a reenviar el emisor?',
                opciones: ['Solo el 2', 'Del 2 al 5', 'Todos'],
                correcta: 1,
                explicacion: 'Go-Back-N vuelve atrás hasta el perdido y reenvía todo lo que había mandado desde ahí.',
            },
        },
    }));

    Motor.registrar('redes-sr', desdeVentana({
        titulo: 'Selective Repeat: se pierde el paquete 2',
        protocolo: 'selective-repeat',
        paquetes: 7,
        ventana: 4,
        perdidos: [2],
        preguntas: {
            timeout: {
                pregunta: 'Ahora con Selective Repeat. ¿Qué paquetes se reenvían?',
                opciones: ['Solo el 2', 'Del 2 al 5', 'Todos'],
                correcta: 0,
            },
        },
    }));

    Motor.registrar('redes-congestion', desdeCongestion({
        titulo: 'Control de congestión de TCP (Reno)',
        rondas: 22,
        umbral: 8,
        eventos: { 9: '3dup', 16: 'timeout' },
        preguntas: {
            4: {
                pregunta: 'La ventana viene 1, 2, 4. ¿Cuánto va a valer en la ronda 4?',
                opciones: ['5', '6', '8'],
                correcta: 2,
                explicacion: 'En slow start se duplica en cada ronda.',
            },
        },
    }));

    Motor.registrar('redes-subred', desdeSubred({
        titulo: 'Una subred, bit por bit',
        direccion: '192.168.10.77/26',
        preguntas: {
            hosts: {
                pregunta: 'Quedan 6 bits para los hosts. ¿Cuántas máquinas entran en la subred?',
                opciones: ['64', '62', '32'],
                correcta: 1,
            },
        },
    }));
}());

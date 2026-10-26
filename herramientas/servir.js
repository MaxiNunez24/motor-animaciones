// Un servidor de archivos mínimo para ver los ejemplos mientras se trabaja.
//
//     node herramientas/servir.js        → http://localhost:4173/
//
// Sin dependencias a propósito: cualquiera que tenga Node lo puede correr, y
// los tests de navegador lo usan para levantar las páginas.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const PUERTO = Number(process.env.PUERTO ?? 4173);
const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
};

createServer(async (pedido, respuesta) => {
    try {
        const ruta = decodeURIComponent(new URL(pedido.url, 'http://x').pathname);
        // normalize + el chequeo de abajo: que nadie pida ../../ y salga del repo.
        let archivo = normalize(join(RAIZ, ruta));
        if (!archivo.startsWith(RAIZ)) throw Object.assign(new Error('afuera'), { code: 'ENOENT' });
        if ((await stat(archivo)).isDirectory()) archivo = join(archivo, 'index.html');
        const contenido = await readFile(archivo);
        respuesta.writeHead(200, {
            'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
            // Sin caché: si no, después de reconstruir se sigue viendo lo viejo.
            'Cache-Control': 'no-store',
        });
        respuesta.end(contenido);
    } catch (error) {
        respuesta.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
        respuesta.end(error.code === 'ENOENT' ? 'No está.' : String(error));
    }
}).listen(PUERTO, () => {
    console.log(`Sirviendo en http://localhost:${PUERTO}/`);
});

// Arma los dos archivos que se distribuyen:
//
//   dist/motor.js       módulo ES, para importar desde un proyecto (el curso)
//   dist/motor.min.js   script clásico con el global `Motor`, para HTML plano
//   dist/motor-base.min.js   lo mismo sin la capa pedagógica, más liviano
//
// El segundo existe porque los alumnos abren su página con doble clic: con
// file:// los <script type="module"> no cargan, y un script clásico sí.

import { build } from 'esbuild';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const comun = {
    entryPoints: ['src/index.js'],
    bundle: true,
    target: ['es2022'],
    legalComments: 'none',
    logLevel: 'warning',
};

// El trazador de Python vive en un .py (lo usa también la consola); para el
// navegador se copia, tal cual, como texto dentro de un módulo.
const trazador = readFileSync('src/pedagogico/trazador.py', 'utf-8');
writeFileSync(
    'src/pedagogico/trazador-py.js',
    '// Generado por herramientas/construir.js a partir de trazador.py: no lo edites a mano.\n' +
    `export const TRAZADOR_PY = ${JSON.stringify(trazador)};\n`,
);

await build({ ...comun, format: 'esm', outfile: 'dist/motor.js' });
await build({ ...comun, format: 'iife', globalName: 'Motor', minify: true, outfile: 'dist/motor.min.js' });
await build({
    ...comun, entryPoints: ['src/base.js'], format: 'iife', globalName: 'Motor', minify: true, outfile: 'dist/motor-base.min.js',
});

for (const archivo of ['dist/motor.js', 'dist/motor.min.js', 'dist/motor-base.min.js']) {
    const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
    const comprimido = gzipSync(readFileSync(archivo)).length;
    console.log(`${archivo.padEnd(24)} ${kb(statSync(archivo).size).padStart(9)}   (${kb(comprimido)} con gzip)`);
}

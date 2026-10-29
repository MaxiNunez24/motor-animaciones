// Arma los dos archivos que se distribuyen:
//
//   dist/motor.js       módulo ES, para importar desde un proyecto (el curso)
//   dist/motor.min.js   script clásico con el global `Motor`, para HTML plano
//   dist/motor-base.min.js   lo mismo sin la capa pedagógica, más liviano
//   dist/motor-3d.min.js     las piezas 3D (con Three.js adentro), aparte
//   dist/motor-mate.min.js   la capa de matemática (global MotorMate), aparte
//   dist/motor-redes.min.js  la capa de redes (global MotorRedes), aparte
//   dist/motor-finanzas.min.js  la capa de finanzas (global MotorFinanzas), aparte
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

// El 3D, aparte: lleva Three.js adentro, y solo lo carga la página que lo usa.
await build({ ...comun, entryPoints: ['src/3d/index.js'], format: 'esm', minify: true, outfile: 'dist/motor-3d.js' });
await build({
    ...comun, entryPoints: ['src/3d/index.js'], format: 'iife', globalName: 'Motor3D', minify: true, outfile: 'dist/motor-3d.min.js',
});

// Matemática, redes y finanzas, también aparte: cada una le sirve a una materia, y una
// página de programación no tiene por qué cargarlas. Se usan junto con
// motor.min.js (que trae el componente) y traen sus propias piezas.
for (const [capa, global] of [['mate', 'MotorMate'], ['redes', 'MotorRedes'], ['finanzas', 'MotorFinanzas']]) {
    await build({ ...comun, entryPoints: [`src/${capa}/index.js`], format: 'esm', outfile: `dist/motor-${capa}.js` });
    await build({
        ...comun, entryPoints: [`src/${capa}/index.js`], format: 'iife', globalName: global, minify: true, outfile: `dist/motor-${capa}.min.js`,
    });
}

for (const archivo of ['dist/motor.js', 'dist/motor.min.js', 'dist/motor-base.min.js', 'dist/motor-3d.min.js', 'dist/motor-mate.min.js', 'dist/motor-redes.min.js', 'dist/motor-finanzas.min.js']) {
    const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
    const comprimido = gzipSync(readFileSync(archivo)).length;
    console.log(`${archivo.padEnd(27)} ${kb(statSync(archivo).size).padStart(9)}   (${kb(comprimido)} con gzip)`);
}

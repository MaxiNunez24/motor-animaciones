# Usar el motor en la plataforma del curso

La plataforma (`pensamiento-computacional-testing-2026`) es Astro 6 + Starlight. Hay dos formas
de usar el motor, según el apuro.

## A. Rápida: los archivos en `public/` (sirve para la Expo)

Copiá `dist/motor.min.js` y la escena a `public/animaciones/` del curso y cargalos con
`is:inline`, para que Astro no los toque:

```astro
<motor-escena escena="expo-siges" loop autoplay></motor-escena>
<script is:inline src={`${import.meta.env.BASE_URL}/animaciones/motor.min.js`}></script>
<script is:inline src={`${import.meta.env.BASE_URL}/animaciones/siges.js`}></script>
```

La ruta lleva el `base` adelante, como los demás scripts de `public/`: sin él, en GitHub Pages da 404.

## B. Para las clases: el motor como dependencia

1. Instalarlo, fijado a una versión (un tag del repo):

   ```bash
   pnpm add github:MaxiNunez24/motor-animaciones#v0.7.0
   ```

   `dist/` está subido al repo, así que no hace falta compilar nada al instalar (pnpm no corre
   scripts de build de las dependencias).

2. Un componente que envuelva la etiqueta, por ejemplo `src/components/Animacion.astro`:

   ```astro
   ---
   /**
    * Una animación del motor. Con `leccion`, frena a preguntar y tiene paso a paso.
    *
    *     <Animacion escena="bucle-for" leccion />
    */
   interface Props {
       escena: string;
       leccion?: boolean;
       loop?: boolean;
       autoplay?: boolean;
   }
   const { escena, leccion = false, loop = false, autoplay = false } = Astro.props;
   const Etiqueta = leccion ? 'motor-leccion' : 'motor-escena';
   ---
   <Etiqueta escena={escena} loop={loop} autoplay={autoplay} class="animacion" />

   <script>
       // Registra <motor-escena> y <motor-leccion>, y las escenas del curso.
       import 'motor-animaciones';
       import '../animaciones/index.js';
   </script>

   <style>
       /* Los colores del curso: el motor sigue solo el modo oscuro de Starlight. */
       .animacion {
           --motor-acento: var(--sl-color-accent);
           margin-block: 1.5rem;
       }
   </style>
   ```

3. Las escenas del curso, como módulos, en `src/animaciones/`:

   ```js
   // src/animaciones/bucle-for.js
   import { registrar, desdeTraza } from 'motor-animaciones';
   import traza from './bucle-for.traza.json';

   registrar('bucle-for', desdeTraza({
       ...traza,
       titulo: 'Un for que va sumando',
       punteros: { numeros: 'n' },
       explicaciones: { 0: 'El programa arranca por la primera línea.' },
       preguntas: { 7: { pregunta: '¿Cuánto va a valer total?', opciones: ['15', '27'], correcta: 1 } },
   }));
   ```

   ```js
   // src/animaciones/index.js
   import './bucle-for.js';
   ```

   La traza se saca con `python herramientas/trazar.py programa.py --json > bucle-for.traza.json`.

4. En cualquier `.mdx`:

   ```mdx
   import Animacion from '../../components/Animacion.astro';

   <Animacion escena="bucle-for" leccion />
   ```

## Animar el programa que escribe el alumno

La plataforma ya corre Python en un worker (`src/scripts/pyodide-worker.ts`). El trazador del motor
es Python común, así que corre ahí mismo:

1. En el worker, una vez, cargar el trazador (el texto viene del motor, `TRAZADOR_PY`) y exponer
   un mensaje nuevo:

   ```ts
   // pyodide-worker.ts
   import { TRAZADOR_PY } from 'motor-animaciones';
   // ...cuando llega { tipo: 'trazar', codigo, entradas }:
   pyodide.runPython(TRAZADOR_PY);
   const trazar = pyodide.globals.get('_motor_trazar');
   const json = trazar(codigo, 400, entradas);
   trazar.destroy();
   postMessage({ tipo: 'traza', json });
   ```

   Corre en el worker y no en la página por la misma razón que el resto: un `while True` no
   congela la pestaña (y además el trazador corta solo a los 400 pasos).

2. En `EjercicioPython`, un botón «Ver cómo corre» que le pide la traza al worker y la muestra:

   ```ts
   import { desdeTraza } from 'motor-animaciones';
   const traza = JSON.parse(json);
   leccion.escena = desdeTraza({ ...traza, explicar: true, punteros: 'auto', archivo: 'tu_codigo.py' });
   ```

Así cualquier ejercicio tiene su animación, sin escribir nada a mano. Lo que no se puede deducir
(las preguntas, una explicación mejor) se agrega por número de paso, como en
`ejemplos/conceptos/lecciones.js`.

El trazador entiende funciones (con su pila de llamadas y lo que devuelven), recursión, objetos
(con `self` y sus atributos) y referencias (dos nombres para la misma lista): sirve desde Funciones
I hasta POO.

## Animar los tests del alumno

Para la clase de Testing, el mismo worker puede correr los tests del alumno y mostrar cuáles pasan:

```ts
// en el worker, cuando llega { tipo: 'probar', codigo }:
pyodide.runPython(TRAZADOR_PY);
const probar = pyodide.globals.get('_motor_probar');
postMessage({ tipo: 'pruebas', json: probar(codigo) });
probar.destroy();
```

```ts
// en la página:
import { desdeTests } from 'motor-animaciones';
leccion.escena = desdeTests({ corridas: [{ codigo, ...JSON.parse(json) }] });
```

Cada `assert` dice lo que se esperaba y lo que dio ("esperaba 50, y dio 0"), que es justo lo que
hace falta para encontrar el error.

## Las consultas de la clase de SQLite

```js
import { registrar, desdeConsulta } from 'motor-animaciones';
registrar('consulta', desdeConsulta({
    tabla: { nombre: 'alumnos', columnas: ['nombre', 'presentes'], filas: [['Ana', 12], ['Beto', 5]] },
    sql: 'SELECT nombre FROM alumnos WHERE presentes >= 8',
}));
```

## Otras materias: matemática y redes

Las capas de matemática y de redes van aparte del motor, para que una página de programación no las
cargue. Desde un proyecto se importan por su nombre:

```js
import { registrar } from 'motor-animaciones';
import { desdeDerivada, plano, grafica } from 'motor-animaciones/mate';
import { desdeIntercambio, desdeSubred } from 'motor-animaciones/redes';

registrar('subred', desdeSubred({ direccion: '192.168.10.77/26' }));
```

Y en una página suelta, con `motor-mate.min.js` o `motor-redes.min.js` después de `motor.min.js`
(globales `MotorMate` y `MotorRedes`). Ejemplos: `ejemplos/matematica/`, `ejemplos/matematica-3d/`
y `ejemplos/redes/`.

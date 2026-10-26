# Motor de animaciones

Animaciones web **deterministas**: el estado en el instante *t* depende solo de *t*. Por eso la
misma escena se ve igual en vivo, paso a paso y grabada a video, y se puede probar con tests.

Sin dependencias. 33 KB con gzip con todo (15 KB sin la capa pedagógica, en `motor-base.min.js`).

**Ejemplos en vivo:** <https://maxinunez24.github.io/motor-animaciones/>

## En una página HTML, sin herramientas

```html
<motor-escena escena="hola" autoplay></motor-escena>

<script src="motor.min.js"></script>
<script>
    const { caja, flecha } = Motor;
    Motor.registrar('hola', {
        titulo: 'Hola',
        ancho: 1600,
        alto: 900,
        piezas: {
            a: caja({ x: 400, y: 450, texto: 'Hoy', opacidad: 0 }),
            b: caja({ x: 1200, y: 450, texto: 'Mañana', opacidad: 0 }),
            f: flecha({ desde: 'a', hasta: 'b', progreso: 0 }),
        },
        linea: [
            { capitulo: 'Empieza' },
            { pieza: 'a', a: { opacidad: 1 } },
            { pieza: 'f', a: { progreso: 1 }, dur: 1 },
            { pieza: 'b', a: { opacidad: 1 } },
            { subtitulo: 'De hoy a mañana.', en: 0, dur: 3 },
        ],
    });
</script>
```

`motor.min.js` es un script clásico a propósito: anda abriendo el `.html` con doble clic
(`file://`), donde los módulos no cargan. Con internet también se puede usar desde jsDelivr:
`https://cdn.jsdelivr.net/gh/MaxiNunez24/motor-animaciones@v0.6.0/dist/motor.min.js`.

## Desde otro proyecto (Astro, Vite…)

```bash
pnpm add github:MaxiNunez24/motor-animaciones#v0.6.0
```

```js
import { registrar, caja } from 'motor-animaciones';
```

`dist/` está subido al repo: pnpm no corre scripts de build de las dependencias. Cómo usarlo en
la plataforma del curso, con un componente de Astro listo: [docs/usar-en-el-curso.md](docs/usar-en-el-curso.md).

## La escena

- **piezas**: `caja`, `texto`, `flecha`, `tabla`, `celular`, `cilindro` (una base de datos),
  `contador` (un número que se anima) y `camara`. Todas tienen `x`, `y` (el centro), `escala`,
  `rotacion`, `opacidad` y `dentro` (para dibujarse dentro de otra, como un botón en el celular).
  Las nuevas se hacen con `definirPieza` (ver `src/piezas/definir.js`).
- **camara**: lo que va `dentro: 'camara'` se ve a través de ella. Se mueve animando `mirarX`,
  `mirarY` y `zoom`, y con `ancho` y `alto` recorta a su ventana. En el celular, en vez de achicar
  la escena, la cámara se acerca a la parte que se cuenta (ver `ejemplos/expo/siges.js`).
- **linea**: animaciones (`{ pieza, a, dur, curva, en, escalonar }`), `capitulo`, `subtitulo` y
  `espera` (unos segundos, o `'subtitulo'`: hasta que se termine de leer el último).
- **en**: sin nada, después de todo lo anterior; un número, a esa altura; `'+0.5'`, `'<'`, `'<0.2'`,
  `'>'`, como en GSAP. Los subtítulos van por su pista y no atrasan lo que sigue.
- **lectura**: cuántos caracteres por segundo se leen (15 si no se dice). Un subtítulo sin `dur`
  dura lo que se tarda en leerlo.
- **curvas**: `suave` (la de siempre), `lineal`, `entrar`, `salir`, `pasarse`.
- **colores**: por papel, no por valor: `fondo`, `superficie`, `texto`, `suave`, `borde`, `acento`,
  `acento2`, `exito`, `alerta`, `error`, `papel`, `marco`. Así anda en claro y en oscuro.
- **disposiciones**: si la escena es una función `(disposicion) => ({...})`, en angosto (menos de
  600px, o una pantalla parada) se arma con `disposicion.nombre === 'angosta'`.
- **azar con semilla**: `Motor.azar('semilla')`, nunca `Math.random()`.

## El componente

| Atributo | Qué hace |
|---|---|
| `escena="nombre"` | la escena registrada con `Motor.registrar` |
| `autoplay`, `loop`, `velocidad="1.5"` | lo de siempre |
| `tema="claro\|oscuro"` | sin él, sigue a `<html data-theme>` (Starlight) o al sistema |
| `movimiento="reducido\|completo"` | sin él, respeta `prefers-reduced-motion` |
| `sin-controles`, `sin-subtitulos`, `pantalla` | para una pantalla que solo muestra |

Desde JavaScript: `.escena = {...}`, `.reproducir()`, `.pausar()`, `.irA(t)`, `.t`, `.duracion`.
Teclado: espacio reproduce y pausa, ← → saltan de capítulo, `,` `.` van cuadro por cuadro.

Los colores se cambian desde afuera con `--motor-acento` (y `--motor-acento-oscuro`), etc.

## La capa pedagógica

Está encima del motor, y el motor no sabe que existe (vive en `src/pedagogico/`).

- **`<motor-leccion>`**: como `<motor-escena>`, más dos cosas.
  - **Preguntas**: donde la escena tiene `{ marca: 'pregunta', datos: { pregunta, opciones, correcta,
    explicacion } }`, la animación frena y pregunta antes de mostrar lo que pasa. Al contestar
    avisa si estuvo bien (y dispara el evento `respuesta`).
  - **Paso a paso** (el botón, o el atributo `paso-a-paso`): frena en cada `{ marca: 'paso' }`, y
    ⏮ ⏭ van de un paso al otro.
  - Con el atributo `video` no frena: la pregunta queda como cartel durante su tramo.
- **Piezas**: `codigo` (con la línea que corre resaltada, en Python, JavaScript o SQL), `variable`
  (una caja con su nombre), `lista` (casilleros con índices y una flechita), `consola` y `pila` (la
  pila de llamadas: una tarjeta por función que se está ejecutando, con sus variables).
- **`desdeTraza({ codigo, traza, explicaciones, preguntas, punteros })`**: arma la escena sola a
  partir de la traza de un programa (qué línea corrió y cuánto valía cada variable). La traza se
  saca de un programa de verdad con `python herramientas/trazar.py programa.py`, o se escribe a
  mano en el mismo formato (ver `ejemplos/conceptos/`).

```html
<motor-leccion escena="bucle-for"></motor-leccion>

<script src="motor.min.js"></script>
<script src="bucle-for.traza.js"></script>   <!-- python herramientas/trazar.py ... -->
<script>
    Motor.registrar('bucle-for', Motor.desdeTraza({
        ...Motor.trazas['bucle-for'],
        punteros: { numeros: 'n' },
        explicaciones: { 3: 'El for toma el primer elemento: n vale 4.' },
        preguntas: { 7: { pregunta: '¿Cuánto va a valer total?', opciones: ['15', '27'], correcta: 1 } },
    }));
</script>
```

Las marcas y las paradas que usa son del núcleo, y sirven para cualquier cosa:
`{ marca: 'tipo', datos, dur }` en la línea queda en `escena.marcas`, y el reloj acepta `paradas`.

### Que se arme sola, con el programa de un alumno

`Motor.trazarConPyodide(pyodide, codigo, { entradas })` corre un programa en el navegador (con un
Pyodide que le pasás) y devuelve la traza. Con `desdeTraza({ ...traza, explicar: true, punteros:
'auto' })` la lección se explica sola, en castellano: «El for toma el primer elemento: n vale 4»,
«total pasa de 4 a 12», «La condición no se cumple: la saltea». Probalo en
[Animá tu programa](https://maxinunez24.github.io/motor-animaciones/ejemplos/tu-programa/).

El trazador es uno solo, `src/pedagogico/trazador.py`: lo usan la consola
(`herramientas/trazar.py`) y el navegador (se copia a `trazador-py.js` al construir).

Entiende **funciones** (cada llamada va a la pila, con sus parámetros, y cuando termina se ve qué
devuelve; una recursión apila una tarjeta por llamada), **objetos** (con sus atributos, y `self`
dentro de un método) y **referencias**: cuando dos nombres son la misma lista o el mismo objeto,
llevan el mismo número y una flecha los une. Las explicaciones lo dicen: «b no es una copia: es la
misma lista que a», «Se llama a factorial(3): la función se llama a sí misma». Ejemplos en
[Funciones y objetos](ejemplos/funciones-y-objetos/).

### SQL, paso a paso

`Motor.desdeConsulta({ tabla, sql, preguntas })` anima una consulta sobre una tabla: muestra que SQL
se **escribe** en un orden (`SELECT`, `FROM`, `WHERE`...) y se **ejecuta** en otro (`FROM`, `WHERE`,
`SELECT`, `ORDER BY`, `LIMIT`), marca fila por fila si cumple el `WHERE` y arma el resultado. Entiende
`SELECT` con `WHERE` (`AND`, `OR`, `= != < <= > >=`), `ORDER BY` y `LIMIT`; con otra cosa avisa en vez
de mostrar algo equivocado. Los tests comparan cada resultado con SQLite de verdad.
Ejemplos en [SQL, paso a paso](ejemplos/sql/).

### Tests, paso a paso

`Motor.desdeTests({ corridas })` muestra cómo corre pytest: cada test, cada `assert` con lo que se
esperaba y lo que dio, el rojo y el verde, y el resumen. Con dos corridas se cuenta la historia
completa: falla, se encuentra el error, se corrige, pasa. Los datos salen de
`python herramientas/trazar.py test_programa.py --tests` (o de `Motor.probarConPyodide()` en el
navegador). Ejemplo en [Tests, paso a paso](ejemplos/tests/).

### El editor de escenas

[El editor](ejemplos/editor/) tiene el código a la izquierda y la escena a la derecha, y se rearma
mientras se tipea. Trae plantillas, explica los errores al lado del código, guarda el borrador y
exporta una página lista para abrir o publicar.

## 3D

`dist/motor-3d.min.js` (aparte, con Three.js adentro: 136 KB con gzip) trae `Motor3D.definirGlobo()`:
un globo terráqueo que es una pieza más. Se define qué capas, regiones y vientos tiene, y cada uno
pasa a ser una propiedad que se anima de 0 a 1:

```js
const globo = Motor3D.definirGlobo({
    mapa: Motor.datos.mapa,                       // continentes (Natural Earth, dominio público)
    capas: { calido: { color: '#f97316', manchas: [{ lon: -120, lat: 0, ancho: 80, alto: 16 }] } },
    regiones: { argentina: { color: '#facc15', anillos: Motor.datos.mapa.argentina } },
    vientos: { alisios: { lat: [-5, 5], lon: [-90, -170], cantidad: 4 } },
});
// en la escena: globo({ x: 800, y: 450, tamano: 700, lon: -120 })
// en la línea:  { pieza: 'g', a: { lon: -63, lat: -30, zoom: 1.7, calido: 1 } }
```

No tiene reloj propio: dibuja un cuadro cada vez que el motor le pasa otras propiedades, así que es
determinista y se graba a video como todo lo demás. Si el navegador no tiene WebGL, muestra un aviso
y el resto de la escena sigue andando. Ejemplo: [El Niño, explicado](ejemplos/el-nino/), que además
tiene una pieza propia (el corte del océano) hecha con `definirPieza`.

## Video

```bash
npm run video -- --url ejemplos/expo/pantalla.html --salida salida/expo.mp4
npm run video -- --url ejemplos/conceptos/ --escena 0 --narrar --salida salida/for.mp4
npm run video -- --url ejemplos/expo/pantalla.html --ancho 1080 --alto 1920   # vertical
```

Graba cuadro por cuadro (no la pantalla: pone la escena en cada instante y le saca una foto), así
que sale perfecto aunque la compu sea lenta. Deja al lado del `.mp4` los subtítulos en `.srt` y un
`.descripcion.txt` con los capítulos en el formato de YouTube. Una lección se graba en modo video:
las preguntas no frenan, se leen y quedan como cartel, y el paso siguiente dice la respuesta.

- `--narrar` lee cada subtítulo con [Piper](https://github.com/OHF-Voice/piper1-gpl), una voz que
  corre en la compu, sin internet: `pip install piper-tts` y la voz
  [`es_AR-daniela-high`](https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_AR/daniela/high)
  en `%LOCALAPPDATA%\motor-animaciones\voces\` (o pasala con `--voz`). Los datos de esa voz son
  CC BY-SA 4.0 (OpenSLR 61): la descripción que genera ya incluye el crédito.
  Antes de leer, el texto se prepara: sin emojis, con los símbolos en palabras («°C» se dice
  «grados», «>=» «mayor o igual a», `test_mitad` «test mitad») y terminado en punto, para que la
  entonación baje al final. Se puede afinar la voz con `--pausado`, `--expresion`, `--ritmo` y
  `--silencio`.
- `--gif` también deja un GIF, con su propia paleta de colores (`--gif-ancho`, `--gif-fps`): para
  mandarlo por mensaje o ponerlo en una presentación.
- `--subtitulos srt|quemados|ambos|no` (srt, aparte, es lo que conviene en YouTube). También deja un
  `.vtt`, para un `<video>` en una página web.
- `--desde` y `--hasta` para grabar un pedazo; `--fps`, `--tema`, `--calidad` (crf de x264).
- Usa el ffmpeg de `ffmpeg-static` (viene con `npm install`), o el de la variable `FFMPEG`.

## Trabajar en el motor

Para aportar, leé [CONTRIBUTING.md](CONTRIBUTING.md): las reglas que no se negocian, cómo se escribe
y cómo mandar un cambio.

```bash
npm install
npm run construir        # dist/: el motor, la versión base y la 3D
npm run servir           # http://localhost:4173/
npm test                 # el núcleo, en Node
npm run test:navegador   # los ejemplos, en Chromium
npm run tipos            # chequea los tipos (JSDoc)
```

Para sacar cuadros de una escena (el comienzo del render a video):
`node herramientas/capturar.js --url ejemplos/prueba.html --fps 12`.

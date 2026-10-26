# Motor de animaciones

Animaciones web **deterministas**: el estado en el instante *t* depende solo de *t*. Por eso la
misma escena se ve igual en vivo, paso a paso y grabada a video, y se puede probar con tests.

Sin dependencias. 20 KB con gzip con todo (14 KB sin la capa pedagógica, en `motor-base.min.js`).

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
`https://cdn.jsdelivr.net/gh/MaxiNunez24/motor-animaciones@v0.3.0/dist/motor.min.js`.

## Desde otro proyecto (Astro, Vite…)

```bash
pnpm add github:MaxiNunez24/motor-animaciones#v0.3.0
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
- **Piezas**: `codigo` (con la línea que corre resaltada, Python o JavaScript), `variable` (una
  caja con su nombre), `lista` (casilleros con índices y una flechita) y `consola`.
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

## Trabajar en el motor

```bash
npm install
npm run construir        # dist/motor.js, dist/motor.min.js y dist/motor-base.min.js
npm run servir           # http://localhost:4173/
npm test                 # el núcleo, en Node
npm run test:navegador   # los ejemplos, en Chromium
npm run tipos            # chequea los tipos (JSDoc)
```

Para sacar cuadros de una escena (el comienzo del render a video):
`node herramientas/capturar.js --url ejemplos/prueba.html --fps 12`.

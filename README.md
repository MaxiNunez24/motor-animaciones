# Motor de animaciones

Animaciones web **deterministas**: el estado en el instante *t* depende solo de *t*. Por eso la
misma escena se ve igual en vivo, paso a paso y grabada a video, y se puede probar con tests.

Sin dependencias. 13 KB con gzip, controles incluidos.

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
`https://cdn.jsdelivr.net/gh/<usuario>/motor-animaciones@v0.1.0/dist/motor.min.js`.

## Desde otro proyecto (Astro, Vite…)

```bash
pnpm add github:<usuario>/motor-animaciones#v0.1.0
```

```js
import { registrar, caja } from 'motor-animaciones';
```

`dist/` está subido al repo: pnpm no corre scripts de build de las dependencias.

## La escena

- **piezas**: `caja`, `texto`, `flecha`, `tabla`, `celular`. Todas tienen `x`, `y` (el centro),
  `escala`, `rotacion`, `opacidad` y `dentro` (para dibujarse dentro de otra, como un botón en el
  celular). Las nuevas se hacen con `definirPieza` (ver `src/piezas/definir.js`).
- **linea**: animaciones (`{ pieza, a, dur, curva, en, escalonar }`), `capitulo`, `subtitulo` y
  `espera`.
- **en**: sin nada, después de todo lo anterior; un número, a esa altura; `'+0.5'`, `'<'`, `'<0.2'`,
  `'>'`, como en GSAP. Los subtítulos van por su pista y no atrasan lo que sigue.
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

## Trabajar en el motor

```bash
npm install
npm run construir        # dist/motor.js y dist/motor.min.js
npm run servir           # http://localhost:4173/ejemplos/
npm test                 # el núcleo, en Node
npm run test:navegador   # los ejemplos, en Chromium
npm run tipos            # chequea los tipos (JSDoc)
```

Para sacar cuadros de una escena (el comienzo del render a video):
`node herramientas/capturar.js --url /ejemplos/prueba.html --fps 12`.

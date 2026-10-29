# Motor de animaciones

Animaciones web **deterministas**: el estado en el instante *t* depende solo de *t*. Por eso la
misma escena se ve igual en vivo, paso a paso y grabada a video, y se puede probar con tests.

Sin dependencias. 42 KB con gzip con todo (22 KB sin la capa pedagógica, en `motor-base.min.js`).

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
`https://cdn.jsdelivr.net/gh/MaxiNunez24/motor-animaciones@v0.10.0/dist/motor.min.js`.

## Desde otro proyecto (Astro, Vite…)

```bash
pnpm add github:MaxiNunez24/motor-animaciones#v0.10.0
```

```js
import { registrar, caja } from 'motor-animaciones';
```

`dist/` está subido al repo: pnpm no corre scripts de build de las dependencias. Cómo usarlo en
la plataforma del curso, con un componente de Astro listo: [docs/usar-en-el-curso.md](docs/usar-en-el-curso.md).

## La escena

- **piezas**: `caja`, `texto`, `flecha`, `tabla`, `celular`, `cilindro` (una base de datos),
  `contador` (un número que se anima), `grafo` (nodos y aristas: un dígrafo, una red), `camara`,
  `espejo` y `fila`. Todas tienen `x`, `y` (el centro), `escala`, `rotacion`, `opacidad`, `dentro`
  (para dibujarse dentro de otra, como un botón en el celular) y `pegar`.
  Las nuevas se hacen con `definirPieza` (ver `src/piezas/definir.js`).
- **camara**: lo que va `dentro: 'camara'` se ve a través de ella. Se mueve animando `mirarX`,
  `mirarY` y `zoom`, y con `ancho` y `alto` recorta a su ventana. En el celular, en vez de achicar
  la escena, la cámara se acerca a la parte que se cuenta (ver `ejemplos/expo/siges.js`). La
  ventana puede tener esquinas redondeadas (`radio`) o ser redonda (`forma: 'circulo'`), con un
  aro (`aro`) y `sombra`.
- **espejo**: una ventana que muestra agrandada otra parte de la escena (`mirarX`, `mirarY`,
  `zoom`), sincronizada con ella: no es una copia, es la misma parte vista otra vez. `fuente` es una
  pieza (o nada: toda la escena); `marco` marca en la escena qué parte se mira; `forma: 'circulo'`
  y mirar justo donde está lo hace una lupa. Quien mira lo puede arrastrar (`arrastrable`): eso es
  de la vista, como el zoom, y no cambia la escena.
- **pegar** (todas las piezas): `pegar: { a: 'caja', lado: 'derecha', separacion: 10, alinear:
  'inicio' }` la pega a un costado de otra pieza (`derecha`, `izquierda`, `arriba`, `abajo` o
  `centro`), y la sigue si se mueve o crece. Animando `pegado` de 1 a 0 se despega de a poco.
- **fila**: `fila({ piezas: ['a', 'b', 'c'], separacion, direccion: 'vertical', alinear })` acomoda
  piezas una al lado de la otra; si una crece, corre a las demás. Una que entra con la escala de 0
  a 1 va abriendo su lugar. Con `relleno` o `borde` dibuja la caja que las rodea.
- **flecha**: se engancha al borde de las piezas que une y las sigue. Con `desde: { pieza: 'a',
  lado: 'izquierda' }` sale de un costado fijo (ver la flecha de "la misma lista").
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
  600px, o una pantalla parada) se arma con `disposicion.nombre === 'angosta'`. De 600 a 900px es
  `'media'` (la columna de una clase): una escena que no la usa la trata como ancha.
  `disposicion.ancho` dice cuántos píxeles mide el lugar.
- **azar con semilla**: `Motor.azar('semilla')`, nunca `Math.random()`.

## El componente

| Atributo | Qué hace |
|---|---|
| `escena="nombre"` | la escena registrada con `Motor.registrar` |
| `autoplay`, `loop`, `velocidad="1.5"` | lo de siempre |
| `tema="claro\|oscuro"` | sin él, sigue a `<html data-theme>` (Starlight) o al sistema |
| `movimiento="reducido\|completo"` | sin él, respeta `prefers-reduced-motion` |
| `sin-controles`, `sin-subtitulos`, `pantalla` | para una pantalla que solo muestra |
| `controles-fijos` | los controles van siempre abajo, sin esconderse (en `<motor-leccion>` ya es así; `controles-flotantes` la hace flotar) |

Con mouse (y siempre en pantalla completa) los controles flotan sobre la parte de abajo del dibujo
y se esconden mientras la animación corre; vuelven al mover el mouse, al pausar o al llegar con el
teclado. En pantalla completa el subtítulo va encima del dibujo, como en el cine, así que el
dibujo ocupa toda la pantalla. En una `<motor-leccion>`, mientras hay una pregunta abierta los
controles se esconden (vuelven si se pasa el mouse por abajo) y el subtítulo sube encima de ella.

**Zoom**: los botones + y − de arriba a la derecha, las teclas `+` `-` `0`, pellizcar la pantalla
del celular, y en pantalla completa la rueda del mouse. En la página la rueda no hace zoom: baja
por la página, como siempre. En pantalla completa el mouse se esconde cuando se queda quieto. Con zoom, arrastrar mueve la vista. Es solo de la vista: no
cambia la escena.

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
  - En la página, la pregunta va debajo del dibujo, para no tapar lo que hay que mirar para
    contestarla. En pantalla completa va encima, y "Ver el dibujo" la achica un momento. Si el
    subtítulo repite la pregunta, no se muestra mientras está abierta.
- **Piezas**: `codigo` (con la línea que corre resaltada, en Python, JavaScript o SQL), `variable`
  (una caja con su nombre), `lista` (casilleros con índices y una flechita), `consola` y `pila` (la
  pila de llamadas: una tarjeta por función que se está ejecutando, con sus variables).
- **`desdeTraza({ codigo, traza, explicaciones, preguntas, punteros })`**: arma la escena sola a
  partir de la traza de un programa (qué línea corrió y cuánto valía cada variable). La traza se
  saca de un programa de verdad con `python herramientas/trazar.py programa.py`, o se escribe a
  mano en el mismo formato (ver `ejemplos/conceptos/`).
  - **Lupa** (`lupa: true`, o el zoom: `lupa: 1.6`): un programa largo se achica hasta entrar
    entero, y en una columna angosta queda ilegible. Con la lupa, el código va dentro de una
    `camara` que lo agranda y sigue a la línea marcada como un editor: baja suave cuando la marca
    se acerca al borde, dejando `contexto` líneas (3) arriba y abajo. El zoom nunca corta la línea
    más larga. Con `lupaDebajoDe: 900` se usa solo si el lugar mide menos de 900px. Por defecto
    tiene las esquinas redondeadas y un aro fino; con `lupa: { zoom, forma: 'circulo', radio, aro }`
    se elige cómo se ve.
- **`lineaDeCodigo(codigo, k)`**: dónde está la línea k de un `codigo`, para apuntarle con una
  flecha o mirarla con un espejo.

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

## Matemática

`dist/motor-mate.min.js` (aparte, 32 KB con gzip; global `MotorMate`, junto con `motor.min.js`) trae
un **plano cartesiano** y lo que va encima. Cada cosa es una pieza que dice `plano: 'p'` y se ubica
con coordenadas de la matemática (`mx`, `my`), así que se anima por su cuenta: el punto camina sobre
la curva, la recta gira hasta ser tangente, y si el plano hace zoom todo lo sigue.

```js
const { plano, grafica, punto, recta } = MotorMate;
piezas: {
    p: plano({ x: 800, y: 450, xmin: -1, xmax: 4, ymin: -1, ymax: 9 }),
    f: grafica({ plano: 'p', f: (x) => x * x, trazo: 0 }),
    P: punto({ plano: 'p', mx: 1, my: 1, etiqueta: 'P', guias: true }),
    t: recta({ plano: 'p', mx: 1, my: 1, pendiente: 2, progreso: 0 }),
},
linea: [{ pieza: 'f', a: { trazo: 1 }, dur: 2 }, { pieza: 't', a: { progreso: 1 } }],
```

Piezas: `plano`, `grafica` (una función, unos datos o una curva paramétrica), `punto`, `vector`,
`recta`, `segmento`, `area` (entre una curva y el eje, o entre dos curvas: una probabilidad, las
colas de un test, una banda), `curvasNivel` (de una función de dos variables) y `campo` (su
gradiente, o cualquier campo de vectores). Y escenas que se arman solas a partir de los datos, con preguntas:

| | |
|---|---|
| `desdeDerivada({ f, x0 })` | la secante que se vuelve tangente cuando h tiende a 0 |
| `desdeDescenso({ f, inicio, tasa })` | el descenso del gradiente sobre las curvas de nivel; avisa si rebota o diverge |
| `desdeRegresion({ datos, predecir })` | mínimos cuadrados: la recta gira hasta minimizar los residuos; R², y avisa al extrapolar |
| `desdeEuclides({ a, b })` | el mcd, con la tabla de divisiones y el rectángulo que se llena de cuadrados |
| `desdeRelacion({ conjunto, pares })` | dígrafo, matriz, y qué propiedades cumple, con el contraejemplo |
| `desdeModulo({ n, cuentas })` | aritmética modular como un reloj de n horas |
| `desdeIntervalo({ datos, confianza })` | un intervalo de confianza para la media: error estándar, valor crítico de la t, margen |
| `desdeCobertura({ media, desvio, n, muestras })` | qué quiere decir 95 %: muchas muestras, cada una con su intervalo |
| `desdeTest({ media, desvio, n, mu0, h0, h1 })` o `({ estadistico, gl, ... })` | un test de hipótesis con la campana: región de rechazo, estadístico, p-valor y la conclusión en el idioma del problema |
| `desdeVariabilidad({ datos })` | STC = SCR + SCE, con un punto y con todos; R², σ̂² y lo que R² no dice |
| `desdeBandas({ datos, xEstrella })` | el intervalo para la respuesta media y el de predicción, en x* y como bandas |
| `desdeTasas({ f, inicio, tasas })` | el descenso del gradiente con varias tasas a la vez, y f según la iteración |

Las cuentas (`derivada`, `gradiente`, `descensoGradiente`, `regresionLineal`, `curvaDeNivel`,
`euclides`, `propiedadesRelacion`...) se exportan también, y tienen tests contra resultados conocidos.
Las de estadística también: la normal y la t de Student (densidad, área, inversa), `valorCritico`,
`intervaloMedia`, `decidir` (el p-valor y la decisión de un test, en cualquier cola), `testMedia`,
`inferenciaRegresion` (STC, SCR, SCE, σ̂², el test de la pendiente, ICM e IP) y `minimosCuadrados`
(varias variables, con las ecuaciones normales y el R² ajustado). Sin tablas: los valores críticos
se calculan, y coinciden con los de las tablas.
Ejemplos: [matemática](ejemplos/matematica/), [en 3D](ejemplos/matematica-3d/),
[intervalos y tests](ejemplos/estadistica/) y [regresión de punta a punta](ejemplos/regresion/).

## Redes

`dist/motor-redes.min.js` (aparte, 17 KB con gzip; global `MotorRedes`) trae un **diagrama de
secuencia** (cada extremo es una línea vertical, el tiempo corre para abajo y cada mensaje es una
flecha inclinada), una **dirección IP** en sus 32 bits y la **ventana** de un protocolo. Las escenas:

| | |
|---|---|
| `desdeIntercambio({ extremos, mensajes })` | cualquier intercambio contado mensaje por mensaje: el saludo de TCP, HTTP, DNS, SMTP |
| `desdeVentana({ protocolo, paquetes, ventana, perdidos })` | stop-and-wait, Go-Back-N o Selective Repeat, con pérdidas de paquetes o de ACK |
| `desdeCongestion({ rondas, umbral, eventos })` | la ventana de congestión de TCP (Reno o Tahoe), con timeouts y ACK duplicados |
| `desdeSubred({ direccion: '192.168.10.77/26' })` | la máscara, la red (AND bit a bit), el broadcast y los hosts |

Los protocolos de ventana se **simulan** (`simularArq`): con los mismos datos, siempre los mismos
mensajes en los mismos instantes. Las subredes (`analizarIp`, `dividirEnSubredes`) se prueban contra
el módulo `ipaddress` de Python. Ejemplos: [redes](ejemplos/redes/).

## Finanzas

`dist/motor-finanzas.min.js` (aparte, 25 KB con gzip; global `MotorFinanzas`) trae las cuentas de
la bolsa y las opciones, y escenas que las cuentan. Usa los planos de matemática, que vienen adentro.

| | |
|---|---|
| `desdeAccion({ S0, sigma, sigmaAlta, dias })` | qué es una acción, cómo camina su precio, el rendimiento (simple y logarítmico) y la volatilidad |
| `desdeInteres({ monto, tasa, anios, promesa })` | interés compuesto (anual, mensual, continuo) y el valor presente, e^(−rT) |
| `desdePago({ K, prima, primaPut })` | qué paga un call y un put al vencer, la ganancia, el empate y quien lo vendió |
| `desdeBlackScholes({ S, K, T, r, sigma })` | de dónde sale la fórmula: futuros posibles, el promedio traído a hoy, d1, d2, N(d2), y más volatilidad |
| `desdeGriegas({ S, K, T, r, sigma })` | delta (la pendiente), gamma (la curvatura), theta (el tiempo), vega (la volatilidad) y rho (la tasa) |
| `desdeEstrategias({ S, T, r, sigma, estrategias })` | put protector, call cubierto, straddle y spread: cada pata y su suma |

Las cuentas (`blackScholes`, `griegas`, `montecarlo`, `caminoPrecio`, `volatilidad`, `valorPresente`)
se prueban contra los ejemplos resueltos de Hull, la paridad put-call y diferencias finitas.
Ejemplos, con el mismo cálculo en Python: [finanzas](ejemplos/finanzas/).

## 3D

`dist/motor-3d.min.js` (aparte, con Three.js adentro: 145 KB con gzip) trae `Motor3D.superficie` (la
gráfica de z = f(x, y)) y `Motor3D.definirGlobo()`.

**La superficie** se gira animando `azimut` y `elevacion`, se corta con un plano horizontal (`corte`,
`verCorte`: queda la curva de nivel, y su sombra en el piso), muestra las curvas de nivel abajo
(`niveles`, `verNiveles`), un punto y su plano tangente (`px`, `py`, `verPunto`, `verTangente`) y
caminos sobre ella (`caminos`, `recorrido`): un límite por distintos caminos, el descenso del gradiente.

```js
superficie({ x: 800, y: 450, f: (x, y) => x * x + y * y, rango: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }, corte: 1 })
// en la línea: { pieza: 's', a: { verCorte: 1 } }, { pieza: 's', a: { corte: 6, azimut: 40 }, dur: 5 }
```

**El globo** es un globo terráqueo que es una pieza más. Se define qué capas, regiones y vientos tiene, y cada uno
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
- `--voz otra-voz.onnx` narra con otra voz de Piper. Para entrenar la tuya (grabar las frases, clonar o
  entrenar Piper), ver [herramientas/voz/LEEME.md](herramientas/voz/LEEME.md).

## Trabajar en el motor

Para aportar, leé [CONTRIBUTING.md](CONTRIBUTING.md): las reglas que no se negocian, cómo se escribe
y cómo mandar un cambio.

```bash
npm install
npm run construir        # dist/: el motor, la versión base, la 3D, matemática, redes y finanzas
npm run servir           # http://localhost:4173/
npm test                 # el núcleo, en Node
npm run test:navegador   # los ejemplos, en Chromium
npm run tipos            # chequea los tipos (JSDoc)
```

Para sacar cuadros de una escena (el comienzo del render a video):
`node herramientas/capturar.js --url ejemplos/prueba.html --fps 12`.

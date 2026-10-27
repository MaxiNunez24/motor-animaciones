# Cómo aportar

¡Gracias por querer sumar! Este motor nació para el curso **Pensamiento Computacional y Testing de
Aplicaciones** del CFP 401 de Ensenada, pero sirve para cualquier animación web. Se puede aportar
una escena, una pieza nueva, una lección, una corrección o una idea. También vale si es tu primer
aporte a un proyecto: está pensado para eso.

Si sos un **agente de IA** (por ejemplo, el del curso), leé todo, pero en especial
[la lista para agentes](#si-sos-un-agente-de-ia) del final.

## Armar el entorno

Hace falta [Node.js](https://nodejs.org) 24 o más nuevo. Python 3.12 o más es opcional, pero
recomendado: lo usan el trazador y sus tests.

```bash
git clone https://github.com/MaxiNunez24/motor-animaciones.git
cd motor-animaciones
npm install
npm run construir
npm run servir            # http://localhost:4173/
```

| Comando | Qué hace |
|---|---|
| `npm run construir` | Arma `dist/` (el motor, la versión base, la 3D, matemática y redes) |
| `npm run servir` | Sirve el repo en http://localhost:4173/ para ver los ejemplos |
| `npm test` | Los tests en Node: el núcleo, las piezas, el trazador, el SQL |
| `npm run test:navegador` | Construye y corre los tests en Chromium (Playwright) |
| `npm run tipos` | Chequea los tipos (JSDoc) |
| `npm run video -- --url ... --gif` | Graba una escena a video, y un GIF para mostrar el cambio |

La primera vez, Playwright puede pedir `npx playwright install chromium`. Para la voz de los videos
(opcional): `pip install piper-tts` y la voz que dice el README.

## Las reglas que no se negocian

Son las que hacen que el motor sea lo que es. Un cambio que rompe alguna no entra, aunque ande.

1. **Determinista.** Lo que se ve en el instante *t* depende solo de *t*. Nada de `Math.random()`
   (para eso está `Motor.azar('semilla')`), nada de `setTimeout` para encadenar animaciones, nada de
   "cuando termine esto, hacé aquello". Si una escena se ve distinta al volver al mismo instante,
   hay un error.
2. **Capas separadas.** `src/nucleo/` no toca la página: se tiene que poder usar desde Node. La
   capa pedagógica (`src/pedagogico/`) está encima y el núcleo no sabe que existe. El 3D, matemática
   (`src/mate/`) y redes (`src/redes/`) van aparte, cada una en su archivo de `dist/`.
3. **Sin dependencias en el navegador.** El motor no carga librerías. La única excepción es el 3D,
   que va en su propio archivo con Three.js adentro.
4. **Accesible.** Todo se maneja con teclado, tiene texto alternativo, respeta
   `prefers-reduced-motion`, se ve en claro y en oscuro, y entra en un celular de 360 px sin
   correrse de costado.
5. **Para compus modestas.** Las del CFP son lentas: no se toca el DOM si no cambió nada, y nada
   corre "por las dudas" en cada cuadro.

## Cómo se escribe

- **En castellano rioplatense, con voseo:** lo que se ve en pantalla, los comentarios, los mensajes
  de error y los commits. *"Fijate"*, *"tocá"*, *"no encuentro la voz"*.
- **Cuatro espacios** de sangría, en todo (lo dice el `.editorconfig`).
- **Los comentarios explican el porqué**, no el qué. "Se recorta al marco: si no, lo que la cámara
  dejó afuera se asoma por arriba" sirve; "recorta al marco" no.
- **Los nombres, en castellano:** `piezas`, `linea`, `irA`, `desdeTraza`.
- **Un error tiene que decir cómo arreglarlo.** "Una caja no tiene «colr». Lo que se le puede poner
  es: ancho, alto, relleno…", y no "propiedad inválida".

## Qué aportar, y cómo

### Una pieza nueva

Se hace con `definirPieza` (mirá `src/piezas/caja.js` o, para una pieza que no está en el motor,
`ejemplos/el-nino/corte.js`). Lo que pueda calcularse sin la página (una geometría, un formato)
va en una función aparte, con su test en `tests/nucleo/`. Sumá un ejemplo que la use.

### Una escena o una lección

Van en `ejemplos/`, cada una en su carpeta con su `index.html`. Si sale de un programa de Python,
la traza se genera con `python herramientas/trazar.py`: no se escribe a mano (y si se hace, que sea
en el mismo formato, como `ejemplos/conceptos/lecciones.js`). Sumá al menos un test en
`tests/navegador/` que la recorra entera sin errores.

### Contenido con datos reales

- **Citá las fuentes**, con fecha, en la escena y en la página (mirá `ejemplos/el-nino/`). Un dato
  que cambia (un pronóstico, una estadística) tiene que decir *a qué fecha* es.
- **Nunca datos personales.** Nombres, DNI, horarios: inventados. El repositorio es público.
- Si algo es un esquema y no una medición, que lo diga.
- Imágenes, mapas y voces: solo de dominio público o con licencia que lo permita, y con el crédito.

### Una corrección

Primero un test que muestre el error (que falle), después el arreglo (que lo haga pasar). Así no
vuelve: varios tests del repo empezaron así (buscá "Este se escapó una vez").

## El proceso

1. Si es algo grande, abrí primero un *issue* para charlarlo.
2. Trabajá en una rama: `git switch -c pieza-reloj`.
3. Antes de mandar: `npm test`, `npm run tipos` y `npm run test:navegador`, todo en verde.
4. **`dist/` va en el commit.** El curso instala el motor desde Git y pnpm no corre scripts de build:
   si no reconstruís con `npm run construir`, el cambio no le llega a nadie.
5. Abrí un *pull request* contando qué cambia y por qué, con una captura o un GIF
   (`npm run video -- --url tu-ejemplo/ --gif`).

Los mensajes de commit, en castellano y diciendo qué cambia: "Tabla: anclarla arriba para que no
salte al crecer", y no "fix".

### Las capturas de referencia

`tests/navegador/escena.spec.js` compara la escena de prueba con una captura guardada. Si cambiaste
algo que se ve **a propósito**, actualizala con `npx playwright test --update-snapshots` y contalo
en el pull request. Si cambió sin que lo busques, es un error. La captura se sacó en Windows: en
Linux da distinta por cómo se dibujan las letras, y por eso GitHub Actions saltea ese test.

## Las versiones

Cada versión es un tag (`v0.6.0`): el curso se instala fijado a uno, así una versión nueva no le
cambia nada hasta que decida actualizar. Un cambio que rompe cómo se usaba algo sube el número del
medio y se avisa en la versión.

## Si sos un agente de IA

- Leé el [README](README.md) y, si el cambio es para el curso, [la guía del curso](docs/usar-en-el-curso.md).
- Respetá las [reglas que no se negocian](#las-reglas-que-no-se-negocian) y la forma de escribir,
  aunque el pedido no las mencione.
- No borres ni debilites un test para que pase: si un test falla, o el código está mal o el test
  está desactualizado, y hay que decir cuál de las dos.
- Verificá en el navegador, no solo con los tests: sacá capturas en compu y en 360 px, en claro y en
  oscuro, y miralas antes de dar algo por terminado.
- Reconstruí `dist/` y corré todo antes de proponer el cambio.
- No publiques ni crees versiones (tags) por tu cuenta: eso lo decide quien mantiene el repo.
- Si algo no está claro, preguntá antes de inventar una convención nueva.

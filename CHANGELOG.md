# Cambios

Lo que cambió en cada versión. Cada versión publicada tiene su tag en Git (`v0.12.0`), y es lo que
conviene fijar desde otro proyecto:

```bash
pnpm add github:MaxiNunez24/motor-animaciones#v0.12.0
```

o `https://cdn.jsdelivr.net/gh/MaxiNunez24/motor-animaciones@v0.12.0/dist/motor.min.js`.

## v0.12.0 · 2026-10-29

### Pedidos del curso
- **Lupa de quien mira**: copia el dibujo pieza por pieza, como el espejo, en vez de una sola copia
  del dibujo entero. Las sombras de la lupa, los espejos y las cámaras son filtros de SVG (Safari no
  dibujaba la forma con `drop-shadow()` en el atributo).
- **desdeTraza**:
  - el cartel de un error crece con el mensaje y no cae afuera del cuadro;
  - `alto: 'auto'` mide la escena hasta donde llega lo que muestra (la pila en su momento más alto,
    el error, la consola);
  - `lineaGrande: true`: una franja abajo con la línea que corre, a todo lo ancho, que se atenúa al
    terminar. Con ella, el código va entero arriba, sin la lupa de cámara.
- **desdePedidoHttp** (redes): un pedido HTTP y su respuesta con lo que viaja adentro (método, URL,
  encabezados, cuerpo; código y JSON), la ruta de Flask que lo atiende y lo que muestra el navegador.

### Lo demás
- Subtítulos que esquivan: en pantalla completa (y los de reel), si van a tapar algo, suben a la
  primera franja libre; si no hay, se quedan con un fondo más firme.
- `revisar` (atributo), `npm run revisar` y `Motor.revisarSuperposiciones()`: avisan qué tapan los
  subtítulos y qué textos se pisan.
- Controles: en pantalla completa se esconden enseguida y queda un hilo con capítulos y preguntas; se
  van al salir el mouse. En una pantalla sin controles, el mouse vuelve con una sacudida.
- El contador tiene tamaño (para flechas y para el revisor). Un texto en `fuente: 'mono'` respeta los
  espacios del principio.
- Las plantillas del editor dibujan su título (`titulo` es el nombre de la escena, no se dibuja).

## v0.11.0 · 2026-10-29

- Estilos importables (`estilo="neon"` o un `.json` con `extiende`): paleta, fuentes, fondo, efectos
  (brillo, sombra, a mano, grano, viñeta), curvas por propiedad, escalonado, predeterminados de piezas,
  sonidos y subtítulos. Vienen sobrio, pizarra, neón, papel y reel.
- Curvas `resorte`, `gelatina`, `rebote`, `elastico`, `anticipar` y `envion`, con parámetros;
  escalonado desde el inicio, el fin, el centro, los bordes o al azar.
- `trazo` en todas las piezas (los bordes se dibujan y después se rellenan) y la pieza `forma`, con
  figuras que se transforman entre sí.
- Sonidos fabricados con recetas, en la línea, pegados a una animación o automáticos según el estilo.
- Subtítulos de reel, palabra por palabra.
- Video: `--estilo`, desenfoque de movimiento, sonidos mezclados y música que baja con la voz.
- Atajos: `dibujar`, `aparecer`, `transformar`, `mover`, `decir`, `sonar`.
- Lupa animada (`seguir`) y lupa de quien mira. Lo arrastrado nunca sale del dibujo y vuelve con
  doble clic o ↺.

## v0.10.0 · 2026-10-28

- Finanzas (`dist/motor-finanzas.min.js`): la acción y su volatilidad, el valor del dinero en el
  tiempo, qué paga una opción, Black-Scholes, las griegas y estrategias, con el mismo cálculo en Python.
- `grafica` y `area` aceptan un `k` animable.

## v0.9.1 · 2026-10-28

- La rueda hace zoom solo en pantalla completa.

## v0.9.0 · 2026-10-28

- Vínculos (`pegar`, `fila`), espejos, preguntas que no tapan el dibujo, portada en vivo y
  herramientas para grabar una voz propia.

## v0.8.0 · 2026-10-28

- Estadística, regresión de punta a punta, zoom y lupa de cámara.

## v0.7.0 · 2026-10-27

- Matemática (2D y 3D) y redes.

## v0.6.0 · 2026-10-26

- Funciones, objetos, SQL, tests animados, voz más natural, GIF y el editor de escenas.

## v0.3.0 a v0.5.0 · 2026-10-26

- El núcleo, las piezas, los controles, la escena de la Expo, la capa pedagógica, videos con voz,
  animaciones que se arman solas y 3D.

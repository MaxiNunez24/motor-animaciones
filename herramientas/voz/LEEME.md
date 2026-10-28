# Tu propia voz para narrar

La voz de hoy (Piper, es_AR-daniela) lee bien, pero no se puede corregir: le falta fuerza en la erre y a
veces el énfasis cae donde no va. Con una voz propia, entrenada con tus grabaciones, se puede volver a
entrenar cada vez que algo suene mal.

**Tu voz no va al repo.** El repo es público. Las grabaciones y el modelo van en una carpeta tuya
(por ejemplo `Documentos/mi-voz`), y `.gitignore` frena los `.wav`, los `.onnx` y los `.ckpt` por si acaso.

## 1. Grabar

```bash
node herramientas/servir.js
```

Y en Chrome o Edge: <http://localhost:4173/herramientas/voz/grabar.html>. La página muestra una frase por
vez: Espacio graba y para, E escucha, Enter guarda y pasa a la siguiente. Avisa si saturó, si quedó bajo
o si parece cortada. Se puede cortar y seguir otro día.

Las frases están en `corpus.txt` (661, unos 50 minutos de audio). Salen de dos lados:

- lo que dicen las escenas del motor (los subtítulos de los ejemplos), que es lo que la voz va a leer después;
- `frases-propias.txt`: la erre fuerte, la elle y la ye, el voseo, preguntas, exclamaciones, números.

Para sumar frases, se agregan a `frases-propias.txt` y se rehace la lista (con el servidor andando):

```bash
node herramientas/voz/armar-corpus.mjs
```

Cada frase tiene un id que sale de su texto: rehacer la lista no invalida lo ya grabado.

En la carpeta quedan `wavs/<id>.wav` (mono, 22050 Hz, 16 bits) y `metadata.csv` (`id|texto`), que es el
formato que espera Piper para entrenar.

## 2. Dos caminos, en paralelo

### Clonar (para escuchar algo pronto)

Modelos como F5-TTS (hay una versión entrenada en castellano) o XTTS copian una voz con unos minutos de
audio. Sirve para escuchar cómo suena tu voz sintetizada con las primeras tandas grabadas.

- Pesados y lentos comparados con Piper; para narrar un video de 3 minutos alcanzan, pero no para todo.
- Cuesta corregirles la pronunciación: no hay mucho de dónde agarrarlos.
- **Licencias**: los pesos de F5-TTS figuran como no comerciales (CC-BY-NC-4.0) en varias fuentes, y
  XTTS tiene su propia licencia no comercial. Para el curso alcanza, pero hay que revisar la del modelo
  exacto antes de usarlo.

### Entrenar Piper (la voz para quedarse)

Se parte de una voz en castellano ya entrenada (un checkpoint) y se la ajusta con tus grabaciones. En
una RTX 2060 Super (8 GB) es cuestión de horas, o de una noche.

1. Un entorno aparte, afuera del repo: Piper entrena con PyTorch y Python 3.10/3.11 (la compu tiene
   3.14), así que conviene un `venv` con 3.11 o un contenedor de Docker con acceso a la placa.
2. El código de entrenamiento: `rhasspy/piper` se archivó en octubre de 2025 y siguió en
   `OHF-Voice/piper1-gpl` (GPL-3.0). El modelo que sale es tuyo; el código de entrenamiento no se mezcla
   con el motor.
3. El checkpoint de partida: no encontramos publicado el de es_AR-daniela; hay de es_ES y de es_MX en
   `rhasspy/piper-checkpoints`. Igual sirven: lo que aprende de tus grabaciones es tu voz y tu acento.
   La fonética se arma con espeak-ng en `es-419` (castellano de América).
4. Preprocesar (`metadata.csv` + `wavs/` → fonemas), entrenar desde el checkpoint, escuchar muestras
   cada tanto, y exportar a `.onnx` con su `.onnx.json`.
5. Narrar con tu voz:

   ```bash
   npm run video -- --url ejemplos/conceptos/ --narrar --voz "C:/ruta/a/mi-voz.onnx"
   ```

### Corregir sin reentrenar

Lo que suena mal siempre igual (una sigla, una palabra en inglés) se corrige antes de entrenar nada, en
`PARA_LEER` de `herramientas/lib/textos-video.js`: es la lista de cómo se dice cada cosa en voz alta, y
la usan la narración y el corpus.

# La escena de la Expo

**El Sistema de Gestión de Alumnos: cómo se va a ver.** Para la Expo CFP del viernes 13/11/2026.

| Archivo | Qué es |
|---|---|
| `siges.js` | La escena |
| `pantalla.html` | Para la pantalla grande: toda la ventana, en loop, sin controles, en oscuro |
| `index.html` | Para el celular: con controles, para pausar y volver a ver una parte |

Dura un poco más de un minuto y tiene tres capítulos: **Hoy**, **Cómo va a funcionar** y **Una sola
vez**. En una pantalla ancha se ve entera; en una angosta (un celular parado), la cámara se acerca
a la parte que se está contando.

## Para el día de la Expo, sin internet

La pantalla grande no necesita nada instalado ni conexión:

1. Copiá a la compu de la pantalla una carpeta con `dist/motor.min.js` y `ejemplos/expo/`,
   respetando las rutas (o copiá el repo entero).
2. Abrí `ejemplos/expo/pantalla.html` con doble clic.
3. Apretá **F11** para la pantalla completa. Arranca sola y no termina nunca.

Si la compu es muy lenta, se puede pasar a `movimiento="reducido"` en el HTML: los cambios de
cámara pasan a ser cortes, y se mueve mucho menos.

## En la plataforma del curso

Lo más rápido, y lo que recomiendo para la Expo, es que la página `/expo/` del curso cargue los
dos archivos tal cual, sin pasar por el empaquetador:

1. Copiá `dist/motor.min.js` y `ejemplos/expo/siges.js` a `public/expo/` del curso.
2. En la página (`src/pages/expo.astro`, o donde vaya):

   ```astro
   <motor-escena escena="expo-siges" loop autoplay></motor-escena>
   <script is:inline src={`${import.meta.env.BASE_URL}/expo/motor.min.js`}></script>
   <script is:inline src={`${import.meta.env.BASE_URL}/expo/siges.js`}></script>
   ```

   `is:inline` es para que Astro no los empaquete. La ruta lleva el `base` adelante, igual que
   los otros scripts de `public/`: sin él, en GitHub Pages da 404.

3. Los colores siguen solos el tema del sitio (Starlight usa `data-theme`). Para usar el acento
   del curso:

   ```css
   motor-escena {
       --motor-acento: var(--sl-color-accent);
   }
   ```

Más adelante, cuando haya más de una escena, conviene instalar el motor como dependencia
(`pnpm add github:<usuario>/motor-animaciones#v0.2.0`) y escribir las escenas como módulos.

## De dónde salen los datos

- **Del proyecto** (`proyecto.mdx`, público): la asistencia en papel pasada a una planilla, la
  misma información cargada en varios lugares, cada planilla nueva copiada a mano, los datos que
  se vuelven a escribir en otro sistema; el alumno que avisa que llegó con el DNI, el docente que
  pasa lista desde el celular, la base de datos, la planilla oficial y la pantalla de la merienda.
- **De los casos** (`casos.mdx`, que es privado): solo lo general. Que la planilla se completa
  a mano y se vuelve a cargar en la ficha de curso y el listado de cursos. No hay citas, fechas
  de entrevistas, cifras de nadie en particular, ni nada que identifique a una persona.
- **Inventado**: los nombres (los mismos de los bocetos del mapa del proyecto), el DNI, las horas
  de llegada y el 83 de la merienda.
- **No va**: el bot del SiGeS, que es interno. Hay un test que lo verifica.

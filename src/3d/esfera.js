// Las cuentas del globo, sin Three.js ni WebGL: de longitud y latitud a un
// punto del mapa plano (la textura) y a un punto de la esfera. Están aparte
// para poder probarlas con números.
//
// Las dos tienen que coincidir con cómo Three.js pega una imagen sobre una
// SphereGeometry: si no, la flecha de los vientos aparecería en otro océano.

const GRADO = Math.PI / 180;

/**
 * Un punto de la Tierra en un mapa plano de ancho × alto (proyección
 * equirectangular: la longitud va de -180 a 180 de izquierda a derecha).
 */
export function aPixel(lon, lat, ancho, alto) {
    return { x: ((lon + 180) / 360) * ancho, y: ((90 - lat) / 180) * alto };
}

/**
 * Un punto de la Tierra sobre una esfera de radio r, en las mismas
 * coordenadas que usa Three.js para la SphereGeometry: la longitud -90 queda
 * mirando a la cámara (+z), el norte arriba (+y).
 */
export function posicionEnEsfera(lon, lat, r = 1) {
    const phi = (lon + 180) * GRADO;
    const theta = (90 - lat) * GRADO;
    return {
        x: -Math.cos(phi) * Math.sin(theta) * r,
        y: Math.cos(theta) * r,
        z: Math.sin(phi) * Math.sin(theta) * r,
    };
}

/** Hacia dónde queda el este en ese punto (un vector de largo 1, tangente a la esfera). */
export function haciaElEste(lon) {
    const phi = (lon + 180) * GRADO;
    return { x: Math.sin(phi), y: 0, z: Math.cos(phi) };
}

/**
 * Cuánto girar el globo para que el punto (lon, lat) quede de frente a la
 * cámara: primero sobre el eje vertical, después sobre el horizontal.
 * En radianes, como los usa Three.js (rotation.x y rotation.y, orden XYZ).
 */
export function giroParaMirar(lon, lat) {
    return { x: lat * GRADO, y: -(lon + 90) * GRADO };
}

// La barra de controles: reproducir, pausar, ir de capítulo en capítulo,
// arrastrar a cualquier momento, cambiar la velocidad y prender o apagar los
// subtítulos y el sonido.
//
// No maneja el tiempo: le pide todo al componente (que tiene el reloj) y se
// limita a mostrar lo que le dicen. Así hay una sola fuente de verdad sobre en
// qué instante estamos.

const ICONOS = {
    reproducir: '<path d="M8 5v14l11-7z"/>',
    pausar: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    anterior: '<path d="M6 6h2v12H6zM9.5 12 18 6v12z"/>',
    siguiente: '<path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z"/>',
    pantalla: '<path d="M5 5h5v2H7v3H5zM14 5h5v5h-2V7h-3zM5 14h2v3h3v2H5zM17 14h2v5h-5v-2h3z"/>',
    sonido: '<path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 9h4l5-4v14l-5-4H4z"/>',
    silencio: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

export const VELOCIDADES = [0.5, 0.75, 1, 1.5, 2];

function icono(nombre) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;
}

/** 75.4 → "1:15" */
export function reloj(segundos) {
    const s = Math.floor(Math.max(segundos, 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * @param {HTMLElement} contenedor
 * @param {{
 *     alternar: () => void, anterior: () => void, siguiente: () => void,
 *     irA: (t: number) => void, velocidad: (v: number) => void,
 *     subtitulos: (prendidos: boolean) => void, sonido: (prendido: boolean) => void,
 *     pantalla: () => void, hilo?: HTMLElement,
 * }} acciones
 */
export function crearBarra(contenedor, acciones) {
    contenedor.innerHTML = `
        <button type="button" data-accion="anterior" aria-label="Capítulo anterior">${icono('anterior')}</button>
        <button type="button" data-accion="alternar" aria-label="Reproducir">${icono('reproducir')}</button>
        <button type="button" data-accion="siguiente" aria-label="Capítulo siguiente">${icono('siguiente')}</button>
        <div class="ma-linea">
            <input type="range" min="0" max="1" step="0.1" value="0" aria-label="Momento de la animación">
            <div class="ma-marcas" aria-hidden="true"></div>
        </div>
        <span class="ma-tiempo" aria-hidden="true">0:00 / 0:00</span>
        <button type="button" data-accion="velocidad" aria-label="Velocidad: normal">1×</button>
        <button type="button" data-accion="subtitulos" aria-pressed="true" aria-label="Subtítulos">CC</button>
        <button type="button" data-accion="sonido" aria-pressed="true" aria-label="Sonido">${icono('sonido')}</button>
        <button type="button" data-accion="pantalla" aria-label="Pantalla completa">${icono('pantalla')}</button>
        <div class="ma-capitulo" aria-live="polite"></div>
    `;
    const $ = (s) => /** @type {HTMLElement} */ (contenedor.querySelector(s));
    const botonAlternar = $('[data-accion="alternar"]');
    const botonVelocidad = $('[data-accion="velocidad"]');
    const botonSubtitulos = $('[data-accion="subtitulos"]');
    const botonSonido = $('[data-accion="sonido"]');
    const rango = /** @type {HTMLInputElement} */ ($('input'));
    const marcas = $('.ma-marcas');
    const tiempo = $('.ma-tiempo');
    const capitulo = $('.ma-capitulo');
    // El hilo (si hay): la barra en miniatura que queda cuando los controles se esconden.
    const hiloAvance = /** @type {HTMLElement | null} */ (acciones.hilo?.querySelector('.ma-hilo-avance') ?? null);
    const hiloMarcas = /** @type {HTMLElement | null} */ (acciones.hilo?.querySelector('.ma-hilo-marcas') ?? null);

    let duracion = 0;
    let capitulos = [];
    let velocidad = 1;
    let ultimoCapitulo = null;

    contenedor.addEventListener('click', (e) => {
        const boton = /** @type {HTMLElement} */ (e.target).closest('button');
        if (!boton) return;
        const accion = boton.dataset.accion;
        if (accion === 'velocidad') {
            velocidad = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length];
            acciones.velocidad(velocidad);
        } else if (accion === 'subtitulos') {
            const prendidos = boton.getAttribute('aria-pressed') !== 'true';
            acciones.subtitulos(prendidos);
        } else if (accion === 'sonido') {
            acciones.sonido(boton.getAttribute('aria-pressed') !== 'true');
        } else {
            acciones[accion]();
        }
    });
    rango.addEventListener('input', () => acciones.irA(Number(rango.value)));
    // Mientras se arrastra, el que manda es el dedo: si el reloj también
    // moviera la barra, el botón se escaparía de abajo del dedo.
    let arrastrando = false;
    rango.addEventListener('pointerdown', () => { arrastrando = true; });
    for (const fin of ['pointerup', 'pointercancel']) {
        rango.addEventListener(fin, () => { arrastrando = false; });
    }

    return {
        /**
         * Cuando cambia la escena (o su disposición).
         * @param {any} escena
         * @param {{ t: number, clase: string, texto?: string }[]} [extras] otras marcas sobre la barra,
         *     que ponen las capas de arriba (las preguntas de una lección).
         */
        configurar(escena, extras = []) {
            duracion = escena.duracion;
            capitulos = escena.capitulos;
            rango.max = String(duracion);
            const donde = (t) => `left: ${((t / duracion) * 100).toFixed(2)}%`;
            marcas.innerHTML = capitulos
                .filter((c) => c.t > 0)
                .map((c) => `<span style="${donde(c.t)}"></span>`)
                .concat(extras.map((m) => `<span class="${m.clase}" style="${donde(m.t)}">${m.texto ?? ''}</span>`))
                .join('');
            // En el hilo, las mismas marcas sin texto: puntitos.
            if (hiloMarcas) {
                hiloMarcas.innerHTML = capitulos.filter((c) => c.t > 0).map((c) => `<span style="${donde(c.t)}"></span>`)
                    .concat(extras.map((m) => `<span class="${m.clase}" style="${donde(m.t)}"></span>`))
                    .join('');
            }
            ultimoCapitulo = null;
        },
        /** En cada cuadro. Solo toca lo que cambió. */
        mostrar(estado) {
            if (!arrastrando) rango.value = String(estado.t);
            if (hiloAvance) hiloAvance.style.transform = `scaleX(${duracion > 0 ? (estado.t / duracion).toFixed(4) : 0})`;
            const texto = `${reloj(estado.t)} / ${reloj(duracion)}`;
            if (tiempo.textContent !== texto) tiempo.textContent = texto;
            const cap = capitulos[estado.capitulo];
            rango.setAttribute(
                'aria-valuetext',
                `${reloj(estado.t)} de ${reloj(duracion)}${cap ? `, ${cap.nombre}` : ''}`,
            );
            if (estado.capitulo !== ultimoCapitulo) {
                ultimoCapitulo = estado.capitulo;
                capitulo.textContent = cap ? `${estado.capitulo + 1}/${capitulos.length} · ${cap.nombre}` : '';
            }
        },
        corriendo(si) {
            botonAlternar.innerHTML = icono(si ? 'pausar' : 'reproducir');
            botonAlternar.setAttribute('aria-label', si ? 'Pausar' : 'Reproducir');
        },
        velocidad(v) {
            velocidad = v;
            botonVelocidad.textContent = `${String(v).replace('.', ',')}×`;
            botonVelocidad.setAttribute('aria-label', v === 1 ? 'Velocidad: normal' : `Velocidad: ${String(v).replace('.', ',')} veces`);
        },
        subtitulos(prendidos) {
            botonSubtitulos.setAttribute('aria-pressed', String(prendidos));
        },
        sonido(prendido) {
            botonSonido.setAttribute('aria-pressed', String(prendido));
            botonSonido.innerHTML = icono(prendido ? 'sonido' : 'silencio');
        },
    };
}

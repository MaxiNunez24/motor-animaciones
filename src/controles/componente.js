import { compilar } from '../nucleo/linea.js';
import { Reloj } from '../nucleo/reloj.js';
import { crearPintor } from '../pintor/pintor.js';
import { crearBarra } from './barra.js';
import { ESTILOS } from './estilos.js';

// <motor-escena>: la forma de poner una escena en cualquier página.
//
//     <motor-escena escena="mi-escena" loop autoplay></motor-escena>
//     <script src="motor.min.js"></script>
//     <script>Motor.registrar('mi-escena', { ... });</script>
//
// Atributos:
//   escena="nombre"        la escena registrada con Motor.registrar()
//   autoplay, loop         lo de siempre
//   velocidad="1.5"
//   tema="claro|oscuro"    sin él, sigue al sitio (data-theme de Starlight) o al sistema
//   movimiento="reducido|completo"   sin él, respeta prefers-reduced-motion
//   sin-controles          para una pantalla que solo muestra (la Expo)
//   sin-subtitulos         arrancan apagados
//   pantalla               ocupa toda la ventana
//   controles-fijos        los controles van siempre abajo del dibujo, sin
//                          esconderse (si no, con mouse flotan y se esconden
//                          mientras la animación corre)
//
// Zoom: Ctrl + rueda (o pellizcar el touchpad o la pantalla), los botones + y −
// que aparecen arriba a la derecha, o las teclas + − 0. Con zoom, arrastrar
// mueve el dibujo. El zoom es solo de la vista: no cambia la escena.
//
// También se maneja desde JavaScript: elemento.escena = {...}, .reproducir(),
// .pausar(), .irA(t), .t, .duracion.

const registro = new Map();
const esperando = new Map();

/**
 * Deja una escena disponible por nombre para los <motor-escena escena="...">.
 * Se puede llamar antes o después de que exista el elemento.
 */
export function registrar(nombre, definicion) {
    registro.set(nombre, definicion);
    for (const elemento of esperando.get(nombre) ?? []) elemento.escena = definicion;
    esperando.delete(nombre);
}

// En Node (los tests del núcleo) no hay HTMLElement: la clase se define igual
// para que el módulo se pueda importar, pero no se registra.
const Base = /** @type {typeof HTMLElement} */ (globalThis.HTMLElement ?? class {});

// Más angosto que esto, la escena usa su disposición "angosta" si la tiene.
const ANCHO_ANGOSTO = 600;
// Entre ANCHO_ANGOSTO y esto, la "media": la columna de una clase, una
// tarjeta. Una escena que no la conoce la trata como "ancha" (todas preguntan
// solo si es "angosta"); una que sí, puede darle más lugar a lo que se lee.
const ANCHO_MEDIO = 900;

export class MotorEscena extends Base {
    static observedAttributes = ['escena', 'tema', 'movimiento', 'velocidad', 'loop', 'sin-controles', 'sin-subtitulos', 'controles-fijos', 'pantalla'];

    constructor() {
        super();
        const sombra = this.attachShadow({ mode: 'open' });
        sombra.innerHTML = `
            <style>${ESTILOS}</style>
            <div class="ma-raiz con-subtitulos" part="raiz">
                <div class="ma-lienzo" tabindex="0">
                    <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ma-titulo" aria-describedby="ma-descripcion"></svg>
                    <div class="ma-zoom" role="group" aria-label="Zoom">
                        <button type="button" data-zoom="alejar" aria-label="Alejar">−</button>
                        <button type="button" data-zoom="acercar" aria-label="Acercar">+</button>
                        <button type="button" data-zoom="normal" aria-label="Volver al tamaño normal">1×</button>
                    </div>
                </div>
                <div class="ma-subtitulo" part="subtitulo" aria-live="off"></div>
                <div class="ma-controles" role="group" aria-label="Controles de la animación"></div>
                <div class="ma-oculto" id="ma-titulo"></div>
                <div class="ma-oculto" id="ma-descripcion"></div>
            </div>`;
        this._raiz = /** @type {HTMLElement} */ (sombra.querySelector('.ma-raiz'));
        this._lienzo = /** @type {HTMLElement} */ (sombra.querySelector('.ma-lienzo'));
        this._svg = /** @type {SVGSVGElement} */ (sombra.querySelector('svg'));
        this._subtitulo = /** @type {HTMLElement} */ (sombra.querySelector('.ma-subtitulo'));
        this._titulo = /** @type {HTMLElement} */ (sombra.querySelector('#ma-titulo'));
        this._descripcion = /** @type {HTMLElement} */ (sombra.querySelector('#ma-descripcion'));
        this._controles = /** @type {HTMLElement} */ (sombra.querySelector('.ma-controles'));

        this._definicion = null;
        this._compilada = null;
        this._pintor = null;
        this._disposicion = null;
        this._pausadoPorOcultar = false;
        this._limpiar = [];

        this._reloj = new Reloj({
            duracion: 0,
            alCambiar: (t) => this._pintar(t),
            alCambiarEstado: (corriendo) => {
                this._barra.corriendo(corriendo);
                this._actualizarVista();
            },
            alParar: (t) => this._alParar(t),
        });
        this._barra = crearBarra(this._controles, {
            alternar: () => this._alternarPorUsuario(),
            anterior: () => this.capituloAnterior(),
            siguiente: () => this.capituloSiguiente(),
            irA: (t) => this.irA(t),
            velocidad: (v) => this._cambiarVelocidad(v),
            subtitulos: (prendidos) => this._subtitulos(prendidos),
            pantalla: () => this._pantallaCompleta(),
        });
        this._lienzo.addEventListener('keydown', (e) => this._tecla(e));
        this._lienzo.addEventListener('click', () => {
            // Si recién se arrastró el dibujo (con zoom), el clic no es para pausar.
            if (this._arrastro) this._arrastro = false;
            else this._alternarPorUsuario();
        });

        // ---- Zoom ----
        /** Cuánto se agranda (1 = normal) y la esquina de lo que se ve, en unidades de la escena. */
        this._zoom = { escala: 1, x: 0, y: 0 };
        this._dedos = new Map();
        this._pellizco = null;
        this._movido = 0;
        this._arrastro = false;
        const zoom = /** @type {HTMLElement} */ (sombra.querySelector('.ma-zoom'));
        zoom.addEventListener('click', (e) => {
            e.stopPropagation();
            const boton = /** @type {HTMLElement} */ (e.target).closest('button');
            if (boton) this._accionZoom(boton.dataset.zoom);
        });
        zoom.addEventListener('pointerdown', (e) => e.stopPropagation());
        this._lienzo.addEventListener('wheel', (e) => this._rueda(e), { passive: false });
        this._lienzo.addEventListener('pointerdown', (e) => this._dedoAbajo(e));
        this._lienzo.addEventListener('pointermove', (e) => this._dedoMueve(e));
        for (const fin of ['pointerup', 'pointercancel']) this._lienzo.addEventListener(fin, (e) => this._dedoArriba(e));

        // ---- Los controles que se esconden ----
        this._vista = { dentro: false, reciente: false, sobreControles: false, foco: false, tactil: false, tocado: false };
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        this._temporizador = undefined;
        const moverse = (e) => {
            if (e.pointerType) this._vista.tactil = e.pointerType === 'touch';
            this._vista.tocado = true;
            this._vista.reciente = true;
            clearTimeout(this._temporizador);
            this._temporizador = setTimeout(() => {
                this._vista.reciente = false;
                this._actualizarVista();
            }, 2500);
            this._actualizarVista();
        };
        this.addEventListener('pointermove', moverse);
        this.addEventListener('pointerdown', moverse);
        this._lienzo.addEventListener('keydown', moverse);
        this.addEventListener('pointerenter', () => {
            this._vista.dentro = true;
            this._actualizarVista();
        });
        this.addEventListener('pointerleave', (e) => {
            if (e.pointerType === 'mouse') this._vista.dentro = false;
            this._actualizarVista();
        });
        this._controles.addEventListener('pointerenter', () => {
            this._vista.sobreControles = true;
            this._actualizarVista();
        });
        this._controles.addEventListener('pointerleave', () => {
            this._vista.sobreControles = false;
            this._actualizarVista();
        });
        sombra.addEventListener('focusin', () => this._mirarFoco());
        sombra.addEventListener('focusout', () => queueMicrotask(() => this._mirarFoco()));
        // Lo que tapan los controles cuando flotan, para que lo de abajo (una
        // pregunta de la lección, el subtítulo) se corra hacia arriba.
        new ResizeObserver(() => {
            this._raiz.style.setProperty('--ma-alto-controles', `${this._controles.offsetHeight}px`);
        }).observe(this._controles);
    }

    // ---------------- API ----------------

    /** La definición de la escena (un objeto, o una función de la disposición). */
    get escena() {
        return this._definicion;
    }
    set escena(definicion) {
        if (definicion !== this._definicion) this._zoom = { escala: 1, x: 0, y: 0 };
        this._definicion = definicion;
        this._disposicion = null;
        this._armar();
    }

    /** La escena ya compilada: lo que usan los tests y el render a video. */
    get compilada() {
        return this._compilada;
    }
    get t() {
        return this._reloj.t;
    }
    get duracion() {
        return this._reloj.duracion;
    }
    get corriendo() {
        return this._reloj.corriendo;
    }
    reproducir() {
        this._pausadoPorOcultar = false;
        this._reloj.reproducir();
    }
    pausar() {
        this._pausadoPorOcultar = false;
        this._reloj.pausar();
    }
    /** Salta a un instante y lo dibuja en el momento, sin esperar un cuadro. */
    irA(t) {
        this._reloj.irA(t);
    }
    capituloSiguiente() {
        const caps = this._compilada?.capitulos ?? [];
        const proximo = caps.find((c) => c.t > this.t + 0.05);
        this.irA(proximo ? proximo.t : this.duracion);
    }
    capituloAnterior() {
        const caps = this._compilada?.capitulos ?? [];
        // Como en cualquier reproductor: si ya pasó un poco del principio del
        // capítulo, vuelve a su principio; si recién empieza, va al anterior.
        const actuales = caps.filter((c) => c.t <= this.t - 1);
        this.irA(actuales.length ? actuales[actuales.length - 1].t : 0);
    }

    // ---------------- Ciclo de vida ----------------

    connectedCallback() {
        const medios = [
            matchMedia('(prefers-reduced-motion: reduce)'),
            matchMedia('(prefers-color-scheme: dark)'),
        ];
        for (const m of medios) this._escuchar(m, 'change', () => this._armar());

        // Starlight (y muchos sitios) dicen el tema en <html data-theme>. Si el
        // usuario lo cambia con el botón del sitio, la escena lo sigue.
        const observador = new MutationObserver(() => this._aplicarTema());
        observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tema', 'class'] });
        this._limpiar.push(() => observador.disconnect());

        const medidor = new ResizeObserver(() => {
            if (this._disposicion !== this._calcularDisposicion().nombre) this._armar();
        });
        medidor.observe(this);
        this._limpiar.push(() => medidor.disconnect());

        // Fuera de la vista no tiene sentido gastar la compu dibujando. Al
        // volver, sigue desde donde estaba.
        const visor = new IntersectionObserver(([entrada]) => this._visible(entrada.isIntersecting));
        visor.observe(this);
        this._limpiar.push(() => visor.disconnect());
        this._escuchar(document, 'visibilitychange', () => this._visible(!document.hidden));

        this._escuchar(this, 'fullscreenchange', () => this._armar());
        this._escuchar(matchMedia('(hover: hover) and (pointer: fine)'), 'change', () => this._actualizarVista());

        this._aplicarAtributos();
        if (!this._definicion) this._buscarEscena();
        else this._armar();
    }

    disconnectedCallback() {
        this._reloj.pausar();
        for (const f of this._limpiar) f();
        this._limpiar = [];
    }

    attributeChangedCallback(nombre, viejo, nuevo) {
        if (!this.isConnected) return;
        if (nombre === 'escena') this._buscarEscena();
        else if (nombre === 'movimiento' || nombre === 'tema' || nombre === 'pantalla') this._armar();
        else this._aplicarAtributos();
    }

    // ---------------- Para las capas de arriba ----------------
    // Una capa que extiende el componente (la pedagógica) los redefine. Acá
    // no hacen nada: el componente común no sabe de preguntas ni de pasos.

    /** Cada vez que la escena se arma (o se rearma por la disposición). */
    _alArmar(compilada) {}

    /** Cuando el reloj se frena solo en una de sus paradas. */
    _alParar(t) {}

    /** Cada vez que se dibuja un instante. */
    _alPintar(estado) {}

    /**
     * Marcas propias para la barra de tiempo, además de las de los capítulos.
     * @returns {{ t: number, clase: string, texto?: string }[]}
     */
    _marcasDeLaBarra(compilada) {
        return [];
    }

    // ---------------- Por dentro ----------------

    _escuchar(objetivo, evento, f) {
        objetivo.addEventListener(evento, f);
        this._limpiar.push(() => objetivo.removeEventListener(evento, f));
    }

    _buscarEscena() {
        const nombre = this.getAttribute('escena');
        if (!nombre) return;
        if (registro.has(nombre)) {
            this.escena = registro.get(nombre);
        } else {
            // Todavía no se registró (el script de la escena puede venir después).
            if (!esperando.has(nombre)) esperando.set(nombre, new Set());
            esperando.get(nombre).add(this);
        }
    }

    _aplicarAtributos() {
        this._reloj.loop = this.hasAttribute('loop');
        const v = Number(this.getAttribute('velocidad'));
        if (v > 0) this._cambiarVelocidad(v);
        this._raiz.classList.toggle('sin-controles', this.hasAttribute('sin-controles'));
        this._subtitulos(!this.hasAttribute('sin-subtitulos'));
        this._actualizarVista();
    }

    _calcularDisposicion() {
        const caja = this.getBoundingClientRect();
        const ancho = caja.width || ANCHO_ANGOSTO;
        const alto = caja.height || 0;
        // En pantalla completa manda la forma de la pantalla: un celular parado
        // es angosto aunque tenga muchos pixeles.
        const llena = this._llena();
        const angosta = llena ? alto > ancho : ancho < ANCHO_ANGOSTO;
        const media = !llena && !angosta && ancho < ANCHO_MEDIO;
        return { nombre: angosta ? 'angosta' : media ? 'media' : 'ancha', ancho, alto };
    }

    _llena() {
        return this.hasAttribute('pantalla') || document.fullscreenElement === this;
    }

    _movimiento() {
        const forzado = this.getAttribute('movimiento');
        if (forzado === 'reducido' || forzado === 'completo') return forzado;
        return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reducido' : 'completo';
    }

    _aplicarTema() {
        let tema = this.getAttribute('tema');
        if (tema !== 'claro' && tema !== 'oscuro') {
            const html = document.documentElement;
            const delSitio = html.dataset.theme ?? html.dataset.tema;
            if (delSitio === 'dark' || delSitio === 'oscuro') tema = 'oscuro';
            else if (delSitio === 'light' || delSitio === 'claro') tema = 'claro';
            else if (html.classList.contains('dark')) tema = 'oscuro';
            else tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
        }
        this._raiz.dataset.tema = tema;
    }

    _armar() {
        this._aplicarTema();
        if (!this._definicion || !this.isConnected) return;
        const disposicion = this._calcularDisposicion();
        let compilada;
        try {
            compilada = compilar(this._definicion, { movimiento: this._movimiento(), disposicion });
        } catch (error) {
            this._mostrarError(error);
            return;
        }
        this._compilada = compilada;
        this._disposicion = disposicion.nombre;
        this._pintor = crearPintor(this._svg, compilada);
        this._encuadre();
        this._aplicarZoom();
        this._actualizarVista();
        this._reloj.duracion = compilada.duracion;

        this._titulo.textContent = compilada.titulo || 'Animación';
        this._descripcion.textContent = textoAlternativo(compilada);
        this._barra.configurar(compilada, this._marcasDeLaBarra(compilada));

        this._alArmar(compilada);

        const yaEstaba = this._yaArrancado;
        this._yaArrancado = true;
        this._reloj.irA(Math.min(this._reloj.t, compilada.duracion));
        if (!yaEstaba && this.hasAttribute('autoplay')) this._reloj.reproducir();
    }

    _pintar(t) {
        if (!this._compilada) return;
        const estado = this._compilada.estado(t);
        try {
            this._pintor.pintar(estado);
        } catch (error) {
            this._reloj.pausar();
            this._mostrarError(error);
            return;
        }
        this._barra.mostrar(estado);
        if (this._subtitulo.textContent !== estado.subtitulo) this._subtitulo.textContent = estado.subtitulo;
        this._alPintar(estado);
    }

    // El error se muestra EN la escena y en la consola: quien está armando una
    // escena en una página suelta muchas veces no tiene la consola abierta.
    _mostrarError(error) {
        console.error(error);
        this._subtitulo.textContent = `⚠️ ${error.message}`;
        this._raiz.classList.add('con-subtitulos');
    }

    _alternarPorUsuario() {
        // Los subtítulos se leen en voz alta recién cuando alguien eligió
        // reproducir. Si la escena arranca sola y en loop (la Expo), un lector
        // de pantalla los repetiría para siempre.
        this._subtitulo.setAttribute('aria-live', 'polite');
        this._pausadoPorOcultar = false;
        this._reloj.alternar();
    }

    _cambiarVelocidad(v) {
        this._reloj.cambiarVelocidad(v);
        this._barra.velocidad(v);
    }

    _subtitulos(prendidos) {
        this._raiz.classList.toggle('con-subtitulos', prendidos);
        this._barra.subtitulos(prendidos);
        this._encuadre();
    }

    // En pantalla completa y con subtítulos, el dibujo se pega arriba: lo que
    // sobra de alto queda abajo, donde va el subtítulo. Si no, va centrado.
    _encuadre() {
        if (!this._compilada) return;
        const arriba = this._llena() && this._raiz.classList.contains('con-subtitulos');
        this._svg.setAttribute('preserveAspectRatio', arriba ? 'xMidYMin meet' : 'xMidYMid meet');
    }

    // ---------------- Los controles que se esconden ----------------

    _mirarFoco() {
        const activo = /** @type {HTMLElement | null} */ (this.shadowRoot.activeElement);
        this._vista.foco = !!activo && !!activo.closest('.ma-controles, .ma-zoom');
        this._actualizarVista();
    }

    _actualizarVista() {
        if (!this.isConnected) return;
        const llena = this._llena();
        const flotantes = !this.hasAttribute('sin-controles') && (llena
            || (!this.hasAttribute('controles-fijos') && matchMedia('(hover: hover) and (pointer: fine)').matches));
        const v = this._vista;
        // Se ven si alguien los está usando o se acaba de mover; y, con la
        // animación en pausa, mientras el mouse esté encima (o si nadie pasó
        // todavía por acá: que se sepa que hay controles).
        const ver = v.foco || v.sobreControles || v.reciente
            || (!this._reloj.corriendo && (v.dentro || v.tactil || !v.tocado));
        this._raiz.classList.toggle('flotantes', flotantes);
        this._raiz.classList.toggle('ver-controles', ver);
        this._raiz.classList.toggle('sin-cursor', llena && !ver);
    }

    // ---------------- Zoom ----------------

    _accionZoom(accion) {
        if (accion === 'acercar') this._zoomEn(1.5);
        else if (accion === 'alejar') this._zoomEn(1 / 1.5);
        else this._zoomEn(0);
    }

    /**
     * Agranda (factor > 1) o achica la vista, dejando quieto el punto de la
     * escena que está debajo de (clienteX, clienteY); sin punto, el centro de
     * lo que se ve. Con factor 0 vuelve al tamaño normal.
     * @param {number} factor
     * @param {number} [clienteX]
     * @param {number} [clienteY]
     */
    _zoomEn(factor, clienteX, clienteY) {
        const c = this._compilada;
        if (!c) return;
        const z = this._zoom;
        const escala = factor === 0 ? 1 : Math.min(8, Math.max(1, z.escala * factor));
        let px = z.x + c.ancho / z.escala / 2;
        let py = z.y + c.alto / z.escala / 2;
        if (clienteX != null) {
            const p = this._aEscena(clienteX, clienteY);
            if (p) [px, py] = [p.x, p.y];
        }
        const k = z.escala / escala;
        this._zoom = { escala, x: px - (px - z.x) * k, y: py - (py - z.y) * k };
        this._aplicarZoom();
    }

    /** De un punto de la pantalla a coordenadas de la escena (con el zoom de ahora). */
    _aEscena(clienteX, clienteY) {
        const m = this._svg.getScreenCTM();
        if (!m) return null;
        const p = new DOMPoint(clienteX, clienteY).matrixTransform(m.inverse());
        return { x: p.x, y: p.y };
    }

    _aplicarZoom() {
        const c = this._compilada;
        if (!c) return;
        const z = this._zoom;
        const ancho = c.ancho / z.escala;
        const alto = c.alto / z.escala;
        // Que no se pueda correr la vista afuera de la escena.
        z.x = Math.min(Math.max(z.x, 0), c.ancho - ancho);
        z.y = Math.min(Math.max(z.y, 0), c.alto - alto);
        const r = (v) => Math.round(v * 100) / 100;
        this._svg.setAttribute('viewBox', `${r(z.x)} ${r(z.y)} ${r(ancho)} ${r(alto)}`);
        this._raiz.classList.toggle('con-zoom', z.escala > 1.001);
        const normal = this.shadowRoot.querySelector('[data-zoom="normal"]');
        normal.textContent = `${String(Math.round(z.escala * 10) / 10).replace('.', ',')}×`;
    }

    _rueda(e) {
        // La rueda sola sigue bajando por la página. Con Ctrl (que es también
        // lo que manda el touchpad al pellizcar), hace zoom.
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this._zoomEn(Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    }

    _dedoAbajo(e) {
        if (/** @type {HTMLElement} */ (e.target).closest('.ma-pregunta, .ma-zoom')) return;
        this._dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this._movido = 0;
        if (this._dedos.size === 2) {
            const [a, b] = [...this._dedos.values()];
            this._pellizco = { distancia: Math.hypot(a.x - b.x, a.y - b.y), escala: this._zoom.escala };
        }
        if (this._zoom.escala > 1 || this._dedos.size === 2) this._lienzo.setPointerCapture(e.pointerId);
    }

    _dedoMueve(e) {
        const antes = this._dedos.get(e.pointerId);
        if (!antes) return;
        const ahora = { x: e.clientX, y: e.clientY };
        this._dedos.set(e.pointerId, ahora);
        if (this._dedos.size === 2 && this._pellizco) {
            const [a, b] = [...this._dedos.values()];
            const distancia = Math.hypot(a.x - b.x, a.y - b.y);
            const objetivo = this._pellizco.escala * (distancia / Math.max(this._pellizco.distancia, 1));
            this._zoomEn(objetivo / this._zoom.escala, (a.x + b.x) / 2, (a.y + b.y) / 2);
            this._arrastro = true;
            return;
        }
        if (this._zoom.escala <= 1) return;
        this._movido += Math.abs(ahora.x - antes.x) + Math.abs(ahora.y - antes.y);
        if (this._movido < 5) return;
        // Arrastrar: lo que se movió el dedo, pasado a unidades de la escena.
        const m = this._svg.getScreenCTM();
        if (!m) return;
        this._zoom.x -= (ahora.x - antes.x) / m.a;
        this._zoom.y -= (ahora.y - antes.y) / m.d;
        this._aplicarZoom();
        this._arrastro = true;
        this._raiz.classList.add('arrastrando');
    }

    _dedoArriba(e) {
        this._dedos.delete(e.pointerId);
        if (this._dedos.size < 2) this._pellizco = null;
        this._raiz.classList.remove('arrastrando');
        // El clic llega justo después del pointerup: hasta entonces queda
        // marcado que se arrastró, para que ese clic no pause.
        if (this._arrastro) setTimeout(() => { this._arrastro = false; }, 0);
    }

    _pantallaCompleta() {
        if (document.fullscreenElement === this) document.exitFullscreen();
        else this.requestFullscreen?.().catch(() => {});
    }

    _visible(si) {
        if (!si && this._reloj.corriendo) {
            this._reloj.pausar();
            this._pausadoPorOcultar = true;
        } else if (si && this._pausadoPorOcultar) {
            this._pausadoPorOcultar = false;
            this._reloj.reproducir();
        }
    }

    _tecla(e) {
        const paso = 1 / 30;
        const acciones = {
            ' ': () => this._alternarPorUsuario(),
            k: () => this._alternarPorUsuario(),
            ArrowRight: () => this.capituloSiguiente(),
            ArrowLeft: () => this.capituloAnterior(),
            // Cuadro por cuadro, como en un editor de video.
            '.': () => { this.pausar(); this.irA(this.t + paso); },
            ',': () => { this.pausar(); this.irA(this.t - paso); },
            Home: () => this.irA(0),
            End: () => this.irA(this.duracion),
            '+': () => this._zoomEn(1.5),
            '=': () => this._zoomEn(1.5),
            '-': () => this._zoomEn(1 / 1.5),
            0: () => this._zoomEn(0),
        };
        const accion = acciones[e.key];
        if (!accion) return;
        e.preventDefault();
        accion();
    }
}

// Lo que reemplaza al dibujo para quien no lo ve: el título, la descripción,
// los capítulos y todo lo que dicen los subtítulos, en orden.
function textoAlternativo(escena) {
    const partes = [];
    if (escena.descripcion) partes.push(escena.descripcion);
    if (escena.capitulos.length) {
        partes.push(`Capítulos: ${escena.capitulos.map((c, i) => `${i + 1}. ${c.nombre}`).join('; ')}.`);
    }
    if (escena.subtitulos.length) {
        partes.push(`Lo que se cuenta: ${escena.subtitulos.map((s) => s.texto).join(' ')}`);
    }
    return partes.join(' ');
}

export function definirComponente(nombre = 'motor-escena') {
    if (typeof customElements === 'undefined' || customElements.get(nombre)) return;
    customElements.define(nombre, MotorEscena);
}

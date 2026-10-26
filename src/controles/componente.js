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

export class MotorEscena extends Base {
    static observedAttributes = ['escena', 'tema', 'movimiento', 'velocidad', 'loop', 'sin-controles', 'sin-subtitulos'];

    constructor() {
        super();
        const sombra = this.attachShadow({ mode: 'open' });
        sombra.innerHTML = `
            <style>${ESTILOS}</style>
            <div class="ma-raiz con-subtitulos" part="raiz">
                <div class="ma-lienzo" tabindex="0">
                    <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ma-titulo" aria-describedby="ma-descripcion"></svg>
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

        this._definicion = null;
        this._compilada = null;
        this._pintor = null;
        this._disposicion = null;
        this._pausadoPorOcultar = false;
        this._limpiar = [];

        this._reloj = new Reloj({
            duracion: 0,
            alCambiar: (t) => this._pintar(t),
            alCambiarEstado: (corriendo) => this._barra.corriendo(corriendo),
            alParar: (t) => this._alParar(t),
        });
        this._barra = crearBarra(/** @type {HTMLElement} */ (sombra.querySelector('.ma-controles')), {
            alternar: () => this._alternarPorUsuario(),
            anterior: () => this.capituloAnterior(),
            siguiente: () => this.capituloSiguiente(),
            irA: (t) => this.irA(t),
            velocidad: (v) => this._cambiarVelocidad(v),
            subtitulos: (prendidos) => this._subtitulos(prendidos),
            pantalla: () => this._pantallaCompleta(),
        });
        this._lienzo.addEventListener('keydown', (e) => this._tecla(e));
        this._lienzo.addEventListener('click', () => this._alternarPorUsuario());
    }

    // ---------------- API ----------------

    /** La definición de la escena (un objeto, o una función de la disposición). */
    get escena() {
        return this._definicion;
    }
    set escena(definicion) {
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
        else if (nombre === 'movimiento' || nombre === 'tema') this._armar();
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
    }

    _calcularDisposicion() {
        const caja = this.getBoundingClientRect();
        const ancho = caja.width || ANCHO_ANGOSTO;
        const alto = caja.height || 0;
        // En pantalla completa manda la forma de la pantalla: un celular parado
        // es angosto aunque tenga muchos pixeles.
        const llena = this.hasAttribute('pantalla') || document.fullscreenElement === this;
        const angosta = llena ? alto > ancho : ancho < ANCHO_ANGOSTO;
        return { nombre: angosta ? 'angosta' : 'ancha', ancho, alto };
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
        this._reloj.duracion = compilada.duracion;

        this._titulo.textContent = compilada.titulo || 'Animación';
        this._descripcion.textContent = textoAlternativo(compilada);
        this._barra.configurar(compilada);

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

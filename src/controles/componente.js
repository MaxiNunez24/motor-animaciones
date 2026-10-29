import { compilar } from '../nucleo/linea.js';
import { Reloj } from '../nucleo/reloj.js';
import { crearPintor } from '../pintor/pintor.js';
import { crearBarra } from './barra.js';
import { ESTILOS } from './estilos.js';
import { palabrasDe } from '../nucleo/palabras.js';
import { resolverEstilo, cargarEstilo, esArchivo, cssDelEstilo, subtitulosDelEstilo, cargarFuentes, estiloPorDefecto } from '../estilos/index.js';
import { crearReproductor } from '../sonido/reproductor.js';

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
//   estilo="neon"          el arte: un estilo registrado, o un archivo .json
//                          (sin él, el de Motor.usarEstilo(), o el sobrio)
//   sin-sonido             arranca en silencio (si la escena tiene sonidos)
//   sin-lupa               sin el botón de la lupa
//   movimiento="reducido|completo"   sin él, respeta prefers-reduced-motion
//   sin-controles          para una pantalla que solo muestra (la Expo)
//   sin-subtitulos         arrancan apagados
//   pantalla               ocupa toda la ventana
//   controles-fijos        los controles van siempre abajo del dibujo, sin
//                          esconderse (si no, con mouse flotan y se esconden
//                          mientras la animación corre)
//
// Zoom: los botones + y − que aparecen arriba a la derecha, las teclas + − 0,
// pellizcar la pantalla, y en pantalla completa la rueda (en la página, la
// rueda es de la página). Con zoom, arrastrar
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
// Cuánto tienen que quedarse quietos el mouse o el dedo para que los controles
// (y, en pantalla completa, el mouse) se escondan.
const ESPERA_CONTROLES = 1800;

export class MotorEscena extends Base {
    static observedAttributes = ['escena', 'tema', 'estilo', 'movimiento', 'velocidad', 'loop', 'sin-controles', 'sin-subtitulos', 'sin-sonido', 'controles-fijos', 'pantalla'];

    constructor() {
        super();
        const sombra = this.attachShadow({ mode: 'open' });
        sombra.innerHTML = `
            <style>${ESTILOS}</style>
            <style class="ma-css-estilo"></style>
            <div class="ma-raiz con-subtitulos" part="raiz">
                <div class="ma-lienzo" tabindex="0">
                    <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ma-titulo" aria-describedby="ma-descripcion"></svg>
                    <div class="ma-zoom" role="group" aria-label="Zoom">
                        <!-- El de volver va primero: la botonera está pegada a la
                             derecha, así que al aparecer (o al pasar de 1,5× a 2×)
                             crece hacia la izquierda y no corre al − ni al +. -->
                        <button type="button" data-zoom="lugar" aria-label="Volver a su lugar lo que se movió" title="Volver a su lugar">↺</button>
                        <button type="button" data-zoom="lupa-forma" aria-label="Forma de la lupa: redonda" title="Forma de la lupa">○</button>
                        <button type="button" data-zoom="lupa-zoom" aria-label="Aumento de la lupa: 2 veces" title="Aumento de la lupa">2×</button>
                        <button type="button" data-zoom="lupa" aria-pressed="false" aria-label="Lupa" title="Lupa"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M14.5 14.5 20 20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
                        <button type="button" data-zoom="normal" aria-label="Volver al tamaño normal">1×</button>
                        <button type="button" data-zoom="alejar" aria-label="Alejar">−</button>
                        <button type="button" data-zoom="acercar" aria-label="Acercar">+</button>
                    </div>
                </div>
                <div class="ma-subtitulo" part="subtitulo" aria-live="off"></div>
                <!-- El hilo: lo que queda de la barra cuando los controles se
                     esconden. Dice por dónde va y dónde están los capítulos y
                     las preguntas, sin tapar el dibujo. -->
                <div class="ma-hilo" aria-hidden="true"><div class="ma-hilo-avance"></div><div class="ma-hilo-marcas"></div></div>
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
        this._hilo = /** @type {HTMLElement} */ (sombra.querySelector('.ma-hilo'));
        this._cssEstilo = /** @type {HTMLStyleElement} */ (sombra.querySelector('.ma-css-estilo'));

        /** El estilo puesto desde JavaScript (elemento.estilo = {...}); si no, manda el atributo. */
        this._estiloPropio = null;
        /** @type {Record<string, any>} */
        this._estilo = {};
        this._subs = subtitulosDelEstilo({});
        /** Los subtítulos de reel: el que se está mostrando, partido en palabras. */
        this._reel = { indice: -1, palabras: [], nodos: [], grupo: -1 };
        this._sonido = crearReproductor();
        this._sonidoPrendido = !this.hasAttribute('sin-sonido');
        // Dónde estaba el reloj en el cuadro anterior: suena lo que quedó en el medio.
        this._tAnterior = 0;

        this._definicion = null;
        this._compilada = null;
        this._pintor = null;
        // Cuánto corrió quien mira cada pieza arrastrable (un espejo). Es de
        // la vista, como el zoom: sobrevive a rearmar la escena al cambiar de tamaño.
        /** @type {Record<string, { x: number, y: number }>} */
        this._arrastres = {};
        /** @type {{ id: string, pointerId: number, x: number, y: number } | null} */
        this._agarrada = null;
        /**
         * La lupa de quien mira, en coordenadas de la escena. Es de la vista,
         * como el zoom: sobrevive a rearmar y no sale en un video. Sus valores
         * de partida los puede traer la escena (lupa: {...}) o el estilo.
         * @type {{ activa: boolean, x: number, y: number, ancho: number, alto: number, forma: 'circulo' | 'rect', zoom: number } | null}
         */
        this._lupa = null;
        this._disposicion = null;
        this._pausadoPorOcultar = false;
        this._limpiar = [];

        this._reloj = new Reloj({
            duracion: 0,
            alCambiar: (t) => this._pintar(t),
            alCambiarEstado: (corriendo) => {
                this._barra.corriendo(corriendo);
                if (!corriendo) this._sonido.callar();
                this._actualizarVista();
            },
            alParar: (t) => this._alParar(t),
        });
        this._barra = crearBarra(this._controles, {
            hilo: this._hilo,
            alternar: () => this._alternarPorUsuario(),
            anterior: () => this.capituloAnterior(),
            siguiente: () => this.capituloSiguiente(),
            irA: (t) => this.irA(t),
            velocidad: (v) => this._cambiarVelocidad(v),
            subtitulos: (prendidos) => this._subtitulos(prendidos),
            sonido: (prendido) => this._prenderSonido(prendido),
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
        // Doble clic (o doble toque) sobre algo que se corrió: vuelve a su lugar.
        this._lienzo.addEventListener('dblclick', (e) => {
            const agarrable = /** @type {Element} */ (e.target).closest('[data-arrastrable]');
            if (agarrable) this._volverAlLugar(agarrable.getAttribute('data-arrastrable'));
        });
        this._lienzo.addEventListener('pointermove', (e) => this._dedoMueve(e));
        for (const fin of ['pointerup', 'pointercancel']) this._lienzo.addEventListener(fin, (e) => this._dedoArriba(e));

        // ---- Los controles que se esconden ----
        // `pregunta`: <motor-leccion> la prende mientras muestra una pregunta.
        this._vista = { dentro: false, reciente: false, sobreControles: false, foco: false, tactil: false, tocado: false, pregunta: false };
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        this._temporizador = undefined;
        // En una pantalla sin controles (la Expo) nadie maneja la escena: el
        // mouse no vuelve con cualquier roce (alguien mueve la mesa), sino con
        // una sacudida, cuando alguien lo quiere encontrar.
        this._sacudida = { desde: 0, recorrido: 0, x: 0, y: 0 };
        const moverse = (e) => {
            if (e.type === 'pointermove' && this.hasAttribute('sin-controles') && !this._sacudio(e)) return;
            if (e.pointerType) this._vista.tactil = e.pointerType === 'touch';
            this._vista.tocado = true;
            this._vista.reciente = true;
            clearTimeout(this._temporizador);
            this._temporizador = setTimeout(() => {
                this._vista.reciente = false;
                this._actualizarVista();
            }, ESPERA_CONTROLES);
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
            // El mouse se fue: los controles se van con él, sin esperar.
            if (e.pointerType === 'mouse') {
                this._vista.dentro = false;
                this._vista.reciente = false;
                this._vista.sobreControles = false;
                clearTimeout(this._temporizador);
            }
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

    /**
     * El estilo: un nombre ('neon'), un estilo hecho objeto, o null para
     * volver al del atributo.
     */
    get estilo() {
        return this._estiloPropio ?? this.getAttribute('estilo');
    }
    set estilo(valor) {
        this._estiloPropio = valor ?? null;
        this._armar();
    }

    /** El estilo con todo lo que hereda, ya resuelto. Lo usa el render a video. */
    get estiloResuelto() {
        return this._estilo;
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

        this._escuchar(this, 'fullscreenchange', () => {
            // Al entrar en pantalla completa, los controles se esconden ya:
            // el clic que la pidió no cuenta como "se está moviendo", y el
            // botón que quedó con el foco tampoco los retiene.
            if (document.fullscreenElement === this) this._entrarEnPantalla();
            this._armar();
        });
        // Motor.usarEstilo() cambia el de todas las que no eligieron uno.
        this._escuchar(document, 'motor-estilo', () => { if (!this._estiloPropio && !this.hasAttribute('estilo')) this._armar(); });
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
        else if (nombre === 'pantalla') {
            if (this.hasAttribute('pantalla')) this._entrarEnPantalla();
            this._armar();
        } else if (nombre === 'movimiento' || nombre === 'tema' || nombre === 'estilo') this._armar();
        else if (nombre === 'sin-sonido') this._prenderSonido(!this.hasAttribute('sin-sonido'));
        else this._aplicarAtributos();
    }

    // ---------------- Para las capas de arriba ----------------
    // Una capa que extiende el componente (la pedagógica) los redefine. Acá
    // no hacen nada: el componente común no sabe de preguntas ni de pasos.

    /** Si los controles van fijos abajo del dibujo (fuera de la pantalla completa). */
    _controlesFijos() {
        return this.hasAttribute('controles-fijos');
    }

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

    // El estilo que corresponde: el de JavaScript, el del atributo o el de la
    // página. Si es un archivo que todavía no llegó, lo pide y rearma después.
    _buscarEstilo() {
        const pedido = this._estiloPropio ?? this.getAttribute('estilo') ?? estiloPorDefecto();
        if (typeof pedido === 'string' && esArchivo(pedido)) {
            const url = new URL(pedido, document.baseURI).href;
            try {
                return resolverEstilo(url);
            } catch {
                if (this._esperandoEstilo !== url) {
                    this._esperandoEstilo = url;
                    cargarEstilo(url).then(() => this._armar(), (e) => this._mostrarError(e));
                }
                return null;
            }
        }
        return resolverEstilo(pedido);
    }

    _aplicarEstilo(estilo) {
        this._estilo = estilo;
        cargarFuentes(estilo);
        this._cssEstilo.textContent = cssDelEstilo(estilo);
        this._raiz.toggleAttribute('data-estilo', Object.keys(estilo).length > 0);
        this._subs = subtitulosDelEstilo(estilo);
        this._raiz.classList.toggle('subs-reel', this._subs.modo === 'reel');
        this._raiz.dataset.subPosicion = this._subs.posicion;
        this._raiz.dataset.subCaja = this._subs.caja;
        this._reel.indice = -1;
        this._subtitulo.textContent = '';
        this._sonido.configurar(estilo.sonidos ?? {});
    }

    _armar() {
        this._aplicarTema();
        if (!this._definicion || !this.isConnected) return;
        let estilo;
        try {
            estilo = this._buscarEstilo();
        } catch (error) {
            this._mostrarError(error);
            return;
        }
        // Un estilo en un archivo que todavía no llegó: se arma cuando llegue.
        if (!estilo) return;
        this._aplicarEstilo(estilo);
        const disposicion = this._calcularDisposicion();
        let compilada;
        try {
            compilada = compilar(this._definicion, { movimiento: this._movimiento(), disposicion, estilo });
        } catch (error) {
            this._mostrarError(error);
            return;
        }
        this._compilada = compilada;
        this._disposicion = disposicion.nombre;
        this._pintor = crearPintor(this._svg, compilada, { arrastres: this._arrastres, estilo });
        this._prepararLupa(compilada, estilo);
        const conSonido = compilada.sonidos.length > 0 || !!compilada.musica;
        this._raiz.classList.toggle('con-sonidos', conSonido);
        // Una escena sin subtítulos no necesita su renglón ni el botón CC.
        this._raiz.classList.toggle('sin-textos', compilada.subtitulos.length === 0);
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
        if (this._subs.modo === 'reel') this._subtituloReel(estado);
        else if (this._subtitulo.textContent !== estado.subtitulo) this._subtitulo.textContent = estado.subtitulo;
        this._sonar(estado.t);
        this._alPintar(estado);
    }

    // Los subtítulos de reel: grandes, de a pocas palabras, y la que se está
    // diciendo, resaltada. Para un lector de pantalla va el texto entero, una
    // vez, en un renglón escondido; las palabras sueltas no se leen.
    _subtituloReel(estado) {
        const r = this._reel;
        if (estado.subtituloIndice !== r.indice) {
            r.indice = estado.subtituloIndice;
            r.grupo = -1;
            const s = this._compilada.subtitulos[r.indice];
            r.palabras = s ? palabrasDe(s.texto, s.desde, s.hasta, { ritmo: this._subs.ritmo, porGrupo: this._subs.palabras }) : [];
            this._subtitulo.replaceChildren();
            if (s) {
                const leido = document.createElement('span');
                leido.className = 'ma-oculto';
                leido.textContent = s.texto;
                const visto = document.createElement('span');
                visto.className = 'ma-reel';
                visto.setAttribute('aria-hidden', 'true');
                r.nodos = r.palabras.map((p) => {
                    const n = document.createElement('span');
                    n.className = 'ma-palabra';
                    n.textContent = p.texto;
                    visto.append(n, ' ');
                    return n;
                });
                this._subtitulo.append(leido, visto);
            } else r.nodos = [];
        }
        if (!r.palabras.length) return;
        // La palabra de ahora: la última que ya empezó (antes de la primera, la primera).
        let actual = 0;
        r.palabras.forEach((p, k) => { if (p.desde <= estado.t) actual = k; });
        const grupo = r.palabras[actual].grupo;
        r.palabras.forEach((p, k) => {
            const n = r.nodos[k];
            const visible = this._subs.palabras === 0 || p.grupo === grupo;
            n.hidden = !visible;
            n.classList.toggle('dicha', p.desde <= estado.t);
            n.classList.toggle('actual', k === actual && p.desde <= estado.t);
        });
        // Cada grupo nuevo entra con un saltito (la animación es de CSS y se
        // reinicia al cambiar el atributo).
        if (grupo !== r.grupo) {
            r.grupo = grupo;
            const visto = this._subtitulo.querySelector('.ma-reel');
            if (visto) visto.setAttribute('data-grupo', String(grupo % 2));
        }
    }

    // Suena lo que quedó entre el cuadro anterior y este, solo si el reloj
    // venía corriendo hacia adelante. Un salto (la barra, un capítulo) no suena.
    _sonar(t) {
        const antes = this._tAnterior;
        this._tAnterior = t;
        const c = this._compilada;
        if (!c || !this._sonidoPrendido || !this._reloj.corriendo || this.hasAttribute('video')) return;
        if (c.musica) this._sonido.musica(c.musica, t, true);
        if (!(t > antes) || t - antes > 0.5) return;
        for (const s of c.sonidos) if (s.t > antes && s.t <= t) this._sonido.tocar(s);
    }

    _prenderSonido(prendido) {
        this._sonidoPrendido = prendido;
        this._barra.sonido(prendido);
        if (!prendido) this._sonido.callar();
    }

    // El error se muestra EN la escena y en la consola: quien está armando una
    // escena en una página suelta muchas veces no tiene la consola abierta.
    _mostrarError(error) {
        console.error(error);
        this._subtitulo.textContent = `⚠️ ${error.message}`;
        this._raiz.classList.add('con-subtitulos');
    }

    _alternarPorUsuario() {
        // Alguien tocó: desde ahora el navegador deja sonar.
        if (this._compilada?.sonidos.length) this._sonido.precargar(this._compilada.sonidos);
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

    // El foco retiene los controles solo si llegó con el teclado: quien
    // navega con Tab tiene que verlos. Un botón que quedó con el foco
    // porque se lo clickeó no es razón para dejarlos tapando el dibujo.
    _mirarFoco() {
        const activo = /** @type {HTMLElement | null} */ (this.shadowRoot.activeElement);
        this._vista.foco = !!activo && !!activo.closest('.ma-controles, .ma-zoom') && activo.matches(':focus-visible');
        this._actualizarVista();
    }

    /** Si el mouse se movió lejos y rápido: más de 250 px en menos de un tercio de segundo. */
    _sacudio(e) {
        const s = this._sacudida;
        const ahora = e.timeStamp;
        if (ahora - s.desde > 330) {
            s.desde = ahora;
            s.recorrido = 0;
        } else {
            s.recorrido += Math.hypot(e.clientX - s.x, e.clientY - s.y);
        }
        s.x = e.clientX;
        s.y = e.clientY;
        return s.recorrido > 250;
    }

    _entrarEnPantalla() {
        this._vista.reciente = false;
        this._vista.sobreControles = false;
        clearTimeout(this._temporizador);
        const activo = /** @type {HTMLElement | null} */ (this.shadowRoot.activeElement);
        if (activo && !activo.matches(':focus-visible')) activo.blur();
        this._vista.foco = false;
        this._actualizarVista();
    }

    _actualizarVista() {
        if (!this.isConnected) return;
        const llena = this._llena();
        const flotantes = !this.hasAttribute('sin-controles') && (llena
            || (!this._controlesFijos() && matchMedia('(hover: hover) and (pointer: fine)').matches));
        const v = this._vista;
        // Se ven si alguien los está usando o se acaba de mover; y, en la
        // página y con la animación en pausa, mientras el mouse esté encima (o
        // si nadie pasó todavía por acá: que se sepa que hay controles). En
        // pantalla completa eso no: el mouse siempre está "encima", y en pausa
        // quedarían para siempre. Con una pregunta abierta, solo si se los
        // busca: lo que hay que mirar es la pregunta, y los controles la tapan.
        const enPausa = !llena && !this._reloj.corriendo && (v.dentro || v.tactil || !v.tocado);
        const ver = v.foco || v.sobreControles || (!v.pregunta && (v.reciente || enPausa));
        this._raiz.classList.toggle('flotantes', flotantes);
        this._raiz.classList.toggle('con-pregunta', v.pregunta);
        this._raiz.classList.toggle('ver-controles', ver);
        // En pantalla completa el mouse se esconde apenas se queda quieto,
        // corra o no la animación: en un proyector, una flecha en el medio
        // del dibujo molesta. Al moverlo, vuelve.
        this._raiz.classList.toggle('sin-cursor', llena && !v.reciente && !(v.sobreControles && flotantes) && !v.foco);
    }

    // ---------------- Zoom ----------------

    _accionZoom(accion) {
        if (accion === 'acercar') this._zoomEn(1.5);
        else if (accion === 'alejar') this._zoomEn(1 / 1.5);
        else if (accion === 'lupa') this._usarLupa(!this._lupa?.activa);
        else if (accion === 'lupa-forma') this._cambiarLupa({ forma: this._lupa.forma === 'circulo' ? 'rect' : 'circulo' });
        else if (accion === 'lupa-zoom') {
            const pasos = [1.5, 2, 3, 4];
            this._cambiarLupa({ zoom: pasos[(pasos.indexOf(this._lupa.zoom) + 1) % pasos.length] });
        } else if (accion === 'lugar') this._volverAlLugar();
        else this._zoomEn(0);
    }

    // ---------------- La lupa de quien mira ----------------

    _prepararLupa(compilada, estilo) {
        const pedida = { ...(estilo.lupa ?? {}), ...(compilada.lupa ?? {}) };
        const lado = Math.min(compilada.ancho, compilada.alto) * 0.34;
        if (!this._lupa) {
            this._lupa = {
                activa: !!pedida.activa && !this.hasAttribute('video'),
                x: pedida.x ?? compilada.ancho / 2,
                y: pedida.y ?? compilada.alto / 2,
                ancho: pedida.ancho ?? pedida.tamano ?? lado,
                alto: pedida.alto ?? pedida.tamano ?? lado,
                forma: pedida.forma === 'rect' ? 'rect' : 'circulo',
                zoom: pedida.zoom ?? 2,
            };
        }
        this._raiz.classList.toggle('sin-lupa', this.hasAttribute('sin-lupa') || pedida.boton === false);
        this._cambiarLupa({});
    }

    _usarLupa(activa) {
        if (!this._lupa) return;
        this._cambiarLupa({ activa });
    }

    _cambiarLupa(cambios) {
        const l = this._lupa;
        const c = this._compilada;
        if (!l || !c) return;
        Object.assign(l, cambios);
        // Ni más chica que un dedo ni más grande que la escena, y siempre adentro.
        const max = Math.min(c.ancho, c.alto);
        l.ancho = Math.min(Math.max(l.ancho, 60), l.forma === 'circulo' ? max : c.ancho);
        l.alto = Math.min(Math.max(l.alto, 60), l.forma === 'circulo' ? max : c.alto);
        if (l.forma === 'circulo') l.ancho = l.alto = Math.min(l.ancho, l.alto);
        l.x = Math.min(Math.max(l.x, l.ancho / 2), c.ancho - l.ancho / 2);
        l.y = Math.min(Math.max(l.y, l.alto / 2), c.alto - l.alto / 2);
        const m = this._svg.getScreenCTM();
        this._pintor?.lupa({ ...l, pixel: m && m.a > 0 ? 1 / m.a : 1 });
        this._raiz.classList.toggle('con-lupa', l.activa);
        const $ = (s) => this.shadowRoot.querySelector(s);
        $('[data-zoom="lupa"]').setAttribute('aria-pressed', String(l.activa));
        const forma = $('[data-zoom="lupa-forma"]');
        forma.textContent = l.forma === 'circulo' ? '○' : '▭';
        forma.setAttribute('aria-label', `Forma de la lupa: ${l.forma === 'circulo' ? 'redonda' : 'rectangular'}`);
        const aumento = $('[data-zoom="lupa-zoom"]');
        aumento.textContent = `${String(l.zoom).replace('.', ',')}×`;
        aumento.setAttribute('aria-label', `Aumento de la lupa: ${String(l.zoom).replace('.', ',')} veces`);
    }

    /** Vuelve a su lugar una pieza que se arrastró, o todas. */
    _volverAlLugar(id) {
        for (const k of Object.keys(this._arrastres)) if (id == null || k === id) delete this._arrastres[k];
        this._raiz.classList.toggle('con-arrastres', Object.keys(this._arrastres).length > 0);
        this._pintar(this._reloj.t);
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
        // En la página, la rueda es de la página: baja, y con Ctrl (o
        // pellizcando el touchpad) agranda la página entera, como siempre. Un
        // alumno que baja leyendo no tiene que quedar atrapado en el zoom de
        // la escena. En pantalla completa no hay página: la rueda hace zoom.
        if (!this._llena()) return;
        e.preventDefault();
        this._zoomEn(Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    }

    _dedoAbajo(e) {
        const objetivo = /** @type {Element} */ (e.target);
        if (objetivo.closest('.ma-pregunta, .ma-zoom')) return;
        // La lupa de quien mira: del cuerpo se lleva, del asa se agranda.
        const parteLupa = this._lupa?.activa && objetivo.closest('[data-lupa]');
        if (parteLupa) {
            const asa = /** @type {Element} */ (objetivo).getAttribute('data-lupa') === 'asa';
            this._agarrada = { id: asa ? '__asa' : '__lupa', pointerId: e.pointerId, x: e.clientX, y: e.clientY };
            this._lienzo.setPointerCapture(e.pointerId);
            return;
        }
        // Una pieza arrastrable (un espejo) se agarra y se lleva a otro lado.
        const agarrable = this._dedos.size === 0 && objetivo.closest('[data-arrastrable]');
        if (agarrable) {
            this._agarrada = { id: agarrable.getAttribute('data-arrastrable'), pointerId: e.pointerId, x: e.clientX, y: e.clientY };
            this._lienzo.setPointerCapture(e.pointerId);
            return;
        }
        this._dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this._movido = 0;
        if (this._dedos.size === 2) {
            const [a, b] = [...this._dedos.values()];
            this._pellizco = { distancia: Math.hypot(a.x - b.x, a.y - b.y), escala: this._zoom.escala };
        }
        if (this._zoom.escala > 1 || this._dedos.size === 2) this._lienzo.setPointerCapture(e.pointerId);
    }

    _dedoMueve(e) {
        const a = this._agarrada;
        if (a && a.pointerId === e.pointerId && (a.id === '__lupa' || a.id === '__asa')) {
            const m = this._svg.getScreenCTM();
            if (!m) return;
            const dx = (e.clientX - a.x) / m.a;
            const dy = (e.clientY - a.y) / m.d;
            [a.x, a.y] = [e.clientX, e.clientY];
            const l = this._lupa;
            if (a.id === '__lupa') this._cambiarLupa({ x: l.x + dx, y: l.y + dy });
            else if (l.forma === 'circulo') {
                const d = Math.max(dx, dy) * 2;
                this._cambiarLupa({ ancho: l.ancho + d, alto: l.alto + d });
            } else this._cambiarLupa({ ancho: l.ancho + dx * 2, alto: l.alto + dy * 2 });
            this._arrastro = true;
            this._raiz.classList.add('arrastrando');
            return;
        }
        if (a && a.pointerId === e.pointerId) {
            const m = this._svg.getScreenCTM();
            if (!m) return;
            const corrida = (this._arrastres[a.id] ??= { x: 0, y: 0 });
            this._raiz.classList.add('con-arrastres');
            corrida.x += (e.clientX - a.x) / m.a;
            corrida.y += (e.clientY - a.y) / m.d;
            [a.x, a.y] = [e.clientX, e.clientY];
            this._pintar(this._reloj.t);
            this._arrastro = true;
            this._raiz.classList.add('arrastrando');
            return;
        }
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
        if (this._agarrada?.pointerId === e.pointerId) this._agarrada = null;
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

import { MotorEscena } from '../controles/componente.js';

// <motor-leccion>: una escena para aprender, no solo para mirar.
//
//     <motor-leccion escena="bucle-for" paso-a-paso></motor-leccion>
//
// Es un <motor-escena> con dos cosas más, que vienen de las marcas de la escena:
//   - Preguntas: donde la escena tiene { marca: 'pregunta', datos: {...} }, la
//     animación FRENA y pregunta "¿qué creés que pasa ahora?" antes de
//     mostrarlo. Se aprende haciendo una predicción, no mirando pasar cosas.
//   - Paso a paso (atributo paso-a-paso, o el botón): frena en cada
//     { marca: 'paso' }, y los botones ⏮ ⏭ van de un paso al otro.
//
// Con el atributo `video` no frena nunca: las preguntas se muestran durante
// su tramo, como un cartel, para que también se vean en un video grabado.
//
// Fuera de la pantalla completa, los controles van fijos abajo: una lección
// se pausa, se adelanta y se va paso a paso todo el tiempo, y unos controles
// que se esconden molestan. Con `controles-flotantes` se comportan como en
// <motor-escena>. En pantalla completa flotan siempre.

const ESTILOS = `
/* En la página, la pregunta va en un renglón propio debajo del dibujo: si lo
   tapara, taparía justo lo que hay que mirar para contestarla (la tabla que
   hay que filtrar, la barra cuya proporción se pregunta). */
.ma-raiz {
    grid-template-areas: "escena" "subtitulo" "pregunta" "controles";
}
.ma-pregunta {
    grid-area: pregunta;
    position: relative;
    margin: 4px 12px 12px;
    overflow: auto;
    box-sizing: border-box;
    padding: 14px 16px 16px;
    border: 2px solid var(--ma-acento);
    border-radius: 12px;
    background: var(--ma-superficie);
    color: var(--ma-texto);
    font-size: clamp(15px, 2.3cqi, 22px);
    line-height: 1.4;
    cursor: auto;
    /* Por encima de los controles: en pantalla completa, escondidos siguen
       ahí, y no tienen que quedarse con los clics de las opciones. */
    z-index: 4;
    transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
/* En pantalla completa no hay renglón de abajo: la pregunta va encima del
   dibujo, más grande (se lee desde lejos), y se puede achicar para mirar lo
   que tapa. Los controles se esconden mientras está abierta (ver
   _actualizarVista); si alguien los busca, la pregunta sube para dejarles
   lugar. */
:host([pantalla]) .ma-pregunta,
:host(:fullscreen) .ma-pregunta {
    grid-area: escena;
    align-self: end;
    margin: 0 4% 4%;
    max-height: calc(100% - 8% - var(--ma-alto-controles, 0px));
    box-shadow: 0 8px 28px rgb(0 0 0 / 0.25);
    font-size: clamp(18px, 2.2cqi, 40px);
    padding: 0.7em 1em 0.9em;
}
:host([pantalla]) .ver-controles .ma-pregunta,
:host(:fullscreen) .ver-controles .ma-pregunta {
    transform: translateY(calc(-1 * var(--ma-alto-controles, 0px)));
}
/* Cuando el subtítulo dice lo mismo que la pregunta (lo normal: el narrador
   la lee en voz alta), se esconde mientras está abierta: repetido, solo tapa. */
.ma-raiz.sub-repite .ma-subtitulo {
    display: none;
}
.ma-pregunta[hidden] {
    display: none;
}
.ma-pregunta .ma-cabeza {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}
.ma-pregunta .ma-encabezado {
    font-weight: 800;
    color: var(--ma-acento);
    margin: 0 0 4px;
}
.ma-pregunta button.ma-ocultar {
    flex: none;
    min-height: 36px;
    margin: -4px -6px 0 0;
    padding: 4px 12px;
    border-color: transparent;
    background: transparent;
    color: var(--ma-suave);
    font-size: 0.85em;
}
/* En la página no tapa nada: no hace falta achicarla. */
:host(:not([pantalla]):not(:fullscreen)) .ma-ocultar {
    display: none;
}
/* Achicada (solo en pantalla completa: al salir vuelve a verse entera):
   queda solo el botón para volver, en una esquina. */
:host([pantalla]) .ma-pregunta.minimizada,
:host(:fullscreen) .ma-pregunta.minimizada {
    justify-self: end;
    padding: 4px;
    overflow: visible;
}
:host([pantalla]) .ma-pregunta.minimizada > :not(.ma-cabeza),
:host([pantalla]) .ma-pregunta.minimizada .ma-encabezado,
:host(:fullscreen) .ma-pregunta.minimizada > :not(.ma-cabeza),
:host(:fullscreen) .ma-pregunta.minimizada .ma-encabezado {
    display: none;
}
.ma-pregunta.minimizada button.ma-ocultar {
    margin: 0;
    color: var(--ma-acento);
}
.ma-pregunta .ma-enunciado {
    margin: 0 0 10px;
    font-weight: 600;
}
.ma-pregunta .ma-opciones {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.ma-pregunta button {
    min-height: 44px;
    padding: 6px 16px;
    border-radius: 10px;
    border: 2px solid var(--ma-borde);
    background: var(--ma-fondo);
    color: var(--ma-texto);
    font: 600 1em/1.2 var(--ma-fuente);
    cursor: pointer;
}
.ma-pregunta .ma-opciones button {
    font-family: var(--ma-fuente-mono);
}
.ma-pregunta button:hover:not(:disabled) {
    border-color: var(--ma-acento);
}
.ma-pregunta button:focus-visible {
    outline: 3px solid var(--ma-acento);
    outline-offset: 2px;
}
.ma-pregunta button.correcta {
    border-color: var(--ma-exito);
    background: color-mix(in srgb, var(--ma-exito) 18%, var(--ma-fondo));
}
.ma-pregunta button.elegida:not(.correcta) {
    border-color: var(--ma-error);
    background: color-mix(in srgb, var(--ma-error) 15%, var(--ma-fondo));
}
.ma-pregunta button:disabled {
    cursor: default;
}
.ma-pregunta .ma-respuesta {
    margin: 10px 0 0;
}
.ma-pregunta .ma-seguir {
    margin-top: 10px;
    background: var(--ma-acento);
    border-color: var(--ma-acento);
    color: var(--ma-fondo);
}
.ma-controles .corto {
    display: none;
}
/* En un celular no entran todos los controles en dos renglones: el tiempo se
   esconde (la barra lo dice igual a un lector de pantalla). Y en una columna,
   "Paso a paso" se acorta para que la barra entre en un renglón. */
@container (max-width: 400px) {
    .ma-tiempo {
        display: none;
    }
}
@container (max-width: 720px) {
    .ma-controles .largo {
        display: none;
    }
    .ma-controles .corto {
        display: inline;
    }
}
.ma-pregunta .ma-nota {
    margin: 8px 0 0;
    color: var(--ma-suave);
    font-size: 0.9em;
}
`;

export class MotorLeccion extends MotorEscena {
    static observedAttributes = [...MotorEscena.observedAttributes, 'paso-a-paso', 'video', 'controles-flotantes'];

    constructor() {
        super();
        const estilo = document.createElement('style');
        estilo.textContent = ESTILOS;
        this.shadowRoot.appendChild(estilo);

        this._panel = document.createElement('div');
        this._panel.className = 'ma-pregunta';
        this._panel.hidden = true;
        this._panel.setAttribute('role', 'group');
        this._panel.setAttribute('aria-label', 'Pregunta');
        // Lo que se toca adentro de la pregunta no tiene que pausar ni
        // reproducir la escena (un clic en el dibujo sí lo hace).
        this._panel.addEventListener('click', (e) => e.stopPropagation());
        this._panel.addEventListener('keydown', (e) => e.stopPropagation());
        this._raiz.appendChild(this._panel);
        // Cuánto ocupa la pregunta desde abajo: en pantalla completa, un
        // subtítulo que no la repite sube eso para quedar encima de ella.
        new ResizeObserver(() => {
            if (this._panel.hidden) return;
            const espacio = this._raiz.getBoundingClientRect().bottom - this._panel.getBoundingClientRect().top;
            this._raiz.style.setProperty('--ma-alto-pregunta', `${espacio}px`);
        }).observe(this._panel);

        // El botón de paso a paso, en la barra, antes de la velocidad.
        const barra = this.shadowRoot.querySelector('.ma-controles');
        this._botonPasos = document.createElement('button');
        this._botonPasos.type = 'button';
        this._botonPasos.innerHTML = '<span class="largo">Paso a paso</span><span class="corto" aria-hidden="true">Pasos</span>';
        this._botonPasos.setAttribute('aria-label', 'Paso a paso');
        this._botonPasos.setAttribute('aria-pressed', 'false');
        this._botonPasos.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAttribute('paso-a-paso');
        });
        barra.insertBefore(this._botonPasos, barra.querySelector('[data-accion="velocidad"]'));
        for (const [accion, nombre] of [['anterior', 'Paso anterior'], ['siguiente', 'Paso siguiente']]) {
            barra.querySelector(`[data-accion="${accion}"]`).setAttribute('aria-label', nombre);
        }

        this._marcas = [];
        this._abierta = null;
    }

    attributeChangedCallback(nombre, viejo, nuevo) {
        if (nombre === 'paso-a-paso' || nombre === 'video') {
            this._botonPasos.setAttribute('aria-pressed', String(this.hasAttribute('paso-a-paso')));
            if (this._compilada) this._alArmar(this._compilada);
            return;
        }
        super.attributeChangedCallback(nombre, viejo, nuevo);
    }

    _controlesFijos() {
        return !this.hasAttribute('controles-flotantes');
    }

    get pasoAPaso() {
        return this.hasAttribute('paso-a-paso');
    }

    // ---------------- Ganchos de <motor-escena> ----------------

    _alArmar(compilada) {
        this._marcas = compilada.marcas;
        const paradas = this.hasAttribute('video')
            ? []
            : this._marcas
                .filter((m) => m.tipo === 'pregunta' || (m.tipo === 'paso' && this.pasoAPaso))
                .map((m) => m.t);
        this._reloj.fijarParadas([...new Set(paradas)]);
    }

    _marcasDeLaBarra(compilada) {
        return compilada.marcas
            .filter((m) => m.tipo === 'pregunta')
            .map((m) => ({ t: m.t, clase: 'pregunta', texto: '?' }));
    }

    _alParar(t) {
        const pregunta = this._marcas.find((m) => m.tipo === 'pregunta' && m.t === t);
        if (pregunta) this._abrir(pregunta, true);
    }

    // Si el subtítulo de ahora repite la pregunta abierta, sobra.
    _mirarSubtitulo() {
        const normal = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
        const pregunta = normal(this._abierta?.datos?.pregunta);
        const repite = !!this._abierta && (!pregunta || normal(this._subtitulo.textContent).includes(pregunta));
        this._raiz.classList.toggle('sub-repite', repite);
    }

    _alPintar(estado) {
        if (this.hasAttribute('video')) {
            // En un video la pregunta es un cartel que dura su tramo.
            const m = this._marcas.find((x) => x.tipo === 'pregunta' && estado.t >= x.t && estado.t < x.hasta);
            if (m && this._abierta !== m) this._abrir(m, false);
            else if (!m && this._abierta) this._cerrar();
        } else if (this._abierta && Math.abs(estado.t - this._abierta.t) > 1e-6) {
            // Se fue de la pregunta (arrastró la barra, le dio play): se cierra.
            this._cerrar();
        }
        this._mirarSubtitulo();
    }

    // En una lección, ⏮ ⏭ van de paso en paso (y de pregunta en pregunta).
    capituloSiguiente() {
        const proximo = this._puntos().find((t) => t > this.t + 1e-6);
        this.pausar();
        if (proximo === undefined) this.irA(this.duracion);
        else this._llegarA(proximo);
    }

    capituloAnterior() {
        const anteriores = this._puntos().filter((t) => t < this.t - 1e-6);
        this.pausar();
        this.irA(anteriores.length ? anteriores[anteriores.length - 1] : 0);
    }

    _tecla(e) {
        // Con la pregunta abierta, el espacio no la saltea: hay que contestarla.
        if (this._abierta && [' ', 'k', '.'].includes(e.key)) {
            e.preventDefault();
            return;
        }
        super._tecla(e);
    }

    // ---------------- Por dentro ----------------

    _puntos() {
        const tipos = this.pasoAPaso ? ['paso', 'pregunta'] : ['pregunta'];
        const puntos = this._marcas.filter((m) => tipos.includes(m.tipo)).map((m) => m.t);
        for (const c of this._compilada?.capitulos ?? []) puntos.push(c.t);
        return [...new Set(puntos)].sort((a, b) => a - b);
    }

    _llegarA(t) {
        this.irA(t);
        const pregunta = this._marcas.find((m) => m.tipo === 'pregunta' && m.t === t);
        if (pregunta && !this.hasAttribute('video')) this._abrir(pregunta, true);
    }

    _abrir(marca, interactiva) {
        const d = marca.datos ?? {};
        this._abierta = marca;
        const panel = this._panel;
        panel.replaceChildren();
        panel.classList.remove('minimizada');
        const parrafo = (clase, texto, dentro = panel) => {
            const p = document.createElement('p');
            p.className = clase;
            p.textContent = texto;
            dentro.appendChild(p);
            return p;
        };
        // La pregunta tapa parte del dibujo, y a veces lo que hay que mirar
        // para contestarla está justo abajo: se puede achicar un momento.
        const cabeza = document.createElement('div');
        cabeza.className = 'ma-cabeza';
        panel.appendChild(cabeza);
        parrafo('ma-encabezado', '🤔 Pensalo antes de seguir', cabeza);
        const ocultar = document.createElement('button');
        ocultar.type = 'button';
        ocultar.className = 'ma-ocultar';
        ocultar.setAttribute('aria-expanded', 'true');
        const rotular = () => {
            const chica = panel.classList.contains('minimizada');
            ocultar.textContent = chica ? '🤔 Volver a la pregunta' : 'Ver el dibujo';
            ocultar.setAttribute('aria-expanded', String(!chica));
        };
        ocultar.addEventListener('click', () => {
            panel.classList.toggle('minimizada');
            rotular();
        });
        rotular();
        // En un video no hay quien la toque: el botón solo ensuciaría el cartel.
        if (interactiva) cabeza.appendChild(ocultar);
        parrafo('ma-enunciado', d.pregunta ?? '¿Qué creés que pasa ahora?');

        const opciones = document.createElement('div');
        opciones.className = 'ma-opciones';
        panel.appendChild(opciones);
        const botones = (d.opciones ?? []).map((texto, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = texto;
            b.disabled = !interactiva;
            b.addEventListener('click', () => this._contestar(marca, i, botones));
            opciones.appendChild(b);
            return b;
        });

        if (!interactiva) {
            parrafo('ma-nota', 'Pausá y pensalo: la respuesta viene enseguida.');
        } else if (botones.length === 0) {
            this._botonSeguir(marca, 'Ya lo pensé: ver qué pasa');
        }
        panel.hidden = false;
        this._vista.pregunta = true;
        this._actualizarVista();
        this._mirarSubtitulo();
        // Un lector de pantalla lee la pregunta apenas aparece.
        panel.setAttribute('aria-live', 'polite');
        if (interactiva) (botones[0] ?? panel.querySelector('button'))?.focus();
    }

    _contestar(marca, elegida, botones) {
        const d = marca.datos ?? {};
        botones.forEach((b, i) => {
            b.disabled = true;
            if (i === d.correcta) b.classList.add('correcta');
            if (i === elegida) b.classList.add('elegida');
        });
        const bien = d.correcta === undefined || elegida === d.correcta;
        const respuesta = document.createElement('p');
        respuesta.className = 'ma-respuesta';
        respuesta.textContent = `${bien ? '✅ ¡Bien!' : '❌ No era esa.'} ${d.explicacion ?? ''}`.trim();
        this._panel.appendChild(respuesta);
        this._botonSeguir(marca, 'Seguir');
        this.dispatchEvent(new CustomEvent('respuesta', {
            detail: { pregunta: d.pregunta, elegida, correcta: d.correcta, bien },
            bubbles: true,
        }));
    }

    _botonSeguir(marca, texto) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ma-seguir';
        b.textContent = texto;
        b.addEventListener('click', () => {
            this._cerrar();
            // El tramo de la pregunta es para el video; en vivo se saltea.
            this.irA(marca.hasta);
            this.reproducir();
        });
        this._panel.appendChild(b);
        b.focus();
    }

    _cerrar() {
        this._abierta = null;
        this._panel.hidden = true;
        this._panel.classList.remove('minimizada');
        this._panel.replaceChildren();
        this._vista.pregunta = false;
        this._actualizarVista();
        this._mirarSubtitulo();
    }
}

export function definirLeccion(nombre = 'motor-leccion') {
    if (typeof customElements === 'undefined' || customElements.get(nombre)) return;
    customElements.define(nombre, MotorLeccion);
}

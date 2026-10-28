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

const ESTILOS = `
.ma-pregunta {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-height: calc(100% - 24px);
    overflow: auto;
    box-sizing: border-box;
    padding: 14px 16px 16px;
    border: 2px solid var(--ma-acento);
    border-radius: 12px;
    background: var(--ma-superficie);
    color: var(--ma-texto);
    box-shadow: 0 8px 28px rgb(0 0 0 / 0.25);
    font-size: clamp(15px, 2.3cqi, 22px);
    line-height: 1.4;
    cursor: auto;
}
/* En pantalla completa (una pantalla grande, un video) se lee desde lejos. */
:host([pantalla]) .ma-pregunta,
:host(:fullscreen) .ma-pregunta {
    font-size: clamp(18px, 2.2cqi, 40px);
    padding: 0.7em 1em 0.9em;
    left: 4%;
    right: 4%;
    bottom: 4%;
}
/* Si los controles flotan sobre el dibujo, la pregunta va arriba de ellos. */
.flotantes .ma-pregunta {
    bottom: calc(var(--ma-alto-controles, 0px) + 12px);
    max-height: calc(100% - var(--ma-alto-controles, 0px) - 24px);
}
.ma-pregunta[hidden] {
    display: none;
}
.ma-pregunta .ma-encabezado {
    font-weight: 800;
    color: var(--ma-acento);
    margin: 0 0 4px;
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
   esconde (la barra lo dice igual a un lector de pantalla) y el botón se acorta. */
@container (max-width: 400px) {
    .ma-controles .largo,
    .ma-tiempo {
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
    static observedAttributes = [...MotorEscena.observedAttributes, 'paso-a-paso', 'video'];

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
        this._lienzo.appendChild(this._panel);

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
        const parrafo = (clase, texto) => {
            const p = document.createElement('p');
            p.className = clase;
            p.textContent = texto;
            panel.appendChild(p);
            return p;
        };
        parrafo('ma-encabezado', '🤔 Pensalo antes de seguir');
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
        this._panel.replaceChildren();
    }
}

export function definirLeccion(nombre = 'motor-leccion') {
    if (typeof customElements === 'undefined' || customElements.get(nombre)) return;
    customElements.define(nombre, MotorLeccion);
}

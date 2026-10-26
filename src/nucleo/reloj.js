import { limitar } from './interpolar.js';

// El reloj decide QUÉ instante mostrar. No sabe nada de piezas ni de dibujos:
// solo lleva la cuenta de t y avisa cuando cambia.
//
// Que esté separado de la línea de tiempo es lo que hace al motor "saltable":
// pausar, retroceder o ir al segundo 12 no son casos especiales, son poner otro
// número en t. Y para el video se lo reemplaza por un bucle que avanza de a un
// cuadro, sin tocar nada más.

// Si la pestaña estuvo oculta o la compu se trabó, entre un cuadro y el
// siguiente pueden pasar varios segundos. Sin este tope la animación pegaría un
// salto y se perdería justo lo que el alumno estaba mirando.
const PASO_MAXIMO = 0.25;

export class Reloj {
    /**
     * @param {{
     *     duracion: number,
     *     loop?: boolean,
     *     velocidad?: number,
     *     alCambiar?: (t: number) => void,
     *     alCambiarEstado?: (corriendo: boolean) => void,
     *     ahora?: () => number,
     *     pedirCuadro?: (f: () => void) => any,
     *     cancelarCuadro?: (id: any) => void,
     * }} opciones `ahora`, `pedirCuadro` y `cancelarCuadro` se pueden reemplazar
     *     para probar el reloj con un tiempo de mentira, sin navegador.
     */
    constructor(opciones) {
        this.duracion = opciones.duracion;
        this.loop = opciones.loop ?? false;
        this.velocidad = opciones.velocidad ?? 1;
        this.alCambiar = opciones.alCambiar ?? (() => {});
        this.alCambiarEstado = opciones.alCambiarEstado ?? (() => {});
        this.ahora = opciones.ahora ?? (() => performance.now());
        this.pedirCuadro = opciones.pedirCuadro ?? ((f) => requestAnimationFrame(f));
        this.cancelarCuadro = opciones.cancelarCuadro ?? ((id) => cancelAnimationFrame(id));
        this.t = 0;
        this.corriendo = false;
        this._pedido = null;
        this._ultimo = 0;
        this._cuadro = this._cuadro.bind(this);
    }

    reproducir() {
        if (this.corriendo) return;
        // Darle play al final vuelve a empezar, como en cualquier reproductor.
        if (this.t >= this.duracion) this._fijar(0);
        this.corriendo = true;
        this._ultimo = this.ahora();
        this._pedido = this.pedirCuadro(this._cuadro);
        this.alCambiarEstado(true);
    }

    pausar() {
        if (!this.corriendo) return;
        this.corriendo = false;
        if (this._pedido != null) this.cancelarCuadro(this._pedido);
        this._pedido = null;
        this.alCambiarEstado(false);
    }

    alternar() {
        if (this.corriendo) this.pausar();
        else this.reproducir();
    }

    /** Salta a un instante, esté corriendo o no. */
    irA(t) {
        this._fijar(limitar(t, 0, this.duracion));
        // Si se salta mientras corre, el próximo cuadro cuenta desde ahora y no
        // desde antes del salto.
        this._ultimo = this.ahora();
    }

    cambiarVelocidad(v) {
        this.velocidad = v;
    }

    destruir() {
        this.pausar();
        this.alCambiar = () => {};
        this.alCambiarEstado = () => {};
    }

    _cuadro() {
        const ahora = this.ahora();
        const paso = Math.min((ahora - this._ultimo) / 1000, PASO_MAXIMO) * this.velocidad;
        this._ultimo = ahora;
        let t = this.t + paso;
        if (t >= this.duracion) {
            if (this.loop && this.duracion > 0) {
                t %= this.duracion;
            } else {
                this._fijar(this.duracion);
                this.pausar();
                return;
            }
        }
        this._fijar(t);
        if (this.corriendo) this._pedido = this.pedirCuadro(this._cuadro);
    }

    _fijar(t) {
        this.t = t;
        this.alCambiar(t);
    }
}

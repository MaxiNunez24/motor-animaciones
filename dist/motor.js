// src/nucleo/curvas.js
var C1 = 1.70158;
var C3 = C1 + 1;
var curvas = {
  lineal: (p) => p,
  entrar: (p) => p * p * p,
  salir: (p) => 1 - (1 - p) ** 3,
  // La de todos los días: arranca y frena suave. Es la predeterminada porque
  // es la que menos llama la atención sobre sí misma.
  suave: (p) => p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2,
  // Se pasa un poquito y vuelve: para que algo "aterrice" con gracia.
  pasarse: (p) => 1 + C3 * (p - 1) ** 3 + C1 * (p - 1) ** 2,
  // Cambia de golpe apenas empieza. Es la que usa el movimiento reducido.
  salto: (p) => p > 0 ? 1 : 0
};
function curva(cual) {
  const f = typeof cual === "function" ? cual : curvas[cual];
  if (!f) {
    throw new Error(
      `No conozco la curva "${cual}". Las que hay son: ${Object.keys(curvas).join(", ")}.`
    );
  }
  return (p) => p <= 0 ? 0 : p >= 1 ? 1 : f(p);
}

// src/nucleo/colores.js
var TOKENS = [
  "fondo",
  // detrás de todo
  "superficie",
  // el relleno de cajas y tarjetas
  "texto",
  "suave",
  // texto secundario, líneas finas
  "borde",
  "acento",
  // lo que hay que mirar
  "acento2",
  // un segundo protagonista
  "exito",
  "alerta",
  "error",
  "papel",
  // hojas, planillas, lo que es "de papel"
  "marco"
  // el cuerpo de un celular o de una pantalla
];
var ES_TOKEN = new Set(TOKENS);
function aCss(valor) {
  if (valor == null || valor === "" || valor === "ninguno") return "none";
  return ES_TOKEN.has(valor) ? `var(--ma-${valor})` : valor;
}
function mezclarColores(desde, hasta, p) {
  if (p <= 0) return desde;
  if (p >= 1) return hasta;
  const pct = Math.round((1 - p) * 1e4) / 100;
  return `color-mix(in srgb, ${aCss(desde)} ${pct}%, ${aCss(hasta)})`;
}

// src/nucleo/interpolar.js
function interpolar(desde, hasta, p, clase) {
  if (clase === "numero") {
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return p >= 1 ? hasta : desde;
    return desde + (hasta - desde) * p;
  }
  if (clase === "color") return mezclarColores(desde, hasta, Math.min(Math.max(p, 0), 1));
  return p >= 1 ? hasta : desde;
}
function claseDe(prop, valor, colores) {
  if (colores.has(prop)) return "color";
  if (typeof valor === "number") return "numero";
  return "discreto";
}
function limitar(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

// src/nucleo/linea.js
var SUAVES_SIEMPRE = /* @__PURE__ */ new Set(["opacidad"]);
function duracionLectura(texto3) {
  return Math.max(1.5, String(texto3).length / 15);
}
function compilar(definicion, opciones = {}) {
  const movimiento = opciones.movimiento ?? "completo";
  const disposicion = opciones.disposicion ?? { nombre: "ancha" };
  const def = typeof definicion === "function" ? definicion(disposicion) : definicion;
  if (!def || typeof def !== "object") throw new Error("La escena tiene que ser un objeto.");
  for (const medida of ["ancho", "alto"]) {
    if (!(def[medida] > 0)) {
      throw new Error(`A la escena le falta el ${medida}: es el tama\xF1o del dibujo, por ejemplo 1600 \xD7 900.`);
    }
  }
  const piezas = {};
  for (const [id, pieza] of Object.entries(def.piezas ?? {})) {
    if (!pieza || !pieza.tipo || !pieza.props) {
      throw new Error(`"${id}" no es una pieza: armala con caja({...}), texto({...}), etc.`);
    }
    piezas[id] = {
      id,
      tipo: pieza.tipo,
      base: { ...pieza.props },
      colores: new Set(pieza.tipo.colores ?? []),
      segmentos: {}
    };
  }
  for (const p of Object.values(piezas)) {
    const padre = p.base.dentro;
    if (padre != null && !piezas[padre]) {
      throw new Error(`"${p.id}" va dentro de "${padre}", pero no hay ninguna pieza que se llame as\xED.`);
    }
  }
  const capitulos = [];
  const subtitulos = [];
  let fin = 0;
  let finSubtitulos = 0;
  let previo = { inicio: 0, fin: 0 };
  let orden = 0;
  (def.linea ?? []).forEach((item, i) => {
    const donde = `el paso ${i + 1} de la l\xEDnea`;
    const inicio = resolverEn(item.en, fin, previo, donde);
    let finItem = inicio;
    if ("capitulo" in item) {
      capitulos.push({ nombre: String(item.capitulo), t: inicio });
    } else if ("subtitulo" in item) {
      const dur = item.dur ?? (item.hasta != null ? item.hasta - inicio : duracionLectura(item.subtitulo));
      subtitulos.push({ texto: String(item.subtitulo), desde: inicio, hasta: inicio + dur });
      finSubtitulos = Math.max(finSubtitulos, inicio + dur);
      return;
    } else if ("espera" in item) {
      finItem = inicio + item.espera;
    } else if ("pieza" in item) {
      const ids2 = Array.isArray(item.pieza) ? item.pieza : [item.pieza];
      const dur = item.dur ?? 0.6;
      const escalonar = item.escalonar ?? 0;
      const fCurva = curva(item.curva ?? "suave");
      if (!item.a || typeof item.a !== "object") {
        throw new Error(`En ${donde} falta "a": a qu\xE9 valores va la pieza, por ejemplo a: { opacidad: 1 }.`);
      }
      ids2.forEach((id, j) => {
        const p = piezas[id];
        if (!p) throw new Error(`En ${donde} se anima "${id}", pero no hay ninguna pieza que se llame as\xED.`);
        const t0 = inicio + j * escalonar;
        for (const [prop, hasta] of Object.entries(item.a)) {
          if (!(prop in p.base)) {
            throw new Error(
              `En ${donde}, "${id}" (una ${p.tipo.nombre}) no tiene la propiedad "${prop}". Las que tiene son: ${Object.keys(p.base).join(", ")}.`
            );
          }
          (p.segmentos[prop] ??= []).push({
            t0,
            t1: t0 + dur,
            hasta,
            desde: item.desde?.[prop],
            curva: fCurva,
            orden: orden++
          });
        }
      });
      finItem = inicio + Math.max(ids2.length - 1, 0) * escalonar + dur;
    } else {
      throw new Error(`No entiendo ${donde}: tiene que ser una animaci\xF3n (pieza), un capitulo, un subtitulo o una espera.`);
    }
    previo = { inicio, fin: finItem };
    fin = Math.max(fin, finItem);
  });
  for (const p of Object.values(piezas)) {
    for (const [prop, segs] of Object.entries(p.segmentos)) {
      segs.sort((a, b) => a.t0 - b.t0 || a.orden - b.orden);
      const clase = claseDe(prop, p.base[prop], p.colores);
      segs.forEach((seg, k) => {
        if (clase === "numero" && typeof seg.hasta !== "number") {
          throw new Error(`"${p.id}.${prop}" es un n\xFAmero y se la quiere llevar a ${JSON.stringify(seg.hasta)}.`);
        }
        seg.clase = clase;
        if (seg.desde === void 0) seg.desde = valorEn(segs.slice(0, k), p.base[prop], seg.t0);
        if (movimiento === "reducido" && clase === "numero" && !SUAVES_SIEMPRE.has(prop)) {
          seg.curva = curva("salto");
        }
      });
    }
  }
  capitulos.sort((a, b) => a.t - b.t);
  const duracion = def.duracion ?? Math.max(fin, finSubtitulos) + (def.pausaFinal ?? 0);
  const ids = ordenarPadresPrimero(piezas);
  return {
    titulo: def.titulo ?? "",
    descripcion: def.descripcion ?? "",
    ancho: def.ancho,
    alto: def.alto,
    duracion,
    movimiento,
    disposicion: disposicion.nombre,
    /** Los ids en el orden en que se dibujan: los contenedores antes que lo que llevan adentro. */
    ids,
    tipos: Object.fromEntries(ids.map((id) => [id, piezas[id].tipo])),
    capitulos,
    subtitulos,
    /** Cómo está todo en el instante t. */
    estado(t) {
      const tt = limitar(Number(t) || 0, 0, duracion);
      const props = {};
      for (const id of ids) {
        const p = piezas[id];
        const actual = { ...p.base };
        for (const [prop, segs] of Object.entries(p.segmentos)) {
          actual[prop] = valorEn(segs, p.base[prop], tt);
        }
        props[id] = actual;
      }
      return {
        t: tt,
        piezas: props,
        capitulo: capituloEn(capitulos, tt),
        subtitulo: subtituloEn(subtitulos, tt)
      };
    }
  };
}
function valorEn(segs, base, t) {
  let v = base;
  for (const seg of segs) {
    if (t < seg.t0) break;
    if (t >= seg.t1) {
      v = seg.hasta;
    } else {
      const p = (t - seg.t0) / (seg.t1 - seg.t0);
      v = interpolar(seg.desde, seg.hasta, seg.curva(p), seg.clase);
    }
  }
  return v;
}
function resolverEn(en, fin, previo, donde) {
  if (en === void 0) return fin;
  if (typeof en === "number") return en;
  const m = typeof en === "string" && en.trim().match(/^([+<>])\s*([+-]?\d*\.?\d+)?$/);
  if (!m) {
    throw new Error(`En ${donde}, "en: ${JSON.stringify(en)}" no se entiende. Us\xE1 un n\xFAmero, '+0.5', '<', '<0.2' o '>'.`);
  }
  const ancla = m[1] === "+" ? fin : m[1] === "<" ? previo.inicio : previo.fin;
  return ancla + (m[2] ? parseFloat(m[2]) : 0);
}
function capituloEn(capitulos, t) {
  let i = -1;
  for (let k = 0; k < capitulos.length; k++) if (capitulos[k].t <= t) i = k;
  return i;
}
function subtituloEn(subtitulos, t) {
  let texto3 = "";
  let desde = -Infinity;
  for (const s of subtitulos) {
    if (s.desde <= t && t < s.hasta && s.desde >= desde) {
      texto3 = s.texto;
      desde = s.desde;
    }
  }
  return texto3;
}
function ordenarPadresPrimero(piezas) {
  const listos = /* @__PURE__ */ new Set();
  const orden = [];
  const visitar = (id, camino) => {
    if (listos.has(id)) return;
    if (camino.has(id)) throw new Error(`"${id}" est\xE1 dentro de s\xED misma, dando una vuelta: revis\xE1 los "dentro".`);
    camino.add(id);
    const padre = piezas[id].base.dentro;
    if (padre != null) visitar(padre, camino);
    listos.add(id);
    orden.push(id);
  };
  for (const id of Object.keys(piezas)) visitar(id, /* @__PURE__ */ new Set());
  return orden;
}

// src/nucleo/reloj.js
var PASO_MAXIMO = 0.25;
var Reloj = class {
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
    this.alCambiar = opciones.alCambiar ?? (() => {
    });
    this.alCambiarEstado = opciones.alCambiarEstado ?? (() => {
    });
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
    this._ultimo = this.ahora();
  }
  cambiarVelocidad(v) {
    this.velocidad = v;
  }
  destruir() {
    this.pausar();
    this.alCambiar = () => {
    };
    this.alCambiarEstado = () => {
    };
  }
  _cuadro() {
    const ahora = this.ahora();
    const paso = Math.min((ahora - this._ultimo) / 1e3, PASO_MAXIMO) * this.velocidad;
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
};

// src/piezas/svg.js
var NS = "http://www.w3.org/2000/svg";
function el(nombre, atributos = {}, padre) {
  const nodo = (
    /** @type {SVGElement} */
    document.createElementNS(NS, nombre)
  );
  poner(nodo, atributos);
  if (padre) padre.appendChild(nodo);
  return nodo;
}
function poner(nodo, atributos) {
  const previos = (
    /** @type {any} */
    nodo.__previos ??= {}
  );
  for (const [k, v] of Object.entries(atributos)) {
    const valor = v == null ? null : typeof v === "number" ? redondear(v) : String(v);
    if (previos[k] === valor) continue;
    previos[k] = valor;
    if (valor === null) nodo.removeAttribute(k);
    else nodo.setAttribute(k, valor);
  }
}
function texto(nodo, valor) {
  if (nodo.__texto === valor) return;
  nodo.__texto = valor;
  nodo.textContent = valor;
}
function redondear(n2) {
  return String(Math.round(n2 * 100) / 100);
}
var contador = 0;
function idUnico(prefijo) {
  contador += 1;
  return `${prefijo}-${contador}`;
}
function renglones(nodoTexto, lineas, { x = 0, y = 0, tamano, interlineado = 1.25 }) {
  while (nodoTexto.childNodes.length > lineas.length) nodoTexto.lastChild.remove();
  while (nodoTexto.childNodes.length < lineas.length) el("tspan", {}, nodoTexto);
  const alto = tamano * interlineado;
  const primero = y - (lineas.length - 1) * alto / 2;
  lineas.forEach((linea, i) => {
    const tspan = (
      /** @type {Element} */
      nodoTexto.childNodes[i]
    );
    poner(tspan, { x, y: primero + i * alto });
    texto(tspan, linea === "" ? "\xA0" : linea);
  });
}

// src/piezas/geometria.js
function posicionAbsoluta(id, estado, tipos) {
  const p = estado.piezas[id];
  const tam = tipos[id].tamano?.(p) ?? { ancho: 0, alto: 0 };
  let x = p.x;
  let y = p.y;
  let escala = p.escala;
  let padre = p.dentro;
  while (padre != null) {
    const pp = estado.piezas[padre];
    const o = tipos[padre].origenContenedor?.(pp) ?? { x: 0, y: 0, escala: 1 };
    x = pp.x + pp.escala * (o.x + o.escala * x);
    y = pp.y + pp.escala * (o.y + o.escala * y);
    escala *= pp.escala * o.escala;
    padre = pp.dentro;
  }
  return { x, y, ancho: tam.ancho * escala, alto: tam.alto * escala };
}
function caminoFlecha(a, b, curvatura = 0, separacion = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo2 = Math.hypot(dx, dy) || 1;
  const c = {
    x: (a.x + b.x) / 2 - dy / largo2 * curvatura * largo2,
    y: (a.y + b.y) / 2 + dx / largo2 * curvatura * largo2
  };
  return { p0: bordeHacia(a, c, separacion), c, p1: bordeHacia(b, c, separacion) };
}
function bordeHacia(r2, hacia, separacion) {
  const dx = hacia.x - r2.x;
  const dy = hacia.y - r2.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { x: r2.x, y: r2.y };
  const ux = dx / d;
  const uy = dy / d;
  const mx = (r2.ancho ?? 0) / 2;
  const my = (r2.alto ?? 0) / 2;
  const hastaBorde = Math.min(
    ux === 0 ? Infinity : mx / Math.abs(ux),
    uy === 0 ? Infinity : my / Math.abs(uy)
  );
  const t = (Number.isFinite(hastaBorde) ? hastaBorde : 0) + separacion;
  return { x: r2.x + ux * t, y: r2.y + uy * t };
}
function puntoCurva({ p0, c, p1 }, u) {
  const v = 1 - u;
  return {
    x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x,
    y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y
  };
}
function anguloCurva({ p0, c, p1 }, u) {
  const dx = 2 * (1 - u) * (c.x - p0.x) + 2 * u * (p1.x - c.x);
  const dy = 2 * (1 - u) * (c.y - p0.y) + 2 * u * (p1.y - c.y);
  return Math.atan2(dy, dx);
}
var TRAMOS = 32;
function medirCurva(curva2) {
  const largos = [0];
  let anterior = curva2.p0;
  for (let i = 1; i <= TRAMOS; i++) {
    const p = puntoCurva(curva2, i / TRAMOS);
    largos.push(largos[i - 1] + Math.hypot(p.x - anterior.x, p.y - anterior.y));
    anterior = p;
  }
  return largos;
}
function uParaFraccion(largos, fraccion) {
  const total = largos[TRAMOS];
  if (fraccion <= 0 || total === 0) return 0;
  if (fraccion >= 1) return 1;
  const objetivo = fraccion * total;
  let i = 1;
  while (largos[i] < objetivo) i++;
  const tramo = largos[i] - largos[i - 1];
  const dentro = tramo === 0 ? 0 : (objetivo - largos[i - 1]) / tramo;
  return (i - 1 + dentro) / TRAMOS;
}
function cortarCurva({ p0, c, p1 }, u) {
  const c2 = { x: p0.x + (c.x - p0.x) * u, y: p0.y + (c.y - p0.y) * u };
  return { p0, c: c2, p1: puntoCurva({ p0, c, p1 }, u) };
}
function partirLineas(texto3, maxCaracteres = 0) {
  const parrafos = String(texto3 ?? "").split("\n");
  if (!(maxCaracteres > 0)) return parrafos;
  const lineas = [];
  for (const parrafo of parrafos) {
    let actual = "";
    for (const palabra of parrafo.split(" ")) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (largo(prueba) > maxCaracteres && actual) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    lineas.push(actual);
  }
  return lineas;
}
function revelar(lineas, escrito) {
  if (escrito >= 1) return lineas;
  const total = lineas.reduce((n2, l) => n2 + largo(l), 0);
  let quedan = Math.floor(total * Math.max(escrito, 0) + 1e-9);
  return lineas.map((l) => {
    const letras = Array.from(l);
    const visibles = letras.slice(0, quedan).join("");
    quedan = Math.max(quedan - letras.length, 0);
    return visibles;
  });
}
function largo(texto3) {
  return Array.from(texto3).length;
}
var ANCHO_LETRA = 0.55;

// src/pintor/pintor.js
function crearPintor(svg, escena) {
  svg.replaceChildren();
  poner(svg, {
    viewBox: `0 0 ${escena.ancho} ${escena.alto}`,
    preserveAspectRatio: "xMidYMid meet"
  });
  el("rect", { x: 0, y: 0, width: escena.ancho, height: escena.alto, fill: "var(--ma-fondo)" }, svg);
  const raiz = el("g", {}, svg);
  const inicial = escena.estado(0);
  const ctx = { estado: inicial, tipos: escena.tipos };
  const nodos = {};
  for (const id of escena.ids) {
    const tipo = escena.tipos[id];
    const props = inicial.piezas[id];
    const padre = props.dentro != null ? nodos[props.dentro].contenido : raiz;
    const grupo = (
      /** @type {SVGGElement} */
      el("g", { "data-pieza": id }, padre)
    );
    const partes = tipo.crear(grupo, props, ctx);
    nodos[id] = {
      tipo,
      grupo,
      partes,
      contenido: tipo.contenedor ? tipo.contenedor(partes) : null,
      ultimo: null
    };
  }
  return {
    /** @param {ReturnType<ReturnType<import('../nucleo/linea.js').compilar>['estado']>} estado */
    pintar(estado) {
      ctx.estado = estado;
      for (const id of escena.ids) {
        const nodo = nodos[id];
        const p = estado.piezas[id];
        const invisible = p.opacidad <= 0;
        poner(nodo.grupo, {
          transform: `translate(${r(p.x)} ${r(p.y)})` + (p.rotacion ? ` rotate(${r(p.rotacion)})` : "") + (p.escala !== 1 ? ` scale(${r(p.escala)})` : ""),
          opacity: p.opacidad >= 1 ? null : r(p.opacidad),
          // Lo invisible tampoco se lee en voz alta ni se puede tocar.
          visibility: invisible ? "hidden" : null
        });
        if (invisible || !nodo.tipo.dependeDeOtras && iguales(nodo.ultimo, p)) continue;
        nodo.tipo.actualizar(nodo.partes, p, ctx);
        nodo.ultimo = p;
      }
    },
    /** Dónde quedó una pieza, en coordenadas de la escena. */
    posicion(id) {
      return posicionAbsoluta(id, ctx.estado, escena.tipos);
    }
  };
}
function iguales(a, b) {
  if (!a) return false;
  for (const k in b) if (a[k] !== b[k]) return false;
  return true;
}
function r(n2) {
  return Math.round(n2 * 100) / 100;
}

// src/controles/barra.js
var ICONOS = {
  reproducir: '<path d="M8 5v14l11-7z"/>',
  pausar: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
  anterior: '<path d="M6 6h2v12H6zM9.5 12 18 6v12z"/>',
  siguiente: '<path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z"/>',
  pantalla: '<path d="M5 5h5v2H7v3H5zM14 5h5v5h-2V7h-3zM5 14h2v3h3v2H5zM17 14h2v5h-5v-2h3z"/>'
};
var VELOCIDADES = [0.5, 0.75, 1, 1.5, 2];
function icono(nombre) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;
}
function reloj(segundos) {
  const s = Math.floor(Math.max(segundos, 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function crearBarra(contenedor, acciones) {
  contenedor.innerHTML = `
        <button type="button" data-accion="anterior" aria-label="Cap\xEDtulo anterior">${icono("anterior")}</button>
        <button type="button" data-accion="alternar" aria-label="Reproducir">${icono("reproducir")}</button>
        <button type="button" data-accion="siguiente" aria-label="Cap\xEDtulo siguiente">${icono("siguiente")}</button>
        <div class="ma-linea">
            <input type="range" min="0" max="1" step="0.1" value="0" aria-label="Momento de la animaci\xF3n">
            <div class="ma-marcas" aria-hidden="true"></div>
        </div>
        <span class="ma-tiempo" aria-hidden="true">0:00 / 0:00</span>
        <button type="button" data-accion="velocidad" aria-label="Velocidad: normal">1\xD7</button>
        <button type="button" data-accion="subtitulos" aria-pressed="true" aria-label="Subt\xEDtulos">CC</button>
        <button type="button" data-accion="pantalla" aria-label="Pantalla completa">${icono("pantalla")}</button>
        <div class="ma-capitulo" aria-live="polite"></div>
    `;
  const $ = (s) => (
    /** @type {HTMLElement} */
    contenedor.querySelector(s)
  );
  const botonAlternar = $('[data-accion="alternar"]');
  const botonVelocidad = $('[data-accion="velocidad"]');
  const botonSubtitulos = $('[data-accion="subtitulos"]');
  const rango = (
    /** @type {HTMLInputElement} */
    $("input")
  );
  const marcas = $(".ma-marcas");
  const tiempo = $(".ma-tiempo");
  const capitulo = $(".ma-capitulo");
  let duracion = 0;
  let capitulos = [];
  let velocidad = 1;
  let ultimoCapitulo = null;
  contenedor.addEventListener("click", (e) => {
    const boton = (
      /** @type {HTMLElement} */
      e.target.closest("button")
    );
    if (!boton) return;
    const accion = boton.dataset.accion;
    if (accion === "velocidad") {
      velocidad = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length];
      acciones.velocidad(velocidad);
    } else if (accion === "subtitulos") {
      const prendidos = boton.getAttribute("aria-pressed") !== "true";
      acciones.subtitulos(prendidos);
    } else {
      acciones[accion]();
    }
  });
  rango.addEventListener("input", () => acciones.irA(Number(rango.value)));
  let arrastrando = false;
  rango.addEventListener("pointerdown", () => {
    arrastrando = true;
  });
  for (const fin of ["pointerup", "pointercancel"]) {
    rango.addEventListener(fin, () => {
      arrastrando = false;
    });
  }
  return {
    /** Cuando cambia la escena (o su disposición). */
    configurar(escena) {
      duracion = escena.duracion;
      capitulos = escena.capitulos;
      rango.max = String(duracion);
      marcas.innerHTML = capitulos.filter((c) => c.t > 0).map((c) => `<span style="left: ${(c.t / duracion * 100).toFixed(2)}%"></span>`).join("");
      ultimoCapitulo = null;
    },
    /** En cada cuadro. Solo toca lo que cambió. */
    mostrar(estado) {
      if (!arrastrando) rango.value = String(estado.t);
      const texto3 = `${reloj(estado.t)} / ${reloj(duracion)}`;
      if (tiempo.textContent !== texto3) tiempo.textContent = texto3;
      const cap = capitulos[estado.capitulo];
      rango.setAttribute(
        "aria-valuetext",
        `${reloj(estado.t)} de ${reloj(duracion)}${cap ? `, ${cap.nombre}` : ""}`
      );
      if (estado.capitulo !== ultimoCapitulo) {
        ultimoCapitulo = estado.capitulo;
        capitulo.textContent = cap ? `${estado.capitulo + 1}/${capitulos.length} \xB7 ${cap.nombre}` : "";
      }
    },
    corriendo(si) {
      botonAlternar.innerHTML = icono(si ? "pausar" : "reproducir");
      botonAlternar.setAttribute("aria-label", si ? "Pausar" : "Reproducir");
    },
    velocidad(v) {
      velocidad = v;
      botonVelocidad.textContent = `${String(v).replace(".", ",")}\xD7`;
      botonVelocidad.setAttribute("aria-label", v === 1 ? "Velocidad: normal" : `Velocidad: ${String(v).replace(".", ",")} veces`);
    },
    subtitulos(prendidos) {
      botonSubtitulos.setAttribute("aria-pressed", String(prendidos));
    }
  };
}

// src/pintor/tema.js
var CLARO = {
  fondo: "#f6f4ef",
  superficie: "#ffffff",
  texto: "#1c2230",
  suave: "#5a6372",
  borde: "#c3cad4",
  acento: "#1f5fd1",
  acento2: "#c2410c",
  exito: "#15803d",
  alerta: "#a16207",
  error: "#b91c1c",
  papel: "#fdf6dc",
  marco: "#232a35"
};
var OSCURO = {
  fondo: "#12161d",
  superficie: "#1e2530",
  texto: "#e8ebf0",
  suave: "#9ba5b3",
  borde: "#3b4553",
  acento: "#73a9ff",
  acento2: "#fb923c",
  exito: "#4ade80",
  alerta: "#facc15",
  error: "#f87171",
  papel: "#3b3526",
  // Más claro que el fondo: un celular negro sobre fondo negro no se ve.
  marco: "#556070"
};
function variables(colores, oscuro) {
  return Object.entries(colores).map(([nombre, valor]) => {
    const publico = oscuro ? `var(--motor-${nombre}-oscuro, var(--motor-${nombre}, ${valor}))` : `var(--motor-${nombre}, ${valor})`;
    return `--ma-${nombre}: ${publico};`;
  }).join("\n    ");
}
var TEMAS = { claro: CLARO, oscuro: OSCURO };
var CSS_TEMA = `
.ma-raiz {
    ${variables(CLARO, false)}
    --ma-fuente: var(--motor-fuente, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
    --ma-fuente-mono: var(--motor-fuente-mono, ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace);
    color-scheme: light;
}
.ma-raiz[data-tema="oscuro"] {
    ${variables(OSCURO, true)}
    color-scheme: dark;
}
`;

// src/controles/estilos.js
var ESTILOS = `
${CSS_TEMA}

:host {
    display: block;
    position: relative;
}
:host([hidden]) {
    display: none;
}

.ma-raiz {
    container-type: inline-size;
    font-family: var(--ma-fuente);
    color: var(--ma-texto);
    background: var(--ma-fondo);
    border-radius: 12px;
    overflow: hidden;
}

.ma-lienzo {
    position: relative;
    outline: none;
}
.ma-lienzo:focus-visible {
    box-shadow: inset 0 0 0 3px var(--ma-acento);
}
.ma-lienzo svg {
    display: block;
    width: 100%;
    height: auto;
    font-family: var(--ma-fuente);
    user-select: none;
}

/* Los subt\xEDtulos van DEBAJO del dibujo y no encima: en un celular de 360px,
   encima tapar\xEDan la mitad de la escena. El alto m\xEDnimo es para que la p\xE1gina
   no salte cada vez que aparece o desaparece uno. */
.ma-subtitulo {
    min-height: 2.8em;
    padding: 0.35em 1em;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: clamp(15px, 2.4cqi, 28px);
    line-height: 1.35;
    text-wrap: balance;
}
.ma-raiz:not(.con-subtitulos) .ma-subtitulo {
    display: none;
}

/* ---- Controles ---- */
.ma-controles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    padding: 6px 8px 8px;
    border-top: 1px solid var(--ma-borde);
    background: var(--ma-superficie);
}
.ma-raiz.sin-controles .ma-controles {
    display: none;
}
.ma-controles button {
    min-width: 44px;
    height: 44px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ma-texto);
    font: 600 15px/1 var(--ma-fuente);
    cursor: pointer;
}
.ma-controles button:hover {
    background: color-mix(in srgb, var(--ma-acento) 14%, transparent);
}
.ma-controles button:focus-visible,
.ma-controles input:focus-visible {
    outline: 3px solid var(--ma-acento);
    outline-offset: 1px;
}
.ma-controles button[aria-pressed="false"] {
    opacity: 0.55;
}
.ma-controles svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
}
.ma-linea {
    position: relative;
    flex: 1 1 160px;
    min-width: 120px;
    display: flex;
    align-items: center;
    height: 44px;
}
.ma-linea input {
    width: 100%;
    margin: 0;
    accent-color: var(--ma-acento);
    cursor: pointer;
}
/* Una marquita por cap\xEDtulo sobre la barra. Es orientativa: la posici\xF3n exacta
   del "bot\xF3n" del range depende del navegador. */
.ma-marcas {
    position: absolute;
    inset: 0 8px;
    pointer-events: none;
}
.ma-marcas span {
    position: absolute;
    top: 8px;
    width: 2px;
    height: 7px;
    border-radius: 1px;
    background: var(--ma-suave);
}
.ma-tiempo {
    font: 500 14px/1 var(--ma-fuente);
    font-variant-numeric: tabular-nums;
    color: var(--ma-suave);
    white-space: nowrap;
    padding: 0 4px;
}
.ma-capitulo {
    flex: 1 1 100%;
    order: 10;
    font-size: 14px;
    color: var(--ma-suave);
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.ma-capitulo:empty {
    display: none;
}

/* En angosto (un celular), la barra de tiempo va sola en su rengl\xF3n y los
   botones abajo: no entran todos en 360px con un tama\xF1o que se pueda tocar. */
@container (max-width: 520px) {
    .ma-controles {
        gap: 0 2px;
    }
    /* 36px sigue siendo c\xF3modo para un dedo (el m\xEDnimo de WCAG es 24) y deja
       que los seis botones y el tiempo entren en un rengl\xF3n a 360px. */
    .ma-controles button {
        min-width: 36px;
        padding: 0 2px;
    }
    .ma-tiempo {
        font-size: 13px;
    }
    .ma-linea {
        flex-basis: 100%;
        order: -1;
    }
    .ma-tiempo {
        margin-right: auto;
    }
}

/* ---- Pantalla entera: la Expo, un televisor, un proyector ---- */
:host([pantalla]),
:host(:fullscreen) {
    position: fixed;
    inset: 0;
    z-index: 1000;
}
:host([pantalla]) .ma-raiz,
:host(:fullscreen) .ma-raiz {
    height: 100%;
    border-radius: 0;
    display: flex;
    flex-direction: column;
}
:host([pantalla]) .ma-lienzo,
:host(:fullscreen) .ma-lienzo {
    flex: 1 1 auto;
    min-height: 0;
}
:host([pantalla]) .ma-lienzo svg,
:host(:fullscreen) .ma-lienzo svg {
    height: 100%;
}

.ma-oculto {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
`;

// src/controles/componente.js
var registro = /* @__PURE__ */ new Map();
var esperando = /* @__PURE__ */ new Map();
function registrar(nombre, definicion) {
  registro.set(nombre, definicion);
  for (const elemento of esperando.get(nombre) ?? []) elemento.escena = definicion;
  esperando.delete(nombre);
}
var Base = (
  /** @type {typeof HTMLElement} */
  globalThis.HTMLElement ?? class {
  }
);
var ANCHO_ANGOSTO = 600;
var MotorEscena = class extends Base {
  static observedAttributes = ["escena", "tema", "movimiento", "velocidad", "loop", "sin-controles", "sin-subtitulos"];
  constructor() {
    super();
    const sombra = this.attachShadow({ mode: "open" });
    sombra.innerHTML = `
            <style>${ESTILOS}</style>
            <div class="ma-raiz con-subtitulos" part="raiz">
                <div class="ma-lienzo" tabindex="0">
                    <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ma-titulo" aria-describedby="ma-descripcion"></svg>
                </div>
                <div class="ma-subtitulo" part="subtitulo" aria-live="off"></div>
                <div class="ma-controles" role="group" aria-label="Controles de la animaci\xF3n"></div>
                <div class="ma-oculto" id="ma-titulo"></div>
                <div class="ma-oculto" id="ma-descripcion"></div>
            </div>`;
    this._raiz = /** @type {HTMLElement} */
    sombra.querySelector(".ma-raiz");
    this._lienzo = /** @type {HTMLElement} */
    sombra.querySelector(".ma-lienzo");
    this._svg = /** @type {SVGSVGElement} */
    sombra.querySelector("svg");
    this._subtitulo = /** @type {HTMLElement} */
    sombra.querySelector(".ma-subtitulo");
    this._titulo = /** @type {HTMLElement} */
    sombra.querySelector("#ma-titulo");
    this._descripcion = /** @type {HTMLElement} */
    sombra.querySelector("#ma-descripcion");
    this._definicion = null;
    this._compilada = null;
    this._pintor = null;
    this._disposicion = null;
    this._pausadoPorOcultar = false;
    this._limpiar = [];
    this._reloj = new Reloj({
      duracion: 0,
      alCambiar: (t) => this._pintar(t),
      alCambiarEstado: (corriendo) => this._barra.corriendo(corriendo)
    });
    this._barra = crearBarra(
      /** @type {HTMLElement} */
      sombra.querySelector(".ma-controles"),
      {
        alternar: () => this._alternarPorUsuario(),
        anterior: () => this.capituloAnterior(),
        siguiente: () => this.capituloSiguiente(),
        irA: (t) => this.irA(t),
        velocidad: (v) => this._cambiarVelocidad(v),
        subtitulos: (prendidos) => this._subtitulos(prendidos),
        pantalla: () => this._pantallaCompleta()
      }
    );
    this._lienzo.addEventListener("keydown", (e) => this._tecla(e));
    this._lienzo.addEventListener("click", () => this._alternarPorUsuario());
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
    const actuales = caps.filter((c) => c.t <= this.t - 1);
    this.irA(actuales.length ? actuales[actuales.length - 1].t : 0);
  }
  // ---------------- Ciclo de vida ----------------
  connectedCallback() {
    const medios = [
      matchMedia("(prefers-reduced-motion: reduce)"),
      matchMedia("(prefers-color-scheme: dark)")
    ];
    for (const m of medios) this._escuchar(m, "change", () => this._armar());
    const observador = new MutationObserver(() => this._aplicarTema());
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-tema", "class"] });
    this._limpiar.push(() => observador.disconnect());
    const medidor = new ResizeObserver(() => {
      if (this._disposicion !== this._calcularDisposicion().nombre) this._armar();
    });
    medidor.observe(this);
    this._limpiar.push(() => medidor.disconnect());
    const visor = new IntersectionObserver(([entrada]) => this._visible(entrada.isIntersecting));
    visor.observe(this);
    this._limpiar.push(() => visor.disconnect());
    this._escuchar(document, "visibilitychange", () => this._visible(!document.hidden));
    this._escuchar(this, "fullscreenchange", () => this._armar());
    this._aplicarAtributos();
    if (!this._definicion) this._buscarEscena();
    else this._armar();
  }
  disconnectedCallback() {
    this._reloj.pausar();
    for (const f of this._limpiar) f();
    this._limpiar = [];
  }
  attributeChangedCallback(nombre) {
    if (!this.isConnected) return;
    if (nombre === "escena") this._buscarEscena();
    else if (nombre === "movimiento" || nombre === "tema") this._armar();
    else this._aplicarAtributos();
  }
  // ---------------- Por dentro ----------------
  _escuchar(objetivo, evento, f) {
    objetivo.addEventListener(evento, f);
    this._limpiar.push(() => objetivo.removeEventListener(evento, f));
  }
  _buscarEscena() {
    const nombre = this.getAttribute("escena");
    if (!nombre) return;
    if (registro.has(nombre)) {
      this.escena = registro.get(nombre);
    } else {
      if (!esperando.has(nombre)) esperando.set(nombre, /* @__PURE__ */ new Set());
      esperando.get(nombre).add(this);
    }
  }
  _aplicarAtributos() {
    this._reloj.loop = this.hasAttribute("loop");
    const v = Number(this.getAttribute("velocidad"));
    if (v > 0) this._cambiarVelocidad(v);
    this._raiz.classList.toggle("sin-controles", this.hasAttribute("sin-controles"));
    this._subtitulos(!this.hasAttribute("sin-subtitulos"));
  }
  _calcularDisposicion() {
    const caja2 = this.getBoundingClientRect();
    const ancho = caja2.width || ANCHO_ANGOSTO;
    const alto = caja2.height || 0;
    const llena = this.hasAttribute("pantalla") || document.fullscreenElement === this;
    const angosta = llena ? alto > ancho : ancho < ANCHO_ANGOSTO;
    return { nombre: angosta ? "angosta" : "ancha", ancho, alto };
  }
  _movimiento() {
    const forzado = this.getAttribute("movimiento");
    if (forzado === "reducido" || forzado === "completo") return forzado;
    return matchMedia("(prefers-reduced-motion: reduce)").matches ? "reducido" : "completo";
  }
  _aplicarTema() {
    let tema = this.getAttribute("tema");
    if (tema !== "claro" && tema !== "oscuro") {
      const html = document.documentElement;
      const delSitio = html.dataset.theme ?? html.dataset.tema;
      if (delSitio === "dark" || delSitio === "oscuro") tema = "oscuro";
      else if (delSitio === "light" || delSitio === "claro") tema = "claro";
      else if (html.classList.contains("dark")) tema = "oscuro";
      else tema = matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
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
    this._titulo.textContent = compilada.titulo || "Animaci\xF3n";
    this._descripcion.textContent = textoAlternativo(compilada);
    this._barra.configurar(compilada);
    const yaEstaba = this._yaArrancado;
    this._yaArrancado = true;
    this._reloj.irA(Math.min(this._reloj.t, compilada.duracion));
    if (!yaEstaba && this.hasAttribute("autoplay")) this._reloj.reproducir();
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
  }
  // El error se muestra EN la escena y en la consola: quien está armando una
  // escena en una página suelta muchas veces no tiene la consola abierta.
  _mostrarError(error) {
    console.error(error);
    this._subtitulo.textContent = `\u26A0\uFE0F ${error.message}`;
    this._raiz.classList.add("con-subtitulos");
  }
  _alternarPorUsuario() {
    this._subtitulo.setAttribute("aria-live", "polite");
    this._pausadoPorOcultar = false;
    this._reloj.alternar();
  }
  _cambiarVelocidad(v) {
    this._reloj.cambiarVelocidad(v);
    this._barra.velocidad(v);
  }
  _subtitulos(prendidos) {
    this._raiz.classList.toggle("con-subtitulos", prendidos);
    this._barra.subtitulos(prendidos);
  }
  _pantallaCompleta() {
    if (document.fullscreenElement === this) document.exitFullscreen();
    else this.requestFullscreen?.().catch(() => {
    });
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
      " ": () => this._alternarPorUsuario(),
      k: () => this._alternarPorUsuario(),
      ArrowRight: () => this.capituloSiguiente(),
      ArrowLeft: () => this.capituloAnterior(),
      // Cuadro por cuadro, como en un editor de video.
      ".": () => {
        this.pausar();
        this.irA(this.t + paso);
      },
      ",": () => {
        this.pausar();
        this.irA(this.t - paso);
      },
      Home: () => this.irA(0),
      End: () => this.irA(this.duracion)
    };
    const accion = acciones[e.key];
    if (!accion) return;
    e.preventDefault();
    accion();
  }
};
function textoAlternativo(escena) {
  const partes = [];
  if (escena.descripcion) partes.push(escena.descripcion);
  if (escena.capitulos.length) {
    partes.push(`Cap\xEDtulos: ${escena.capitulos.map((c, i) => `${i + 1}. ${c.nombre}`).join("; ")}.`);
  }
  if (escena.subtitulos.length) {
    partes.push(`Lo que se cuenta: ${escena.subtitulos.map((s) => s.texto).join(" ")}`);
  }
  return partes.join(" ");
}
function definirComponente(nombre = "motor-escena") {
  if (typeof customElements === "undefined" || customElements.get(nombre)) return;
  customElements.define(nombre, MotorEscena);
}

// src/nucleo/azar.js
function azar(semilla = 1) {
  let a = typeof semilla === "string" ? hashTexto(semilla) : semilla >>> 0;
  function siguiente() {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  return {
    siguiente,
    /** Un número con coma entre min y max. */
    entre: (min, max) => min + siguiente() * (max - min),
    /** Un entero entre min y max, los dos incluidos. */
    entero: (min, max) => min + Math.floor(siguiente() * (max - min + 1)),
    /** Un elemento cualquiera de una lista. */
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)]
  };
}
function hashTexto(texto3) {
  let h = 2166136261;
  for (let i = 0; i < texto3.length; i++) {
    h ^= texto3.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// src/piezas/definir.js
var COMUNES = {
  x: 0,
  y: 0,
  escala: 1,
  rotacion: 0,
  opacidad: 1,
  // El id de otra pieza (un celular, por ejemplo) para dibujarse adentro,
  // con las coordenadas de esa pieza.
  dentro: null
};
function definirPieza(definicion) {
  if (!definicion.nombre) throw new Error("Una pieza necesita un nombre.");
  const tipo = { colores: [], ...definicion };
  const validas = /* @__PURE__ */ new Set([...Object.keys(COMUNES), ...Object.keys(definicion.predeterminados)]);
  function fabrica(props = {}) {
    for (const prop of Object.keys(props)) {
      if (!validas.has(prop)) {
        throw new Error(
          `Una ${tipo.nombre} no tiene "${prop}". Lo que se le puede poner es: ${[...validas].join(", ")}.`
        );
      }
    }
    const completas = { ...COMUNES, ...definicion.predeterminados, ...props };
    definicion.validar?.(completas);
    return { tipo, props: completas };
  }
  fabrica.tipo = tipo;
  return fabrica;
}

// src/piezas/caja.js
var caja = definirPieza({
  nombre: "caja",
  predeterminados: {
    ancho: 280,
    alto: 140,
    radio: 18,
    relleno: "superficie",
    borde: "borde",
    grosorBorde: 3,
    texto: "",
    color: "texto",
    tamano: 30,
    peso: 600,
    // Un emoji arriba del texto.
    icono: "",
    tamanoIcono: 56,
    // De 0 a 1: cuánto del texto ya se escribió.
    escrito: 1,
    // De 0 a 1: un anillo alrededor, para decir "mirá esta".
    resaltado: 0
  },
  colores: ["relleno", "borde", "color"],
  crear(grupo) {
    return {
      anillo: el("rect", { fill: "none", stroke: "var(--ma-acento)", "stroke-width": 6 }, grupo),
      fondo: el("rect", {}, grupo),
      icono: el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, grupo),
      texto: el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, grupo)
    };
  },
  actualizar(partes, p) {
    const { ancho: w, alto: h } = p;
    poner(partes.fondo, {
      x: -w / 2,
      y: -h / 2,
      width: w,
      height: h,
      rx: p.radio,
      fill: aCss(p.relleno),
      stroke: aCss(p.borde),
      "stroke-width": p.grosorBorde
    });
    const aire = 10;
    poner(partes.anillo, {
      x: -w / 2 - aire,
      y: -h / 2 - aire,
      width: w + 2 * aire,
      height: h + 2 * aire,
      rx: p.radio + aire,
      opacity: p.resaltado,
      visibility: p.resaltado > 0 ? null : "hidden"
    });
    const lineas = partirLineas(p.texto, Math.floor((w - 32) / (p.tamano * ANCHO_LETRA)));
    const altoTexto = p.texto ? lineas.length * p.tamano * 1.2 : 0;
    const altoIcono = p.icono ? p.tamanoIcono : 0;
    const hueco = p.icono && p.texto ? 10 : 0;
    const arriba = -(altoIcono + hueco + altoTexto) / 2;
    poner(partes.icono, {
      y: arriba + altoIcono / 2,
      "font-size": p.tamanoIcono,
      visibility: p.icono ? null : "hidden"
    });
    texto(partes.icono, p.icono);
    poner(partes.texto, { fill: aCss(p.color), "font-size": p.tamano, "font-weight": p.peso });
    renglones(partes.texto, revelar(lineas, p.escrito), {
      y: arriba + altoIcono + hueco + altoTexto / 2,
      tamano: p.tamano,
      interlineado: 1.2
    });
  },
  tamano: (p) => ({ ancho: p.ancho, alto: p.alto })
});

// src/piezas/texto.js
var ANCLAS = { inicio: "start", centro: "middle", fin: "end" };
var texto2 = definirPieza({
  nombre: "texto",
  predeterminados: {
    texto: "",
    tamano: 32,
    peso: 400,
    color: "texto",
    // Respecto de x: 'inicio' (x es el borde izquierdo), 'centro' o 'fin'.
    alineacion: "centro",
    // En unidades de la escena. 0: no partir (salvo donde el texto trae \n).
    anchoMax: 0,
    interlineado: 1.25,
    escrito: 1,
    // 'normal' o 'mono' (para código).
    fuente: "normal"
  },
  colores: ["color"],
  validar(p) {
    if (!(p.alineacion in ANCLAS)) {
      throw new Error(`La alineaci\xF3n de un texto es 'inicio', 'centro' o 'fin', no "${p.alineacion}".`);
    }
  },
  crear(grupo) {
    return { texto: el("text", { "dominant-baseline": "central" }, grupo) };
  },
  actualizar(partes, p) {
    poner(partes.texto, {
      fill: aCss(p.color),
      "font-size": p.tamano,
      "font-weight": p.peso,
      "text-anchor": ANCLAS[p.alineacion],
      "font-family": p.fuente === "mono" ? "var(--ma-fuente-mono)" : null
    });
    const lineas = partirLineas(p.texto, anchoEnLetras(p));
    renglones(partes.texto, revelar(lineas, p.escrito), { tamano: p.tamano, interlineado: p.interlineado });
  },
  // Estimado, no medido: ver por qué en partirLineas.
  tamano(p) {
    const lineas = partirLineas(p.texto, anchoEnLetras(p));
    const letras = Math.max(0, ...lineas.map((l) => Array.from(l).length));
    return { ancho: letras * p.tamano * ANCHO_LETRA, alto: lineas.length * p.tamano * p.interlineado };
  }
});
function anchoEnLetras(p) {
  return p.anchoMax > 0 ? Math.floor(p.anchoMax / (p.tamano * ANCHO_LETRA)) : 0;
}

// src/piezas/flecha.js
var flecha = definirPieza({
  nombre: "flecha",
  predeterminados: {
    // El id de una pieza, o un punto { x, y }.
    desde: null,
    hasta: null,
    // De 0 (no se ve) a 1 (dibujada entera).
    progreso: 1,
    // 0 es recta. Positivo se arquea a la derecha del camino; negativo, a la izquierda.
    curvatura: 0,
    separacion: 12,
    grosor: 5,
    color: "suave",
    punta: true,
    punteada: false,
    etiqueta: "",
    tamanoEtiqueta: 24,
    colorEtiqueta: "suave"
  },
  colores: ["color", "colorEtiqueta"],
  // Depende de dónde están las otras piezas, así que se recalcula siempre.
  dependeDeOtras: true,
  validar(p) {
    if (p.desde == null || p.hasta == null) throw new Error('Una flecha necesita "desde" y "hasta".');
    if (p.dentro != null) {
      throw new Error("Las flechas se dibujan sobre la escena, no dentro de otra pieza: engancharlas a piezas de adentro ya funciona.");
    }
  },
  crear(grupo) {
    return {
      linea: el("path", { fill: "none", "stroke-linecap": "round" }, grupo),
      punta: el("path", {}, grupo),
      etiqueta: el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 600 }, grupo)
    };
  },
  actualizar(partes, p, ctx) {
    const a = extremo(p.desde, ctx);
    const b = extremo(p.hasta, ctx);
    const curva2 = caminoFlecha(a, b, p.curvatura, p.separacion);
    const largos = medirCurva(curva2);
    const total = largos[largos.length - 1];
    const avance = limitar(p.progreso, 0, 1);
    const visible = avance > 0 && total > 0;
    const largoPunta = p.punta ? p.grosor * 3.2 : 0;
    const fLinea = limitar((avance * total - largoPunta * 0.7) / total, 0, 1);
    const tramo = cortarCurva(curva2, uParaFraccion(largos, fLinea));
    poner(partes.linea, {
      d: `M${n(tramo.p0.x)} ${n(tramo.p0.y)} Q${n(tramo.c.x)} ${n(tramo.c.y)} ${n(tramo.p1.x)} ${n(tramo.p1.y)}`,
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      "stroke-dasharray": p.punteada ? `${p.grosor * 2.4} ${p.grosor * 2}` : null,
      visibility: visible && fLinea > 0 ? null : "hidden"
    });
    const uPunta = uParaFraccion(largos, avance);
    const tip = puntoCurva(curva2, uPunta);
    const ang = anguloCurva(curva2, uPunta);
    const L = largoPunta;
    const W = p.grosor * 2.2;
    const base = { x: tip.x - Math.cos(ang) * L, y: tip.y - Math.sin(ang) * L };
    const nx = -Math.sin(ang) * W;
    const ny = Math.cos(ang) * W;
    poner(partes.punta, {
      d: `M${n(tip.x)} ${n(tip.y)} L${n(base.x + nx)} ${n(base.y + ny)} L${n(base.x - nx)} ${n(base.y - ny)} Z`,
      fill: aCss(p.color),
      visibility: visible && p.punta ? null : "hidden"
    });
    const medio = puntoCurva(curva2, 0.5);
    const angMedio = anguloCurva(curva2, 0.5);
    const ex = Math.sin(angMedio);
    const ey = -Math.cos(angMedio);
    const medioAncho = Array.from(p.etiqueta).length * p.tamanoEtiqueta * ANCHO_LETRA / 2;
    const corrimiento = p.tamanoEtiqueta * 0.5 + Math.abs(ex) * medioAncho + Math.abs(ey) * p.tamanoEtiqueta * 0.5;
    poner(partes.etiqueta, {
      x: medio.x + ex * corrimiento,
      y: medio.y + ey * corrimiento,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.colorEtiqueta),
      opacity: limitar((avance - 0.5) / 0.4, 0, 1),
      visibility: p.etiqueta && avance > 0.5 ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
function extremo(cual, ctx) {
  if (typeof cual === "string") {
    if (!ctx.estado.piezas[cual]) throw new Error(`La flecha apunta a "${cual}", y no hay ninguna pieza que se llame as\xED.`);
    return posicionAbsoluta(cual, ctx.estado, ctx.tipos);
  }
  return { x: cual.x, y: cual.y };
}
function n(v) {
  return Math.round(v * 100) / 100;
}

// src/piezas/tabla.js
var tabla = definirPieza({
  nombre: "tabla",
  predeterminados: {
    columnas: [],
    filas: [],
    // El ancho de cada columna. Si no se dice, se reparte `ancho` en partes iguales.
    anchos: null,
    ancho: 640,
    altoFila: 56,
    tamano: 24,
    filasVisibles: Infinity,
    // El índice de una fila para destacarla (-1: ninguna).
    resaltarFila: -1,
    relleno: "superficie",
    borde: "borde",
    encabezado: "acento",
    colorEncabezado: "fondo",
    color: "texto"
  },
  colores: ["relleno", "borde", "encabezado", "colorEncabezado", "color"],
  validar(p) {
    if (!Array.isArray(p.columnas) || p.columnas.length === 0) {
      throw new Error('Una tabla necesita sus columnas: columnas: ["Nombre", "DNI"].');
    }
  },
  crear(grupo) {
    return { grupo, forma: "", filas: [] };
  },
  actualizar(partes, p) {
    const anchos = p.anchos ?? p.columnas.map(() => p.ancho / p.columnas.length);
    const total = anchos.reduce((a, b) => a + b, 0);
    const izq = -total / 2;
    const arriba = -((p.filas.length + 1) * p.altoFila) / 2;
    const forma = `${p.columnas.length}x${p.filas.length}`;
    if (partes.forma !== forma) {
      partes.grupo.replaceChildren();
      partes.filas = [];
      for (let i = 0; i <= p.filas.length; i++) {
        const g = el("g", {}, partes.grupo);
        const fondo = el("rect", {}, g);
        const celdas = p.columnas.map(() => el("text", { "dominant-baseline": "central" }, g));
        partes.filas.push({ g, fondo, celdas });
      }
      partes.forma = forma;
    }
    partes.filas.forEach((fila, i) => {
      const esEncabezado = i === 0;
      const datos = esEncabezado ? p.columnas : p.filas[i - 1];
      const visible = esEncabezado ? 1 : limitar(p.filasVisibles - (i - 1), 0, 1);
      const y = arriba + i * p.altoFila;
      poner(fila.g, {
        opacity: visible,
        // Las filas nuevas entran desde un poco más abajo.
        transform: `translate(0 ${Math.round((1 - visible) * 16 * 100) / 100})`,
        visibility: visible > 0 ? null : "hidden"
      });
      const resaltada = !esEncabezado && Math.round(p.resaltarFila) === i - 1;
      poner(fila.fondo, {
        x: izq,
        y,
        width: total,
        height: p.altoFila,
        fill: esEncabezado ? aCss(p.encabezado) : resaltada ? `color-mix(in srgb, ${aCss("acento")} 22%, ${aCss(p.relleno)})` : aCss(p.relleno),
        stroke: aCss(p.borde),
        "stroke-width": 2
      });
      let x = izq;
      fila.celdas.forEach((celda, j) => {
        poner(celda, {
          x: x + 16,
          y: y + p.altoFila / 2,
          "font-size": p.tamano,
          "font-weight": esEncabezado || resaltada ? 700 : 400,
          fill: esEncabezado ? aCss(p.colorEncabezado) : aCss(p.color)
        });
        texto(celda, String(datos?.[j] ?? ""));
        x += anchos[j];
      });
    });
  },
  tamano(p) {
    const anchos = p.anchos ?? p.columnas.map(() => p.ancho / p.columnas.length);
    return { ancho: anchos.reduce((a, b) => a + b, 0), alto: (p.filas.length + 1) * p.altoFila };
  }
});

// src/piezas/celular.js
var PANTALLA_ANCHO = 360;
var PANTALLA_ALTO = 740;
var BISEL = 16;
var CUERPO_ANCHO = PANTALLA_ANCHO + 2 * BISEL;
var CUERPO_ALTO = PANTALLA_ALTO + 2 * BISEL;
var BARRA = 40;
var ENCABEZADO = 64;
var celular = definirPieza({
  nombre: "celular",
  predeterminados: {
    // Cuánto mide de alto en la escena. El ancho sale de la proporción.
    alto: 640,
    // Si tiene, la barra de la aplicación arriba de todo.
    titulo: "",
    hora: "18:30",
    pantalla: "superficie",
    marco: "marco",
    barraTitulo: "acento",
    colorTitulo: "fondo"
  },
  colores: ["pantalla", "marco", "barraTitulo", "colorTitulo"],
  crear(grupo) {
    const cuerpo = el("g", {}, grupo);
    const recorte = idUnico("ma-pantalla");
    const clip = el("clipPath", { id: recorte }, el("defs", {}, cuerpo));
    el("rect", { x: 0, y: 0, width: PANTALLA_ANCHO, height: PANTALLA_ALTO, rx: 30 }, clip);
    const marco = el("rect", { x: 0, y: 0, width: CUERPO_ANCHO, height: CUERPO_ALTO, rx: 46 }, cuerpo);
    const pantalla = el("g", { transform: `translate(${BISEL} ${BISEL})`, "clip-path": `url(#${recorte})` }, cuerpo);
    const fondo = el("rect", { x: 0, y: 0, width: PANTALLA_ANCHO, height: PANTALLA_ALTO }, pantalla);
    const barraApp = el("rect", { x: 0, y: BARRA, width: PANTALLA_ANCHO, height: ENCABEZADO }, pantalla);
    const titulo = el("text", {
      x: 20,
      y: BARRA + ENCABEZADO / 2,
      "dominant-baseline": "central",
      "font-size": 24,
      "font-weight": 700
    }, pantalla);
    const hora = el("text", { x: 26, y: BARRA / 2 + 2, "dominant-baseline": "central", "font-size": 15, "font-weight": 600 }, pantalla);
    const iconos = el("g", { transform: `translate(${PANTALLA_ANCHO - 70} ${BARRA / 2 - 6})` }, pantalla);
    [4, 7, 10].forEach((h, i) => el("rect", { x: i * 6, y: 12 - h, width: 4, height: h, rx: 1 }, iconos));
    el("rect", { x: 24, y: 0, width: 24, height: 12, rx: 3, fill: "none", "stroke-width": 1.5 }, iconos);
    el("rect", { x: 26.5, y: 2.5, width: 15, height: 7, rx: 1.5 }, iconos);
    const contenido = el("g", {}, pantalla);
    const camara = el("rect", { x: CUERPO_ANCHO / 2 - 40, y: BISEL + 10, width: 80, height: 18, rx: 9 }, cuerpo);
    return { cuerpo, marco, fondo, barraApp, titulo, hora, iconos, contenido, camara };
  },
  actualizar(partes, p) {
    const k = p.alto / CUERPO_ALTO;
    poner(partes.cuerpo, { transform: `scale(${k}) translate(${-CUERPO_ANCHO / 2} ${-CUERPO_ALTO / 2})` });
    poner(partes.marco, { fill: aCss(p.marco) });
    poner(partes.camara, { fill: aCss(p.marco) });
    poner(partes.fondo, { fill: aCss(p.pantalla) });
    const conTitulo = p.titulo !== "";
    poner(partes.barraApp, { fill: aCss(p.barraTitulo), visibility: conTitulo ? null : "hidden" });
    poner(partes.titulo, { fill: aCss(p.colorTitulo), visibility: conTitulo ? null : "hidden" });
    texto(partes.titulo, p.titulo);
    poner(partes.hora, { fill: "var(--ma-texto)" });
    texto(partes.hora, p.hora);
    poner(partes.iconos, { fill: "var(--ma-texto)", stroke: "var(--ma-texto)" });
  },
  tamano: (p) => ({ ancho: p.alto * CUERPO_ANCHO / CUERPO_ALTO, alto: p.alto }),
  contenedor: (partes) => partes.contenido,
  // El (0, 0) de lo que va adentro es la esquina de arriba a la izquierda de
  // la pantalla, y una unidad es un "pixel de celular".
  origenContenedor(p) {
    const k = p.alto / CUERPO_ALTO;
    return { x: (BISEL - CUERPO_ANCHO / 2) * k, y: (BISEL - CUERPO_ALTO / 2) * k, escala: k };
  }
});
var PANTALLA = { ancho: PANTALLA_ANCHO, alto: PANTALLA_ALTO, arriba: BARRA, debajoDelTitulo: BARRA + ENCABEZADO };

// src/index.js
var version = "0.1.0";
definirComponente();
export {
  COMUNES,
  MotorEscena,
  PANTALLA,
  Reloj,
  TEMAS,
  TOKENS,
  aCss,
  azar,
  caja,
  caminoFlecha,
  celular,
  compilar,
  crearPintor,
  curva,
  curvas,
  definirComponente,
  definirPieza,
  duracionLectura,
  el,
  flecha,
  interpolar,
  limitar,
  mezclarColores,
  partirLineas,
  poner,
  posicionAbsoluta,
  registrar,
  renglones,
  revelar,
  tabla,
  texto2 as texto,
  version
};

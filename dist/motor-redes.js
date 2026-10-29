// src/piezas/definir.js
var COMUNES = {
  x: 0,
  y: 0,
  escala: 1,
  rotacion: 0,
  opacidad: 1,
  // El id de otra pieza (un celular, por ejemplo) para dibujarse adentro,
  // con las coordenadas de esa pieza.
  dentro: null,
  // Pegarse a un costado de otra pieza y seguirla si se mueve o crece:
  // { a: 'id', lado: 'derecha' | 'izquierda' | 'arriba' | 'abajo' | 'centro',
  //   separacion, alinear: 'centro' | 'inicio' | 'fin', dx, dy }.
  pegar: null,
  // Cuánto manda el pegar sobre x e y (de 0 a 1): animándolo, se despega
  // (o se pega) de a poco.
  pegado: 1
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
function redondear(n) {
  return String(Math.round(n * 100) / 100);
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
  const total = lineas.reduce((n, l) => n + largo(l), 0);
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

// src/nucleo/interpolar.js
function limitar(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

// src/redes/piezas.js
var HALO = { "paint-order": "stroke", stroke: "var(--ma-fondo)", "stroke-width": 6, "stroke-linejoin": "round" };
var secuencia = definirPieza({
  nombre: "secuencia",
  predeterminados: {
    // Nombres, o { texto, icono }.
    extremos: [],
    // { de, a, sale, llega, texto, color, perdido (de 0 a 1: dónde se pierde), punteada }. de y a: índices de extremos.
    mensajes: [],
    // { extremo, t, texto, color }: un estado o un comentario al costado de una línea, desde el instante t.
    notas: [],
    // { extremo, desde, hasta, texto, color }: un timer, como una barra al costado de la línea.
    intervalos: [],
    tiempo: 0,
    // El tiempo que entra en el alto. null: lo que dura el último mensaje.
    duracion: null,
    ancho: 1100,
    alto: 700,
    tamano: 22,
    // Un mensaje para destacar (su índice; −1: ninguno).
    resaltar: -1,
    color: "texto",
    colorLinea: "borde",
    colorMensaje: "acento",
    colorResaltado: "acento2",
    relleno: "superficie",
    // Una regla de tiempo a la izquierda.
    regla: false,
    // Dónde va el nombre de cada mensaje: 'medio' (girado, sobre la flecha) u
    // 'origen' (derecho, al lado de donde sale). Con muchos mensajes seguidos,
    // como en una ventana deslizante, 'origen' no se pisa.
    rotulos: "medio"
  },
  colores: ["color", "colorLinea", "colorMensaje", "colorResaltado", "relleno"],
  validar(p) {
    if (p.extremos.length < 2) throw new Error('Un diagrama de secuencia necesita al menos dos extremos: ["Cliente", "Servidor"].');
    p.mensajes.forEach((m, i) => {
      for (const k of ["de", "a"]) {
        if (!(m[k] >= 0 && m[k] < p.extremos.length)) throw new Error(`El mensaje ${i} tiene ${k}: ${m[k]}, y los extremos van de 0 a ${p.extremos.length - 1}.`);
      }
      if (!(m.llega > m.sale)) throw new Error(`El mensaje ${i} tiene que llegar despu\xE9s de salir (llega > sale).`);
    });
  },
  crear(grupo) {
    return {
      regla: el("g", {}, grupo),
      lineas: el("g", {}, grupo),
      intervalos: el("g", {}, grupo),
      mensajes: el("g", { fill: "none", "stroke-linecap": "round" }, grupo),
      notas: el("g", {}, grupo)
    };
  },
  actualizar(partes, p) {
    const g = geometriaSecuencia(p);
    const extremos = p.extremos.map((e) => typeof e === "object" ? e : { texto: e });
    reusar(partes.lineas, extremos.length, (n) => {
      el("line", { "stroke-width": 3, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, n);
      el("rect", { rx: 12 }, n);
      el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 700 }, n);
    });
    const espacio = extremos.length > 1 ? (g.x(1) - g.x(0)) * 0.94 : p.ancho;
    extremos.forEach((e, i) => {
      const [linea, caja, nombre] = hijos(partes.lineas.childNodes[i]);
      const x = g.x(i);
      const rotulo = `${e.icono ? `${e.icono} ` : ""}${e.texto}`;
      const tamNombre = Math.min(p.tamano * 1.1, (espacio - 20) / (Array.from(rotulo).length * ANCHO_LETRA));
      const anchoCaja = Math.min(espacio, Math.max(140, Array.from(rotulo).length * tamNombre * ANCHO_LETRA + 36));
      poner(linea, { x1: x, x2: x, y1: g.arriba + g.cabecera / 2, y2: g.abajo, stroke: aCss(p.colorLinea) });
      poner(caja, { x: x - anchoCaja / 2, y: g.arriba, width: anchoCaja, height: g.cabecera, fill: aCss(p.relleno), stroke: aCss(p.colorLinea), "stroke-width": 2.5 });
      poner(nombre, { x, y: g.arriba + g.cabecera / 2, "font-size": r(tamNombre), fill: aCss(p.color) });
      texto(nombre, rotulo);
    });
    const marcas2 = p.regla ? Math.floor(g.duracion) + 1 : 0;
    reusar(partes.regla, marcas2, (n) => el("text", { "text-anchor": "end", "dominant-baseline": "central" }, n));
    for (let k = 0; k < marcas2; k++) {
      const [t] = hijos(partes.regla.childNodes[k]);
      poner(t, { x: g.izq - 14, y: g.y(k), "font-size": p.tamano * 0.75, fill: aCss("suave"), opacity: p.tiempo >= k ? 1 : 0.35 });
      texto(t, `t${k}`);
    }
    reusar(partes.intervalos, p.intervalos.length, (n) => {
      el("path", { fill: "none", "stroke-width": 3 }, n);
      el("text", { "dominant-baseline": "central", "font-weight": 600, ...HALO }, n);
    });
    p.intervalos.forEach((iv, i) => {
      const [barra, rot] = hijos(partes.intervalos.childNodes[i]);
      const lado = iv.extremo === 0 ? -1 : 1;
      const x = g.x(iv.extremo) + lado * 18;
      const hasta = Math.min(iv.hasta, p.tiempo);
      const visible = p.tiempo > iv.desde;
      const y0 = g.y(iv.desde);
      const y1 = g.y(hasta);
      poner(barra, {
        d: `M${x - lado * 6} ${y0}H${x}V${y1}${p.tiempo >= iv.hasta ? `H${x - lado * 6}` : ""}`,
        stroke: aCss(iv.color ?? "alerta"),
        visibility: visible ? null : "hidden"
      });
      poner(rot, {
        x: x + lado * 8,
        y: (y0 + y1) / 2,
        "text-anchor": lado < 0 ? "end" : "start",
        "font-size": p.tamano * 0.8,
        fill: aCss(iv.color ?? "alerta"),
        visibility: visible && iv.texto ? null : "hidden"
      });
      texto(rot, iv.texto ?? "");
    });
    reusar(partes.mensajes, p.mensajes.length, (n) => {
      el("path", {}, n);
      el("path", { stroke: "none" }, n);
      el("text", { "text-anchor": "middle", "font-weight": 700, ...HALO, stroke: "var(--ma-fondo)" }, n);
      el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 800 }, n);
    });
    p.mensajes.forEach((m, i) => {
      const [linea, punta, rot, cruz] = hijos(partes.mensajes.childNodes[i]);
      const destacado = i === p.resaltar;
      const color = aCss(destacado ? p.colorResaltado : m.color ?? p.colorMensaje);
      const a = { x: g.x(m.de), y: g.y(m.sale) };
      const b = { x: g.x(m.a), y: g.y(m.llega) };
      const sentido = Math.sign(b.x - a.x) || 1;
      a.x += sentido * 6;
      b.x -= sentido * 6;
      const hastaDonde = m.perdido ? limitar(m.perdido, 0.1, 0.95) : 1;
      const avance = limitar((p.tiempo - m.sale) / (m.llega - m.sale), 0, hastaDonde);
      const fin = { x: a.x + (b.x - a.x) * avance, y: a.y + (b.y - a.y) * avance };
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const grosor = destacado ? 4.5 : 3.2;
      const L = grosor * 3.6;
      const W = grosor * 2.2;
      const llego = avance >= hastaDonde;
      const visible = avance > 0;
      poner(linea, {
        d: `M${r(a.x)} ${r(a.y)}L${r(fin.x - (m.perdido ? 0 : Math.cos(ang) * L * 0.6 * Math.min(1, avance * 4)))} ${r(fin.y - (m.perdido ? 0 : Math.sin(ang) * L * 0.6 * Math.min(1, avance * 4)))}`,
        stroke: color,
        "stroke-width": grosor,
        "stroke-dasharray": m.punteada ? "10 8" : null,
        visibility: visible ? null : "hidden"
      });
      const bx = fin.x - Math.cos(ang) * L;
      const by = fin.y - Math.sin(ang) * L;
      poner(punta, {
        d: `M${r(fin.x)} ${r(fin.y)}L${r(bx - Math.sin(ang) * W)} ${r(by + Math.cos(ang) * W)}L${r(bx + Math.sin(ang) * W)} ${r(by - Math.cos(ang) * W)}Z`,
        fill: color,
        visibility: visible && !m.perdido ? null : "hidden"
      });
      const largoFlecha = Math.hypot(b.x - a.x, b.y - a.y);
      const letras = Array.from(m.texto ?? "").length || 1;
      if (p.rotulos === "origen") {
        const tam = Math.min(p.tamano, Math.abs(b.x - a.x) * 0.42 / (letras * ANCHO_LETRA));
        poner(rot, {
          // Apenas arriba de la flecha: si no, la línea lo tacha.
          x: r(a.x + sentido * 8),
          y: r(a.y - Math.max(3, tam * 0.2)),
          transform: null,
          "text-anchor": sentido > 0 ? "start" : "end",
          "font-size": r(tam),
          fill: color,
          visibility: m.texto && avance > 0 ? null : "hidden"
        });
      } else {
        const tam = Math.min(p.tamano, largoFlecha * 0.85 / (letras * ANCHO_LETRA * 1.1));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        let grados = ang * 180 / Math.PI;
        if (grados > 90) grados -= 180;
        if (grados < -90) grados += 180;
        const gr = grados * Math.PI / 180;
        const tx = mx + Math.sin(gr) * tam * 0.6;
        const ty = my - Math.cos(gr) * tam * 0.6;
        poner(rot, {
          x: r(tx),
          y: r(ty),
          transform: `rotate(${grados.toFixed(1)} ${r(tx)} ${r(ty)})`,
          "text-anchor": "middle",
          "font-size": r(tam),
          fill: color,
          visibility: m.texto && avance >= Math.min(0.5, hastaDonde * 0.8) ? null : "hidden"
        });
      }
      texto(rot, m.texto ?? "");
      poner(cruz, {
        x: fin.x,
        y: fin.y,
        "font-size": p.tamano * 1.6,
        fill: aCss("error"),
        visibility: m.perdido && llego ? null : "hidden"
      });
      texto(cruz, "\u2717");
    });
    reusar(partes.notas, p.notas.length, (n) => el("text", { "dominant-baseline": "central", "font-weight": 600, ...HALO }, n));
    p.notas.forEach((nota, i) => {
      const [t] = hijos(partes.notas.childNodes[i]);
      const ultimo = nota.extremo === extremos.length - 1;
      const primero = nota.extremo === 0;
      const lado = primero ? -1 : ultimo ? 1 : 1;
      poner(t, {
        x: g.x(nota.extremo) + lado * 18,
        y: g.y(nota.t),
        "text-anchor": lado < 0 ? "end" : "start",
        "font-size": p.tamano * 0.82,
        fill: aCss(nota.color ?? "suave"),
        opacity: limitar((p.tiempo - nota.t) * 4, 0, 1),
        visibility: p.tiempo >= nota.t ? null : "hidden"
      });
      texto(t, nota.texto);
    });
  },
  tamano: (p) => ({ ancho: p.ancho, alto: p.alto })
});
function geometriaSecuencia(p) {
  const duracion = p.duracion ?? Math.max(1, ...p.mensajes.map((m) => m.llega), ...p.notas.map((n2) => n2.t));
  const n = p.extremos.length;
  const cabecera = p.tamano * 2.4;
  const arriba = -p.alto / 2;
  const abajo = p.alto / 2;
  const inicio = arriba + cabecera + p.tamano * 0.9;
  const fin = abajo - p.tamano * 0.6;
  const margen = Math.min(p.ancho * (n > 3 ? 0.08 : 0.2), 220);
  const izq = -p.ancho / 2 + margen;
  const der = p.ancho / 2 - margen;
  return {
    duracion,
    cabecera,
    arriba,
    abajo,
    izq,
    x: (i) => n === 1 ? 0 : izq + (der - izq) * i / (n - 1),
    y: (t) => inicio + (fin - inicio) * t / duracion
  };
}
var direccionIp = definirPieza({
  nombre: "direccionIp",
  predeterminados: {
    // Lo que dice a la izquierda: "IP", "Máscara", "Red".
    rotulo: "",
    decimal: "0.0.0.0",
    // Los 32 bits, como '11000000.10101000...'. Vacío: se calculan del decimal.
    bits: "",
    prefijo: 24,
    // De 0 a 1.
    verBits: 1,
    verMascara: 0,
    tamano: 30,
    ancho: 1200,
    color: "texto",
    colorRed: "acento",
    colorHost: "acento2",
    resaltado: 0
  },
  colores: ["color", "colorRed", "colorHost"],
  crear(grupo) {
    return {
      fondo: el("rect", { rx: 10, fill: "var(--ma-superficie)", "stroke-width": 3 }, grupo),
      rotulo: el("text", { "dominant-baseline": "central", "font-weight": 700, "text-anchor": "start" }, grupo),
      decimal: el("text", { "dominant-baseline": "central", "font-weight": 700, "text-anchor": "start", "font-family": "var(--ma-fuente-mono)" }, grupo),
      bits: el("text", { "dominant-baseline": "central", "text-anchor": "middle", "font-family": "var(--ma-fuente-mono)" }, grupo),
      corte: el("line", { "stroke-width": 3, "stroke-dasharray": "6 5" }, grupo)
    };
  },
  actualizar(partes, p) {
    const bits = p.bits || bitsDe(p.decimal);
    const izq = -p.ancho / 2;
    const tam = p.tamano;
    poner(partes.fondo, {
      x: izq - 14,
      y: apiladoFondo(p).y,
      width: p.ancho + 28,
      height: apiladoFondo(p).alto,
      stroke: "var(--ma-acento2)",
      opacity: p.resaltado,
      visibility: p.resaltado > 0 ? null : "hidden"
    });
    poner(partes.rotulo, { x: izq, y: 0, "font-size": tam * 0.85, fill: aCss("suave") });
    texto(partes.rotulo, p.rotulo);
    const apilado = p.ancho < 900;
    const xDecimal = izq + p.ancho * (apilado ? 0.3 : 0.15);
    const xBits = apilado ? izq : izq + p.ancho * 0.42;
    const yDecimal = apilado ? -tam * 0.55 : 0;
    const yBits = apilado ? tam * 0.6 : 0;
    poner(partes.rotulo, { y: yDecimal });
    poner(partes.decimal, { x: xDecimal, y: yDecimal, "font-size": tam, fill: aCss(p.color) });
    texto(partes.decimal, p.decimal);
    const tamBits = Math.min(tam * 0.92, (p.ancho - (xBits - izq)) / (35 * 0.6));
    const corteChar = p.prefijo + Math.floor(Math.max(p.prefijo - 1, 0) / 8);
    const enRed = bits.slice(0, corteChar);
    const enHost = bits.slice(corteChar);
    if (!partes.bits.firstChild) {
      el("tspan", {}, partes.bits);
      el("tspan", {}, partes.bits);
    }
    const [tRed, tHost] = hijos(partes.bits);
    const m = limitar(p.verMascara, 0, 1);
    poner(partes.bits, { x: xBits, y: yBits, "font-size": tamBits, opacity: limitar(p.verBits, 0, 1), visibility: p.verBits > 0 ? null : "hidden" });
    poner(tRed, { fill: m > 0 ? aCss(p.colorRed) : aCss(p.color), "font-weight": m > 0.5 ? 700 : 400 });
    poner(tHost, { fill: m > 0 ? aCss(p.colorHost) : aCss(p.color), "font-weight": m > 0.5 ? 700 : 400 });
    texto(tRed, enRed);
    texto(tHost, enHost);
    const paso = tamBits * 0.6;
    const lugares = (desde, n) => Array.from({ length: n }, (_, i) => Math.round((xBits + (desde + i + 0.5) * paso) * 100) / 100).join(" ");
    poner(tRed, { x: lugares(0, Array.from(enRed).length) });
    poner(tHost, { x: lugares(Array.from(enRed).length, Array.from(enHost).length) });
    const xCorte = xBits + (corteChar + (enHost.startsWith(".") ? 0.5 : 0)) * paso;
    poner(partes.corte, {
      x1: xCorte,
      x2: xCorte,
      y1: yBits - tamBits * 0.8,
      y2: yBits + tamBits * 0.8,
      stroke: aCss(p.colorHost),
      opacity: m * limitar(p.verBits, 0, 1),
      visibility: m > 0 && p.verBits > 0 ? null : "hidden"
    });
  },
  tamano: (p) => ({ ancho: p.ancho, alto: apiladoFondo(p).alto })
});
function apiladoFondo(p) {
  return p.ancho < 900 ? { y: -p.tamano * 1.3, alto: p.tamano * 2.6 } : { y: -p.tamano * 0.95, alto: p.tamano * 1.9 };
}
function bitsDe(decimal) {
  return String(decimal).split(".").map((o) => Number(o).toString(2).padStart(8, "0")).join(".");
}
var ventanaDeslizante = definirPieza({
  nombre: "ventanaDeslizante",
  predeterminados: {
    cantidad: 8,
    // El primero que todavía no se confirmó, y el tamaño de la ventana.
    base: 0,
    ventana: 4,
    // El próximo que se va a mandar (los de base a siguiente − 1 están en viaje).
    siguiente: 0,
    // Números confirmados aunque estén después de base (Selective Repeat).
    confirmados: [],
    lado: 64,
    tamano: 26,
    rotulo: "",
    colorConfirmado: "exito",
    colorEnviado: "alerta",
    colorDisponible: "acento"
  },
  colores: ["colorConfirmado", "colorEnviado", "colorDisponible"],
  crear(grupo) {
    return {
      rotulo: el("text", { "dominant-baseline": "central", "text-anchor": "end", "font-weight": 700 }, grupo),
      celdas: el("g", {}, grupo),
      corchete: el("rect", { fill: "none", "stroke-width": 4, rx: 12 }, grupo)
    };
  },
  actualizar(partes, p) {
    const izq = -(p.cantidad * p.lado) / 2;
    poner(partes.rotulo, { x: izq - 18, y: 0, "font-size": p.tamano * 0.85, fill: aCss("suave") });
    texto(partes.rotulo, p.rotulo);
    const confirmados = new Set(p.confirmados);
    reusar(partes.celdas, p.cantidad, (n) => {
      el("rect", { rx: 8, "stroke-width": 2.5 }, n);
      el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 700 }, n);
    });
    const base = Math.floor(p.base + 1e-6);
    for (let i = 0; i < p.cantidad; i++) {
      const [rect, num] = hijos(partes.celdas.childNodes[i]);
      const estado = i < base || confirmados.has(i) ? p.colorConfirmado : i < p.siguiente ? p.colorEnviado : i < base + p.ventana ? p.colorDisponible : null;
      const x = izq + i * p.lado;
      poner(rect, {
        x: x + 4,
        y: -p.lado / 2 + 4,
        width: p.lado - 8,
        height: p.lado - 8,
        fill: estado ? `color-mix(in srgb, ${aCss(estado)} 28%, var(--ma-superficie))` : "var(--ma-superficie)",
        stroke: estado ? aCss(estado) : "var(--ma-borde)"
      });
      poner(num, { x: x + p.lado / 2, y: 0, "font-size": p.tamano, fill: estado ? "var(--ma-texto)" : "var(--ma-suave)" });
      texto(num, String(i));
    }
    const ancho = Math.min(p.ventana, Math.max(p.cantidad - p.base, 0)) * p.lado;
    poner(partes.corchete, {
      x: izq + p.base * p.lado - 2,
      y: -p.lado / 2 - 4,
      width: Math.max(ancho + 4, 0),
      height: p.lado + 8,
      stroke: "var(--ma-acento)",
      visibility: ancho > 0 ? null : "hidden"
    });
  },
  tamano: (p) => ({ ancho: p.cantidad * p.lado, alto: p.lado })
});
function reusar(grupo, cuantos, armar) {
  while (grupo.childNodes.length > cuantos) grupo.lastChild.remove();
  while (grupo.childNodes.length < cuantos) armar(el("g", {}, grupo));
}
function hijos(nodo) {
  return (
    /** @type {Element[]} */
    [...nodo.childNodes]
  );
}
function r(v) {
  return Math.round(v * 100) / 100;
}

// src/redes/calculo.js
function analizarIp(texto3, prefijo) {
  const [direccion, barra] = String(texto3).trim().split("/");
  const p = prefijo ?? (barra === void 0 ? null : Number(barra));
  const octetos = direccion.split(".").map(Number);
  if (octetos.length !== 4 || octetos.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
    throw new Error(`"${direccion}" no es una direcci\xF3n IPv4: son cuatro n\xFAmeros de 0 a 255 separados por puntos.`);
  }
  const clase = claseDe(octetos[0]);
  const prefijoFinal = p ?? clase.prefijo;
  if (!(Number.isInteger(prefijoFinal) && prefijoFinal >= 0 && prefijoFinal <= 32)) {
    throw new Error(`El prefijo tiene que ser un entero de 0 a 32, no "${p}".`);
  }
  const ip = aNumero(octetos);
  const mascara = prefijoFinal === 0 ? 0 : 4294967295 << 32 - prefijoFinal >>> 0;
  const red = (ip & mascara) >>> 0;
  const broadcast = (red | ~mascara >>> 0) >>> 0;
  const bitsHost = 32 - prefijoFinal;
  const hosts = bitsHost >= 2 ? 2 ** bitsHost - 2 : bitsHost === 1 ? 2 : 1;
  const primero = bitsHost >= 2 ? red + 1 : red;
  const ultimo = bitsHost >= 2 ? broadcast - 1 : broadcast;
  return {
    direccion: aTexto(ip),
    prefijo: prefijoFinal,
    mascara: aTexto(mascara),
    red: aTexto(red),
    broadcast: aTexto(broadcast),
    primero: aTexto(primero),
    ultimo: aTexto(ultimo),
    hosts,
    bitsHost,
    clase: clase.letra,
    prefijoDeClase: clase.prefijo,
    privada: esPrivada(
      /** @type {[number, number]} */
      [octetos[0], octetos[1]]
    ),
    bits: { direccion: aBits(ip), mascara: aBits(mascara), red: aBits(red), broadcast: aBits(broadcast) },
    esRed: ip === red,
    esBroadcast: ip === broadcast
  };
}
function dividirEnSubredes(bloque, cuantas) {
  const b = analizarIp(bloque);
  const bitsSubred = Math.ceil(Math.log2(Math.max(cuantas, 1)));
  const prefijo = b.prefijo + bitsSubred;
  if (prefijo > 30) throw new Error(`No entran ${cuantas} subredes en un /${b.prefijo}: quedar\xEDan sin lugar para hosts.`);
  const salto = 2 ** (32 - prefijo);
  const base = aNumero(b.red.split(".").map(Number));
  const subredes = [];
  for (let i = 0; i < 2 ** bitsSubred; i++) subredes.push(analizarIp(`${aTexto(base + i * salto)}/${prefijo}`));
  return { prefijo, mascara: analizarIp(`0.0.0.0/${prefijo}`).mascara, bitsSubred, subredes, hostsPorSubred: subredes[0].hosts };
}
function claseDe(primero) {
  if (primero < 128) return { letra: "A", prefijo: 8 };
  if (primero < 192) return { letra: "B", prefijo: 16 };
  if (primero < 224) return { letra: "C", prefijo: 24 };
  if (primero < 240) return { letra: "D", prefijo: 32 };
  return { letra: "E", prefijo: 32 };
}
function esPrivada([a, b]) {
  return a === 10 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168;
}
function aNumero(o) {
  return (o[0] << 24 | o[1] << 16 | o[2] << 8 | o[3]) >>> 0;
}
function aTexto(n) {
  return [n >>> 24, n >>> 16 & 255, n >>> 8 & 255, n & 255].join(".");
}
function aBits(n) {
  const b = (n >>> 0).toString(2).padStart(32, "0");
  return `${b.slice(0, 8)}.${b.slice(8, 16)}.${b.slice(16, 24)}.${b.slice(24)}`;
}
function simularArq(opciones) {
  const { protocolo, paquetes } = opciones;
  if (!["stop-and-wait", "go-back-n", "selective-repeat"].includes(protocolo)) {
    throw new Error("El protocolo es 'stop-and-wait', 'go-back-n' o 'selective-repeat'.");
  }
  const N = protocolo === "stop-and-wait" ? 1 : opciones.ventana ?? 4;
  const envio = opciones.envio ?? 0.3;
  const timeout = opciones.timeout ?? 2.8;
  const pierde = new Set(opciones.perdidos ?? []);
  const pierdeAck = new Set(opciones.acksPerdidos ?? []);
  const individual = protocolo === "selective-repeat";
  const mensajes = [];
  const hechos = [];
  const veces = /* @__PURE__ */ new Map();
  const vecesAck = /* @__PURE__ */ new Map();
  let orden = 0;
  const cola = [];
  const agendar = (t, tipo, datos) => {
    cola.push({ t: redondear2(t), tipo, datos, orden: orden++ });
    cola.sort((a, b) => a.t - b.t || a.orden - b.orden);
  };
  let base = 0;
  let siguiente = 0;
  let libre = 0;
  const confirmados = /* @__PURE__ */ new Set();
  const timers = /* @__PURE__ */ new Map();
  let idTimer = 0;
  let esperado = 0;
  const recibidos = /* @__PURE__ */ new Set();
  const mandar = (t, numero2, retransmision) => {
    const n = (veces.get(numero2) ?? 0) + 1;
    veces.set(numero2, n);
    const perdido = n === 1 && pierde.has(numero2);
    mensajes.push({ tipo: "datos", numero: numero2, sale: redondear2(t), llega: redondear2(t + 1), perdido, retransmision });
    if (!perdido) agendar(t + 1, "llegaDatos", { numero: numero2 });
    return t;
  };
  const arrancarTimer = (t, cual) => {
    idTimer += 1;
    timers.set(cual, idTimer);
    agendar(t + timeout, "timeout", { cual, id: idTimer });
  };
  const mandarAck = (t, numero2, duplicado) => {
    const n = (vecesAck.get(numero2) ?? 0) + 1;
    vecesAck.set(numero2, n);
    const perdido = n === 1 && pierdeAck.has(numero2);
    mensajes.push({ tipo: "ack", numero: numero2, sale: redondear2(t), llega: redondear2(t + 1), perdido, retransmision: false, duplicado });
    if (!perdido) agendar(t + 1, "llegaAck", { numero: numero2 });
  };
  const llenarVentana = (t) => {
    let ahora = Math.max(t, libre);
    while (siguiente < paquetes && siguiente < base + N) {
      mandar(ahora, siguiente, false);
      if (individual) arrancarTimer(ahora, siguiente);
      else if (base === siguiente) arrancarTimer(ahora, "base");
      hechos.push({ t: redondear2(ahora), tipo: "envio", numero: siguiente, base, siguiente: siguiente + 1, texto: `Sale el paquete ${siguiente}.` });
      siguiente += 1;
      ahora += envio;
    }
    libre = ahora;
  };
  llenarVentana(0);
  let vueltas = 0;
  while (cola.length && vueltas++ < 5e3) {
    const { t, tipo, datos } = cola.shift();
    if (tipo === "llegaDatos") {
      const k = datos.numero;
      if (individual) {
        if (k >= esperado - N && k < esperado + N) {
          recibidos.add(k);
          mandarAck(t, k, k < esperado);
          while (recibidos.has(esperado)) esperado += 1;
        }
      } else if (k === esperado) {
        esperado += 1;
        mandarAck(t, k, false);
        hechos.push({ t, tipo: "entrega", numero: k, texto: `Llega el ${k}, en orden: se entrega.` });
      } else {
        hechos.push({ t, tipo: "descarte", numero: k, texto: `Llega el ${k}, pero esperaba el ${esperado}: se descarta.` });
        if (esperado > 0) mandarAck(t, esperado - 1, true);
      }
    } else if (tipo === "llegaAck") {
      const k = datos.numero;
      if (individual) {
        confirmados.add(k);
        timers.delete(k);
        while (confirmados.has(base)) base += 1;
      } else if (k >= base) {
        for (let i = base; i <= k; i++) confirmados.add(i);
        base = k + 1;
        if (base === siguiente) timers.delete("base");
        else arrancarTimer(t, "base");
      }
      hechos.push({ t, tipo: "ack", numero: k, base, siguiente, texto: `Llega el ACK ${k}.` });
      llenarVentana(t);
    } else if (tipo === "timeout") {
      if (timers.get(datos.cual) !== datos.id) continue;
      if (individual) {
        const k = datos.cual;
        if (confirmados.has(k)) continue;
        hechos.push({ t, tipo: "timeout", numero: k, base, siguiente, texto: `Vence el timer del ${k}: se reenv\xEDa solo ese.` });
        const ahora = Math.max(t, libre);
        mandar(ahora, k, true);
        libre = ahora + envio;
        arrancarTimer(ahora, k);
      } else {
        if (base >= siguiente) continue;
        hechos.push({ t, tipo: "timeout", numero: base, base, siguiente, texto: `Vence el timer: se reenv\xEDa desde el ${base}.` });
        let ahora = Math.max(t, libre);
        arrancarTimer(ahora, "base");
        for (let i = base; i < siguiente; i++) {
          mandar(ahora, i, true);
          ahora += envio;
        }
        libre = ahora;
      }
    }
    if (base >= paquetes) break;
  }
  mensajes.sort((a, b) => a.sale - b.sale || (a.tipo === "datos" ? -1 : 1));
  const fin = Math.max(...mensajes.map((m) => m.llega));
  return { protocolo, ventana: N, mensajes, hechos, fin, retransmisiones: mensajes.filter((m) => m.retransmision).length };
}
function redondear2(t) {
  return Math.round(t * 1e3) / 1e3;
}
function simularCongestion(opciones) {
  const { rondas, eventos = {}, variante = "reno" } = opciones;
  let cwnd = opciones.inicial ?? 1;
  let umbral = opciones.umbral ?? 16;
  const lista = [];
  for (let ronda = 1; ronda <= rondas; ronda++) {
    const fase = cwnd < umbral ? "slow start" : "congestion avoidance";
    const evento = eventos[ronda] ?? null;
    lista.push({ ronda, cwnd, umbral, fase, evento });
    if (evento) {
      umbral = Math.max(Math.floor(cwnd / 2), 2);
      cwnd = evento === "3dup" && variante === "reno" ? umbral : 1;
    } else if (cwnd < umbral) {
      cwnd = Math.min(cwnd * 2, umbral);
    } else {
      cwnd += 1;
    }
  }
  return lista;
}

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
  // x es el borde izquierdo con 'inicio' y el derecho con 'fin': el centro
  // de lo escrito queda corrido medio ancho.
  centro(p) {
    const medio = this.tamano(p).ancho / 2;
    return { x: p.alineacion === "inicio" ? medio : p.alineacion === "fin" ? -medio : 0, y: 0 };
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

// src/nucleo/curvas.js
var C1 = 1.70158;
var C3 = C1 + 1;

// src/nucleo/linea.js
function duracionLectura(texto3, caracteresPorSegundo = 15) {
  return Math.max(1.5, String(texto3).length / caracteresPorSegundo);
}

// src/pedagogico/narrar.js
function crearNarrador(opciones = {}) {
  const ritmo = opciones.ritmo ?? 1;
  const lectura = opciones.lectura ?? 13;
  const preguntas = opciones.preguntas ?? {};
  const linea = [];
  let respuestaPendiente = "";
  const n = {
    linea,
    tiempo: opciones.inicio ?? 0.3,
    ritmo,
    lectura,
    /** Agrega una animación (o varias) que arranca ahora, o `demora` segundos después. */
    animar(item, demora = 0) {
      for (const i of [item].flat()) linea.push({ en: n.tiempo + demora, ...i });
      return n;
    },
    /**
     * Un subtítulo. Dura lo que se tarda en leerlo (nunca menos de dos
     * ritmos) y el tiempo avanza hasta que termina, más `extra`. Si antes
     * hubo una pregunta, su respuesta se dice primero.
     */
    decir(texto3, extra = 0.4) {
      const subtitulo = respuestaPendiente + texto3;
      respuestaPendiente = "";
      const dur = Math.max(ritmo * 2, duracionLectura(subtitulo, lectura));
      linea.push({ subtitulo, en: n.tiempo, dur });
      n.tiempo += dur + extra;
      return dur;
    },
    /** Deja pasar un rato sin decir nada (para mirar algo que se mueve). */
    esperar(segundos) {
      n.tiempo += segundos * ritmo;
    },
    capitulo(nombre) {
      linea.push({ capitulo: nombre, en: n.tiempo });
    },
    /**
     * Si hay una pregunta con esa clave, la hace (frena la lección) y
     * guarda la respuesta para el próximo `decir`.
     */
    preguntar(clave) {
      const p = preguntas[clave];
      if (!p) return false;
      const enunciado = `${p.pregunta} Paus\xE1 y pensalo.`;
      const dur = Math.max(p.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
      linea.push({ marca: "pregunta", datos: p, en: n.tiempo, dur }, { subtitulo: enunciado, en: n.tiempo, dur });
      n.tiempo += dur + 0.2;
      respuestaPendiente = p.opciones && p.correcta !== void 0 ? `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ? `${p.explicacion} ` : ""}` : "";
      return true;
    }
  };
  return n;
}

// src/mate/calculo.js
var H = 1e-5;
function gradiente(f, x, y) {
  return [(f(x + H, y) - f(x - H, y)) / (2 * H), (f(x, y + H) - f(x, y - H)) / (2 * H)];
}
function curvaDeNivel(f, rango, nivel, resolucion = 48) {
  const { xmin, xmax, ymin, ymax } = rango;
  const dx = (xmax - xmin) / resolucion;
  const dy = (ymax - ymin) / resolucion;
  const valores = [];
  for (let j = 0; j <= resolucion; j++) {
    const fila = [];
    for (let i = 0; i <= resolucion; i++) fila.push(f(xmin + i * dx, ymin + j * dy) - nivel);
    valores.push(fila);
  }
  const segmentos = [];
  const cruce = (a, b, va, vb) => {
    const t = va / (va - vb);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let j = 0; j < resolucion; j++) {
    for (let i = 0; i < resolucion; i++) {
      const esquinas = [
        [xmin + i * dx, ymin + j * dy],
        [xmin + (i + 1) * dx, ymin + j * dy],
        [xmin + (i + 1) * dx, ymin + (j + 1) * dy],
        [xmin + i * dx, ymin + (j + 1) * dy]
      ];
      const v = [valores[j][i], valores[j][i + 1], valores[j + 1][i + 1], valores[j + 1][i]];
      if (v.some((n) => !Number.isFinite(n))) continue;
      const puntos = [];
      for (let k = 0; k < 4; k++) {
        const a = v[k];
        const b = v[(k + 1) % 4];
        if (a < 0 !== b < 0) puntos.push(cruce(esquinas[k], esquinas[(k + 1) % 4], a, b));
      }
      if (puntos.length === 2) {
        segmentos.push([puntos[0][0], puntos[0][1], puntos[1][0], puntos[1][1]]);
      } else if (puntos.length === 4) {
        const centro = (v[0] + v[1] + v[2] + v[3]) / 4;
        const [a, b, c, d] = puntos;
        if (centro < 0 === v[0] < 0) {
          segmentos.push([a[0], a[1], d[0], d[1]], [b[0], b[1], c[0], c[1]]);
        } else {
          segmentos.push([a[0], a[1], b[0], b[1]], [c[0], c[1], d[0], d[1]]);
        }
      }
    }
  }
  return segmentos;
}
function pasoLindo(rango, cuantas = 8) {
  const crudo = rango / cuantas;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const fraccion = crudo / potencia;
  const lindo = fraccion < 1.5 ? 1 : fraccion < 3.5 ? 2 : fraccion < 7.5 ? 5 : 10;
  return lindo * potencia;
}
function numero(n, decimales = 2) {
  if (!Number.isFinite(n)) return String(n);
  const r3 = Math.round(n * 10 ** decimales) / 10 ** decimales;
  const texto3 = String(Object.is(r3, -0) ? 0 : r3);
  return texto3.replace(".", ",");
}

// src/mate/plano.js
function marco(p) {
  return {
    izq: p.x - p.ancho / 2,
    der: p.x + p.ancho / 2,
    arriba: p.y - p.alto / 2,
    abajo: p.y + p.alto / 2,
    xmin: p.xmin,
    xmax: p.xmax,
    ymin: p.ymin,
    ymax: p.ymax
  };
}
function aPixelPlano(plano2, mx, my) {
  const m = marco(plano2);
  return {
    x: m.izq + (mx - m.xmin) / (m.xmax - m.xmin) * (m.der - m.izq),
    y: m.abajo - (my - m.ymin) / (m.ymax - m.ymin) * (m.abajo - m.arriba)
  };
}
function unidades(plano2) {
  return { ux: plano2.ancho / (plano2.xmax - plano2.xmin), uy: plano2.alto / (plano2.ymax - plano2.ymin) };
}
var HALO2 = { "paint-order": "stroke", stroke: "var(--ma-superficie)", "stroke-width": 6, "stroke-linejoin": "round" };
var plano = definirPieza({
  nombre: "plano",
  predeterminados: {
    ancho: 900,
    alto: 600,
    xmin: -5,
    xmax: 5,
    ymin: -5,
    ymax: 5,
    // Cada cuánto va una marca. null: lo elige solo (1, 2 o 5 por una potencia de 10).
    pasoX: null,
    pasoY: null,
    grilla: true,
    numeros: true,
    etiquetaX: "x",
    etiquetaY: "y",
    tamano: 20,
    relleno: "superficie",
    borde: "borde",
    color: "suave",
    // Para los números de los ejes: cuántos decimales y qué ponerles atrás (por ejemplo, ' s').
    decimales: 2,
    unidadX: "",
    unidadY: ""
  },
  colores: ["relleno", "borde", "color"],
  validar(p) {
    if (!(p.xmax > p.xmin) || !(p.ymax > p.ymin)) {
      throw new Error("Un plano necesita xmax mayor que xmin, e ymax mayor que ymin.");
    }
  },
  crear(grupo) {
    const id = idUnico("ma-plano");
    const clip = el("clipPath", { id }, el("defs", {}, grupo));
    return {
      fondo: el("rect", {}, grupo),
      clipRect: el("rect", {}, clip),
      grilla: el("path", { fill: "none", "stroke-width": 1 }, grupo),
      ejes: el("path", { fill: "none", "stroke-width": 2.5 }, grupo),
      numeros: el("g", {}, grupo),
      etiquetaX: el("text", { "text-anchor": "end", "font-style": "italic", "font-weight": 600, ...HALO2 }, grupo),
      etiquetaY: el("text", { "text-anchor": "start", "font-style": "italic", "font-weight": 600, ...HALO2 }, grupo),
      idClip: id
    };
  },
  actualizar(partes, p) {
    const local = { ...p, x: 0, y: 0 };
    const m = marco(local);
    const a = (mx, my) => aPixelPlano(local, mx, my);
    poner(partes.fondo, {
      x: m.izq,
      y: m.arriba,
      width: p.ancho,
      height: p.alto,
      rx: 10,
      fill: aCss(p.relleno),
      stroke: aCss(p.borde),
      "stroke-width": 2
    });
    poner(partes.clipRect, { x: m.izq, y: m.arriba, width: p.ancho, height: p.alto });
    const pasoX = p.pasoX ?? pasoLindo(p.xmax - p.xmin, Math.max(3, Math.round(p.ancho / 110)));
    const pasoY = p.pasoY ?? pasoLindo(p.ymax - p.ymin, Math.max(3, Math.round(p.alto / 80)));
    const marcasX = marcas(p.xmin, p.xmax, pasoX);
    const marcasY = marcas(p.ymin, p.ymax, pasoY);
    let d = "";
    if (p.grilla) {
      for (const x of marcasX) d += `M${r2(a(x, 0).x)} ${r2(m.arriba)}V${r2(m.abajo)}`;
      for (const y of marcasY) d += `M${r2(m.izq)} ${r2(a(0, y).y)}H${r2(m.der)}`;
    }
    poner(partes.grilla, { d, stroke: aCss(p.borde), opacity: 0.55 });
    const ejeY = limitar(a(0, 0).x, m.izq, m.der);
    const ejeX = limitar(a(0, 0).y, m.arriba, m.abajo);
    poner(partes.ejes, {
      d: `M${r2(m.izq)} ${r2(ejeX)}H${r2(m.der)}M${r2(ejeY)} ${r2(m.arriba)}V${r2(m.abajo)}`,
      stroke: aCss(p.color)
    });
    const rotulos = [];
    const yNumX = ejeX + p.tamano * 0.95 > m.abajo - 2 ? ejeX - p.tamano * 0.8 : ejeX + p.tamano * 0.95;
    const adentroY = ejeY - p.tamano * 2 < m.izq;
    const xNumY = adentroY ? ejeY + p.tamano * 0.45 : ejeY - p.tamano * 0.45;
    if (p.numeros) {
      const libreX = m.der - (Array.from(p.etiquetaX).length + 1) * p.tamano * 0.7;
      const libreY = m.arriba + p.tamano * 1.9;
      for (const x of marcasX) {
        if (Math.abs(x) < pasoX / 1e6) continue;
        if (a(x, 0).x > libreX && Math.abs(yNumX - (ejeX - p.tamano * 0.8)) < p.tamano) continue;
        rotulos.push({ x: a(x, 0).x, y: yNumX, texto: numero(x, p.decimales) + p.unidadX, ancla: "middle" });
      }
      for (const y of marcasY) {
        if (Math.abs(y) < pasoY / 1e6) continue;
        if (a(0, y).y < libreY) continue;
        rotulos.push({ x: xNumY, y: a(0, y).y, texto: numero(y, p.decimales) + p.unidadY, ancla: adentroY ? "start" : "end" });
      }
      if (p.xmin <= 0 && p.xmax >= 0 && p.ymin <= 0 && p.ymax >= 0) {
        rotulos.push({ x: xNumY, y: yNumX, texto: "0", ancla: adentroY ? "start" : "end" });
      }
    }
    while (partes.numeros.childNodes.length > rotulos.length) partes.numeros.lastChild.remove();
    while (partes.numeros.childNodes.length < rotulos.length) {
      el("text", { "dominant-baseline": "central", ...HALO2, "stroke-width": 4 }, partes.numeros);
    }
    rotulos.forEach((rot, i) => {
      const nodo = (
        /** @type {Element} */
        partes.numeros.childNodes[i]
      );
      poner(nodo, {
        x: rot.x,
        y: rot.y,
        "text-anchor": rot.ancla,
        "font-size": p.tamano,
        fill: aCss(p.color),
        // Un número que caería afuera del plano no se muestra.
        visibility: rot.x < m.izq - 2 || rot.x > m.der + 2 || rot.y < m.arriba - 2 || rot.y > m.abajo + 2 ? "hidden" : null
      });
      texto(nodo, rot.texto);
    });
    poner(partes.etiquetaX, { x: m.der - 10, y: ejeX - p.tamano * 0.8, "font-size": p.tamano * 1.2, fill: aCss(p.color) });
    texto(partes.etiquetaX, p.etiquetaX);
    poner(partes.etiquetaY, { x: ejeY + 10, y: m.arriba + p.tamano * 1.1, "font-size": p.tamano * 1.2, fill: aCss(p.color) });
    texto(partes.etiquetaY, p.etiquetaY);
  },
  tamano: (p) => ({ ancho: p.ancho, alto: p.alto })
});
function marcas(min, max, paso) {
  const lista = [];
  for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-9; v += paso) {
    lista.push(Math.round(v / paso) * paso);
    if (lista.length > 200) break;
  }
  return lista;
}
function r2(v) {
  return Math.round(v * 100) / 100;
}
function sobrePlano(definicion) {
  return definirPieza({
    ...definicion,
    predeterminados: { plano: null, ...definicion.predeterminados },
    dependeDeOtras: true,
    validar(p) {
      if (p.plano == null) throw new Error(`Un${definicion.articulo ?? ""} ${definicion.nombre} va sobre un plano: plano: 'p'.`);
      definicion.validar?.(p);
    },
    crear(grupo, props, ctx) {
      const id = idUnico("ma-sobre");
      const clip = el("clipPath", { id }, el("defs", {}, grupo));
      const rect = el("rect", {}, clip);
      const recortado = el("g", { "clip-path": `url(#${id})` }, grupo);
      const libre = el("g", {}, grupo);
      return { rect, ...definicion.crear(recortado, libre, props, ctx) };
    },
    actualizar(partes, p, ctx) {
      const pl = ctx.estado.piezas[p.plano];
      if (!pl) throw new Error(`"${p.plano}" no es ninguna pieza: un${definicion.articulo ?? ""} ${definicion.nombre} necesita el id de un plano.`);
      const m = marco(pl);
      poner(partes.rect, { x: m.izq, y: m.arriba, width: pl.ancho, height: pl.alto });
      definicion.actualizar(partes, p, {
        plano: pl,
        marco: m,
        a: (mx, my) => aPixelPlano(pl, mx, my),
        ...unidades(pl)
      });
    }
  });
}
var grafica = sobrePlano({
  nombre: "grafica",
  articulo: "a",
  predeterminados: {
    f: null,
    datos: null,
    parametrica: null,
    // El dominio que se dibuja (de f o de t). null: el ancho del plano (para t, de 0 a 1).
    desde: null,
    hasta: null,
    trazo: 1,
    color: "acento",
    grosor: 4,
    punteada: false,
    muestras: 400,
    // Un número que se le pasa a f como segundo argumento, f(x, k), y que se
    // puede animar: la curva se va deformando de a poco (el precio de una
    // opción a medida que pasa el tiempo, una campana que se ensancha).
    k: 0,
    // Un rótulo al final de lo dibujado: "f(x) = x²".
    etiqueta: "",
    tamanoEtiqueta: 24
  },
  colores: ["color"],
  validar(p) {
    if (!p.f && !p.datos && !p.parametrica) {
      throw new Error("Una gr\xE1fica necesita qu\xE9 dibujar: f: (x) => x * x, datos: [[0, 1], [1, 3]] o parametrica: (t) => [x, y].");
    }
  },
  crear(grupo, libre) {
    return {
      linea: el("path", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, grupo),
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", ...HALO2 }, libre),
      cache: { clave: null, puntos: [] }
    };
  },
  actualizar(partes, p, c) {
    const puntos = puntosDeGrafica(p, c);
    const avance = limitar(p.trazo, 0, 1);
    const { d, fin } = caminoHasta(puntos, avance, c);
    poner(partes.linea, {
      d,
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      "stroke-dasharray": p.punteada ? `${p.grosor * 2.5} ${p.grosor * 2}` : null,
      visibility: avance > 0 ? null : "hidden"
    });
    poner(partes.etiqueta, {
      x: fin ? fin.x + 12 : 0,
      y: fin ? fin.y - p.tamanoEtiqueta * 0.7 : 0,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.color),
      "text-anchor": fin && fin.x > c.marco.der - 160 ? "end" : "start",
      visibility: p.etiqueta && fin && avance > 0.6 ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
function puntosDeGrafica(p, c) {
  const pl = c.plano;
  if (p.datos) return p.datos.map(([x, y]) => [x, y]);
  const lista = [];
  if (p.parametrica) {
    const t0 = p.desde ?? 0;
    const t1 = p.hasta ?? 1;
    for (let i = 0; i <= p.muestras; i++) {
      const t = t0 + (t1 - t0) * i / p.muestras;
      const [x, y] = p.parametrica(t, p.k);
      lista.push(Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null);
    }
    return lista;
  }
  const x0 = p.desde ?? pl.xmin;
  const x1 = p.hasta ?? pl.xmax;
  const alto = pl.ymax - pl.ymin;
  let anterior = null;
  for (let i = 0; i <= p.muestras; i++) {
    const x = x0 + (x1 - x0) * i / p.muestras;
    const y = p.f(x, p.k);
    if (!Number.isFinite(y)) {
      lista.push(null);
      anterior = null;
      continue;
    }
    if (anterior != null && Math.abs(y - anterior) > alto * 2) lista.push(null);
    lista.push([x, y]);
    anterior = y;
  }
  return lista;
}
function caminoHasta(puntos, avance, c) {
  const px = puntos.map((q) => q ? c.a(q[0], q[1]) : null);
  const lim = (q) => ({ x: limitar(q.x, c.marco.izq - 4e3, c.marco.der + 4e3), y: limitar(q.y, c.marco.arriba - 4e3, c.marco.abajo + 4e3) });
  let total = 0;
  for (let i = 1; i < px.length; i++) if (px[i] && px[i - 1]) total += Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y);
  const objetivo = total * avance;
  let d = "";
  let andado = 0;
  let fin = null;
  let nuevo = true;
  for (let i = 0; i < px.length; i++) {
    const q = px[i];
    if (!q) {
      nuevo = true;
      continue;
    }
    if (nuevo) {
      const l2 = lim(q);
      d += `M${r2(l2.x)} ${r2(l2.y)}`;
      nuevo = false;
      fin = q;
      continue;
    }
    const prev = px[i - 1];
    const tramo = Math.hypot(q.x - prev.x, q.y - prev.y);
    if (andado + tramo >= objetivo) {
      const t = tramo === 0 ? 0 : (objetivo - andado) / tramo;
      const l2 = lim({ x: prev.x + (q.x - prev.x) * t, y: prev.y + (q.y - prev.y) * t });
      d += `L${r2(l2.x)} ${r2(l2.y)}`;
      fin = l2;
      break;
    }
    andado += tramo;
    const l = lim(q);
    d += `L${r2(l.x)} ${r2(l.y)}`;
    fin = q;
  }
  return { d: d || "M0 0", fin };
}
var LADOS = {
  arriba: { dx: 0, dy: -1, ancla: "middle" },
  abajo: { dx: 0, dy: 1, ancla: "middle" },
  derecha: { dx: 1, dy: 0, ancla: "start" },
  izquierda: { dx: -1, dy: 0, ancla: "end" },
  "arriba-derecha": { dx: 0.75, dy: -0.75, ancla: "start" },
  "arriba-izquierda": { dx: -0.75, dy: -0.75, ancla: "end" },
  "abajo-derecha": { dx: 0.75, dy: 0.75, ancla: "start" },
  "abajo-izquierda": { dx: -0.75, dy: 0.75, ancla: "end" }
};
var punto = sobrePlano({
  nombre: "punto",
  predeterminados: {
    mx: 0,
    my: 0,
    radio: 9,
    color: "acento2",
    etiqueta: "",
    tamanoEtiqueta: 24,
    lado: "arriba-derecha",
    // Líneas punteadas hasta los ejes, para leer las coordenadas.
    guias: false,
    // De 0 a 1: un anillo alrededor, para decir "mirá este".
    resaltado: 0
  },
  colores: ["color"],
  validar(p) {
    if (!(p.lado in LADOS)) throw new Error(`El lado del r\xF3tulo de un punto es uno de: ${Object.keys(LADOS).join(", ")}.`);
  },
  crear(grupo, libre) {
    return {
      guias: el("path", { fill: "none", "stroke-width": 2, "stroke-dasharray": "6 6" }, grupo),
      anillo: el("circle", { fill: "none", "stroke-width": 4 }, grupo),
      circulo: el("circle", { stroke: "var(--ma-superficie)", "stroke-width": 3 }, grupo),
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", ...HALO2 }, libre)
    };
  },
  actualizar(partes, p, c) {
    const q = c.a(p.mx, p.my);
    const ejeY = limitar(c.a(0, 0).x, c.marco.izq, c.marco.der);
    const ejeX = limitar(c.a(0, 0).y, c.marco.arriba, c.marco.abajo);
    poner(partes.guias, {
      d: `M${r2(q.x)} ${r2(q.y)}V${r2(ejeX)}M${r2(q.x)} ${r2(q.y)}H${r2(ejeY)}`,
      stroke: aCss(p.color),
      visibility: p.guias ? null : "hidden"
    });
    poner(partes.anillo, {
      cx: q.x,
      cy: q.y,
      r: p.radio * 2.2,
      stroke: aCss(p.color),
      opacity: p.resaltado,
      visibility: p.resaltado > 0 ? null : "hidden"
    });
    poner(partes.circulo, { cx: q.x, cy: q.y, r: p.radio, fill: aCss(p.color) });
    const lado = LADOS[p.lado];
    const aire = p.radio + p.tamanoEtiqueta * 0.7;
    poner(partes.etiqueta, {
      x: q.x + lado.dx * aire,
      y: q.y + lado.dy * aire,
      "text-anchor": lado.ancla,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.color),
      visibility: p.etiqueta ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
var vector = sobrePlano({
  nombre: "vector",
  predeterminados: {
    mx: 0,
    my: 0,
    dx: 1,
    dy: 1,
    progreso: 1,
    color: "acento",
    grosor: 4,
    etiqueta: "",
    tamanoEtiqueta: 24
  },
  colores: ["color"],
  crear(grupo, libre) {
    return {
      linea: el("path", { fill: "none", "stroke-linecap": "round" }, grupo),
      punta: el("path", {}, grupo),
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", "text-anchor": "middle", ...HALO2 }, libre)
    };
  },
  actualizar(partes, p, c) {
    const a = c.a(p.mx, p.my);
    const avance = limitar(p.progreso, 0, 1);
    const b0 = c.a(p.mx + p.dx, p.my + p.dy);
    const b = { x: a.x + (b0.x - a.x) * avance, y: a.y + (b0.y - a.y) * avance };
    const largo2 = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const L = Math.min(p.grosor * 3.4, largo2 * 0.6);
    const W = L * 0.62;
    const base = { x: b.x - Math.cos(ang) * L, y: b.y - Math.sin(ang) * L };
    const visible = avance > 0 && largo2 > 0.5;
    poner(partes.linea, {
      d: `M${r2(a.x)} ${r2(a.y)}L${r2(base.x + Math.cos(ang) * L * 0.3)} ${r2(base.y + Math.sin(ang) * L * 0.3)}`,
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      visibility: visible ? null : "hidden"
    });
    const nx = -Math.sin(ang) * W;
    const ny = Math.cos(ang) * W;
    poner(partes.punta, {
      d: `M${r2(b.x)} ${r2(b.y)}L${r2(base.x + nx)} ${r2(base.y + ny)}L${r2(base.x - nx)} ${r2(base.y - ny)}Z`,
      fill: aCss(p.color),
      visibility: visible ? null : "hidden"
    });
    const lado = Math.cos(ang) >= 0 ? -1 : 1;
    const corr = p.tamanoEtiqueta * 0.9;
    poner(partes.etiqueta, {
      x: (a.x + b.x) / 2 + Math.sin(ang) * corr * -lado,
      y: (a.y + b.y) / 2 - Math.cos(ang) * corr * -lado,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.color),
      visibility: p.etiqueta && avance > 0.5 ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
var recta = sobrePlano({
  nombre: "recta",
  articulo: "a",
  predeterminados: {
    mx: 0,
    my: 0,
    pendiente: 1,
    vertical: false,
    color: "acento2",
    grosor: 3.5,
    punteada: false,
    // De 0 a 1: se dibuja desde el punto hacia los dos lados.
    progreso: 1,
    etiqueta: "",
    tamanoEtiqueta: 22
  },
  colores: ["color"],
  crear(grupo, libre) {
    return {
      linea: el("path", { fill: "none", "stroke-linecap": "round" }, grupo),
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", "text-anchor": "end", ...HALO2 }, libre)
    };
  },
  actualizar(partes, p, c) {
    const pl = c.plano;
    const avance = limitar(p.progreso, 0, 1);
    let a;
    let b;
    if (p.vertical) {
      const ym = (pl.ymin + pl.ymax) / 2;
      const media = (pl.ymax - pl.ymin) / 2 * 1.05 * avance;
      a = c.a(p.mx, ym - media);
      b = c.a(p.mx, ym + media);
    } else {
      const ancho = (pl.xmax - pl.xmin) * 1.05;
      const izq = p.mx - (p.mx - pl.xmin + ancho * 0.05) * avance;
      const der = p.mx + (pl.xmax - p.mx + ancho * 0.05) * avance;
      a = c.a(izq, p.my + p.pendiente * (izq - p.mx));
      b = c.a(der, p.my + p.pendiente * (der - p.mx));
    }
    const lim = (v, min, max) => limitar(v, min - 4e3, max + 4e3);
    poner(partes.linea, {
      d: `M${r2(lim(a.x, c.marco.izq, c.marco.der))} ${r2(lim(a.y, c.marco.arriba, c.marco.abajo))}L${r2(lim(b.x, c.marco.izq, c.marco.der))} ${r2(lim(b.y, c.marco.arriba, c.marco.abajo))}`,
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      "stroke-dasharray": p.punteada ? `${p.grosor * 2.5} ${p.grosor * 2}` : null,
      visibility: avance > 0 ? null : "hidden"
    });
    const xe = pl.xmax - (pl.xmax - pl.xmin) * 0.03;
    let e = p.vertical ? c.a(p.mx, pl.ymax - (pl.ymax - pl.ymin) * 0.06) : c.a(xe, p.my + p.pendiente * (xe - p.mx));
    if (!p.vertical && (e.y < c.marco.arriba + 20 || e.y > c.marco.abajo - 20)) {
      const yb = e.y < c.marco.arriba + 20 ? pl.ymax - (pl.ymax - pl.ymin) * 0.05 : pl.ymin + (pl.ymax - pl.ymin) * 0.05;
      const xb = p.pendiente === 0 ? xe : p.mx + (yb - p.my) / p.pendiente;
      e = c.a(xb, yb);
    }
    poner(partes.etiqueta, {
      x: p.vertical ? e.x - 10 : e.x - 6,
      y: e.y - p.tamanoEtiqueta * 0.85,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.color),
      visibility: p.etiqueta && avance > 0.6 ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
var segmento = sobrePlano({
  nombre: "segmento",
  predeterminados: {
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
    progreso: 1,
    color: "suave",
    grosor: 3,
    punteada: false,
    etiqueta: "",
    tamanoEtiqueta: 20
  },
  colores: ["color"],
  crear(grupo, libre) {
    return {
      linea: el("path", { fill: "none", "stroke-linecap": "round" }, grupo),
      etiqueta: el("text", { "font-weight": 600, "dominant-baseline": "central", "text-anchor": "start", ...HALO2 }, libre)
    };
  },
  actualizar(partes, p, c) {
    const a = c.a(p.x1, p.y1);
    const b0 = c.a(p.x2, p.y2);
    const avance = limitar(p.progreso, 0, 1);
    const b = { x: a.x + (b0.x - a.x) * avance, y: a.y + (b0.y - a.y) * avance };
    poner(partes.linea, {
      d: `M${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}`,
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      "stroke-dasharray": p.punteada ? `${p.grosor * 2.5} ${p.grosor * 2}` : null,
      visibility: avance > 0 ? null : "hidden"
    });
    poner(partes.etiqueta, {
      x: (a.x + b.x) / 2 + 10,
      y: (a.y + b.y) / 2,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.color),
      visibility: p.etiqueta && avance > 0.5 ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
var area = sobrePlano({
  nombre: "area",
  articulo: "a",
  predeterminados: {
    f: null,
    g: null,
    desde: 0,
    hasta: 1,
    color: "acento",
    relleno: 0.3,
    // Un borde arriba (sobre f), para que la región se lea aunque el relleno sea claro.
    borde: true,
    muestras: 160,
    // Como en la gráfica: f(x, k) y g(x, k), con k animable.
    k: 0,
    etiqueta: "",
    tamanoEtiqueta: 22,
    // Dónde va el rótulo, en coordenadas del plano. null: en el medio de la región.
    etiquetaX: null,
    etiquetaY: null
  },
  colores: ["color"],
  validar(p) {
    if (typeof p.f !== "function") throw new Error("Un \xE1rea necesita la curva de arriba: f: (x) => ...");
  },
  crear(grupo, libre) {
    return {
      relleno: el("path", { stroke: "none" }, grupo),
      borde: el("path", { fill: "none", "stroke-width": 3, "stroke-linejoin": "round" }, grupo),
      etiqueta: el("text", { "font-weight": 700, "text-anchor": "middle", "dominant-baseline": "central", ...HALO2 }, libre)
    };
  },
  actualizar(partes, p, c) {
    const pl = c.plano;
    const x0 = Math.max(Math.min(p.desde, p.hasta), pl.xmin - (pl.xmax - pl.xmin) * 0.02);
    const x1 = Math.min(Math.max(p.desde, p.hasta), pl.xmax + (pl.xmax - pl.xmin) * 0.02);
    const lim = (y) => limitar(y, pl.ymin - (pl.ymax - pl.ymin), pl.ymax + (pl.ymax - pl.ymin));
    const vacia = !(x1 > x0);
    let arriba = "";
    let abajo = "";
    if (!vacia) {
      const n = Math.max(2, Math.ceil(p.muestras * ((x1 - x0) / (pl.xmax - pl.xmin))));
      const xs = Array.from({ length: n + 1 }, (_, i) => x0 + (x1 - x0) * i / n);
      arriba = xs.map((x, i) => {
        const q = c.a(x, lim(p.f(x, p.k)));
        return `${i ? "L" : "M"}${r2(q.x)} ${r2(q.y)}`;
      }).join("");
      abajo = xs.reverse().map((x) => {
        const q = c.a(x, lim(p.g ? p.g(x, p.k) : 0));
        return `L${r2(q.x)} ${r2(q.y)}`;
      }).join("");
    }
    poner(partes.relleno, {
      d: vacia ? "M0 0" : `${arriba}${abajo}Z`,
      fill: aCss(p.color),
      "fill-opacity": p.relleno,
      visibility: vacia ? "hidden" : null
    });
    poner(partes.borde, {
      d: vacia ? "M0 0" : arriba,
      stroke: aCss(p.color),
      visibility: vacia || !p.borde ? "hidden" : null
    });
    const xm = p.etiquetaX ?? (x0 + x1) / 2;
    const ym = p.etiquetaY ?? ((p.g ? p.g(xm, p.k) : 0) + p.f(xm, p.k)) / 2;
    const e = c.a(xm, ym);
    poner(partes.etiqueta, {
      x: e.x,
      y: e.y,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.color),
      visibility: p.etiqueta && !vacia ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
var curvasNivel = sobrePlano({
  nombre: "curvasNivel",
  articulo: "as",
  predeterminados: {
    f: null,
    niveles: [],
    // Cuántas curvas se ven: 2.5 es dos enteras y la tercera apareciendo.
    progreso: Infinity,
    color: "acento",
    grosor: 2.5,
    resolucion: 56,
    // El índice de una curva para destacarla (−1: ninguna).
    resaltar: -1,
    colorResaltada: "acento2",
    // Escribir la altura de cada curva.
    rotulos: true,
    tamanoEtiqueta: 18
  },
  colores: ["color", "colorResaltada"],
  validar(p) {
    if (typeof p.f !== "function") throw new Error("Unas curvas de nivel necesitan la funci\xF3n: f: (x, y) => x * x + y * y.");
  },
  crear(grupo, libre) {
    return { lineas: el("g", { fill: "none", "stroke-linecap": "round" }, grupo), rotulos: el("g", {}, libre), cache: { clave: "", curvas: [] } };
  },
  actualizar(partes, p, c) {
    const pl = c.plano;
    const clave = [pl.xmin, pl.xmax, pl.ymin, pl.ymax, p.niveles.join(","), p.resolucion].join("|");
    if (partes.cache.clave !== clave || partes.cache.f !== p.f) {
      const rango = { xmin: pl.xmin, xmax: pl.xmax, ymin: pl.ymin, ymax: pl.ymax };
      partes.cache = {
        clave,
        f: p.f,
        curvas: p.niveles.map((nivel) => {
          const segmentos = curvaDeNivel(p.f, rango, nivel, p.resolucion);
          let mejor = null;
          for (const s of segmentos) if (!mejor || s[0] + s[1] > mejor[0] + mejor[1]) mejor = s;
          return { nivel, segmentos, rotulo: mejor };
        })
      };
    }
    const curvas = partes.cache.curvas;
    while (partes.lineas.childNodes.length > curvas.length) partes.lineas.lastChild.remove();
    while (partes.lineas.childNodes.length < curvas.length) el("path", {}, partes.lineas);
    while (partes.rotulos.childNodes.length > curvas.length) partes.rotulos.lastChild.remove();
    while (partes.rotulos.childNodes.length < curvas.length) {
      el("text", { "font-weight": 600, "text-anchor": "middle", "dominant-baseline": "central", ...HALO2, "stroke-width": 5 }, partes.rotulos);
    }
    curvas.forEach((curva2, i) => {
      const visible = limitar(p.progreso - i, 0, 1);
      const resaltada = i === p.resaltar;
      let d = "";
      for (const [x1, y1, x2, y2] of curva2.segmentos) {
        const a = c.a(x1, y1);
        const b = c.a(x2, y2);
        d += `M${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}`;
      }
      poner(
        /** @type {Element} */
        partes.lineas.childNodes[i],
        {
          d: d || "M0 0",
          stroke: aCss(resaltada ? p.colorResaltada : p.color),
          "stroke-width": resaltada ? p.grosor * 1.8 : p.grosor,
          opacity: visible,
          visibility: visible > 0 && d ? null : "hidden"
        }
      );
      const nodo = (
        /** @type {Element} */
        partes.rotulos.childNodes[i]
      );
      const q = curva2.rotulo ? c.a(curva2.rotulo[0], curva2.rotulo[1]) : { x: 0, y: 0 };
      poner(nodo, {
        x: q.x,
        y: q.y,
        "font-size": p.tamanoEtiqueta,
        fill: aCss(resaltada ? p.colorResaltada : p.color),
        opacity: visible,
        visibility: p.rotulos && visible > 0 && curva2.rotulo ? null : "hidden"
      });
      texto(nodo, numero(curva2.nivel));
    });
  }
});
var campo = sobrePlano({
  nombre: "campo",
  predeterminados: {
    f: null,
    vectores: null,
    sentido: "subida",
    // Cuántas flechas por lado.
    cantidad: 11,
    // El largo de la flecha más larga, en píxeles: las demás, en proporción.
    largo: 38,
    color: "suave",
    grosor: 2.5,
    // De 0 a 1: las flechas crecen desde su base.
    progreso: 1
  },
  colores: ["color"],
  validar(p) {
    if (typeof p.f !== "function" && typeof p.vectores !== "function") {
      throw new Error("Un campo necesita f: (x, y) => ... (dibuja su gradiente) o vectores: (x, y) => [dx, dy].");
    }
    if (!["subida", "bajada"].includes(p.sentido)) throw new Error("El sentido de un campo es 'subida' o 'bajada'.");
  },
  crear(grupo) {
    return { flechas: el("path", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, grupo) };
  },
  actualizar(partes, p, c) {
    const pl = c.plano;
    const signo = p.sentido === "bajada" ? -1 : 1;
    const vec = p.vectores ?? ((x, y) => gradiente(p.f, x, y));
    const lista = [];
    let maximo = 0;
    for (let j = 0; j < p.cantidad; j++) {
      for (let i = 0; i < p.cantidad; i++) {
        const x = pl.xmin + (i + 0.5) / p.cantidad * (pl.xmax - pl.xmin);
        const y = pl.ymin + (j + 0.5) / p.cantidad * (pl.ymax - pl.ymin);
        const [dx, dy] = vec(x, y);
        const v = { x, y, dx: dx * signo * c.ux, dy: -dy * signo * c.uy };
        const n = Math.hypot(v.dx, v.dy);
        if (Number.isFinite(n)) {
          maximo = Math.max(maximo, n);
          lista.push({ ...v, n });
        }
      }
    }
    const avance = limitar(p.progreso, 0, 1);
    let d = "";
    for (const v of lista) {
      if (v.n < 1e-9 || maximo === 0) continue;
      const l = v.n / maximo * p.largo * avance;
      if (l < 2) continue;
      const a = c.a(v.x, v.y);
      const ux = v.dx / v.n;
      const uy = v.dy / v.n;
      const b = { x: a.x + ux * l, y: a.y + uy * l };
      const pl2 = Math.min(9, l * 0.4);
      d += `M${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}`;
      d += `M${r2(b.x - ux * pl2 - uy * pl2 * 0.6)} ${r2(b.y - uy * pl2 + ux * pl2 * 0.6)}L${r2(b.x)} ${r2(b.y)}L${r2(b.x - ux * pl2 + uy * pl2 * 0.6)} ${r2(b.y - uy * pl2 - ux * pl2 * 0.6)}`;
    }
    poner(partes.flechas, {
      d: d || "M0 0",
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      visibility: d ? null : "hidden"
    });
  }
});

// src/redes/escenas.js
function lienzo(disposicion, titulo) {
  const angosta = disposicion.nombre === "angosta";
  const W = angosta ? 640 : 1600;
  const H2 = angosta ? 1140 : 900;
  const arriba = titulo ? angosta ? 96 : 100 : 24;
  return { angosta, W, H: H2, arriba };
}
function piezaTitulo(titulo, W, angosta) {
  return texto2({ x: W / 2, y: angosta ? 48 : 50, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
}
function desdeIntercambio(opciones) {
  const { extremos, titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const nombres = extremos.map((e) => typeof e === "object" ? e.texto : e);
  const indice = (x) => {
    const i = typeof x === "number" ? x : nombres.indexOf(x);
    if (!(i >= 0 && i < nombres.length)) throw new Error(`"${x}" no es ninguno de los extremos: ${nombres.join(", ")}.`);
    return i;
  };
  const mensajes = [];
  const notas = [];
  let anterior = null;
  for (const m of opciones.mensajes) {
    const sale = anterior ? m.junto ? anterior.sale + 0.2 : anterior.llega + 0.15 : 0;
    const llega = sale + (m.viaje ?? 1);
    const msg = { ...m, de: indice(m.de), a: indice(m.a), sale, llega };
    mensajes.push(msg);
    for (const e of m.estados ?? []) {
      notas.push({ extremo: indice(e.extremo), t: e.al === "salir" ? sale : llega, texto: e.texto, color: e.color ?? "acento2" });
    }
    anterior = msg;
  }
  const duracion = Math.max(...mensajes.map((m) => m.llega)) + 0.3;
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    const alto = H2 - arriba - (angosta ? 30 : 30);
    piezas.diagrama = secuencia({
      x: W / 2,
      y: arriba + alto / 2,
      ancho: angosta ? 620 : Math.min(1500, 520 + 300 * nombres.length),
      alto,
      extremos,
      notas,
      duracion,
      tamano: angosta ? 17 : 23,
      mensajes: mensajes.map(({ de, a, sale, llega, texto: t, perdido, color }) => ({ de, a, sale, llega, texto: t, perdido, color }))
    });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const segundosPorViaje = 1.3 * ritmo;
    mensajes.forEach((m, i) => {
      if (m.capitulo) n.capitulo(m.capitulo);
      else if (i === 0) n.capitulo(m.texto);
      n.preguntar(i);
      const desde = i === 0 ? 0 : mensajes[i - 1].llega;
      if (mensajes[i + 1]?.junto) return;
      const hasta = m.llega;
      n.animar([
        { pieza: "diagrama", a: { resaltar: i }, dur: 0 },
        { pieza: "diagrama", a: { tiempo: hasta }, dur: (hasta - desde) * segundosPorViaje, curva: "lineal" }
      ]);
      n.tiempo += (hasta - desde) * segundosPorViaje;
      const grupo = [m];
      for (let k = i - 1; k >= 0 && mensajes[k + 1].junto; k--) grupo.unshift(mensajes[k]);
      const explicacion = grupo.map((x) => x.explicacion).filter(Boolean).join(" ");
      if (explicacion) n.decir(explicacion, 0.3);
      else n.esperar(0.4);
    });
    n.animar({ pieza: "diagrama", a: { resaltar: -1, tiempo: duracion }, dur: 0.4 });
    return {
      titulo: titulo || "Un intercambio de mensajes",
      descripcion: descripcion || `${nombres.join(" y ")} intercambian ${mensajes.length} mensajes: ${mensajes.map((m) => m.texto).join(", ")}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
var NOMBRES_ARQ = { "stop-and-wait": "Stop-and-wait", "go-back-n": "Go-Back-N", "selective-repeat": "Selective Repeat" };
function desdeVentana(opciones) {
  const { protocolo, paquetes, titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const sim = simularArq({ envio: 0.45, timeout: 3, ...opciones });
  const N = sim.ventana;
  const individual = protocolo === "selective-repeat";
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    const lado = angosta ? Math.min(52, 560 / paquetes) : Math.min(72, 900 / paquetes);
    const yVentana = arriba + lado / 2 + 10;
    piezas.ventana = ventanaDeslizante({
      x: W / 2 + (angosta ? 40 : 60),
      y: yVentana,
      cantidad: paquetes,
      ventana: N,
      base: 0,
      siguiente: 0,
      lado,
      tamano: lado * 0.42,
      rotulo: "Emisor"
    });
    const altoDiagrama = H2 - (yVentana + lado / 2 + 30) - 20;
    piezas.diagrama = secuencia({
      x: W / 2,
      y: yVentana + lado / 2 + 30 + altoDiagrama / 2,
      ancho: angosta ? 620 : 1300,
      alto: altoDiagrama,
      extremos: ["Emisor", "Receptor"],
      duracion: sim.fin + 0.2,
      tamano: angosta ? 15 : 20,
      regla: !angosta,
      rotulos: "origen",
      mensajes: sim.mensajes.map((m) => ({
        de: m.tipo === "datos" ? 0 : 1,
        a: m.tipo === "datos" ? 1 : 0,
        sale: m.sale,
        llega: m.llega,
        perdido: m.perdido ? 0.55 : 0,
        texto: m.tipo === "datos" ? `${m.retransmision ? "\u21BB " : ""}Paq ${m.numero}` : `ACK ${m.numero}`,
        color: m.tipo === "ack" ? m.duplicado ? "alerta" : "exito" : m.retransmision ? "acento2" : "acento",
        punteada: m.tipo === "ack" && m.duplicado
      })),
      notas: sim.hechos.filter((h) => h.tipo === "timeout").map((h) => ({ extremo: 0, t: h.t, texto: "\u23F0 timeout", color: "error" }))
    });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const v = 1.5 * ritmo;
    const paradas = [];
    const perdidos = sim.mensajes.filter((m) => m.perdido);
    for (const m of perdidos) {
      paradas.push({
        t: m.sale + 0.55,
        texto: m.tipo === "datos" ? `El paquete ${m.numero} se pierde en el camino: nunca llega al receptor.` : `El ACK ${m.numero} se pierde: el receptor s\xED recibi\xF3 el paquete, pero el emisor no se entera.`
      });
    }
    const primerDescarte = sim.hechos.find((h) => h.tipo === "descarte");
    if (primerDescarte && protocolo === "go-back-n") {
      paradas.push({ t: primerDescarte.t, texto: `Llega el ${primerDescarte.numero}, pero el receptor esperaba otro: en Go-Back-N lo descarta y repite el \xFAltimo ACK que mand\xF3 (en amarillo).` });
    }
    if (individual) {
      const fueraDeOrden = sim.mensajes.find((m) => m.tipo === "ack" && perdidos.some((p) => p.tipo === "datos" && p.numero < m.numero && m.sale < p.sale + 3));
      if (fueraDeOrden) paradas.push({ t: fueraDeOrden.sale, texto: `En Selective Repeat el receptor guarda los que llegan fuera de orden y confirma cada uno por separado.` });
    }
    sim.hechos.filter((h) => h.tipo === "timeout").forEach((h, i) => {
      paradas.push({ t: h.t, texto: h.texto, timeout: i === 0 });
    });
    paradas.sort((a, b) => a.t - b.t);
    const tramos = [];
    let d = 0;
    const avanzarHasta = (hasta) => {
      if (hasta <= d) return;
      tramos.push({ d0: d, d1: hasta, s0: n.tiempo });
      n.animar({ pieza: "diagrama", a: { tiempo: hasta }, dur: (hasta - d) * v, curva: "lineal" });
      n.tiempo += (hasta - d) * v;
      d = hasta;
    };
    const enEscena = (t) => {
      const tramo = tramos.find((x) => t >= x.d0 && t <= x.d1 + 1e-9);
      return tramo ? tramo.s0 + (t - tramo.d0) * v : n.tiempo;
    };
    n.capitulo(NOMBRES_ARQ[protocolo]);
    n.decir(protocolo === "stop-and-wait" ? "En stop-and-wait el emisor manda un paquete y espera su ACK antes de mandar el siguiente. Si el ACK no llega a tiempo, lo reenv\xEDa." : `En ${NOMBRES_ARQ[protocolo]} el emisor puede tener hasta ${N} paquetes en viaje sin confirmar: es su ventana, el recuadro de arriba.`);
    for (const parada of paradas) {
      if (parada.timeout) n.preguntar("timeout");
      avanzarHasta(parada.t);
      if (parada.timeout) n.capitulo(`Timeout en t = ${redondeo(parada.t)}`);
      n.decir(parada.texto, 0.3);
    }
    avanzarHasta(sim.fin + 0.2);
    const confirmados = /* @__PURE__ */ new Set();
    for (const h of sim.hechos) {
      if (h.tipo === "ack" && individual) confirmados.add(h.numero);
      if (h.base === void 0) continue;
      n.linea.push({ pieza: "ventana", a: { base: h.base, siguiente: h.siguiente, confirmados: [...confirmados] }, dur: 0.35, en: enEscena(h.t) });
    }
    n.linea.sort((a, b) => (a.en ?? 0) - (b.en ?? 0));
    n.preguntar("final");
    n.capitulo("Resumen");
    n.decir(`Llegaron los ${paquetes} paquetes. Hubo ${sim.retransmisiones} ${sim.retransmisiones === 1 ? "retransmisi\xF3n" : "retransmisiones"}${protocolo === "go-back-n" && sim.retransmisiones > perdidos.length ? ": Go-Back-N reenv\xEDa tambi\xE9n los que hab\xEDan llegado bien despu\xE9s del perdido" : ""}.`);
    return {
      titulo: titulo || NOMBRES_ARQ[protocolo],
      descripcion: descripcion || `${NOMBRES_ARQ[protocolo]} con ${paquetes} paquetes${N > 1 ? ` y ventana ${N}` : ""}. ${perdidos.length ? `Se pierde${perdidos.length > 1 ? "n" : ""} ${perdidos.map((m) => m.tipo === "ack" ? `el ACK ${m.numero}` : `el paquete ${m.numero}`).join(" y ")}.` : ""}`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function redondeo(t) {
  return String(Math.round(t * 10) / 10).replace(".", ",");
}
function desdeCongestion(opciones) {
  const { titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {}, variante = "reno" } = opciones;
  const rondas = simularCongestion(opciones);
  const maximo = Math.max(...rondas.map((r3) => Math.max(r3.cwnd, r3.umbral)));
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 320, y: arriba + 300, ancho: 600, alto: 560 } : { x: 560, y: arriba + 375, ancho: 1020, alto: 720 };
    const pan = angosta ? { x: 24, y: arriba + 630, tamano: 24 } : { x: 1110, y: arriba + 140, tamano: 30 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.plano = plano({
      ...pl,
      xmin: 0,
      xmax: rondas.length + 1,
      ymin: 0,
      ymax: Math.ceil(maximo * 1.15) + 1,
      etiquetaX: "ronda (RTT)",
      etiquetaY: "cwnd (segmentos)",
      tamano: angosta ? 15 : 19,
      decimales: 0
    });
    const escalones = [];
    rondas.forEach((r3, i) => {
      if (i > 0 && rondas[i - 1].umbral !== r3.umbral) escalones.push([r3.ronda - 0.5, rondas[i - 1].umbral], [r3.ronda - 0.5, r3.umbral]);
      escalones.push([r3.ronda, r3.umbral]);
    });
    piezas.umbral = grafica({ plano: "plano", datos: [[0.5, rondas[0].umbral], ...escalones, [rondas.length + 0.5, rondas.at(-1).umbral]], color: "alerta", punteada: true, grosor: 3, trazo: 0, etiqueta: "umbral" });
    piezas.cwnd = grafica({ plano: "plano", datos: [[1, rondas[0].cwnd]], color: "acento", grosor: 4.5, trazo: 1 });
    piezas.marca = punto({ plano: "plano", mx: 1, my: rondas[0].cwnd, color: "acento", radio: 9, opacidad: 0 });
    const nombres = ["ronda", "ventana", "umbralTexto", "fase"];
    nombres.forEach((nombre, i) => {
      piezas[nombre] = texto2({ x: pan.x, y: pan.y + i * pan.tamano * 1.9, texto: "", tamano: pan.tamano, alineacion: "inicio", opacidad: 0, anchoMax: angosta ? 600 : 470 });
    });
    piezas.fase.props.peso = 700;
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const datos = [];
    const panel = (r3, extra = {}) => [
      { pieza: "ronda", a: { texto: `Ronda ${r3.ronda}`, opacidad: 1 }, dur: 0 },
      { pieza: "ventana", a: { texto: `cwnd = ${r3.cwnd}`, opacidad: 1 }, dur: 0 },
      { pieza: "umbralTexto", a: { texto: `umbral = ${r3.umbral}`, opacidad: 1 }, dur: 0 },
      { pieza: "fase", a: { texto: extra.fase ?? r3.fase, color: r3.fase === "slow start" ? "acento" : "exito", opacidad: 1 }, dur: 0 }
    ];
    n.capitulo("Slow start");
    n.animar({ pieza: "umbral", a: { trazo: 1 }, dur: 1 });
    n.decir(`TCP no sabe cu\xE1nto aguanta la red, as\xED que arranca con una ventana de ${rondas[0].cwnd} y la va agrandando. La l\xEDnea punteada es el umbral: ${rondas[0].umbral}.`);
    let faseAnterior = rondas[0].fase;
    rondas.forEach((r3, i) => {
      n.preguntar(r3.ronda);
      datos.push([r3.ronda, r3.cwnd]);
      n.animar([
        { pieza: "cwnd", a: { datos: datos.map((x) => [...x]) }, dur: 0 },
        { pieza: "marca", a: { mx: r3.ronda, my: r3.cwnd, opacidad: 1, color: r3.fase === "slow start" ? "acento" : "exito" }, dur: 0.35 * ritmo },
        ...panel(r3)
      ]);
      if (i === 0) {
        n.decir("En slow start, por cada ACK la ventana crece un segmento: en cada ronda se duplica.", 0.2);
      } else if (r3.fase !== faseAnterior && r3.fase === "congestion avoidance") {
        n.capitulo("Congestion avoidance");
        n.decir(`La ventana lleg\xF3 al umbral (${r3.umbral}): de ac\xE1 en m\xE1s crece de a un segmento por ronda. Es congestion avoidance.`, 0.2);
      } else if (r3.fase !== faseAnterior && r3.fase === "slow start") {
        n.decir("Como volvi\xF3 a 1, arranca otra vez en slow start, duplicando hasta el umbral nuevo.", 0.2);
      } else {
        n.esperar(0.55);
      }
      faseAnterior = r3.fase;
      if (r3.evento) {
        const siguiente = rondas[i + 1];
        n.capitulo(r3.evento === "timeout" ? `Timeout en la ronda ${r3.ronda}` : `Tres ACK duplicados en la ronda ${r3.ronda}`);
        n.animar({ pieza: "marca", a: { color: "error" }, dur: 0.3 });
        const nuevoUmbral = siguiente ? siguiente.umbral : Math.max(Math.floor(r3.cwnd / 2), 2);
        const nuevaVentana = siguiente ? siguiente.cwnd : 1;
        n.decir(r3.evento === "timeout" ? `Vence un timer: algo se perdi\xF3 y no llegan ACK. Es la se\xF1al m\xE1s grave. El umbral pasa a la mitad de la ventana (${nuevoUmbral}) y la ventana vuelve a ${nuevaVentana}.` : variante === "reno" ? `Llegan tres ACK duplicados: se perdi\xF3 un segmento, pero los siguientes llegan. Es una congesti\xF3n leve. El umbral pasa a la mitad (${nuevoUmbral}) y, en Reno, la ventana sigue desde ah\xED: ${nuevaVentana}.` : `Llegan tres ACK duplicados. En Tahoe se trata igual que un timeout: el umbral pasa a la mitad (${nuevoUmbral}) y la ventana vuelve a 1.`);
      }
    });
    n.capitulo("El serrucho");
    n.decir("As\xED se ve TCP en una conexi\xF3n larga: sube hasta que algo se pierde, baja, y vuelve a subir. Va tanteando cu\xE1nto aguanta la red.");
    return {
      titulo: titulo || "Control de congesti\xF3n de TCP",
      descripcion: descripcion || `La ventana de congesti\xF3n de TCP ${variante === "reno" ? "Reno" : "Tahoe"} durante ${rondas.length} rondas: ${rondas.map((r3) => r3.cwnd).join(", ")}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeSubred(opciones) {
  const { titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const ip = analizarIp(opciones.direccion);
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    const fila = angosta ? { x: 320, ancho: 600, tamano: 24, alto: 108, y0: arriba + 70 } : { x: 800, ancho: 1400, tamano: 34, alto: 110, y0: arriba + 90 };
    const filas = [
      ["ip", "IP", ip.direccion, ip.bits.direccion],
      ["mascara", `M\xE1scara /${ip.prefijo}`, ip.mascara, ip.bits.mascara],
      ["red", "Red", ip.red, ip.bits.red],
      ["broadcast", "Broadcast", ip.broadcast, ip.bits.broadcast]
    ];
    filas.forEach(([id, rotulo, decimal, bits], i) => {
      piezas[id] = direccionIp({
        x: fila.x,
        y: fila.y0 + i * fila.alto,
        ancho: fila.ancho,
        tamano: fila.tamano,
        rotulo,
        decimal,
        bits,
        prefijo: ip.prefijo,
        verBits: 0,
        verMascara: 0,
        opacidad: 0
      });
    });
    const yPanel = fila.y0 + 4 * fila.alto + (angosta ? 30 : 20);
    ["hosts", "rango", "clase"].forEach((id, i) => {
      piezas[id] = texto2({
        x: angosta ? 24 : 200,
        y: yPanel + i * (angosta ? 60 : 56),
        texto: "",
        tamano: angosta ? 23 : 32,
        alineacion: "inicio",
        anchoMax: angosta ? 600 : 1300,
        opacidad: 0
      });
    });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo(`${ip.direccion}/${ip.prefijo}`);
    n.animar({ pieza: "ip", a: { opacidad: 1 }, dur: 0.4 });
    n.decir(`La direcci\xF3n ${ip.direccion}/${ip.prefijo}. Son cuatro n\xFAmeros de 0 a 255, uno por octeto.`);
    n.animar({ pieza: "ip", a: { verBits: 1 }, dur: 0.8 });
    n.decir("Cada octeto son 8 bits: en total, 32. Las cuentas de subredes se hacen con los bits, no con los n\xFAmeros.");
    n.capitulo("La m\xE1scara");
    n.animar({ pieza: "mascara", a: { opacidad: 1, verBits: 1 }, dur: 0.6 });
    n.decir(`El /${ip.prefijo} dice cu\xE1ntos bits, desde la izquierda, son de la red: ${ip.prefijo} unos y ${ip.bitsHost} ceros. En decimal, ${ip.mascara}.`);
    n.animar({ pieza: ["ip", "mascara"], a: { verMascara: 1 }, dur: 0.6 });
    n.decir(`En azul, los ${ip.prefijo} bits de red: son iguales para toda la subred. En naranja, los ${ip.bitsHost} bits de host: cambian de una m\xE1quina a otra.`);
    n.preguntar("red");
    n.capitulo("La direcci\xF3n de red");
    n.animar({ pieza: "red", a: { opacidad: 1, verBits: 1, verMascara: 1, resaltado: 1 }, dur: 0.6 });
    n.decir(`La direcci\xF3n de red es la IP con todos los bits de host en 0: un AND bit a bit con la m\xE1scara. Da ${ip.red}.`);
    n.animar({ pieza: "red", a: { resaltado: 0 }, dur: 0.3 });
    n.capitulo("Broadcast");
    n.animar({ pieza: "broadcast", a: { opacidad: 1, verBits: 1, verMascara: 1, resaltado: 1 }, dur: 0.6 });
    n.decir(`Y la de broadcast, con todos los bits de host en 1: ${ip.broadcast}. Un mensaje a esa direcci\xF3n le llega a todas las m\xE1quinas de la subred.`);
    n.animar({ pieza: "broadcast", a: { resaltado: 0 }, dur: 0.3 });
    n.preguntar("hosts");
    n.capitulo("\xBFCu\xE1ntos hosts?");
    n.animar([
      { pieza: "hosts", a: { texto: `Hosts: 2^${ip.bitsHost} \u2212 2 = ${ip.hosts}`, opacidad: 1, peso: 700 }, dur: 0.4 },
      { pieza: "rango", a: { texto: `Rango: de ${ip.primero} a ${ip.ultimo}`, opacidad: 1 }, dur: 0.4 },
      { pieza: "clase", a: { texto: `Clase ${ip.clase}${ip.privada ? ", privada" : ", p\xFAblica"}${ip.esRed ? " \xB7 es la direcci\xF3n de red" : ip.esBroadcast ? " \xB7 es la de broadcast" : ""}`, opacidad: 1, color: "suave" }, dur: 0.4 }
    ]);
    n.decir(`Con ${ip.bitsHost} bits de host hay 2^${ip.bitsHost} = ${2 ** ip.bitsHost} combinaciones, pero dos no se pueden usar: la de red y la de broadcast. Quedan ${ip.hosts} hosts, de ${ip.primero} a ${ip.ultimo}.`);
    return {
      titulo: titulo || `La subred de ${ip.direccion}/${ip.prefijo}`,
      descripcion: descripcion || `${ip.direccion}/${ip.prefijo}: m\xE1scara ${ip.mascara}, red ${ip.red}, broadcast ${ip.broadcast}, ${ip.hosts} hosts de ${ip.primero} a ${ip.ultimo}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
export {
  aBits,
  analizarIp,
  desdeCongestion,
  desdeIntercambio,
  desdeSubred,
  desdeVentana,
  direccionIp,
  dividirEnSubredes,
  geometriaSecuencia,
  secuencia,
  simularArq,
  simularCongestion,
  ventanaDeslizante
};

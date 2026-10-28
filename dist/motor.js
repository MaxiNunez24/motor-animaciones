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

// src/piezas/geometria.js
function posicionAbsoluta(id, estado, tipos) {
  const p = estado.piezas[id];
  const tam = tipos[id].tamano?.(p) ?? { ancho: 0, alto: 0 };
  const c = tipos[id].centro?.(p) ?? { x: 0, y: 0 };
  let x = p.x + c.x * p.escala;
  let y = p.y + c.y * p.escala;
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
function aCoordenadasDe(punto, contenedor, estado, tipos) {
  const donde = (x, y) => {
    const falso = { piezas: { ...estado.piezas, __punto: { x, y, escala: 1, dentro: contenedor } } };
    return posicionAbsoluta("__punto", falso, { ...tipos, __punto: {} });
  };
  const origen = donde(0, 0);
  const escala = donde(1, 0).x - origen.x || 1;
  return { x: (punto.x - origen.x) / escala, y: (punto.y - origen.y) / escala, escala };
}
function caminoFlecha(a, b, curvatura = 0, separacion = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo2 = Math.hypot(dx, dy) || 1;
  const c = {
    x: (a.x + b.x) / 2 - dy / largo2 * curvatura * largo2,
    y: (a.y + b.y) / 2 + dx / largo2 * curvatura * largo2
  };
  if (curvatura === 0) {
    const p0 = bordeHacia(a, b, separacion);
    const p1 = bordeHacia(b, a, separacion);
    return { p0, c: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, p1 };
  }
  return { p0: bordeHacia(a, c, separacion), c, p1: bordeHacia(b, c, separacion) };
}
function bordeHacia(r3, hacia, separacion) {
  const dx = hacia.x - r3.x;
  const dy = hacia.y - r3.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { x: r3.x, y: r3.y };
  const ux = dx / d;
  const uy = dy / d;
  const mx = (r3.ancho ?? 0) / 2;
  const my = (r3.alto ?? 0) / 2;
  const hastaBorde = Math.min(
    ux === 0 ? Infinity : mx / Math.abs(ux),
    uy === 0 ? Infinity : my / Math.abs(uy)
  );
  const t = (Number.isFinite(hastaBorde) ? hastaBorde : 0) + separacion;
  return { x: r3.x + ux * t, y: r3.y + uy * t };
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

// src/nucleo/vinculos.js
var LADOS = ["derecha", "izquierda", "arriba", "abajo", "centro"];
function revisarVinculos(piezas) {
  const enFila = {};
  for (const [id, p] of Object.entries(piezas)) {
    const pegar = p.base.pegar;
    if (pegar != null) {
      if (typeof pegar !== "object" || typeof pegar.a !== "string") {
        throw new Error(`"${id}" tiene pegar, pero le falta "a": el id de la pieza a la que se pega, por ejemplo pegar: { a: 'caja', lado: 'derecha' }.`);
      }
      if (!piezas[pegar.a]) throw new Error(`"${id}" se pega a "${pegar.a}", y no hay ninguna pieza que se llame as\xED.`);
      if (pegar.lado != null && !LADOS.includes(pegar.lado)) {
        throw new Error(`"${id}" se pega del lado "${pegar.lado}": los lados son ${LADOS.join(", ")}.`);
      }
    }
    if (p.tipo.nombre === "fila") {
      for (const hijo of p.base.piezas) {
        if (!piezas[hijo]) throw new Error(`La fila "${id}" lleva "${hijo}", y no hay ninguna pieza que se llame as\xED.`);
        if (enFila[hijo]) throw new Error(`"${hijo}" est\xE1 en dos filas: "${enFila[hijo]}" y "${id}".`);
        if (piezas[hijo].base.pegar != null) throw new Error(`"${hijo}" est\xE1 en la fila "${id}" y adem\xE1s pegada a otra pieza: es una cosa o la otra.`);
        enFila[hijo] = id;
      }
    }
  }
  return enFila;
}
function hayVinculos(piezas) {
  return Object.values(piezas).some((p) => p.base.pegar != null || p.tipo.nombre === "fila");
}
function resolverVinculos(props, tipos, enFila) {
  const estado = { piezas: props };
  const medidas2 = {};
  const medir3 = (id, camino = /* @__PURE__ */ new Set()) => {
    if (medidas2[id]) return medidas2[id];
    if (camino.has(id)) throw new Error(`La fila "${id}" est\xE1 dentro de s\xED misma.`);
    camino.add(id);
    const f = props[id];
    const horizontal = f.direccion !== "vertical";
    let largo2 = 0;
    let ancho = 0;
    const tramos = f.piezas.map((hijo, k) => {
      if (tipos[hijo].nombre === "fila") medir3(hijo, camino);
      const t = posicionAbsoluta(hijo, estado, tipos);
      const [a, b] = horizontal ? [t.ancho, t.alto] : [t.alto, t.ancho];
      const hueco = k === 0 ? 0 : f.separacion * Math.min(Math.max(props[hijo].escala, 0), 1);
      largo2 += hueco + a;
      ancho = Math.max(ancho, b);
      return { hijo, largo: a, ancho: b, hueco };
    });
    f.ancho = horizontal ? largo2 : ancho;
    f.alto = horizontal ? ancho : largo2;
    return medidas2[id] = { tramos, largo: largo2, ancho, horizontal };
  };
  for (const id of Object.keys(props)) if (tipos[id].nombre === "fila") medir3(id);
  const listo = /* @__PURE__ */ new Set();
  const resolver = (id, camino = /* @__PURE__ */ new Set()) => {
    if (listo.has(id)) return;
    if (camino.has(id)) throw new Error(`"${id}" depende de s\xED misma dando una vuelta: revis\xE1 los pegar y las filas.`);
    camino.add(id);
    const p = props[id];
    if (p.dentro != null) resolver(p.dentro, camino);
    const fila2 = enFila[id];
    if (fila2) {
      resolver(fila2, camino);
      ubicar(id, lugarEnFila(fila2, id), p);
    } else if (p.pegar != null) {
      resolver(p.pegar.a, camino);
      ubicar(id, lugarPegado(id, p.pegar), p);
    }
    listo.add(id);
  };
  const lugarEnFila = (fila2, hijo) => {
    const m = medidas2[fila2];
    const f = posicionAbsoluta(fila2, estado, tipos);
    const centroLargo = m.horizontal ? f.x : f.y;
    const centroAncho = m.horizontal ? f.y : f.x;
    let cursor = centroLargo - m.largo / 2;
    for (const t of m.tramos) {
      cursor += t.hueco;
      if (t.hijo === hijo) {
        const a = alineado(props[fila2].alinear, centroAncho, m.ancho, t.ancho);
        const l = cursor + t.largo / 2;
        return m.horizontal ? { x: l, y: a } : { x: a, y: l };
      }
      cursor += t.largo;
    }
    return null;
  };
  const lugarPegado = (id, pegar) => {
    const otra = posicionAbsoluta(pegar.a, estado, tipos);
    const yo = posicionAbsoluta(id, estado, tipos);
    const sep = pegar.separacion ?? 0;
    const lado = pegar.lado ?? "derecha";
    let x = otra.x;
    let y = otra.y;
    if (lado === "derecha") x = otra.x + otra.ancho / 2 + sep + yo.ancho / 2;
    if (lado === "izquierda") x = otra.x - otra.ancho / 2 - sep - yo.ancho / 2;
    if (lado === "abajo") y = otra.y + otra.alto / 2 + sep + yo.alto / 2;
    if (lado === "arriba") y = otra.y - otra.alto / 2 - sep - yo.alto / 2;
    if (lado === "derecha" || lado === "izquierda") y = alineado(pegar.alinear, otra.y, otra.alto, yo.alto);
    if (lado === "arriba" || lado === "abajo") x = alineado(pegar.alinear, otra.x, otra.ancho, yo.ancho);
    return { x: x + (pegar.dx ?? 0), y: y + (pegar.dy ?? 0) };
  };
  const ubicar = (id, lugar, p) => {
    if (!lugar) return;
    const local = p.dentro != null ? { ...aCoordenadasDe(lugar, p.dentro, estado, tipos) } : { ...lugar };
    const c = tipos[id].centro?.(p) ?? { x: 0, y: 0 };
    local.x -= c.x * p.escala;
    local.y -= c.y * p.escala;
    const k = Math.min(Math.max(p.pegado ?? 1, 0), 1);
    p.x += (local.x - p.x) * k;
    p.y += (local.y - p.y) * k;
  };
  for (const id of Object.keys(props)) resolver(id);
}
function alineado(alinear, centro, largoOtra, largoMio) {
  if (alinear === "inicio") return centro - largoOtra / 2 + largoMio / 2;
  if (alinear === "fin") return centro + largoOtra / 2 - largoMio / 2;
  return centro;
}

// src/nucleo/linea.js
var SUAVES_SIEMPRE = /* @__PURE__ */ new Set(["opacidad"]);
function duracionLectura(texto3, caracteresPorSegundo = 15) {
  return Math.max(1.5, String(texto3).length / caracteresPorSegundo);
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
  const enFila = revisarVinculos(piezas);
  const conVinculos = hayVinculos(piezas);
  const tiposPorId = Object.fromEntries(Object.values(piezas).map((p) => [p.id, p.tipo]));
  const capitulos = [];
  const subtitulos = [];
  const marcas = [];
  let fin = 0;
  let finSubtitulos = 0;
  let finUltimoSubtitulo = 0;
  let previo = { inicio: 0, fin: 0 };
  let orden = 0;
  (def.linea ?? []).forEach((item, i) => {
    const donde = `el paso ${i + 1} de la l\xEDnea`;
    const inicio = resolverEn(item.en, fin, previo, donde);
    let finItem = inicio;
    if ("capitulo" in item) {
      capitulos.push({ nombre: String(item.capitulo), t: inicio });
    } else if ("subtitulo" in item) {
      const dur = item.dur ?? (item.hasta != null ? item.hasta - inicio : duracionLectura(item.subtitulo, def.lectura));
      subtitulos.push({ texto: String(item.subtitulo), desde: inicio, hasta: inicio + dur });
      finSubtitulos = Math.max(finSubtitulos, inicio + dur);
      finUltimoSubtitulo = inicio + dur;
      return;
    } else if ("marca" in item) {
      finItem = inicio + (item.dur ?? 0);
      marcas.push({ tipo: String(item.marca), t: inicio, hasta: finItem, datos: item.datos ?? null });
    } else if ("espera" in item) {
      finItem = item.espera === "subtitulo" ? Math.max(inicio, finUltimoSubtitulo) : inicio + item.espera;
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
      throw new Error(`No entiendo ${donde}: tiene que ser una animaci\xF3n (pieza), un capitulo, un subtitulo, una marca o una espera.`);
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
  marcas.sort((a, b) => a.t - b.t);
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
    /** Las marcas, en orden: { tipo, t, hasta, datos }. */
    marcas,
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
      if (conVinculos) resolverVinculos(props, tiposPorId, enFila);
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
   *     paradas?: number[],
   *     alParar?: (t: number) => void,
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
    this.paradas = [...opciones.paradas ?? []].sort((a, b) => a - b);
    this.alParar = opciones.alParar ?? (() => {
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
  /** Cambia dónde se frena solo. */
  fijarParadas(paradas) {
    this.paradas = [...paradas].sort((a, b) => a - b);
  }
  destruir() {
    this.pausar();
    this.alCambiar = () => {
    };
    this.alCambiarEstado = () => {
    };
    this.alParar = () => {
    };
  }
  _cuadro() {
    const ahora = this.ahora();
    const paso = Math.min((ahora - this._ultimo) / 1e3, PASO_MAXIMO) * this.velocidad;
    this._ultimo = ahora;
    let t = this.t + paso;
    const parada = this.paradas.find((p) => p > this.t && p <= Math.min(t, this.duracion));
    if (parada !== void 0) {
      this._fijar(parada);
      this.pausar();
      this.alParar(parada);
      return;
    }
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

// src/pintor/pintor.js
function crearPintor(svg, escena, opciones = {}) {
  const arrastres = opciones.arrastres ?? {};
  svg.replaceChildren();
  poner(svg, {
    viewBox: `0 0 ${escena.ancho} ${escena.alto}`,
    preserveAspectRatio: "xMidYMid meet"
  });
  el("rect", { x: 0, y: 0, width: escena.ancho, height: escena.alto, fill: "var(--ma-fondo)" }, svg);
  const marco = idUnico("ma-marco");
  el("rect", { x: 0, y: 0, width: escena.ancho, height: escena.alto }, el("clipPath", { id: marco }, el("defs", {}, svg)));
  const raiz = el("g", { "clip-path": `url(#${marco})` }, svg);
  const inicial = escena.estado(0);
  const ctx = { estado: inicial, tipos: escena.tipos, id: "", ids: escena.ids, arrastres };
  const nodos = {};
  for (const id of escena.ids) {
    const tipo = escena.tipos[id];
    const props = inicial.piezas[id];
    const padre = props.dentro != null ? nodos[props.dentro].contenido : raiz;
    const grupo = (
      /** @type {SVGGElement} */
      el("g", { "data-pieza": id }, padre)
    );
    ctx.id = id;
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
        const corrida = arrastres[id] ?? { x: 0, y: 0 };
        poner(nodo.grupo, {
          transform: `translate(${r(p.x + corrida.x)} ${r(p.y + corrida.y)})` + (p.rotacion ? ` rotate(${r(p.rotacion)})` : "") + (p.escala !== 1 ? ` scale(${r(p.escala)})` : ""),
          opacity: p.opacidad >= 1 ? null : r(p.opacidad),
          // Lo invisible tampoco se lee en voz alta ni se puede tocar.
          visibility: invisible ? "hidden" : null
        });
        if (invisible || !nodo.tipo.dependeDeOtras && iguales(nodo.ultimo, p)) continue;
        ctx.id = id;
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
      const donde = (t) => `left: ${(t / duracion * 100).toFixed(2)}%`;
      marcas.innerHTML = capitulos.filter((c) => c.t > 0).map((c) => `<span style="${donde(c.t)}"></span>`).concat(extras.map((m) => `<span class="${m.clase}" style="${donde(m.t)}">${m.texto ?? ""}</span>`)).join("");
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

/* Una grilla de tres renglones: el dibujo, los subt\xEDtulos y los controles.
   Cuando los controles flotan (o los subt\xEDtulos, en pantalla completa), van
   en el mismo rengl\xF3n que el dibujo, encima de \xE9l. */
.ma-raiz {
    container-type: inline-size;
    font-family: var(--ma-fuente);
    color: var(--ma-texto);
    background: var(--ma-fondo);
    border-radius: 12px;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "escena" "subtitulo" "controles";
}

.ma-lienzo {
    grid-area: escena;
    position: relative;
    outline: none;
    overflow: hidden;
    /* Con el dedo se puede seguir bajando por la p\xE1gina; el pellizco para
       el zoom lo maneja el componente. Con zoom, arrastrar mueve el dibujo. */
    touch-action: pan-y;
}
[data-arrastrable] {
    cursor: grab;
    touch-action: none;
}
.ma-raiz.con-zoom .ma-lienzo {
    touch-action: none;
    cursor: grab;
}
.ma-raiz.arrastrando .ma-lienzo,
.ma-raiz.arrastrando [data-arrastrable],
.ma-raiz.con-zoom.arrastrando .ma-lienzo {
    cursor: grabbing;
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
    grid-area: subtitulo;
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
.ma-raiz:not(.con-subtitulos) .ma-subtitulo,
.ma-raiz.sin-textos .ma-subtitulo,
.ma-raiz.sin-textos [data-accion="subtitulos"] {
    display: none;
}

/* ---- Controles ---- */
.ma-controles {
    grid-area: controles;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    padding: 6px 8px 8px;
    border-top: 1px solid var(--ma-borde);
    background: var(--ma-superficie);
}
.ma-raiz.sin-controles .ma-controles,
.ma-raiz.sin-controles .ma-zoom {
    display: none;
}

/* Con mouse (y siempre en pantalla completa), los controles flotan sobre la
   parte de abajo del dibujo y se esconden mientras corre la animaci\xF3n: as\xED
   el dibujo usa todo el lugar. Vuelven al mover el mouse, al tocar, al llegar
   con el teclado o al pausar. En un celular, fuera de la pantalla completa,
   quedan fijos abajo: no hay un mouse que pase por encima para mostrarlos. */
.ma-raiz.flotantes .ma-controles {
    grid-area: escena;
    align-self: end;
    z-index: 3;
    border-top: 0;
    padding-top: 36px;
    /* Un velo que se oscurece de a poco, sin un borde donde empieza: con dos
       paradas el ojo ve una franja. */
    background: linear-gradient(
        transparent,
        color-mix(in srgb, var(--ma-superficie) 25%, transparent) 14px,
        color-mix(in srgb, var(--ma-superficie) 60%, transparent) 30px,
        color-mix(in srgb, var(--ma-superficie) 85%, transparent) 48px,
        color-mix(in srgb, var(--ma-superficie) 92%, transparent));
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.ma-raiz.flotantes:not(.ver-controles) .ma-controles,
.ma-raiz.flotantes:not(.ver-controles) .ma-zoom {
    opacity: 0;
}
/* Al irse bajan un poquito: se van, no se apagan de golpe. */
.ma-raiz.flotantes:not(.ver-controles) .ma-controles {
    transform: translateY(8px);
}
.ma-raiz.flotantes.sin-cursor {
    cursor: none;
}

/* ---- Zoom ---- */
.ma-zoom {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 3;
    display: flex;
    gap: 6px;
    transition: opacity 0.25s;
}
.ma-zoom button {
    min-width: 40px;
    height: 40px;
    padding: 0 8px;
    border: 1px solid var(--ma-borde);
    border-radius: 20px;
    background: color-mix(in srgb, var(--ma-superficie) 92%, transparent);
    color: var(--ma-texto);
    font: 700 18px/1 var(--ma-fuente);
    cursor: pointer;
}
.ma-zoom button:hover {
    border-color: var(--ma-acento);
}
.ma-zoom button:focus-visible {
    outline: 3px solid var(--ma-acento);
    outline-offset: 1px;
}
.ma-zoom [data-zoom="normal"] {
    font-size: 15px;
}
.ma-raiz:not(.con-zoom) .ma-zoom [data-zoom="normal"] {
    display: none;
}
/* Con el dedo se hace zoom pellizcando: los botones de + y \u2212 sobran y
   tapar\xEDan el dibujo de un celular. Queda solo el de volver al tama\xF1o normal. */
.ma-raiz:not(.flotantes) .ma-zoom [data-zoom="acercar"],
.ma-raiz:not(.flotantes) .ma-zoom [data-zoom="alejar"] {
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
/* Una pregunta: un "?" chiquito arriba de la barra. Dice "ac\xE1 te van a
   preguntar algo" sin adelantar qu\xE9, y sirve para volver a esa parte. */
.ma-marcas span.pregunta {
    top: -1px;
    width: 15px;
    height: 15px;
    margin-left: -7.5px;
    border-radius: 50%;
    background: var(--ma-acento);
    color: var(--ma-fondo);
    font: 800 11px/15px var(--ma-fuente);
    text-align: center;
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

/* En la columna de una clase (unos 650px) todo entra en un rengl\xF3n si los
   botones se aprietan un poco; si no, el \xFAltimo se cae solo a un rengl\xF3n nuevo. */
@container (max-width: 720px) {
    .ma-controles {
        gap: 4px 2px;
    }
    .ma-controles button {
        min-width: 40px;
        padding: 0 4px;
    }
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
/* Todo va en un solo rengl\xF3n: el dibujo ocupa la pantalla entera, y los
   subt\xEDtulos y los controles van encima. Si los subt\xEDtulos fueran en un
   rengl\xF3n propio, el dibujo quedar\xEDa m\xE1s chico en pantalla completa que en la
   p\xE1gina. */
:host([pantalla]) .ma-raiz,
:host(:fullscreen) .ma-raiz {
    height: 100%;
    border-radius: 0;
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: "escena";
}
:host([pantalla]) .ma-lienzo,
:host(:fullscreen) .ma-lienzo {
    min-height: 0;
}
:host([pantalla]) .ma-lienzo svg,
:host(:fullscreen) .ma-lienzo svg {
    height: 100%;
}
/* El subt\xEDtulo, como en el cine: un rengl\xF3n sobre la parte de abajo. El
   dibujo se pega arriba (preserveAspectRatio), as\xED que si la pantalla es m\xE1s
   alta que la escena el subt\xEDtulo cae en el lugar que sobra, sin tapar nada. */
:host([pantalla]) .ma-subtitulo,
:host(:fullscreen) .ma-subtitulo {
    grid-area: escena;
    align-self: end;
    justify-self: center;
    z-index: 2;
    min-height: 0;
    max-width: min(92%, 64ch);
    margin-bottom: max(12px, 2.5vh);
    padding: 0.25em 0.8em;
    border-radius: 0.4em;
    background: color-mix(in srgb, var(--ma-fondo) 85%, transparent);
    font-size: clamp(18px, 2.2cqi, 46px);
    pointer-events: none;
    transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
:host([pantalla]) .ma-subtitulo:empty,
:host(:fullscreen) .ma-subtitulo:empty {
    display: none;
}
/* Cuando aparecen los controles, el subt\xEDtulo sube para no quedar abajo de ellos. */
:host([pantalla]) .ver-controles .ma-subtitulo,
:host(:fullscreen) .ver-controles .ma-subtitulo {
    transform: translateY(calc(-1 * var(--ma-alto-controles, 0px)));
}
/* Con una pregunta abierta (en <motor-leccion>), la pregunta ocupa la parte
   de abajo: el subt\xEDtulo sube y queda justo encima de ella. Arriba de todo
   tapar\xEDa el t\xEDtulo de la escena. --ma-alto-pregunta lo mide la lecci\xF3n. */
:host([pantalla]) .con-pregunta .ma-subtitulo,
:host(:fullscreen) .con-pregunta .ma-subtitulo {
    transform: translateY(calc(-1 * var(--ma-alto-pregunta, 0px)));
}
:host([pantalla]) .con-pregunta.ver-controles .ma-subtitulo,
:host(:fullscreen) .con-pregunta.ver-controles .ma-subtitulo {
    transform: translateY(calc(-1 * (var(--ma-alto-pregunta, 0px) + var(--ma-alto-controles, 0px))));
}
/* Sin controles no hay nada que apuntar: que el mouse no quede en el medio
   de la pantalla de la Expo. */
:host([pantalla][sin-controles]) {
    cursor: none;
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
var ANCHO_MEDIO = 900;
var MotorEscena = class extends Base {
  static observedAttributes = ["escena", "tema", "movimiento", "velocidad", "loop", "sin-controles", "sin-subtitulos", "controles-fijos", "pantalla"];
  constructor() {
    super();
    const sombra = this.attachShadow({ mode: "open" });
    sombra.innerHTML = `
            <style>${ESTILOS}</style>
            <div class="ma-raiz con-subtitulos" part="raiz">
                <div class="ma-lienzo" tabindex="0">
                    <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ma-titulo" aria-describedby="ma-descripcion"></svg>
                    <div class="ma-zoom" role="group" aria-label="Zoom">
                        <button type="button" data-zoom="alejar" aria-label="Alejar">\u2212</button>
                        <button type="button" data-zoom="acercar" aria-label="Acercar">+</button>
                        <button type="button" data-zoom="normal" aria-label="Volver al tama\xF1o normal">1\xD7</button>
                    </div>
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
    this._controles = /** @type {HTMLElement} */
    sombra.querySelector(".ma-controles");
    this._definicion = null;
    this._compilada = null;
    this._pintor = null;
    this._arrastres = {};
    this._agarrada = null;
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
      alParar: (t) => this._alParar(t)
    });
    this._barra = crearBarra(this._controles, {
      alternar: () => this._alternarPorUsuario(),
      anterior: () => this.capituloAnterior(),
      siguiente: () => this.capituloSiguiente(),
      irA: (t) => this.irA(t),
      velocidad: (v) => this._cambiarVelocidad(v),
      subtitulos: (prendidos) => this._subtitulos(prendidos),
      pantalla: () => this._pantallaCompleta()
    });
    this._lienzo.addEventListener("keydown", (e) => this._tecla(e));
    this._lienzo.addEventListener("click", () => {
      if (this._arrastro) this._arrastro = false;
      else this._alternarPorUsuario();
    });
    this._zoom = { escala: 1, x: 0, y: 0 };
    this._dedos = /* @__PURE__ */ new Map();
    this._pellizco = null;
    this._movido = 0;
    this._arrastro = false;
    const zoom = (
      /** @type {HTMLElement} */
      sombra.querySelector(".ma-zoom")
    );
    zoom.addEventListener("click", (e) => {
      e.stopPropagation();
      const boton = (
        /** @type {HTMLElement} */
        e.target.closest("button")
      );
      if (boton) this._accionZoom(boton.dataset.zoom);
    });
    zoom.addEventListener("pointerdown", (e) => e.stopPropagation());
    this._lienzo.addEventListener("wheel", (e) => this._rueda(e), { passive: false });
    this._lienzo.addEventListener("pointerdown", (e) => this._dedoAbajo(e));
    this._lienzo.addEventListener("pointermove", (e) => this._dedoMueve(e));
    for (const fin of ["pointerup", "pointercancel"]) this._lienzo.addEventListener(fin, (e) => this._dedoArriba(e));
    this._vista = { dentro: false, reciente: false, sobreControles: false, foco: false, tactil: false, tocado: false, pregunta: false };
    this._temporizador = void 0;
    const moverse = (e) => {
      if (e.pointerType) this._vista.tactil = e.pointerType === "touch";
      this._vista.tocado = true;
      this._vista.reciente = true;
      clearTimeout(this._temporizador);
      this._temporizador = setTimeout(() => {
        this._vista.reciente = false;
        this._actualizarVista();
      }, 2500);
      this._actualizarVista();
    };
    this.addEventListener("pointermove", moverse);
    this.addEventListener("pointerdown", moverse);
    this._lienzo.addEventListener("keydown", moverse);
    this.addEventListener("pointerenter", () => {
      this._vista.dentro = true;
      this._actualizarVista();
    });
    this.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") this._vista.dentro = false;
      this._actualizarVista();
    });
    this._controles.addEventListener("pointerenter", () => {
      this._vista.sobreControles = true;
      this._actualizarVista();
    });
    this._controles.addEventListener("pointerleave", () => {
      this._vista.sobreControles = false;
      this._actualizarVista();
    });
    sombra.addEventListener("focusin", () => this._mirarFoco());
    sombra.addEventListener("focusout", () => queueMicrotask(() => this._mirarFoco()));
    new ResizeObserver(() => {
      this._raiz.style.setProperty("--ma-alto-controles", `${this._controles.offsetHeight}px`);
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
    this._escuchar(matchMedia("(hover: hover) and (pointer: fine)"), "change", () => this._actualizarVista());
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
    if (nombre === "escena") this._buscarEscena();
    else if (nombre === "movimiento" || nombre === "tema" || nombre === "pantalla") this._armar();
    else this._aplicarAtributos();
  }
  // ---------------- Para las capas de arriba ----------------
  // Una capa que extiende el componente (la pedagógica) los redefine. Acá
  // no hacen nada: el componente común no sabe de preguntas ni de pasos.
  /** Si los controles van fijos abajo del dibujo (fuera de la pantalla completa). */
  _controlesFijos() {
    return this.hasAttribute("controles-fijos");
  }
  /** Cada vez que la escena se arma (o se rearma por la disposición). */
  _alArmar(compilada) {
  }
  /** Cuando el reloj se frena solo en una de sus paradas. */
  _alParar(t) {
  }
  /** Cada vez que se dibuja un instante. */
  _alPintar(estado) {
  }
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
    this._actualizarVista();
  }
  _calcularDisposicion() {
    const caja2 = this.getBoundingClientRect();
    const ancho = caja2.width || ANCHO_ANGOSTO;
    const alto = caja2.height || 0;
    const llena = this._llena();
    const angosta = llena ? alto > ancho : ancho < ANCHO_ANGOSTO;
    const media = !llena && !angosta && ancho < ANCHO_MEDIO;
    return { nombre: angosta ? "angosta" : media ? "media" : "ancha", ancho, alto };
  }
  _llena() {
    return this.hasAttribute("pantalla") || document.fullscreenElement === this;
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
    this._pintor = crearPintor(this._svg, compilada, { arrastres: this._arrastres });
    this._raiz.classList.toggle("sin-textos", compilada.subtitulos.length === 0);
    this._encuadre();
    this._aplicarZoom();
    this._actualizarVista();
    this._reloj.duracion = compilada.duracion;
    this._titulo.textContent = compilada.titulo || "Animaci\xF3n";
    this._descripcion.textContent = textoAlternativo(compilada);
    this._barra.configurar(compilada, this._marcasDeLaBarra(compilada));
    this._alArmar(compilada);
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
    this._alPintar(estado);
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
    this._encuadre();
  }
  // En pantalla completa y con subtítulos, el dibujo se pega arriba: lo que
  // sobra de alto queda abajo, donde va el subtítulo. Si no, va centrado.
  _encuadre() {
    if (!this._compilada) return;
    const arriba = this._llena() && this._raiz.classList.contains("con-subtitulos");
    this._svg.setAttribute("preserveAspectRatio", arriba ? "xMidYMin meet" : "xMidYMid meet");
  }
  // ---------------- Los controles que se esconden ----------------
  _mirarFoco() {
    const activo = (
      /** @type {HTMLElement | null} */
      this.shadowRoot.activeElement
    );
    this._vista.foco = !!activo && !!activo.closest(".ma-controles, .ma-zoom");
    this._actualizarVista();
  }
  _actualizarVista() {
    if (!this.isConnected) return;
    const llena = this._llena();
    const flotantes = !this.hasAttribute("sin-controles") && (llena || !this._controlesFijos() && matchMedia("(hover: hover) and (pointer: fine)").matches);
    const v = this._vista;
    const ver = v.foco || v.sobreControles || !v.pregunta && (v.reciente || !this._reloj.corriendo && (v.dentro || v.tactil || !v.tocado));
    this._raiz.classList.toggle("flotantes", flotantes);
    this._raiz.classList.toggle("con-pregunta", v.pregunta);
    this._raiz.classList.toggle("ver-controles", ver);
    this._raiz.classList.toggle("sin-cursor", llena && !ver);
  }
  // ---------------- Zoom ----------------
  _accionZoom(accion) {
    if (accion === "acercar") this._zoomEn(1.5);
    else if (accion === "alejar") this._zoomEn(1 / 1.5);
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
    z.x = Math.min(Math.max(z.x, 0), c.ancho - ancho);
    z.y = Math.min(Math.max(z.y, 0), c.alto - alto);
    const r3 = (v) => Math.round(v * 100) / 100;
    this._svg.setAttribute("viewBox", `${r3(z.x)} ${r3(z.y)} ${r3(ancho)} ${r3(alto)}`);
    this._raiz.classList.toggle("con-zoom", z.escala > 1.001);
    const normal = this.shadowRoot.querySelector('[data-zoom="normal"]');
    normal.textContent = `${String(Math.round(z.escala * 10) / 10).replace(".", ",")}\xD7`;
  }
  _rueda(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this._zoomEn(Math.exp(-e.deltaY * 25e-4), e.clientX, e.clientY);
  }
  _dedoAbajo(e) {
    const objetivo = (
      /** @type {Element} */
      e.target
    );
    if (objetivo.closest(".ma-pregunta, .ma-zoom")) return;
    const agarrable = this._dedos.size === 0 && objetivo.closest("[data-arrastrable]");
    if (agarrable) {
      this._agarrada = { id: agarrable.getAttribute("data-arrastrable"), pointerId: e.pointerId, x: e.clientX, y: e.clientY };
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
    if (a && a.pointerId === e.pointerId) {
      const m2 = this._svg.getScreenCTM();
      if (!m2) return;
      const corrida = this._arrastres[a.id] ??= { x: 0, y: 0 };
      corrida.x += (e.clientX - a.x) / m2.a;
      corrida.y += (e.clientY - a.y) / m2.d;
      [a.x, a.y] = [e.clientX, e.clientY];
      this._pintar(this._reloj.t);
      this._arrastro = true;
      this._raiz.classList.add("arrastrando");
      return;
    }
    const antes = this._dedos.get(e.pointerId);
    if (!antes) return;
    const ahora = { x: e.clientX, y: e.clientY };
    this._dedos.set(e.pointerId, ahora);
    if (this._dedos.size === 2 && this._pellizco) {
      const [a2, b] = [...this._dedos.values()];
      const distancia = Math.hypot(a2.x - b.x, a2.y - b.y);
      const objetivo = this._pellizco.escala * (distancia / Math.max(this._pellizco.distancia, 1));
      this._zoomEn(objetivo / this._zoom.escala, (a2.x + b.x) / 2, (a2.y + b.y) / 2);
      this._arrastro = true;
      return;
    }
    if (this._zoom.escala <= 1) return;
    this._movido += Math.abs(ahora.x - antes.x) + Math.abs(ahora.y - antes.y);
    if (this._movido < 5) return;
    const m = this._svg.getScreenCTM();
    if (!m) return;
    this._zoom.x -= (ahora.x - antes.x) / m.a;
    this._zoom.y -= (ahora.y - antes.y) / m.d;
    this._aplicarZoom();
    this._arrastro = true;
    this._raiz.classList.add("arrastrando");
  }
  _dedoArriba(e) {
    if (this._agarrada?.pointerId === e.pointerId) this._agarrada = null;
    this._dedos.delete(e.pointerId);
    if (this._dedos.size < 2) this._pellizco = null;
    this._raiz.classList.remove("arrastrando");
    if (this._arrastro) setTimeout(() => {
      this._arrastro = false;
    }, 0);
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
      End: () => this.irA(this.duracion),
      "+": () => this._zoomEn(1.5),
      "=": () => this._zoomEn(1.5),
      "-": () => this._zoomEn(1 / 1.5),
      0: () => this._zoomEn(0)
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

// src/pedagogico/leccion.js
var ESTILOS2 = `
/* En la p\xE1gina, la pregunta va en un rengl\xF3n propio debajo del dibujo: si lo
   tapara, tapar\xEDa justo lo que hay que mirar para contestarla (la tabla que
   hay que filtrar, la barra cuya proporci\xF3n se pregunta). */
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
       ah\xED, y no tienen que quedarse con los clics de las opciones. */
    z-index: 4;
    transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
/* En pantalla completa no hay rengl\xF3n de abajo: la pregunta va encima del
   dibujo, m\xE1s grande (se lee desde lejos), y se puede achicar para mirar lo
   que tapa. Los controles se esconden mientras est\xE1 abierta (ver
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
/* Cuando el subt\xEDtulo dice lo mismo que la pregunta (lo normal: el narrador
   la lee en voz alta), se esconde mientras est\xE1 abierta: repetido, solo tapa. */
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
/* En la p\xE1gina no tapa nada: no hace falta achicarla. */
:host(:not([pantalla]):not(:fullscreen)) .ma-ocultar {
    display: none;
}
/* Achicada (solo en pantalla completa: al salir vuelve a verse entera):
   queda solo el bot\xF3n para volver, en una esquina. */
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
   "Paso a paso" se acorta para que la barra entre en un rengl\xF3n. */
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
var MotorLeccion = class extends MotorEscena {
  static observedAttributes = [...MotorEscena.observedAttributes, "paso-a-paso", "video", "controles-flotantes"];
  constructor() {
    super();
    const estilo = document.createElement("style");
    estilo.textContent = ESTILOS2;
    this.shadowRoot.appendChild(estilo);
    this._panel = document.createElement("div");
    this._panel.className = "ma-pregunta";
    this._panel.hidden = true;
    this._panel.setAttribute("role", "group");
    this._panel.setAttribute("aria-label", "Pregunta");
    this._panel.addEventListener("click", (e) => e.stopPropagation());
    this._panel.addEventListener("keydown", (e) => e.stopPropagation());
    this._raiz.appendChild(this._panel);
    new ResizeObserver(() => {
      if (this._panel.hidden) return;
      const espacio = this._raiz.getBoundingClientRect().bottom - this._panel.getBoundingClientRect().top;
      this._raiz.style.setProperty("--ma-alto-pregunta", `${espacio}px`);
    }).observe(this._panel);
    const barra = this.shadowRoot.querySelector(".ma-controles");
    this._botonPasos = document.createElement("button");
    this._botonPasos.type = "button";
    this._botonPasos.innerHTML = '<span class="largo">Paso a paso</span><span class="corto" aria-hidden="true">Pasos</span>';
    this._botonPasos.setAttribute("aria-label", "Paso a paso");
    this._botonPasos.setAttribute("aria-pressed", "false");
    this._botonPasos.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleAttribute("paso-a-paso");
    });
    barra.insertBefore(this._botonPasos, barra.querySelector('[data-accion="velocidad"]'));
    for (const [accion, nombre] of [["anterior", "Paso anterior"], ["siguiente", "Paso siguiente"]]) {
      barra.querySelector(`[data-accion="${accion}"]`).setAttribute("aria-label", nombre);
    }
    this._marcas = [];
    this._abierta = null;
  }
  attributeChangedCallback(nombre, viejo, nuevo) {
    if (nombre === "paso-a-paso" || nombre === "video") {
      this._botonPasos.setAttribute("aria-pressed", String(this.hasAttribute("paso-a-paso")));
      if (this._compilada) this._alArmar(this._compilada);
      return;
    }
    super.attributeChangedCallback(nombre, viejo, nuevo);
  }
  _controlesFijos() {
    return !this.hasAttribute("controles-flotantes");
  }
  get pasoAPaso() {
    return this.hasAttribute("paso-a-paso");
  }
  // ---------------- Ganchos de <motor-escena> ----------------
  _alArmar(compilada) {
    this._marcas = compilada.marcas;
    const paradas = this.hasAttribute("video") ? [] : this._marcas.filter((m) => m.tipo === "pregunta" || m.tipo === "paso" && this.pasoAPaso).map((m) => m.t);
    this._reloj.fijarParadas([...new Set(paradas)]);
  }
  _marcasDeLaBarra(compilada) {
    return compilada.marcas.filter((m) => m.tipo === "pregunta").map((m) => ({ t: m.t, clase: "pregunta", texto: "?" }));
  }
  _alParar(t) {
    const pregunta = this._marcas.find((m) => m.tipo === "pregunta" && m.t === t);
    if (pregunta) this._abrir(pregunta, true);
  }
  // Si el subtítulo de ahora repite la pregunta abierta, sobra.
  _mirarSubtitulo() {
    const normal = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const pregunta = normal(this._abierta?.datos?.pregunta);
    const repite = !!this._abierta && (!pregunta || normal(this._subtitulo.textContent).includes(pregunta));
    this._raiz.classList.toggle("sub-repite", repite);
  }
  _alPintar(estado) {
    if (this.hasAttribute("video")) {
      const m = this._marcas.find((x) => x.tipo === "pregunta" && estado.t >= x.t && estado.t < x.hasta);
      if (m && this._abierta !== m) this._abrir(m, false);
      else if (!m && this._abierta) this._cerrar();
    } else if (this._abierta && Math.abs(estado.t - this._abierta.t) > 1e-6) {
      this._cerrar();
    }
    this._mirarSubtitulo();
  }
  // En una lección, ⏮ ⏭ van de paso en paso (y de pregunta en pregunta).
  capituloSiguiente() {
    const proximo = this._puntos().find((t) => t > this.t + 1e-6);
    this.pausar();
    if (proximo === void 0) this.irA(this.duracion);
    else this._llegarA(proximo);
  }
  capituloAnterior() {
    const anteriores = this._puntos().filter((t) => t < this.t - 1e-6);
    this.pausar();
    this.irA(anteriores.length ? anteriores[anteriores.length - 1] : 0);
  }
  _tecla(e) {
    if (this._abierta && [" ", "k", "."].includes(e.key)) {
      e.preventDefault();
      return;
    }
    super._tecla(e);
  }
  // ---------------- Por dentro ----------------
  _puntos() {
    const tipos = this.pasoAPaso ? ["paso", "pregunta"] : ["pregunta"];
    const puntos = this._marcas.filter((m) => tipos.includes(m.tipo)).map((m) => m.t);
    for (const c of this._compilada?.capitulos ?? []) puntos.push(c.t);
    return [...new Set(puntos)].sort((a, b) => a - b);
  }
  _llegarA(t) {
    this.irA(t);
    const pregunta = this._marcas.find((m) => m.tipo === "pregunta" && m.t === t);
    if (pregunta && !this.hasAttribute("video")) this._abrir(pregunta, true);
  }
  _abrir(marca, interactiva) {
    const d = marca.datos ?? {};
    this._abierta = marca;
    const panel = this._panel;
    panel.replaceChildren();
    panel.classList.remove("minimizada");
    const parrafo = (clase, texto3, dentro = panel) => {
      const p = document.createElement("p");
      p.className = clase;
      p.textContent = texto3;
      dentro.appendChild(p);
      return p;
    };
    const cabeza = document.createElement("div");
    cabeza.className = "ma-cabeza";
    panel.appendChild(cabeza);
    parrafo("ma-encabezado", "\u{1F914} Pensalo antes de seguir", cabeza);
    const ocultar = document.createElement("button");
    ocultar.type = "button";
    ocultar.className = "ma-ocultar";
    ocultar.setAttribute("aria-expanded", "true");
    const rotular = () => {
      const chica = panel.classList.contains("minimizada");
      ocultar.textContent = chica ? "\u{1F914} Volver a la pregunta" : "Ver el dibujo";
      ocultar.setAttribute("aria-expanded", String(!chica));
    };
    ocultar.addEventListener("click", () => {
      panel.classList.toggle("minimizada");
      rotular();
    });
    rotular();
    if (interactiva) cabeza.appendChild(ocultar);
    parrafo("ma-enunciado", d.pregunta ?? "\xBFQu\xE9 cre\xE9s que pasa ahora?");
    const opciones = document.createElement("div");
    opciones.className = "ma-opciones";
    panel.appendChild(opciones);
    const botones = (d.opciones ?? []).map((texto3, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = texto3;
      b.disabled = !interactiva;
      b.addEventListener("click", () => this._contestar(marca, i, botones));
      opciones.appendChild(b);
      return b;
    });
    if (!interactiva) {
      parrafo("ma-nota", "Paus\xE1 y pensalo: la respuesta viene enseguida.");
    } else if (botones.length === 0) {
      this._botonSeguir(marca, "Ya lo pens\xE9: ver qu\xE9 pasa");
    }
    panel.hidden = false;
    this._vista.pregunta = true;
    this._actualizarVista();
    this._mirarSubtitulo();
    panel.setAttribute("aria-live", "polite");
    if (interactiva) (botones[0] ?? panel.querySelector("button"))?.focus();
  }
  _contestar(marca, elegida, botones) {
    const d = marca.datos ?? {};
    botones.forEach((b, i) => {
      b.disabled = true;
      if (i === d.correcta) b.classList.add("correcta");
      if (i === elegida) b.classList.add("elegida");
    });
    const bien = d.correcta === void 0 || elegida === d.correcta;
    const respuesta = document.createElement("p");
    respuesta.className = "ma-respuesta";
    respuesta.textContent = `${bien ? "\u2705 \xA1Bien!" : "\u274C No era esa."} ${d.explicacion ?? ""}`.trim();
    this._panel.appendChild(respuesta);
    this._botonSeguir(marca, "Seguir");
    this.dispatchEvent(new CustomEvent("respuesta", {
      detail: { pregunta: d.pregunta, elegida, correcta: d.correcta, bien },
      bubbles: true
    }));
  }
  _botonSeguir(marca, texto3) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ma-seguir";
    b.textContent = texto3;
    b.addEventListener("click", () => {
      this._cerrar();
      this.irA(marca.hasta);
      this.reproducir();
    });
    this._panel.appendChild(b);
    b.focus();
  }
  _cerrar() {
    this._abierta = null;
    this._panel.hidden = true;
    this._panel.classList.remove("minimizada");
    this._panel.replaceChildren();
    this._vista.pregunta = false;
    this._actualizarVista();
    this._mirarSubtitulo();
  }
};
function definirLeccion(nombre = "motor-leccion") {
  if (typeof customElements === "undefined" || customElements.get(nombre)) return;
  customElements.define(nombre, MotorLeccion);
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
    elegir: (lista2) => lista2[Math.floor(siguiente() * lista2.length)]
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

// src/piezas/flecha.js
var flecha = definirPieza({
  nombre: "flecha",
  predeterminados: {
    // El id de una pieza (se engancha al borde que mira a la otra punta),
    // un punto { x, y }, o un costado de una pieza: { pieza: 'id', lado:
    // 'izquierda' | 'derecha' | 'arriba' | 'abajo' | 'centro', dx, dy }.
    // Enganchada a un costado, la sigue aunque la pieza crezca.
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
    colorEtiqueta: "suave",
    // De qué lado del camino va la etiqueta: 1 o -1 (para que no quede encima de otra pieza).
    ladoEtiqueta: 1,
    // Girar la etiqueta para que siga la flecha (en una flecha vertical, no ocupa ancho).
    girarEtiqueta: false
  },
  colores: ["color", "colorEtiqueta"],
  // Depende de dónde están las otras piezas, así que se recalcula siempre.
  dependeDeOtras: true,
  validar(p) {
    if (p.desde == null || p.hasta == null) throw new Error('Una flecha necesita "desde" y "hasta".');
  },
  crear(grupo) {
    return {
      linea: el("path", { fill: "none", "stroke-linecap": "round" }, grupo),
      punta: el("path", {}, grupo),
      etiqueta: el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 600 }, grupo)
    };
  },
  actualizar(partes, p, ctx) {
    let a = extremo(p.desde, ctx);
    let b = extremo(p.hasta, ctx);
    if (p.dentro != null) {
      a = adentro(a, p.dentro, ctx);
      b = adentro(b, p.dentro, ctx);
    }
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
    const ex = Math.sin(angMedio) * (p.ladoEtiqueta < 0 ? -1 : 1);
    const ey = -Math.cos(angMedio) * (p.ladoEtiqueta < 0 ? -1 : 1);
    const medioAncho = Array.from(p.etiqueta).length * p.tamanoEtiqueta * ANCHO_LETRA / 2;
    const corrimiento = p.girarEtiqueta ? p.tamanoEtiqueta * 0.8 : p.tamanoEtiqueta * 0.5 + Math.abs(ex) * medioAncho + Math.abs(ey) * p.tamanoEtiqueta * 0.5;
    const ex2 = medio.x + ex * corrimiento;
    const ey2 = medio.y + ey * corrimiento;
    let grados = angMedio * 180 / Math.PI;
    if (grados > 90) grados -= 180;
    if (grados < -90) grados += 180;
    poner(partes.etiqueta, {
      x: ex2,
      y: ey2,
      transform: p.girarEtiqueta ? `rotate(${grados.toFixed(1)} ${ex2.toFixed(1)} ${ey2.toFixed(1)})` : null,
      "font-size": p.tamanoEtiqueta,
      fill: aCss(p.colorEtiqueta),
      opacity: limitar((avance - 0.5) / 0.4, 0, 1),
      visibility: p.etiqueta && avance > 0.5 ? null : "hidden"
    });
    texto(partes.etiqueta, p.etiqueta);
  }
});
function extremo(cual, ctx) {
  const pieza = typeof cual === "string" ? cual : cual.pieza;
  if (pieza == null) return { x: cual.x, y: cual.y };
  if (!ctx.estado.piezas[pieza]) throw new Error(`La flecha apunta a "${pieza}", y no hay ninguna pieza que se llame as\xED.`);
  const r3 = posicionAbsoluta(pieza, ctx.estado, ctx.tipos);
  if (typeof cual === "string") return r3;
  return puntoDelLado(r3, cual.lado, cual.dx ?? 0, cual.dy ?? 0);
}
function puntoDelLado(r3, lado = "centro", dx = 0, dy = 0) {
  const x = r3.x + (lado === "derecha" ? r3.ancho / 2 : lado === "izquierda" ? -r3.ancho / 2 : 0);
  const y = r3.y + (lado === "abajo" ? r3.alto / 2 : lado === "arriba" ? -r3.alto / 2 : 0);
  return { x: x + dx, y: y + dy };
}
function adentro(r3, contenedor, ctx) {
  const { x, y, escala } = aCoordenadasDe(r3, contenedor, ctx.estado, ctx.tipos);
  return { x, y, ancho: (r3.ancho ?? 0) / escala, alto: (r3.alto ?? 0) / escala };
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
    color: "texto",
    // 'centro': y es el centro (como las demás piezas). 'arriba': y es el borde de
    // arriba, para una tabla que va creciendo y no tiene que saltar.
    anclaje: "centro"
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
    const arriba = p.anclaje === "arriba" ? 0 : -((p.filas.length + 1) * p.altoFila) / 2;
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
    partes.filas.forEach((fila2, i) => {
      const esEncabezado = i === 0;
      const datos = esEncabezado ? p.columnas : p.filas[i - 1];
      const visible = esEncabezado ? 1 : limitar(p.filasVisibles - (i - 1), 0, 1);
      const y = arriba + i * p.altoFila;
      poner(fila2.g, {
        opacity: visible,
        // Las filas nuevas entran desde un poco más abajo.
        transform: `translate(0 ${Math.round((1 - visible) * 16 * 100) / 100})`,
        visibility: visible > 0 ? null : "hidden"
      });
      const resaltada = !esEncabezado && Math.round(p.resaltarFila) === i - 1;
      poner(fila2.fondo, {
        x: izq,
        y,
        width: total,
        height: p.altoFila,
        fill: esEncabezado ? aCss(p.encabezado) : resaltada ? `color-mix(in srgb, ${aCss("acento")} 22%, ${aCss(p.relleno)})` : aCss(p.relleno),
        stroke: aCss(p.borde),
        "stroke-width": 2
      });
      let x = izq;
      fila2.celdas.forEach((celda2, j) => {
        poner(celda2, {
          x: x + 16,
          y: y + p.altoFila / 2,
          "font-size": p.tamano,
          "font-weight": esEncabezado || resaltada ? 700 : 400,
          fill: esEncabezado ? aCss(p.colorEncabezado) : aCss(p.color)
        });
        texto(celda2, String(datos?.[j] ?? ""));
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
    const camara2 = el("rect", { x: CUERPO_ANCHO / 2 - 40, y: BISEL + 10, width: 80, height: 18, rx: 9 }, cuerpo);
    return { cuerpo, marco, fondo, barraApp, titulo, hora, iconos, contenido, camara: camara2 };
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

// src/piezas/camara.js
var camara = definirPieza({
  nombre: "camara",
  predeterminados: {
    mirarX: 0,
    mirarY: 0,
    zoom: 1,
    // La ventana, centrada en (x, y). 0: sin recortar.
    ancho: 0,
    alto: 0,
    // 'rect' o 'circulo' (de diámetro el menor entre ancho y alto).
    forma: "rect",
    radio: 0,
    aro: 0,
    colorAro: "borde",
    sombra: false,
    // El fondo de la ventana: lo que se ve donde no hay nada adentro. '' es transparente.
    fondo: ""
  },
  colores: ["colorAro", "fondo"],
  validar(p) {
    if (!["rect", "circulo"].includes(p.forma)) throw new Error(`Una c\xE1mara es 'rect' o 'circulo', no "${p.forma}".`);
  },
  crear(grupo) {
    const id = idUnico("ma-camara");
    const clip = el("clipPath", { id }, el("defs", {}, grupo));
    const sombra = el("rect", {}, grupo);
    const ventana = el("g", {}, grupo);
    const contenido = el("g", {}, ventana);
    return { id, recorte: el("rect", {}, clip), sombra, ventana, contenido, aro: el("rect", { fill: "none" }, grupo) };
  },
  actualizar(partes, p) {
    const recorta = p.ancho > 0 && p.alto > 0;
    const forma = ventanaDe(p);
    poner(partes.recorte, forma);
    poner(partes.ventana, { "clip-path": recorta ? `url(#${partes.id})` : null });
    poner(partes.contenido, {
      transform: `scale(${p.zoom}) translate(${-p.mirarX} ${-p.mirarY})`
    });
    poner(partes.sombra, {
      ...forma,
      fill: p.fondo ? aCss(p.fondo) : "var(--ma-fondo)",
      visibility: recorta && (p.sombra || p.fondo) ? null : "hidden",
      filter: p.sombra ? "drop-shadow(0 6px 14px rgb(0 0 0 / 0.28))" : null
    });
    poner(partes.aro, {
      ...forma,
      stroke: aCss(p.colorAro),
      "stroke-width": p.aro,
      visibility: recorta && p.aro > 0 ? null : "hidden"
    });
  },
  tamano: (p) => p.forma === "circulo" ? { ancho: Math.min(p.ancho, p.alto), alto: Math.min(p.ancho, p.alto) } : { ancho: p.ancho, alto: p.alto },
  contenedor: (partes) => partes.contenido,
  origenContenedor: (p) => ({ x: -p.mirarX * p.zoom, y: -p.mirarY * p.zoom, escala: p.zoom })
});
function ventanaDe(p) {
  const circulo = p.forma === "circulo";
  const ancho = circulo ? Math.min(p.ancho, p.alto) : p.ancho;
  const alto = circulo ? ancho : p.alto;
  const radio = circulo ? ancho / 2 : Math.min(Math.max(p.radio, 0), ancho / 2, alto / 2);
  return { x: -ancho / 2, y: -alto / 2, width: ancho, height: alto, rx: radio, ry: radio };
}

// src/piezas/espejo.js
var espejo = definirPieza({
  nombre: "espejo",
  predeterminados: {
    fuente: null,
    mirarX: 0,
    mirarY: 0,
    zoom: 2,
    ancho: 360,
    alto: 160,
    forma: "rect",
    radio: 14,
    aro: 3,
    colorAro: "acento",
    fondo: "fondo",
    sombra: true,
    marco: false,
    colorMarco: "acento",
    arrastrable: true
  },
  colores: ["colorAro", "fondo", "colorMarco"],
  // Lo que muestra depende de otras piezas (y de dónde lo dejó quien mira).
  dependeDeOtras: true,
  validar(p) {
    if (!["rect", "circulo"].includes(p.forma)) throw new Error(`Un espejo es 'rect' o 'circulo', no "${p.forma}".`);
    if (!(p.zoom > 0)) throw new Error("El zoom de un espejo tiene que ser mayor que 0.");
  },
  crear(grupo, p, ctx) {
    const id = idUnico("ma-espejo");
    const marco = el("rect", { fill: "none", "stroke-dasharray": "8 6", "stroke-width": 3, "pointer-events": "none" }, grupo);
    const clip = el("rect", {}, el("clipPath", { id }, el("defs", {}, grupo)));
    const fondo = el("rect", {}, grupo);
    const ventana = el("g", { "clip-path": `url(#${id})` }, grupo);
    const contenido = el("g", {}, ventana);
    const aro = el("rect", { fill: "none" }, grupo);
    if (p.arrastrable) {
      grupo.setAttribute("data-arrastrable", ctx.id);
    }
    return { grupo, marco, clip, fondo, contenido, aro, usos: /* @__PURE__ */ new Map() };
  },
  actualizar(partes, p, ctx) {
    const forma = ventanaDe2(p);
    poner(partes.clip, forma);
    poner(partes.fondo, {
      ...forma,
      fill: aCss(p.fondo),
      filter: p.sombra ? "drop-shadow(0 8px 18px rgb(0 0 0 / 0.3))" : null
    });
    poner(partes.aro, { ...forma, stroke: aCss(p.colorAro), "stroke-width": p.aro, visibility: p.aro > 0 ? null : "hidden" });
    poner(partes.contenido, { transform: `scale(${p.zoom}) translate(${-p.mirarX} ${-p.mirarY})` });
    ponerFuentes(partes, p, ctx);
    const corrida = ctx.arrastres?.[ctx.id] ?? { x: 0, y: 0 };
    const yo = posicionAbsoluta(ctx.id, ctx.estado, ctx.tipos);
    const ancho = forma.width / p.zoom;
    const alto = forma.height / p.zoom;
    poner(partes.marco, {
      x: p.mirarX - ancho / 2 - yo.x - corrida.x,
      y: p.mirarY - alto / 2 - yo.y - corrida.y,
      width: ancho,
      height: alto,
      rx: forma.rx / p.zoom,
      stroke: aCss(p.colorMarco),
      visibility: p.marco ? null : "hidden"
    });
  },
  tamano: (p) => {
    const f = ventanaDe2(p);
    return { ancho: f.width, alto: f.height };
  }
});
function ponerFuentes(partes, p, ctx) {
  const svg = partes.grupo.ownerSVGElement;
  if (!svg) return;
  const ids = p.fuente != null ? [p.fuente] : ctx.ids.filter((id) => ctx.estado.piezas[id].dentro == null && ctx.tipos[id].nombre !== "espejo");
  for (const id of ids) {
    if (!ctx.estado.piezas[id]) throw new Error(`El espejo mira "${id}", y no hay ninguna pieza que se llame as\xED.`);
    let uso = partes.usos.get(id);
    if (!uso) {
      const original = svg.querySelector(`[data-pieza="${id}"]`);
      if (!original) continue;
      if (!original.id) original.id = idUnico("ma-pieza");
      const envoltorio = el("g", {}, partes.contenido);
      el("use", { href: `#${original.id}` }, envoltorio);
      uso = { envoltorio };
      partes.usos.set(id, uso);
    }
    const padre = ctx.estado.piezas[id].dentro;
    let transform = null;
    if (padre != null) {
      const falso = { piezas: { ...ctx.estado.piezas, __origen: { x: 0, y: 0, escala: 1, dentro: padre } } };
      const o = posicionAbsoluta("__origen", falso, { ...ctx.tipos, __origen: {} });
      const uno = posicionAbsoluta("__origen", { piezas: { ...falso.piezas, __origen: { x: 1, y: 0, escala: 1, dentro: padre } } }, { ...ctx.tipos, __origen: {} });
      transform = `translate(${o.x} ${o.y}) scale(${uno.x - o.x || 1})`;
    }
    poner(uso.envoltorio, { transform });
  }
}
function ventanaDe2(p) {
  const circulo = p.forma === "circulo";
  const ancho = circulo ? Math.min(p.ancho, p.alto) : p.ancho;
  const alto = circulo ? ancho : p.alto;
  const radio = circulo ? ancho / 2 : Math.min(Math.max(p.radio, 0), ancho / 2, alto / 2);
  return { x: -ancho / 2, y: -alto / 2, width: ancho, height: alto, rx: radio, ry: radio };
}

// src/piezas/fila.js
var fila = definirPieza({
  nombre: "fila",
  predeterminados: {
    piezas: [],
    direccion: "horizontal",
    separacion: 24,
    // A lo ancho de la fila: 'centro', 'inicio' (arriba, o a la izquierda en una columna) o 'fin'.
    alinear: "centro",
    margen: 0,
    relleno: "",
    borde: "",
    radio: 12,
    // Las calcula la fila en cada instante (lo que miden sus piezas): no se escriben.
    ancho: 0,
    alto: 0
  },
  colores: ["relleno", "borde"],
  validar(p) {
    if (!Array.isArray(p.piezas)) throw new Error(`Una fila necesita "piezas": la lista de ids que acomoda, por ejemplo ['a', 'b'].`);
    if (!["horizontal", "vertical"].includes(p.direccion)) throw new Error(`Una fila es 'horizontal' o 'vertical', no "${p.direccion}".`);
  },
  crear(grupo) {
    return { caja: el("rect", {}, grupo) };
  },
  actualizar(partes, p) {
    const ancho = p.ancho + 2 * p.margen;
    const alto = p.alto + 2 * p.margen;
    poner(partes.caja, {
      x: -ancho / 2,
      y: -alto / 2,
      width: ancho,
      height: alto,
      rx: p.radio,
      fill: p.relleno ? aCss(p.relleno) : "none",
      stroke: p.borde ? aCss(p.borde) : "none",
      "stroke-width": p.borde ? 2 : 0,
      visibility: p.relleno || p.borde ? null : "hidden"
    });
  },
  tamano: (p) => ({ ancho: p.ancho + 2 * p.margen, alto: p.alto + 2 * p.margen })
});

// src/piezas/contador.js
var ANCLAS2 = { inicio: "start", centro: "middle", fin: "end" };
function formatearNumero(valor, decimales = 0) {
  const fijo = Math.abs(valor).toFixed(decimales);
  const [entera, fraccion] = fijo.split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signo = valor < 0 && Number(fijo) !== 0 ? "-" : "";
  return signo + conMiles + (fraccion ? `,${fraccion}` : "");
}
var contador2 = definirPieza({
  nombre: "contador",
  predeterminados: {
    valor: 0,
    decimales: 0,
    prefijo: "",
    sufijo: "",
    tamano: 96,
    peso: 800,
    color: "texto",
    alineacion: "centro"
  },
  colores: ["color"],
  crear(grupo) {
    return {
      texto: el("text", { "dominant-baseline": "central", "font-variant-numeric": "tabular-nums" }, grupo)
    };
  },
  actualizar(partes, p) {
    poner(partes.texto, {
      fill: aCss(p.color),
      "font-size": p.tamano,
      "font-weight": p.peso,
      "text-anchor": ANCLAS2[p.alineacion] ?? "middle"
    });
    texto(partes.texto, `${p.prefijo}${formatearNumero(p.valor, p.decimales)}${p.sufijo}`);
  }
});

// src/piezas/cilindro.js
var cilindro = definirPieza({
  nombre: "cilindro",
  predeterminados: {
    ancho: 200,
    alto: 150,
    relleno: "superficie",
    borde: "acento",
    grosorBorde: 4,
    nivel: 0,
    colorNivel: "acento",
    texto: "",
    tamano: 24,
    peso: 700,
    color: "texto"
  },
  colores: ["relleno", "borde", "colorNivel", "color"],
  crear(grupo) {
    return {
      cuerpo: el("path", {}, grupo),
      liquido: el("path", { stroke: "none" }, grupo),
      tapa: el("ellipse", {}, grupo),
      texto: el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, grupo)
    };
  },
  actualizar(partes, p) {
    const rx = p.ancho / 2;
    const ry = p.ancho * 0.14;
    const arriba = -p.alto / 2 + ry;
    const abajo = p.alto / 2 - ry;
    poner(partes.cuerpo, {
      d: `M${-rx} ${arriba} V${abajo} A${rx} ${ry} 0 0 0 ${rx} ${abajo} V${arriba} Z`,
      fill: aCss(p.relleno),
      stroke: aCss(p.borde),
      "stroke-width": p.grosorBorde
    });
    const nivel = limitar(p.nivel, 0, 1);
    const y = abajo - nivel * (abajo - arriba);
    const m = p.grosorBorde / 2;
    poner(partes.liquido, {
      d: `M${-rx + m} ${y} V${abajo} A${rx - m} ${ry - m} 0 0 0 ${rx - m} ${abajo} V${y} A${rx - m} ${ry - m} 0 0 1 ${-rx + m} ${y} Z`,
      fill: `color-mix(in srgb, ${aCss(p.colorNivel)} 35%, transparent)`,
      visibility: nivel > 0 ? null : "hidden"
    });
    poner(partes.tapa, {
      cx: 0,
      cy: arriba,
      rx,
      ry,
      fill: aCss(p.relleno),
      stroke: aCss(p.borde),
      "stroke-width": p.grosorBorde
    });
    poner(partes.texto, { fill: aCss(p.color), "font-size": p.tamano, "font-weight": p.peso });
    const lineas = partirLineas(p.texto, Math.floor((p.ancho - 24) / (p.tamano * ANCHO_LETRA)));
    renglones(partes.texto, lineas, { y: (arriba + abajo) / 2 + ry / 2, tamano: p.tamano, interlineado: 1.15 });
  },
  tamano: (p) => ({ ancho: p.ancho, alto: p.alto })
});

// src/piezas/grafo.js
var grafo = definirPieza({
  nombre: "grafo",
  predeterminados: {
    // Ids, o { id, texto, x, y, icono }. x e y son relativas al centro del grafo.
    nodos: [],
    // [de, a] o [de, a, etiqueta], o { de, a, etiqueta }.
    aristas: [],
    dirigido: true,
    // El radio del círculo en el que se reparten los nodos sin posición.
    radio: 230,
    radioNodo: 38,
    tamano: 28,
    tamanoEtiqueta: 20,
    // Cuántas aristas se ven, en orden: 2.5 es dos y la tercera dibujándose.
    visibles: Infinity,
    // Cuántos nodos se ven, en orden.
    nodosVisibles: Infinity,
    // Ids de nodos y "de→a" de aristas para destacar.
    resaltar: [],
    // Ids de nodos y "de→a" de aristas para apagar (lo que no importa ahora).
    apagar: [],
    relleno: "superficie",
    borde: "acento",
    color: "texto",
    colorArista: "suave",
    colorResaltado: "acento2",
    grosor: 3.5
  },
  colores: ["relleno", "borde", "color", "colorArista", "colorResaltado"],
  validar(p) {
    const ids = new Set(normalizarNodos(p).map((n2) => n2.id));
    for (const a of normalizarAristas(p.aristas)) {
      for (const extremo2 of [a.de, a.a]) {
        if (!ids.has(extremo2)) throw new Error(`La arista ${a.de}\u2192${a.a} usa "${extremo2}", que no es ning\xFAn nodo del grafo.`);
      }
    }
  },
  crear(grupo) {
    return { aristas: el("g", { fill: "none", "stroke-linecap": "round" }, grupo), nodos: el("g", {}, grupo) };
  },
  actualizar(partes, p) {
    const nodos = normalizarNodos(p);
    const aristas = normalizarAristas(p.aristas);
    const donde = Object.fromEntries(nodos.map((n2) => [n2.id, n2]));
    const resaltar = new Set(p.resaltar);
    const apagar = new Set(p.apagar);
    reusar(partes.aristas, aristas.length, (g) => {
      el("path", {}, g);
      el("path", {}, g);
      el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 600, "paint-order": "stroke", stroke: "var(--ma-fondo)", "stroke-width": 5 }, g);
    });
    aristas.forEach((a, i) => {
      const g = (
        /** @type {Element} */
        partes.aristas.childNodes[i]
      );
      const [linea, punta, etiqueta] = (
        /** @type {Element[]} */
        [...g.childNodes]
      );
      const avance = limitar(p.visibles - i, 0, 1);
      const clave = `${a.de}\u2192${a.a}`;
      const color = resaltar.has(clave) ? p.colorResaltado : p.colorArista;
      const grosor = resaltar.has(clave) ? p.grosor * 1.5 : p.grosor;
      poner(g, { opacity: apagar.has(clave) ? 0.25 : 1, visibility: avance > 0 ? null : "hidden" });
      let d;
      let tip;
      let ang;
      let medio;
      if (a.de === a.a) {
        const n2 = donde[a.de];
        const hacia = Math.atan2(n2.y, n2.x) || -Math.PI / 2;
        const R = p.radioNodo * 0.62;
        const cx = n2.x + Math.cos(hacia) * (p.radioNodo + R * 0.55);
        const cy = n2.y + Math.sin(hacia) * (p.radioNodo + R * 0.55);
        const inicio = hacia + Math.PI * 0.75;
        const fin = inicio + Math.PI * 1.5 * avance;
        const x0 = cx + Math.cos(inicio) * R;
        const y0 = cy + Math.sin(inicio) * R;
        const x1 = cx + Math.cos(fin) * R;
        const y1 = cy + Math.sin(fin) * R;
        d = `M${r2(x0)} ${r2(y0)}A${r2(R)} ${r2(R)} 0 ${fin - inicio > Math.PI ? 1 : 0} 1 ${r2(x1)} ${r2(y1)}`;
        tip = { x: x1, y: y1 };
        ang = fin + Math.PI / 2;
        medio = { x: cx + Math.cos(hacia) * (R + p.tamanoEtiqueta * 0.8), y: cy + Math.sin(hacia) * (R + p.tamanoEtiqueta * 0.8) };
      } else {
        const de = donde[a.de];
        const ha = donde[a.a];
        const vuelta = aristas.some((b) => b.de === a.a && b.a === a.de);
        const curva2 = caminoFlecha(
          { x: de.x, y: de.y, ancho: 0, alto: 0 },
          { x: ha.x, y: ha.y, ancho: 0, alto: 0 },
          vuelta ? 0.18 : 0,
          0
        );
        const largo2 = Math.hypot(ha.x - de.x, ha.y - de.y) || 1;
        const u0 = Math.min(0.45, (p.radioNodo + 4) / largo2);
        const u1 = 1 - Math.min(0.45, (p.radioNodo + 6) / largo2);
        const uFin = u0 + (u1 - u0) * avance;
        const pasos = 16;
        d = "";
        for (let k = 0; k <= pasos; k++) {
          const q = puntoCurva(curva2, u0 + (uFin - u0) * k / pasos);
          d += `${k === 0 ? "M" : "L"}${r2(q.x)} ${r2(q.y)}`;
        }
        tip = puntoCurva(curva2, uFin);
        ang = anguloCurva(curva2, uFin);
        const m = puntoCurva(curva2, 0.5);
        const am = anguloCurva(curva2, 0.5);
        medio = { x: m.x + Math.sin(am) * p.tamanoEtiqueta * 0.9, y: m.y - Math.cos(am) * p.tamanoEtiqueta * 0.9 };
      }
      poner(linea, { d, stroke: aCss(color), "stroke-width": grosor });
      const L = grosor * 3.4;
      const W = grosor * 2.2;
      const bx = tip.x - Math.cos(ang) * L;
      const by = tip.y - Math.sin(ang) * L;
      poner(punta, {
        d: `M${r2(tip.x)} ${r2(tip.y)}L${r2(bx - Math.sin(ang) * W)} ${r2(by + Math.cos(ang) * W)}L${r2(bx + Math.sin(ang) * W)} ${r2(by - Math.cos(ang) * W)}Z`,
        fill: aCss(color),
        visibility: p.dirigido && avance > 0.3 ? null : "hidden"
      });
      poner(etiqueta, {
        x: medio.x,
        y: medio.y,
        "font-size": p.tamanoEtiqueta,
        fill: aCss(color),
        visibility: a.etiqueta && avance > 0.6 ? null : "hidden"
      });
      texto(etiqueta, a.etiqueta);
    });
    reusar(partes.nodos, nodos.length, (g) => {
      el("circle", { fill: "none", "stroke-width": 6 }, g);
      el("circle", {}, g);
      el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, g);
      el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 600 }, g);
    });
    nodos.forEach((n2, i) => {
      const g = (
        /** @type {Element} */
        partes.nodos.childNodes[i]
      );
      const [anillo, circulo, icono2, rotulo] = (
        /** @type {Element[]} */
        [...g.childNodes]
      );
      const visible = limitar(p.nodosVisibles - i, 0, 1);
      const destacado = resaltar.has(n2.id);
      poner(g, { opacity: visible * (apagar.has(n2.id) ? 0.3 : 1), visibility: visible > 0 ? null : "hidden" });
      poner(anillo, { cx: n2.x, cy: n2.y, r: p.radioNodo + 9, stroke: aCss(p.colorResaltado), visibility: destacado ? null : "hidden" });
      poner(circulo, {
        cx: n2.x,
        cy: n2.y,
        r: p.radioNodo,
        fill: aCss(p.relleno),
        stroke: aCss(destacado ? p.colorResaltado : p.borde),
        "stroke-width": 3.5
      });
      poner(icono2, { x: n2.x, y: n2.y, "font-size": p.radioNodo * 1.05, visibility: n2.icono ? null : "hidden" });
      texto(icono2, n2.icono ?? "");
      poner(rotulo, {
        x: n2.x,
        y: n2.icono ? n2.y + p.radioNodo + p.tamano * 0.75 : n2.y,
        "font-size": n2.icono ? p.tamano * 0.8 : p.tamano,
        fill: aCss(p.color)
      });
      texto(rotulo, n2.texto);
    });
  },
  tamano(p) {
    const nodos = normalizarNodos(p);
    const xs = nodos.map((n2) => Math.abs(n2.x));
    const ys = nodos.map((n2) => Math.abs(n2.y));
    return { ancho: 2 * (Math.max(0, ...xs) + p.radioNodo), alto: 2 * (Math.max(0, ...ys) + p.radioNodo) };
  }
});
function normalizarNodos(p) {
  const lista2 = p.nodos.map((n2) => typeof n2 === "object" ? { ...n2, id: String(n2.id) } : { id: String(n2) });
  return lista2.map((n2, i) => {
    const ang = -Math.PI / 2 + 2 * Math.PI * i / Math.max(lista2.length, 1);
    return {
      id: n2.id,
      texto: n2.texto ?? n2.id,
      icono: n2.icono,
      x: n2.x ?? (lista2.length > 1 ? Math.cos(ang) * p.radio : 0),
      y: n2.y ?? (lista2.length > 1 ? Math.sin(ang) * p.radio : 0)
    };
  });
}
function normalizarAristas(aristas) {
  return aristas.map((a) => Array.isArray(a) ? { de: String(a[0]), a: String(a[1]), etiqueta: a[2] ?? "" } : { de: String(a.de), a: String(a.a), etiqueta: a.etiqueta ?? "" });
}
function reusar(grupo, cuantos, armar) {
  while (grupo.childNodes.length > cuantos) grupo.lastChild.remove();
  while (grupo.childNodes.length < cuantos) armar(el("g", {}, grupo));
}
function r2(v) {
  return Math.round(v * 100) / 100;
}

// src/pedagogico/resaltar.js
var PALABRAS = {
  python: /* @__PURE__ */ new Set([
    "and",
    "as",
    "assert",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield"
  ]),
  js: /* @__PURE__ */ new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "else",
    "export",
    "for",
    "function",
    "if",
    "import",
    "in",
    "let",
    "new",
    "of",
    "return",
    "switch",
    "this",
    "throw",
    "try",
    "typeof",
    "var",
    "while"
  ])
};
var PROPIAS = {
  python: /* @__PURE__ */ new Set([
    "print",
    "input",
    "len",
    "range",
    "int",
    "str",
    "float",
    "list",
    "dict",
    "set",
    "tuple",
    "sum",
    "max",
    "min",
    "sorted",
    "enumerate",
    "zip",
    "abs",
    "round",
    "True",
    "False",
    "None"
  ]),
  js: /* @__PURE__ */ new Set(["console", "document", "window", "true", "false", "null", "undefined", "Math", "JSON"]),
  sql: /* @__PURE__ */ new Set(["COUNT", "SUM", "AVG", "MIN", "MAX", "NULL", "TRUE", "FALSE"])
};
PALABRAS.sql = /* @__PURE__ */ new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "ORDER",
  "BY",
  "ASC",
  "DESC",
  "LIMIT",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "CREATE",
  "TABLE",
  "JOIN",
  "ON",
  "AS",
  "GROUP",
  "HAVING",
  "DISTINCT",
  "LIKE",
  "IN",
  "IS",
  "BETWEEN",
  "PRIMARY",
  "KEY",
  "INTEGER",
  "TEXT",
  "REAL"
]);
var COMENTARIO = { python: "#", js: "//", sql: "--" };
var LETRA = /[A-Za-z_ÁÉÍÓÚáéíóúÑñÜü]/;
var PALABRA = /[A-Za-z0-9_ÁÉÍÓÚáéíóúÑñÜü]/;
function tokenizar(linea, lenguaje = "python") {
  const palabras = PALABRAS[lenguaje] ?? PALABRAS.python;
  const propias = PROPIAS[lenguaje] ?? PROPIAS.python;
  const comentario = COMENTARIO[lenguaje] ?? "#";
  const pedazos = [];
  const agregar = (texto3, clase) => {
    const ultimo = pedazos[pedazos.length - 1];
    if (ultimo && ultimo.clase === clase && clase === "normal") ultimo.texto += texto3;
    else pedazos.push({ texto: texto3, clase });
  };
  let i = 0;
  while (i < linea.length) {
    const c = linea[i];
    if (linea.startsWith(comentario, i)) {
      agregar(linea.slice(i), "comentario");
      break;
    }
    const prefijo = lenguaje === "python" && /[fFrRbB]/.test(c) && /["']/.test(linea[i + 1] ?? "") ? 1 : 0;
    const comilla = linea[i + prefijo];
    if (comilla === '"' || comilla === "'" || lenguaje === "js" && comilla === "`") {
      let j = i + prefijo + 1;
      while (j < linea.length && linea[j] !== comilla) j += linea[j] === "\\" ? 2 : 1;
      agregar(linea.slice(i, j + 1), "texto");
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) && !PALABRA.test(linea[i - 1] ?? " ")) {
      const m = linea.slice(i).match(/^\d+(\.\d+)?/);
      agregar(m[0], "numero");
      i += m[0].length;
      continue;
    }
    if (LETRA.test(c)) {
      let j = i;
      while (j < linea.length && PALABRA.test(linea[j])) j++;
      const palabra = linea.slice(i, j);
      const sigue = linea.slice(j).trimStart()[0];
      const clave = lenguaje === "sql" ? palabra.toUpperCase() : palabra;
      const clase = palabras.has(clave) ? "palabra" : propias.has(clave) ? "propia" : sigue === "(" ? "funcion" : "normal";
      agregar(palabra, clase);
      i = j;
      continue;
    }
    agregar(c, "normal");
    i += 1;
  }
  return pedazos;
}
var COLORES_CODIGO = {
  normal: "texto",
  palabra: "acento",
  texto: "exito",
  numero: "acento2",
  comentario: "suave",
  propia: "alerta",
  funcion: "texto"
};

// src/pedagogico/piezas/codigo.js
var ANCHO_MONO = 0.6;
var codigo = definirPieza({
  nombre: "codigo",
  predeterminados: {
    codigo: "",
    lenguaje: "python",
    ancho: 700,
    tamano: 26,
    interlineado: 1.6,
    // La línea que está por correr, contando desde 1.
    linea: 1,
    // De 0 a 1: cuánto se ve la marca de la línea (0: el programa terminó).
    marca: 0,
    colorMarca: "acento",
    numeros: true,
    // Arriba, como la pestaña de un editor: "programa.py".
    titulo: "",
    relleno: "superficie",
    borde: "borde"
  },
  colores: ["colorMarca", "relleno", "borde"],
  crear(grupo) {
    return { grupo, clave: "", lineas: [] };
  },
  actualizar(partes, p) {
    const medidas2 = medir(p);
    const { arriba, izq, alto, altoLinea, xCodigo } = medidas2;
    const clave = `${p.lenguaje}|${p.tamano}|${p.ancho}|${p.titulo}|${p.numeros}|${p.codigo}`;
    if (partes.clave !== clave) {
      partes.grupo.replaceChildren();
      partes.fondo = el("rect", {}, partes.grupo);
      partes.pestana = el("text", { "font-size": p.tamano * 0.75, "dominant-baseline": "central" }, partes.grupo);
      partes.barra = el("rect", {}, partes.grupo);
      partes.borde = el("rect", {}, partes.grupo);
      partes.lineas = medidas2.lineas.map((linea, i) => {
        const y2 = arriba + medidas2.encabezado + (i + 0.5) * altoLinea + medidas2.margen;
        const numero = el("text", {
          x: izq + 16 + 2 * p.tamano * ANCHO_MONO,
          y: y2,
          "text-anchor": "end",
          "dominant-baseline": "central",
          "font-size": p.tamano * 0.8,
          fill: "var(--ma-suave)",
          "font-family": "var(--ma-fuente-mono)",
          visibility: p.numeros ? null : "hidden"
        }, partes.grupo);
        texto(numero, String(i + 1));
        const texto3 = el("text", {
          x: xCodigo,
          y: y2,
          "dominant-baseline": "central",
          "font-size": p.tamano,
          "font-family": "var(--ma-fuente-mono)",
          style: "white-space: pre"
        }, partes.grupo);
        for (const pedazo of tokenizar(linea, p.lenguaje)) {
          const tspan = el("tspan", {
            fill: aCss(COLORES_CODIGO[pedazo.clase]),
            "font-weight": pedazo.clase === "palabra" || pedazo.clase === "funcion" ? 700 : null
          }, texto3);
          texto(tspan, pedazo.texto);
        }
        return { numero, texto: texto3 };
      });
      partes.clave = clave;
    }
    poner(partes.fondo, {
      x: izq,
      y: arriba,
      width: p.ancho,
      height: alto,
      rx: 14,
      fill: aCss(p.relleno),
      stroke: aCss(p.borde),
      "stroke-width": 2
    });
    poner(partes.pestana, {
      x: izq + 20,
      y: arriba + medidas2.encabezado / 2,
      fill: "var(--ma-suave)",
      "font-family": "var(--ma-fuente-mono)",
      visibility: p.titulo ? null : "hidden"
    });
    texto(partes.pestana, p.titulo);
    const n2 = medidas2.lineas.length;
    const y = arriba + medidas2.encabezado + medidas2.margen + (limitar(p.linea, 1, Math.max(n2, 1)) - 1) * altoLinea;
    const marca = limitar(p.marca, 0, 1);
    poner(partes.barra, {
      x: izq + 2,
      y,
      width: p.ancho - 4,
      height: altoLinea,
      fill: `color-mix(in srgb, ${aCss(p.colorMarca)} 20%, transparent)`,
      opacity: marca,
      visibility: marca > 0 ? null : "hidden"
    });
    poner(partes.borde, {
      x: izq + 2,
      y,
      width: 7,
      height: altoLinea,
      fill: aCss(p.colorMarca),
      opacity: marca,
      visibility: marca > 0 ? null : "hidden"
    });
  },
  tamano(p) {
    const m = medir(p);
    return { ancho: p.ancho, alto: m.alto };
  }
});
function medir(p) {
  const lineas = String(p.codigo).replace(/\n$/, "").split("\n");
  const altoLinea = p.tamano * p.interlineado;
  const encabezado = p.titulo ? p.tamano * 1.6 : 0;
  const margen = p.tamano * 0.5;
  const alto = encabezado + 2 * margen + lineas.length * altoLinea;
  const izq = -p.ancho / 2;
  const xCodigo = izq + 16 + (p.numeros ? 2 * p.tamano * ANCHO_MONO + p.tamano * 0.9 : 8);
  return { lineas, altoLinea, encabezado, margen, alto, arriba: -alto / 2, izq, xCodigo };
}
function lineaDeCodigo(pieza, k) {
  const p = (
    /** @type {any} */
    "props" in pieza ? pieza.props : pieza
  );
  const m = medir(p);
  return {
    x: p.x,
    y: p.y + m.arriba + m.encabezado + m.margen + (k - 0.5) * m.altoLinea,
    ancho: p.ancho,
    alto: m.altoLinea
  };
}
function caracteresPorLinea({ ancho, tamano, numeros = true }) {
  const usado = 16 + (numeros ? 2 * tamano * ANCHO_MONO + tamano * 0.9 : 8) + 16;
  return Math.floor((ancho - usado) / (tamano * ANCHO_MONO));
}

// src/pedagogico/piezas/variable.js
var variable = definirPieza({
  nombre: "variable",
  predeterminados: {
    nombre: "x",
    // El valor como se escribe en el código: 0, 'Ana', [1, 2], True.
    valor: "",
    // Lo que dice type(): int, str... Vacío: no se muestra.
    tipoDato: "",
    ancho: 220,
    alto: 80,
    tamano: 30,
    relleno: "superficie",
    borde: "acento",
    // De 0 a 1: se ilumina cuando cambia, para que el ojo vaya ahí.
    destello: 0
  },
  colores: ["relleno", "borde"],
  crear(grupo) {
    return {
      nombre: el("text", { "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)", "font-weight": 700 }, grupo),
      tipo: el("text", { "text-anchor": "end", "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)" }, grupo),
      caja: el("rect", {}, grupo),
      destello: el("rect", { fill: "var(--ma-acento)" }, grupo),
      valor: el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)" }, grupo)
    };
  },
  actualizar(partes, p) {
    const w = p.ancho;
    const h = p.alto;
    const etiqueta = p.tamano * 0.75;
    poner(partes.nombre, { x: -w / 2 + 4, y: -h / 2 - etiqueta * 0.8, "font-size": etiqueta, fill: "var(--ma-texto)" });
    texto(partes.nombre, p.nombre);
    poner(partes.tipo, {
      x: w / 2 - 4,
      y: -h / 2 - etiqueta * 0.8,
      "font-size": etiqueta * 0.85,
      fill: "var(--ma-suave)",
      visibility: p.tipoDato ? null : "hidden"
    });
    texto(partes.tipo, p.tipoDato);
    poner(partes.caja, {
      x: -w / 2,
      y: -h / 2,
      width: w,
      height: h,
      rx: 10,
      fill: aCss(p.relleno),
      stroke: aCss(p.borde),
      "stroke-width": 3
    });
    poner(partes.destello, {
      x: -w / 2,
      y: -h / 2,
      width: w,
      height: h,
      rx: 10,
      opacity: p.destello * 0.3,
      visibility: p.destello > 0 ? null : "hidden"
    });
    const largo2 = Array.from(String(p.valor)).length || 1;
    const tamano = Math.min(p.tamano, (w - 24) / (largo2 * ANCHO_MONO));
    poner(partes.valor, { "font-size": tamano, fill: "var(--ma-texto)" });
    texto(partes.valor, String(p.valor));
  },
  tamano: (p) => ({ ancho: p.ancho, alto: p.alto })
});

// src/pedagogico/piezas/lista.js
var lista = definirPieza({
  nombre: "lista",
  predeterminados: {
    nombre: "",
    // Los elementos como se escriben en el código: ['4', '8', '15'].
    items: [],
    celda: 90,
    alto: 76,
    tamano: 28,
    // El índice del elemento señalado (-1: ninguno). Con decimales, la
    // flechita va de un casillero al otro.
    senalar: -1,
    // Lo que se escribe debajo de la flechita, por ejemplo la variable del for.
    puntero: "",
    indices: true,
    relleno: "superficie",
    borde: "acento",
    destello: 0
  },
  colores: ["relleno", "borde"],
  crear(grupo) {
    return {
      grupo,
      forma: -1,
      nombre: el("text", { "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)", "font-weight": 700 }, grupo),
      celdas: el("g", {}, grupo),
      flecha: el("g", {}, grupo)
    };
  },
  actualizar(partes, p) {
    const n2 = p.items.length;
    const w = Math.max(n2, 1) * p.celda;
    const izq = -w / 2;
    const h = p.alto;
    const etiqueta = p.tamano * 0.75;
    poner(partes.nombre, { x: izq + 4, y: -h / 2 - etiqueta * 0.8, "font-size": etiqueta, fill: "var(--ma-texto)" });
    texto(partes.nombre, p.nombre);
    if (partes.forma !== n2) {
      partes.celdas.replaceChildren();
      partes.filas = Array.from({ length: n2 }, () => ({
        caja: el("rect", {}, partes.celdas),
        valor: el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)" }, partes.celdas),
        indice: el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)" }, partes.celdas)
      }));
      partes.vacia = el("rect", { "stroke-dasharray": "8 6", fill: "none" }, partes.celdas);
      partes.forma = n2;
    }
    poner(partes.vacia, {
      x: izq,
      y: -h / 2,
      width: w,
      height: h,
      rx: 8,
      stroke: aCss(p.borde),
      "stroke-width": 2,
      visibility: n2 === 0 ? null : "hidden"
    });
    const senalada = Math.round(p.senalar);
    partes.filas.forEach((fila2, i) => {
      const x = izq + i * p.celda;
      const activa = i === senalada;
      poner(fila2.caja, {
        x,
        y: -h / 2,
        width: p.celda,
        height: h,
        fill: activa ? `color-mix(in srgb, ${aCss(p.borde)} 22%, ${aCss(p.relleno)})` : aCss(p.relleno),
        stroke: aCss(p.borde),
        "stroke-width": 3
      });
      const texto3 = String(p.items[i]);
      const tamano = Math.min(p.tamano, (p.celda - 12) / (Array.from(texto3).length * ANCHO_MONO));
      poner(fila2.valor, { x: x + p.celda / 2, y: 0, "font-size": tamano, fill: "var(--ma-texto)", "font-weight": activa ? 700 : 400 });
      texto(fila2.valor, texto3);
      poner(fila2.indice, {
        x: x + p.celda / 2,
        y: h / 2 + p.tamano * 0.55,
        "font-size": p.tamano * 0.6,
        fill: "var(--ma-suave)",
        visibility: p.indices ? null : "hidden"
      });
      texto(fila2.indice, String(i));
    });
    const visible = p.senalar >= 0 && n2 > 0;
    const xf = izq + (Math.min(Math.max(p.senalar, 0), n2 - 1) + 0.5) * p.celda;
    const yf = h / 2 + p.tamano * 1.1;
    if (!partes.punta) {
      partes.punta = el("path", {}, partes.flecha);
      partes.etiqueta = el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)", "font-weight": 700 }, partes.flecha);
    }
    poner(partes.flecha, { transform: `translate(${Math.round(xf * 100) / 100} ${yf})`, visibility: visible ? null : "hidden" });
    poner(partes.punta, { d: "M0 0 L-12 18 L12 18 Z", fill: aCss(p.borde) });
    poner(partes.etiqueta, { y: 18 + p.tamano * 0.6, "font-size": p.tamano * 0.75, fill: aCss(p.borde), visibility: p.puntero ? null : "hidden" });
    texto(partes.etiqueta, p.puntero);
  },
  tamano: (p) => ({ ancho: Math.max(p.items.length, 1) * p.celda, alto: p.alto })
});

// src/pedagogico/piezas/consola.js
var consola = definirPieza({
  nombre: "consola",
  predeterminados: {
    // Todo lo que se mostró hasta ahora. Se ven los últimos `renglones`.
    salida: "",
    ancho: 700,
    renglones: 4,
    tamano: 24,
    titulo: "Salida",
    relleno: "#0f141b",
    color: "#e8ebf0"
  },
  colores: ["relleno", "color"],
  crear(grupo) {
    return {
      fondo: el("rect", {}, grupo),
      titulo: el("text", { "dominant-baseline": "central", "font-family": "var(--ma-fuente-mono)" }, grupo),
      texto: el("text", { "font-family": "var(--ma-fuente-mono)", "dominant-baseline": "central", style: "white-space: pre" }, grupo),
      lineas: []
    };
  },
  actualizar(partes, p) {
    const { alto, altoLinea, encabezado } = medir2(p);
    const izq = -p.ancho / 2;
    const arriba = -alto / 2;
    poner(partes.fondo, { x: izq, y: arriba, width: p.ancho, height: alto, rx: 12, fill: aCss(p.relleno), stroke: "var(--ma-borde)", "stroke-width": 2 });
    poner(partes.titulo, { x: izq + 18, y: arriba + encabezado / 2, "font-size": p.tamano * 0.7, fill: "#8b95a5" });
    texto(partes.titulo, p.titulo);
    const todas = String(p.salida).replace(/\n$/, "").split("\n");
    const visibles = p.salida === "" ? [] : todas.slice(-p.renglones);
    while (partes.lineas.length < p.renglones) partes.lineas.push(el("tspan", {}, partes.texto));
    partes.lineas.forEach((tspan, i) => {
      poner(tspan, { x: izq + 18, y: arriba + encabezado + (i + 0.5) * altoLinea + 6 });
      texto(tspan, visibles[i] ?? "");
    });
    poner(partes.texto, { "font-size": p.tamano, fill: aCss(p.color) });
  },
  tamano(p) {
    return { ancho: p.ancho, alto: medir2(p).alto };
  }
});
function medir2(p) {
  const altoLinea = p.tamano * 1.45;
  const encabezado = p.tamano * 1.4;
  return { altoLinea, encabezado, alto: encabezado + p.renglones * altoLinea + 12 };
}

// src/pedagogico/piezas/pila.js
var pila = definirPieza({
  nombre: "pila",
  predeterminados: {
    // [{ funcion: 'sumar', filas: [['a', '3'], ['b', '4']], retorno: '7' }], de la de afuera a la actual.
    marcos: [],
    ancho: 460,
    tamano: 24,
    titulo: "Llamadas",
    relleno: "superficie",
    borde: "acento2",
    destello: 0
  },
  colores: ["relleno", "borde"],
  crear(grupo) {
    return {
      titulo: el("text", { "dominant-baseline": "central", "font-weight": 700 }, grupo),
      cuerpo: el("g", {}, grupo),
      clave: ""
    };
  },
  actualizar(partes, p) {
    const { altoFila, encabezado, separacion } = medidas(p);
    const izq = -p.ancho / 2;
    poner(partes.titulo, {
      x: izq + 4,
      y: -p.tamano * 0.6,
      "font-size": p.tamano * 0.8,
      fill: "var(--ma-suave)",
      visibility: p.titulo && p.marcos.length ? null : "hidden"
    });
    texto(partes.titulo, p.titulo);
    const clave = JSON.stringify(p.marcos);
    if (partes.clave !== clave) {
      partes.cuerpo.replaceChildren();
      partes.actual = null;
      const enOrden = [...p.marcos].reverse();
      let y = 0;
      enOrden.forEach((m, i) => {
        const actual = i === 0;
        const filas = [...m.filas];
        if (m.retorno !== void 0) filas.push(["\u21A9 devuelve", m.retorno]);
        const alto = encabezado + Math.max(filas.length, 1) * altoFila + 10;
        const g = el("g", { transform: `translate(0 ${y})`, opacity: actual ? 1 : 0.62 }, partes.cuerpo);
        el("rect", {
          x: izq,
          y: 0,
          width: p.ancho,
          height: alto,
          rx: 10,
          fill: aCss(p.relleno),
          stroke: actual ? aCss(p.borde) : "var(--ma-borde)",
          "stroke-width": actual ? 3 : 2
        }, g);
        el("rect", {
          x: izq,
          y: 0,
          width: p.ancho,
          height: encabezado,
          rx: 10,
          fill: `color-mix(in srgb, ${aCss(p.borde)} ${actual ? 24 : 10}%, transparent)`
        }, g);
        const nombre = el("text", {
          x: izq + 14,
          y: encabezado / 2,
          "dominant-baseline": "central",
          "font-weight": 700,
          "font-family": "var(--ma-fuente-mono)",
          "font-size": p.tamano,
          fill: "var(--ma-texto)"
        }, g);
        texto(nombre, `${m.funcion}()`);
        if (filas.length === 0) {
          const vacio = el("text", {
            x: izq + 14,
            y: encabezado + altoFila / 2,
            "dominant-baseline": "central",
            "font-size": p.tamano * 0.8,
            fill: "var(--ma-suave)"
          }, g);
          texto(vacio, "sin variables todav\xEDa");
        }
        filas.forEach(([k, v], j) => {
          const fy = encabezado + (j + 0.5) * altoFila + 4;
          const esRetorno = k === "\u21A9 devuelve";
          const color = esRetorno ? "var(--ma-exito)" : "var(--ma-texto)";
          const nk = el("text", {
            x: izq + 18,
            y: fy,
            "dominant-baseline": "central",
            "font-family": "var(--ma-fuente-mono)",
            "font-size": p.tamano * 0.9,
            fill: esRetorno ? color : "var(--ma-suave)",
            "font-weight": esRetorno ? 700 : 400
          }, g);
          texto(nk, k);
          const lugar = p.ancho * 0.58 - 18;
          const tam = Math.min(p.tamano * 0.9, lugar / (Math.max(String(v).length, 1) * ANCHO_MONO));
          const nv = el("text", {
            x: izq + p.ancho - 16,
            y: fy,
            "text-anchor": "end",
            "dominant-baseline": "central",
            "font-family": "var(--ma-fuente-mono)",
            "font-size": tam,
            fill: color,
            "font-weight": 700
          }, g);
          texto(nv, String(v));
        });
        if (actual) {
          partes.actual = el("rect", { x: izq, y: 0, width: p.ancho, height: alto, rx: 10, fill: "var(--ma-acento2)" }, g);
        }
        y += alto + separacion;
      });
      partes.clave = clave;
    }
    if (partes.actual) {
      poner(partes.actual, { opacity: p.destello * 0.25, visibility: p.destello > 0 ? null : "hidden" });
    }
  },
  // Lo que ocupa, por si se le engancha una flecha.
  tamano(p) {
    const { altoFila, encabezado, separacion } = medidas(p);
    const alto = p.marcos.reduce((n2, m) => n2 + encabezado + Math.max(m.filas.length + (m.retorno !== void 0 ? 1 : 0), 1) * altoFila + 10 + separacion, 0);
    return { ancho: p.ancho, alto };
  }
});
function medidas(p) {
  return { altoFila: p.tamano * 1.5, encabezado: p.tamano * 1.75, separacion: p.tamano * 0.5 };
}

// src/pedagogico/explicar.js
var LIMITE = 28;
function corto(repr, limite = LIMITE) {
  return repr.length > limite ? `${repr.slice(0, limite - 1)}\u2026` : repr;
}
function queEs(v) {
  if (v.atributos) return "el mismo objeto";
  if (v.tipo === "dict") return "el mismo diccionario";
  return "la misma lista";
}
function crear(nombre, v, otras) {
  const gemela = v.ref !== void 0 && Object.entries(otras).find(([n2, o]) => n2 !== nombre && o.ref === v.ref);
  if (gemela) return `${nombre} no es una copia: es ${queEs(v)} que ${gemela[0]}.`;
  const copia = v.ref !== void 0 && Object.entries(otras).find(([n2, o]) => n2 !== nombre && o.ref !== void 0 && o.ref !== v.ref && o.repr === v.repr);
  if (copia) return `${nombre} es una copia: tiene lo mismo que ${copia[0]}, pero es otra ${v.atributos ? "cosa" : "lista"}.`;
  if (v.atributos) return `${nombre} es un objeto ${v.tipo}.`;
  if (v.items) {
    const cuantos = v.items.length;
    const que = v.tipo === "tuple" ? "una tupla" : "una lista";
    return cuantos === 0 ? `${nombre} es ${que} vac\xEDa.` : `${nombre} es ${que} con ${cuantos} ${cuantos === 1 ? "elemento" : "elementos"}.`;
  }
  if (v.tipo === "dict") {
    const cuantos = v.pares?.length ?? 0;
    return cuantos === 0 ? `${nombre} es un diccionario vac\xEDo.` : `${nombre} es un diccionario con ${cuantos} ${cuantos === 1 ? "clave" : "claves"}.`;
  }
  return `${nombre} vale ${corto(v.repr)}.`;
}
function cambiar(nombre, antes, ahora) {
  if (ahora.atributos && antes.atributos) {
    const previos = Object.fromEntries(antes.atributos);
    const cambio2 = ahora.atributos.find(([k, val]) => previos[k] !== val);
    if (cambio2) {
      return cambio2[0] in previos ? `${nombre}.${cambio2[0]} pasa de ${corto(previos[cambio2[0]])} a ${corto(cambio2[1])}.` : `${nombre} tiene un atributo nuevo: ${cambio2[0]} vale ${corto(cambio2[1])}.`;
    }
  }
  if (ahora.items && antes.items) {
    if (ahora.items.length === antes.items.length + 1) return `Se agreg\xF3 ${corto(ahora.items.at(-1))} a la lista ${nombre}.`;
    if (ahora.items.length === antes.items.length - 1) return `${nombre} ahora tiene un elemento menos.`;
    return `${nombre} cambi\xF3: ahora es ${corto(ahora.repr)}.`;
  }
  if (ahora.tipo === "dict" && antes.tipo === "dict") {
    const nuevas = (ahora.pares ?? []).filter(([k]) => !(antes.pares ?? []).some(([k2]) => k2 === k));
    if (nuevas.length === 1) return `Se agreg\xF3 la clave ${corto(nuevas[0][0])} a ${nombre}.`;
    return `${nombre} cambi\xF3.`;
  }
  return `${nombre} pasa de ${corto(antes.repr)} a ${corto(ahora.repr)}.`;
}
function cambio(a, b) {
  return a.repr !== b.repr || JSON.stringify(a.atributos) !== JSON.stringify(b.atributos);
}
function diferencias(varsAntes, vars, delFor) {
  const frases = [];
  const cambiadas = [];
  for (const [nombre, v] of Object.entries(vars)) {
    const previa = varsAntes[nombre];
    if (nombre === delFor && previa?.repr !== v.repr) {
      frases.push(previa ? `Otra vuelta del for: ${nombre} vale ${corto(v.repr)}.` : `El for toma el primer elemento: ${nombre} vale ${corto(v.repr)}.`);
    } else if (!previa) {
      frases.push(crear(nombre, v, vars));
    } else if (cambio(previa, v)) {
      cambiadas.push({ nombre, previa, v });
    }
  }
  const yaDichas = /* @__PURE__ */ new Set();
  for (const c of cambiadas) {
    if (yaDichas.has(c.nombre)) continue;
    const juntas = cambiadas.filter((o) => o.v.ref !== void 0 && o.v.ref === c.v.ref);
    if (juntas.length > 1) {
      juntas.forEach((o) => yaDichas.add(o.nombre));
      const nombres = juntas.map((o) => o.nombre);
      frases.push(`${cambiar(c.nombre, c.previa, c.v)} Y tambi\xE9n ${nombres.slice(1).join(" y ")}: son ${queEs(c.v)}.`);
    } else {
      frases.push(cambiar(c.nombre, c.previa, c.v));
    }
  }
  return frases;
}
function explicarPaso(traza, i, lineas) {
  const paso = traza[i];
  if (i === 0) return "Arranca el programa, por la primera l\xEDnea.";
  const antes = traza[i - 1];
  if (paso.excepcion) {
    const { tipo, mensaje } = paso.excepcion;
    return `Se corta con un error en la l\xEDnea ${paso.linea}: ${tipo}${mensaje ? ` (${mensaje})` : ""}.`;
  }
  const pila2 = paso.pila ?? [];
  const pilaAntes = antes.pila ?? [];
  if (paso.retorno) {
    const { funcion, valor } = paso.retorno;
    const hizo = pila2.length && pila2.length === pilaAntes.length ? diferencias(pilaAntes[pilaAntes.length - 1].variables, pila2[pila2.length - 1].variables, null).slice(0, 1) : [];
    const termina = funcion === "__init__" ? "Termina __init__: el objeto queda armado." : valor === "None" ? `${funcion} termina (no devuelve nada).` : `${funcion} termina y devuelve ${corto(valor)}.`;
    return [...hizo, termina].join(" ");
  }
  if (pila2.length > pilaAntes.length) {
    const actual = pila2[pila2.length - 1];
    const vars = Object.entries(actual.variables);
    const yo = vars.find(([k]) => k === "self");
    const parametros = vars.filter(([k]) => k !== "self");
    const adentro2 = parametros.length ? ` Adentro, ${parametros.map(([k, v]) => `${k} vale ${corto(v.repr)}`).join(" y ")}.` : "";
    if (actual.funcion === "__init__") return `Se crea un objeto nuevo y se ejecuta __init__.${adentro2}`;
    const llamada = `${actual.funcion}(${parametros.map(([, v]) => corto(v.repr)).join(", ")})`;
    const otraVez = pilaAntes.length && pilaAntes[pilaAntes.length - 1].funcion === actual.funcion ? ": la funci\xF3n se llama a s\xED misma" : "";
    const sobre = yo ? ` sobre ${corto(yo[1].repr)}` : "";
    return `Se llama a ${llamada}${sobre}${otraVez}.${adentro2}`;
  }
  const delFor = (lineas[antes.linea - 1] ?? "").trim().match(/^for\s+([A-Za-z_]\w*)\s+in\b/)?.[1];
  const frases = [];
  if (pila2.length && pila2.length === pilaAntes.length) {
    frases.push(...diferencias(pilaAntes[pilaAntes.length - 1].variables, pila2[pila2.length - 1].variables, delFor));
  }
  frases.push(...diferencias(antes.variables ?? {}, paso.variables ?? {}, delFor));
  const nueva = (paso.salida ?? "").slice((antes.salida ?? "").length).replace(/\n$/, "");
  if (nueva) frases.push(`Se muestra: ${corto(nueva.split("\n").at(-1), 60)}`);
  if (frases.length === 0) {
    const texto3 = (lineas[antes.linea - 1] ?? "").trim();
    const def = texto3.match(/^def\s+([A-Za-z_]\w*)/);
    if (def) return `Se define la funci\xF3n ${def[1]}: todav\xEDa no se ejecuta, queda guardada para cuando se la llame.`;
    const clase = texto3.match(/^class\s+([A-Za-z_]\w*)/);
    if (clase) return `Se define la clase ${clase[1]}: es el molde, todav\xEDa no hay ning\xFAn objeto.`;
    if (pila2.length < pilaAntes.length) return "Vuelve a donde se hab\xEDa llamado a la funci\xF3n.";
    if (/^(for|while)\b/.test(texto3) && paso.linea === antes.linea + 1) return "Entra al bucle.";
    if (/^for\b/.test(texto3)) return "No quedan elementos: termina el for.";
    if (/^while\b/.test(texto3)) return "La condici\xF3n del while ya no se cumple: sale del bucle.";
    if (/^(if|elif)\b/.test(texto3)) return paso.linea === antes.linea + 1 ? "La condici\xF3n se cumple: entra." : "La condici\xF3n no se cumple: la saltea.";
    if (/^else\b/.test(texto3)) return "Entra por el else.";
    const vuelve = (lineas[paso.linea - 1] ?? "").trim();
    if (paso.linea > 0 && paso.linea < antes.linea && /^(for|while)\b/.test(vuelve)) return "Vuelve al principio del bucle.";
  }
  if (paso.linea === 0) frases.push("Termin\xF3 el programa.");
  return frases.slice(0, 2).join(" ") || `Sigue en la l\xEDnea ${paso.linea}.`;
}
function detectarPunteros(traza) {
  const encontrados = {};
  const nombres = new Set(traza.flatMap((p) => Object.keys(p.variables ?? {})));
  for (const lista2 of nombres) {
    for (const variable2 of nombres) {
      if (variable2 === lista2 || Object.values(encontrados).includes(variable2)) continue;
      let indice = -1;
      let anterior = null;
      let aciertos = 0;
      let falla = false;
      for (const paso of traza) {
        const l = paso.variables?.[lista2];
        const v = paso.variables?.[variable2];
        if (!l?.items || !v || v.repr === anterior) continue;
        anterior = v.repr;
        const k = l.items.indexOf(v.repr, indice + 1);
        if (k === -1) {
          falla = true;
          break;
        }
        indice = k;
        aciertos += 1;
      }
      if (!falla && aciertos >= 2 && !encontrados[lista2]) encontrados[lista2] = variable2;
    }
  }
  return encontrados;
}

// src/pedagogico/traza.js
function claseDeVariable(v) {
  if (v.atributos) return "objeto";
  if (v.tipo === "dict") return "dict";
  if (v.items) return "lista";
  return "valor";
}
function queEs2(v) {
  if (v.atributos) return "el mismo objeto";
  if (v.tipo === "dict") return "el mismo diccionario";
  if (v.tipo === "set") return "el mismo conjunto";
  return "la misma lista";
}
function desdeTraza(opciones) {
  const {
    traza,
    lenguaje = "python",
    titulo = "",
    descripcion = "",
    archivo = "",
    ritmo = 1.4,
    lectura = 13,
    explicaciones = {},
    preguntas = {},
    capitulos = {},
    explicar = false,
    lupa = false,
    lupaDebajoDe = null,
    contexto = 3
  } = opciones;
  const punteros = opciones.punteros === "auto" ? detectarPunteros(opciones.traza ?? []) : opciones.punteros ?? {};
  const programa = String(opciones.codigo).replace(/\s+$/, "");
  if (!Array.isArray(traza) || traza.length === 0) throw new Error("La traza tiene que ser una lista de pasos, y no puede estar vac\xEDa.");
  const variables2 = [];
  const vistas = /* @__PURE__ */ new Set();
  const maxFilas = {};
  let maxItems = 0;
  for (const paso of traza) {
    for (const [nombre, v] of Object.entries(paso.variables ?? {})) {
      const filas = v.atributos ?? (v.tipo === "dict" ? v.pares : null);
      if (filas) maxFilas[nombre] = Math.max(maxFilas[nombre] ?? 0, filas.length);
      if (v.items) maxItems = Math.max(maxItems, v.items.length);
      if (vistas.has(nombre)) continue;
      vistas.add(nombre);
      variables2.push({ nombre, clase: claseDeVariable(v), primera: v });
    }
  }
  const conSalida = traza.some((p) => p.salida);
  const conError = traza.some((p) => p.excepcion);
  const conPila = traza.some((p) => p.pila?.length);
  const compartidas = /* @__PURE__ */ new Set();
  const pares = /* @__PURE__ */ new Map();
  for (const paso of traza) {
    const porRef = /* @__PURE__ */ new Map();
    const anotar = (nombre, v, global) => {
      if (v.ref === void 0) return;
      if (!porRef.has(v.ref)) porRef.set(v.ref, []);
      porRef.get(v.ref).push({ nombre, global, v });
    };
    for (const [n2, v] of Object.entries(paso.variables ?? {})) anotar(n2, v, true);
    for (const m of paso.pila ?? []) for (const [n2, v] of Object.entries(m.variables)) anotar(n2, v, false);
    for (const [ref, nombres] of porRef) {
      if (nombres.length < 2) continue;
      compartidas.add(ref);
      const globales = nombres.filter((x) => x.global);
      for (let k = 1; k < globales.length; k++) {
        const clave = `${globales[0].nombre}|${globales[k].nombre}`;
        if (!pares.has(clave)) pares.set(clave, { a: globales[0].nombre, b: globales[k].nombre, que: queEs2(globales[0].v) });
      }
    }
  }
  const conRef = (nombre, v) => v?.ref !== void 0 && compartidas.has(v.ref) ? `${nombre} \xB7 #${v.ref}` : nombre;
  return function(disposicion) {
    const angosta = disposicion.nombre === "angosta";
    const media = disposicion.nombre === "media";
    const W = angosta ? 640 : media ? 1200 : 1600;
    const H = angosta ? 1140 : 900;
    const arriba = titulo ? angosta ? 100 : 100 : 30;
    const cod = angosta ? { x: 320, ancho: 610, tamano: 22 } : media ? { x: 345, ancho: 650, tamano: 36 } : { x: 440, ancho: 820, tamano: 36 };
    const necesario = Math.max(...programa.split("\n").map((l) => l.length));
    cod.tamano = Math.min(cod.tamano, cod.tamano * caracteresPorLinea(cod) / necesario);
    const tamanoPorAncho = cod.tamano;
    const lineasCodigo = programa.split("\n").length;
    const disponible = angosta ? H * 0.42 : H - arriba - 30 - (conSalida ? 230 : 0);
    cod.tamano = Math.min(cod.tamano, disponible / (lineasCodigo * 1.6 + (archivo ? 2.6 : 1)));
    const piezaCodigo = codigo({
      x: cod.x,
      y: 0,
      ancho: cod.ancho,
      tamano: cod.tamano,
      codigo: programa,
      lenguaje,
      titulo: archivo,
      linea: traza[0].linea || 1,
      marca: 0
    });
    const altoCodigo = piezaCodigo.tipo.tamano(piezaCodigo.props).alto;
    piezaCodigo.props.y = arriba + altoCodigo / 2;
    const piezas = {};
    if (titulo) {
      piezas.titulo = texto2({ x: W / 2, y: angosta ? 50 : 52, texto: titulo, tamano: angosta ? 32 : 40, peso: 800, anchoMax: W - 40 });
    }
    piezas.codigo = piezaCodigo;
    const con = angosta ? { x: 320, ancho: 610, renglones: 3, tamano: 20 } : { x: cod.x, ancho: cod.ancho, renglones: 3, tamano: 30 };
    const piezaConsola = consola({ ...con, opacidad: 0 });
    const altoConsola = piezaConsola.tipo.tamano(piezaConsola.props).alto;
    piezaConsola.props.y = angosta ? H - 20 - altoConsola / 2 : arriba + altoCodigo + 40 + altoConsola / 2;
    if (conSalida) piezas.consola = piezaConsola;
    if (conError) {
      const yError = angosta ? piezaConsola.props.y - altoConsola / 2 - 70 : piezaConsola.props.y + altoConsola / 2 + 70;
      piezas.error = caja({
        x: con.x,
        y: yError,
        ancho: con.ancho,
        alto: angosta ? 80 : 96,
        texto: "",
        tamano: angosta ? 24 : 34,
        relleno: "superficie",
        borde: "error",
        color: "error",
        opacidad: 0
      });
    }
    const col = angosta ? { x: 320, ancho: 560, y: arriba + altoCodigo + 70 } : media ? { x: 925, ancho: 500, y: arriba + 50 } : { x: 1250, ancho: 620, y: arriba + 50 };
    let y = col.y;
    const lugarVariable = {};
    for (const v of variables2) {
      const id = "var_" + v.nombre;
      lugarVariable[v.nombre] = id;
      if (v.clase === "lista") {
        const celda2 = Math.min(angosta ? 84 : 120, col.ancho / Math.max(maxItems, 1));
        const alto = angosta ? 68 : 96;
        piezas[id] = lista({
          x: col.x,
          y: y + alto / 2,
          nombre: conRef(v.nombre, v.primera),
          celda: celda2,
          alto,
          tamano: angosta ? 26 : 36,
          puntero: Object.entries(punteros).find(([l]) => l === v.nombre)?.[1] ?? "",
          opacidad: 0
        });
        y += alto + (angosta ? 115 : 160);
      } else if (v.clase === "dict" || v.clase === "objeto") {
        const altoFila = angosta ? 44 : 56;
        const filas = maxFilas[v.nombre] ?? 0;
        const columnas = v.clase === "objeto" ? [v.nombre, conRef(v.primera.tipo, v.primera).replace(" \xB7 ", " ")] : [`${v.nombre}: clave`, conRef("valor", v.primera)];
        piezas[id] = tabla({
          x: col.x,
          y: y + (filas + 1) * altoFila / 2,
          ancho: Math.min(col.ancho, 480),
          columnas,
          filas: [],
          altoFila,
          tamano: angosta ? 24 : 30,
          opacidad: 0,
          encabezado: v.clase === "objeto" ? "acento2" : "acento"
        });
        y += (filas + 1) * altoFila + 80;
      } else {
        const alto = angosta ? 68 : 96;
        piezas[id] = variable({
          x: col.x,
          y: y + alto / 2,
          nombre: v.nombre,
          ancho: Math.min(col.ancho, angosta ? 320 : 420),
          alto,
          tamano: angosta ? 28 : 38,
          opacidad: 0
        });
        y += alto + (angosta ? 72 : 100);
      }
    }
    if (conPila) {
      piezas.pila = pila({ x: col.x, y: y - (angosta ? 10 : 20), ancho: Math.min(col.ancho, angosta ? 560 : 600), tamano: angosta ? 22 : media ? 25 : 32 });
    }
    const costado = (id) => ({ pieza: id, lado: "izquierda", dx: -12 });
    for (const [clave, par] of pares) {
      piezas["alias_" + clave.replace("|", "_")] = flecha({
        desde: costado(lugarVariable[par.a]),
        hasta: costado(lugarVariable[par.b]),
        progreso: 0,
        curvatura: 0.45,
        separacion: 0,
        color: "acento2",
        etiqueta: par.que,
        tamanoEtiqueta: angosta ? 18 : 22,
        colorEtiqueta: "acento2",
        ladoEtiqueta: -1,
        girarEtiqueta: true
      });
    }
    Object.assign(piezas, opciones.piezas?.(disposicion, { W, H, col, y }) ?? {});
    if (!angosta && !conPila) {
      let minimo = Infinity;
      let maximo = -Infinity;
      for (const [id, pieza] of Object.entries(piezas)) {
        if (id === "titulo") continue;
        const alto = pieza.tipo.tamano?.(pieza.props).alto ?? pieza.props.tamano ?? 0;
        minimo = Math.min(minimo, pieza.props.y - alto / 2 - 40);
        maximo = Math.max(maximo, pieza.props.y + alto / 2 + 40);
      }
      const corrimiento = Math.max(0, (arriba + H) / 2 - (minimo + maximo) / 2);
      for (const [id, pieza] of Object.entries(piezas)) if (id !== "titulo") pieza.props.y += corrimiento;
    }
    const comoSeVe = typeof lupa === "object" && lupa ? lupa : {};
    const pedida = lupa === true ? 1.8 : typeof lupa === "object" && lupa ? lupa.zoom ?? 1.8 : Number(lupa) || 0;
    const conLupa = pedida > 1 && (lupaDebajoDe == null || (disposicion.ancho ?? Infinity) < lupaDebajoDe);
    const geo = (
      /** @type {any} */
      piezaCodigo.props
    );
    const altoLinea = geo.tamano * geo.interlineado;
    const izqCodigo = geo.x - geo.ancho / 2;
    const usado = 16 + 2 * geo.tamano * ANCHO_MONO + geo.tamano * 0.9 + necesario * geo.tamano * ANCHO_MONO + 16;
    const zoom = conLupa ? Math.min(pedida, geo.ancho / usado, tamanoPorAncho / geo.tamano * 1.15) : 1;
    const arribaCodigo = geo.y - altoCodigo / 2;
    const yLinea = (k) => arribaCodigo + (archivo ? geo.tamano * 1.6 : 0) + geo.tamano * 0.5 + (k - 0.5) * altoLinea;
    const medioVisible = altoCodigo / (2 * zoom);
    const encuadrar = (y2) => Math.min(Math.max(y2, arribaCodigo + medioVisible), arribaCodigo + altoCodigo - medioVisible);
    let mirarY = encuadrar(arribaCodigo);
    if (zoom > 1.05) {
      const ordenadas = {};
      for (const [id, pieza] of Object.entries(piezas)) {
        if (id === "codigo") {
          ordenadas.lupa = camara({
            x: geo.x,
            y: geo.y,
            ancho: geo.ancho + 6,
            alto: altoCodigo + 6,
            zoom,
            // A lo ancho, pegada al borde izquierdo del código: el zoom ya
            // está limitado para que lo escrito entre; lo que se pierde es
            // lo que sobraba a la derecha de la línea más larga.
            mirarX: izqCodigo + geo.ancho / (2 * zoom),
            mirarY,
            // Las esquinas, como las de la caja del código (que con
            // el zoom quedan afuera de la ventana).
            forma: comoSeVe.forma ?? "rect",
            radio: comoSeVe.radio ?? 16,
            aro: comoSeVe.aro ?? 2,
            colorAro: "borde",
            fondo: "superficie"
          });
          pieza.props.dentro = "lupa";
        }
        ordenadas[id] = pieza;
      }
      for (const id of Object.keys(piezas)) delete piezas[id];
      Object.assign(piezas, ordenadas);
    }
    const seguir = (k) => {
      if (zoom <= 1.05 || !(k > 0)) return null;
      const margen = (contexto + 0.5) * altoLinea;
      let nuevo = mirarY;
      if (yLinea(k) - margen < mirarY - medioVisible) nuevo = yLinea(k) - margen + medioVisible;
      if (yLinea(k) + margen > mirarY + medioVisible) nuevo = yLinea(k) + margen - medioVisible;
      nuevo = encuadrar(nuevo);
      if (Math.abs(nuevo - mirarY) < 0.5) return null;
      mirarY = nuevo;
      return nuevo;
    };
    const linea = [{ pieza: "codigo", a: { marca: 1 }, dur: 0.4, en: 0.2 }];
    const anterior = {};
    const indiceSenalado = {};
    let t = 0.7;
    let salidaAnterior = "";
    let respuesta = "";
    let pilaAnterior = "[]";
    let estabaDentro = false;
    const aliasActivos = {};
    const lineasDelPrograma = programa.split("\n");
    traza.forEach((paso, i) => {
      if (capitulos[i]) linea.push({ capitulo: capitulos[i], en: t });
      const vars = paso.variables ?? {};
      for (const [nombre, v] of Object.entries(vars)) {
        const id = lugarVariable[nombre];
        const antes = anterior[nombre];
        if (antes && antes.repr === v.repr && JSON.stringify(antes.atributos) === JSON.stringify(v.atributos)) continue;
        if (!antes) linea.push({ pieza: id, a: { opacidad: 1 }, dur: 0.4, en: t });
        const clase = variables2.find((x) => x.nombre === nombre).clase;
        if (clase === "lista") {
          linea.push({ pieza: id, a: { items: v.items }, dur: 0, en: t });
        } else if (clase === "dict") {
          linea.push({ pieza: id, a: { filas: v.pares ?? [] }, dur: 0, en: t });
        } else if (clase === "objeto") {
          linea.push({ pieza: id, a: { filas: v.atributos ?? [] }, dur: 0, en: t });
        } else {
          linea.push({ pieza: id, a: { valor: v.repr, tipoDato: v.tipo ?? "" }, dur: 0, en: t });
        }
        if (antes && (clase === "lista" || clase === "valor")) {
          linea.push({ pieza: id, a: { destello: 1 }, dur: 0.12, en: t, curva: "lineal" });
          linea.push({ pieza: id, a: { destello: 0 }, dur: 0.8, en: t + 0.12, curva: "salir" });
        }
      }
      for (const [nombreLista, nombreVar] of Object.entries(punteros)) {
        const l = vars[nombreLista];
        const v = vars[nombreVar];
        if (!l?.items || !v || anterior[nombreVar]?.repr === v.repr) continue;
        const desde = (indiceSenalado[nombreLista] ?? -1) + 1;
        let k = l.items.indexOf(v.repr, desde);
        if (k === -1) k = l.items.indexOf(v.repr);
        if (k === -1) continue;
        const primera = indiceSenalado[nombreLista] === void 0;
        linea.push({ pieza: lugarVariable[nombreLista], a: { senalar: k }, dur: primera ? 0 : 0.4, en: t });
        indiceSenalado[nombreLista] = k;
      }
      for (const nombre of Object.keys(anterior)) if (!(nombre in vars)) delete anterior[nombre];
      Object.assign(anterior, vars);
      if (conPila) {
        const marcos = (paso.pila ?? []).map((m) => ({
          funcion: m.funcion,
          filas: Object.entries(m.variables).map(([k, v]) => [k, v.repr])
        }));
        if (paso.retorno && marcos.length) marcos[marcos.length - 1].retorno = paso.retorno.valor;
        const clave = JSON.stringify(marcos);
        if (clave !== pilaAnterior) {
          linea.push({ pieza: "pila", a: { marcos }, dur: 0, en: t });
          linea.push({ pieza: "pila", a: { destello: 1 }, dur: 0.12, en: t, curva: "lineal" });
          linea.push({ pieza: "pila", a: { destello: 0 }, dur: 0.8, en: t + 0.12, curva: "salir" });
          pilaAnterior = clave;
        }
        const dentro = marcos.length > 0;
        if (dentro !== estabaDentro && !paso.excepcion) {
          linea.push({ pieza: "codigo", a: { colorMarca: dentro ? "acento2" : "acento" }, dur: 0.3, en: t + 0.45 });
          estabaDentro = dentro;
        }
      }
      for (const [clave, par] of pares) {
        const a = vars[par.a];
        const b = vars[par.b];
        const juntas = a?.ref !== void 0 && a.ref === b?.ref;
        if (juntas !== Boolean(aliasActivos[clave])) {
          linea.push({ pieza: "alias_" + clave.replace("|", "_"), a: { progreso: juntas ? 1 : 0 }, dur: 0.6, en: t + 0.2 });
          aliasActivos[clave] = juntas;
        }
      }
      if (conSalida && (paso.salida ?? "") !== salidaAnterior) {
        if (!salidaAnterior) linea.push({ pieza: "consola", a: { opacidad: 1 }, dur: 0.3, en: t });
        linea.push({ pieza: "consola", a: { salida: paso.salida ?? "" }, dur: 0, en: t });
        salidaAnterior = paso.salida ?? "";
      }
      if (paso.excepcion) {
        const { tipo, mensaje } = paso.excepcion;
        linea.push({ pieza: "codigo", a: { colorMarca: "error" }, dur: 0.3, en: t });
        linea.push({ pieza: "error", a: { texto: `\u{1F6A8} ${tipo}${mensaje ? `: ${mensaje}` : ""}` }, dur: 0, en: t });
        linea.push({ pieza: "error", a: { opacidad: 1 }, dur: 0.4, en: t + 0.2 });
      }
      for (const extra of paso.animar ?? []) {
        linea.push({ ...extra, en: t + (typeof extra.en === "number" ? extra.en : 0) });
      }
      if (paso.linea > 0) {
        linea.push({ pieza: "codigo", a: { linea: paso.linea, marca: 1 }, dur: i === 0 ? 0 : 0.35, en: t + 0.45 });
        const y2 = seguir(paso.linea);
        if (y2 != null) linea.push({ pieza: "lupa", a: { mirarY: y2 }, dur: i === 0 ? 0 : 0.6, en: t + 0.4 });
      } else if (!paso.excepcion) {
        linea.push({ pieza: "codigo", a: { marca: 0 }, dur: 0.4, en: t + 0.45 });
      }
      let largo2 = Math.max(ritmo, 0.9);
      const propia = explicaciones[i] ?? (explicar ? explicarPaso(traza, i, lineasDelPrograma) : void 0);
      const explicacion = [respuesta, propia].filter(Boolean).join(" ");
      respuesta = "";
      if (explicacion) {
        const dur = Math.max(ritmo, duracionLectura(explicacion, lectura));
        linea.push({ subtitulo: explicacion, en: t, dur });
        largo2 = Math.max(largo2, dur + 0.3);
      }
      const pregunta = preguntas[i];
      if (pregunta) {
        const enunciado = `${pregunta.pregunta} Paus\xE1 y pensalo.`;
        const dur = Math.max(pregunta.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
        linea.push({ marca: "pregunta", datos: pregunta, en: t + largo2, dur });
        linea.push({ subtitulo: enunciado, en: t + largo2, dur });
        largo2 += dur;
        if (pregunta.opciones && pregunta.correcta !== void 0) {
          respuesta = `Respuesta: ${pregunta.opciones[pregunta.correcta]}. ${pregunta.explicacion ?? ""}`.trim();
        }
      }
      t += largo2;
      linea.push({ marca: "paso", datos: { indice: i }, en: t });
      t += 0.1;
    });
    return {
      titulo: titulo || "Un programa, paso a paso",
      descripcion,
      ancho: W,
      alto: H,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea
    };
  };
}

// src/pedagogico/trazador-py.js
var TRAZADOR_PY = '# -*- coding: utf-8 -*-\n# El trazador: corre un programa de Python y anota cada paso que da.\n#\n# Este archivo es el \xDANICO lugar donde est\xE1. Lo usan:\n#   - herramientas/trazar.py, desde la consola;\n#   - el navegador, con Pyodide: herramientas/construir.js lo copia, tal cual,\n#     a src/pedagogico/trazador-py.js (un test verifica que sean iguales).\n#\n# Cada paso es la l\xEDnea que est\xE1 por correr, con las variables como est\xE1n en\n# ese momento y todo lo que se mostr\xF3 hasta ah\xED. Si el programa est\xE1 adentro de\n# una funci\xF3n, el paso trae tambi\xE9n la PILA de llamadas: cada funci\xF3n que se\n# est\xE1 ejecutando, con sus variables. Usa sys.settrace, igual que la medici\xF3n\n# de pasos de la plataforma del curso.\n#\n# Las listas, los diccionarios y los objetos llevan un n\xFAmero ("ref"): el\n# mismo n\xFAmero en dos variables quiere decir que son LA MISMA lista, no dos\n# iguales. Es lo que hace falta para entender por qu\xE9 cambiar una "cambia la otra".\n#\n# Abajo de todo est\xE1 _motor_probar(), que corre los tests (las funciones\n# test_...) y anota cada assert: qu\xE9 se esperaba y qu\xE9 dio.\n\nimport ast\nimport io\nimport json\nimport sys\nimport types\nimport builtins\nfrom contextlib import redirect_stdout\n\n_ARCHIVO = "<programa>"\n# Las funciones (no los cuerpos de las clases ni los <genexpr>) tienen esta\n# marca en su c\xF3digo: son las que van a la pila de llamadas.\n_CO_OPTIMIZADO = 0x1\n\n\nclass _Tope(Exception):\n    pass\n\n\nclass _SinEntrada(Exception):\n    pass\n\n\nclass _Describir:\n    """Escribe valores para la escena, y les pone n\xFAmero a los que se comparten.\n\n    Los n\xFAmeros van en orden de aparici\xF3n (1, 2, 3...) y no son el id() de\n    Python: el id cambia de una corrida a otra, y la animaci\xF3n tiene que salir\n    igual cada vez. Los objetos se guardan en `vivos` para que Python no los\n    borre y reuse su id con otro.\n    """\n\n    def __init__(self):\n        self.numeros = {}\n        self.vivos = []\n\n    def ref(self, valor):\n        clave = id(valor)\n        if clave not in self.numeros:\n            self.numeros[clave] = len(self.numeros) + 1\n            self.vivos.append(valor)\n        return self.numeros[clave]\n\n    @staticmethod\n    def es_objeto(valor):\n        """Un objeto de una clase del programa (no un int, una lista, etc.)."""\n        return type(valor).__module__ == "__main__" and hasattr(valor, "__dict__") and not isinstance(valor, type)\n\n    def texto(self, valor, profundidad=0):\n        """C\xF3mo se escribe un valor, sin direcciones de memoria (que cambian\n        en cada corrida): un objeto sin __repr__ propio se escribe Clase #n."""\n        if self.es_objeto(valor):\n            if type(valor).__repr__ is not object.__repr__:\n                return repr(valor)\n            return f"{type(valor).__name__} #{self.ref(valor)}"\n        if profundidad > 3:\n            return "\u2026"\n        if isinstance(valor, list):\n            return "[" + ", ".join(self.texto(x, profundidad + 1) for x in valor) + "]"\n        if isinstance(valor, tuple):\n            interior = ", ".join(self.texto(x, profundidad + 1) for x in valor)\n            return f"({interior},)" if len(valor) == 1 else f"({interior})"\n        if isinstance(valor, dict):\n            return "{" + ", ".join(f"{self.texto(k, profundidad + 1)}: {self.texto(v, profundidad + 1)}" for k, v in valor.items()) + "}"\n        if isinstance(valor, set):\n            return "{" + ", ".join(sorted(self.texto(x, profundidad + 1) for x in valor)) + "}" if valor else "set()"\n        return repr(valor)\n\n    def describir(self, valor):\n        d = {"tipo": type(valor).__name__, "repr": self.texto(valor)}\n        if isinstance(valor, (list, tuple)):\n            d["items"] = [self.texto(x) for x in valor]\n        elif isinstance(valor, dict):\n            d["pares"] = [[self.texto(k), self.texto(v)] for k, v in valor.items()]\n        elif self.es_objeto(valor):\n            d["atributos"] = [[k, self.texto(v)] for k, v in vars(valor).items() if not k.startswith("__")]\n        if isinstance(valor, (list, dict, set)) or self.es_objeto(valor):\n            d["ref"] = self.ref(valor)\n        return d\n\n    def variables(self, espacio):\n        """Las variables del programa, sin lo que pone Python por su cuenta."""\n        return {\n            nombre: self.describir(valor)\n            for nombre, valor in list(espacio.items())\n            if not nombre.startswith("__")\n            and not isinstance(valor, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type))\n        }\n\n\ndef _es_del_programa(codigo):\n    return codigo.co_filename == _ARCHIVO\n\n\ndef _es_funcion(codigo):\n    return _es_del_programa(codigo) and bool(codigo.co_flags & _CO_OPTIMIZADO) and not codigo.co_name.startswith("<")\n\n\n# M\xE1s llamadas que estas no entran en la pantalla, y una recursi\xF3n sin caso\n# base llegar\xEDa a cientos: la traza pesar\xEDa megas (y en el navegador, con\n# Pyodide, se notar\xEDa). Se guardan las \xFAltimas, con un aviso de cu\xE1ntas faltan.\n_MAX_MARCOS = 10\n\n\ndef _pila(frame, d):\n    """Las funciones que se est\xE1n ejecutando, de la de m\xE1s afuera a la actual."""\n    funciones = []\n    while frame is not None:\n        if _es_funcion(frame.f_code):\n            funciones.append(frame)\n        frame = frame.f_back\n    ocultas = max(len(funciones) - _MAX_MARCOS, 0)\n    marcos = [{"funcion": f.f_code.co_name, "linea": f.f_lineno, "variables": d.variables(f.f_locals)}\n              for f in reversed(funciones[:_MAX_MARCOS])]\n    if ocultas:\n        marcos.insert(0, {"funcion": f"\u2026 y {ocultas} llamadas m\xE1s", "linea": 0, "variables": {}})\n    return marcos\n\n\ndef _motor_trazar(codigo, max_pasos=400, entradas=()):\n    """Devuelve la traza como texto JSON: {"codigo", "lenguaje", "traza"}.\n\n    `entradas` son las respuestas para input(), en orden: un programa que\n    pregunta algo no puede quedarse esperando a que alguien escriba.\n    """\n    pasos = []\n    salida = io.StringIO()\n    espacio = {"__name__": "__main__"}\n    pendientes = list(entradas)\n    d = _Describir()\n\n    def entrada(mensaje=""):\n        # Como en la consola: se ve la pregunta y lo que "escribi\xF3" el usuario.\n        salida.write(str(mensaje))\n        if not pendientes:\n            raise _SinEntrada()\n        valor = str(pendientes.pop(0))\n        salida.write(valor + "\\n")\n        return valor\n\n    def anotar(frame, **extra):\n        if len(pasos) >= max_pasos:\n            raise _Tope()\n        paso = {"linea": frame.f_lineno, "variables": d.variables(espacio), "salida": salida.getvalue()}\n        pila = _pila(frame, d)\n        if pila:\n            paso["pila"] = pila\n        paso.update(extra)\n        pasos.append(paso)\n\n    def local(frame, evento, arg):\n        if evento == "line":\n            anotar(frame)\n        elif evento == "return" and _es_funcion(frame.f_code):\n            # La funci\xF3n termina: se anota qu\xE9 devuelve, mientras todav\xEDa est\xE1 en la pila.\n            anotar(frame, retorno={"funcion": frame.f_code.co_name, "valor": d.texto(arg)})\n        return local\n\n    def global_(frame, evento, arg):\n        codigo_frame = frame.f_code\n        if _es_del_programa(codigo_frame) and (codigo_frame.co_name == "<module>" or _es_funcion(codigo_frame)):\n            return local\n        return None\n\n    def cortar(tipo, mensaje):\n        ultimo = pasos[-1] if pasos else {"linea": 0}\n        paso = {"linea": ultimo["linea"], "variables": d.variables(espacio), "salida": salida.getvalue(),\n                "excepcion": {"tipo": tipo, "mensaje": mensaje}}\n        if ultimo.get("pila"):\n            paso["pila"] = ultimo["pila"]\n        pasos.append(paso)\n\n    try:\n        compilado = compile(codigo, _ARCHIVO, "exec")\n    except SyntaxError as e:\n        return json.dumps({"codigo": codigo, "lenguaje": "python", "traza": [{\n            "linea": e.lineno or 1, "variables": {}, "salida": "",\n            "excepcion": {"tipo": "SyntaxError", "mensaje": e.msg},\n        }]}, ensure_ascii=False)\n\n    input_original = builtins.input\n    builtins.input = entrada\n    try:\n        with redirect_stdout(salida):\n            sys.settrace(global_)\n            try:\n                exec(compilado, espacio)\n            finally:\n                sys.settrace(None)\n        pasos.append({"linea": 0, "variables": d.variables(espacio), "salida": salida.getvalue()})\n    except _Tope:\n        # Si la pila estaba llena, no era un bucle: era una funci\xF3n llam\xE1ndose sin parar.\n        recursiva = bool(pasos) and len(pasos[-1].get("pila", [])) > _MAX_MARCOS\n        motivo = "la funci\xF3n se llama a s\xED misma sin parar: \xBFfalta el caso base?" if recursiva else "\xBFun bucle que no termina?"\n        cortar("Corte", f"m\xE1s de {max_pasos} pasos: {motivo}")\n    except _SinEntrada:\n        cortar("Falta una entrada", "el programa pidi\xF3 un input() m\xE1s de los que se cargaron")\n    except RecursionError:\n        cortar("RecursionError", "la funci\xF3n se llama a s\xED misma sin parar: \xBFfalta el caso base?")\n    except Exception as e:\n        cortar(type(e).__name__, repr(e.args[0]) if isinstance(e, KeyError) and e.args else str(e))\n    finally:\n        builtins.input = input_original\n    return json.dumps({"codigo": codigo, "lenguaje": "python", "traza": pasos}, ensure_ascii=False)\n\n\n# ---------------------------------------------------------------------------\n# Los tests\n# ---------------------------------------------------------------------------\n\nclass _Asserts(ast.NodeTransformer):\n    """Cambia cada `assert A == B` por una llamada que anota A y B por separado.\n\n    As\xED, cuando falla, se puede decir "esperaba 75 y dio 0", que es lo que\n    hace falta para encontrar el error (un AssertionError pelado no dice nada).\n    """\n\n    def visit_Assert(self, nodo):\n        prueba = nodo.test\n        texto = ast.unparse(prueba)\n        if isinstance(prueba, ast.Compare) and len(prueba.ops) == 1 and isinstance(prueba.ops[0], ast.Eq):\n            izq, der = prueba.left, prueba.comparators[0]\n        else:\n            izq, der = prueba, ast.Constant(True)\n        llamada = ast.Call(\n            func=ast.Name("__motor_assert", ast.Load()),\n            args=[\n                ast.Lambda(ast.arguments([], [], None, [], [], None, []), izq),\n                ast.Lambda(ast.arguments([], [], None, [], [], None, []), der),\n                ast.Constant(texto),\n                ast.Constant(nodo.lineno),\n            ],\n            keywords=[],\n        )\n        return ast.copy_location(ast.Expr(llamada), nodo)\n\n\nclass _FallaAssert(Exception):\n    pass\n\n\ndef _motor_probar(codigo):\n    """Corre el programa y despu\xE9s cada funci\xF3n test_..., en orden.\n\n    Devuelve JSON: {"codigo", "tests": [{"nombre", "linea", "estado", "asserts": [...], "error"}]}.\n    estado es "pasa", "falla" (un assert no se cumpli\xF3) o "error" (se rompi\xF3 otra cosa).\n    """\n    try:\n        arbol = ast.fix_missing_locations(_Asserts().visit(ast.parse(codigo)))\n        compilado = compile(arbol, _ARCHIVO, "exec")\n    except SyntaxError as e:\n        return json.dumps({"codigo": codigo, "tests": [], "error": f"SyntaxError en la l\xEDnea {e.lineno}: {e.msg}"}, ensure_ascii=False)\n\n    d = _Describir()\n    anotados = []\n\n    def assert_(izq, der, texto, linea):\n        obtenido = izq()\n        esperado = der()\n        ok = obtenido == esperado\n        anotados.append({"linea": linea, "texto": texto, "obtenido": d.texto(obtenido), "esperado": d.texto(esperado), "ok": ok})\n        if not ok:\n            raise _FallaAssert()\n\n    espacio = {"__name__": "__main__", "__motor_assert": assert_}\n    salida = io.StringIO()\n    resultado = {"codigo": codigo, "tests": []}\n    with redirect_stdout(salida):\n        try:\n            exec(compilado, espacio)\n        except Exception as e:\n            resultado["error"] = f"{type(e).__name__}: {e}"\n            return json.dumps(resultado, ensure_ascii=False)\n        nombres = [n for n, v in espacio.items() if n.startswith("test_") and isinstance(v, types.FunctionType)]\n        for nombre in nombres:\n            funcion = espacio[nombre]\n            anotados.clear()\n            test = {"nombre": nombre, "linea": funcion.__code__.co_firstlineno, "estado": "pasa"}\n            try:\n                funcion()\n            except _FallaAssert:\n                test["estado"] = "falla"\n            except Exception as e:\n                test["estado"] = "error"\n                test["error"] = f"{type(e).__name__}: {e}"\n            test["asserts"] = list(anotados)\n            resultado["tests"].append(test)\n    return json.dumps(resultado, ensure_ascii=False)\n';

// src/pedagogico/trazador.js
function trazarConPyodide(pyodide, codigo2, opciones = {}) {
  const { maxPasos = 400, entradas = [] } = opciones;
  pyodide.runPython(TRAZADOR_PY);
  const trazar = pyodide.globals.get("_motor_trazar");
  try {
    return JSON.parse(trazar(codigo2, maxPasos, entradas));
  } finally {
    trazar.destroy?.();
  }
}
function probarConPyodide(pyodide, codigo2) {
  pyodide.runPython(TRAZADOR_PY);
  const probar = pyodide.globals.get("_motor_probar");
  try {
    return JSON.parse(probar(codigo2));
  } finally {
    probar.destroy?.();
  }
}

// src/pedagogico/consulta.js
var PATRON = /^\s*SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?\s*;?\s*$/is;
function ejecutarConsulta(sql, t) {
  const m = sql.replace(/\s+/g, " ").match(PATRON);
  if (!m) throw new Error("No entiendo esa consulta. Uso SELECT ... FROM ... [WHERE ...] [ORDER BY ...] [LIMIT n].");
  const [, columnasTexto, nombreTabla, dondeTexto, ordenCol, ordenDir, limite] = m;
  if (nombreTabla.toLowerCase() !== t.nombre.toLowerCase()) {
    throw new Error(`La consulta lee de "${nombreTabla}", pero la tabla se llama "${t.nombre}".`);
  }
  const indice = (col) => {
    const i = t.columnas.findIndex((c) => c.toLowerCase() === col.toLowerCase());
    if (i === -1) throw new Error(`La tabla ${t.nombre} no tiene la columna "${col}". Tiene: ${t.columnas.join(", ")}.`);
    return i;
  };
  const seleccion = columnasTexto.trim() === "*" ? [...t.columnas] : columnasTexto.split(",").map((c) => t.columnas[indice(c.trim())]);
  const condicion = dondeTexto ? condicionDesde(dondeTexto, indice) : null;
  const recorrido = t.filas.map((fila2) => ({ fila: fila2, cumple: condicion ? condicion(fila2) : true }));
  let resultado = recorrido.filter((r3) => r3.cumple).map((r3) => r3.fila);
  const filtradas = resultado;
  const conColumnas = resultado.map((f) => seleccion.map((c) => f[indice(c)]));
  let ordenadas = conColumnas;
  if (ordenCol) {
    const i = seleccion.findIndex((c) => c.toLowerCase() === ordenCol.toLowerCase());
    if (i === -1) throw new Error(`Para ordenar por "${ordenCol}", esa columna tiene que estar en el SELECT.`);
    const signo = (ordenDir ?? "ASC").toUpperCase() === "DESC" ? -1 : 1;
    const conPosicion = conColumnas.map((f, k) => [f, k]);
    ordenadas = conPosicion.sort((a, b) => comparar(a[0][i], b[0][i]) * signo || a[1] - b[1]).map(([f]) => f);
  }
  resultado = limite ? ordenadas.slice(0, Number(limite)) : ordenadas;
  return {
    seleccion,
    donde: dondeTexto?.trim() ?? "",
    orden: ordenCol ? { columna: ordenCol, descendente: (ordenDir ?? "").toUpperCase() === "DESC" } : null,
    limite: limite ? Number(limite) : null,
    recorrido,
    filtradas,
    conColumnas,
    ordenadas,
    resultado
  };
}
function comparar(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es");
}
function condicionDesde(textoDonde, indice) {
  const alternativas = textoDonde.split(/\s+OR\s+/i).map((parte) => parte.split(/\s+AND\s+/i).map((c) => comparacion(c, indice)));
  return (fila2) => alternativas.some((todas) => todas.every((f) => f(fila2)));
}
function comparacion(textoComparacion, indice) {
  const m = textoComparacion.trim().match(/^(\w+)\s*(<=|>=|<>|!=|=|<|>)\s*('(?:[^']|'')*'|-?\d+(?:\.\d+)?)$/);
  if (!m) throw new Error(`No entiendo la condici\xF3n "${textoComparacion.trim()}". Uso columna, un operador (= != < <= > >=) y un n\xFAmero o un 'texto'.`);
  const [, col, op, crudo] = m;
  const i = indice(col);
  const valor = crudo.startsWith("'") ? crudo.slice(1, -1).replace(/''/g, "'") : Number(crudo);
  const ops = {
    "=": (a, b) => a === b,
    "!=": (a, b) => a !== b,
    "<>": (a, b) => a !== b,
    "<": (a, b) => comparar(a, b) < 0,
    "<=": (a, b) => comparar(a, b) <= 0,
    ">": (a, b) => comparar(a, b) > 0,
    ">=": (a, b) => comparar(a, b) >= 0
  };
  return (fila2) => ops[op](fila2[i], valor);
}
var celda = (v) => String(v);
function desdeConsulta(opciones) {
  const { tabla: t, titulo = "", descripcion = "", archivo = "consulta.sql", ritmo = 0.9, lectura = 13, preguntas = {} } = opciones;
  const sql = String(opciones.sql).trim().replace(/\s+(FROM|WHERE|ORDER BY|LIMIT)\s+/gi, (_, p) => `
${p.toUpperCase()} `).replace(/^select\s+/i, "SELECT ");
  const r3 = ejecutarConsulta(sql, t);
  const lineas = sql.split("\n");
  const lineaDe = (palabra) => lineas.findIndex((l) => l.toUpperCase().startsWith(palabra)) + 1;
  return function(disposicion) {
    const angosta = disposicion.nombre === "angosta";
    const W = angosta ? 640 : 1600;
    const H = angosta ? 1140 : 900;
    const arriba = titulo ? 100 : 30;
    const cod = angosta ? { x: 320, ancho: 610, tamano: 22 } : { x: 430, ancho: 800, tamano: 32 };
    const necesario = Math.max(...lineas.map((l) => l.length));
    cod.tamano = Math.min(cod.tamano, cod.tamano * caracteresPorLinea(cod) / necesario);
    const piezaCodigo = codigo({ x: cod.x, y: 0, ancho: cod.ancho, tamano: cod.tamano, codigo: sql, lenguaje: "sql", titulo: archivo, marca: 0 });
    const altoCodigo = piezaCodigo.tipo.tamano(piezaCodigo.props).alto;
    piezaCodigo.props.y = arriba + altoCodigo / 2;
    const n2 = t.filas.length;
    const altoFila = angosta ? Math.min(36, 230 / (n2 + 1)) : Math.min(54, 400 / (n2 + 1));
    const tamTabla = angosta ? 18 : 27;
    const origen = angosta ? { x: 320, y: arriba + altoCodigo + 50, ancho: 610 } : { x: 430, y: arriba + altoCodigo + 60, ancho: 800 };
    const destino = angosta ? { x: 320, y: origen.y + (n2 + 1) * altoFila + 60, ancho: 610 } : { x: 1210, y: arriba + 40, ancho: 680 };
    const piezas = {};
    if (titulo) piezas.titulo = texto2({ x: W / 2, y: angosta ? 50 : 52, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
    piezas.codigo = piezaCodigo;
    piezas.rotuloOrigen = texto2({ x: origen.x - origen.ancho / 2, y: origen.y - 6, texto: `Tabla ${t.nombre}`, tamano: tamTabla, peso: 700, alineacion: "inicio", color: "suave", opacidad: 0 });
    piezas.origen = tabla({
      x: origen.x,
      y: origen.y + 14,
      ancho: origen.ancho,
      altoFila,
      tamano: tamTabla,
      anclaje: "arriba",
      columnas: t.columnas,
      filas: t.filas.map((f) => f.map(celda)),
      opacidad: 0
    });
    piezas.rotuloDestino = texto2({ x: destino.x - destino.ancho / 2, y: destino.y - 6, texto: "Resultado", tamano: tamTabla, peso: 700, alineacion: "inicio", color: "suave", opacidad: 0 });
    piezas.destino = tabla({
      // Anclada arriba: va creciendo fila por fila, y el encabezado no tiene que saltar.
      x: destino.x,
      y: destino.y + 14,
      ancho: destino.ancho,
      altoFila,
      tamano: tamTabla,
      anclaje: "arriba",
      columnas: t.columnas,
      filas: [],
      filasVisibles: 0,
      encabezado: "exito",
      opacidad: 0
    });
    const linea = [];
    let tiempo = 0.3;
    const decir = (subtitulo, extra = 0.4) => {
      const dur = Math.max(ritmo * 2, duracionLectura(subtitulo, lectura));
      linea.push({ subtitulo, en: tiempo, dur });
      tiempo += dur + extra;
    };
    const marcar = (n3, en = tiempo) => linea.push({ pieza: "codigo", a: { linea: n3, marca: 1 }, dur: 0.35, en });
    const preguntar = (clave) => {
      const p = preguntas[clave];
      if (!p) return "";
      const enunciado = `${p.pregunta} Paus\xE1 y pensalo.`;
      const dur = Math.max(p.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
      linea.push({ marca: "pregunta", datos: p, en: tiempo, dur }, { subtitulo: enunciado, en: tiempo, dur });
      tiempo += dur + 0.2;
      return p.opciones && p.correcta !== void 0 ? `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ?? ""} ` : "";
    };
    linea.push({ capitulo: "Se escribe en un orden...", en: 0 });
    decir("SQL se escribe empezando por SELECT, pero la base lo ejecuta en otro orden. Mir\xE1 qu\xE9 parte se ilumina en cada momento.");
    linea.push({ capitulo: `FROM ${t.nombre}`, en: tiempo });
    marcar(lineaDe("FROM"));
    linea.push({ pieza: ["rotuloOrigen", "origen"], a: { opacidad: 1 }, dur: 0.5, en: tiempo });
    decir(`Primero FROM: la consulta toma la tabla ${t.nombre}, con sus ${n2} filas.`);
    if (r3.donde) {
      const respuesta = preguntar("donde");
      linea.push({ capitulo: `WHERE ${r3.donde}`, en: tiempo });
      marcar(lineaDe("WHERE"));
      linea.push({ pieza: "origen", a: { columnas: [...t.columnas, "\xBFcumple?"], filas: t.filas.map((f) => [...f.map(celda), ""]) }, dur: 0, en: tiempo });
      linea.push({ pieza: ["rotuloDestino", "destino"], a: { opacidad: 1 }, dur: 0.5, en: tiempo });
      decir(`${respuesta}Despu\xE9s WHERE ${r3.donde}: revisa fila por fila, y se queda solo con las que cumplen.`, 0);
      const marcas = t.filas.map((f) => [...f.map(celda), ""]);
      const elegidas = [];
      r3.recorrido.forEach(({ fila: fila2, cumple }, i) => {
        marcas[i] = [...fila2.map(celda), cumple ? "\u2713 s\xED" : "\u2717 no"];
        linea.push({ pieza: "origen", a: { resaltarFila: i, filas: marcas.map((x) => [...x]) }, dur: 0, en: tiempo });
        if (cumple) {
          elegidas.push(fila2.map(celda));
          linea.push({ pieza: "destino", a: { filas: elegidas.map((x) => [...x]), filasVisibles: elegidas.length - 1 }, dur: 0, en: tiempo });
          linea.push({ pieza: "destino", a: { filasVisibles: elegidas.length }, dur: 0.45, en: tiempo + 0.1 });
        }
        tiempo += ritmo;
      });
      linea.push({ pieza: "origen", a: { resaltarFila: -1 }, dur: 0, en: tiempo });
      decir(`Cumplen ${r3.filtradas.length} de ${n2}.`);
    } else {
      linea.push({ pieza: ["rotuloDestino", "destino"], a: { opacidad: 1 }, dur: 0.5, en: tiempo });
      linea.push({ pieza: "destino", a: { filas: t.filas.map((f) => f.map(celda)), filasVisibles: n2 }, dur: 0.8, en: tiempo });
      tiempo += 1;
    }
    const respuestaSeleccion = preguntar("seleccion");
    linea.push({ capitulo: `SELECT ${r3.seleccion.join(", ")}`, en: tiempo });
    marcar(lineaDe("SELECT"));
    linea.push({ pieza: "destino", a: { columnas: r3.seleccion, filas: r3.conColumnas.map((f) => f.map(celda)), filasVisibles: r3.conColumnas.length }, dur: 0, en: tiempo + 0.5 });
    decir(`${respuestaSeleccion}Reci\xE9n ahora SELECT: de cada fila quedan solo las columnas pedidas, ${r3.seleccion.join(" y ")}.`);
    if (r3.orden) {
      const respuestaOrden = preguntar("orden");
      linea.push({ capitulo: `ORDER BY ${r3.orden.columna}`, en: tiempo });
      marcar(lineaDe("ORDER BY"));
      linea.push({ pieza: "destino", a: { filas: r3.ordenadas.map((f) => f.map(celda)) }, dur: 0, en: tiempo + 0.6 });
      decir(`${respuestaOrden}ORDER BY ${r3.orden.columna}${r3.orden.descendente ? " DESC" : ""}: ordena el resultado ${r3.orden.descendente ? "de mayor a menor" : "de menor a mayor"}.`);
    }
    if (r3.limite !== null) {
      linea.push({ capitulo: `LIMIT ${r3.limite}`, en: tiempo });
      marcar(lineaDe("LIMIT"));
      linea.push({ pieza: "destino", a: { filas: r3.resultado.map((f) => f.map(celda)), filasVisibles: r3.resultado.length }, dur: 0, en: tiempo + 0.6 });
      decir(`Y LIMIT ${r3.limite}: se queda con las primeras ${r3.limite}.`);
    }
    linea.push({ pieza: "codigo", a: { marca: 0 }, dur: 0.4, en: tiempo });
    decir(`Listo: el resultado tiene ${r3.resultado.length} ${r3.resultado.length === 1 ? "fila" : "filas"}.`);
    return {
      titulo: titulo || "Una consulta, paso a paso",
      descripcion: descripcion || `La consulta ${sql.replace(/\n/g, " ")} sobre la tabla ${t.nombre}, en el orden en que la ejecuta la base.`,
      ancho: W,
      alto: H,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea
    };
  };
}

// src/pedagogico/tests-animados.js
var ICONO = { espera: "\u23F3", corre: "\u25B6", pasa: "\u2705", falla: "\u274C", error: "\u{1F4A5}" };
var COLOR = { espera: "borde", corre: "acento", pasa: "exito", falla: "error", error: "error" };
function desdeTests(opciones) {
  const { titulo = "", descripcion = "", archivo = "test_programa.py", ritmo = 1.1, lectura = 13, preguntas = {} } = opciones;
  if (!opciones.corridas?.length) throw new Error("desdeTests necesita al menos una corrida: { codigo, resultado }.");
  const corridas = opciones.corridas.map((c) => ({ ...c, resultado: c.resultado ?? { tests: c.tests ?? [] } }));
  const maxTests = Math.max(...corridas.map((c) => c.resultado.tests.length));
  return function(disposicion) {
    const angosta = disposicion.nombre === "angosta";
    const W = angosta ? 640 : 1600;
    const H = angosta ? 1140 : 900;
    const arriba = titulo ? 100 : 30;
    const programas = corridas.map((c) => c.codigo.replace(/\s+$/, ""));
    const maxLineas = Math.max(...programas.map((p) => p.split("\n").length));
    const necesario = Math.max(...programas.flatMap((p) => p.split("\n").map((l) => l.length)));
    const cod = angosta ? { x: 320, ancho: 610, tamano: 20 } : { x: 450, ancho: 840, tamano: 30 };
    cod.tamano = Math.min(cod.tamano, cod.tamano * caracteresPorLinea(cod) / necesario);
    const disponible = angosta ? H * 0.45 : H - arriba - 40;
    cod.tamano = Math.min(cod.tamano, disponible / (maxLineas * 1.6 + 2.6));
    const piezaCodigo = codigo({ x: cod.x, y: 0, ancho: cod.ancho, tamano: cod.tamano, codigo: programas[0], titulo: archivo, marca: 0 });
    const altoCodigo = piezaCodigo.tipo.tamano(piezaCodigo.props).alto;
    piezaCodigo.props.y = arriba + altoCodigo / 2;
    const col = angosta ? { x: 320, ancho: 600, y: arriba + altoCodigo + 40, alto: 52, tamano: 22 } : { x: 1250, ancho: 560, y: arriba + 40, alto: 64, tamano: 27 };
    const piezas = {};
    if (titulo) piezas.titulo = texto2({ x: W / 2, y: angosta ? 50 : 52, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
    piezas.codigo = piezaCodigo;
    piezas.rotulo = texto2({ x: col.x - col.ancho / 2, y: col.y - 4, texto: "pytest", tamano: col.tamano * 0.85, peso: 700, alineacion: "inicio", color: "suave", fuente: "mono", opacidad: 0 });
    for (let i = 0; i < maxTests; i++) {
      piezas["test" + i] = caja({
        x: col.x,
        y: col.y + 20 + col.alto / 2 + i * (col.alto + 12),
        ancho: col.ancho,
        alto: col.alto,
        radio: 10,
        texto: "",
        tamano: col.tamano,
        peso: 600,
        borde: "borde",
        grosorBorde: 3,
        opacidad: 0
      });
    }
    const yDetalle = col.y + 20 + maxTests * (col.alto + 12) + (angosta ? 60 : 90);
    piezas.detalle = caja({
      x: col.x,
      y: yDetalle,
      ancho: col.ancho,
      alto: angosta ? 120 : 170,
      radio: 10,
      texto: "",
      tamano: col.tamano,
      peso: 500,
      borde: "borde",
      opacidad: 0
    });
    piezas.resumen = texto2({
      x: col.x,
      y: yDetalle + (angosta ? 100 : 140),
      texto: "",
      tamano: col.tamano * 1.15,
      peso: 800,
      color: "exito",
      opacidad: 0,
      anchoMax: col.ancho
    });
    const linea = [];
    let t = 0.3;
    const decir = (subtitulo, extra = 0.3) => {
      const dur = Math.max(ritmo * 1.6, duracionLectura(subtitulo, lectura));
      linea.push({ subtitulo, en: t, dur });
      t += dur + extra;
    };
    const ponerTest = (i, estado, nombre) => {
      linea.push({ pieza: "test" + i, a: { texto: `${ICONO[estado]}  ${nombre}`, borde: COLOR[estado], color: estado === "espera" ? "suave" : "texto" }, dur: 0, en: t });
      linea.push({ pieza: "test" + i, a: { resaltado: estado === "corre" ? 1 : 0 }, dur: 0.25, en: t });
    };
    corridas.forEach((corrida, c) => {
      const tests = corrida.resultado.tests;
      linea.push({ capitulo: corrida.titulo ?? (c === 0 ? "Corren los tests" : `Otra vez, ${c + 1}`), en: t });
      if (c > 0) {
        linea.push({ pieza: "codigo", a: { codigo: programas[c], marca: 0, colorMarca: "acento" }, dur: 0, en: t });
        linea.push({ pieza: ["detalle", "resumen"], a: { opacidad: 0 }, dur: 0.3, en: t });
        if (corrida.explicacion) decir(corrida.explicacion);
      }
      tests.forEach((test, i) => ponerTest(i, "espera", test.nombre));
      for (let i = tests.length; i < maxTests; i++) linea.push({ pieza: "test" + i, a: { opacidad: 0 }, dur: 0, en: t });
      linea.push({ pieza: ["rotulo", ...tests.map((_, i) => "test" + i)], a: { opacidad: 1 }, dur: 0.4, en: t });
      if (c === 0) decir("pytest busca las funciones que empiezan con test_, y las corre una por una.");
      else decir("Se vuelven a correr todos los tests, no solo el que fallaba.");
      tests.forEach((test, i) => {
        ponerTest(i, "corre", test.nombre);
        linea.push({ pieza: "codigo", a: { linea: test.linea, marca: 1, colorMarca: "acento" }, dur: 0.35, en: t });
        t += ritmo * 0.6;
        const p = preguntas[`${c}.${test.nombre}`];
        let respuesta = "";
        if (p) {
          const enunciado = `${p.pregunta} Paus\xE1 y pensalo.`;
          const dur = Math.max(p.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
          linea.push({ marca: "pregunta", datos: p, en: t, dur }, { subtitulo: enunciado, en: t, dur });
          t += dur + 0.2;
          if (p.opciones && p.correcta !== void 0) respuesta = `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ?? ""} `;
        }
        for (const a of test.asserts) {
          linea.push({ pieza: "codigo", a: { linea: a.linea, colorMarca: a.ok ? "acento" : "error" }, dur: 0.3, en: t });
          const llamada = a.texto.split(" == ")[0];
          linea.push({
            pieza: "detalle",
            a: {
              texto: a.ok ? `assert ${a.texto}
\u2713 dio ${a.obtenido}` : `assert ${a.texto}
\u2717 esperaba ${a.esperado}, y dio ${a.obtenido}`,
              borde: a.ok ? "exito" : "error",
              color: a.ok ? "texto" : "error",
              opacidad: 1
            },
            dur: 0,
            en: t + 0.4
          });
          decir(a.ok ? `${respuesta}${llamada} da ${a.obtenido}, como se esperaba.` : `${respuesta}${llamada} dio ${a.obtenido}, y se esperaba ${a.esperado}: el test falla.`);
          respuesta = "";
        }
        if (test.estado === "error") {
          linea.push({ pieza: "detalle", a: { texto: `\u{1F4A5} ${test.error}`, borde: "error", color: "error", opacidad: 1 }, dur: 0, en: t });
          decir(`El test se rompi\xF3 antes de terminar: ${test.error}.`);
        }
        ponerTest(i, test.estado, test.nombre);
        t += ritmo * 0.4;
      });
      const fallan = tests.filter((x) => x.estado !== "pasa").length;
      const pasan = tests.length - fallan;
      const resumen = fallan ? `${fallan} ${fallan === 1 ? "falla" : "fallan"}, ${pasan} ${pasan === 1 ? "pasa" : "pasan"}` : `${pasan} de ${tests.length}: todos pasan`;
      linea.push({ pieza: "codigo", a: { marca: 0 }, dur: 0.3, en: t });
      linea.push({ pieza: "resumen", a: { texto: resumen, color: fallan ? "error" : "exito", opacidad: 1 }, dur: 0.4, en: t });
      decir(fallan ? `Resultado: ${resumen}. Un test que falla no es una mala noticia: encontr\xF3 un error antes que los usuarios.` : `Resultado: ${resumen}. Ahora el c\xF3digo hace lo que los tests dicen que tiene que hacer.`);
    });
    return {
      titulo: titulo || "Tests, paso a paso",
      descripcion: descripcion || "Los tests de un programa, corriendo uno por uno: qu\xE9 se esperaba, qu\xE9 dio, y cu\xE1les pasan.",
      ancho: W,
      alto: H,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea
    };
  };
}

// src/pedagogico/narrar.js
function crearNarrador(opciones = {}) {
  const ritmo = opciones.ritmo ?? 1;
  const lectura = opciones.lectura ?? 13;
  const preguntas = opciones.preguntas ?? {};
  const linea = [];
  let respuestaPendiente = "";
  const n2 = {
    linea,
    tiempo: opciones.inicio ?? 0.3,
    ritmo,
    lectura,
    /** Agrega una animación (o varias) que arranca ahora, o `demora` segundos después. */
    animar(item, demora = 0) {
      for (const i of [item].flat()) linea.push({ en: n2.tiempo + demora, ...i });
      return n2;
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
      linea.push({ subtitulo, en: n2.tiempo, dur });
      n2.tiempo += dur + extra;
      return dur;
    },
    /** Deja pasar un rato sin decir nada (para mirar algo que se mueve). */
    esperar(segundos) {
      n2.tiempo += segundos * ritmo;
    },
    capitulo(nombre) {
      linea.push({ capitulo: nombre, en: n2.tiempo });
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
      linea.push({ marca: "pregunta", datos: p, en: n2.tiempo, dur }, { subtitulo: enunciado, en: n2.tiempo, dur });
      n2.tiempo += dur + 0.2;
      respuestaPendiente = p.opciones && p.correcta !== void 0 ? `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ? `${p.explicacion} ` : ""}` : "";
      return true;
    }
  };
  return n2;
}

// src/index.js
var version = "0.9.0";
definirComponente();
definirLeccion();
export {
  COLORES_CODIGO,
  COMUNES,
  MotorEscena,
  MotorLeccion,
  PANTALLA,
  Reloj,
  TEMAS,
  TOKENS,
  TRAZADOR_PY,
  aCoordenadasDe,
  aCss,
  azar,
  caja,
  camara,
  caminoFlecha,
  caracteresPorLinea,
  celular,
  cilindro,
  codigo,
  compilar,
  consola,
  contador2 as contador,
  crearNarrador,
  crearPintor,
  curva,
  curvas,
  definirComponente,
  definirLeccion,
  definirPieza,
  desdeConsulta,
  desdeTests,
  desdeTraza,
  detectarPunteros,
  duracionLectura,
  ejecutarConsulta,
  el,
  espejo,
  explicarPaso,
  fila,
  flecha,
  formatearNumero,
  grafo,
  interpolar,
  limitar,
  lineaDeCodigo,
  lista,
  mezclarColores,
  partirLineas,
  pila,
  poner,
  posicionAbsoluta,
  probarConPyodide,
  registrar,
  renglones,
  revelar,
  tabla,
  texto2 as texto,
  tokenizar,
  trazarConPyodide,
  variable,
  version
};

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
  lineas.forEach((linea2, i) => {
    const tspan = (
      /** @type {Element} */
      nodoTexto.childNodes[i]
    );
    poner(tspan, { x, y: primero + i * alto });
    texto(tspan, linea2 === "" ? "\xA0" : linea2);
  });
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

// src/nucleo/interpolar.js
function limitar(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}

// src/mate/calculo.js
var H = 1e-5;
function derivada(f, x) {
  return (f(x + H) - f(x - H)) / (2 * H);
}
function gradiente(f, x, y) {
  return [(f(x + H, y) - f(x - H, y)) / (2 * H), (f(x, y + H) - f(x, y - H)) / (2 * H)];
}
function cocienteIncremental(f, x, h) {
  return (f(x + h) - f(x)) / h;
}
function descensoGradiente(f, opciones) {
  const pasos = opciones.pasos ?? 20;
  const grad = opciones.gradiente ?? ((x2, y2) => gradiente(f, x2, y2));
  const tolerancia = opciones.tolerancia ?? 1e-6;
  let [x, y] = opciones.inicio;
  const puntos = [{ x, y, z: f(x, y), gradiente: grad(x, y) }];
  let motivo = "pasos";
  for (let i = 0; i < pasos; i++) {
    const [gx, gy] = puntos[puntos.length - 1].gradiente;
    if (Math.hypot(gx, gy) < tolerancia) {
      motivo = "minimo";
      break;
    }
    x -= opciones.tasa * gx;
    y -= opciones.tasa * gy;
    const z = f(x, y);
    if (!Number.isFinite(z) || Math.abs(z) > 1e12) {
      motivo = "diverge";
      break;
    }
    puntos.push({ x, y, z, gradiente: grad(x, y) });
  }
  return { puntos, motivo };
}
function regresionLineal(datos) {
  const n = datos.length;
  if (n < 2) throw new Error("Para ajustar una recta hacen falta al menos dos puntos.");
  const mediaX = datos.reduce((s, [x]) => s + x, 0) / n;
  const mediaY = datos.reduce((s, [, y]) => s + y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of datos) {
    sxx += (x - mediaX) ** 2;
    syy += (y - mediaY) ** 2;
    sxy += (x - mediaX) * (y - mediaY);
  }
  if (sxx === 0) throw new Error("Todos los puntos tienen el mismo x: no hay una recta que los ajuste (ser\xEDa vertical).");
  const b1 = sxy / sxx;
  const b0 = mediaY - b1 * mediaX;
  const residuos = datos.map(([x, y]) => y - (b0 + b1 * x));
  const ssr = residuos.reduce((s, e) => s + e * e, 0);
  const r22 = syy === 0 ? 1 : 1 - ssr / syy;
  const r3 = syy === 0 ? 1 : sxy / Math.sqrt(sxx * syy);
  return { n, mediaX, mediaY, sxx, syy, sxy, b0, b1, residuos, ssr, r2: r22, r: r3, varianza: n > 2 ? ssr / (n - 2) : 0 };
}
function sumaResiduos(datos, b0, b1) {
  return datos.reduce((s, [x, y]) => s + (y - (b0 + b1 * x)) ** 2, 0);
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
function euclides(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error("El algoritmo de Euclides es para n\xFAmeros enteros.");
  if (a === 0 && b === 0) throw new Error("mcd(0, 0) no est\xE1 definido: cualquier n\xFAmero divide a 0.");
  let x = Math.abs(a);
  let y = Math.abs(b);
  if (y > x) [x, y] = [y, x];
  const pasos = [];
  while (y !== 0) {
    const q = Math.floor(x / y);
    const r3 = x - q * y;
    pasos.push({ a: x, b: y, q, r: r3 });
    [x, y] = [y, r3];
  }
  return { mcd: x, pasos };
}
function modulo(a, n) {
  return (a % n + n) % n;
}
function propiedadesRelacion(conjunto, pares) {
  const clave = (a, b) => JSON.stringify([a, b]);
  const R = new Set(pares.map(([a, b]) => clave(a, b)));
  for (const [a, b] of pares) {
    if (!conjunto.includes(a) || !conjunto.includes(b)) {
      throw new Error(`El par (${a}, ${b}) tiene un elemento que no est\xE1 en el conjunto.`);
    }
  }
  const esta = (a, b) => R.has(clave(a, b));
  const sinLazo = conjunto.find((a) => !esta(a, a));
  const reflexiva = { cumple: sinLazo === void 0, contraejemplo: sinLazo === void 0 ? null : [sinLazo, sinLazo] };
  const sinVuelta = pares.find(([a, b]) => !esta(b, a));
  const simetrica = { cumple: !sinVuelta, contraejemplo: sinVuelta ?? null };
  const ida = pares.find(([a, b]) => a !== b && esta(b, a));
  const antisimetrica = { cumple: !ida, contraejemplo: ida ?? null };
  let falla = null;
  for (const [a, b] of pares) {
    for (const [c, d] of pares) {
      if (b === c && !esta(a, d)) {
        falla = { pares: [[a, b], [c, d]], falta: [a, d] };
        break;
      }
    }
    if (falla) break;
  }
  const transitiva = { cumple: !falla, contraejemplo: falla };
  return { reflexiva, simetrica, antisimetrica, transitiva, equivalencia: reflexiva.cumple && simetrica.cumple && transitiva.cumple };
}
function matrizRelacion(conjunto, pares) {
  return conjunto.map((a) => conjunto.map((b) => pares.some(([x, y]) => x === a && y === b) ? 1 : 0));
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
var HALO = { "paint-order": "stroke", stroke: "var(--ma-superficie)", "stroke-width": 6, "stroke-linejoin": "round" };
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
      etiquetaX: el("text", { "text-anchor": "end", "font-style": "italic", "font-weight": 600, ...HALO }, grupo),
      etiquetaY: el("text", { "text-anchor": "start", "font-style": "italic", "font-weight": 600, ...HALO }, grupo),
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
      for (const x of marcasX) d += `M${r(a(x, 0).x)} ${r(m.arriba)}V${r(m.abajo)}`;
      for (const y of marcasY) d += `M${r(m.izq)} ${r(a(0, y).y)}H${r(m.der)}`;
    }
    poner(partes.grilla, { d, stroke: aCss(p.borde), opacity: 0.55 });
    const ejeY = limitar(a(0, 0).x, m.izq, m.der);
    const ejeX = limitar(a(0, 0).y, m.arriba, m.abajo);
    poner(partes.ejes, {
      d: `M${r(m.izq)} ${r(ejeX)}H${r(m.der)}M${r(ejeY)} ${r(m.arriba)}V${r(m.abajo)}`,
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
      el("text", { "dominant-baseline": "central", ...HALO, "stroke-width": 4 }, partes.numeros);
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
function r(v) {
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
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", ...HALO }, libre),
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
      const [x, y] = p.parametrica(t);
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
    const y = p.f(x);
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
      d += `M${r(l2.x)} ${r(l2.y)}`;
      nuevo = false;
      fin = q;
      continue;
    }
    const prev = px[i - 1];
    const tramo = Math.hypot(q.x - prev.x, q.y - prev.y);
    if (andado + tramo >= objetivo) {
      const t = tramo === 0 ? 0 : (objetivo - andado) / tramo;
      const l2 = lim({ x: prev.x + (q.x - prev.x) * t, y: prev.y + (q.y - prev.y) * t });
      d += `L${r(l2.x)} ${r(l2.y)}`;
      fin = l2;
      break;
    }
    andado += tramo;
    const l = lim(q);
    d += `L${r(l.x)} ${r(l.y)}`;
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
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", ...HALO }, libre)
    };
  },
  actualizar(partes, p, c) {
    const q = c.a(p.mx, p.my);
    const ejeY = limitar(c.a(0, 0).x, c.marco.izq, c.marco.der);
    const ejeX = limitar(c.a(0, 0).y, c.marco.arriba, c.marco.abajo);
    poner(partes.guias, {
      d: `M${r(q.x)} ${r(q.y)}V${r(ejeX)}M${r(q.x)} ${r(q.y)}H${r(ejeY)}`,
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
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", "text-anchor": "middle", ...HALO }, libre)
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
      d: `M${r(a.x)} ${r(a.y)}L${r(base.x + Math.cos(ang) * L * 0.3)} ${r(base.y + Math.sin(ang) * L * 0.3)}`,
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      visibility: visible ? null : "hidden"
    });
    const nx = -Math.sin(ang) * W;
    const ny = Math.cos(ang) * W;
    poner(partes.punta, {
      d: `M${r(b.x)} ${r(b.y)}L${r(base.x + nx)} ${r(base.y + ny)}L${r(base.x - nx)} ${r(base.y - ny)}Z`,
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
      etiqueta: el("text", { "font-weight": 700, "dominant-baseline": "central", "text-anchor": "end", ...HALO }, libre)
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
      d: `M${r(lim(a.x, c.marco.izq, c.marco.der))} ${r(lim(a.y, c.marco.arriba, c.marco.abajo))}L${r(lim(b.x, c.marco.izq, c.marco.der))} ${r(lim(b.y, c.marco.arriba, c.marco.abajo))}`,
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
      etiqueta: el("text", { "font-weight": 600, "dominant-baseline": "central", "text-anchor": "start", ...HALO }, libre)
    };
  },
  actualizar(partes, p, c) {
    const a = c.a(p.x1, p.y1);
    const b0 = c.a(p.x2, p.y2);
    const avance = limitar(p.progreso, 0, 1);
    const b = { x: a.x + (b0.x - a.x) * avance, y: a.y + (b0.y - a.y) * avance };
    poner(partes.linea, {
      d: `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`,
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
      etiqueta: el("text", { "font-weight": 700, "text-anchor": "middle", "dominant-baseline": "central", ...HALO }, libre)
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
        const q = c.a(x, lim(p.f(x)));
        return `${i ? "L" : "M"}${r(q.x)} ${r(q.y)}`;
      }).join("");
      abajo = xs.reverse().map((x) => {
        const q = c.a(x, lim(p.g ? p.g(x) : 0));
        return `L${r(q.x)} ${r(q.y)}`;
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
    const ym = p.etiquetaY ?? ((p.g ? p.g(xm) : 0) + p.f(xm)) / 2;
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
      el("text", { "font-weight": 600, "text-anchor": "middle", "dominant-baseline": "central", ...HALO, "stroke-width": 5 }, partes.rotulos);
    }
    curvas.forEach((curva2, i) => {
      const visible = limitar(p.progreso - i, 0, 1);
      const resaltada = i === p.resaltar;
      let d = "";
      for (const [x1, y1, x2, y2] of curva2.segmentos) {
        const a = c.a(x1, y1);
        const b = c.a(x2, y2);
        d += `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`;
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
      d += `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`;
      d += `M${r(b.x - ux * pl2 - uy * pl2 * 0.6)} ${r(b.y - uy * pl2 + ux * pl2 * 0.6)}L${r(b.x)} ${r(b.y)}L${r(b.x - ux * pl2 + uy * pl2 * 0.6)} ${r(b.y - uy * pl2 - ux * pl2 * 0.6)}`;
    }
    poner(partes.flechas, {
      d: d || "M0 0",
      stroke: aCss(p.color),
      "stroke-width": p.grosor,
      visibility: d ? null : "hidden"
    });
  }
});

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

// src/mate/estadistica.js
function normal(x, media = 0, desvio = 1) {
  const z = (x - media) / desvio;
  return Math.exp(-0.5 * z * z) / (desvio * Math.sqrt(2 * Math.PI));
}
function normalAcumulada(x, media = 0, desvio = 1) {
  const z = (x - media) / desvio;
  if (z < 0) return 0.5 * erfc(-z / Math.SQRT2);
  return 1 - 0.5 * erfc(z / Math.SQRT2);
}
function erfc(x) {
  if (x < 2) {
    let termino = x;
    let suma = x;
    for (let n = 1; n < 100; n++) {
      termino *= -x * x / n;
      const s = termino / (2 * n + 1);
      suma += s;
      if (Math.abs(s) < 1e-17 * Math.abs(suma)) break;
    }
    return 1 - 2 / Math.sqrt(Math.PI) * suma;
  }
  let f = x;
  let C = x;
  let D = 0;
  for (let n = 1; n < 300; n++) {
    const a = n / 2;
    D = x + a * D;
    D = D === 0 ? 1e-300 : 1 / D;
    C = x + a / C;
    if (C === 0) C = 1e-300;
    const delta = C * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
function normalInversa(p) {
  if (!(p > 0 && p < 1)) throw new Error("La inversa de la normal necesita un \xE1rea entre 0 y 1 (sin incluirlos).");
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const bajo = 0.02425;
  let z;
  if (p < bajo) {
    const q = Math.sqrt(-2 * Math.log(p));
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - bajo) {
    const q = p - 0.5;
    const r3 = q * q;
    z = (((((a[0] * r3 + a[1]) * r3 + a[2]) * r3 + a[3]) * r3 + a[4]) * r3 + a[5]) * q / (((((b[0] * r3 + b[1]) * r3 + b[2]) * r3 + b[3]) * r3 + b[4]) * r3 + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normalAcumulada(z) - p;
  return z - e / normal(z);
}
function logGamma(x) {
  const g = [
    0.9999999999998099,
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9984369578019572e-21,
    15056327351493116e-23
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  x -= 1;
  let s = g[0];
  for (let i = 1; i < 9; i++) s += g[i] / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}
function betaIncompleta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const frente = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x > (a + 1) / (a + b + 2)) return 1 - betaIncompleta(1 - x, b, a);
  const chico = 1e-300;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  d = Math.abs(d) < chico ? 1 / chico : 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    d = Math.abs(d) < chico ? 1 / chico : 1 / d;
    c = 1 + aa / c;
    if (Math.abs(c) < chico) c = chico;
    h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    d = Math.abs(d) < chico ? 1 / chico : 1 / d;
    c = 1 + aa / c;
    if (Math.abs(c) < chico) c = chico;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return frente * h / a;
}
function student(x, gl) {
  if (gl > 1e6) return normal(x);
  return Math.exp(logGamma((gl + 1) / 2) - logGamma(gl / 2) - 0.5 * Math.log(gl * Math.PI) - (gl + 1) / 2 * Math.log(1 + x * x / gl));
}
function studentAcumulada(x, gl) {
  if (!(gl > 0)) throw new Error("La t de Student necesita grados de libertad positivos.");
  if (gl > 1e6) return normalAcumulada(x);
  const cola = 0.5 * betaIncompleta(gl / (gl + x * x), gl / 2, 0.5);
  return x >= 0 ? 1 - cola : cola;
}
function studentInversa(p, gl) {
  if (!(p > 0 && p < 1)) throw new Error("La inversa de la t necesita un \xE1rea entre 0 y 1 (sin incluirlos).");
  if (gl > 1e6) return normalInversa(p);
  let t = normalInversa(p);
  for (let i = 0; i < 60; i++) {
    const e = studentAcumulada(t, gl) - p;
    const paso = e / Math.max(student(t, gl), 1e-300);
    t -= Math.max(-2, Math.min(2, paso));
    if (Math.abs(paso) < 1e-12 * Math.max(1, Math.abs(t))) break;
  }
  return t;
}
function valorCritico(alfa, gl = Infinity) {
  return Number.isFinite(gl) ? studentInversa(1 - alfa / 2, gl) : normalInversa(1 - alfa / 2);
}
function resumen(datos) {
  const n = datos.length;
  if (n < 2) throw new Error("Para estimar la varianza hacen falta al menos dos datos.");
  const media = datos.reduce((s, x) => s + x, 0) / n;
  const varianza = datos.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1);
  return { n, media, varianza, desvio: Math.sqrt(varianza) };
}
function muestraNormal({ n, media = 0, desvio = 1, semilla = 1 }) {
  const r3 = azar(semilla);
  const datos = [];
  while (datos.length < n) {
    const u = 1 - r3.siguiente();
    const v = r3.siguiente();
    const radio = Math.sqrt(-2 * Math.log(u));
    datos.push(media + desvio * radio * Math.cos(2 * Math.PI * v));
    if (datos.length < n) datos.push(media + desvio * radio * Math.sin(2 * Math.PI * v));
  }
  return datos;
}
function intervaloMedia({ media, desvio, sigma, n, confianza = 0.95 }) {
  if (!(confianza > 0 && confianza < 1)) throw new Error("La confianza va entre 0 y 1: 0.95 es el 95 %.");
  const conocido = sigma != null;
  const s = conocido ? sigma : desvio;
  if (!(s >= 0)) throw new Error("Para el intervalo hace falta el desv\xEDo: desvio (de la muestra) o sigma (de la poblaci\xF3n).");
  const gl = conocido ? Infinity : n - 1;
  const alfa = 1 - confianza;
  const critico = valorCritico(alfa, gl);
  const error = s / Math.sqrt(n);
  const margen = critico * error;
  return { centro: media, error, critico, margen, desde: media - margen, hasta: media + margen, gl, alfa, distribucion: conocido ? "normal" : "t" };
}
function decidir({ estadistico, gl = Infinity, alfa = 0.05, cola = "dos" }) {
  if (!["dos", "derecha", "izquierda"].includes(cola)) throw new Error("La cola de un test es 'dos', 'derecha' o 'izquierda'.");
  const F = (x) => Number.isFinite(gl) ? studentAcumulada(x, gl) : normalAcumulada(x);
  const inversa = (p) => Number.isFinite(gl) ? studentInversa(p, gl) : normalInversa(p);
  let critico;
  let pValor2;
  let rechaza;
  if (cola === "dos") {
    critico = inversa(1 - alfa / 2);
    pValor2 = 2 * Math.min(F(estadistico), 1 - F(estadistico));
    rechaza = Math.abs(estadistico) > critico;
  } else if (cola === "derecha") {
    critico = inversa(1 - alfa);
    pValor2 = 1 - F(estadistico);
    rechaza = estadistico > critico;
  } else {
    critico = inversa(alfa);
    pValor2 = F(estadistico);
    rechaza = estadistico < critico;
  }
  return { estadistico, gl, alfa, cola, critico, pValor: Math.min(1, Math.max(0, pValor2)), rechaza };
}
function testMedia({ media, desvio, n, mu0, alfa = 0.05, cola = "dos" }) {
  const error = desvio / Math.sqrt(n);
  const estadistico = (media - mu0) / error;
  return { ...decidir({ estadistico, gl: n - 1, alfa, cola }), error, media, mu0, n };
}
function inferenciaRegresion(datos, { confianza = 0.95 } = {}) {
  const r3 = regresionLineal(datos);
  if (r3.n < 3) throw new Error("Para hacer inferencia sobre la recta hacen falta al menos tres puntos.");
  const gl = r3.n - 2;
  const stc = r3.syy;
  const sce = r3.ssr;
  const scr = stc - sce;
  const sigma2 = sce / gl;
  const eeB1 = Math.sqrt(sigma2 / r3.sxx);
  const eeB0 = Math.sqrt(sigma2 * (1 / r3.n + r3.mediaX ** 2 / r3.sxx));
  const alfa = 1 - confianza;
  const critico = studentInversa(1 - alfa / 2, gl);
  const test = decidir({ estadistico: r3.b1 / eeB1, gl, alfa });
  const intervalo = (centro, ee) => ({ centro, margen: critico * ee, desde: centro - critico * ee, hasta: centro + critico * ee });
  return {
    ...r3,
    gl,
    stc,
    scr,
    sce,
    sigma2,
    sigma: Math.sqrt(sigma2),
    eeB1,
    eeB0,
    confianza,
    critico,
    t: test.estadistico,
    pValor: test.pValor,
    rechaza: test.rechaza,
    icB1: intervalo(r3.b1, eeB1),
    icB0: intervalo(r3.b0, eeB0),
    /** Lo que predice la recta en x. */
    prediccion: (x) => r3.b0 + r3.b1 * x,
    /** El intervalo de confianza para la respuesta media en x: dónde está la recta verdadera. */
    icm: (x) => intervalo(r3.b0 + r3.b1 * x, Math.sqrt(sigma2 * (1 / r3.n + (x - r3.mediaX) ** 2 / r3.sxx))),
    /** El intervalo de predicción en x: dónde va a caer UNA observación nueva. */
    ip: (x) => intervalo(r3.b0 + r3.b1 * x, Math.sqrt(sigma2 * (1 + 1 / r3.n + (x - r3.mediaX) ** 2 / r3.sxx)))
  };
}
function minimosCuadrados(filas, y) {
  const n = filas.length;
  if (n !== y.length) throw new Error("Tiene que haber un y por cada fila de X.");
  const X = filas.map((f) => [1, ...f]);
  const p = X[0].length;
  if (n <= p) throw new Error(`Con ${p - 1} variables hacen falta m\xE1s de ${p} filas.`);
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_2, j) => X.reduce((s, f) => s + f[i] * f[j], 0)));
  const Xty = Array.from({ length: p }, (_, i) => X.reduce((s, f, k2) => s + f[i] * y[k2], 0));
  const coeficientes = resolverSistema(XtX, Xty);
  const ajustados = X.map((f) => f.reduce((s, v, i) => s + v * coeficientes[i], 0));
  const media = y.reduce((s, v) => s + v, 0) / n;
  const stc = y.reduce((s, v) => s + (v - media) ** 2, 0);
  const sce = y.reduce((s, v, i) => s + (v - ajustados[i]) ** 2, 0);
  const r22 = stc === 0 ? 1 : 1 - sce / stc;
  const k = p - 1;
  return { coeficientes, ajustados, stc, sce, scr: stc - sce, r2: r22, r2Ajustado: 1 - (1 - r22) * (n - 1) / (n - k - 1), n, k };
}
function resolverSistema(A, b) {
  const n = b.length;
  const M = A.map((fila, i) => [...fila, b[i]]);
  for (let col = 0; col < n; col++) {
    let mejor = col;
    for (let f = col + 1; f < n; f++) if (Math.abs(M[f][col]) > Math.abs(M[mejor][col])) mejor = f;
    if (Math.abs(M[mejor][col]) < 1e-12 * Math.max(1, Math.abs(M[col][col]))) {
      throw new Error("Las ecuaciones normales no tienen soluci\xF3n \xFAnica: hay variables que son combinaci\xF3n de otras.");
    }
    [M[col], M[mejor]] = [M[mejor], M[col]];
    for (let f = 0; f < n; f++) {
      if (f === col) continue;
      const k = M[f][col] / M[col][col];
      for (let c = col; c <= n; c++) M[f][c] -= k * M[col][c];
    }
  }
  return M.map((fila, i) => fila[n] / fila[i]);
}

// src/piezas/geometria.js
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
  const linea2 = [];
  let respuestaPendiente = "";
  const n = {
    linea: linea2,
    tiempo: opciones.inicio ?? 0.3,
    ritmo,
    lectura,
    /** Agrega una animación (o varias) que arranca ahora, o `demora` segundos después. */
    animar(item, demora = 0) {
      for (const i of [item].flat()) linea2.push({ en: n.tiempo + demora, ...i });
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
      linea2.push({ subtitulo, en: n.tiempo, dur });
      n.tiempo += dur + extra;
      return dur;
    },
    /** Deja pasar un rato sin decir nada (para mirar algo que se mueve). */
    esperar(segundos) {
      n.tiempo += segundos * ritmo;
    },
    capitulo(nombre) {
      linea2.push({ capitulo: nombre, en: n.tiempo });
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
      linea2.push({ marca: "pregunta", datos: p, en: n.tiempo, dur }, { subtitulo: enunciado, en: n.tiempo, dur });
      n.tiempo += dur + 0.2;
      respuestaPendiente = p.opciones && p.correcta !== void 0 ? `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ? `${p.explicacion} ` : ""}` : "";
      return true;
    }
  };
  return n;
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
    const ids = new Set(normalizarNodos(p).map((n) => n.id));
    for (const a of normalizarAristas(p.aristas)) {
      for (const extremo of [a.de, a.a]) {
        if (!ids.has(extremo)) throw new Error(`La arista ${a.de}\u2192${a.a} usa "${extremo}", que no es ning\xFAn nodo del grafo.`);
      }
    }
  },
  crear(grupo) {
    return { aristas: el("g", { fill: "none", "stroke-linecap": "round" }, grupo), nodos: el("g", {}, grupo) };
  },
  actualizar(partes, p) {
    const nodos = normalizarNodos(p);
    const aristas = normalizarAristas(p.aristas);
    const donde = Object.fromEntries(nodos.map((n) => [n.id, n]));
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
      const [linea2, punta, etiqueta] = (
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
        const n = donde[a.de];
        const hacia = Math.atan2(n.y, n.x) || -Math.PI / 2;
        const R = p.radioNodo * 0.62;
        const cx = n.x + Math.cos(hacia) * (p.radioNodo + R * 0.55);
        const cy = n.y + Math.sin(hacia) * (p.radioNodo + R * 0.55);
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
      poner(linea2, { d, stroke: aCss(color), "stroke-width": grosor });
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
    nodos.forEach((n, i) => {
      const g = (
        /** @type {Element} */
        partes.nodos.childNodes[i]
      );
      const [anillo, circulo, icono, rotulo] = (
        /** @type {Element[]} */
        [...g.childNodes]
      );
      const visible = limitar(p.nodosVisibles - i, 0, 1);
      const destacado = resaltar.has(n.id);
      poner(g, { opacity: visible * (apagar.has(n.id) ? 0.3 : 1), visibility: visible > 0 ? null : "hidden" });
      poner(anillo, { cx: n.x, cy: n.y, r: p.radioNodo + 9, stroke: aCss(p.colorResaltado), visibility: destacado ? null : "hidden" });
      poner(circulo, {
        cx: n.x,
        cy: n.y,
        r: p.radioNodo,
        fill: aCss(p.relleno),
        stroke: aCss(destacado ? p.colorResaltado : p.borde),
        "stroke-width": 3.5
      });
      poner(icono, { x: n.x, y: n.y, "font-size": p.radioNodo * 1.05, visibility: n.icono ? null : "hidden" });
      texto(icono, n.icono ?? "");
      poner(rotulo, {
        x: n.x,
        y: n.icono ? n.y + p.radioNodo + p.tamano * 0.75 : n.y,
        "font-size": n.icono ? p.tamano * 0.8 : p.tamano,
        fill: aCss(p.color)
      });
      texto(rotulo, n.texto);
    });
  },
  tamano(p) {
    const nodos = normalizarNodos(p);
    const xs = nodos.map((n) => Math.abs(n.x));
    const ys = nodos.map((n) => Math.abs(n.y));
    return { ancho: 2 * (Math.max(0, ...xs) + p.radioNodo), alto: 2 * (Math.max(0, ...ys) + p.radioNodo) };
  }
});
function normalizarNodos(p) {
  const lista = p.nodos.map((n) => typeof n === "object" ? { ...n, id: String(n.id) } : { id: String(n) });
  return lista.map((n, i) => {
    const ang = -Math.PI / 2 + 2 * Math.PI * i / Math.max(lista.length, 1);
    return {
      id: n.id,
      texto: n.texto ?? n.id,
      icono: n.icono,
      x: n.x ?? (lista.length > 1 ? Math.cos(ang) * p.radio : 0),
      y: n.y ?? (lista.length > 1 ? Math.sin(ang) * p.radio : 0)
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

// src/mate/escenas.js
function lienzo(disposicion, titulo) {
  const angosta = disposicion.nombre === "angosta";
  const W = angosta ? 640 : 1600;
  const H2 = angosta ? 1140 : 900;
  const arriba = titulo ? angosta ? 96 : 104 : 24;
  return { angosta, W, H: H2, arriba };
}
function piezaTitulo(titulo, W, angosta) {
  return texto2({ x: W / 2, y: angosta ? 48 : 52, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
}
function panel(piezas, nombres, { x, y, ancho, tamano, interlineado = 1.9 }) {
  nombres.forEach((nombre, i) => {
    piezas[nombre] = texto2({
      x,
      y: y + i * tamano * interlineado,
      texto: "",
      tamano,
      alineacion: "inicio",
      anchoMax: ancho,
      opacidad: 0
    });
  });
}
function muestrear(n, duracion, cada, alPaso) {
  const cuantos = Math.max(1, Math.round(duracion / cada));
  for (let i = 1; i <= cuantos; i++) alPaso(i / cuantos, n.tiempo + (i - 1) * duracion / cuantos, duracion / cuantos);
}
function desdeDerivada(opciones) {
  const { f, x0, h: h0 = 2, hFinal = 0.02, expresion = "", titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  if (typeof f !== "function") throw new Error("desdeDerivada necesita la funci\xF3n: f: (x) => x * x.");
  const y0 = f(x0);
  const pendiente = derivada(f, x0);
  const nombreF = expresion ? `f(x) = ${expresion}` : "f";
  const rango = opciones.rango ?? rangoAlrededor(f, x0, h0);
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 320, y: arriba + 300, ancho: 600, alto: 580 } : { x: 520, y: arriba + 380, ancho: 940, alto: 740 };
    const pan = angosta ? { x: 24, y: arriba + 630, ancho: 600, tamano: 24 } : { x: 1040, y: arriba + 120, ancho: 540, tamano: 30 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.plano = plano({ ...pl, ...rango, tamano: angosta ? 16 : 20 });
    piezas.f = grafica({ plano: "plano", f, trazo: 0, etiqueta: expresion ? `y = ${expresion}` : "" });
    piezas.catetoH = segmento({ plano: "plano", x1: x0, y1: y0, x2: x0 + h0, y2: y0, color: "suave", punteada: true, etiqueta: "h", opacidad: 0 });
    piezas.catetoV = segmento({ plano: "plano", x1: x0 + h0, y1: y0, x2: x0 + h0, y2: f(x0 + h0), color: "suave", punteada: true, opacidad: 0 });
    piezas.secante = recta({ plano: "plano", mx: x0, my: y0, pendiente: cocienteIncremental(f, x0, h0), color: "acento2", progreso: 0, etiqueta: "secante" });
    piezas.tangente = recta({ plano: "plano", mx: x0, my: y0, pendiente, color: "exito", grosor: 4.5, progreso: 0, etiqueta: "tangente" });
    piezas.P = punto({ plano: "plano", mx: x0, my: y0, etiqueta: "P", color: "acento2", lado: "arriba-izquierda", opacidad: 0, guias: true });
    piezas.Q = punto({ plano: "plano", mx: x0 + h0, my: f(x0 + h0), etiqueta: "Q", color: "acento2", lado: "abajo-derecha", opacidad: 0 });
    panel(piezas, ["formula", "valorH", "valorPendiente", "valorDerivada"], pan);
    piezas.formula.props.fuente = "mono";
    piezas.formula.props.tamano = pan.tamano * 0.82;
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const textos = (h) => ({
      valorH: `h = ${numero(h, 3)}`,
      valorPendiente: `pendiente de la secante = ${numero(cocienteIncremental(f, x0, h), 3)}`
    });
    n.capitulo("La funci\xF3n");
    n.animar({ pieza: "f", a: { trazo: 1 }, dur: 1.6 * ritmo });
    n.decir(`Esta es la gr\xE1fica de ${nombreF}. \xBFQu\xE9 tan empinada es en x = ${numero(x0)}?`);
    n.capitulo("Una secante");
    n.animar([
      { pieza: ["P", "Q"], a: { opacidad: 1 }, dur: 0.5 },
      { pieza: ["catetoH", "catetoV"], a: { opacidad: 1 }, dur: 0.5 },
      { pieza: "secante", a: { progreso: 1 }, dur: 1 },
      { pieza: "formula", a: { texto: "pendiente = (f(x\u2080 + h) \u2212 f(x\u2080)) / h", opacidad: 1 }, dur: 0.4 },
      { pieza: "valorH", a: { texto: textos(h0).valorH, opacidad: 1 }, dur: 0.4 },
      { pieza: "valorPendiente", a: { texto: textos(h0).valorPendiente, opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`Tomamos P = (${numero(x0)}, ${numero(y0)}) y otro punto Q, h m\xE1s a la derecha. La recta que los une es una secante.`);
    n.decir("Su pendiente es lo que sube dividido lo que avanza: el cociente incremental.");
    n.preguntar("limite");
    n.capitulo("h se achica");
    const T = 6 * ritmo;
    n.decir("Ahora acercamos Q a P: h se hace cada vez m\xE1s chico. Mir\xE1 la secante.", 0);
    muestrear(n, T, 0.1, (u, en, dur) => {
      const h = h0 * (hFinal / h0) ** u;
      linea(n, en, dur, "Q", { mx: x0 + h, my: f(x0 + h) });
      linea(n, en, dur, "secante", { pendiente: cocienteIncremental(f, x0, h) });
      linea(n, en, dur, "catetoH", { x2: x0 + h });
      linea(n, en, dur, "catetoV", { x1: x0 + h, x2: x0 + h, y2: f(x0 + h) });
      n.linea.push({ pieza: "valorH", a: { texto: textos(h).valorH }, dur: 0, en: en + dur });
      n.linea.push({ pieza: "valorPendiente", a: { texto: textos(h).valorPendiente }, dur: 0, en: en + dur });
    });
    n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en) + 0.6;
    n.capitulo("La tangente");
    n.animar([
      { pieza: "tangente", a: { progreso: 1 }, dur: 1 },
      { pieza: ["secante", "catetoH", "catetoV", "Q"], a: { opacidad: 0 }, dur: 0.6 },
      { pieza: "valorDerivada", a: { texto: `f\u2032(${numero(x0)}) = ${numero(pendiente, 3)}`, opacidad: 1, color: "exito", peso: 800 }, dur: 0.5 }
    ]);
    n.decir(`Cuando h tiende a 0, la secante se vuelve la recta tangente. Su pendiente es la derivada: f\u2032(${numero(x0)}) = ${numero(pendiente, 3)}.`);
    n.decir("La derivada es eso: la pendiente de la recta que apenas toca la curva en ese punto.");
    return {
      titulo: titulo || "La derivada, como l\xEDmite",
      descripcion: descripcion || `La secante entre dos puntos de ${nombreF} se vuelve la tangente en x = ${numero(x0)} cuando h tiende a 0.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function linea(n, en, dur, pieza, a) {
  n.linea.push({ pieza, a, dur, en, curva: "lineal" });
}
function rangoAlrededor(f, x0, h) {
  const xmin = x0 - Math.max(1.5, h * 0.9);
  const xmax = x0 + h * 1.35 + 0.5;
  const ys = [];
  for (let i = 0; i <= 60; i++) {
    const y = f(xmin + (xmax - xmin) * i / 60);
    if (Number.isFinite(y)) ys.push(y);
  }
  const ymin = Math.min(0, ...ys);
  const ymax = Math.max(...ys);
  const aire = (ymax - ymin) * 0.12 || 1;
  return { xmin, xmax, ymin: ymin - aire, ymax: ymax + aire };
}
function desdeDescenso(opciones) {
  const { f, inicio, tasa, pasos = 12, expresion = "", titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  if (typeof f !== "function") throw new Error("desdeDescenso necesita la funci\xF3n: f: (x, y) => x * x + y * y.");
  const { puntos, motivo } = descensoGradiente(f, { inicio, tasa, pasos, gradiente: opciones.gradiente });
  const rango = opciones.rango ?? rangoCuadrado(puntos);
  const niveles = opciones.niveles ?? nivelesAutomaticos(f, rango);
  const nombreF = expresion ? `f(x, y) = ${expresion}` : "f";
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const lado = angosta ? 600 : 740;
    const pl = angosta ? { x: 320, y: arriba + 310, ancho: lado, alto: lado } : { x: 470, y: arriba + 385, ancho: lado, alto: lado };
    const pan = angosta ? { x: 24, y: arriba + 650, ancho: 600, tamano: 23 } : { x: 900, y: arriba + 110, ancho: 680, tamano: 29 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.plano = plano({ ...pl, ...rango, tamano: angosta ? 16 : 19 });
    piezas.curvas = curvasNivel({ plano: "plano", f, niveles, progreso: 0, tamanoEtiqueta: angosta ? 14 : 17 });
    piezas.campo = campo({ plano: "plano", f, progreso: 0, cantidad: angosta ? 9 : 11, largo: angosta ? 30 : 38 });
    piezas.camino = grafica({ plano: "plano", datos: [[inicio[0], inicio[1]]], color: "acento2", grosor: 3.5, trazo: 1, opacidad: 0 });
    piezas.paso = vector({ plano: "plano", mx: inicio[0], my: inicio[1], dx: 0, dy: 0, progreso: 0, color: "error", grosor: 4.5, etiqueta: "\u2212\u03B1\u2207f" });
    piezas.x = punto({ plano: "plano", mx: inicio[0], my: inicio[1], color: "acento2", etiqueta: "x\u2080", opacidad: 0 });
    panel(piezas, ["regla", "tasa", "iteracion", "posicion", "valor", "grad"], pan);
    piezas.regla.props.fuente = "mono";
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const [gx0, gy0] = puntos[0].gradiente;
    n.capitulo("Curvas de nivel");
    n.animar({ pieza: "curvas", a: { progreso: niveles.length }, dur: 2 * ritmo });
    n.decir(`Estas son curvas de nivel de ${nombreF}: cada una junta los puntos donde f vale lo mismo, como las l\xEDneas de un mapa de monta\xF1a.`);
    n.capitulo("El gradiente");
    n.animar({ pieza: "campo", a: { progreso: 1 }, dur: 1.2 });
    n.decir("En cada punto, el gradiente \u2207f apunta hacia donde f sube m\xE1s r\xE1pido. Fijate que siempre cruza las curvas en \xE1ngulo recto.");
    n.animar([
      { pieza: "campo", a: { opacidad: 0 }, dur: 0.4 },
      { pieza: "campo", a: { sentido: "bajada", color: "error" }, dur: 0, demora: 0.4 },
      { pieza: "campo", a: { opacidad: 0.75 }, dur: 0.5, demora: 0.45 }
    ].map(({ demora = 0, ...i }) => ({ ...i, en: n.tiempo + demora })));
    n.decir("Para bajar lo m\xE1s r\xE1pido posible hay que ir al rev\xE9s: en la direcci\xF3n de \u2212\u2207f.");
    n.preguntar("direccion");
    n.capitulo("Un paso");
    n.animar([
      { pieza: "campo", a: { opacidad: 0.25 }, dur: 0.5 },
      { pieza: "x", a: { opacidad: 1 }, dur: 0.4 },
      { pieza: "regla", a: { texto: "x(t+1) = x(t) \u2212 \u03B1 \xB7 \u2207f(x(t))", opacidad: 1 }, dur: 0.4 },
      { pieza: "tasa", a: { texto: `\u03B1 = ${numero(tasa, 3)} (la tasa de aprendizaje)`, opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`Arrancamos en x\u2080 = (${numero(inicio[0])}, ${numero(inicio[1])}). La regla es una sola: moverse un poquito en la direcci\xF3n de \u2212\u2207f.`);
    const datos = [[inicio[0], inicio[1]]];
    const estado = (i) => {
      const q = puntos[i];
      return {
        iteracion: `paso ${i}`,
        posicion: `x = (${numero(q.x, 3)}, ${numero(q.y, 3)})`,
        valor: `f(x) = ${numero(q.z, 4)}`,
        grad: `\u2207f(x) = (${numero(q.gradiente[0], 3)}, ${numero(q.gradiente[1], 3)})`
      };
    };
    n.animar(Object.entries(estado(0)).map(([pieza, t]) => ({ pieza, a: { texto: t, opacidad: 1 }, dur: 0.3 })));
    n.animar({ pieza: "camino", a: { opacidad: 1 }, dur: 0.3 });
    for (let i = 1; i < puntos.length; i++) {
      const antes = puntos[i - 1];
      const q = puntos[i];
      const detallado = i <= 2;
      const rapido = detallado ? 1 : 0.55;
      if (i === puntos.length - 1) n.preguntar("final");
      n.animar([
        { pieza: "paso", a: { mx: antes.x, my: antes.y, dx: q.x - antes.x, dy: q.y - antes.y, progreso: 0 }, dur: 0 },
        { pieza: "paso", a: { progreso: 1 }, dur: 0.6 * rapido * ritmo }
      ]);
      if (detallado) {
        n.decir(i === 1 ? `El gradiente ac\xE1 es (${numero(gx0, 2)}, ${numero(gy0, 2)}). Lo multiplicamos por \u03B1 y le restamos eso a x: la flecha roja es el paso.` : "Otra vez: se calcula el gradiente en el punto nuevo, y se da otro paso.", 0);
      } else {
        n.esperar(0.6 * rapido);
      }
      datos.push([q.x, q.y]);
      n.animar([
        { pieza: "x", a: { mx: q.x, my: q.y, etiqueta: `x${subindice(i)}` }, dur: 0.6 * rapido * ritmo },
        { pieza: "camino", a: { datos: datos.map((d) => [...d]) }, dur: 0, demora: 0.6 * rapido * ritmo },
        { pieza: "paso", a: { progreso: 0 }, dur: 0.2, demora: 0.6 * rapido * ritmo },
        ...Object.entries(estado(i)).map(([pieza, t]) => ({ pieza, a: { texto: t }, dur: 0, demora: 0.6 * rapido * ritmo }))
      ].map(({ demora = 0, ...it }) => ({ ...it, en: n.tiempo + demora })));
      n.esperar(0.9 * rapido + (detallado ? 0.3 : 0));
    }
    const ultimo = puntos.at(-1);
    n.capitulo("\xBFD\xF3nde termin\xF3?");
    if (motivo === "diverge") {
      n.decir("Se fue lej\xEDsimos: con una tasa tan grande, cada paso se pasa del m\xEDnimo y cae cada vez m\xE1s arriba. El m\xE9todo diverge.");
    } else if (motivo === "minimo") {
      n.decir(`Lleg\xF3 a un punto donde el gradiente es casi cero: (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}). Ah\xED f no sube ni baja hacia ning\xFAn lado: es el m\xEDnimo.`);
    } else if (rebota(puntos)) {
      n.decir(`Despu\xE9s de ${puntos.length - 1} pasos va por (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}), pero rebotando de un lado al otro del valle: cada paso se pasa del fondo. La tasa es grande; un poco m\xE1s, y diverge.`);
    } else {
      const cerca = Math.hypot(...ultimo.gradiente) < 0.05;
      n.decir(cerca ? `Despu\xE9s de ${puntos.length - 1} pasos qued\xF3 en (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}), con el gradiente casi en cero: est\xE1 pegado al m\xEDnimo.` : `Despu\xE9s de ${puntos.length - 1} pasos va por (${numero(ultimo.x, 3)}, ${numero(ultimo.y, 3)}). Todav\xEDa le falta: con m\xE1s pasos, o una tasa un poco mayor, llegar\xEDa.`);
    }
    n.decir("Cada paso es m\xE1s corto que el anterior porque, cerca del m\xEDnimo, el gradiente se achica.");
    return {
      titulo: titulo || "Descenso del gradiente",
      descripcion: descripcion || `El descenso del gradiente sobre ${nombreF}, desde (${numero(inicio[0])}, ${numero(inicio[1])}) con tasa ${numero(tasa, 3)}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function rebota(puntos) {
  if (puntos.length < 4) return false;
  for (const eje of ["x", "y"]) {
    let vueltas = 0;
    for (let i = 2; i < puntos.length; i++) {
      const a = puntos[i - 1][eje] - puntos[i - 2][eje];
      const b = puntos[i][eje] - puntos[i - 1][eje];
      if (a * b < 0) vueltas++;
    }
    if (vueltas >= (puntos.length - 2) * 0.6) return true;
  }
  return false;
}
function subindice(i) {
  return String(i).replace(/\d/g, (d) => "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089"[Number(d)]);
}
function rangoCuadrado(puntos) {
  const xs = puntos.map((p) => p.x).filter(Number.isFinite);
  const ys = puntos.map((p) => p.y).filter(Number.isFinite);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const media = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1) * 0.7;
  return { xmin: cx - media, xmax: cx + media, ymin: cy - media, ymax: cy + media };
}
function nivelesAutomaticos(f, rango) {
  const valores = [];
  for (let j = 0; j <= 30; j++) {
    for (let i = 0; i <= 30; i++) {
      const v = f(rango.xmin + (rango.xmax - rango.xmin) * i / 30, rango.ymin + (rango.ymax - rango.ymin) * j / 30);
      if (Number.isFinite(v)) valores.push(v);
    }
  }
  valores.sort((a, b) => a - b);
  const lindos = [0.03, 0.09, 0.18, 0.3, 0.45, 0.62, 0.82].map((q) => valores[Math.floor(q * (valores.length - 1))]);
  return [...new Set(lindos.map((v) => Number(v.toPrecision(2))))];
}
function desdeRegresion(opciones) {
  const { datos, etiquetaX = "x", etiquetaY = "y", predecir = [], titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const r3 = regresionLineal(datos);
  const rango = opciones.rango ?? rangoDatos(datos);
  const xs = datos.map(([x]) => x);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 320, y: arriba + 290, ancho: 600, alto: 560 } : { x: 520, y: arriba + 380, ancho: 940, alto: 740 };
    const pan = angosta ? { x: 24, y: arriba + 620, ancho: 600, tamano: 23 } : { x: 1040, y: arriba + 110, ancho: 540, tamano: 29 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.plano = plano({ ...pl, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 15 : 19 });
    datos.forEach(([x, y], i) => {
      piezas[`e${i}`] = segmento({ plano: "plano", x1: x, y1: y, x2: x, y2: r3.mediaY, color: "error", grosor: 2.5, opacidad: 0 });
    });
    piezas.recta = recta({ plano: "plano", mx: r3.mediaX, my: r3.mediaY, pendiente: 0, color: "acento2", progreso: 0 });
    datos.forEach(([x, y], i) => {
      piezas[`d${i}`] = punto({ plano: "plano", mx: x, my: y, radio: angosta ? 6 : 8, color: "acento", opacidad: 0 });
    });
    piezas.media = punto({ plano: "plano", mx: r3.mediaX, my: r3.mediaY, color: "acento2", etiqueta: "(x\u0304, \u0233)", radio: 10, opacidad: 0, lado: "arriba-izquierda" });
    piezas.prediccion = punto({ plano: "plano", mx: r3.mediaX, my: r3.mediaY, color: "exito", guias: true, radio: 10, opacidad: 0 });
    panel(piezas, ["cantidad", "medias", "ssr", "ecuacion", "r2", "juicio", "estimacion"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const ids = datos.map((_, i) => `d${i}`);
    const residuos = datos.map((_, i) => `e${i}`);
    n.capitulo("Los datos");
    n.animar({ pieza: ids, a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.12, 1.8 / datos.length) });
    n.animar({ pieza: "cantidad", a: { texto: `${r3.n} puntos (${etiquetaX}, ${etiquetaY})`, opacidad: 1 }, dur: 0.4 });
    n.decir(`Tenemos ${r3.n} mediciones. Parece que cuando ${etiquetaX} crece, ${etiquetaY} tambi\xE9n: \xBFqu\xE9 recta las representa mejor?`);
    n.capitulo("Una recta cualquiera");
    n.animar([
      { pieza: "media", a: { opacidad: 1 }, dur: 0.4 },
      { pieza: "medias", a: { texto: `x\u0304 = ${numero(r3.mediaX)},  \u0233 = ${numero(r3.mediaY)}`, opacidad: 1 }, dur: 0.4 },
      { pieza: "recta", a: { progreso: 1 }, dur: 1 }
    ]);
    n.decir("Probemos primero con una recta horizontal, a la altura del promedio \u0233.");
    n.animar([
      { pieza: residuos, a: { opacidad: 1 }, dur: 0.4, escalonar: 0.04 },
      { pieza: "ssr", a: { texto: `Suma de residuos\xB2 = ${numero(sumaResiduos(datos, r3.mediaY, 0), 1)}`, opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir("Cada segmento rojo es un residuo: cu\xE1nto le erra la recta a ese punto. Los elevamos al cuadrado y los sumamos.");
    n.preguntar("recta");
    n.capitulo("M\xEDnimos cuadrados");
    n.decir("Ahora la giramos sobre el punto promedio. Mir\xE1 c\xF3mo baja la suma.", 0);
    muestrear(n, 4.5 * ritmo, 0.1, (u, en, dur) => {
      const b1 = r3.b1 * (1 - (1 - u) ** 2);
      const b0 = r3.mediaY - b1 * r3.mediaX;
      linea(n, en, dur, "recta", { pendiente: b1 });
      datos.forEach(([x], i) => linea(n, en, dur, `e${i}`, { y2: b0 + b1 * x }));
      n.linea.push({ pieza: "ssr", a: { texto: `Suma de residuos\xB2 = ${numero(sumaResiduos(datos, b0, b1), 1)}` }, dur: 0, en: en + dur });
    });
    n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en) + 0.5;
    n.animar([
      { pieza: "ecuacion", a: { texto: `\u0177 = ${numero(r3.b0, 3)} + ${numero(r3.b1, 3)} \xB7 ${etiquetaX}`, opacidad: 1, peso: 800, color: "acento2" }, dur: 0.4 }
    ]);
    n.decir(`Esta es la recta con la menor suma posible: \u0177 = ${numero(r3.b0, 3)} + ${numero(r3.b1, 3)}\xB7${etiquetaX}. Por eso se llama de m\xEDnimos cuadrados.`);
    n.decir(`La pendiente dice cu\xE1nto cambia ${etiquetaY}, en promedio, por cada unidad de ${etiquetaX}: ${numero(r3.b1, 3)}.`);
    n.capitulo("\xBFAjusta bien?");
    const juicio = r3.r2 > 0.9 ? "muy bueno" : r3.r2 > 0.7 ? "bueno" : r3.r2 > 0.4 ? "regular" : "malo";
    n.animar([
      { pieza: "r2", a: { texto: `R\xB2 = ${numero(r3.r2, 3)},  r = ${numero(r3.r, 3)}`, opacidad: 1 }, dur: 0.4 },
      { pieza: "juicio", a: { texto: `Ajuste ${juicio}`, opacidad: 1, color: r3.r2 > 0.7 ? "exito" : "alerta", peso: 700 }, dur: 0.4 },
      { pieza: residuos, a: { opacidad: 0.35 }, dur: 0.5 }
    ]);
    n.decir(`R\xB2 = ${numero(r3.r2, 3)}: la recta explica el ${numero(r3.r2 * 100, 0)} % de la variaci\xF3n de ${etiquetaY}. El ajuste es ${juicio}.`);
    for (const x of predecir) {
      const y = r3.b0 + r3.b1 * x;
      const afuera = x < xMin || x > xMax;
      n.preguntar("prediccion");
      n.capitulo(`Predecir con ${etiquetaX} = ${numero(x)}`);
      n.animar([
        { pieza: "prediccion", a: { mx: x, my: y, etiqueta: `\u0177 \u2248 ${numero(y, 1)}`, opacidad: 1, color: afuera ? "alerta" : "exito" }, dur: 0.6 },
        { pieza: "estimacion", a: { texto: `${etiquetaX} = ${numero(x)}  \u2192  \u0177 \u2248 ${numero(y, 2)}`, opacidad: 1 }, dur: 0.4 }
      ]);
      n.decir(afuera ? `Para ${etiquetaX} = ${numero(x)} la recta da ${numero(y, 1)}. Pero ojo: los datos van de ${numero(xMin)} a ${numero(xMax)}. Afuera de ese rango es extrapolar, y nada garantiza que siga siendo una recta.` : `Para ${etiquetaX} = ${numero(x)}, la recta estima ${etiquetaY} \u2248 ${numero(y, 1)}. Est\xE1 dentro del rango de los datos, as\xED que es una estimaci\xF3n razonable.`);
    }
    return {
      titulo: titulo || "Regresi\xF3n lineal",
      descripcion: descripcion || `La recta de m\xEDnimos cuadrados para ${r3.n} puntos: \u0177 = ${numero(r3.b0, 3)} + ${numero(r3.b1, 3)}x, con R\xB2 = ${numero(r3.r2, 3)}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function rangoDatos(datos) {
  const xs = datos.map(([x]) => x);
  const ys = datos.map(([, y]) => y);
  const ax = (Math.max(...xs) - Math.min(...xs)) * 0.12 || 1;
  const ay = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
  return { xmin: Math.min(0, Math.min(...xs) - ax), xmax: Math.max(...xs) + ax, ymin: Math.min(0, Math.min(...ys) - ay), ymax: Math.max(...ys) + ay };
}
function desdeEuclides(opciones) {
  const { a, b, titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const { mcd, pasos } = euclides(a, b);
  const grande = Math.max(Math.abs(a), Math.abs(b));
  const chico = Math.min(Math.abs(a), Math.abs(b));
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const zona = angosta ? { x: 320, y: arriba + 230, ancho: 600, alto: 400 } : { x: 470, y: arriba + 360, ancho: 860, alto: 600 };
    const escala = Math.min(zona.ancho / grande, zona.alto / chico);
    const R = { ancho: grande * escala, alto: chico * escala };
    const origen = { x: zona.x - R.ancho / 2, y: zona.y - R.alto / 2 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.rect = caja({ x: zona.x, y: zona.y, ancho: R.ancho, alto: R.alto, radio: 2, relleno: "papel", grosorBorde: 3, texto: `${grande} \xD7 ${chico}`, tamano: angosta ? 22 : 30, color: "suave", opacidad: 0 });
    const cuadrados = [];
    let x = origen.x;
    let y = origen.y;
    let w = R.ancho;
    let h = R.alto;
    const colores = ["acento", "acento2", "exito", "alerta"];
    pasos.forEach((p, i) => {
      const lado = p.b * escala;
      const horizontal = w >= h - 1e-6;
      const juntos = p.q > 10;
      const cuantos = juntos ? 1 : p.q;
      for (let k = 0; k < cuantos; k++) {
        const largo2 = juntos ? lado * p.q : lado;
        const cx = horizontal ? x + k * lado + largo2 / 2 : x + lado / 2;
        const cy = horizontal ? y + lado / 2 : y + k * lado + largo2 / 2;
        cuadrados.push({
          id: `c${i}_${k}`,
          paso: i,
          pieza: caja({
            x: cx,
            y: cy,
            ancho: horizontal ? largo2 : lado,
            alto: horizontal ? lado : largo2,
            radio: 2,
            relleno: colores[i % colores.length],
            borde: "superficie",
            grosorBorde: 2,
            texto: lado > 44 ? juntos ? `${p.q} \xD7 ${p.b}` : String(p.b) : "",
            color: "fondo",
            tamano: Math.min(30, lado * 0.35),
            opacidad: 0
          })
        });
      }
      if (horizontal) {
        x += p.q * lado;
        w -= p.q * lado;
      } else {
        y += p.q * lado;
        h -= p.q * lado;
      }
    });
    for (const c of cuadrados) piezas[c.id] = c.pieza;
    const tab = angosta ? { x: 320, y: arriba + 470, ancho: 560, altoFila: 40, tamano: 21 } : { x: 1250, y: arriba + 100, ancho: 560, altoFila: 54, tamano: 28 };
    piezas.divisiones = tabla({
      ...tab,
      anclaje: "arriba",
      columnas: ["Divisi\xF3n", "Resto"],
      filas: pasos.map((p) => [`${p.a} = ${p.q} \xB7 ${p.b} + ${p.r}`, String(p.r)]),
      filasVisibles: 0,
      opacidad: 0
    });
    piezas.resultado = texto2({
      x: tab.x,
      y: tab.y + (pasos.length + 1) * tab.altoFila + (angosta ? 44 : 70),
      texto: `mcd(${a}, ${b}) = ${mcd}`,
      tamano: angosta ? 30 : 40,
      peso: 800,
      color: "exito",
      opacidad: 0
    });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo("El rect\xE1ngulo");
    n.animar([{ pieza: "rect", a: { opacidad: 1 }, dur: 0.5 }, { pieza: "divisiones", a: { opacidad: 1 }, dur: 0.5 }]);
    n.decir(`Queremos el m\xE1ximo com\xFAn divisor de ${a} y ${b}. Pensalo como un rect\xE1ngulo de ${grande} por ${chico}: buscamos el cuadrado m\xE1s grande que lo llene justo, sin que sobre nada.`);
    pasos.forEach((p, i) => {
      const ids = cuadrados.filter((c) => c.paso === i).map((c) => c.id);
      n.capitulo(`${p.a} = ${p.q} \xB7 ${p.b} + ${p.r}`);
      n.animar([
        { pieza: "rect", a: { texto: "" }, dur: 0 },
        { pieza: ids, a: { opacidad: 1 }, dur: 0.35, escalonar: Math.min(0.25, 1.5 / ids.length) },
        { pieza: "divisiones", a: { filasVisibles: i + 1, resaltarFila: i }, dur: 0.4 }
      ]);
      if (i === 0) {
        n.decir(`Entran ${p.q} cuadrados de ${p.b} de lado, y sobra una tira de ${p.r}. Eso es dividir: ${p.a} = ${p.q} \xB7 ${p.b} + ${p.r}.`);
        n.preguntar("resto");
        if (p.r !== 0) n.decir(`El truco de Euclides: el mcd de ${a} y ${b} es el mismo que el de ${p.b} y ${p.r}. As\xED que seguimos con lo que sobr\xF3.`);
      } else if (p.r !== 0) {
        n.decir(`En lo que sobr\xF3 entran ${p.q} de ${p.b}, y sobra ${p.r}.`);
      } else {
        n.decir(`Ahora entran ${p.q} cuadrados de ${p.b} justos: el resto es 0. No sobra nada.`);
      }
    });
    n.capitulo("El mcd");
    n.animar([
      { pieza: "divisiones", a: { resaltarFila: -1 }, dur: 0.3 },
      { pieza: "resultado", a: { opacidad: 1 }, dur: 0.5 }
    ]);
    n.decir(mcd === 1 ? `El \xFAltimo cuadrado mide 1: mcd(${a}, ${b}) = 1. No tienen ning\xFAn divisor en com\xFAn salvo el 1: son coprimos.` : `El \xFAltimo resto que no es cero es ${mcd}: mcd(${a}, ${b}) = ${mcd}. Un cuadrado de ${mcd} por ${mcd} llena el rect\xE1ngulo entero.`);
    return {
      titulo: titulo || "El algoritmo de Euclides",
      descripcion: descripcion || `El m\xE1ximo com\xFAn divisor de ${a} y ${b} con divisiones sucesivas: da ${mcd}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeRelacion(opciones) {
  const { conjunto, pares, nombre = "R", titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const props = propiedadesRelacion(conjunto, pares);
  const matriz = matrizRelacion(conjunto, pares);
  const s = (v) => String(v);
  const par = ([x, y]) => `(${x}, ${y})`;
  const flecha = ([x, y]) => `${s(x)}\u2192${s(y)}`;
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.pares = texto2({
      x: W / 2,
      y: arriba + (angosta ? 20 : 26),
      texto: `${nombre} = { ${pares.map(par).join(", ")} }`,
      tamano: angosta ? 19 : 26,
      fuente: "mono",
      anchoMax: W - 40,
      opacidad: 0
    });
    const g = angosta ? { x: 320, y: arriba + 300, radio: 170, radioNodo: 32 } : { x: 450, y: arriba + 400, radio: 230, radioNodo: 40 };
    piezas.grafo = grafo({
      ...g,
      nodos: conjunto.map(s),
      aristas: pares.map(([x, y]) => [s(x), s(y)]),
      visibles: 0,
      nodosVisibles: 0,
      tamano: angosta ? 24 : 30
    });
    const anchoCelda = angosta ? 54 : 70;
    const tab = angosta ? { x: 320, y: arriba + 560, tamano: 20, altoFila: 38 } : { x: 1180, y: arriba + 90, tamano: 26, altoFila: 52 };
    const filaMatriz = (hasta) => conjunto.map((a, i) => [s(a), ...conjunto.map((b, j) => {
      const k = pares.findIndex(([x, y]) => x === a && y === b);
      return k !== -1 && k < hasta ? String(matriz[i][j]) : k === -1 && hasta >= pares.length ? "0" : "";
    })]);
    piezas.matriz = tabla({
      ...tab,
      anclaje: "arriba",
      columnas: [nombre, ...conjunto.map(s)],
      filas: filaMatriz(0),
      anchos: [anchoCelda, ...conjunto.map(() => anchoCelda)],
      opacidad: 0
    });
    const listaY = tab.y + (conjunto.length + 1) * tab.altoFila + (angosta ? 40 : 60);
    const nombres = ["reflexiva", "simetrica", "antisimetrica", "transitiva"];
    const titulos = { reflexiva: "Reflexiva", simetrica: "Sim\xE9trica", antisimetrica: "Antisim\xE9trica", transitiva: "Transitiva" };
    nombres.forEach((p, i) => {
      piezas[p] = texto2({
        x: angosta ? 40 : tab.x - (conjunto.length + 1) * anchoCelda / 2,
        y: listaY + i * (angosta ? 34 : 48),
        texto: `${titulos[p]}: \xBF?`,
        tamano: angosta ? 21 : 28,
        alineacion: "inicio",
        opacidad: 0
      });
    });
    piezas.conclusion = texto2({
      x: angosta ? 320 : tab.x,
      y: listaY + 4 * (angosta ? 34 : 48) + (angosta ? 20 : 30),
      texto: "",
      tamano: angosta ? 22 : 30,
      peso: 800,
      anchoMax: angosta ? 600 : 620,
      opacidad: 0
    });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo("Tres formas de verla");
    n.animar([
      { pieza: "pares", a: { opacidad: 1 }, dur: 0.4 },
      { pieza: "grafo", a: { nodosVisibles: conjunto.length }, dur: 0.8 },
      { pieza: "matriz", a: { opacidad: 1 }, dur: 0.5 }
    ]);
    n.decir(`La relaci\xF3n ${nombre} sobre {${conjunto.join(", ")}} se puede escribir como pares, dibujar como un d\xEDgrafo o poner en una matriz.`);
    n.animar({ pieza: "grafo", a: { visibles: pares.length }, dur: Math.min(4, 0.5 * pares.length) * ritmo, curva: "lineal" });
    muestrear(n, Math.min(4, 0.5 * pares.length) * ritmo, Math.min(4, 0.5 * pares.length) * ritmo / pares.length, (u, en, dur) => {
      n.linea.push({ pieza: "matriz", a: { filas: filaMatriz(Math.round(u * pares.length)) }, dur: 0, en: en + dur });
    });
    n.decir("Cada par (a, b) es una flecha de a hacia b, y un 1 en la fila a, columna b. Un par (a, a) es un lazo, que vuelve al mismo nodo.");
    const comprobar = (p, explicar) => {
      n.preguntar(p);
      n.capitulo(titulos[p]);
      const { cumple, resaltar, texto: dicho } = explicar(props[p]);
      n.animar([
        { pieza: "grafo", a: { resaltar }, dur: 0 },
        { pieza: p, a: { texto: `${titulos[p]}: ${cumple ? "s\xED \u2713" : "no \u2717"}`, color: cumple ? "exito" : "error", opacidad: 1, peso: 700 }, dur: 0.4 }
      ]);
      n.decir(dicho);
    };
    comprobar("reflexiva", ({ cumple, contraejemplo }) => ({
      cumple,
      resaltar: cumple ? conjunto.map((a) => `${s(a)}\u2192${s(a)}`) : [s(contraejemplo[0])],
      texto: cumple ? "Reflexiva: todos los elementos tienen su lazo. Cada uno est\xE1 relacionado consigo mismo." : `Reflexiva no: a ${contraejemplo[0]} le falta el lazo, (${contraejemplo[0]}, ${contraejemplo[0]}) no est\xE1 en ${nombre}.`
    }));
    comprobar("simetrica", ({ cumple, contraejemplo }) => ({
      cumple,
      resaltar: cumple ? [] : [flecha(contraejemplo)],
      texto: cumple ? "Sim\xE9trica: cada flecha tiene su vuelta. Si a est\xE1 relacionado con b, b tambi\xE9n con a." : `Sim\xE9trica no: est\xE1 ${par(contraejemplo)}, pero no ${par([contraejemplo[1], contraejemplo[0]])}. Esa flecha no tiene vuelta.`
    }));
    comprobar("antisimetrica", ({ cumple, contraejemplo }) => ({
      cumple,
      resaltar: cumple ? [] : [flecha(contraejemplo), flecha([contraejemplo[1], contraejemplo[0]])],
      texto: cumple ? "Antisim\xE9trica: entre dos elementos distintos nunca hay ida y vuelta." : `Antisim\xE9trica no: ${contraejemplo[0]} y ${contraejemplo[1]} son distintos, y hay flecha de ida y de vuelta.`
    }));
    comprobar("transitiva", ({ cumple, contraejemplo }) => ({
      cumple,
      resaltar: cumple ? [] : contraejemplo.pares.map(flecha),
      texto: cumple ? "Transitiva: siempre que se puede ir de a a b y de b a c, tambi\xE9n hay flecha directa de a a c." : `Transitiva no: est\xE1 ${par(contraejemplo.pares[0])} y ${par(contraejemplo.pares[1])}, pero falta ${par(contraejemplo.falta)}: no hay atajo de ${contraejemplo.falta[0]} a ${contraejemplo.falta[1]}.`
    }));
    n.capitulo("Conclusi\xF3n");
    const conclusion = props.equivalencia ? `${nombre} es una relaci\xF3n de equivalencia.` : props.reflexiva.cumple && props.antisimetrica.cumple && props.transitiva.cumple ? `${nombre} es una relaci\xF3n de orden.` : `${nombre} no es de equivalencia ni de orden.`;
    n.animar([{ pieza: "grafo", a: { resaltar: [] }, dur: 0 }, { pieza: "conclusion", a: { texto: conclusion, opacidad: 1 }, dur: 0.5 }]);
    n.decir(props.equivalencia ? `Es reflexiva, sim\xE9trica y transitiva: ${nombre} es una relaci\xF3n de equivalencia.` : `${conclusion} Para ser de equivalencia necesita ser reflexiva, sim\xE9trica y transitiva; para ser de orden, reflexiva, antisim\xE9trica y transitiva.`);
    return {
      titulo: titulo || `Las propiedades de ${nombre}`,
      descripcion: descripcion || `La relaci\xF3n ${nombre} = { ${pares.map(par).join(", ")} } como d\xEDgrafo y como matriz, y cu\xE1les propiedades cumple.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeModulo(opciones) {
  const { n: m, cuentas, titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  if (!(Number.isInteger(m) && m >= 2 && m <= 24)) throw new Error("El m\xF3dulo de desdeModulo tiene que ser un entero entre 2 y 24 (si no, el reloj no se lee).");
  const analizadas = cuentas.map(analizarCuenta);
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const g = angosta ? { x: 320, y: arriba + 300, radio: 200, radioNodo: 30 } : { x: 520, y: arriba + 390, radio: 290, radioNodo: 38 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    const nodos = Array.from({ length: m }, (_, i) => String(i));
    piezas.reloj = grafo({ ...g, nodos, aristas: [], tamano: angosta ? 24 : 30 });
    piezas.centro = texto2({ x: g.x, y: g.y, texto: `m\xF3d ${m}`, tamano: angosta ? 30 : 40, peso: 800, color: "suave" });
    const pan = angosta ? { x: 24, y: arriba + 600, ancho: 600, tamano: 25 } : { x: 1e3, y: arriba + 160, ancho: 580, tamano: 32 };
    panel(piezas, ["cuenta", "detalle", "resultado"], { ...pan, interlineado: 2.1 });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo(`Un reloj de ${m}`);
    n.decir(`En aritm\xE9tica m\xF3dulo ${m} solo hay ${m} n\xFAmeros, del 0 al ${m - 1}, en ronda como las horas de un reloj. Al pasar el ${m - 1}, se vuelve al 0.`);
    analizadas.forEach((c, k) => {
      const r3 = modulo(c.valor, m);
      n.preguntar(k);
      n.capitulo(c.texto);
      n.animar([
        { pieza: "reloj", a: { aristas: [], resaltar: [], visibles: 0 }, dur: 0 },
        { pieza: "cuenta", a: { texto: `${c.texto} (m\xF3d ${m})`, opacidad: 1, peso: 700 }, dur: 0.3 },
        { pieza: ["detalle", "resultado"], a: { opacidad: 0 }, dur: 0.2 }
      ]);
      if (c.op === null) {
        const vueltas = Math.floor(c.a / m);
        n.animar({ pieza: "reloj", a: { resaltar: [String(r3)] }, dur: 0, demora: 0 });
        n.animar({ pieza: "detalle", a: { texto: `${c.a} = ${vueltas} \xB7 ${m} + ${r3}`, opacidad: 1 }, dur: 0.3 });
        n.decir(`${c.a} dividido ${m} da ${vueltas} y sobra ${r3}: es dar ${vueltas} vueltas enteras al reloj y avanzar ${r3} m\xE1s. As\xED que ${c.a} \u2261 ${r3}.`);
      } else {
        const desde = c.op === "*" ? 0 : modulo(c.a, m);
        const salto = c.op === "*" ? modulo(c.a, m) : c.op === "+" ? 1 : -1;
        const veces = c.b;
        const aristas = [];
        let actual = desde;
        for (let i = 0; i < veces; i++) {
          const siguiente = modulo(actual + salto, m);
          aristas.push([String(actual), String(siguiente)]);
          actual = siguiente;
        }
        n.animar([
          { pieza: "reloj", a: { resaltar: [String(desde)] }, dur: 0 },
          { pieza: "detalle", a: { texto: c.op === "*" ? `${c.b} saltos de a ${modulo(c.a, m)}, desde el 0` : `desde el ${desde}, ${c.b} ${c.op === "+" ? "para adelante" : "para atr\xE1s"}`, opacidad: 1 }, dur: 0.3 }
        ]);
        n.decir(c.op === "*" ? `Multiplicar es sumar varias veces: ${c.b} saltos de ${modulo(c.a, m)}, arrancando en 0.` : `Arrancamos en ${desde} y avanzamos ${c.b} ${c.op === "+" ? "lugares" : "lugares para atr\xE1s"}.`, 0);
        const dur = Math.min(0.5, 4 / Math.max(veces, 1)) * ritmo;
        n.animar({ pieza: "reloj", a: { aristas, visibles: 0 }, dur: 0 });
        aristas.forEach((ar, i) => {
          n.animar([
            { pieza: "reloj", a: { visibles: i + 1 }, dur, curva: "lineal" },
            { pieza: "reloj", a: { resaltar: [ar[1], `${ar[0]}\u2192${ar[1]}`] }, dur: 0, demora: dur }
          ].map(({ demora = 0, ...it }) => ({ ...it, en: n.tiempo + demora })));
          n.tiempo += dur;
        });
        n.esperar(0.3);
      }
      n.animar({ pieza: "resultado", a: { texto: `${c.texto} \u2261 ${r3} (m\xF3d ${m})`, opacidad: 1, color: "exito", peso: 800 }, dur: 0.4 });
      n.decir(c.op === null ? `${c.a} y ${r3} est\xE1n en la misma clase: dejan el mismo resto al dividir por ${m}.` : `Terminamos en ${r3}: ${c.texto} \u2261 ${r3} (m\xF3d ${m}).${c.valor !== r3 ? ` En los enteros dar\xEDa ${c.valor}, y ${c.valor} \u2261 ${r3} porque dejan el mismo resto.` : ""}`);
    });
    return {
      titulo: titulo || `Aritm\xE9tica m\xF3dulo ${m}`,
      descripcion: descripcion || `Cuentas m\xF3dulo ${m} en un reloj de ${m} n\xFAmeros: ${cuentas.join("; ")}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function analizarCuenta(cuenta) {
  const t = String(cuenta).trim().replace(/[·×]/g, "*").replace(/−/g, "-");
  let m = t.match(/^(-?\d+)\s*([+*-])\s*(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    const op = m[2];
    const valor = op === "+" ? a + b : op === "-" ? a - b : a * b;
    return { a, op, b, valor, texto: `${a} ${op === "*" ? "\xB7" : op === "-" ? "\u2212" : "+"} ${b}` };
  }
  m = t.match(/^(\d+)$/);
  if (m) return { a: Number(m[1]), op: null, b: 0, valor: Number(m[1]), texto: m[1] };
  throw new Error(`No entiendo la cuenta "${cuenta}": tiene que ser "a + b", "a - b", "a * b" o un n\xFAmero solo.`);
}

// src/mate/escenas-estadistica.js
var pct = (p) => `${numero(p * 100, 1)} %`;
function pValor(p) {
  return p < 1e-4 ? "menos de 0,0001" : numero(p, 4);
}
function campana(piezas, id, { gl, limite, x, y, ancho, alto, angosta }) {
  const f = Number.isFinite(gl) ? (v) => student(v, gl) : (v) => normal(v);
  piezas[id] = plano({
    x,
    y,
    ancho,
    alto,
    xmin: -limite,
    xmax: limite,
    ymin: -0.04,
    ymax: 0.46,
    pasoY: 10,
    pasoX: limite > 5 ? 2 : 1,
    etiquetaX: Number.isFinite(gl) ? "t" : "z",
    etiquetaY: "",
    tamano: angosta ? 15 : 19,
    grilla: false
  });
  piezas[`${id}Curva`] = grafica({ plano: id, f, trazo: 0, color: "texto", grosor: 3.5 });
  return f;
}
function desdeIntervalo(opciones) {
  const { datos, confianza = 0.95, otraConfianza = 0.99, etiqueta = "x", unidad = "", titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const m = resumen(datos);
  const ic = intervaloMedia({ media: m.media, desvio: m.desvio, n: m.n, confianza });
  const otro = otraConfianza ? intervaloMedia({ media: m.media, desvio: m.desvio, n: m.n, confianza: otraConfianza }) : null;
  const u = unidad ? ` ${unidad}` : "";
  const lo = Math.min(...datos);
  const hi = Math.max(...datos);
  const holgura = Math.max((hi - lo) * 0.12, (otro ?? ic).margen * 1.3);
  const rango = { xmin: Math.min(lo, (otro ?? ic).desde) - holgura, xmax: Math.max(hi, (otro ?? ic).hasta) + holgura };
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const recta1 = angosta ? { x: 320, y: arriba + 140, ancho: 600, alto: 230 } : { x: 540, y: arriba + 170, ancho: 1e3, alto: 290 };
    const camp = angosta ? { x: 320, y: arriba + 430, ancho: 600, alto: 300 } : { x: 540, y: arriba + 530, ancho: 1e3, alto: 360 };
    const pan = angosta ? { x: 24, y: arriba + 620, ancho: 600, tamano: 23 } : { x: 1090, y: arriba + 90, ancho: 490, tamano: 27 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.linea = plano({ ...recta1, ...rango, ymin: 0, ymax: 1, pasoY: 10, etiquetaX: etiqueta, etiquetaY: "", tamano: angosta ? 15 : 19, grilla: false });
    datos.forEach((v, i) => {
      piezas[`d${i}`] = punto({ plano: "linea", mx: v, my: 0.2 + 0.5 * (i * 0.618034 % 1), radio: angosta ? 6 : 8, color: "acento", opacidad: 0 });
    });
    piezas.intervalo = segmento({ plano: "linea", x1: m.media, y1: 0.12, x2: m.media, y2: 0.12, color: "exito", grosor: 9, opacidad: 0 });
    piezas.media = punto({ plano: "linea", mx: m.media, my: 0.12, radio: 11, color: "acento2", etiqueta: "x\u0304", lado: "arriba", opacidad: 0 });
    const f = campana(piezas, "campana", { gl: m.n - 1, limite: 4.2, ...camp, angosta });
    piezas.centro = area({ plano: "campana", f, desde: 0, hasta: 0, color: "exito", relleno: 0.35, etiqueta: pct(confianza), etiquetaY: 0.12 });
    piezas.colaIzq = area({ plano: "campana", f, desde: -4.3, hasta: -ic.critico, color: "error", relleno: 0.35, opacidad: 0 });
    piezas.colaDer = area({ plano: "campana", f, desde: ic.critico, hasta: 4.3, color: "error", relleno: 0.35, opacidad: 0 });
    piezas.critIzq = punto({ plano: "campana", mx: -ic.critico, my: 0, radio: 7, color: "error", etiqueta: `\u2212${numero(ic.critico, 3)}`, lado: "abajo", opacidad: 0 });
    piezas.critDer = punto({ plano: "campana", mx: ic.critico, my: 0, radio: 7, color: "error", etiqueta: numero(ic.critico, 3), lado: "abajo", opacidad: 0 });
    panel(piezas, ["cantidad", "promedio", "desvio", "error", "critico", "margen", "resultado"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const ids = datos.map((_, i) => `d${i}`);
    n.capitulo("La muestra");
    n.animar([
      { pieza: ids, a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.1, 1.6 / datos.length) },
      { pieza: "cantidad", a: { texto: `n = ${m.n} mediciones`, opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`Tenemos una muestra de ${m.n} mediciones de ${etiqueta}. Queremos estimar la media \u03BC de TODA la poblaci\xF3n, que no conocemos.`);
    n.animar([
      { pieza: "media", a: { opacidad: 1 }, dur: 0.5 },
      { pieza: "promedio", a: { texto: `x\u0304 = ${numero(m.media, 2)}${u}`, opacidad: 1, color: "acento2", peso: 700 }, dur: 0.4 },
      { pieza: "desvio", a: { texto: `s = ${numero(m.desvio, 2)}${u}`, opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`El promedio de la muestra es x\u0304 = ${numero(m.media, 2)}${u}. Es nuestra mejor estimaci\xF3n de \u03BC, pero con otras ${m.n} mediciones dar\xEDa otro n\xFAmero.`);
    n.capitulo("El error est\xE1ndar");
    n.animar({ pieza: "error", a: { texto: `EE = s / \u221An = ${numero(ic.error, 3)}`, opacidad: 1 }, dur: 0.4 });
    n.decir(`Cu\xE1nto cambia x\u0304 de una muestra a otra lo mide el error est\xE1ndar: s / \u221An = ${numero(ic.error, 3)}. Con m\xE1s datos, x\u0304 var\xEDa menos.`);
    n.capitulo("El valor cr\xEDtico");
    n.animar({ pieza: "campanaCurva", a: { trazo: 1 }, dur: 1.2 });
    n.decir(`Como s tambi\xE9n es una estimaci\xF3n, no se usa la normal sino la t de Student, con n \u2212 1 = ${m.n - 1} grados de libertad. Se parece a la normal, con colas un poco m\xE1s gordas.`);
    n.animar([
      { pieza: "centro", a: { desde: -ic.critico, hasta: ic.critico }, dur: 1.2 },
      { pieza: ["colaIzq", "colaDer"], a: { opacidad: 1 }, dur: 0.5, en: n.tiempo + 1 },
      { pieza: ["critIzq", "critDer"], a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1 },
      { pieza: "critico", a: { texto: `t = ${numero(ic.critico, 3)} (deja ${pct(ic.alfa / 2)} en cada cola)`, opacidad: 1 }, dur: 0.4, en: n.tiempo + 1 }
    ]);
    n.decir(`Buscamos el valor t que deja el ${pct(confianza)} del \xE1rea en el medio: ${numero(ic.critico, 3)}. Lo que queda, ${pct(ic.alfa)}, se reparte entre las dos colas.`);
    n.capitulo("El intervalo");
    n.animar([
      { pieza: "margen", a: { texto: `margen = t \xB7 EE = ${numero(ic.margen, 3)}`, opacidad: 1 }, dur: 0.4 },
      { pieza: "intervalo", a: { x1: ic.desde, x2: ic.hasta, opacidad: 1 }, dur: 1 },
      { pieza: "resultado", a: { texto: `IC ${pct(confianza)}: [${numero(ic.desde, 2)} ; ${numero(ic.hasta, 2)}]`, opacidad: 1, color: "exito", peso: 800 }, dur: 0.4 }
    ]);
    n.decir(`El margen es t por el error est\xE1ndar: ${numero(ic.margen, 3)}. El intervalo es x\u0304 \xB1 margen: de ${numero(ic.desde, 2)} a ${numero(ic.hasta, 2)}${u}.`);
    n.decir(`Ojo con c\xF3mo se dice: \u03BC no "tiene un ${pct(confianza)} de probabilidad" de estar ah\xED. \u03BC es un n\xFAmero fijo; lo que var\xEDa es el intervalo. El ${pct(confianza)} habla del m\xE9todo: de cada 100 muestras, unos ${numero(confianza * 100, 0)} intervalos atrapan a \u03BC.`);
    if (otro) {
      n.preguntar("confianza");
      n.capitulo(`Con ${pct(otraConfianza)}`);
      n.animar([
        { pieza: "centro", a: { desde: -otro.critico, hasta: otro.critico, etiqueta: pct(otraConfianza) }, dur: 1 },
        { pieza: "colaIzq", a: { hasta: -otro.critico }, dur: 1 },
        { pieza: "colaDer", a: { desde: otro.critico }, dur: 1 },
        { pieza: "critIzq", a: { mx: -otro.critico, etiqueta: `\u2212${numero(otro.critico, 3)}` }, dur: 1 },
        { pieza: "critDer", a: { mx: otro.critico, etiqueta: numero(otro.critico, 3) }, dur: 1 },
        { pieza: "critico", a: { texto: `t = ${numero(otro.critico, 3)} (deja ${pct(otro.alfa / 2)} en cada cola)` }, dur: 0.3 },
        { pieza: "margen", a: { texto: `margen = t \xB7 EE = ${numero(otro.margen, 3)}` }, dur: 0.3 },
        { pieza: "intervalo", a: { x1: otro.desde, x2: otro.hasta }, dur: 1 },
        { pieza: "resultado", a: { texto: `IC ${pct(otraConfianza)}: [${numero(otro.desde, 2)} ; ${numero(otro.hasta, 2)}]` }, dur: 0.3 }
      ]);
      n.decir(`Para estar m\xE1s seguros hay que abrir m\xE1s la red: con ${pct(otraConfianza)} el valor cr\xEDtico sube a ${numero(otro.critico, 3)} y el intervalo se estira, de ${numero(otro.desde, 2)} a ${numero(otro.hasta, 2)}. M\xE1s confianza, menos precisi\xF3n.`);
      n.decir("La \xFAnica forma de tener las dos cosas es juntar m\xE1s datos: el error est\xE1ndar se achica con \u221An.");
    }
    return {
      titulo: titulo || "Un intervalo de confianza",
      descripcion: descripcion || `El intervalo de confianza del ${pct(confianza)} para la media, con n = ${m.n}: de ${numero(ic.desde, 2)} a ${numero(ic.hasta, 2)}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeCobertura(opciones) {
  const {
    media,
    desvio,
    n: tam,
    muestras = 20,
    confianza = 0.95,
    otraConfianza = null,
    semilla = 7,
    etiqueta = "x",
    unidad = "",
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  const u = unidad ? ` ${unidad}` : "";
  const calcular = (conf) => Array.from({ length: muestras }, (_, i) => {
    const r3 = resumen(muestraNormal({ n: tam, media, desvio, semilla: semilla * 1e3 + i }));
    const ic = intervaloMedia({ media: r3.media, desvio: r3.desvio, n: tam, confianza: conf });
    return { ...ic, atrapa: ic.desde <= media && media <= ic.hasta };
  });
  const ics = calcular(confianza);
  const otros = otraConfianza ? calcular(otraConfianza) : null;
  const aciertos = (lista) => lista.filter((i) => i.atrapa).length;
  const ancho = Math.max(...(otros ?? ics).map((i) => Math.max(media - i.desde, i.hasta - media)));
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 320, y: arriba + 330, ancho: 600, alto: 640 } : { x: 560, y: arriba + 385, ancho: 1040, alto: 740 };
    const pan = angosta ? { x: 24, y: arriba + 700, ancho: 600, tamano: 23 } : { x: 1120, y: arriba + 110, ancho: 460, tamano: 28 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.plano = plano({
      ...pl,
      xmin: media - ancho * 1.15,
      xmax: media + ancho * 1.15,
      ymin: 0,
      ymax: muestras + 1.5,
      pasoY: 1e3,
      etiquetaX: etiqueta,
      etiquetaY: "",
      tamano: angosta ? 15 : 19,
      grilla: false
    });
    piezas.mu = recta({ plano: "plano", mx: media, my: 0, vertical: true, color: "acento2", progreso: 0, etiqueta: `\u03BC = ${numero(media)}`, grosor: 3 });
    ics.forEach((ic, i) => {
      const y = muestras - i;
      piezas[`i${i}`] = segmento({ plano: "plano", x1: ic.desde, y1: y, x2: ic.hasta, y2: y, progreso: 0, grosor: angosta ? 5 : 6, color: ic.atrapa ? "exito" : "error" });
      piezas[`m${i}`] = punto({ plano: "plano", mx: ic.centro, my: y, radio: angosta ? 5 : 6, color: "texto", opacidad: 0 });
    });
    panel(piezas, ["poblacion", "muestra", "cuenta", "otra"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo("La media de verdad");
    n.animar([
      { pieza: "mu", a: { progreso: 1 }, dur: 0.8 },
      { pieza: "poblacion", a: { texto: `Poblaci\xF3n: \u03BC = ${numero(media)}${u}`, opacidad: 1, color: "acento2", peso: 700 }, dur: 0.4 }
    ]);
    n.decir(`Hagamos trampa: imaginemos que conocemos la media de toda la poblaci\xF3n, \u03BC = ${numero(media)}${u}. En la vida real nunca la conocemos: por eso estimamos.`);
    n.capitulo("Una muestra, un intervalo");
    n.animar([
      { pieza: "m0", a: { opacidad: 1 }, dur: 0.3 },
      { pieza: "i0", a: { progreso: 1 }, dur: 0.8 },
      { pieza: "muestra", a: { texto: `n = ${tam} por muestra \xB7 IC ${pct(confianza)}`, opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`Sacamos una muestra de ${tam} y armamos su intervalo del ${pct(confianza)}: de ${numero(ics[0].desde, 1)} a ${numero(ics[0].hasta, 1)}. ${ics[0].atrapa ? "Este atrap\xF3 a \u03BC." : "Este no atrap\xF3 a \u03BC: pasa."}`);
    n.preguntar("cuantos");
    n.capitulo("Muchas muestras");
    const cada = Math.min(0.35, 7 / muestras);
    let llevados = 0;
    ics.forEach((ic, i) => {
      if (i === 0) {
        llevados += ic.atrapa ? 1 : 0;
        return;
      }
      const en = n.tiempo + (i - 1) * cada;
      n.linea.push({ pieza: `i${i}`, a: { progreso: 1 }, dur: 0.4, en }, { pieza: `m${i}`, a: { opacidad: 1 }, dur: 0.2, en: en + 0.2 });
      llevados += ic.atrapa ? 1 : 0;
      n.linea.push({ pieza: "cuenta", a: { texto: `Atraparon a \u03BC: ${llevados} de ${i + 1}`, opacidad: 1 }, dur: 0, en: en + 0.4 });
    });
    n.decir(`Repetimos con otras ${muestras - 1} muestras. Cada una da otro x\u0304 y otro intervalo: los verdes atrapan a \u03BC, los rojos no.`, 0);
    n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en + 0.6);
    const k = aciertos(ics);
    n.animar({ pieza: "cuenta", a: { texto: `Atraparon a \u03BC: ${k} de ${muestras} (${pct(k / muestras)})`, color: "exito", peso: 800 }, dur: 0.4 });
    n.capitulo(`Qu\xE9 quiere decir ${pct(confianza)}`);
    n.decir(`${k} de ${muestras}. Eso es el ${pct(confianza)}: no habla de UN intervalo, habla del m\xE9todo. Si lo repetimos much\xEDsimas veces, el ${pct(confianza)} de los intervalos atrapa a \u03BC.`);
    n.decir("Con una sola muestra, que es lo que pasa en la realidad, no sabemos si nos toc\xF3 uno verde o uno rojo. Confiamos en el m\xE9todo.");
    if (otros) {
      const k2 = aciertos(otros);
      n.capitulo(`Con ${pct(otraConfianza)}`);
      n.animar(otros.flatMap((ic, i) => [
        { pieza: `i${i}`, a: { x1: ic.desde, x2: ic.hasta, color: ic.atrapa ? "exito" : "error" }, dur: 1 }
      ]));
      n.animar({ pieza: "otra", a: { texto: `Con ${pct(otraConfianza)}: ${k2} de ${muestras}`, opacidad: 1, peso: 700 }, dur: 0.4 }, 1);
      n.decir(`Con ${pct(otraConfianza)} los mismos intervalos se estiran: ahora atrapan ${k2} de ${muestras}. M\xE1s seguridad, a cambio de intervalos m\xE1s anchos.`);
    }
    return {
      titulo: titulo || `Qu\xE9 quiere decir ${pct(confianza)}`,
      descripcion: descripcion || `${muestras} muestras de tama\xF1o ${tam}, cada una con su intervalo del ${pct(confianza)}: ${k} atrapan a la media verdadera.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeTest(opciones) {
  const { alfa = 0.05, cola = "dos", h0, h1, siRechaza, siNoRechaza, notas = [], titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  if (!h0 || !h1) throw new Error('desdeTest necesita las dos hip\xF3tesis: h0: "\u03BC = 50", h1: "\u03BC \u2260 50".');
  let test;
  let formula = opciones.formula;
  let cuenta = opciones.cuenta;
  if (opciones.estadistico != null) {
    test = decidir({ estadistico: opciones.estadistico, gl: opciones.gl ?? Infinity, alfa, cola });
    formula ??= "T";
    cuenta ??= `T = ${numero(test.estadistico, 3)}`;
  } else {
    const { media, desvio, n, mu0 } = opciones;
    if ([media, desvio, n, mu0].some((v) => v == null)) {
      throw new Error("desdeTest necesita la muestra (media, desvio, n, mu0) o el estad\xEDstico (estadistico, gl).");
    }
    test = testMedia({ media, desvio, n, mu0, alfa, cola });
    formula ??= "T = (x\u0304 \u2212 \u03BC\u2080) / (s / \u221An)";
    cuenta ??= `T = (${numero(media, 2)} \u2212 ${numero(mu0, 2)}) / (${numero(desvio, 2)} / \u221A${n}) = ${numero(test.estadistico, 3)}`;
  }
  const T = test.estadistico;
  const gl = test.gl;
  const limite = Math.min(7, Math.max(4.5, Math.abs(T) * 1.2, Math.abs(test.critico) * 1.4));
  const afuera = Math.abs(T) > limite * 0.94;
  const marca = afuera ? Math.sign(T) * limite * 0.94 : T;
  const nombreDist = Number.isFinite(gl) ? `t con ${numero(gl, 0)} grados de libertad` : "normal est\xE1ndar";
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const camp = angosta ? { x: 320, y: arriba + 230, ancho: 600, alto: 420 } : { x: 520, y: arriba + 360, ancho: 960, alto: 600 };
    const pan = angosta ? { x: 24, y: arriba + 500, ancho: 600, tamano: 22 } : { x: 1050, y: arriba + 90, ancho: 530, tamano: 26 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    const f = campana(piezas, "campana", { gl, limite, ...camp, angosta });
    const fuera = limite + 0.2;
    const c = Math.abs(test.critico);
    const zonas = cola === "dos" ? [[-fuera, -c], [c, fuera]] : cola === "derecha" ? [[c, fuera]] : [[-fuera, -c]];
    zonas.forEach(([a, b], i) => {
      piezas[`rechazo${i}`] = area({ plano: "campana", f, desde: a, hasta: b, color: "error", relleno: 0.3, opacidad: 0 });
    });
    const criticos = cola === "dos" ? [-c, c] : [test.critico];
    criticos.forEach((v, i) => {
      piezas[`crit${i}`] = punto({ plano: "campana", mx: v, my: 0, radio: 7, color: "error", etiqueta: numero(v, 3), lado: "abajo", opacidad: 0 });
    });
    const aT = Math.abs(T);
    const colasP = cola === "dos" ? [[-fuera, -aT], [aT, fuera]] : cola === "derecha" ? [[T, fuera]] : [[-fuera, T]];
    colasP.forEach(([a, b], i) => {
      piezas[`p${i}`] = area({ plano: "campana", f, desde: a, hasta: b, color: "acento2", relleno: 0.55, opacidad: 0 });
    });
    piezas.guia = segmento({ plano: "campana", x1: 0, y1: 0, x2: 0, y2: 0.42, color: "acento2", grosor: 3, punteada: true, opacidad: 0 });
    piezas.T = punto({
      plano: "campana",
      mx: 0,
      my: 0,
      radio: 11,
      color: "acento2",
      lado: "arriba",
      opacidad: 0,
      etiqueta: afuera ? `T = ${numero(T, 2)} ${T > 0 ? "\u2192" : "\u2190"}` : `T = ${numero(T, 2)}`
    });
    panel(piezas, ["h0", "h1", "regla", "formula", "cuenta", "pvalor", "decision"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo("Las hip\xF3tesis");
    n.animar([
      { pieza: "h0", a: { texto: `H\u2080: ${h0}`, opacidad: 1, peso: 700 }, dur: 0.4 },
      { pieza: "h1", a: { texto: `H\u2081: ${h1}`, opacidad: 1, peso: 700 }, dur: 0.4, en: n.tiempo + 0.6 }
    ]);
    n.decir(`H\u2080 es la hip\xF3tesis de "no pasa nada": ${h0}. H\u2081 es lo que queremos ver si hay evidencia para afirmar: ${h1}.`);
    n.decir("El test funciona como un juicio: se supone H\u2080 y solo se la rechaza si los datos son muy dif\xEDciles de explicar con ella.");
    n.capitulo("Si H\u2080 fuera cierta");
    n.animar({ pieza: "campanaCurva", a: { trazo: 1 }, dur: 1.2 });
    n.decir(`Si H\u2080 es cierta, el estad\xEDstico sigue una ${nombreDist}: casi siempre cae cerca de 0.`);
    n.animar([
      { pieza: zonas.map((_, i) => `rechazo${i}`), a: { opacidad: 1 }, dur: 0.6 },
      { pieza: criticos.map((_, i) => `crit${i}`), a: { opacidad: 1 }, dur: 0.4 },
      {
        pieza: "regla",
        a: { texto: cola === "dos" ? `\u03B1 = ${numero(alfa, 3)}: rechazo si |T| > ${numero(c, 3)}` : `\u03B1 = ${numero(alfa, 3)}: rechazo si T ${cola === "derecha" ? ">" : "<"} ${numero(test.critico, 3)}`, opacidad: 1, color: "error" },
        dur: 0.4
      }
    ]);
    n.decir(cola === "dos" ? `Las zonas rojas suman \u03B1 = ${numero(alfa, 3)}: ${pct(alfa / 2)} en cada cola. Si H\u2080 es cierta, caer ah\xED es muy raro. Los bordes son \xB1${numero(c, 3)}, el valor cr\xEDtico de la tabla.` : `La zona roja tiene \xE1rea \u03B1 = ${numero(alfa, 3)}. Si H\u2080 es cierta, caer ah\xED es muy raro. Su borde, ${numero(test.critico, 3)}, es el valor cr\xEDtico.`);
    n.preguntar("decision");
    n.capitulo("El estad\xEDstico");
    n.animar([
      { pieza: "formula", a: { texto: formula, opacidad: 1 }, dur: 0.4 },
      { pieza: "cuenta", a: { texto: cuenta, opacidad: 1, color: "acento2", peso: 700 }, dur: 0.4, en: n.tiempo + 0.5 },
      { pieza: ["T", "guia"], a: { opacidad: 1 }, dur: 0.3, en: n.tiempo + 1 },
      { pieza: "T", a: { mx: marca }, dur: 1.4, en: n.tiempo + 1.3 },
      { pieza: "guia", a: { x1: marca, x2: marca }, dur: 1.4, en: n.tiempo + 1.3 }
    ]);
    n.decir(afuera ? `Con los datos, T = ${numero(T, 2)}. Est\xE1 tan lejos que ni entra en el dibujo: la campana, a esa distancia, es pr\xE1cticamente cero.` : `Con los datos, T = ${numero(T, 2)}. ${test.rechaza ? "Cay\xF3 en la zona roja." : "Cay\xF3 en la zona blanca, la de lo esperable."}`);
    n.capitulo("El p-valor");
    n.animar([
      { pieza: colasP.map((_, i) => `p${i}`), a: { opacidad: 1 }, dur: 0.6 },
      { pieza: "pvalor", a: { texto: `p-valor = ${pValor(test.pValor)}`, opacidad: 1, color: "acento2", peso: 700 }, dur: 0.4 }
    ]);
    n.decir(`El p-valor es el \xE1rea ${cola === "dos" ? "de las dos colas" : "de la cola"} m\xE1s all\xE1 de T: la probabilidad de ver algo tan extremo como esto, o m\xE1s, si H\u2080 fuera cierta. Da ${pValor(test.pValor)}.`);
    n.decir(test.rechaza ? `Como es menor que \u03B1 = ${numero(alfa, 3)}, llegamos a lo mismo que con la zona roja: los dos caminos siempre coinciden.` : `Como es mayor que \u03B1 = ${numero(alfa, 3)}, llegamos a lo mismo que con la zona roja: los dos caminos siempre coinciden.`);
    n.capitulo("La decisi\xF3n");
    n.animar({
      pieza: "decision",
      a: { texto: test.rechaza ? "Se rechaza H\u2080" : "No se rechaza H\u2080", opacidad: 1, color: test.rechaza ? "exito" : "alerta", peso: 800 },
      dur: 0.4
    });
    n.decir(test.rechaza ? siRechaza : siNoRechaza);
    if (!test.rechaza) n.decir("No rechazar H\u2080 no prueba que sea cierta: solo dice que estos datos no alcanzan para descartarla.");
    for (const nota of notas) n.decir(nota);
    return {
      titulo: titulo || "Un test de hip\xF3tesis",
      descripcion: descripcion || `H\u2080: ${h0} contra H\u2081: ${h1}. T = ${numero(T, 3)}, p-valor ${pValor(test.pValor)}: ${test.rechaza ? "se rechaza" : "no se rechaza"} H\u2080 con \u03B1 = ${numero(alfa, 3)}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeVariabilidad(opciones) {
  const { datos, etiquetaX = "x", etiquetaY = "y", titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const r3 = inferenciaRegresion(datos);
  const rango = opciones.rango ?? rangoDatos(datos);
  const destacar = opciones.destacar ?? datos.reduce((mejor, [, y], i) => Math.abs(y - r3.mediaY) > Math.abs(datos[mejor][1] - r3.mediaY) ? i : mejor, 0);
  const [xd, yd] = datos[destacar];
  const yhat = r3.prediccion(xd);
  const corrida = (rango.xmax - rango.xmin) * 0.012;
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 320, y: arriba + 280, ancho: 600, alto: 540 } : { x: 500, y: arriba + 380, ancho: 900, alto: 730 };
    const pan = angosta ? { x: 24, y: arriba + 600, ancho: 600, tamano: 22 } : { x: 1e3, y: arriba + 90, ancho: 580, tamano: 27 };
    const barra = angosta ? { x: 24, y: arriba + 990, ancho: 592, alto: 44 } : { x: 1e3, y: arriba + 640, ancho: 560, alto: 56 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.plano = plano({ ...pl, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 15 : 19 });
    piezas.promedio = recta({ plano: "plano", mx: r3.mediaX, my: r3.mediaY, pendiente: 0, color: "suave", punteada: true, progreso: 0, etiqueta: "\u0233" });
    piezas.recta = recta({ plano: "plano", mx: r3.mediaX, my: r3.mediaY, pendiente: r3.b1, color: "acento2", progreso: 0, etiqueta: "\u0177" });
    datos.forEach(([x, y], i) => {
      const yh = r3.prediccion(x);
      piezas[`exp${i}`] = segmento({ plano: "plano", x1: x, y1: r3.mediaY, x2: x, y2: yh, color: "exito", grosor: 2.5, opacidad: 0 });
      piezas[`res${i}`] = segmento({ plano: "plano", x1: x, y1: yh, x2: x, y2: y, color: "error", grosor: 2.5, opacidad: 0 });
    });
    datos.forEach(([x, y], i) => {
      piezas[`d${i}`] = punto({ plano: "plano", mx: x, my: y, radio: angosta ? 5 : 7, color: "acento", opacidad: 0 });
    });
    piezas.total = segmento({ plano: "plano", x1: xd - corrida * 2.5, y1: r3.mediaY, x2: xd - corrida * 2.5, y2: yd, color: "texto", grosor: 5, progreso: 0, etiqueta: "" });
    piezas.expD = segmento({ plano: "plano", x1: xd + corrida * 2.5, y1: r3.mediaY, x2: xd + corrida * 2.5, y2: yhat, color: "exito", grosor: 5, progreso: 0 });
    piezas.resD = segmento({ plano: "plano", x1: xd + corrida * 2.5, y1: yhat, x2: xd + corrida * 2.5, y2: yd, color: "error", grosor: 5, progreso: 0 });
    piezas.destacado = punto({ plano: "plano", mx: xd, my: yd, radio: 10, color: "acento", resaltado: 0, opacidad: 0 });
    panel(piezas, ["identidad", "stc", "scr", "sce", "suma", "r2", "sigma"], pan);
    const parte = r3.scr / r3.stc;
    piezas.barraExp = caja({ x: barra.x, y: barra.y + barra.alto / 2, ancho: 1, alto: barra.alto, radio: 6, relleno: "exito", borde: "exito", grosorBorde: 0, opacidad: 0 });
    piezas.barraErr = caja({ x: barra.x + barra.ancho, y: barra.y + barra.alto / 2, ancho: 1, alto: barra.alto, radio: 6, relleno: "error", borde: "error", grosorBorde: 0, opacidad: 0 });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const ids = datos.map((_, i) => `d${i}`);
    n.capitulo("Los datos y la recta");
    n.animar([
      { pieza: ids, a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.08, 1.5 / datos.length) },
      { pieza: "promedio", a: { progreso: 1 }, dur: 0.8, en: n.tiempo + 0.8 },
      { pieza: "recta", a: { progreso: 1 }, dur: 0.8, en: n.tiempo + 1.4 }
    ]);
    n.decir(`La l\xEDnea punteada es el promedio \u0233 = ${numero(r3.mediaY, 2)}; la otra, la recta de m\xEDnimos cuadrados. La pregunta es cu\xE1nto mejor que el promedio predice la recta.`);
    n.capitulo("Un punto");
    n.animar([
      { pieza: "destacado", a: { opacidad: 1, resaltado: 1 }, dur: 0.5 },
      { pieza: "total", a: { progreso: 1 }, dur: 0.8, en: n.tiempo + 0.4 },
      { pieza: "identidad", a: { texto: "y \u2212 \u0233 = (\u0177 \u2212 \u0233) + (y \u2212 \u0177)", opacidad: 1, peso: 700 }, dur: 0.4 }
    ]);
    n.decir(`Este punto est\xE1 a ${numero(yd - r3.mediaY, 2)} del promedio: es la desviaci\xF3n total, y \u2212 \u0233.`);
    n.animar([
      { pieza: "expD", a: { progreso: 1 }, dur: 0.7 },
      { pieza: "resD", a: { progreso: 1 }, dur: 0.7, en: n.tiempo + 0.8 }
    ]);
    n.decir(`Se parte en dos: lo que la recta explica, \u0177 \u2212 \u0233 = ${numero(yhat - r3.mediaY, 2)} (verde), y lo que queda sin explicar, el residuo y \u2212 \u0177 = ${numero(yd - yhat, 2)} (rojo).`);
    n.capitulo("Todos los puntos");
    n.animar([
      { pieza: ["total", "expD", "resD"], a: { opacidad: 0 }, dur: 0.4 },
      { pieza: "destacado", a: { resaltado: 0 }, dur: 0.4 },
      { pieza: datos.map((_, i) => `exp${i}`), a: { opacidad: 0.8 }, dur: 0.4, escalonar: 0.02 },
      { pieza: datos.map((_, i) => `res${i}`), a: { opacidad: 0.8 }, dur: 0.4, escalonar: 0.02, en: n.tiempo + 0.8 }
    ]);
    n.decir("Hacemos lo mismo con todos, elevamos al cuadrado y sumamos. Lo bueno es que la cuenta cierra tambi\xE9n con los cuadrados.");
    n.animar([
      { pieza: "stc", a: { texto: `STC = \u03A3(y \u2212 \u0233)\xB2 = ${numero(r3.stc, 2)}`, opacidad: 1 }, dur: 0.4 },
      { pieza: "scr", a: { texto: `SCR = \u03A3(\u0177 \u2212 \u0233)\xB2 = ${numero(r3.scr, 2)}`, opacidad: 1, color: "exito" }, dur: 0.4, en: n.tiempo + 0.6 },
      { pieza: "sce", a: { texto: `SCE = \u03A3(y \u2212 \u0177)\xB2 = ${numero(r3.sce, 2)}`, opacidad: 1, color: "error" }, dur: 0.4, en: n.tiempo + 1.2 },
      { pieza: "suma", a: { texto: `${numero(r3.scr, 2)} + ${numero(r3.sce, 2)} = ${numero(r3.scr + r3.sce, 2)} \u2713`, opacidad: 1, color: "exito" }, dur: 0.4, en: n.tiempo + 1.8 },
      { pieza: ["barraExp", "barraErr"], a: { opacidad: 1 }, dur: 0.3, en: n.tiempo + 2.2 },
      { pieza: "barraExp", a: { ancho: barra.ancho * parte, x: barra.x + barra.ancho * parte / 2 }, dur: 1, en: n.tiempo + 2.2 },
      { pieza: "barraErr", a: { ancho: barra.ancho * (1 - parte), x: barra.x + barra.ancho * parte + barra.ancho * (1 - parte) / 2 }, dur: 1, en: n.tiempo + 2.2 }
    ]);
    n.decir(`STC = SCR + SCE: la variabilidad total es la que explica la regresi\xF3n m\xE1s la que queda en los errores. Ac\xE1, ${numero(r3.stc, 2)} = ${numero(r3.scr, 2)} + ${numero(r3.sce, 2)}.`);
    n.decir("Que cierre no es casualidad: pasa porque los residuos de m\xEDnimos cuadrados suman cero y no tienen relaci\xF3n con x. Por eso al verificarlo con los datos tiene que dar exacto, salvo redondeo.");
    n.preguntar("r2");
    n.capitulo("R\xB2 y la varianza");
    n.animar({ pieza: "r2", a: { texto: `R\xB2 = 1 \u2212 SCE/STC = ${numero(r3.r2, 4)}`, opacidad: 1, peso: 800, color: "acento2" }, dur: 0.4 });
    n.decir(`R\xB2 es la parte verde de la barra: 1 \u2212 SCE/STC = ${numero(r3.r2, 4)}. La recta explica el ${pct(r3.r2)} de la variabilidad de ${etiquetaY}.`);
    n.animar({ pieza: "sigma", a: { texto: `\u03C3\u0302\xB2 = SCE / (n \u2212 2) = ${numero(r3.sigma2, 3)}`, opacidad: 1 }, dur: 0.4 });
    n.decir(`Y con lo que queda en los errores se estima la varianza del modelo: \u03C3\u0302\xB2 = SCE / (n \u2212 2) = ${numero(r3.sigma2, 3)}. Se divide por n \u2212 2 porque para calcular los residuos ya se estimaron dos n\xFAmeros, b\u2080 y b\u2081.`);
    n.capitulo("Lo que R\xB2 NO dice");
    n.decir(`R\xB2 no dice que ${etiquetaX} cause ${etiquetaY}: una correlaci\xF3n alta puede venir de una tercera variable que mueve a las dos.`);
    n.decir("Tampoco dice que la recta sea el modelo correcto: una curva clar\xEDsima puede dar un R\xB2 alto igual. Para eso hay que mirar el gr\xE1fico de los residuos.");
    n.decir("Y no dice qu\xE9 tan precisa es una predicci\xF3n en las unidades del problema: eso lo dice \u03C3\u0302, o el intervalo de predicci\xF3n.");
    return {
      titulo: titulo || "STC = SCR + SCE",
      descripcion: descripcion || `La descomposici\xF3n de la variabilidad de una regresi\xF3n con ${r3.n} puntos: STC = ${numero(r3.stc, 2)}, SCR = ${numero(r3.scr, 2)}, SCE = ${numero(r3.sce, 2)}, R\xB2 = ${numero(r3.r2, 4)}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeBandas(opciones) {
  const { datos, xEstrella, confianza = 0.95, etiquetaX = "x", etiquetaY = "y", unidadY = "", titulo = "", descripcion = "", ritmo = 1, lectura = 13, preguntas = {} } = opciones;
  const r3 = inferenciaRegresion(datos, { confianza });
  const rango = opciones.rango ?? rangoDatos(datos);
  const icm = r3.icm(xEstrella);
  const ip = r3.ip(xEstrella);
  const u = unidadY ? ` ${unidadY}` : "";
  const xs = datos.map(([x]) => x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const intervalo = (i) => `[${numero(i.desde, 2)} ; ${numero(i.hasta, 2)}]`;
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 320, y: arriba + 280, ancho: 600, alto: 540 } : { x: 500, y: arriba + 380, ancho: 900, alto: 730 };
    const pan = angosta ? { x: 24, y: arriba + 600, ancho: 600, tamano: 21 } : { x: 990, y: arriba + 90, ancho: 590, tamano: 25 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.plano = plano({ ...pl, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 15 : 19 });
    piezas.bandaIP = area({ plano: "plano", f: (x) => r3.ip(x).hasta, g: (x) => r3.ip(x).desde, desde: x0, hasta: x0, color: "alerta", relleno: 0.16, borde: false });
    piezas.bandaICM = area({ plano: "plano", f: (x) => r3.icm(x).hasta, g: (x) => r3.icm(x).desde, desde: x0, hasta: x0, color: "acento2", relleno: 0.4, borde: false });
    datos.forEach(([x, y], i) => {
      piezas[`d${i}`] = punto({ plano: "plano", mx: x, my: y, radio: angosta ? 5 : 7, color: "acento", opacidad: 0 });
    });
    piezas.recta = recta({ plano: "plano", mx: r3.mediaX, my: r3.mediaY, pendiente: r3.b1, color: "acento2", progreso: 0 });
    piezas.vertical = recta({ plano: "plano", mx: xEstrella, my: 0, vertical: true, color: "suave", punteada: true, progreso: 0, grosor: 2, etiqueta: `x* = ${numero(xEstrella)}` });
    piezas.ip = segmento({ plano: "plano", x1: xEstrella, y1: ip.centro, x2: xEstrella, y2: ip.centro, color: "alerta", grosor: 7, opacidad: 0 });
    piezas.icm = segmento({ plano: "plano", x1: xEstrella, y1: icm.centro, x2: xEstrella, y2: icm.centro, color: "acento2", grosor: 13, opacidad: 0 });
    piezas.yhat = punto({ plano: "plano", mx: xEstrella, my: icm.centro, radio: 8, color: "texto", opacidad: 0, etiqueta: "\u0177*", lado: "izquierda" });
    panel(piezas, ["estimacion", "formulaICM", "textoICM", "formulaIP", "textoIP", "limite"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const t0 = () => n.tiempo;
    n.capitulo("La recta en x*");
    n.animar([
      { pieza: datos.map((_, i) => `d${i}`), a: { opacidad: 1 }, dur: 0.3, escalonar: Math.min(0.06, 1.2 / datos.length) },
      { pieza: "recta", a: { progreso: 1 }, dur: 0.8, en: t0() + 0.8 },
      { pieza: "vertical", a: { progreso: 1 }, dur: 0.6, en: t0() + 1.4 },
      { pieza: "yhat", a: { opacidad: 1 }, dur: 0.4, en: t0() + 1.8 },
      {
        pieza: "estimacion",
        a: { texto: `\u0177* = ${numero(r3.b0, 3)} + ${numero(r3.b1, 3)} \xB7 ${numero(xEstrella)} = ${numero(icm.centro, 3)}${u}`, opacidad: 1, peso: 700 },
        dur: 0.4,
        en: t0() + 1.8
      }
    ]);
    n.decir(`En x* = ${numero(xEstrella)} la recta da \u0177* = ${numero(icm.centro, 3)}${u}. Pero la recta sali\xF3 de una muestra: con otros datos ser\xEDa otra. \xBFQu\xE9 tan seguros estamos?`);
    n.decir("Hay dos preguntas distintas, y cada una tiene su intervalo.");
    n.capitulo("La respuesta media");
    n.animar({ pieza: "formulaICM", a: { texto: "ICM: \u0177* \xB1 t \xB7 \u221A(\u03C3\u0302\xB2 (1/n + (x* \u2212 x\u0304)\xB2/Sxx))", opacidad: 1 }, dur: 0.4 });
    n.animar({ pieza: "icm", a: { opacidad: 1, y1: icm.desde, y2: icm.hasta }, dur: 0.8 }, 0.4);
    n.animar({ pieza: "textoICM", a: { texto: `ICM ${pct(confianza)}: ${intervalo(icm)}`, opacidad: 1, color: "acento2", peso: 700 }, dur: 0.4 }, 0.8);
    n.decir(`La primera: \xBFd\xF3nde est\xE1 la recta VERDADERA en x*? Es decir, el consumo promedio de todos los casos con x = ${numero(xEstrella)}. Ese es el intervalo de confianza para la respuesta media: ${intervalo(icm)}.`);
    n.animar({ pieza: "bandaICM", a: { hasta: x1 }, dur: 1.6 });
    n.decir("Si lo calculamos para cada x, queda una banda. Es m\xE1s angosta cerca de x\u0304 y se abre hacia los costados: lejos del centro de los datos, un error chico en la pendiente pesa m\xE1s.");
    n.preguntar("ancho");
    n.capitulo("Un valor nuevo");
    n.animar({ pieza: "formulaIP", a: { texto: "IP: \u0177* \xB1 t \xB7 \u221A(\u03C3\u0302\xB2 (1 + 1/n + (x* \u2212 x\u0304)\xB2/Sxx))", opacidad: 1 }, dur: 0.4 });
    n.animar({ pieza: "ip", a: { opacidad: 1, y1: ip.desde, y2: ip.hasta }, dur: 0.8 }, 0.4);
    n.animar({ pieza: "textoIP", a: { texto: `IP ${pct(confianza)}: ${intervalo(ip)}`, opacidad: 1, color: "alerta", peso: 700 }, dur: 0.4 }, 0.8);
    n.decir(`La segunda: \xBFd\xF3nde va a caer UNA observaci\xF3n nueva con x = ${numero(xEstrella)}? Es el intervalo de predicci\xF3n: ${intervalo(ip)}. Es mucho m\xE1s ancho.`);
    n.animar({ pieza: "bandaIP", a: { hasta: x1 }, dur: 1.6 });
    n.decir("La diferencia es el 1 de adentro de la ra\xEDz: adem\xE1s de no saber d\xF3nde est\xE1 la recta, cada valor se aparta de ella por su cuenta, con varianza \u03C3\xB2. Por eso la banda de predicci\xF3n abarca a casi todos los puntos.");
    n.capitulo("Con much\xEDsimos datos");
    n.animar({ pieza: "limite", a: { texto: `n \u2192 \u221E: ICM \u2192 0;  IP \u2192 \xB1 t\xB7\u03C3\u0302 \u2248 \xB1 ${numero(r3.critico * r3.sigma, 2)}`, opacidad: 1 }, dur: 0.4 });
    n.decir("Si juntamos cada vez m\xE1s datos, 1/n y (x* \u2212 x\u0304)\xB2/Sxx se van a cero: la banda de confianza se cierra sobre la recta. La de predicci\xF3n no: le queda el 1, la variabilidad propia de cada caso.");
    n.decir("Con miles de datos, la recta media se conoce casi exacta; un caso individual sigue siendo tan incierto como siempre.");
    return {
      titulo: titulo || "Intervalo de confianza y de predicci\xF3n",
      descripcion: descripcion || `En x* = ${numero(xEstrella)}: \u0177* = ${numero(icm.centro, 3)}, ICM ${intervalo(icm)} e IP ${intervalo(ip)}, al ${pct(confianza)}.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeTasas(opciones) {
  const {
    f,
    inicio,
    tasas,
    pasos = 20,
    etiquetaX = "x",
    etiquetaY = "y",
    minimo = null,
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  if (!Array.isArray(tasas) || !tasas.length) throw new Error('desdeTasas necesita las tasas: tasas: [{ tasa: 0.01, nombre: "chica" }, ...].');
  const corridas = tasas.map((t) => ({ ...t, ...descensoGradiente(f, { inicio, tasa: t.tasa, pasos, gradiente: opciones.gradiente, tolerancia: 0 }) }));
  const rango = opciones.rango ?? { xmin: -4, xmax: 4, ymin: -4, ymax: 4 };
  const niveles = opciones.niveles ?? nivelesAutomaticos(f, rango);
  const f0 = f(inicio[0], inicio[1]);
  const fmin = minimo ? f(minimo[0], minimo[1]) : Math.min(...corridas.flatMap((c) => c.puntos.map((p) => p.z)));
  const COLORES = ["suave", "exito", "error", "acento"];
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const izq = angosta ? { x: 320, y: arriba + 250, ancho: 480, alto: 480 } : { x: 400, y: arriba + 380, ancho: 700, alto: 700 };
    const der = angosta ? { x: 320, y: arriba + 720, ancho: 600, alto: 380 } : { x: 1190, y: arriba + 300, ancho: 720, alto: 520 };
    const pan = angosta ? { x: 24, y: arriba + 935, ancho: 600, tamano: 20, interlineado: 1.8 } : { x: 840, y: arriba + 610, ancho: 740, tamano: 24, interlineado: 1.9 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.mapa = plano({ ...izq, ...rango, etiquetaX, etiquetaY, tamano: angosta ? 14 : 18 });
    piezas.curvas = curvasNivel({ plano: "mapa", f, niveles, progreso: 0 });
    piezas.costo = plano({ ...der, xmin: 0, xmax: pasos, ymin: 0, ymax: f0 * 1.25, etiquetaX: "k", etiquetaY: "f", tamano: angosta ? 14 : 18 });
    piezas.inicio = punto({ plano: "mapa", mx: inicio[0], my: inicio[1], radio: 9, color: "texto", opacidad: 0, etiqueta: "inicio" });
    if (minimo) piezas.minimo = punto({ plano: "mapa", mx: minimo[0], my: minimo[1], radio: 8, color: "acento2", opacidad: 0, etiqueta: "m\xEDnimo", lado: "abajo-derecha" });
    corridas.forEach((c, i) => {
      const color = COLORES[i % COLORES.length];
      piezas[`camino${i}`] = grafica({ plano: "mapa", datos: c.puntos.map((p) => [p.x, p.y]), trazo: 0, color, grosor: 3.5 });
      piezas[`curva${i}`] = grafica({ plano: "costo", datos: c.puntos.map((p, k) => [k, p.z]), trazo: 0, color, grosor: 4, etiqueta: `\u03B1 = ${numero(c.tasa, 4)}` });
    });
    panel(piezas, corridas.map((_, i) => `texto${i}`).concat("criterio"), pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo("El terreno");
    n.animar([
      { pieza: "curvas", a: { progreso: niveles.length }, dur: 1.6 },
      { pieza: "inicio", a: { opacidad: 1 }, dur: 0.4 },
      ...minimo ? [{ pieza: "minimo", a: { opacidad: 1 }, dur: 0.4 }] : []
    ]);
    n.decir("A la izquierda, las curvas de nivel de la funci\xF3n que queremos minimizar. Todas las corridas arrancan del mismo punto.");
    n.decir("Cada paso hace b \u2190 b \u2212 \u03B1 \u2207f(b): el gradiente apunta hacia donde f sube m\xE1s r\xE1pido, as\xED que restarlo es bajar por la pendiente m\xE1s empinada. \u03B1 decide qu\xE9 tan largo es el paso.");
    corridas.forEach((c, i) => {
      if (i === corridas.length - 1) n.preguntar("grande");
      n.capitulo(`\u03B1 = ${numero(c.tasa, 4)} (${c.nombre})`);
      const final = c.puntos.at(-1);
      const durTrazo = 2.4;
      n.animar([
        { pieza: `camino${i}`, a: { trazo: 1 }, dur: durTrazo, curva: "lineal" },
        { pieza: `curva${i}`, a: { trazo: 1 }, dur: durTrazo, curva: "lineal" }
      ]);
      const resumenTexto = c.motivo === "diverge" ? `\u03B1 = ${numero(c.tasa, 4)}: diverge (f se dispara en la iteraci\xF3n ${c.puntos.length})` : `\u03B1 = ${numero(c.tasa, 4)}: f = ${numero(final.z, 4)} en ${c.puntos.length - 1} iteraciones`;
      n.animar({ pieza: `texto${i}`, a: { texto: resumenTexto, opacidad: 1, color: COLORES[i % COLORES.length], peso: 700 }, dur: 0.4 }, durTrazo);
      const sube = c.puntos.length > 1 && c.puntos.at(-1).z > c.puntos[0].z;
      if (c.motivo === "diverge" || sube) {
        n.decir(`Con \u03B1 = ${numero(c.tasa, 4)} el paso es tan largo que se pasa del otro lado del valle, cada vez m\xE1s arriba. f crece en vez de bajar: el algoritmo diverge.`);
      } else if (final.z - fmin > (f0 - fmin) * 0.03) {
        n.decir(`Con \u03B1 = ${numero(c.tasa, 4)} va en la direcci\xF3n correcta, pero con pasitos tan cortos que despu\xE9s de ${c.puntos.length - 1} iteraciones sigue lejos del m\xEDnimo. Converge, pero lent\xEDsimo.`);
      } else {
        n.decir(`Con \u03B1 = ${numero(c.tasa, 4)} baja r\xE1pido y se acomoda en el fondo del valle: f cae casi a su m\xEDnimo en pocas iteraciones.`);
      }
    });
    n.capitulo("Cu\xE1ndo parar");
    n.animar({ pieza: "criterio", a: { texto: "Parar cuando \u2016\u2207f\u2016 < \u03B5, o cuando f casi no cambia, o al llegar a un m\xE1ximo de iteraciones.", opacidad: 1 }, dur: 0.4 });
    n.decir("Hace falta un criterio de detenci\xF3n: cortar cuando el gradiente es casi cero (estamos en el fondo), cuando f deja de bajar, o al llegar a un tope de iteraciones por si diverge.");
    if (minimo) n.decir(`Al final se compara con la soluci\xF3n exacta de m\xEDnimos cuadrados, (${numero(minimo[0], 3)}, ${numero(minimo[1], 3)}): con una buena tasa, tienen que coincidir en varios decimales.`);
    n.decir("Un detalle que cambia todo: si las variables tienen escalas muy distintas (segundos contra porcentajes, por ejemplo), las curvas de nivel quedan largu\xEDsimas y no hay una tasa que sirva para todas. Por eso se suelen estandarizar antes.");
    return {
      titulo: titulo || "Tres tasas de aprendizaje",
      descripcion: descripcion || `El descenso del gradiente desde el mismo punto con \u03B1 = ${corridas.map((c) => numero(c.tasa, 4)).join(", ")}, y f en funci\xF3n de la iteraci\xF3n.`,
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
  aPixelPlano,
  analizarCuenta,
  area,
  campo,
  cocienteIncremental,
  curvaDeNivel,
  curvasNivel,
  decidir,
  derivada,
  descensoGradiente,
  desdeBandas,
  desdeCobertura,
  desdeDerivada,
  desdeDescenso,
  desdeEuclides,
  desdeIntervalo,
  desdeModulo,
  desdeRegresion,
  desdeRelacion,
  desdeTasas,
  desdeTest,
  desdeVariabilidad,
  euclides,
  gradiente,
  grafica,
  inferenciaRegresion,
  intervaloMedia,
  matrizRelacion,
  minimosCuadrados,
  modulo,
  muestraNormal,
  normal,
  normalAcumulada,
  normalInversa,
  numero,
  pasoLindo,
  plano,
  propiedadesRelacion,
  punto,
  recta,
  regresionLineal,
  resumen,
  segmento,
  student,
  studentAcumulada,
  studentInversa,
  sumaResiduos,
  testMedia,
  valorCritico,
  vector
};

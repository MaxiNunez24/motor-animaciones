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

// src/finanzas/calculo.js
var DIAS_HABILES = 252;
function valorFuturo(monto, r3, T, veces = Infinity) {
  if (veces === Infinity) return monto * Math.exp(r3 * T);
  return monto * (1 + r3 / veces) ** (veces * T);
}
function valorPresente(monto, r3, T) {
  return monto * Math.exp(-r3 * T);
}
function caminoPrecio({ S0, mu = 0.08, sigma, dias, semilla = 1 }) {
  const z = normalesConSemilla(dias, semilla);
  const dt = 1 / DIAS_HABILES;
  const precios = [S0];
  for (let i = 0; i < dias; i++) {
    precios.push(precios[i] * Math.exp((mu - sigma * sigma / 2) * dt + sigma * Math.sqrt(dt) * z[i]));
  }
  return precios;
}
function normalesConSemilla(n, semilla = 1) {
  const r3 = azar(semilla);
  return Array.from({ length: n }, () => {
    const u = 1 - r3.siguiente();
    const v = r3.siguiente();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  });
}
function rendimientos(precios, { logaritmicos = true } = {}) {
  return precios.slice(1).map((p, i) => logaritmicos ? Math.log(p / precios[i]) : (p - precios[i]) / precios[i]);
}
function volatilidad(precios, porAnio = DIAS_HABILES) {
  const r3 = rendimientos(precios);
  const m = r3.reduce((a, b) => a + b, 0) / r3.length;
  const varianza = r3.reduce((a, b) => a + (b - m) ** 2, 0) / (r3.length - 1);
  return Math.sqrt(varianza * porAnio);
}
function pagoAlVencer(tipo, S, K) {
  return tipo === "put" ? Math.max(K - S, 0) : Math.max(S - K, 0);
}
function blackScholes({ S, K, T, r: r3, sigma, tipo = "call" }) {
  const descuento = Math.exp(-r3 * Math.max(T, 0));
  if (!(T > 0) || !(sigma > 0)) {
    const adelante = S / descuento;
    return {
      precio: descuento * pagoAlVencer(tipo, adelante, K),
      d1: adelante > K ? Infinity : -Infinity,
      d2: adelante > K ? Infinity : -Infinity,
      Nd1: adelante > K ? 1 : 0,
      Nd2: adelante > K ? 1 : 0,
      descuento
    };
  }
  const raiz = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r3 + sigma * sigma / 2) * T) / raiz;
  const d2 = d1 - raiz;
  const Nd1 = normalAcumulada(d1);
  const Nd2 = normalAcumulada(d2);
  const precio = tipo === "put" ? K * descuento * normalAcumulada(-d2) - S * normalAcumulada(-d1) : S * Nd1 - K * descuento * Nd2;
  return { precio, d1, d2, Nd1, Nd2, descuento };
}
function griegas({ S, K, T, r: r3, sigma, tipo = "call" }) {
  if (!(T > 0) || !(sigma > 0)) {
    const enDinero = tipo === "put" ? S < K : S > K;
    return { delta: enDinero ? tipo === "put" ? -1 : 1 : 0, gamma: 0, theta: 0, thetaAnual: 0, vega: 0, vegaEntera: 0, rho: 0, rhoEntera: 0 };
  }
  const { d1, d2, descuento } = blackScholes({ S, K, T, r: r3, sigma, tipo });
  const raizT = Math.sqrt(T);
  const densidad = normal(d1);
  const gamma = densidad / (S * sigma * raizT);
  const vegaEntera = S * densidad * raizT;
  const comun = -S * densidad * sigma / (2 * raizT);
  let delta;
  let thetaAnual;
  let rhoEntera;
  if (tipo === "put") {
    delta = normalAcumulada(d1) - 1;
    thetaAnual = comun + r3 * K * descuento * normalAcumulada(-d2);
    rhoEntera = -K * T * descuento * normalAcumulada(-d2);
  } else {
    delta = normalAcumulada(d1);
    thetaAnual = comun - r3 * K * descuento * normalAcumulada(d2);
    rhoEntera = K * T * descuento * normalAcumulada(d2);
  }
  return {
    delta,
    gamma,
    theta: thetaAnual / 365,
    thetaAnual,
    vega: vegaEntera / 100,
    vegaEntera,
    rho: rhoEntera / 100,
    rhoEntera
  };
}
function densidadFinal(x, { S, T, r: r3, sigma }) {
  if (!(x > 0)) return 0;
  const m = Math.log(S) + (r3 - sigma * sigma / 2) * T;
  const s = sigma * Math.sqrt(T);
  return normal(Math.log(x), m, s) / x;
}
function montecarlo({ S, K, T, r: r3, sigma, tipo = "call", n = 2e4, semilla = 1 }) {
  const z = normalesConSemilla(n, semilla);
  let suma = 0;
  let enDinero = 0;
  const finales = z.map((zi) => S * Math.exp((r3 - sigma * sigma / 2) * T + sigma * Math.sqrt(T) * zi));
  for (const ST of finales) {
    const pago = pagoAlVencer(tipo, ST, K);
    suma += pago;
    if (pago > 0) enDinero++;
  }
  return { precio: Math.exp(-r3 * T) * (suma / n), pagoPromedio: suma / n, probEnDinero: enDinero / n, finales };
}
function plata(v, decimales = 2) {
  const s = Math.abs(v).toFixed(decimales).replace(".", ",");
  return `${v < 0 && Number(s.replace(",", ".")) !== 0 ? "\u2212" : ""}$ ${s}`;
}
function fijo(v, decimales = 3) {
  const s = Math.abs(v).toFixed(decimales).replace(".", ",");
  return `${v < 0 && Number(s.replace(",", ".")) !== 0 ? "\u2212" : ""}${s}`;
}

// src/nucleo/curvas.js
var C1 = 1.70158;
var C3 = C1 + 1;
function resorte({ rebote = 0.3, oscilaciones = 1.5 } = {}) {
  if (!(rebote > 0)) {
    const k = 8;
    const fin = 1 - (1 + k) * Math.exp(-k);
    return (p) => (1 - (1 + k * p) * Math.exp(-k * p)) / fin;
  }
  const w = 2 * Math.PI * Math.max(oscilaciones, 0.25);
  const d = -Math.log(Math.min(rebote, 0.95)) * w / Math.PI;
  const crudo = (p) => 1 - Math.exp(-d * p) * (Math.cos(w * p) + d / w * Math.sin(w * p));
  const resto = 1 - crudo(1);
  return (p) => crudo(p) + resto * p * p;
}
function rebotar({ botes = 3 } = {}) {
  const n = Math.min(Math.max(Math.round(botes), 1), 4);
  const tramos = [1];
  for (let i = 1; i <= n; i++) tramos.push(tramos[i - 1] / 2);
  const total = tramos[0] + 2 * tramos.slice(1).reduce((a, b) => a + b, 0);
  return (p) => {
    let t = p * total;
    if (t < tramos[0]) return (t / tramos[0]) ** 2;
    t -= tramos[0];
    for (let i = 1; i <= n; i++) {
      const ancho = 2 * tramos[i];
      if (t < ancho) {
        const u = t / ancho * 2 - 1;
        return 1 - (tramos[i] / tramos[0]) ** 2 * (1 - u * u);
      }
      t -= ancho;
    }
    return 1;
  };
}
function elastico({ amplitud = 1, oscilaciones = 3 } = {}) {
  const w = 2 * Math.PI * oscilaciones;
  const crudo = (p) => 1 + amplitud * 2 ** (-10 * p) * Math.sin((p - 0.075) * w);
  const a = crudo(0);
  const b = crudo(1) - 1;
  return (p) => crudo(p) - a * (1 - p) - b * p;
}
function anticipar({ cuanto = 1, llegada = false } = {}) {
  const c1 = C1 * cuanto;
  const c2 = c1 * 1.525;
  if (!llegada) return (p) => (c1 + 1) * p ** 3 - c1 * p * p;
  return (p) => p < 0.5 ? (2 * p) ** 2 * ((c2 + 1) * 2 * p - c2) / 2 : ((2 * p - 2) ** 2 * ((c2 + 1) * (p * 2 - 2) + c2) + 2) / 2;
}
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
  salto: (p) => p > 0 ? 1 : 0,
  resorte: resorte(),
  // Un resorte flojo: se pasa más y tarda más en acomodarse.
  gelatina: resorte({ rebote: 0.45, oscilaciones: 2.5 }),
  rebote: rebotar(),
  elastico: elastico(),
  anticipar: anticipar(),
  envion: anticipar({ llegada: true })
};

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

// src/piezas/geometria.js
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
  pegado: 1,
  // De 0 a 1: cuánto de sus bordes ya se dibujó, como si alguien lo fuera
  // trazando con una lapicera. El relleno aparece al final, cuando el borde
  // ya está casi entero.
  trazo: 1
};
function definirPieza(definicion) {
  if (!definicion.nombre) throw new Error("Una pieza necesita un nombre.");
  const tipo = { colores: [], formas: [], ...definicion };
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
    return { tipo, props: completas, propias: Object.keys(props) };
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
        const q = c.a(x, lim(p.f(x, p.k)));
        return `${i ? "L" : "M"}${r(q.x)} ${r(q.y)}`;
      }).join("");
      abajo = xs.reverse().map((x) => {
        const q = c.a(x, lim(p.g ? p.g(x, p.k) : 0));
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
    const curvas2 = partes.cache.curvas;
    while (partes.lineas.childNodes.length > curvas2.length) partes.lineas.lastChild.remove();
    while (partes.lineas.childNodes.length < curvas2.length) el("path", {}, partes.lineas);
    while (partes.rotulos.childNodes.length > curvas2.length) partes.rotulos.lastChild.remove();
    while (partes.rotulos.childNodes.length < curvas2.length) {
      el("text", { "font-weight": 600, "text-anchor": "middle", "dominant-baseline": "central", ...HALO, "stroke-width": 5 }, partes.rotulos);
    }
    curvas2.forEach((curva2, i) => {
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
      "font-family": p.fuente === "mono" ? "var(--ma-fuente-mono)" : null,
      // El código lleva sangría: en mono, los espacios del principio no se juntan.
      style: p.fuente === "mono" ? "white-space: pre" : null
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

// src/finanzas/escenas.js
var pct = (p, d = 1) => `${numero(p * 100, d)} %`;
var miles = (v) => numero(v, 0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
function plazo(T) {
  if (T >= 1 && Math.abs(T - Math.round(T)) < 1e-9) return `${Math.round(T)} a\xF1o${Math.round(T) === 1 ? "" : "s"}`;
  const meses = T * 12;
  if (meses >= 1 && Math.abs(meses - Math.round(meses)) < 1e-6) return `${Math.round(meses)} mes${Math.round(meses) === 1 ? "" : "es"}`;
  const semanas = Math.round(T * 52);
  if (semanas >= 1) return `${semanas} semana${semanas === 1 ? "" : "s"}`;
  return `${Math.max(1, Math.round(T * 365))} d\xEDas`;
}
function pasoPara(alto, marcas2 = 5) {
  const crudo = alto / marcas2;
  const base = 10 ** Math.floor(Math.log10(crudo));
  return [1, 2, 5, 10].map((m) => m * base).find((p) => p >= crudo) ?? base * 10;
}
function desdeAccion(opciones = {}) {
  const {
    S0 = 100,
    mu = 0.08,
    sigma = 0.2,
    sigmaAlta = 0.45,
    dias = 126,
    semilla = 4,
    nombres = ["Tranquila S.A.", "Monta\xF1a Rusa S.A."],
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  const calmo = caminoPrecio({ S0, mu, sigma, dias, semilla });
  const movido = caminoPrecio({ S0, mu, sigma: sigmaAlta, dias, semilla });
  const todos = [...calmo, ...movido];
  const lo = Math.min(...todos);
  const hi = Math.max(...todos);
  const margen = (hi - lo) * 0.08;
  const rango = { ymin: Math.floor((lo - margen) / 5) * 5, ymax: Math.ceil((hi + margen) / 5) * 5 };
  const volC = volatilidad(calmo);
  const volM = volatilidad(movido);
  const fin = calmo.at(-1);
  const cambio = fin / S0 - 1;
  const rend = rendimientos(calmo, { logaritmicos: false });
  let dia = Math.floor(dias / 2);
  for (let i = 5; i < dias - 5; i++) if (rend[i] > rend[dia]) dia = i;
  const p0 = calmo[dia];
  const p1 = calmo[dia + 1];
  const ventana = { xmin: dia - 2, xmax: dia + 3 };
  const cerca = calmo.slice(ventana.xmin, ventana.xmax + 1);
  const holgura = (Math.max(...cerca) - Math.min(...cerca)) * 0.35 + 0.2;
  const zoom = { ...ventana, ymin: Math.min(...cerca) - holgura, ymax: Math.max(...cerca) + holgura };
  const marcasCerca = { pasoX: 1, pasoY: pasoPara(zoom.ymax - zoom.ymin, 4) };
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 330, y: arriba + 250, ancho: 580, alto: 420 } : { x: 560, y: arriba + 360, ancho: 1e3, alto: 600 };
    const pan = angosta ? { x: 24, y: arriba + 540, ancho: 600, tamano: 23 } : { x: 1100, y: arriba + 90, ancho: 480, tamano: 24 };
    const chico = angosta ? 15 : 19;
    const marcasLejos = { pasoX: dias > 100 ? 21 : 10, pasoY: pasoPara(rango.ymax - rango.ymin, angosta ? 4 : 6) };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.precio = plano({
      ...pl,
      xmin: 0,
      xmax: dias,
      ...rango,
      ...marcasLejos,
      etiquetaX: "d\xEDas de bolsa",
      etiquetaY: "$",
      tamano: chico,
      decimales: 1
    });
    piezas.calmo = grafica({ plano: "precio", datos: calmo.map((p, i) => [i, p]), trazo: 0, color: "acento", grosor: angosta ? 3 : 3.5 });
    piezas.movido = grafica({ plano: "precio", datos: movido.map((p, i) => [i, p]), trazo: 0, color: "acento2", grosor: angosta ? 3 : 3.5 });
    piezas.hoy = punto({ plano: "precio", mx: 0, my: S0, radio: 9, color: "acento", etiqueta: plata(S0), lado: "arriba-derecha", opacidad: 0 });
    piezas.final = punto({ plano: "precio", mx: dias, my: fin, radio: 9, color: "acento", etiqueta: plata(fin), lado: "arriba-izquierda", opacidad: 0 });
    piezas.antes = punto({ plano: "precio", mx: dia, my: p0, radio: 10, color: "acento", etiqueta: "P\u2080", lado: "abajo", opacidad: 0 });
    piezas.despues = punto({ plano: "precio", mx: dia + 1, my: p1, radio: 10, color: "exito", etiqueta: "P\u2081", lado: "arriba", opacidad: 0 });
    piezas.salto = segmento({ plano: "precio", x1: dia + 1, y1: p0, x2: dia + 1, y2: p0, color: "exito", grosor: 5, opacidad: 0 });
    panel(piezas, ["que", "hoyTxt", "simple", "logaritmico", "volCalmo", "volMovido", "cierre"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo("Una acci\xF3n");
    n.animar([
      { pieza: "que", a: { texto: "Acci\xF3n: una parte de una empresa", opacidad: 1, peso: 700 }, dur: 0.4 }
    ]);
    n.decir("Una acci\xF3n es un pedacito de una empresa. Quien la tiene es due\xF1o de una parte, chiquita, de lo que la empresa vale y de lo que gana.");
    n.animar([
      { pieza: "hoy", a: { opacidad: 1 }, dur: 0.4 },
      { pieza: "hoyTxt", a: { texto: `${nombres[0]} hoy: ${plata(S0)}`, opacidad: 1, color: "acento" }, dur: 0.4 }
    ]);
    n.decir(`En la bolsa se compran y se venden todo el d\xEDa. El precio es el de la \xFAltima operaci\xF3n: lo que alguien pag\xF3 y otro acept\xF3. Hoy, ${nombres[0]} cotiza a ${plata(S0)}.`);
    n.capitulo("El precio camina");
    n.animar({ pieza: "calmo", a: { trazo: 1 }, dur: 5 });
    n.decir("D\xEDa a d\xEDa, el precio sube o baja seg\xFAn lo que compradores y vendedores creen que vale la empresa: noticias, resultados, el humor del mercado. Nadie sabe cu\xE1l va a ser el pr\xF3ximo paso.");
    n.animar([
      { pieza: "final", a: { opacidad: 1 }, dur: 0.4 },
      { pieza: "hoyTxt", a: { texto: `${plata(S0, 0)} \u2192 ${plata(fin)} (${cambio >= 0 ? "+" : "\u2212"}${pct(Math.abs(cambio))})` }, dur: 0.3 }
    ]);
    n.decir(`Despu\xE9s de ${dias} d\xEDas de bolsa termin\xF3 en ${plata(fin)}: ${cambio >= 0 ? "subi\xF3" : "baj\xF3"} un ${pct(Math.abs(cambio))}. Por eso, para pensar el precio de ma\xF1ana, se lo trata como algo al azar.`);
    n.capitulo("El rendimiento");
    n.animar([
      { pieza: "precio", a: zoom, dur: 1.4 },
      { pieza: "precio", a: marcasCerca, dur: 0, en: n.tiempo + 1.4 },
      { pieza: ["hoy", "final"], a: { opacidad: 0 }, dur: 0.3 },
      { pieza: "antes", a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.2 },
      { pieza: "despues", a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.5 },
      { pieza: "salto", a: { y2: p1, opacidad: 1 }, dur: 0.6, en: n.tiempo + 1.6 }
    ]);
    n.esperar(1.6);
    n.animar({
      pieza: "simple",
      a: { texto: `(P\u2081 \u2212 P\u2080) / P\u2080 = ${pct(p1 / p0 - 1, 2)}`, opacidad: 1 },
      dur: 0.4
    });
    n.decir(`Miremos de cerca el d\xEDa ${dia}. De un d\xEDa al otro pas\xF3 de ${plata(p0)} a ${plata(p1)}. Lo que importa no es cu\xE1ntos pesos subi\xF3, sino cu\xE1nto en proporci\xF3n: el rendimiento, ${pct(p1 / p0 - 1, 2)}.`);
    n.animar({ pieza: "logaritmico", a: { texto: `ln(P\u2081 / P\u2080) = ${fijo(Math.log(p1 / p0), 4)}`, opacidad: 1 }, dur: 0.4 });
    n.decir(`En finanzas se usa m\xE1s el rendimiento logar\xEDtmico, ln(P\u2081 / P\u2080) = ${fijo(Math.log(p1 / p0), 4)}. Cuando es chico es casi igual, y tiene una ventaja: el de varios d\xEDas es la suma de los de cada d\xEDa.`);
    n.capitulo("La volatilidad");
    n.animar([
      { pieza: "precio", a: { xmin: 0, xmax: dias, ...rango }, dur: 1.4 },
      { pieza: "precio", a: marcasLejos, dur: 0 },
      { pieza: ["antes", "despues", "salto"], a: { opacidad: 0 }, dur: 0.3 },
      { pieza: "movido", a: { trazo: 1 }, dur: 5, en: n.tiempo + 1.4 }
    ]);
    n.esperar(1.4);
    n.decir(`Ahora sumemos otra acci\xF3n, ${nombres[1]}. Las dos rinden lo mismo en promedio, pero la naranja se sacude mucho m\xE1s: sube m\xE1s fuerte, baja m\xE1s fuerte.`);
    n.animar([
      { pieza: "volCalmo", a: { texto: `\u03C3 ${nombres[0]}: ${pct(volC)} anual`, opacidad: 1, color: "acento", peso: 700 }, dur: 0.4 },
      { pieza: "volMovido", a: { texto: `\u03C3 ${nombres[1]}: ${pct(volM)} anual`, opacidad: 1, color: "acento2", peso: 700 }, dur: 0.4, en: n.tiempo + 0.5 }
    ]);
    n.decir(`Eso es la volatilidad, \u03C3 (sigma): cu\xE1nto se dispersan los rendimientos. Se calcula como el desv\xEDo est\xE1ndar de los rendimientos diarios, pasado a un a\xF1o multiplicando por \u221A252, los d\xEDas de bolsa de un a\xF1o. Ac\xE1 da ${pct(volC)} y ${pct(volM)}.`);
    n.decir("La volatilidad es la medida del riesgo: con la naranja se puede ganar mucho m\xE1s, y perder mucho m\xE1s.");
    n.preguntar("derecho");
    n.capitulo("Un derecho");
    n.animar({ pieza: "cierre", a: { texto: "P\xE9rdida acotada, ganancia sin techo", opacidad: 1, color: "exito", peso: 700 }, dur: 0.4 });
    n.decir("Ahora imagin\xE1 que en vez de la acci\xF3n ten\xE9s solo el derecho a comprarla a un precio fijo, m\xE1s adelante, si te conviene. Si se dispara, gan\xE1s; si se desploma, no la compr\xE1s y listo. Con una acci\xF3n que se sacude m\xE1s, ese derecho vale m\xE1s.");
    n.decir("Ese derecho se llama opci\xF3n, y es lo que sigue.");
    return {
      titulo: titulo || "Una acci\xF3n y su precio",
      descripcion: descripcion || `Dos acciones inventadas con la misma tendencia y distinta volatilidad (${pct(volC)} y ${pct(volM)}): el rendimiento de un d\xEDa y c\xF3mo se mide el riesgo.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeInteres(opciones = {}) {
  const {
    monto = 1e3,
    tasa = 0.12,
    anios = 5,
    promesa = 2e3,
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  const anual = valorFuturo(monto, tasa, anios, 1);
  const mensual = valorFuturo(monto, tasa, anios, 12);
  const continua = valorFuturo(monto, tasa, anios);
  const presente = valorPresente(promesa, tasa, anios);
  const escalones = (veces) => {
    const datos = [];
    for (let j = 0; j < veces * anios; j++) {
      const v = valorFuturo(monto, tasa, j / veces, veces);
      datos.push([j / veces, v], [(j + 1) / veces, v]);
    }
    datos.push([anios, valorFuturo(monto, tasa, anios, veces)]);
    return datos;
  };
  const ymax = Math.ceil(Math.max(continua, promesa) * 1.12 / 250) * 250;
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 330, y: arriba + 250, ancho: 580, alto: 420 } : { x: 560, y: arriba + 360, ancho: 1e3, alto: 600 };
    const pan = angosta ? { x: 24, y: arriba + 540, ancho: 600, tamano: 23 } : { x: 1100, y: arriba + 90, ancho: 480, tamano: 24 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.tiempo = plano({
      ...pl,
      xmin: 0,
      xmax: anios * 1.04,
      ymin: 0,
      ymax,
      pasoX: 1,
      pasoY: pasoPara(ymax, angosta ? 4 : 6),
      etiquetaX: "a\xF1os",
      etiquetaY: "$",
      tamano: angosta ? 15 : 19,
      decimales: 0
    });
    piezas.inicio = punto({ plano: "tiempo", mx: 0, my: monto, radio: 9, color: "acento", etiqueta: plata(monto, 0), lado: "abajo-derecha", opacidad: 0 });
    piezas.anual = grafica({ plano: "tiempo", datos: escalones(1), trazo: 0, color: "suave", grosor: 3 });
    piezas.mensual = grafica({ plano: "tiempo", datos: escalones(12), trazo: 0, color: "acento2", grosor: 3 });
    piezas.continua = grafica({ plano: "tiempo", f: (t) => valorFuturo(monto, tasa, t), desde: 0, hasta: anios, trazo: 0, color: "acento", grosor: 4 });
    piezas.futuro = punto({ plano: "tiempo", mx: anios, my: continua, radio: 9, color: "acento", etiqueta: plata(continua, 0), lado: "izquierda", opacidad: 0 });
    piezas.promesa = punto({ plano: "tiempo", mx: anios, my: promesa, radio: 10, color: "exito", etiqueta: `K = ${plata(promesa, 0)}`, lado: "izquierda", opacidad: 0 });
    piezas.descuento = grafica({
      plano: "tiempo",
      parametrica: (u) => [anios * (1 - u), valorPresente(promesa, tasa, anios * u)],
      trazo: 0,
      color: "exito",
      grosor: 4,
      punteada: true
    });
    piezas.hoy = punto({ plano: "tiempo", mx: 0, my: presente, radio: 10, color: "exito", etiqueta: plata(presente, 0), lado: "arriba-derecha", opacidad: 0 });
    panel(piezas, ["regla", "lAnual", "lMensual", "lContinua", "lPresente", "lFormula"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    n.capitulo("Un peso hoy vale m\xE1s");
    n.animar([
      { pieza: "inicio", a: { opacidad: 1 }, dur: 0.4 },
      { pieza: "regla", a: { texto: `${plata(monto, 0)} al ${pct(tasa, 0)} anual`, opacidad: 1, peso: 700 }, dur: 0.4 }
    ]);
    n.decir(`\xBFQu\xE9 prefer\xEDs: ${plata(monto, 0)} hoy o ${plata(monto, 0)} dentro de un a\xF1o? Hoy, aunque no haya inflaci\xF3n: la plata de hoy se puede prestar o invertir y genera inter\xE9s. Supongamos una tasa del ${pct(tasa, 0)} anual, sin riesgo.`);
    n.capitulo("Inter\xE9s compuesto");
    n.animar([
      { pieza: "anual", a: { trazo: 1 }, dur: 2 },
      { pieza: "lAnual", a: { texto: `Una vez por a\xF1o: ${plata(anual)}`, opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.6 }
    ]);
    n.decir(`Si los intereses se suman una vez por a\xF1o, al a\xF1o siguiente tambi\xE9n ganan inter\xE9s: eso es el inter\xE9s compuesto. En ${plazo(anios)} se llega a ${plata(anual)}.`);
    n.animar([
      { pieza: "mensual", a: { trazo: 1 }, dur: 2 },
      { pieza: "lMensual", a: { texto: `Una vez por mes: ${plata(mensual)}`, opacidad: 1, color: "acento2" }, dur: 0.4, en: n.tiempo + 1.6 }
    ]);
    n.decir(`Si se suman cada mes (un ${pct(tasa / 12, 0)} mensual), los escalones son m\xE1s chiquitos y se llega a un poco m\xE1s: ${plata(mensual)}.`);
    n.animar([
      { pieza: "continua", a: { trazo: 1 }, dur: 2 },
      { pieza: "futuro", a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.8 },
      { pieza: "lContinua", a: { texto: `Continuo, e^(rT): ${plata(continua)}`, opacidad: 1, color: "acento", peso: 700 }, dur: 0.4, en: n.tiempo + 1.6 }
    ]);
    n.decir(`Y si se suman a cada instante, los escalones desaparecen y queda una curva: monto \xB7 e^(rT) = ${plata(continua)}. Es la capitalizaci\xF3n continua, y es la que usan los modelos de finanzas porque las cuentas quedan m\xE1s simples.`);
    n.capitulo("Para atr\xE1s: el valor presente");
    n.animar([
      { pieza: ["anual", "mensual"], a: { opacidad: 0.25 }, dur: 0.5 },
      { pieza: "promesa", a: { opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`Ahora al rev\xE9s: te prometen ${plata(promesa, 0)} dentro de ${plazo(anios)}, seguro. \xBFCu\xE1nto vale esa promesa hoy?`);
    n.animar([
      { pieza: "descuento", a: { trazo: 1 }, dur: 2.4 },
      { pieza: "hoy", a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 2.2 },
      { pieza: "lPresente", a: { texto: `Hoy: K \xB7 e^(\u2212rT) = ${plata(presente)}`, opacidad: 1, color: "exito", peso: 700 }, dur: 0.4, en: n.tiempo + 2.2 }
    ]);
    n.decir(`Es la misma cuenta dada vuelta: ${plata(promesa, 0)} \xB7 e^(\u2212${numero(tasa, 2)} \xB7 ${anios}) = ${plata(presente)}. Si hoy pusieras ${plata(presente)} al ${pct(tasa, 0)}, en ${plazo(anios)} tendr\xEDas justo ${plata(promesa, 0)}. A esto se le dice descontar.`);
    n.animar({ pieza: "lFormula", a: { texto: "En Black-Scholes: K \xB7 e^(\u2212rT)", opacidad: 1 }, dur: 0.4 });
    n.decir("Guard\xE1 esta cuenta: en la f\xF3rmula de Black-Scholes aparece K \xB7 e^(\u2212rT), el precio de ejercicio de una opci\xF3n tra\xEDdo a hoy.");
    n.preguntar("tasa");
    n.capitulo("Si sube la tasa");
    const presenteAlta = valorPresente(promesa, tasa * 2, anios);
    n.decir(`Con una tasa del ${pct(tasa * 2, 0)}, esa misma promesa vale hoy ${plata(presenteAlta)}: menos. Cuanto m\xE1s rinde la plata de hoy, menos hace falta poner para llegar a lo mismo.`);
    return {
      titulo: titulo || "El valor del dinero en el tiempo",
      descripcion: descripcion || `${plata(monto, 0)} al ${pct(tasa, 0)} durante ${plazo(anios)}, con inter\xE9s anual, mensual y continuo; y lo que vale hoy cobrar ${plata(promesa, 0)} al final.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdePago(opciones = {}) {
  const {
    K = 100,
    prima = 6,
    primaPut = 4,
    accion = "la acci\xF3n",
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  const xmin = K * 0.6;
  const xmax = K * 1.4;
  const tope = K * 0.4;
  const abajo = K * 0.3;
  const pago = (S, k) => (1 - k) * pagoAlVencer("call", S, K) + k * pagoAlVencer("put", S, K);
  const ganancia = (S, k) => pago(S, k) - ((1 - k) * prima + k * primaPut);
  const casoBajo = K * 0.7;
  const casoAlto = K * 1.3;
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 330, y: arriba + 260, ancho: 580, alto: 440 } : { x: 560, y: arriba + 360, ancho: 1e3, alto: 620 };
    const pan = angosta ? { x: 24, y: arriba + 560, ancho: 600, tamano: 23 } : { x: 1100, y: arriba + 90, ancho: 480, tamano: 24 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.pl = plano({
      ...pl,
      xmin,
      xmax,
      ymin: -abajo,
      ymax: tope,
      pasoX: pasoPara(xmax - xmin, angosta ? 4 : 8),
      pasoY: pasoPara(tope + abajo, angosta ? 4 : 7),
      etiquetaX: "S al vencer",
      etiquetaY: "ganancia",
      tamano: angosta ? 15 : 19,
      decimales: 0
    });
    piezas.strike = recta({ plano: "pl", mx: K, my: 0, vertical: true, color: "suave", punteada: true, progreso: 0, etiqueta: `K = ${plata(K, 0)}`, grosor: 2.5 });
    piezas.pago = grafica({ plano: "pl", f: pago, k: 0, trazo: 0, color: "suave", grosor: 3, punteada: true });
    piezas.ganancia = grafica({ plano: "pl", f: ganancia, k: 0, trazo: 0, color: "acento", grosor: 5 });
    piezas.vendedor = grafica({ plano: "pl", f: (S) => -ganancia(S, 0), trazo: 0, color: "acento2", grosor: 4 });
    piezas.caso = punto({ plano: "pl", mx: casoBajo, my: ganancia(casoBajo, 0), radio: 11, color: "acento", etiqueta: "", lado: "arriba", opacidad: 0 });
    piezas.empate = punto({ plano: "pl", mx: K + prima, my: 0, radio: 9, color: "exito", etiqueta: `empate ${plata(K + prima, 0)}`, lado: "abajo-derecha", opacidad: 0 });
    panel(piezas, ["que", "lPrima", "lPago", "lGanancia", "lEmpate", "lCaso"], pan);
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const enCaso = (S, k = 0) => {
      const g = ganancia(S, k);
      return { mx: S, my: g, etiqueta: g >= 0 ? `+${plata(g, 0)}` : plata(g, 0) };
    };
    n.capitulo("Un derecho, no una obligaci\xF3n");
    n.animar([
      { pieza: "que", a: { texto: `Call: derecho a COMPRAR a K = ${plata(K, 0)}`, opacidad: 1, peso: 800, color: "acento" }, dur: 0.4 },
      { pieza: "strike", a: { progreso: 1 }, dur: 0.8 }
    ]);
    n.decir(`Un call es un contrato que da el derecho, pero no la obligaci\xF3n, de comprar ${accion} a un precio fijo, K = ${plata(K, 0)} (el precio de ejercicio), en una fecha: el vencimiento.`);
    n.animar({ pieza: "lPrima", a: { texto: `Prima (lo que cuesta hoy): ${plata(prima, 0)}`, opacidad: 1 }, dur: 0.4 });
    n.decir(`Ese derecho se paga por adelantado: es la prima, ${plata(prima, 0)}. Pase lo que pase, es todo lo que pod\xE9s perder.`);
    n.capitulo("Si termina abajo de K");
    n.animar([
      { pieza: "caso", a: { ...enCaso(casoBajo), opacidad: 1 }, dur: 0.4 },
      { pieza: "lCaso", a: { texto: `S = ${plata(casoBajo, 0)}: no ejerc\xE9s \u2192 ${plata(-prima, 0)}`, opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`Si al vencer ${accion} vale ${plata(casoBajo, 0)}, \xBFqui\xE9n va a querer comprarla a ${plata(K, 0)}? Nadie: no ejerc\xE9s el derecho. El contrato no paga nada y perdiste la prima: ${plata(-prima, 0)}.`);
    n.capitulo("Si termina arriba de K");
    n.animar([
      { pieza: "caso", a: enCaso(casoAlto), dur: 1.2 },
      { pieza: "lCaso", a: { texto: `S = ${plata(casoAlto, 0)}: paga ${plata(casoAlto - K, 0)} \u2192 +${plata(casoAlto - K - prima, 0)}` }, dur: 0.3, en: n.tiempo + 1 }
    ]);
    n.decir(`Si vale ${plata(casoAlto, 0)}, ejerc\xE9s: compr\xE1s a ${plata(K, 0)} algo que vale ${plata(casoAlto, 0)}. El contrato te deja ${plata(casoAlto - K, 0)}; menos la prima, ganaste ${plata(casoAlto - K - prima, 0)}.`);
    n.animar([
      { pieza: "pago", a: { trazo: 1 }, dur: 1.4 },
      { pieza: "lPago", a: { texto: "Paga al vencer: m\xE1x(S \u2212 K, 0)", opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir("Haciendo lo mismo para cada precio posible queda la l\xEDnea punteada: lo que paga el contrato, m\xE1x(S \u2212 K, 0). Cero mientras S no pase a K, y de ah\xED sube peso por peso.");
    n.animar([
      { pieza: "ganancia", a: { trazo: 1 }, dur: 1.4 },
      { pieza: "lGanancia", a: { texto: "Ganancia = pago \u2212 prima", opacidad: 1, color: "acento", peso: 700 }, dur: 0.4 }
    ]);
    n.decir(`La l\xEDnea llena es tu ganancia: la misma, corrida ${plata(prima, 0)} para abajo. Por su forma le dicen "palo de hockey".`);
    const recorrido = 3.2;
    muestrear(n, recorrido, 0.1, (f, en, dur) => {
      const S = casoAlto + (xmin + 2 - casoAlto) * Math.sin(f * Math.PI / 2) ** 2;
      n.linea.push({ pieza: "caso", a: enCaso(S), dur, en });
    });
    n.tiempo += recorrido;
    muestrear(n, 2.4, 0.1, (f, en, dur) => {
      const S = xmin + 2 + (K + prima - xmin - 2) * f;
      n.linea.push({ pieza: "caso", a: enCaso(S), dur, en });
    });
    n.capitulo("El punto de empate");
    n.animar([
      { pieza: "empate", a: { opacidad: 1 }, dur: 0.4 },
      { pieza: "caso", a: { opacidad: 0 }, dur: 0.3 },
      { pieza: "lEmpate", a: { texto: `Empate: S = K + prima = ${plata(K + prima, 0)}`, opacidad: 1, color: "exito" }, dur: 0.4 },
      { pieza: "lCaso", a: { opacidad: 0 }, dur: 0.3 }
    ]);
    n.decir(`Ojo: no alcanza con que ${accion} pase de ${plata(K, 0)}. Reci\xE9n gan\xE1s si supera K + prima = ${plata(K + prima, 0)}: ah\xED recuper\xE1s lo que pagaste.`);
    n.preguntar("techo");
    n.capitulo("Del otro lado");
    n.animar([
      { pieza: "vendedor", a: { trazo: 1 }, dur: 1.4 },
      { pieza: "lCaso", a: { texto: "Quien lo vendi\xF3: gana la prima, nada m\xE1s", opacidad: 1, color: "acento2" }, dur: 0.4 }
    ]);
    n.decir(`Del otro lado del contrato hay alguien que vendi\xF3 (o "lanz\xF3") el call: cobr\xF3 los ${plata(prima, 0)} y queda obligado a vender a ${plata(K, 0)} si se lo piden. Su ganancia es la tuya dada vuelta, la l\xEDnea naranja.`);
    n.decir(`Gana, como mucho, la prima. Pero si ${accion} se dispara tiene que entregarla igual a ${plata(K, 0)}, y su p\xE9rdida no tiene techo. Lo que gana uno lo pierde el otro.`);
    n.capitulo("El put");
    n.animar([
      { pieza: "vendedor", a: { opacidad: 0 }, dur: 0.5 },
      { pieza: ["pago", "ganancia"], a: { k: 1 }, dur: 1.8, en: n.tiempo + 0.4 },
      { pieza: "empate", a: { mx: K - primaPut, etiqueta: `empate ${plata(K - primaPut, 0)}` }, dur: 1.8, en: n.tiempo + 0.4 },
      { pieza: "que", a: { texto: `Put: derecho a VENDER a K = ${plata(K, 0)}` }, dur: 0.3 },
      { pieza: "lPrima", a: { texto: `Prima: ${plata(primaPut, 0)}` }, dur: 0.3 },
      { pieza: "lPago", a: { texto: "Paga al vencer: m\xE1x(K \u2212 S, 0)" }, dur: 0.3 },
      { pieza: "lEmpate", a: { texto: `Empate: S = K \u2212 prima = ${plata(K - primaPut, 0)}` }, dur: 0.3 },
      { pieza: "lCaso", a: { texto: "Un seguro contra la ca\xEDda", color: "exito" }, dur: 0.3 }
    ]);
    n.decir(`El put es el espejo: el derecho a VENDER a ${plata(K, 0)}. Paga m\xE1x(K \u2212 S, 0): gana cuando ${accion} baja. Si la ten\xE9s y se desploma, igual la pod\xE9s vender a ${plata(K, 0)}: funciona como un seguro.`);
    n.decir("Esto es lo que pasa el d\xEDa que vence. Pero la prima se paga HOY, sin saber d\xF3nde va a terminar. \xBFCu\xE1nto deber\xEDa costar? Esa es la pregunta que responde Black-Scholes.");
    return {
      titulo: titulo || "Qu\xE9 paga una opci\xF3n",
      descripcion: descripcion || `Un call y un put con precio de ejercicio ${plata(K, 0)}: lo que pagan al vencer, la ganancia despu\xE9s de la prima y el punto de empate.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeBlackScholes(opciones = {}) {
  const {
    S = 100,
    K = 105,
    T = 0.5,
    r: r3 = 0.05,
    sigma = 0.25,
    sigmaAlta = 0.4,
    simulaciones = 2e4,
    semilla = 11,
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  const bs = blackScholes({ S, K, T, r: r3, sigma });
  const bsAlto = blackScholes({ S, K, T, r: r3, sigma: sigmaAlta });
  const mc = montecarlo({ S, K, T, r: r3, sigma, n: simulaciones, semilla });
  const ancho = Math.max(sigma, sigmaAlta) * Math.sqrt(T);
  const xmin = Math.max(0, Math.floor(S * Math.exp(-2.2 * ancho) / 5) * 5);
  const xmax = Math.ceil(S * Math.exp(2.3 * ancho) / 5) * 5;
  const dens = (x, s) => densidadFinal(x, { S, T, r: r3, sigma: s });
  let pico = 0;
  for (let i = 0; i <= 200; i++) pico = Math.max(pico, dens(xmin + (xmax - xmin) * i / 200, Math.min(sigma, sigmaAlta)));
  const topePago = xmax - K;
  const cuantos = 36;
  const azarPuntos = normalesConSemilla(cuantos * 2, semilla + 1);
  const futuros = Array.from({ length: cuantos }, (_, i) => {
    const ST = S * Math.exp((r3 - sigma * sigma / 2) * T + sigma * Math.sqrt(T) * azarPuntos[i]);
    const alto = (0.15 + 0.7 * (Math.abs(azarPuntos[cuantos + i]) * 0.37 % 1)) * dens(ST, sigma);
    return { ST, alto, pago: pagoAlVencer("call", ST, K) };
  });
  const descuentoK = K * bs.descuento;
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const arribaPl = angosta ? { x: 330, y: arriba + 150, ancho: 580, alto: 230 } : { x: 520, y: arriba + 175, ancho: 900, alto: 290 };
    const abajoPl = angosta ? { x: 330, y: arriba + 420, ancho: 580, alto: 230 } : { x: 520, y: arriba + 535, ancho: 900, alto: 330 };
    const pan = angosta ? { x: 24, y: arriba + 590, ancho: 600, tamano: 22 } : { x: 1010, y: arriba + 70, ancho: 570, tamano: 24 };
    const chico = angosta ? 15 : 19;
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.pago = plano({
      ...arribaPl,
      xmin,
      xmax,
      ymin: -topePago * 0.08,
      ymax: topePago * 1.05,
      pasoX: pasoPara(xmax - xmin, angosta ? 4 : 7),
      pasoY: pasoPara(topePago, 3),
      etiquetaX: "S al vencer",
      etiquetaY: "paga",
      tamano: chico,
      decimales: 0
    });
    piezas.prob = plano({
      ...abajoPl,
      xmin,
      xmax,
      ymin: 0,
      ymax: pico * 1.12,
      pasoX: pasoPara(xmax - xmin, angosta ? 4 : 7),
      pasoY: pico * 100,
      etiquetaX: "S al vencer",
      etiquetaY: "probabilidad",
      tamano: chico,
      decimales: 0
    });
    piezas.pagoCurva = grafica({ plano: "pago", f: (x) => pagoAlVencer("call", x, K), trazo: 0, color: "acento", grosor: 4 });
    piezas.kArriba = recta({ plano: "pago", mx: K, my: 0, vertical: true, color: "suave", punteada: true, progreso: 0, grosor: 2.5, etiqueta: `K = ${plata(K, 0)}` });
    piezas.kAbajo = recta({ plano: "prob", mx: K, my: 0, vertical: true, color: "suave", punteada: true, progreso: 0, grosor: 2.5 });
    piezas.densidad = area({ plano: "prob", f: dens, k: sigma, desde: xmin, hasta: xmax, color: "acento", relleno: 0.18, opacidad: 0 });
    piezas.enDinero = area({
      plano: "prob",
      f: dens,
      k: sigma,
      desde: K,
      hasta: xmax,
      color: "exito",
      relleno: 0.4,
      opacidad: 0,
      etiqueta: `N(d2) = ${pct(bs.Nd2)}`,
      etiquetaX: K + (xmax - K) * 0.42,
      etiquetaY: pico * 0.62,
      tamanoEtiqueta: angosta ? 19 : 23
    });
    piezas.hoy = punto({ plano: "prob", mx: S, my: 0, radio: 9, color: "acento2", etiqueta: `hoy ${plata(S, 0)}`, lado: "arriba-izquierda", opacidad: 0 });
    futuros.forEach((fu, i) => {
      const color = fu.pago > 0 ? "exito" : "suave";
      piezas[`f${i}`] = punto({ plano: "prob", mx: fu.ST, my: fu.alto, radio: angosta ? 5 : 6, color, opacidad: 0 });
      piezas[`g${i}`] = punto({ plano: "pago", mx: fu.ST, my: fu.pago, radio: angosta ? 5 : 6, color, opacidad: 0 });
    });
    panel(piezas, ["l0", "l1", "l2", "l3", "l4", "l5", "l6"], { ...pan, interlineado: 1.75 });
    const lineas = ["l0", "l1", "l2", "l3", "l4", "l5", "l6"];
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const escribir = (textos, demora = 0, estilos = {}) => {
      n.animar(lineas.map((l, i) => ({
        pieza: l,
        a: { texto: textos[i] ?? "", opacidad: textos[i] ? 1 : 0, color: estilos[i]?.color ?? "texto", peso: estilos[i]?.peso ?? 400 },
        dur: 0.3,
        en: n.tiempo + demora + i * 0.15
      })));
    };
    n.capitulo("Las cinco letras");
    escribir([
      `S = ${plata(S, 0)}  precio de hoy`,
      `K = ${plata(K, 0)}  precio de ejercicio`,
      `T = ${numero(T, 3)}  a\xF1os al vencimiento (${plazo(T)})`,
      `r = ${pct(r3, 1)}  tasa sin riesgo, anual`,
      `\u03C3 = ${pct(sigma, 0)}  volatilidad, anual`
    ], 0, { 4: { color: "acento2", peso: 700 } });
    n.decir(`Para ponerle precio a un call hacen falta cinco cosas. Cuatro se leen en el contrato o en la pantalla: el precio de hoy S, el de ejercicio K, el tiempo que falta T (en a\xF1os) y la tasa sin riesgo r.`);
    n.decir("La quinta, \u03C3, la volatilidad, es la \xFAnica que hay que estimar. Y fijate lo que NO est\xE1: si la acci\xF3n va a subir o a bajar. Black-Scholes no necesita adivinarlo.");
    n.capitulo("Lo que paga al vencer");
    n.animar([
      { pieza: "pagoCurva", a: { trazo: 1 }, dur: 1.2 },
      { pieza: ["kArriba", "kAbajo"], a: { progreso: 1 }, dur: 0.8 }
    ]);
    n.decir(`Arriba, lo que paga el call el d\xEDa que vence, como ya vimos: nada si ${"la acci\xF3n"} termina abajo de ${plata(K, 0)}, y S \u2212 K si termina arriba.`);
    n.capitulo("\xBFD\xF3nde puede terminar?");
    n.animar([
      { pieza: "densidad", a: { opacidad: 1 }, dur: 0.8 },
      { pieza: "hoy", a: { opacidad: 1 }, dur: 0.4 }
    ]);
    n.decir(`Abajo, qu\xE9 tan probable es cada precio dentro de ${plazo(T)}. El modelo supone que los rendimientos son normales; entonces el precio queda "lognormal": una campana torcida, con la cola larga a la derecha. Puede subir mucho, pero nunca bajar de $ 0.`);
    n.decir(`Lo ancho de la campana lo decide \u03C3\xB7\u221AT = ${fijo(sigma * Math.sqrt(T), 3)}: con m\xE1s volatilidad, o con m\xE1s tiempo, el precio puede terminar m\xE1s lejos de donde est\xE1 hoy.`);
    n.capitulo("Muchos futuros posibles");
    n.animar([
      ...futuros.map((_, i) => ({ pieza: `f${i}`, a: { opacidad: 1 }, dur: 0.25, en: n.tiempo + i * 0.06 })),
      ...futuros.map((_, i) => ({ pieza: `g${i}`, a: { opacidad: 1 }, dur: 0.25, en: n.tiempo + 2.4 + i * 0.06 }))
    ]);
    const verdes = futuros.filter((f) => f.pago > 0).length;
    n.decir(`Inventemos ${cuantos} futuros posibles, sacados de esa campana. En ${verdes} de ellos (los verdes) la acci\xF3n termina arriba de ${plata(K, 0)} y el call paga algo; en el resto, nada.`);
    escribir([
      `Con ${miles(simulaciones)} futuros simulados:`,
      `paga en promedio ${plata(mc.pagoPromedio)}`,
      `tra\xEDdo a hoy: \xD7 e^(\u2212rT) = ${plata(mc.precio)}`
    ], 0, { 2: { color: "exito", peso: 800 } });
    n.decir(`Si en vez de ${cuantos} inventamos ${miles(simulaciones)}, el call paga en promedio ${plata(mc.pagoPromedio)}. Pero eso se cobra dentro de ${plazo(T)}: tra\xEDdo a hoy con e^(\u2212rT), da ${plata(mc.precio)}. Ese es el precio justo de la prima.`);
    n.decir("Un detalle importante: los futuros se simulan como si la acci\xF3n creciera a la tasa sin riesgo r, no a lo que uno espera que rinda. Es la idea genial de Black y Scholes: la opci\xF3n se puede cubrir comprando y vendiendo la acci\xF3n, el riesgo se cancela, y entonces alcanza con r.");
    n.capitulo("La f\xF3rmula");
    escribir([
      "d1 = [ln(S/K) + (r + \u03C3\xB2/2)\xB7T] / (\u03C3\u221AT)",
      `     = ${fijo(bs.d1, 3)}`,
      `d2 = d1 \u2212 \u03C3\u221AT = ${fijo(bs.d2, 3)}`,
      `N(d1) = ${fijo(bs.Nd1, 3)}   N(d2) = ${fijo(bs.Nd2, 3)}`,
      "C = S\xB7N(d1) \u2212 K\xB7e^(\u2212rT)\xB7N(d2)",
      `   = ${numero(S, 2)}\xB7${fijo(bs.Nd1, 3)} \u2212 ${numero(descuentoK, 2)}\xB7${fijo(bs.Nd2, 3)}`,
      `   = ${plata(bs.precio)}`
    ], 0, { 4: { color: "acento", peso: 700 }, 6: { color: "exito", peso: 800 } });
    n.decir("Black-Scholes hace ese promedio con una f\xF3rmula, sin simular nada. d1 y d2 miden cu\xE1ntos desv\xEDos (\u03C3\u221AT) est\xE1 el precio de hoy por encima de K, con una correcci\xF3n por la tasa y el tiempo.");
    n.animar({ pieza: "enDinero", a: { opacidad: 1 }, dur: 0.6 });
    n.decir(`N es la normal acumulada: la probabilidad de que una normal est\xE1ndar quede debajo de un n\xFAmero (en Python, scipy.stats.norm.cdf). N(d2) = ${pct(bs.Nd2)} es el \xE1rea verde: la probabilidad de que el call termine "en el dinero", con S > K.`);
    n.decir(`Entonces K\xB7e^(\u2212rT)\xB7N(d2) = ${plata(descuentoK * bs.Nd2)} es lo que esper\xE1s pagar al ejercer, tra\xEDdo a hoy, y S\xB7N(d1) = ${plata(S * bs.Nd1)} lo que esper\xE1s recibir. La diferencia es el precio: ${plata(bs.precio)}. Lo mismo que la simulaci\xF3n.`);
    n.preguntar("volatilidad");
    n.capitulo("M\xE1s volatilidad");
    n.animar([
      { pieza: ["densidad", "enDinero"], a: { k: sigmaAlta }, dur: 2 },
      { pieza: "enDinero", a: { etiqueta: `N(d2) = ${pct(bsAlto.Nd2)}` }, dur: 2 },
      ...futuros.flatMap((_, i) => [
        { pieza: `f${i}`, a: { opacidad: 0 }, dur: 0.4 },
        { pieza: `g${i}`, a: { opacidad: 0 }, dur: 0.4 }
      ])
    ]);
    escribir([
      `\u03C3 = ${pct(sigma, 0)} \u2192 ${pct(sigmaAlta, 0)}`,
      `d1 = ${fijo(bsAlto.d1, 3)}   d2 = ${fijo(bsAlto.d2, 3)}`,
      `N(d1) = ${fijo(bsAlto.Nd1, 3)}   N(d2) = ${fijo(bsAlto.Nd2, 3)}`,
      `C = ${plata(bs.precio)} \u2192 ${plata(bsAlto.precio)}`
    ], 0.6, { 0: { color: "acento2", peso: 700 }, 3: { color: "exito", peso: 800 } });
    n.decir(`Con \u03C3 = ${pct(sigmaAlta, 0)} la campana se ensancha: hay m\xE1s futuros muy arriba, que pagan mucho, y m\xE1s muy abajo, que pagan cero (igual que antes). Lo malo est\xE1 acotado y lo bueno no: el call sube de ${plata(bs.precio)} a ${plata(bsAlto.precio)}.`);
    n.decir("Y al rev\xE9s: como todo lo dem\xE1s se lee en pantalla, del precio al que se negocia una opci\xF3n se puede despejar qu\xE9 \u03C3 est\xE1 suponiendo el mercado. Es la volatilidad impl\xEDcita, el n\xFAmero que m\xE1s se mira en una pantalla de opciones.");
    return {
      titulo: titulo || "De d\xF3nde sale Black-Scholes",
      descripcion: descripcion || `Un call con S = ${plata(S, 0)}, K = ${plata(K, 0)}, ${plazo(T)}, r = ${pct(r3)} y \u03C3 = ${pct(sigma, 0)}: vale ${plata(bs.precio)} por la f\xF3rmula y ${plata(mc.precio)} simulando.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
function desdeGriegas(opciones = {}) {
  const {
    S = 100,
    K = 100,
    T = 0.5,
    r: r3 = 0.05,
    sigma = 0.25,
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  const base = { K, T, r: r3, sigma };
  const precioCon = (x, cambios = {}) => blackScholes({ ...base, S: x, ...cambios }).precio;
  const griegasEn = (x, cambios = {}) => griegas({ ...base, S: x, ...cambios });
  const g0 = griegasEn(S);
  const c0 = precioCon(S);
  const xmin = K * 0.6;
  const xmax = K * 1.4;
  const sigmaAlta = sigma * 1.8;
  const rAlta = r3 + 0.05;
  const Tfin = 1 / 52;
  const topePrecio = Math.ceil(precioCon(xmax, { sigma: sigmaAlta }) * 1.08 / 5) * 5;
  const xs = Array.from({ length: 121 }, (_, i) => xmin + (xmax - xmin) * i / 120);
  const extremo = (fn) => xs.reduce((m, x) => Math.max(m, Math.abs(fn(x))), 0);
  const rangos = {
    delta: { ymin: -0.08, ymax: 1.1, pasoY: 0.5, etiquetaY: "\u0394" },
    gamma: { ymin: -extremo((x) => griegasEn(x).gamma) * 0.08, ymax: extremo((x) => griegasEn(x).gamma) * 1.15, etiquetaY: "\u0393" },
    theta: { ymin: -extremo((x) => griegasEn(x).theta) * 1.15, ymax: extremo((x) => griegasEn(x).theta) * 0.12, etiquetaY: "\u0398 por d\xEDa" },
    vega: { ymin: -extremo((x) => griegasEn(x).vega) * 0.08, ymax: extremo((x) => griegasEn(x).vega) * 1.15, etiquetaY: "\u03BD por punto" }
  };
  for (const rg of Object.values(rangos)) rg.pasoY ??= pasoPara(rg.ymax - rg.ymin, 3);
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const arribaPl = angosta ? { x: 330, y: arriba + 170, ancho: 580, alto: 300 } : { x: 520, y: arriba + 200, ancho: 900, alto: 360 };
    const abajoPl = angosta ? { x: 330, y: arriba + 470, ancho: 580, alto: 220 } : { x: 520, y: arriba + 580, ancho: 900, alto: 280 };
    const pan = angosta ? { x: 24, y: arriba + 640, ancho: 600, tamano: 22 } : { x: 1010, y: arriba + 80, ancho: 570, tamano: 24 };
    const chico = angosta ? 15 : 19;
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.precio = plano({
      ...arribaPl,
      xmin,
      xmax,
      ymin: -topePrecio * 0.06,
      ymax: topePrecio,
      pasoX: pasoPara(xmax - xmin, angosta ? 4 : 8),
      pasoY: pasoPara(topePrecio, 4),
      etiquetaX: "S (precio de la acci\xF3n)",
      etiquetaY: "call",
      tamano: chico,
      decimales: 0
    });
    piezas.griega = plano({
      ...abajoPl,
      xmin,
      xmax,
      ...rangos.delta,
      pasoX: pasoPara(xmax - xmin, angosta ? 4 : 8),
      etiquetaX: "S",
      tamano: chico,
      decimales: 3
    });
    piezas.pagoG = grafica({ plano: "precio", f: (x) => pagoAlVencer("call", x, K), trazo: 0, color: "suave", grosor: 3, punteada: true });
    piezas.curvaT = grafica({ plano: "precio", f: (x, t) => precioCon(x, { T: t }), k: T, trazo: 0, color: "acento", grosor: 4.5 });
    piezas.curvaV = grafica({ plano: "precio", f: (x, s) => precioCon(x, { sigma: s }), k: sigma, color: "acento", grosor: 4.5, opacidad: 0 });
    piezas.curvaR = grafica({ plano: "precio", f: (x, tasa) => precioCon(x, { r: tasa }), k: r3, color: "acento", grosor: 4.5, opacidad: 0 });
    piezas.aqui = punto({ plano: "precio", mx: S, my: c0, radio: 10, color: "acento2", etiqueta: "", lado: "arriba-izquierda", opacidad: 0 });
    piezas.tangente = recta({ plano: "precio", mx: S, my: c0, pendiente: g0.delta, color: "acento2", grosor: 3, progreso: 0 });
    piezas.deltaCurva = grafica({ plano: "griega", f: (x) => griegasEn(x).delta, trazo: 0, color: "acento2", grosor: 4 });
    piezas.gammaCurva = grafica({ plano: "griega", f: (x) => griegasEn(x).gamma, trazo: 0, color: "exito", grosor: 4 });
    piezas.thetaCurva = grafica({ plano: "griega", f: (x) => griegasEn(x).theta, trazo: 0, color: "error", grosor: 4 });
    piezas.vegaCurva = grafica({ plano: "griega", f: (x) => griegasEn(x).vega, trazo: 0, color: "acento", grosor: 4 });
    piezas.aquiAbajo = punto({ plano: "griega", mx: S, my: g0.delta, radio: 9, color: "acento2", opacidad: 0 });
    piezas.tanGamma = recta({ plano: "griega", mx: S, my: g0.delta, pendiente: g0.gamma, color: "exito", grosor: 3, progreso: 0 });
    piezas.kLinea = recta({ plano: "griega", mx: K, my: 0, vertical: true, color: "suave", punteada: true, grosor: 2, progreso: 0, etiqueta: "K" });
    const lineas = ["l0", "l1", "l2", "l3", "l4", "l5", "l6"];
    panel(piezas, lineas, { ...pan, interlineado: 1.75 });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const escribir = (textos, estilos = {}) => {
      n.animar(lineas.map((l, i) => ({
        pieza: l,
        a: { texto: textos[i] ?? "", opacidad: textos[i] ? 1 : 0, color: estilos[i]?.color ?? "texto", peso: estilos[i]?.peso ?? 400 },
        dur: 0.3,
        en: n.tiempo + i * 0.12
      })));
    };
    const irA = (x, en, dur, conGamma = false) => {
      const g = griegasEn(x);
      const c = precioCon(x);
      n.linea.push(
        { pieza: "aqui", a: { mx: x, my: c }, dur, en },
        { pieza: "tangente", a: { mx: x, my: c, pendiente: g.delta }, dur, en },
        { pieza: "aquiAbajo", a: { mx: x, my: g.delta }, dur, en },
        { pieza: "l1", a: { texto: `S = ${plata(x)} \u2192 \u0394 = ${fijo(g.delta, 3)}` }, dur: 0, en: en + dur }
      );
      if (conGamma) {
        n.linea.push(
          { pieza: "tanGamma", a: { mx: x, my: g.delta, pendiente: g.gamma }, dur, en },
          { pieza: "l3", a: { texto: `\u0393 = ${fijo(g.gamma, 4)}` }, dur: 0, en: en + dur }
        );
      }
    };
    const pasear = (desde, hasta, dur, conGamma) => {
      muestrear(n, dur, 0.1, (f, en, d) => irA(desde + (hasta - desde) * (0.5 - Math.cos(Math.PI * f) / 2), en, d, conGamma));
      n.tiempo += dur;
    };
    n.capitulo("El precio antes de vencer");
    n.animar([
      { pieza: "pagoG", a: { trazo: 1 }, dur: 1 },
      { pieza: "curvaT", a: { trazo: 1 }, dur: 1.6, en: n.tiempo + 0.8 }
    ]);
    escribir([`Un call: K = ${plata(K, 0)}, ${plazo(T)}, \u03C3 = ${pct(sigma, 0)}, r = ${pct(r3)}`]);
    n.decir(`La punteada es lo que paga el call al vencer. La azul es lo que vale HOY seg\xFAn Black-Scholes, para cada precio posible de la acci\xF3n. Siempre queda por encima: todav\xEDa faltan ${plazo(T)} y puede pasar de todo.`);
    n.animar([
      { pieza: "aqui", a: { opacidad: 1, etiqueta: plata(c0) }, dur: 0.4 },
      { pieza: "l1", a: { texto: `Con S = ${plata(S, 0)}, el call vale ${plata(c0)}`, opacidad: 1 }, dur: 0.3 }
    ]);
    n.decir(`Con la acci\xF3n a ${plata(S, 0)}, el call vale ${plata(c0)}. Las griegas responden una sola pregunta, cinco veces: si cambia una de las cosas de las que depende el precio, y las dem\xE1s quedan quietas, \xBFcu\xE1nto cambia el precio? Son derivadas parciales.`);
    n.capitulo("\u0394 delta: la pendiente");
    n.animar([
      { pieza: "tangente", a: { progreso: 1 }, dur: 0.8 },
      { pieza: "aqui", a: { etiqueta: "" }, dur: 0.1 },
      { pieza: "l0", a: { texto: "\u0394 delta: por cada $ 1 de la acci\xF3n", color: "acento2", peso: 700 }, dur: 0.3 },
      { pieza: "l1", a: { texto: `S = ${plata(S)} \u2192 \u0394 = ${fijo(g0.delta, 3)}` }, dur: 0.3 }
    ]);
    n.decir(`Delta es la pendiente de la curva: cu\xE1nto sube el call si la acci\xF3n sube $ 1. Ac\xE1 \u0394 = ${fijo(g0.delta, 3)}: si la acci\xF3n pasa a ${plata(S + 1, 0)}, el call sube unos ${numero(g0.delta * 100, 0)} centavos.`);
    n.animar([
      { pieza: "deltaCurva", a: { trazo: 1 }, dur: 1.4 },
      { pieza: ["aquiAbajo"], a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.2 },
      { pieza: "kLinea", a: { progreso: 1 }, dur: 0.6 }
    ]);
    n.esperar(1.4);
    pasear(S, xmin + (xmax - xmin) * 0.08, 2.4, false);
    n.decir('Abajo est\xE1 delta para cada precio. Muy por debajo de K (el call est\xE1 "fuera del dinero") la curva es casi plana: \u0394 \u2248 0, el call casi no reacciona.', 0.2);
    pasear(xmin + (xmax - xmin) * 0.08, xmax - (xmax - xmin) * 0.06, 3.6, false);
    n.decir('Muy por encima de K ("en el dinero") la curva es casi una recta de pendiente 1: \u0394 \u2248 1, el call se mueve peso por peso con la acci\xF3n.', 0.2);
    pasear(xmax - (xmax - xmin) * 0.06, S, 2.4, false);
    n.decir(`Delta tambi\xE9n dice c\xF3mo cubrirse: quien vendi\xF3 un call compra ${fijo(g0.delta, 2)} acciones por cada uno, y si la acci\xF3n se mueve un poco, lo que gana por un lado lo pierde por el otro. Para un put, delta es negativa: gana cuando la acci\xF3n baja.`);
    n.capitulo("\u0393 gamma: la curvatura");
    n.animar([
      { pieza: "tanGamma", a: { progreso: 1 }, dur: 0.8 },
      { pieza: "l2", a: { texto: "\u0393 gamma: cu\xE1nto cambia \u0394 por $ 1", opacidad: 1, color: "exito", peso: 700 }, dur: 0.3 },
      { pieza: "l3", a: { texto: `\u0393 = ${fijo(g0.gamma, 4)}`, opacidad: 1 }, dur: 0.3 }
    ]);
    n.decir(`Gamma es la pendiente de delta, la verde de abajo: cu\xE1nto cambia delta por cada $ 1. Ac\xE1 \u0393 = ${fijo(g0.gamma, 4)}: si la acci\xF3n sube $ 1, delta pasa de ${fijo(g0.delta, 3)} a unos ${fijo(g0.delta + g0.gamma, 3)}. Es lo que hace que la curva de arriba se doble.`);
    n.animar([
      { pieza: ["deltaCurva", "aquiAbajo", "tanGamma"], a: { opacidad: 0 }, dur: 0.5 },
      { pieza: "griega", a: { ymin: rangos.gamma.ymin, ymax: rangos.gamma.ymax, etiquetaY: rangos.gamma.etiquetaY }, dur: 1 },
      { pieza: "griega", a: { pasoY: rangos.gamma.pasoY }, dur: 0, en: n.tiempo + 1 },
      { pieza: "gammaCurva", a: { trazo: 1 }, dur: 1.4, en: n.tiempo + 0.9 }
    ]);
    n.esperar(1);
    n.decir("Si dibujamos gamma para cada precio, es una campana: es m\xE1xima cerca de K. Ah\xED delta cambia m\xE1s r\xE1pido, y quien se cubre tiene que reacomodarse m\xE1s seguido. Lejos de K, delta casi no cambia y gamma es casi cero.");
    n.preguntar("theta");
    n.capitulo("\u0398 theta: el tiempo cuesta");
    n.animar([
      { pieza: "tangente", a: { progreso: 0 }, dur: 0.4 },
      { pieza: "gammaCurva", a: { opacidad: 0 }, dur: 0.5 },
      { pieza: "griega", a: { ymin: rangos.theta.ymin, ymax: rangos.theta.ymax, etiquetaY: rangos.theta.etiquetaY }, dur: 1 },
      { pieza: "griega", a: { pasoY: rangos.theta.pasoY }, dur: 0, en: n.tiempo + 1 },
      { pieza: "thetaCurva", a: { trazo: 1 }, dur: 1.4, en: n.tiempo + 0.9 }
    ]);
    escribir([
      "\u0398 theta: lo que pierde por cada d\xEDa",
      `\u0398 = ${plata(g0.theta, 3)} por d\xEDa`
    ], { 0: { color: "error", peso: 700 } });
    n.decir(`Theta es lo que pierde el call por cada d\xEDa que pasa, si todo lo dem\xE1s queda igual: ${plata(g0.theta, 3)} por d\xEDa. Abajo est\xE1 para cada precio: siempre negativa, y peor cerca de K.`);
    const duracionTiempo = 4.5;
    n.animar({ pieza: "curvaT", a: { k: Tfin }, dur: duracionTiempo, curva: "lineal" });
    muestrear(n, duracionTiempo, 0.1, (f, en, dur) => {
      const t = T + (Tfin - T) * f;
      n.linea.push(
        { pieza: "aqui", a: { mx: S, my: precioCon(S, { T: t }) }, dur, en },
        { pieza: "l2", a: { texto: `Faltan ${plazo(t)}: vale ${plata(precioCon(S, { T: t }))}`, opacidad: 1, color: "texto", peso: 400 }, dur: 0, en: en + dur }
      );
    });
    n.decir(`Miremos qu\xE9 pasa si dejamos correr el reloj, sin que la acci\xF3n se mueva: la curva se va hundiendo hasta pegarse a lo que paga al vencer. Con una semana por delante, el call vale ${plata(precioCon(S, { T: Tfin }))}.`);
    n.tiempo = Math.max(n.tiempo, n.linea.at(-1).en + 0.4);
    n.decir("El que compra opciones pierde un poco cada d\xEDa (por eso theta es negativa), y el que las vende lo cobra. Y se acelera al final: el \xFAltimo mes se pierde mucho m\xE1s que el primero.");
    n.animar([
      { pieza: "curvaT", a: { k: T }, dur: 1.2 },
      { pieza: "aqui", a: { my: c0 }, dur: 1.2 }
    ]);
    n.esperar(1.2);
    n.capitulo("\u03BD vega: la volatilidad");
    n.animar([
      { pieza: "thetaCurva", a: { opacidad: 0 }, dur: 0.5 },
      { pieza: "griega", a: { ymin: rangos.vega.ymin, ymax: rangos.vega.ymax, etiquetaY: rangos.vega.etiquetaY }, dur: 1 },
      { pieza: "griega", a: { pasoY: rangos.vega.pasoY }, dur: 0, en: n.tiempo + 1 },
      { pieza: "vegaCurva", a: { trazo: 1 }, dur: 1.4, en: n.tiempo + 0.9 },
      { pieza: "curvaV", a: { opacidad: 1 }, dur: 0.1 },
      { pieza: "curvaT", a: { opacidad: 0 }, dur: 0.1 }
    ]);
    escribir([
      "\u03BD vega: por cada punto (1 %) de \u03C3",
      `\u03BD = ${plata(g0.vega, 3)} por punto`
    ], { 0: { color: "acento", peso: 700 } });
    n.decir(`Vega (que no es una letra griega, pero se le dice as\xED; se escribe \u03BD) es cu\xE1nto sube el call si la volatilidad sube un punto: ${plata(g0.vega, 3)}. Abajo, tambi\xE9n es m\xE1xima cerca de K.`);
    n.animar([
      { pieza: "curvaV", a: { k: sigmaAlta }, dur: 2.4 },
      { pieza: "aqui", a: { my: precioCon(S, { sigma: sigmaAlta }) }, dur: 2.4 },
      { pieza: "l2", a: { texto: `\u03C3 = ${pct(sigmaAlta, 0)}: vale ${plata(precioCon(S, { sigma: sigmaAlta }))}`, opacidad: 1, color: "texto", peso: 400 }, dur: 0.3, en: n.tiempo + 2.2 }
    ]);
    n.decir(`Con \u03C3 = ${pct(sigmaAlta, 0)} toda la curva sube: el call pasa a valer ${plata(precioCon(S, { sigma: sigmaAlta }))}. M\xE1s incertidumbre, m\xE1s chances de terminar muy arriba, y lo de abajo sigue acotado.`);
    n.animar([
      { pieza: "curvaV", a: { k: sigma }, dur: 1.2 },
      { pieza: "aqui", a: { my: c0 }, dur: 1.2 }
    ]);
    n.esperar(1.2);
    n.capitulo("\u03C1 rho: la tasa");
    n.animar([
      { pieza: "curvaR", a: { opacidad: 1 }, dur: 0.1 },
      { pieza: "curvaV", a: { opacidad: 0 }, dur: 0.1 },
      { pieza: "curvaR", a: { k: rAlta }, dur: 2, en: n.tiempo + 0.2 },
      { pieza: "aqui", a: { my: precioCon(S, { r: rAlta }) }, dur: 2, en: n.tiempo + 0.2 }
    ]);
    escribir([
      "\u03C1 rho: por cada punto (1 %) de r",
      `\u03C1 = ${plata(g0.rho, 3)} por punto`,
      `r = ${pct(rAlta)}: vale ${plata(precioCon(S, { r: rAlta }))}`
    ], { 0: { color: "acento2", peso: 700 } });
    n.decir(`Rho es por cada punto de tasa: ${plata(g0.rho, 3)}. Con una tasa m\xE1s alta, K\xB7e^(\u2212rT) (lo que vas a pagar, tra\xEDdo a hoy) es m\xE1s chico, as\xED que el call vale un poco m\xE1s. En opciones de pocos meses casi no se nota: es la griega que menos se mira.`);
    n.animar({ pieza: "curvaR", a: { k: r3 }, dur: 1 });
    n.capitulo("Las cinco juntas");
    escribir([
      `Con S = ${plata(S, 0)}, el call vale ${plata(c0)}`,
      `\u0394 = ${fijo(g0.delta, 3)}   por $ 1 de la acci\xF3n`,
      `\u0393 = ${fijo(g0.gamma, 4)}   cambio de \u0394 por $ 1`,
      `\u0398 = ${plata(g0.theta, 3)}   por d\xEDa`,
      `\u03BD = ${plata(g0.vega, 3)}   por punto de \u03C3`,
      `\u03C1 = ${plata(g0.rho, 3)}   por punto de r`
    ], { 0: { peso: 700 }, 1: { color: "acento2" }, 2: { color: "exito" }, 3: { color: "error" }, 4: { color: "acento" } });
    n.animar({ pieza: "aqui", a: { my: c0 }, dur: 0.6 });
    n.decir("Las cinco juntas dicen c\xF3mo reacciona una opci\xF3n a todo lo que se mueve. Con ellas se arma una cobertura: por ejemplo, comprar y vender acciones hasta que delta d\xE9 cero, y as\xED no importa (por un rato) si la acci\xF3n sube o baja.");
    n.decir("En Python son cinco funciones de la f\xF3rmula. Y cuando no hay f\xF3rmula, se calculan igual: se mueve un poquito cada cosa, se recalcula el precio y se divide. Son las diferencias finitas, la misma idea que la derivada.");
    return {
      titulo: titulo || "Las griegas",
      descripcion: descripcion || `Delta, gamma, theta, vega y rho de un call con S = ${plata(S, 0)} y K = ${plata(K, 0)}: \u0394 = ${fijo(g0.delta, 3)}, \u0398 = ${plata(g0.theta, 3)} por d\xEDa.`,
      ancho: W,
      alto: H2,
      lectura,
      pausaFinal: 1.5,
      piezas,
      linea: n.linea
    };
  };
}
var ESTRATEGIAS = [
  {
    nombre: "Put protector",
    patas: [{ tipo: "accion", cantidad: 1 }, { tipo: "put", K: 95, cantidad: 1 }],
    idea: "Ten\xE9s la acci\xF3n y compr\xE1s un put: si se desploma, la vend\xE9s igual a K. Es un seguro: se paga la prima y la p\xE9rdida queda acotada."
  },
  {
    nombre: "Call cubierto",
    patas: [{ tipo: "accion", cantidad: 1 }, { tipo: "call", K: 110, cantidad: -1 }],
    idea: "Ten\xE9s la acci\xF3n y vend\xE9s un call: cobr\xE1s la prima hoy, a cambio de resignar lo que suba por encima de K. Una renta extra, con techo."
  },
  {
    nombre: "Straddle (cono)",
    patas: [{ tipo: "call", K: 100, cantidad: 1 }, { tipo: "put", K: 100, cantidad: 1 }],
    idea: "Un call y un put con el mismo K: no importa para qu\xE9 lado se mueva la acci\xF3n, sino cu\xE1nto. Es una apuesta a la volatilidad: pierde si la acci\xF3n se queda quieta."
  },
  {
    nombre: "Spread alcista",
    patas: [{ tipo: "call", K: 100, cantidad: 1 }, { tipo: "call", K: 115, cantidad: -1 }],
    idea: "Compr\xE1s un call y vend\xE9s otro m\xE1s arriba: la prima que cobr\xE1s abarata la que pag\xE1s. Gan\xE1s si sube, pero con techo; y lo que pod\xE9s perder tambi\xE9n es menos."
  }
];
function desdeEstrategias(opciones = {}) {
  const {
    S = 100,
    T = 0.25,
    r: r3 = 0.05,
    sigma = 0.25,
    estrategias = ESTRATEGIAS,
    titulo = "",
    descripcion = "",
    ritmo = 1,
    lectura = 13,
    preguntas = {}
  } = opciones;
  const xmin = S * 0.65;
  const xmax = S * 1.35;
  const conPrimas = estrategias.map((e) => ({
    ...e,
    patas: e.patas.map((p) => ({ ...p, prima: p.tipo === "accion" ? S : blackScholes({ S, K: p.K, T, r: r3, sigma, tipo: p.tipo }).precio }))
  }));
  const deLaPata = (p) => (x) => p.cantidad * ((p.tipo === "accion" ? x : pagoAlVencer(p.tipo, x, p.K)) - p.prima);
  const total = (e) => (x) => e.patas.reduce((suma, p) => suma + deLaPata(p)(x), 0);
  const xs = Array.from({ length: 701 }, (_, i) => xmin + (xmax - xmin) * i / 700);
  const resumen = conPrimas.map((e) => {
    const f = total(e);
    const ys = xs.map(f);
    const pendDer = (ys.at(-1) - ys.at(-2)) / (xs[1] - xs[0]);
    const empates = [];
    for (let i = 1; i < xs.length; i++) {
      if (ys[i - 1] < 0 !== ys[i] < 0) empates.push(xs[i - 1] + (xs[i] - xs[i - 1]) * (-ys[i - 1] / (ys[i] - ys[i - 1])));
    }
    return {
      maximo: Math.max(...ys, f(0)),
      minimo: Math.min(...ys, f(0)),
      sinTecho: pendDer > 0.01,
      sinPiso: pendDer < -0.01,
      empates,
      costo: e.patas.reduce((c, p) => c + p.cantidad * p.prima, 0)
    };
  });
  const todas = conPrimas.flatMap((e) => xs.map(total(e)));
  const piso = Math.max(-S * 0.4, Math.floor(Math.min(...todas) * 1.6 / 5) * 5);
  const tope = Math.min(S * 0.4, Math.ceil(Math.max(...todas) * 1.1 / 5) * 5);
  const coloresPata = ["acento2", "exito", "error"];
  return function(disposicion) {
    const { angosta, W, H: H2, arriba } = lienzo(disposicion, titulo);
    const pl = angosta ? { x: 330, y: arriba + 260, ancho: 580, alto: 440 } : { x: 560, y: arriba + 360, ancho: 1e3, alto: 620 };
    const pan = angosta ? { x: 24, y: arriba + 560, ancho: 600, tamano: 22 } : { x: 1100, y: arriba + 80, ancho: 480, tamano: 24 };
    const piezas = {};
    if (titulo) piezas.titulo = piezaTitulo(titulo, W, angosta);
    piezas.pl = plano({
      ...pl,
      xmin,
      xmax,
      ymin: piso,
      ymax: tope,
      pasoX: pasoPara(xmax - xmin, angosta ? 4 : 7),
      pasoY: pasoPara(tope - piso, angosta ? 4 : 6),
      etiquetaX: "S al vencer",
      etiquetaY: "ganancia",
      tamano: angosta ? 15 : 19,
      decimales: 0
    });
    piezas.hoy = recta({ plano: "pl", mx: S, my: 0, vertical: true, color: "suave", punteada: true, grosor: 2, progreso: 0, etiqueta: `hoy ${plata(S, 0)}` });
    conPrimas.forEach((e, i) => {
      e.patas.forEach((p, j) => {
        piezas[`e${i}p${j}`] = grafica({ plano: "pl", f: deLaPata(p), trazo: 0, color: coloresPata[j % 3], grosor: 3, punteada: true });
      });
      piezas[`e${i}`] = grafica({ plano: "pl", f: total(e), trazo: 0, color: "acento", grosor: 6 });
      resumen[i].empates.forEach((x, j) => {
        piezas[`e${i}z${j}`] = punto({
          plano: "pl",
          mx: x,
          my: 0,
          radio: 8,
          color: "texto",
          etiqueta: plata(x, 1),
          lado: j % 2 ? "abajo-derecha" : "abajo-izquierda",
          opacidad: 0
        });
      });
    });
    const lineas = ["l0", "l1", "l2", "l3", "l4", "l5", "l6"];
    panel(piezas, lineas, { ...pan, interlineado: 1.75 });
    const n = crearNarrador({ ritmo, lectura, preguntas });
    const escribir = (textos, estilos = {}) => {
      n.animar(lineas.map((l, i) => ({
        pieza: l,
        a: { texto: textos[i] ?? "", opacidad: textos[i] ? 1 : 0, color: estilos[i]?.color ?? "texto", peso: estilos[i]?.peso ?? 400 },
        dur: 0.3,
        en: n.tiempo + i * 0.12
      })));
    };
    const nombrePata = (p) => {
      const signo = p.cantidad > 0 ? "+" : "\u2212";
      if (p.tipo === "accion") return `${signo} acci\xF3n a ${plata(S, 0)}`;
      return `${signo} ${p.tipo} K = ${plata(p.K, 0)} \xB7 prima ${plata(p.prima)}`;
    };
    n.capitulo("Las piezas de un lego");
    n.animar({ pieza: "hoy", a: { progreso: 1 }, dur: 0.6 });
    escribir([`Primas de Black-Scholes: ${plazo(T)}, \u03C3 = ${pct(sigma, 0)}`]);
    n.decir("Calls, puts y la acci\xF3n se pueden combinar como piezas de un lego. La ganancia de una combinaci\xF3n, al vencer, es simplemente la suma de lo que gana cada pata. Veamos las m\xE1s conocidas.");
    conPrimas.forEach((e, i) => {
      const res = resumen[i];
      if (i === 2) n.preguntar("straddle");
      n.capitulo(e.nombre);
      if (i > 0) {
        const antes = conPrimas[i - 1];
        n.animar({
          pieza: [`e${i - 1}`, ...antes.patas.map((_, j) => `e${i - 1}p${j}`), ...resumen[i - 1].empates.map((_, j) => `e${i - 1}z${j}`)],
          a: { opacidad: 0 },
          dur: 0.5
        });
        n.esperar(0.4);
      }
      n.animar(e.patas.map((_, j) => ({ pieza: `e${i}p${j}`, a: { trazo: 1 }, dur: 1.2, en: n.tiempo + j * 0.8 })));
      const maximo = res.sinTecho ? "sin techo" : plata(res.maximo);
      const minimo = res.sinPiso ? "sin piso" : plata(res.minimo);
      escribir([
        e.nombre,
        ...e.patas.map(nombrePata),
        `Ganancia m\xE1xima: ${maximo}`,
        `P\xE9rdida m\xE1xima: ${minimo}`,
        res.empates.length ? `Empate en ${res.empates.map((x) => plata(x, 1)).join(" y ")}` : ""
      ].slice(0, 7), Object.fromEntries([[0, { peso: 800, color: "acento" }], ...e.patas.map((_, j) => [j + 1, { color: coloresPata[j % 3] }])]));
      n.decir(e.idea);
      n.animar([
        { pieza: `e${i}`, a: { trazo: 1 }, dur: 1.6 },
        ...res.empates.map((_, j) => ({ pieza: `e${i}z${j}`, a: { opacidad: 1 }, dur: 0.4, en: n.tiempo + 1.4 }))
      ]);
      const armado = e.patas.some((p) => p.tipo === "accion") ? "" : res.costo >= 0 ? ` Armarla cuesta ${plata(res.costo)} de primas.` : ` Armarla deja ${plata(-res.costo)} de primas a favor.`;
      n.decir(`La l\xEDnea azul es la suma de las punteadas: la estrategia. Ganancia m\xE1xima: ${maximo}; p\xE9rdida m\xE1xima: ${minimo}.${armado}`);
    });
    n.capitulo("Una forma de pensar");
    n.decir("Cada estrategia es una opini\xF3n sobre lo que puede pasar, con un riesgo elegido: protegerse de una ca\xEDda, cobrar algo por resignar subas, apostar a que se mueva mucho, o a que suba un poco. Con opciones se elige la forma del riesgo.");
    return {
      titulo: titulo || "Estrategias con opciones",
      descripcion: descripcion || `${conPrimas.map((e) => e.nombre).join(", ")}: cada pata y su suma, al vencer, con primas de Black-Scholes.`,
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
  DIAS_HABILES,
  blackScholes,
  caminoPrecio,
  densidadFinal,
  desdeAccion,
  desdeBlackScholes,
  desdeEstrategias,
  desdeGriegas,
  desdeInteres,
  desdePago,
  fijo,
  griegas,
  montecarlo,
  normalesConSemilla,
  pagoAlVencer,
  plata,
  rendimientos,
  valorFuturo,
  valorPresente,
  volatilidad
};

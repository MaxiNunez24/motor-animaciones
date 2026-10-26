# -*- coding: utf-8 -*-
# El trazador: corre un programa de Python y anota cada paso que da.
#
# Este archivo es el ÚNICO lugar donde está. Lo usan:
#   - herramientas/trazar.py, desde la consola;
#   - el navegador, con Pyodide: herramientas/construir.js lo copia, tal cual,
#     a src/pedagogico/trazador-py.js (un test verifica que sean iguales).
#
# Cada paso es la línea que está por correr, con las variables como están en
# ese momento y todo lo que se mostró hasta ahí. Si el programa está adentro de
# una función, el paso trae también la PILA de llamadas: cada función que se
# está ejecutando, con sus variables. Usa sys.settrace, igual que la medición
# de pasos de la plataforma del curso.
#
# Las listas, los diccionarios y los objetos llevan un número ("ref"): el
# mismo número en dos variables quiere decir que son LA MISMA lista, no dos
# iguales. Es lo que hace falta para entender por qué cambiar una "cambia la otra".
#
# Abajo de todo está _motor_probar(), que corre los tests (las funciones
# test_...) y anota cada assert: qué se esperaba y qué dio.

import ast
import io
import json
import sys
import types
import builtins
from contextlib import redirect_stdout

_ARCHIVO = "<programa>"
# Las funciones (no los cuerpos de las clases ni los <genexpr>) tienen esta
# marca en su código: son las que van a la pila de llamadas.
_CO_OPTIMIZADO = 0x1


class _Tope(Exception):
    pass


class _SinEntrada(Exception):
    pass


class _Describir:
    """Escribe valores para la escena, y les pone número a los que se comparten.

    Los números van en orden de aparición (1, 2, 3...) y no son el id() de
    Python: el id cambia de una corrida a otra, y la animación tiene que salir
    igual cada vez. Los objetos se guardan en `vivos` para que Python no los
    borre y reuse su id con otro.
    """

    def __init__(self):
        self.numeros = {}
        self.vivos = []

    def ref(self, valor):
        clave = id(valor)
        if clave not in self.numeros:
            self.numeros[clave] = len(self.numeros) + 1
            self.vivos.append(valor)
        return self.numeros[clave]

    @staticmethod
    def es_objeto(valor):
        """Un objeto de una clase del programa (no un int, una lista, etc.)."""
        return type(valor).__module__ == "__main__" and hasattr(valor, "__dict__") and not isinstance(valor, type)

    def texto(self, valor, profundidad=0):
        """Cómo se escribe un valor, sin direcciones de memoria (que cambian
        en cada corrida): un objeto sin __repr__ propio se escribe Clase #n."""
        if self.es_objeto(valor):
            if type(valor).__repr__ is not object.__repr__:
                return repr(valor)
            return f"{type(valor).__name__} #{self.ref(valor)}"
        if profundidad > 3:
            return "…"
        if isinstance(valor, list):
            return "[" + ", ".join(self.texto(x, profundidad + 1) for x in valor) + "]"
        if isinstance(valor, tuple):
            interior = ", ".join(self.texto(x, profundidad + 1) for x in valor)
            return f"({interior},)" if len(valor) == 1 else f"({interior})"
        if isinstance(valor, dict):
            return "{" + ", ".join(f"{self.texto(k, profundidad + 1)}: {self.texto(v, profundidad + 1)}" for k, v in valor.items()) + "}"
        if isinstance(valor, set):
            return "{" + ", ".join(sorted(self.texto(x, profundidad + 1) for x in valor)) + "}" if valor else "set()"
        return repr(valor)

    def describir(self, valor):
        d = {"tipo": type(valor).__name__, "repr": self.texto(valor)}
        if isinstance(valor, (list, tuple)):
            d["items"] = [self.texto(x) for x in valor]
        elif isinstance(valor, dict):
            d["pares"] = [[self.texto(k), self.texto(v)] for k, v in valor.items()]
        elif self.es_objeto(valor):
            d["atributos"] = [[k, self.texto(v)] for k, v in vars(valor).items() if not k.startswith("__")]
        if isinstance(valor, (list, dict, set)) or self.es_objeto(valor):
            d["ref"] = self.ref(valor)
        return d

    def variables(self, espacio):
        """Las variables del programa, sin lo que pone Python por su cuenta."""
        return {
            nombre: self.describir(valor)
            for nombre, valor in list(espacio.items())
            if not nombre.startswith("__")
            and not isinstance(valor, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type))
        }


def _es_del_programa(codigo):
    return codigo.co_filename == _ARCHIVO


def _es_funcion(codigo):
    return _es_del_programa(codigo) and bool(codigo.co_flags & _CO_OPTIMIZADO) and not codigo.co_name.startswith("<")


# Más llamadas que estas no entran en la pantalla, y una recursión sin caso
# base llegaría a cientos: la traza pesaría megas (y en el navegador, con
# Pyodide, se notaría). Se guardan las últimas, con un aviso de cuántas faltan.
_MAX_MARCOS = 10


def _pila(frame, d):
    """Las funciones que se están ejecutando, de la de más afuera a la actual."""
    funciones = []
    while frame is not None:
        if _es_funcion(frame.f_code):
            funciones.append(frame)
        frame = frame.f_back
    ocultas = max(len(funciones) - _MAX_MARCOS, 0)
    marcos = [{"funcion": f.f_code.co_name, "linea": f.f_lineno, "variables": d.variables(f.f_locals)}
              for f in reversed(funciones[:_MAX_MARCOS])]
    if ocultas:
        marcos.insert(0, {"funcion": f"… y {ocultas} llamadas más", "linea": 0, "variables": {}})
    return marcos


def _motor_trazar(codigo, max_pasos=400, entradas=()):
    """Devuelve la traza como texto JSON: {"codigo", "lenguaje", "traza"}.

    `entradas` son las respuestas para input(), en orden: un programa que
    pregunta algo no puede quedarse esperando a que alguien escriba.
    """
    pasos = []
    salida = io.StringIO()
    espacio = {"__name__": "__main__"}
    pendientes = list(entradas)
    d = _Describir()

    def entrada(mensaje=""):
        # Como en la consola: se ve la pregunta y lo que "escribió" el usuario.
        salida.write(str(mensaje))
        if not pendientes:
            raise _SinEntrada()
        valor = str(pendientes.pop(0))
        salida.write(valor + "\n")
        return valor

    def anotar(frame, **extra):
        if len(pasos) >= max_pasos:
            raise _Tope()
        paso = {"linea": frame.f_lineno, "variables": d.variables(espacio), "salida": salida.getvalue()}
        pila = _pila(frame, d)
        if pila:
            paso["pila"] = pila
        paso.update(extra)
        pasos.append(paso)

    def local(frame, evento, arg):
        if evento == "line":
            anotar(frame)
        elif evento == "return" and _es_funcion(frame.f_code):
            # La función termina: se anota qué devuelve, mientras todavía está en la pila.
            anotar(frame, retorno={"funcion": frame.f_code.co_name, "valor": d.texto(arg)})
        return local

    def global_(frame, evento, arg):
        codigo_frame = frame.f_code
        if _es_del_programa(codigo_frame) and (codigo_frame.co_name == "<module>" or _es_funcion(codigo_frame)):
            return local
        return None

    def cortar(tipo, mensaje):
        ultimo = pasos[-1] if pasos else {"linea": 0}
        paso = {"linea": ultimo["linea"], "variables": d.variables(espacio), "salida": salida.getvalue(),
                "excepcion": {"tipo": tipo, "mensaje": mensaje}}
        if ultimo.get("pila"):
            paso["pila"] = ultimo["pila"]
        pasos.append(paso)

    try:
        compilado = compile(codigo, _ARCHIVO, "exec")
    except SyntaxError as e:
        return json.dumps({"codigo": codigo, "lenguaje": "python", "traza": [{
            "linea": e.lineno or 1, "variables": {}, "salida": "",
            "excepcion": {"tipo": "SyntaxError", "mensaje": e.msg},
        }]}, ensure_ascii=False)

    input_original = builtins.input
    builtins.input = entrada
    try:
        with redirect_stdout(salida):
            sys.settrace(global_)
            try:
                exec(compilado, espacio)
            finally:
                sys.settrace(None)
        pasos.append({"linea": 0, "variables": d.variables(espacio), "salida": salida.getvalue()})
    except _Tope:
        # Si la pila estaba llena, no era un bucle: era una función llamándose sin parar.
        recursiva = bool(pasos) and len(pasos[-1].get("pila", [])) > _MAX_MARCOS
        motivo = "la función se llama a sí misma sin parar: ¿falta el caso base?" if recursiva else "¿un bucle que no termina?"
        cortar("Corte", f"más de {max_pasos} pasos: {motivo}")
    except _SinEntrada:
        cortar("Falta una entrada", "el programa pidió un input() más de los que se cargaron")
    except RecursionError:
        cortar("RecursionError", "la función se llama a sí misma sin parar: ¿falta el caso base?")
    except Exception as e:
        cortar(type(e).__name__, repr(e.args[0]) if isinstance(e, KeyError) and e.args else str(e))
    finally:
        builtins.input = input_original
    return json.dumps({"codigo": codigo, "lenguaje": "python", "traza": pasos}, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Los tests
# ---------------------------------------------------------------------------

class _Asserts(ast.NodeTransformer):
    """Cambia cada `assert A == B` por una llamada que anota A y B por separado.

    Así, cuando falla, se puede decir "esperaba 75 y dio 0", que es lo que
    hace falta para encontrar el error (un AssertionError pelado no dice nada).
    """

    def visit_Assert(self, nodo):
        prueba = nodo.test
        texto = ast.unparse(prueba)
        if isinstance(prueba, ast.Compare) and len(prueba.ops) == 1 and isinstance(prueba.ops[0], ast.Eq):
            izq, der = prueba.left, prueba.comparators[0]
        else:
            izq, der = prueba, ast.Constant(True)
        llamada = ast.Call(
            func=ast.Name("__motor_assert", ast.Load()),
            args=[
                ast.Lambda(ast.arguments([], [], None, [], [], None, []), izq),
                ast.Lambda(ast.arguments([], [], None, [], [], None, []), der),
                ast.Constant(texto),
                ast.Constant(nodo.lineno),
            ],
            keywords=[],
        )
        return ast.copy_location(ast.Expr(llamada), nodo)


class _FallaAssert(Exception):
    pass


def _motor_probar(codigo):
    """Corre el programa y después cada función test_..., en orden.

    Devuelve JSON: {"codigo", "tests": [{"nombre", "linea", "estado", "asserts": [...], "error"}]}.
    estado es "pasa", "falla" (un assert no se cumplió) o "error" (se rompió otra cosa).
    """
    try:
        arbol = ast.fix_missing_locations(_Asserts().visit(ast.parse(codigo)))
        compilado = compile(arbol, _ARCHIVO, "exec")
    except SyntaxError as e:
        return json.dumps({"codigo": codigo, "tests": [], "error": f"SyntaxError en la línea {e.lineno}: {e.msg}"}, ensure_ascii=False)

    d = _Describir()
    anotados = []

    def assert_(izq, der, texto, linea):
        obtenido = izq()
        esperado = der()
        ok = obtenido == esperado
        anotados.append({"linea": linea, "texto": texto, "obtenido": d.texto(obtenido), "esperado": d.texto(esperado), "ok": ok})
        if not ok:
            raise _FallaAssert()

    espacio = {"__name__": "__main__", "__motor_assert": assert_}
    salida = io.StringIO()
    resultado = {"codigo": codigo, "tests": []}
    with redirect_stdout(salida):
        try:
            exec(compilado, espacio)
        except Exception as e:
            resultado["error"] = f"{type(e).__name__}: {e}"
            return json.dumps(resultado, ensure_ascii=False)
        nombres = [n for n, v in espacio.items() if n.startswith("test_") and isinstance(v, types.FunctionType)]
        for nombre in nombres:
            funcion = espacio[nombre]
            anotados.clear()
            test = {"nombre": nombre, "linea": funcion.__code__.co_firstlineno, "estado": "pasa"}
            try:
                funcion()
            except _FallaAssert:
                test["estado"] = "falla"
            except Exception as e:
                test["estado"] = "error"
                test["error"] = f"{type(e).__name__}: {e}"
            test["asserts"] = list(anotados)
            resultado["tests"].append(test)
    return json.dumps(resultado, ensure_ascii=False)

# -*- coding: utf-8 -*-
# El trazador: corre un programa de Python y anota cada paso que da.
#
# Este archivo es el ÚNICO lugar donde está. Lo usan:
#   - herramientas/trazar.py, desde la consola;
#   - el navegador, con Pyodide: herramientas/construir.js lo copia, tal cual,
#     a src/pedagogico/trazador-py.js (un test verifica que sean iguales).
#
# Cada paso es la línea que está por correr, con las variables como están en
# ese momento y todo lo que se mostró hasta ahí. Usa sys.settrace, igual que
# la medición de pasos de la plataforma del curso.

import io
import json
import sys
import types
import builtins
from contextlib import redirect_stdout

_ARCHIVO = "<programa>"


class _Tope(Exception):
    pass


class _SinEntrada(Exception):
    pass


def _describir(valor):
    """Un valor como lo necesita la escena: su tipo, cómo se escribe y, si es
    una colección, sus elementos ya escritos."""
    d = {"tipo": type(valor).__name__, "repr": repr(valor)}
    if isinstance(valor, (list, tuple)):
        d["items"] = [repr(x) for x in valor]
    elif isinstance(valor, dict):
        d["pares"] = [[repr(k), repr(v)] for k, v in valor.items()]
    return d


def _variables(espacio):
    """Las variables del programa, sin lo que pone Python por su cuenta."""
    return {
        nombre: _describir(valor)
        for nombre, valor in espacio.items()
        if not nombre.startswith("__")
        and not isinstance(valor, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, type))
    }


def _motor_trazar(codigo, max_pasos=400, entradas=()):
    """Devuelve la traza como texto JSON: {"codigo", "lenguaje", "traza"}.

    `entradas` son las respuestas para input(), en orden: un programa que
    pregunta algo no puede quedarse esperando a que alguien escriba.
    """
    pasos = []
    salida = io.StringIO()
    espacio = {"__name__": "__main__"}
    pendientes = list(entradas)

    def entrada(mensaje=""):
        # Como en la consola: se ve la pregunta y lo que "escribió" el usuario.
        salida.write(str(mensaje))
        if not pendientes:
            raise _SinEntrada()
        valor = str(pendientes.pop(0))
        salida.write(valor + "\n")
        return valor

    def local(frame, evento, arg):
        if evento == "line":
            if len(pasos) >= max_pasos:
                raise _Tope()
            # Por ahora solo el nivel del programa: las variables de adentro de
            # una función van a necesitar mostrar la pila de llamadas.
            pasos.append({
                "linea": frame.f_lineno,
                "variables": _variables(frame.f_locals),
                "salida": salida.getvalue(),
            })
        return local

    def global_(frame, evento, arg):
        if frame.f_code.co_filename == _ARCHIVO and frame.f_code.co_name == "<module>":
            return local
        return None

    def cortar(tipo, mensaje):
        ultimo = pasos[-1]["linea"] if pasos else 0
        pasos.append({
            "linea": ultimo,
            "variables": _variables(espacio),
            "salida": salida.getvalue(),
            "excepcion": {"tipo": tipo, "mensaje": mensaje},
        })

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
        pasos.append({"linea": 0, "variables": _variables(espacio), "salida": salida.getvalue()})
    except _Tope:
        cortar("Corte", f"más de {max_pasos} pasos: ¿un bucle que no termina?")
    except _SinEntrada:
        cortar("Falta una entrada", "el programa pidió un input() más de los que se cargaron")
    except Exception as e:
        cortar(type(e).__name__, repr(e.args[0]) if isinstance(e, KeyError) and e.args else str(e))
    finally:
        builtins.input = input_original
    return json.dumps({"codigo": codigo, "lenguaje": "python", "traza": pasos}, ensure_ascii=False)

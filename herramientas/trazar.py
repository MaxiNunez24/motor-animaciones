# -*- coding: utf-8 -*-
"""Corre un programa de Python y escribe su TRAZA: cada línea que corrió, con
cuánto valía cada variable en ese momento y lo que había mostrado hasta ahí.

    python herramientas/trazar.py programa.py --nombre bucle-for --salida ejemplos/conceptos/bucle-for.traza.js

Sale un .js que deja la traza en Motor.trazas["bucle-for"], para que la escena
la use con Motor.desdeTraza(). Es un script común (no un módulo) para que la
página ande abriéndola con doble clic. Con --json sale el JSON pelado.

Usa sys.settrace, igual que la medición de pasos de la plataforma del curso.
Este mismo código va a correr adentro del navegador, con Pyodide, para que las
animaciones se armen solas con el programa que escribe cada alumno.
"""

import argparse
import io
import json
import sys
import types
from contextlib import redirect_stdout

ARCHIVO = "<programa>"

# Un programa con un bucle infinito no puede trazarse para siempre.
MAX_PASOS = 400


class _Tope(Exception):
    pass


def describir(valor):
    """Un valor como lo necesita la escena: su tipo, cómo se escribe y, si es
    una colección, sus elementos ya escritos."""
    d = {"tipo": type(valor).__name__, "repr": repr(valor)}
    if isinstance(valor, (list, tuple)):
        d["items"] = [repr(x) for x in valor]
    elif isinstance(valor, dict):
        d["pares"] = [[repr(k), repr(v)] for k, v in valor.items()]
    return d


def variables(espacio):
    """Las variables del programa, sin lo que pone Python por su cuenta
    (__name__, los módulos importados, las funciones definidas)."""
    return {
        nombre: describir(valor)
        for nombre, valor in espacio.items()
        if not nombre.startswith("__")
        and not isinstance(valor, (types.ModuleType, types.FunctionType, type))
    }


def trazar(codigo):
    pasos = []
    salida = io.StringIO()
    espacio = {"__name__": "__main__"}

    def local(frame, evento, arg):
        if evento == "line":
            if len(pasos) >= MAX_PASOS:
                raise _Tope()
            # Por ahora solo el nivel del programa: las variables de adentro de
            # una función van a necesitar mostrar la pila de llamadas.
            pasos.append({
                "linea": frame.f_lineno,
                "variables": variables(frame.f_locals),
                "salida": salida.getvalue(),
            })
        return local

    def global_(frame, evento, arg):
        return local if frame.f_code.co_filename == ARCHIVO and frame.f_code.co_name == "<module>" else None

    compilado = compile(codigo, ARCHIVO, "exec")
    with redirect_stdout(salida):
        sys.settrace(global_)
        try:
            exec(compilado, espacio)
        except _Tope:
            pasos.append({"linea": 0, "variables": variables(espacio), "salida": salida.getvalue(),
                          "excepcion": {"tipo": "Corte", "mensaje": f"más de {MAX_PASOS} pasos"}})
            return pasos
        except Exception as e:
            sys.settrace(None)
            ultimo = pasos[-1]["linea"] if pasos else 0
            pasos.append({
                "linea": ultimo,
                "variables": variables(espacio),
                "salida": salida.getvalue(),
                "excepcion": {"tipo": type(e).__name__, "mensaje": str(e) if not isinstance(e, KeyError) else repr(e.args[0])},
            })
            return pasos
        finally:
            sys.settrace(None)
    # El último paso: terminó, sin línea por correr.
    pasos.append({"linea": 0, "variables": variables(espacio), "salida": salida.getvalue()})
    return pasos


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("programa")
    p.add_argument("--nombre", help="cómo se llama la traza en Motor.trazas")
    p.add_argument("--salida", help="archivo donde escribirla (si no, se muestra)")
    p.add_argument("--json", action="store_true", help="escribir JSON y no un .js")
    a = p.parse_args()

    with open(a.programa, encoding="utf-8") as f:
        codigo = f.read()
    datos = {"codigo": codigo, "lenguaje": "python", "traza": trazar(codigo)}
    texto = json.dumps(datos, ensure_ascii=False, indent=1)
    if not a.json:
        nombre = a.nombre or a.programa.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        texto = (
            "// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.\n"
            "// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.\n"
            "if (!window.Motor) throw new Error('Cargá motor.min.js antes que esta traza.');\n"
            "Motor.trazas = Motor.trazas || {};\n"
            f"Motor.trazas[{json.dumps(nombre)}] = {texto};\n"
        )
    if a.salida:
        with open(a.salida, "w", encoding="utf-8", newline="\n") as f:
            f.write(texto)
        print(f"{len(datos['traza'])} pasos → {a.salida}")
    else:
        print(texto)


if __name__ == "__main__":
    main()

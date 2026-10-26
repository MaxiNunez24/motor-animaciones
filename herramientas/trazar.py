# -*- coding: utf-8 -*-
"""Corre un programa de Python y escribe su TRAZA: cada línea que corrió, con
cuánto valía cada variable en ese momento y lo que había mostrado hasta ahí.

    python herramientas/trazar.py programa.py --nombre bucle-for --salida ejemplos/conceptos/bucle-for.traza.js
    python herramientas/trazar.py programa.py --entradas "Ana" "30" --json

Sale un .js que deja la traza en Motor.trazas["bucle-for"], para que la escena
la use con Motor.desdeTraza(). Es un script común (no un módulo) para que la
página ande abriéndola con doble clic. Con --json sale el JSON pelado.

El trazador en sí está en src/pedagogico/trazador.py: es el mismo que corre en
el navegador con Pyodide.
"""

import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "src" / "pedagogico"))
from trazador import _motor_trazar  # noqa: E402


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("programa")
    p.add_argument("--nombre", help="cómo se llama la traza en Motor.trazas")
    p.add_argument("--salida", help="archivo donde escribirla (si no, se muestra)")
    p.add_argument("--entradas", nargs="*", default=[], help="las respuestas para input(), en orden")
    p.add_argument("--json", action="store_true", help="escribir JSON y no un .js")
    a = p.parse_args()

    with open(a.programa, encoding="utf-8") as f:
        codigo = f.read()
    datos = json.loads(_motor_trazar(codigo, entradas=a.entradas))
    texto = json.dumps(datos, ensure_ascii=False, indent=1)
    if not a.json:
        nombre = a.nombre or pathlib.Path(a.programa).stem
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

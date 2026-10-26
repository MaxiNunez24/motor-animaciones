// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que esta traza.');
Motor.trazas = Motor.trazas || {};
Motor.trazas["referencias"] = {
 "codigo": "a = [1, 2, 3]\nb = a\nb.append(4)\nc = a.copy()\nc.append(5)\nprint(a, b, c)\n",
 "lenguaje": "python",
 "traza": [
  {
   "linea": 1,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 2,
   "variables": {
    "a": {
     "tipo": "list",
     "repr": "[1, 2, 3]",
     "items": [
      "1",
      "2",
      "3"
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 3,
   "variables": {
    "a": {
     "tipo": "list",
     "repr": "[1, 2, 3]",
     "items": [
      "1",
      "2",
      "3"
     ],
     "ref": 1
    },
    "b": {
     "tipo": "list",
     "repr": "[1, 2, 3]",
     "items": [
      "1",
      "2",
      "3"
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 4,
   "variables": {
    "a": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    },
    "b": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 5,
   "variables": {
    "a": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    },
    "b": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    },
    "c": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 2
    }
   },
   "salida": ""
  },
  {
   "linea": 6,
   "variables": {
    "a": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    },
    "b": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    },
    "c": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4, 5]",
     "items": [
      "1",
      "2",
      "3",
      "4",
      "5"
     ],
     "ref": 2
    }
   },
   "salida": ""
  },
  {
   "linea": 0,
   "variables": {
    "a": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    },
    "b": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4]",
     "items": [
      "1",
      "2",
      "3",
      "4"
     ],
     "ref": 1
    },
    "c": {
     "tipo": "list",
     "repr": "[1, 2, 3, 4, 5]",
     "items": [
      "1",
      "2",
      "3",
      "4",
      "5"
     ],
     "ref": 2
    }
   },
   "salida": "[1, 2, 3, 4] [1, 2, 3, 4] [1, 2, 3, 4, 5]\n"
  }
 ]
};

// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que esta traza.');
Motor.trazas = Motor.trazas || {};
Motor.trazas["bucle-for"] = {
 "codigo": "numeros = [4, 8, 15]\ntotal = 0\nfor n in numeros:\n    total = total + n\nprint(\"Total:\", total)\n",
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
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    }
   },
   "salida": ""
  },
  {
   "linea": 3,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "0"
    }
   },
   "salida": ""
  },
  {
   "linea": 4,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "0"
    },
    "n": {
     "tipo": "int",
     "repr": "4"
    }
   },
   "salida": ""
  },
  {
   "linea": 3,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "4"
    },
    "n": {
     "tipo": "int",
     "repr": "4"
    }
   },
   "salida": ""
  },
  {
   "linea": 4,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "4"
    },
    "n": {
     "tipo": "int",
     "repr": "8"
    }
   },
   "salida": ""
  },
  {
   "linea": 3,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "12"
    },
    "n": {
     "tipo": "int",
     "repr": "8"
    }
   },
   "salida": ""
  },
  {
   "linea": 4,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "12"
    },
    "n": {
     "tipo": "int",
     "repr": "15"
    }
   },
   "salida": ""
  },
  {
   "linea": 3,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "27"
    },
    "n": {
     "tipo": "int",
     "repr": "15"
    }
   },
   "salida": ""
  },
  {
   "linea": 5,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "27"
    },
    "n": {
     "tipo": "int",
     "repr": "15"
    }
   },
   "salida": ""
  },
  {
   "linea": 0,
   "variables": {
    "numeros": {
     "tipo": "list",
     "repr": "[4, 8, 15]",
     "items": [
      "4",
      "8",
      "15"
     ]
    },
    "total": {
     "tipo": "int",
     "repr": "27"
    },
    "n": {
     "tipo": "int",
     "repr": "15"
    }
   },
   "salida": "Total: 27\n"
  }
 ]
};

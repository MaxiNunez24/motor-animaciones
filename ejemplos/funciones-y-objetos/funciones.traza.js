// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que esta traza.');
Motor.trazas = Motor.trazas || {};
Motor.trazas["funciones"] = {
 "codigo": "def sumar(a, b):\n    total = a + b\n    return total\n\nx = sumar(3, 4)\ny = sumar(x, 10)\nprint(x, y)\n",
 "lenguaje": "python",
 "traza": [
  {
   "linea": 1,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 5,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 2,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "sumar",
     "linea": 2,
     "variables": {
      "a": {
       "tipo": "int",
       "repr": "3"
      },
      "b": {
       "tipo": "int",
       "repr": "4"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "sumar",
     "linea": 3,
     "variables": {
      "a": {
       "tipo": "int",
       "repr": "3"
      },
      "b": {
       "tipo": "int",
       "repr": "4"
      },
      "total": {
       "tipo": "int",
       "repr": "7"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "sumar",
     "linea": 3,
     "variables": {
      "a": {
       "tipo": "int",
       "repr": "3"
      },
      "b": {
       "tipo": "int",
       "repr": "4"
      },
      "total": {
       "tipo": "int",
       "repr": "7"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "sumar",
    "valor": "7"
   }
  },
  {
   "linea": 6,
   "variables": {
    "x": {
     "tipo": "int",
     "repr": "7"
    }
   },
   "salida": ""
  },
  {
   "linea": 2,
   "variables": {
    "x": {
     "tipo": "int",
     "repr": "7"
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "sumar",
     "linea": 2,
     "variables": {
      "a": {
       "tipo": "int",
       "repr": "7"
      },
      "b": {
       "tipo": "int",
       "repr": "10"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {
    "x": {
     "tipo": "int",
     "repr": "7"
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "sumar",
     "linea": 3,
     "variables": {
      "a": {
       "tipo": "int",
       "repr": "7"
      },
      "b": {
       "tipo": "int",
       "repr": "10"
      },
      "total": {
       "tipo": "int",
       "repr": "17"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {
    "x": {
     "tipo": "int",
     "repr": "7"
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "sumar",
     "linea": 3,
     "variables": {
      "a": {
       "tipo": "int",
       "repr": "7"
      },
      "b": {
       "tipo": "int",
       "repr": "10"
      },
      "total": {
       "tipo": "int",
       "repr": "17"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "sumar",
    "valor": "17"
   }
  },
  {
   "linea": 7,
   "variables": {
    "x": {
     "tipo": "int",
     "repr": "7"
    },
    "y": {
     "tipo": "int",
     "repr": "17"
    }
   },
   "salida": ""
  },
  {
   "linea": 0,
   "variables": {
    "x": {
     "tipo": "int",
     "repr": "7"
    },
    "y": {
     "tipo": "int",
     "repr": "17"
    }
   },
   "salida": "7 17\n"
  }
 ]
};

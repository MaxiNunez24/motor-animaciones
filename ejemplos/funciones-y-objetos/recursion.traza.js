// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que esta traza.');
Motor.trazas = Motor.trazas || {};
Motor.trazas["recursion"] = {
 "codigo": "def factorial(n):\n    if n == 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(4))\n",
 "lenguaje": "python",
 "traza": [
  {
   "linea": 1,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 6,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 2,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 2,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    }
   ]
  },
  {
   "linea": 4,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    }
   ]
  },
  {
   "linea": 2,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 2,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    }
   ]
  },
  {
   "linea": 4,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    }
   ]
  },
  {
   "linea": 2,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 2,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "2"
      }
     }
    }
   ]
  },
  {
   "linea": 4,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "2"
      }
     }
    }
   ]
  },
  {
   "linea": 2,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "2"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 2,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "1"
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
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "2"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 3,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "1"
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
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "2"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 3,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "1"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "factorial",
    "valor": "1"
   }
  },
  {
   "linea": 4,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "2"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "factorial",
    "valor": "2"
   }
  },
  {
   "linea": 4,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    },
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "3"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "factorial",
    "valor": "6"
   }
  },
  {
   "linea": 4,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "factorial",
     "linea": 4,
     "variables": {
      "n": {
       "tipo": "int",
       "repr": "4"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "factorial",
    "valor": "24"
   }
  },
  {
   "linea": 0,
   "variables": {},
   "salida": "24\n"
  }
 ]
};

// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que esta traza.');
Motor.trazas = Motor.trazas || {};
Motor.trazas["objetos"] = {
 "codigo": "class Alumno:\n    def __init__(self, nombre):\n        self.nombre = nombre\n        self.presentes = 0\n\n    def marcar(self):\n        self.presentes += 1\n\nlucia = Alumno(\"Lucía\")\nlucia.marcar()\notra = lucia\notra.marcar()\nprint(lucia.presentes)\n",
 "lenguaje": "python",
 "traza": [
  {
   "linea": 1,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 9,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 3,
   "variables": {},
   "salida": "",
   "pila": [
    {
     "funcion": "__init__",
     "linea": 3,
     "variables": {
      "self": {
       "tipo": "Alumno",
       "repr": "Alumno #1",
       "atributos": [],
       "ref": 1
      },
      "nombre": {
       "tipo": "str",
       "repr": "'Lucía'"
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
     "funcion": "__init__",
     "linea": 4,
     "variables": {
      "self": {
       "tipo": "Alumno",
       "repr": "Alumno #1",
       "atributos": [
        [
         "nombre",
         "'Lucía'"
        ]
       ],
       "ref": 1
      },
      "nombre": {
       "tipo": "str",
       "repr": "'Lucía'"
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
     "funcion": "__init__",
     "linea": 4,
     "variables": {
      "self": {
       "tipo": "Alumno",
       "repr": "Alumno #1",
       "atributos": [
        [
         "nombre",
         "'Lucía'"
        ],
        [
         "presentes",
         "0"
        ]
       ],
       "ref": 1
      },
      "nombre": {
       "tipo": "str",
       "repr": "'Lucía'"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "__init__",
    "valor": "None"
   }
  },
  {
   "linea": 10,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "0"
      ]
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 7,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "0"
      ]
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "marcar",
     "linea": 7,
     "variables": {
      "self": {
       "tipo": "Alumno",
       "repr": "Alumno #1",
       "atributos": [
        [
         "nombre",
         "'Lucía'"
        ],
        [
         "presentes",
         "0"
        ]
       ],
       "ref": 1
      }
     }
    }
   ]
  },
  {
   "linea": 7,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "1"
      ]
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "marcar",
     "linea": 7,
     "variables": {
      "self": {
       "tipo": "Alumno",
       "repr": "Alumno #1",
       "atributos": [
        [
         "nombre",
         "'Lucía'"
        ],
        [
         "presentes",
         "1"
        ]
       ],
       "ref": 1
      }
     }
    }
   ],
   "retorno": {
    "funcion": "marcar",
    "valor": "None"
   }
  },
  {
   "linea": 11,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "1"
      ]
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 12,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "1"
      ]
     ],
     "ref": 1
    },
    "otra": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "1"
      ]
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 7,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "1"
      ]
     ],
     "ref": 1
    },
    "otra": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "1"
      ]
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "marcar",
     "linea": 7,
     "variables": {
      "self": {
       "tipo": "Alumno",
       "repr": "Alumno #1",
       "atributos": [
        [
         "nombre",
         "'Lucía'"
        ],
        [
         "presentes",
         "1"
        ]
       ],
       "ref": 1
      }
     }
    }
   ]
  },
  {
   "linea": 7,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "2"
      ]
     ],
     "ref": 1
    },
    "otra": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "2"
      ]
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "marcar",
     "linea": 7,
     "variables": {
      "self": {
       "tipo": "Alumno",
       "repr": "Alumno #1",
       "atributos": [
        [
         "nombre",
         "'Lucía'"
        ],
        [
         "presentes",
         "2"
        ]
       ],
       "ref": 1
      }
     }
    }
   ],
   "retorno": {
    "funcion": "marcar",
    "valor": "None"
   }
  },
  {
   "linea": 13,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "2"
      ]
     ],
     "ref": 1
    },
    "otra": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "2"
      ]
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 0,
   "variables": {
    "lucia": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "2"
      ]
     ],
     "ref": 1
    },
    "otra": {
     "tipo": "Alumno",
     "repr": "Alumno #1",
     "atributos": [
      [
       "nombre",
       "'Lucía'"
      ],
      [
       "presentes",
       "2"
      ]
     ],
     "ref": 1
    }
   },
   "salida": "2\n"
  }
 ]
};

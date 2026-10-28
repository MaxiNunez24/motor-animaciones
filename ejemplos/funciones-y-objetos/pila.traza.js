// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que este archivo.');
Motor.trazas = Motor.trazas || {};
Motor.trazas["pila"] = {
 "codigo": "def precio_con_iva(precio):\n    iva = precio * 0.21\n    return precio + iva\n\n\ndef subtotal(cantidad, precio):\n    unitario = precio_con_iva(precio)\n    total = cantidad * unitario\n    return total\n\n\ndef ticket(productos):\n    suma = 0\n    for cantidad, precio in productos:\n        suma = suma + subtotal(cantidad, precio)\n    return round(suma, 2)\n\n\ncompra = [(2, 100), (1, 50)]\nprint(\"Total:\", ticket(compra))\n",
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
   "linea": 12,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 19,
   "variables": {},
   "salida": ""
  },
  {
   "linea": 20,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": ""
  },
  {
   "linea": 13,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 13,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      }
     }
    }
   ]
  },
  {
   "linea": 14,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 14,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      }
     }
    }
   ]
  },
  {
   "linea": 15,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    }
   ]
  },
  {
   "linea": 7,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    }
   ]
  },
  {
   "linea": 2,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "precio_con_iva",
     "linea": 2,
     "variables": {
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "precio_con_iva",
     "linea": 3,
     "variables": {
      "precio": {
       "tipo": "int",
       "repr": "100"
      },
      "iva": {
       "tipo": "float",
       "repr": "21.0"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "precio_con_iva",
     "linea": 3,
     "variables": {
      "precio": {
       "tipo": "int",
       "repr": "100"
      },
      "iva": {
       "tipo": "float",
       "repr": "21.0"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "precio_con_iva",
    "valor": "121.0"
   }
  },
  {
   "linea": 8,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 8,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      },
      "unitario": {
       "tipo": "float",
       "repr": "121.0"
      }
     }
    }
   ]
  },
  {
   "linea": 9,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 9,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      },
      "unitario": {
       "tipo": "float",
       "repr": "121.0"
      },
      "total": {
       "tipo": "float",
       "repr": "242.0"
      }
     }
    }
   ]
  },
  {
   "linea": 9,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "int",
       "repr": "0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 9,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      },
      "unitario": {
       "tipo": "float",
       "repr": "121.0"
      },
      "total": {
       "tipo": "float",
       "repr": "242.0"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "subtotal",
    "valor": "242.0"
   }
  },
  {
   "linea": 14,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 14,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "2"
      },
      "precio": {
       "tipo": "int",
       "repr": "100"
      }
     }
    }
   ]
  },
  {
   "linea": 15,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    }
   ]
  },
  {
   "linea": 7,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    }
   ]
  },
  {
   "linea": 2,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "precio_con_iva",
     "linea": 2,
     "variables": {
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "precio_con_iva",
     "linea": 3,
     "variables": {
      "precio": {
       "tipo": "int",
       "repr": "50"
      },
      "iva": {
       "tipo": "float",
       "repr": "10.5"
      }
     }
    }
   ]
  },
  {
   "linea": 3,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 7,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "precio_con_iva",
     "linea": 3,
     "variables": {
      "precio": {
       "tipo": "int",
       "repr": "50"
      },
      "iva": {
       "tipo": "float",
       "repr": "10.5"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "precio_con_iva",
    "valor": "60.5"
   }
  },
  {
   "linea": 8,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 8,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      },
      "unitario": {
       "tipo": "float",
       "repr": "60.5"
      }
     }
    }
   ]
  },
  {
   "linea": 9,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 9,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      },
      "unitario": {
       "tipo": "float",
       "repr": "60.5"
      },
      "total": {
       "tipo": "float",
       "repr": "60.5"
      }
     }
    }
   ]
  },
  {
   "linea": 9,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 15,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "242.0"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    },
    {
     "funcion": "subtotal",
     "linea": 9,
     "variables": {
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      },
      "unitario": {
       "tipo": "float",
       "repr": "60.5"
      },
      "total": {
       "tipo": "float",
       "repr": "60.5"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "subtotal",
    "valor": "60.5"
   }
  },
  {
   "linea": 14,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 14,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "302.5"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    }
   ]
  },
  {
   "linea": 16,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 16,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "302.5"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    }
   ]
  },
  {
   "linea": 16,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "",
   "pila": [
    {
     "funcion": "ticket",
     "linea": 16,
     "variables": {
      "productos": {
       "tipo": "list",
       "repr": "[(2, 100), (1, 50)]",
       "items": [
        "(2, 100)",
        "(1, 50)"
       ],
       "ref": 1
      },
      "suma": {
       "tipo": "float",
       "repr": "302.5"
      },
      "cantidad": {
       "tipo": "int",
       "repr": "1"
      },
      "precio": {
       "tipo": "int",
       "repr": "50"
      }
     }
    }
   ],
   "retorno": {
    "funcion": "ticket",
    "valor": "302.5"
   }
  },
  {
   "linea": 0,
   "variables": {
    "compra": {
     "tipo": "list",
     "repr": "[(2, 100), (1, 50)]",
     "items": [
      "(2, 100)",
      "(1, 50)"
     ],
     "ref": 1
    }
   },
   "salida": "Total: 302.5\n"
  }
 ]
};

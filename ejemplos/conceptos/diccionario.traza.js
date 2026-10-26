// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que esta traza.');
Motor.trazas = Motor.trazas || {};
Motor.trazas["diccionario"] = {
 "codigo": "edades = {\"Ana\": 30, \"Beto\": 25}\nedades[\"Cami\"] = 41\nprint(edades[\"Ana\"])\nprint(edades[\"Lucía\"])\n",
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
    "edades": {
     "tipo": "dict",
     "repr": "{'Ana': 30, 'Beto': 25}",
     "pares": [
      [
       "'Ana'",
       "30"
      ],
      [
       "'Beto'",
       "25"
      ]
     ]
    }
   },
   "salida": ""
  },
  {
   "linea": 3,
   "variables": {
    "edades": {
     "tipo": "dict",
     "repr": "{'Ana': 30, 'Beto': 25, 'Cami': 41}",
     "pares": [
      [
       "'Ana'",
       "30"
      ],
      [
       "'Beto'",
       "25"
      ],
      [
       "'Cami'",
       "41"
      ]
     ]
    }
   },
   "salida": ""
  },
  {
   "linea": 4,
   "variables": {
    "edades": {
     "tipo": "dict",
     "repr": "{'Ana': 30, 'Beto': 25, 'Cami': 41}",
     "pares": [
      [
       "'Ana'",
       "30"
      ],
      [
       "'Beto'",
       "25"
      ],
      [
       "'Cami'",
       "41"
      ]
     ]
    }
   },
   "salida": "30\n"
  },
  {
   "linea": 4,
   "variables": {
    "edades": {
     "tipo": "dict",
     "repr": "{'Ana': 30, 'Beto': 25, 'Cami': 41}",
     "pares": [
      [
       "'Ana'",
       "30"
      ],
      [
       "'Beto'",
       "25"
      ],
      [
       "'Cami'",
       "41"
      ]
     ]
    }
   },
   "salida": "30\n",
   "excepcion": {
    "tipo": "KeyError",
    "mensaje": "'Lucía'"
   }
  }
 ]
};

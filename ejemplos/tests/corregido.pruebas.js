// Generado con herramientas/trazar.py: no lo edites a mano, regeneralo.
// Va DESPUÉS de motor.min.js: si se carga antes, el motor la pisaría sin avisar.
if (!window.Motor) throw new Error('Cargá motor.min.js antes que este archivo.');
Motor.pruebas = Motor.pruebas || {};
Motor.pruebas["corregido"] = {
 "codigo": "def porcentaje(presentes, clases):\n    return presentes * 100 // clases\n\n\ndef test_mitad():\n    assert porcentaje(10, 20) == 50\n\n\ndef test_todas():\n    assert porcentaje(20, 20) == 100\n\n\ndef test_ninguna():\n    assert porcentaje(0, 20) == 0\n",
 "tests": [
  {
   "nombre": "test_mitad",
   "linea": 5,
   "estado": "pasa",
   "asserts": [
    {
     "linea": 6,
     "texto": "porcentaje(10, 20) == 50",
     "obtenido": "50",
     "esperado": "50",
     "ok": true
    }
   ]
  },
  {
   "nombre": "test_todas",
   "linea": 9,
   "estado": "pasa",
   "asserts": [
    {
     "linea": 10,
     "texto": "porcentaje(20, 20) == 100",
     "obtenido": "100",
     "esperado": "100",
     "ok": true
    }
   ]
  },
  {
   "nombre": "test_ninguna",
   "linea": 13,
   "estado": "pasa",
   "asserts": [
    {
     "linea": 14,
     "texto": "porcentaje(0, 20) == 0",
     "obtenido": "0",
     "esperado": "0",
     "ok": true
    }
   ]
  }
 ]
};

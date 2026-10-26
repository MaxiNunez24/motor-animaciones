class Alumno:
    def __init__(self, nombre):
        self.nombre = nombre
        self.presentes = 0

    def marcar(self):
        self.presentes += 1

lucia = Alumno("Lucía")
lucia.marcar()
otra = lucia
otra.marcar()
print(lucia.presentes)

def precio_con_iva(precio):
    iva = precio * 0.21
    return precio + iva


def subtotal(cantidad, precio):
    unitario = precio_con_iva(precio)
    total = cantidad * unitario
    return total


def ticket(productos):
    suma = 0
    for cantidad, precio in productos:
        suma = suma + subtotal(cantidad, precio)
    return round(suma, 2)


compra = [(2, 100), (1, 50)]
print("Total:", ticket(compra))

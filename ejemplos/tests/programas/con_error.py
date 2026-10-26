def porcentaje(presentes, clases):
    return presentes // clases * 100


def test_mitad():
    assert porcentaje(10, 20) == 50


def test_todas():
    assert porcentaje(20, 20) == 100


def test_ninguna():
    assert porcentaje(0, 20) == 0

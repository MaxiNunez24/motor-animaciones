// Los colores del tema, en claro y en oscuro.
//
// Adentro del componente se usan como --ma-acento, --ma-texto, etc. Desde
// afuera, cada sitio los puede cambiar con --motor-acento (y, si quiere otro
// color para el modo oscuro, --motor-acento-oscuro), en cualquier elemento que
// envuelva a la escena:
//
//     motor-escena { --motor-acento: #7c3aed; }
//
// Son dos nombres distintos a propósito: el de adentro lo maneja el tema, y el
// de afuera es el que se puede tocar sin romper el modo oscuro.

const CLARO = {
    fondo: '#f6f4ef',
    superficie: '#ffffff',
    texto: '#1c2230',
    suave: '#5a6372',
    borde: '#c3cad4',
    acento: '#1f5fd1',
    acento2: '#c2410c',
    exito: '#15803d',
    alerta: '#a16207',
    error: '#b91c1c',
    papel: '#fdf6dc',
    marco: '#232a35',
};

const OSCURO = {
    fondo: '#12161d',
    superficie: '#1e2530',
    texto: '#e8ebf0',
    suave: '#9ba5b3',
    borde: '#3b4553',
    acento: '#73a9ff',
    acento2: '#fb923c',
    exito: '#4ade80',
    alerta: '#facc15',
    error: '#f87171',
    papel: '#3b3526',
    // Más claro que el fondo: un celular negro sobre fondo negro no se ve.
    marco: '#556070',
};

function variables(colores, oscuro) {
    return Object.entries(colores)
        .map(([nombre, valor]) => {
            const publico = oscuro
                ? `var(--motor-${nombre}-oscuro, var(--motor-${nombre}, ${valor}))`
                : `var(--motor-${nombre}, ${valor})`;
            return `--ma-${nombre}: ${publico};`;
        })
        .join('\n    ');
}

export const TEMAS = { claro: CLARO, oscuro: OSCURO };

export const CSS_TEMA = `
.ma-raiz {
    ${variables(CLARO, false)}
    --ma-fuente: var(--motor-fuente, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
    --ma-fuente-mono: var(--motor-fuente-mono, ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace);
    color-scheme: light;
}
.ma-raiz[data-tema="oscuro"] {
    ${variables(OSCURO, true)}
    color-scheme: dark;
}
`;

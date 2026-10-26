import { defineConfig, devices } from '@playwright/test';

// Los tests de navegador abren los ejemplos de verdad, en Chromium, y miran lo
// que se ve. Levantan solos el servidor de los ejemplos.
export default defineConfig({
    testDir: 'tests/navegador',
    fullyParallel: true,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:4173',
        ...devices['Desktop Chrome'],
        // Siempre en claro y con animaciones completas, salvo el test que
        // pruebe otra cosa: que el resultado no dependa de la compu que corre.
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        // WebGL por software: así el globo 3D se dibuja igual en cualquier
        // compu, tenga o no placa de video (y en GitHub Actions, que no tiene).
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    },
    // Las capturas de referencia: un 0,5 % de pixeles distintos se tolera,
    // porque el suavizado de las letras cambia un poco entre versiones.
    expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.005 } },
    webServer: {
        command: 'node herramientas/servir.js',
        url: 'http://localhost:4173/ejemplos/',
        reuseExistingServer: true,
    },
});

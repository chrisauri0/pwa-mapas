import { defineConfig, devices } from '@playwright/test';

// Las pruebas E2E se lanzan con `pnpm test:e2e`, que primero levanta los
// emuladores de Firebase (Auth + Firestore) y luego corre Playwright.
// Playwright arranca `ng serve` solo si no hay un servidor ya corriendo.
//
// NixOS: el Chromium que descarga Playwright no corre (faltan librerías).
// Define CHROMIUM_PATH con el Chromium de nixpkgs y se usa ese en su lugar.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1, // todas las pruebas comparten el mismo emulador
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4200',
    // El CSP del index.html no permite hablar con 127.0.0.1:8080/9099 (emuladores).
    // Se ignora SOLO en el navegador de pruebas; el CSP de la app no se toca.
    bypassCSP: true,
    locale: 'es-MX',
    permissions: ['geolocation'],
    geolocation: { latitude: 20.5888, longitude: -100.3899 }, // punto de ejemplo en Querétaro
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env['CHROMIUM_PATH'] || undefined,
    },
  },

  projects: [
    // App mobile-first: se prueba con el viewport de un teléfono
    { name: 'chromium-movil', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'pnpm exec ng serve --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});

// Prueba E2E del flujo crítico: PUBLICAR UN AVISO EN UN EDIFICIO.
//
// Flujo completo con la app real corriendo en el navegador y los emuladores de
// Firebase (Auth + Firestore + reglas) detrás:
//   login -> elegir edificio -> publicar aviso -> verificar en pantalla ->
//   verificar persistencia en el servidor -> recargar -> lo ve un visitante
//   sin sesión -> eliminar.
//
// Se ejecuta con:  pnpm test:e2e
// Las capturas de evidencia quedan en ./evidencia-e2e/

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const PROJECT_ID = 'demo-avisos-test';
const FIRESTORE = 'http://127.0.0.1:8080';
const AUTH = 'http://127.0.0.1:9099';
const EVIDENCIA = 'evidencia-e2e';

const PASSWORD = 'password-de-prueba';
const NOMBRE = 'Autor E2E';
const TEXTO = 'E2E: acceso cerrado por mantenimiento eléctrico';

// Se prueba en este orden hasta encontrar la pantalla del mapa
const RUTAS_MAPA = ['/map', '/', '/mapa', '/home'];

// ---------- utilidades del emulador ----------

async function limpiarEmulador(): Promise<void> {
  await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
}

/** Crea el usuario directo en el Auth Emulator y devuelve su uid. */
async function crearUsuarioEnEmulador(email: string): Promise<string> {
  const cabeceras = { 'Content-Type': 'application/json' };

  const alta = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (!alta.ok) throw new Error(`No se pudo crear el usuario de prueba: ${alta.status}`);
  const { idToken, localId } = (await alta.json()) as { idToken: string; localId: string };

  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ idToken, displayName: NOMBRE, returnSecureToken: false }),
  });

  return localId;
}

interface AvisoServidor {
  id: string;
  texto?: string;
  tipo?: string;
  autorUid?: string;
  edificioNombre?: string;
}

/** Lee los avisos directo del servidor (REST con "owner" salta las reglas). */
async function avisosEnServidor(): Promise<AvisoServidor[]> {
  const r = await fetch(`${FIRESTORE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/avisos`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (!r.ok) throw new Error(`Firestore REST respondió ${r.status}`);

  const json = (await r.json()) as {
    documents?: { name: string; fields?: Record<string, { stringValue?: string }> }[];
  };

  return (json.documents ?? []).map((d) => ({
    id: d.name.split('/').pop() ?? '',
    texto: d.fields?.['texto']?.stringValue,
    tipo: d.fields?.['tipo']?.stringValue,
    autorUid: d.fields?.['autorUid']?.stringValue,
    edificioNombre: d.fields?.['edificioNombre']?.stringValue,
  }));
}

// ---------- utilidades de la interfaz ----------

/** Activa la bandera para que la app use los emuladores y no prac9-db-sync. */
async function usarEmuladores(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('USE_FIREBASE_EMULATOR', '1');
    } catch {
      /* sin localStorage */
    }
  });
}

async function irAlMapa(page: Page): Promise<void> {
  const buscador = page.getByPlaceholder('¿A dónde quieres ir?');
  for (const ruta of RUTAS_MAPA) {
    await page.goto(ruta);
    const visible = await buscador.waitFor({ state: 'visible', timeout: 5_000 }).then(
      () => true,
      () => false,
    );
    if (visible) {
      console.log(`🟢 Pantalla del mapa encontrada en "${ruta}"`);
      return;
    }
  }
  throw new Error(`No encontré el buscador del mapa en ninguna de estas rutas: ${RUTAS_MAPA.join(', ')}`);
}

/** Busca y elige un edificio. Si no se da nombre, elige el primer resultado. */
async function seleccionarEdificio(page: Page, nombre?: string): Promise<string> {
  const buscador = page.getByPlaceholder('¿A dónde quieres ir?');
  const consultas = nombre ? [nombre] : ['Edificio', 'Aula', 'Biblioteca', 'Laboratorio', 'a', 'e'];

  for (const q of consultas) {
    await buscador.fill('');
    await buscador.fill(q);
    const opcion = page.locator('.node-dropdown button').first();
    const hayResultados = await opcion.waitFor({ state: 'visible', timeout: 2_000 }).then(
      () => true,
      () => false,
    );
    if (hayResultados) {
      const elegido = (await opcion.locator('span').first().innerText()).trim();
      await opcion.click();
      await expect(page.locator('app-avisos-edificio')).toBeVisible();
      return elegido;
    }
  }
  throw new Error('El buscador no devolvió ningún edificio para elegir.');
}

async function abrirAvisos(page: Page): Promise<void> {
  await page.locator('app-avisos-edificio .cabecera').click();
  await expect(page.locator('app-avisos-edificio .cuerpo')).toBeVisible();
}

async function nuevoVisitante(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ bypassCSP: true });
  await usarEmuladores(context);
  return { context, page: await context.newPage() };
}

const captura = (page: Page, nombre: string) =>
  page.screenshot({ path: `${EVIDENCIA}/${nombre}.png`, fullPage: true });

// ---------- pruebas ----------

test.beforeEach(async ({ context }) => {
  await limpiarEmulador();
  await usarEmuladores(context);
});

test('E2E: login -> publicar aviso -> persiste -> lo ve un visitante -> eliminar', async ({ page, browser }) => {
  test.setTimeout(120_000);

  // El correo debe cumplir el dominio institucional que muestra el formulario
  await page.goto('/login');
  const placeholder = (await page.locator('input[type="email"]').getAttribute('placeholder')) ?? '';
  const dominio = placeholder.startsWith('correo') ? placeholder.slice('correo'.length) : '@prueba.test';
  const email = `e2e-autor${dominio}`;
  const uid = await crearUsuarioEnEmulador(email);

  await test.step('1. Iniciar sesión con el usuario de prueba', async () => {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await captura(page, '01-login');
    await page.locator('button.principal').click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  });

  let edificio = '';
  await test.step('2. Ir al mapa y elegir un edificio', async () => {
    await irAlMapa(page);
    edificio = await seleccionarEdificio(page);
    await abrirAvisos(page);
    await expect(page.locator('app-avisos-edificio .vacio')).toBeVisible(); // base limpia
    await expect(page.locator('app-avisos-edificio .sesion')).toContainText('Sesión:');
    await captura(page, '02-edificio-sin-avisos');
  });

  await test.step('3. Publicar un aviso de tipo "Cerrado"', async () => {
    await page.locator('app-avisos-edificio .agregar', { hasText: 'Agregar aviso' }).click();
    await page.locator('app-avisos-edificio .tipos button', { hasText: 'Cerrado' }).click();
    await page.locator('app-avisos-edificio textarea').fill(TEXTO);
    await captura(page, '03-formulario-lleno');
    await page.locator('app-avisos-edificio .publicar').click();
  });

  const tarjeta = page.locator('app-avisos-edificio .aviso[data-tipo="cerrado"]');

  await test.step('4. El aviso aparece en pantalla', async () => {
    await expect(tarjeta).toContainText(TEXTO);
    await expect(tarjeta.getByRole('button', { name: 'Eliminar' })).toBeVisible(); // el autor puede borrarlo
    await captura(page, '04-aviso-publicado');
  });

  await test.step('5. Persistencia: el aviso quedó guardado en Firestore con los datos correctos', async () => {
    await expect.poll(async () => (await avisosEnServidor()).length, { timeout: 15_000 }).toBe(1);
    const [guardado] = await avisosEnServidor();
    expect(guardado.texto).toBe(TEXTO);
    expect(guardado.tipo).toBe('cerrado');
    expect(guardado.autorUid).toBe(uid);
    expect(guardado.edificioNombre).toBe(edificio);
  });

  await test.step('6. Tras recargar la página el aviso sigue ahí y la sesión se conserva', async () => {
    await page.reload();
    await irAlMapa(page);
    await seleccionarEdificio(page, edificio);
    await abrirAvisos(page);
    await expect(tarjeta).toContainText(TEXTO);
    await expect(tarjeta.getByRole('button', { name: 'Eliminar' })).toBeVisible();
    await captura(page, '05-despues-de-recargar');
  });

  await test.step('7. Un visitante SIN sesión ve el aviso pero no puede borrarlo', async () => {
    const visitante = await nuevoVisitante(browser);
    try {
      await irAlMapa(visitante.page);
      await seleccionarEdificio(visitante.page, edificio);
      await abrirAvisos(visitante.page);
      const suya = visitante.page.locator('app-avisos-edificio .aviso[data-tipo="cerrado"]');
      await expect(suya).toContainText(TEXTO);
      await expect(suya.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
      await captura(visitante.page, '06-visitante-ve-el-aviso');
    } finally {
      await visitante.context.close();
    }
  });

  await test.step('8. El autor elimina el aviso y desaparece de pantalla y del servidor', async () => {
    await tarjeta.getByRole('button', { name: 'Eliminar' }).click();
    await expect(tarjeta).toHaveCount(0);
    await expect(page.locator('app-avisos-edificio .vacio')).toBeVisible();
    await expect.poll(async () => (await avisosEnServidor()).length, { timeout: 15_000 }).toBe(0);
    await captura(page, '07-aviso-eliminado');
  });
});

test('E2E: un visitante sin sesión no puede publicar y se le manda a iniciar sesión', async ({ page }) => {
  await irAlMapa(page);
  await seleccionarEdificio(page);
  await abrirAvisos(page);

  await expect(page.locator('app-avisos-edificio .agregar', { hasText: 'Agregar aviso' })).toHaveCount(0);
  const iniciar = page.locator('app-avisos-edificio .agregar', { hasText: 'Inicia sesión' });
  await expect(iniciar).toBeVisible();
  await captura(page, '08-visitante-sin-opcion-de-publicar');

  await iniciar.click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

// Utilidades compartidas por las pruebas E2E de caja negra.
// (avisos.e2e.ts tiene sus propias copias y no se toca.)

import { expect, type BrowserContext, type Page } from '@playwright/test';

export const PROJECT_ID = 'demo-avisos-test';
export const FIRESTORE = 'http://127.0.0.1:8080';
export const AUTH = 'http://127.0.0.1:9099';
export const EVIDENCIA = 'evidencia-e2e';
export const RUTA_MAPA = '/map';
export const PASSWORD = 'password-de-prueba';
export const BUSCADOR = '¿A dónde quieres ir?';

// ---------- emulador ----------

export async function limpiarEmulador(): Promise<void> {
  await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
}

/** Crea el usuario directo en el Auth Emulator y devuelve su uid. */
export async function crearUsuarioEnEmulador(email: string, nombre: string): Promise<string> {
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
    body: JSON.stringify({ idToken, displayName: nombre, returnSecureToken: false }),
  });

  return localId;
}

export interface AvisoServidor {
  id: string;
  texto?: string;
  tipo?: string;
  autorUid?: string;
  edificioNombre?: string;
}

/** Lee los avisos directo del servidor (REST con "owner" salta las reglas). */
export async function avisosEnServidor(): Promise<AvisoServidor[]> {
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

// ---------- interfaz ----------

/** Activa la bandera para que la app use los emuladores y no prac9-db-sync. */
export async function usarEmuladores(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('USE_FIREBASE_EMULATOR', '1');
      localStorage.setItem('E2E_SIN_3D', '1'); // mapa 2D: el 3D por software congela el navegador de pruebas
    } catch {
      /* sin localStorage */
    }
  });
}

export const captura = (page: Page, nombre: string) =>
  page.screenshot({ path: `${EVIDENCIA}/${nombre}.png`, fullPage: true });

/** Lee el dominio institucional que muestra el formulario (vacío = cualquier correo). */
export async function leerDominio(page: Page): Promise<string> {
  const placeholder = (await page.locator('input[type="email"]').getAttribute('placeholder')) ?? '';
  return placeholder.startsWith('correo') ? placeholder.slice('correo'.length) : '@prueba.test';
}

/** Va a /login, lee el dominio y crea en el emulador un usuario con ese correo. */
export async function prepararUsuario(
  page: Page,
  alias: string,
  nombre = 'Usuario E2E',
): Promise<{ email: string; uid: string; dominio: string }> {
  await page.goto('/login');
  const dominio = await leerDominio(page);
  const email = `${alias}${dominio}`;
  const uid = await crearUsuarioEnEmulador(email, nombre);
  return { email, uid, dominio };
}

export async function abrirRegistro(page: Page): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(RUTA_MAPA)}`);
  await page.locator('.tabs button', { hasText: 'Crear cuenta' }).click();
}

export async function iniciarSesionUI(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(RUTA_MAPA)}`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button.principal').click();
  await page.waitForURL((url) => url.pathname === RUTA_MAPA);
  await expect(page.getByPlaceholder(BUSCADOR)).toBeVisible();
}

export async function irAlMapa(page: Page): Promise<void> {
  await page.goto(RUTA_MAPA);
  await expect(page.getByPlaceholder(BUSCADOR)).toBeVisible();
}

/** Busca y elige un edificio. Si no se da nombre, elige el primer resultado. */
export async function seleccionarEdificio(page: Page, nombre?: string): Promise<string> {
  const buscador = page.getByPlaceholder(BUSCADOR);
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
      await expect(page.locator('.search-field-wrap .clear-btn')).toBeVisible(); // el destino quedó elegido
      return elegido;
    }
  }
  throw new Error('El buscador no devolvió ningún edificio para elegir.');
}

export async function abrirAvisos(page: Page): Promise<void> {
  await page.locator('app-avisos-modal .avisos-btn').click();
  await expect(page.locator('app-avisos-modal .cuerpo')).toBeVisible();
}

/** Sesión + mapa + edificio + panel de avisos abierto, listo para publicar. */
export async function entrarAlPanel(page: Page, email: string): Promise<string> {
  await iniciarSesionUI(page, email);
  const edificio = await seleccionarEdificio(page);
  await abrirAvisos(page);
  return edificio;
}

export async function abrirFormularioAviso(page: Page): Promise<void> {
  await page.locator('app-avisos-modal .agregar', { hasText: 'Agregar aviso' }).click();
  await expect(page.locator('app-avisos-modal textarea')).toBeVisible();
}

/** Extrae el nombre de "Sesión: {nombre} · Salir". */
export function nombreEnSesion(textoSesion: string): string {
  return textoSesion.match(/Sesión:\s*(.*?)\s*·/)?.[1] ?? '';
}

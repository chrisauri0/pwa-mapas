// Pruebas E2E de CAJA NEGRA (Práctica 8): se ejercita la app solo por su interfaz y se
// comprueban entradas, mensajes y estados visibles, sin mirar el código.
//
// Requisitos cubiertos (ver tabla de requisitos):
//   RF-01 registro · RF-07 texto vacío · RF-08 límite de 280 · RF-09 validación del registro
//   RF-14 cerrar sesión · RF-15 credenciales incorrectas · RF-16 sin conexión
//   DEF-01 (sospechado) nombre en blanco al registrarse
//
// Se ejecuta con:  pnpm test:e2e        (todas)
//                  pnpm test:e2e:cn     (solo estas)

import { expect, test } from '@playwright/test';
import {
  PASSWORD,
  abrirAvisos,
  abrirFormularioAviso,
  abrirRegistro,
  avisosEnServidor,
  captura,
  crearUsuarioEnEmulador,
  entrarAlPanel,
  irAlMapa,
  leerDominio,
  limpiarEmulador,
  nombreEnSesion,
  prepararUsuario,
  seleccionarEdificio,
  usarEmuladores,
  RUTA_MAPA,
} from './utils';

test.beforeEach(async ({ context }) => {
  await limpiarEmulador();
  await usarEmuladores(context);
});

// ====================== Registro y acceso ======================

test('RF-01: registrar una cuenta deja la sesión iniciada con el nombre capturado', async ({ page }) => {
  const NOMBRE = 'Alumno Registro';

  await abrirRegistro(page);
  const email = `e2e-registro${await leerDominio(page)}`;

  await page.getByPlaceholder('Tu nombre').fill(NOMBRE);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await captura(page, 'cn-rf01-01-formulario-registro');
  await page.locator('button.principal').click();

  await page.waitForURL((url) => url.pathname === RUTA_MAPA);
  const edificio = await seleccionarEdificio(page);
  await abrirAvisos(page);
  await expect(page.locator('app-avisos-modal .sesion')).toContainText(`Sesión: ${NOMBRE}`);
  await captura(page, 'cn-rf01-02-sesion-tras-registro');

  // La sesión y el nombre sobreviven a una recarga
  await page.reload();
  await irAlMapa(page);
  await seleccionarEdificio(page, edificio);
  await abrirAvisos(page);
  await expect(page.locator('app-avisos-modal .sesion')).toContainText(`Sesión: ${NOMBRE}`);
});

test('RF-09: el registro rechaza correo sin formato, contraseña corta y correo repetido', async ({ page }) => {
  await abrirRegistro(page);
  const dominio = await leerDominio(page);
  const correo = page.locator('input[type="email"]');
  const clave = page.locator('input[type="password"]');
  const error = page.locator('section.login .error');

  await page.getByPlaceholder('Tu nombre').fill('Alumno Validaciones');

  await test.step('Correo sin formato: lo bloquea el navegador y no se llama al servidor', async () => {
    await correo.fill('correo-sin-arroba');
    await clave.fill(PASSWORD);
    await page.locator('button.principal').click();
    expect(await correo.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
    await expect(page).toHaveURL(/\/login/);
    await captura(page, 'cn-rf09-01-correo-sin-formato');
  });

  await test.step('Contraseña de 5 caracteres: mensaje de contraseña débil', async () => {
    await correo.fill(`e2e-validaciones${dominio}`);
    await clave.fill('12345');
    await page.locator('button.principal').click();
    await expect(error).toHaveText('La contraseña debe tener al menos 6 caracteres.');
    await expect(page).toHaveURL(/\/login/);
    await captura(page, 'cn-rf09-02-contrasena-corta');
  });

  await test.step('Correo ya registrado: mensaje de cuenta existente', async () => {
    const repetido = `e2e-repetido${dominio}`;
    await crearUsuarioEnEmulador(repetido, 'Ya Existe');
    await correo.fill(repetido);
    await clave.fill(PASSWORD);
    await page.locator('button.principal').click();
    await expect(error).toHaveText('Ya existe una cuenta con ese correo.');
    await expect(page).toHaveURL(/\/login/);
    await captura(page, 'cn-rf09-03-correo-repetido');
  });
});

test('RF-15: credenciales incorrectas muestran un mensaje claro y no inician sesión', async ({ page }) => {
  const { email, dominio } = await prepararUsuario(page, 'e2e-credenciales');
  const error = page.locator('section.login .error');

  await test.step('Contraseña equivocada', async () => {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('otra-clave-123');
    await page.locator('button.principal').click();
    await expect(error).toHaveText('Correo o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login/);
    await captura(page, 'cn-rf15-01-contrasena-equivocada');
  });

  await test.step('Correo que no existe', async () => {
    await page.locator('input[type="email"]').fill(`no-existe${dominio}`);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button.principal').click();
    await expect(error).toHaveText('Correo o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login/);
    await captura(page, 'cn-rf15-02-correo-inexistente');
  });
});

test('RF-14: "Salir" cierra la sesión y vuelve a ofrecer iniciar sesión', async ({ page }) => {
  const { email } = await prepararUsuario(page, 'e2e-salir');
  await entrarAlPanel(page, email);

  const sesion = page.locator('app-avisos-modal .sesion');
  await expect(sesion).toContainText('Sesión:');
  await captura(page, 'cn-rf14-01-con-sesion');

  await sesion.getByRole('link', { name: 'Salir' }).click();

  await expect(
    page.locator('app-avisos-modal .agregar', { hasText: 'Inicia sesión para dejar un aviso' }),
  ).toBeVisible();
  await expect(sesion).toHaveCount(0);
  await captura(page, 'cn-rf14-02-sin-sesion');
});

// DEF-01 (sospechado): el nombre "   " pasa el `required` del campo, se recorta a vacío y el
// perfil queda sin nombre hasta recargar (cuando cae al respaldo: la parte del correo).
// Si esta prueba FALLA, es evidencia del defecto. Si PASA, la hipótesis queda descartada.
test('DEF-01: registrarse con el nombre en blanco no deja un nombre vacío ni inconsistente', async ({ page }) => {
  await abrirRegistro(page);
  const email = `e2e-blanco${await leerDominio(page)}`;

  await page.getByPlaceholder('Tu nombre').fill('   ');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button.principal').click();
  await page.waitForURL((url) => url.pathname === RUTA_MAPA);

  const edificio = await seleccionarEdificio(page);
  await abrirAvisos(page);
  const sesion = page.locator('app-avisos-modal .sesion');
  const antes = nombreEnSesion(await sesion.innerText());
  await captura(page, 'cn-def01-01-antes-de-recargar');

  await page.reload();
  await irAlMapa(page);
  await seleccionarEdificio(page, edificio);
  await abrirAvisos(page);
  const despues = nombreEnSesion(await sesion.innerText());
  await captura(page, 'cn-def01-02-despues-de-recargar');

  console.log(`🟡 DEF-01 nombre antes de recargar: "${antes}" | después: "${despues}"`);
  expect(antes, 'el nombre mostrado tras registrarse no debe estar vacío').not.toBe('');
  expect(despues, 'el nombre no debe cambiar al recargar').toBe(antes);
});

// ====================== Formulario de avisos ======================

test('RF-07: no se puede publicar un aviso sin texto (vacío o solo espacios)', async ({ page }) => {
  const { email } = await prepararUsuario(page, 'e2e-vacio');
  await entrarAlPanel(page, email);
  await abrirFormularioAviso(page);

  const area = page.locator('app-avisos-modal textarea');
  const publicar = page.locator('app-avisos-modal .publicar');

  await expect(publicar).toBeDisabled(); // vacío
  await captura(page, 'cn-rf07-01-vacio');

  await area.fill('     '); // solo espacios
  await expect(publicar).toBeDisabled();
  await captura(page, 'cn-rf07-02-solo-espacios');

  await area.fill('Aviso válido'); // con texto se habilita
  await expect(publicar).toBeEnabled();

  await area.fill(''); // y al borrar vuelve a bloquearse
  await expect(publicar).toBeDisabled();

  expect(await avisosEnServidor()).toHaveLength(0); // nada llegó al servidor
});

test('RF-08: el texto se limita a 280 caracteres y un aviso de 280 se guarda completo', async ({ page }) => {
  const { email } = await prepararUsuario(page, 'e2e-limite');
  await entrarAlPanel(page, email);
  await abrirFormularioAviso(page);

  const area = page.locator('app-avisos-modal textarea');
  await expect(area).toHaveAttribute('maxlength', '280');

  // Se teclea (no se usa fill) porque el límite solo aplica a la escritura del usuario
  await area.click();
  await area.pressSequentially('a'.repeat(290));

  await expect(area).toHaveValue('a'.repeat(280));
  await expect(page.locator('app-avisos-modal .pie small')).toHaveText('280/280');
  await captura(page, 'cn-rf08-01-limite-280');

  await page.locator('app-avisos-modal .publicar').click();

  await expect.poll(async () => (await avisosEnServidor()).length, { timeout: 15_000 }).toBe(1);
  const [guardado] = await avisosEnServidor();
  expect(guardado.texto).toHaveLength(280);
});

// ====================== Sin conexión ======================

test('RF-16: sin conexión el aviso queda pendiente y se sincroniza al reconectar', async ({ page, context }) => {
  test.setTimeout(180_000);
  const TEXTO = 'E2E sin conexión: aviso pendiente';

  const { email } = await prepararUsuario(page, 'e2e-offline');
  const edificio = await entrarAlPanel(page, email);

  await test.step('Sin internet: se publica y queda como pendiente', async () => {
    await context.setOffline(true);
    await abrirFormularioAviso(page);
    await page.locator('app-avisos-modal textarea').fill(TEXTO);
    await page.locator('app-avisos-modal .publicar').click();

    const tarjeta = page.locator('app-avisos-modal .aviso');
    await expect(tarjeta).toContainText(TEXTO);
    await expect(tarjeta.locator('.pendiente')).toBeVisible();
    expect(await avisosEnServidor()).toHaveLength(0); // aún no llega al servidor
    await captura(page, 'cn-rf16-01-pendiente-sin-conexion');

    // Aviso de "sin conexión": depende del momento en que Firestore detecta la caída
    await expect.soft(page.locator('.offline-tag')).toBeVisible({ timeout: 20_000 });
  });

  await test.step('Al reconectar: el servidor recibe el aviso', async () => {
    await context.setOffline(false);
    await expect.poll(async () => (await avisosEnServidor()).length, { timeout: 90_000 }).toBe(1);
    const [guardado] = await avisosEnServidor();
    expect(guardado.texto).toBe(TEXTO);
  });

  await test.step('Tras recargar, el aviso ya no figura como pendiente', async () => {
    await page.reload();
    await irAlMapa(page);
    await seleccionarEdificio(page, edificio);
    await abrirAvisos(page);
    const tarjeta = page.locator('app-avisos-modal .aviso');
    await expect(tarjeta).toContainText(TEXTO);
    await expect(tarjeta.locator('.pendiente')).toHaveCount(0);
    await captura(page, 'cn-rf16-02-sincronizado');
  });
});


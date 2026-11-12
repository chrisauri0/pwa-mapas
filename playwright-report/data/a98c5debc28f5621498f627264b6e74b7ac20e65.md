# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: caja-negra.e2e.ts >> RF-15: credenciales incorrectas muestran un mensaje claro y no inician sesión
- Location: tests/e2e/caja-negra.e2e.ts:104:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('section.login .error')
Expected: "Correo o contraseña incorrectos."
Received: "Ocurrió un error. Intenta de nuevo."
Timeout:  10000ms

Call log:
  - Expect "toHaveText" locator('section.login .error') with timeout 10000ms
  - waiting for locator('section.login .error')
    24 × locator resolved to <p class="error" _ngcontent-ng-c1956151982="">Ocurrió un error. Intenta de nuevo.</p>
       - unexpected value "Ocurrió un error. Intenta de nuevo."

```

```yaml
- paragraph: Ocurrió un error. Intenta de nuevo.
```

# Test source

```ts
  12  | import { expect, test } from '@playwright/test';
  13  | import {
  14  |   PASSWORD,
  15  |   abrirAvisos,
  16  |   abrirFormularioAviso,
  17  |   abrirRegistro,
  18  |   avisosEnServidor,
  19  |   captura,
  20  |   crearUsuarioEnEmulador,
  21  |   entrarAlPanel,
  22  |   irAlMapa,
  23  |   leerDominio,
  24  |   limpiarEmulador,
  25  |   nombreEnSesion,
  26  |   prepararUsuario,
  27  |   seleccionarEdificio,
  28  |   usarEmuladores,
  29  |   RUTA_MAPA,
  30  | } from './utils';
  31  | 
  32  | test.beforeEach(async ({ context }) => {
  33  |   await limpiarEmulador();
  34  |   await usarEmuladores(context);
  35  | });
  36  | 
  37  | // ====================== Registro y acceso ======================
  38  | 
  39  | test('RF-01: registrar una cuenta deja la sesión iniciada con el nombre capturado', async ({ page }) => {
  40  |   const NOMBRE = 'Alumno Registro';
  41  | 
  42  |   await abrirRegistro(page);
  43  |   const email = `e2e-registro${await leerDominio(page)}`;
  44  | 
  45  |   await page.getByPlaceholder('Tu nombre').fill(NOMBRE);
  46  |   await page.locator('input[type="email"]').fill(email);
  47  |   await page.locator('input[type="password"]').fill(PASSWORD);
  48  |   await captura(page, 'cn-rf01-01-formulario-registro');
  49  |   await page.locator('button.principal').click();
  50  | 
  51  |   await page.waitForURL((url) => url.pathname === RUTA_MAPA);
  52  |   const edificio = await seleccionarEdificio(page);
  53  |   await abrirAvisos(page);
  54  |   await expect(page.locator('app-avisos-edificio .sesion')).toContainText(`Sesión: ${NOMBRE}`);
  55  |   await captura(page, 'cn-rf01-02-sesion-tras-registro');
  56  | 
  57  |   // La sesión y el nombre sobreviven a una recarga
  58  |   await page.reload();
  59  |   await irAlMapa(page);
  60  |   await seleccionarEdificio(page, edificio);
  61  |   await abrirAvisos(page);
  62  |   await expect(page.locator('app-avisos-edificio .sesion')).toContainText(`Sesión: ${NOMBRE}`);
  63  | });
  64  | 
  65  | test('RF-09: el registro rechaza correo sin formato, contraseña corta y correo repetido', async ({ page }) => {
  66  |   await abrirRegistro(page);
  67  |   const dominio = await leerDominio(page);
  68  |   const correo = page.locator('input[type="email"]');
  69  |   const clave = page.locator('input[type="password"]');
  70  |   const error = page.locator('section.login .error');
  71  | 
  72  |   await page.getByPlaceholder('Tu nombre').fill('Alumno Validaciones');
  73  | 
  74  |   await test.step('Correo sin formato: lo bloquea el navegador y no se llama al servidor', async () => {
  75  |     await correo.fill('correo-sin-arroba');
  76  |     await clave.fill(PASSWORD);
  77  |     await page.locator('button.principal').click();
  78  |     expect(await correo.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  79  |     await expect(page).toHaveURL(/\/login/);
  80  |     await captura(page, 'cn-rf09-01-correo-sin-formato');
  81  |   });
  82  | 
  83  |   await test.step('Contraseña de 5 caracteres: mensaje de contraseña débil', async () => {
  84  |     await correo.fill(`e2e-validaciones${dominio}`);
  85  |     await clave.fill('12345');
  86  |     await page.locator('button.principal').click();
  87  |     await expect(error).toHaveText('La contraseña debe tener al menos 6 caracteres.');
  88  |     await expect(page).toHaveURL(/\/login/);
  89  |     await captura(page, 'cn-rf09-02-contrasena-corta');
  90  |   });
  91  | 
  92  |   await test.step('Correo ya registrado: mensaje de cuenta existente', async () => {
  93  |     const repetido = `e2e-repetido${dominio}`;
  94  |     await crearUsuarioEnEmulador(repetido, 'Ya Existe');
  95  |     await correo.fill(repetido);
  96  |     await clave.fill(PASSWORD);
  97  |     await page.locator('button.principal').click();
  98  |     await expect(error).toHaveText('Ya existe una cuenta con ese correo.');
  99  |     await expect(page).toHaveURL(/\/login/);
  100 |     await captura(page, 'cn-rf09-03-correo-repetido');
  101 |   });
  102 | });
  103 | 
  104 | test('RF-15: credenciales incorrectas muestran un mensaje claro y no inician sesión', async ({ page }) => {
  105 |   const { email, dominio } = await prepararUsuario(page, 'e2e-credenciales');
  106 |   const error = page.locator('section.login .error');
  107 | 
  108 |   await test.step('Contraseña equivocada', async () => {
  109 |     await page.locator('input[type="email"]').fill(email);
  110 |     await page.locator('input[type="password"]').fill('otra-clave-123');
  111 |     await page.locator('button.principal').click();
> 112 |     await expect(error).toHaveText('Correo o contraseña incorrectos.');
      |                         ^ Error: expect(locator).toHaveText(expected) failed
  113 |     await expect(page).toHaveURL(/\/login/);
  114 |     await captura(page, 'cn-rf15-01-contrasena-equivocada');
  115 |   });
  116 | 
  117 |   await test.step('Correo que no existe', async () => {
  118 |     await page.locator('input[type="email"]').fill(`no-existe${dominio}`);
  119 |     await page.locator('input[type="password"]').fill(PASSWORD);
  120 |     await page.locator('button.principal').click();
  121 |     await expect(error).toHaveText('Correo o contraseña incorrectos.');
  122 |     await expect(page).toHaveURL(/\/login/);
  123 |     await captura(page, 'cn-rf15-02-correo-inexistente');
  124 |   });
  125 | });
  126 | 
  127 | test('RF-14: "Salir" cierra la sesión y vuelve a ofrecer iniciar sesión', async ({ page }) => {
  128 |   const { email } = await prepararUsuario(page, 'e2e-salir');
  129 |   await entrarAlPanel(page, email);
  130 | 
  131 |   const sesion = page.locator('app-avisos-edificio .sesion');
  132 |   await expect(sesion).toContainText('Sesión:');
  133 |   await captura(page, 'cn-rf14-01-con-sesion');
  134 | 
  135 |   await sesion.getByRole('link', { name: 'Salir' }).click();
  136 | 
  137 |   await expect(
  138 |     page.locator('app-avisos-edificio .agregar', { hasText: 'Inicia sesión para dejar un aviso' }),
  139 |   ).toBeVisible();
  140 |   await expect(sesion).toHaveCount(0);
  141 |   await captura(page, 'cn-rf14-02-sin-sesion');
  142 | });
  143 | 
  144 | // DEF-01 (sospechado): el nombre "   " pasa el `required` del campo, se recorta a vacío y el
  145 | // perfil queda sin nombre hasta recargar (cuando cae al respaldo: la parte del correo).
  146 | // Si esta prueba FALLA, es evidencia del defecto. Si PASA, la hipótesis queda descartada.
  147 | test('DEF-01: registrarse con el nombre en blanco no deja un nombre vacío ni inconsistente', async ({ page }) => {
  148 |   await abrirRegistro(page);
  149 |   const email = `e2e-blanco${await leerDominio(page)}`;
  150 | 
  151 |   await page.getByPlaceholder('Tu nombre').fill('   ');
  152 |   await page.locator('input[type="email"]').fill(email);
  153 |   await page.locator('input[type="password"]').fill(PASSWORD);
  154 |   await page.locator('button.principal').click();
  155 |   await page.waitForURL((url) => url.pathname === RUTA_MAPA);
  156 | 
  157 |   const edificio = await seleccionarEdificio(page);
  158 |   await abrirAvisos(page);
  159 |   const sesion = page.locator('app-avisos-edificio .sesion');
  160 |   const antes = nombreEnSesion(await sesion.innerText());
  161 |   await captura(page, 'cn-def01-01-antes-de-recargar');
  162 | 
  163 |   await page.reload();
  164 |   await irAlMapa(page);
  165 |   await seleccionarEdificio(page, edificio);
  166 |   await abrirAvisos(page);
  167 |   const despues = nombreEnSesion(await sesion.innerText());
  168 |   await captura(page, 'cn-def01-02-despues-de-recargar');
  169 | 
  170 |   console.log(`🟡 DEF-01 nombre antes de recargar: "${antes}" | después: "${despues}"`);
  171 |   expect(antes, 'el nombre mostrado tras registrarse no debe estar vacío').not.toBe('');
  172 |   expect(despues, 'el nombre no debe cambiar al recargar').toBe(antes);
  173 | });
  174 | 
  175 | // ====================== Formulario de avisos ======================
  176 | 
  177 | test('RF-07: no se puede publicar un aviso sin texto (vacío o solo espacios)', async ({ page }) => {
  178 |   const { email } = await prepararUsuario(page, 'e2e-vacio');
  179 |   await entrarAlPanel(page, email);
  180 |   await abrirFormularioAviso(page);
  181 | 
  182 |   const area = page.locator('app-avisos-edificio textarea');
  183 |   const publicar = page.locator('app-avisos-edificio .publicar');
  184 | 
  185 |   await expect(publicar).toBeDisabled(); // vacío
  186 |   await captura(page, 'cn-rf07-01-vacio');
  187 | 
  188 |   await area.fill('     '); // solo espacios
  189 |   await expect(publicar).toBeDisabled();
  190 |   await captura(page, 'cn-rf07-02-solo-espacios');
  191 | 
  192 |   await area.fill('Aviso válido'); // con texto se habilita
  193 |   await expect(publicar).toBeEnabled();
  194 | 
  195 |   await area.fill(''); // y al borrar vuelve a bloquearse
  196 |   await expect(publicar).toBeDisabled();
  197 | 
  198 |   expect(await avisosEnServidor()).toHaveLength(0); // nada llegó al servidor
  199 | });
  200 | 
  201 | test('RF-08: el texto se limita a 280 caracteres y un aviso de 280 se guarda completo', async ({ page }) => {
  202 |   const { email } = await prepararUsuario(page, 'e2e-limite');
  203 |   await entrarAlPanel(page, email);
  204 |   await abrirFormularioAviso(page);
  205 | 
  206 |   const area = page.locator('app-avisos-edificio textarea');
  207 |   await expect(area).toHaveAttribute('maxlength', '280');
  208 | 
  209 |   // Se teclea (no se usa fill) porque el límite solo aplica a la escritura del usuario
  210 |   await area.click();
  211 |   await area.pressSequentially('a'.repeat(290));
  212 | 
```
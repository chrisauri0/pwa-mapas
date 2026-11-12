# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: caja-negra.e2e.ts >> DEF-01: registrarse con el nombre en blanco no deja un nombre vacío ni inconsistente
- Location: tests/e2e/caja-negra.e2e.ts:147:1

# Error details

```
Error: el nombre mostrado tras registrarse no debe estar vacío

expect(received).not.toBe(expected) // Object.is equality

Expected: not ""
```

# Page snapshot

```yaml
- generic [ref=f2e4]:
  - main [ref=f2e5]:
    - generic [ref=f2e6]:
      - generic:
        - generic:
          - button "Marker" [ref=f2e7] [cursor=pointer]
          - button "Marker" [ref=f2e8] [cursor=pointer]
          - button "Marker" [ref=f2e9] [cursor=pointer]
          - button "Marker" [ref=f2e10] [cursor=pointer]
          - button "Marker" [ref=f2e11] [cursor=pointer]
          - button "Marker" [ref=f2e12] [cursor=pointer]
          - button "Marker" [ref=f2e13] [cursor=pointer]
          - button "Marker" [ref=f2e14] [cursor=pointer]
          - button "Marker" [ref=f2e15] [cursor=pointer]
          - button "Marker" [ref=f2e16] [cursor=pointer]
          - button "Marker" [ref=f2e17] [cursor=pointer]
          - button "Marker" [ref=f2e18] [cursor=pointer]
          - button "Marker" [ref=f2e19] [cursor=pointer]
          - button "Marker" [ref=f2e20] [cursor=pointer]
          - button "Marker" [ref=f2e21] [cursor=pointer]
          - button "Marker" [ref=f2e22] [cursor=pointer]
          - button "Marker" [ref=f2e23] [cursor=pointer]
          - button "Marker" [ref=f2e24] [cursor=pointer]
          - button "Marker" [ref=f2e25] [cursor=pointer]
          - button "Marker" [ref=f2e26] [cursor=pointer]
          - button "Marker" [ref=f2e27] [cursor=pointer]
          - button "Marker" [ref=f2e28] [cursor=pointer]
          - button "Marker" [ref=f2e29] [cursor=pointer]
          - button "Marker" [ref=f2e30] [cursor=pointer]
          - button "Marker" [ref=f2e31] [cursor=pointer]
          - button "Marker" [ref=f2e32] [cursor=pointer]
      - generic:
        - generic [ref=f2e33]:
          - button "Zoom in" [ref=f2e34] [cursor=pointer]: +
          - button "Zoom out" [ref=f2e35] [cursor=pointer]: −
        - generic [ref=f2e36]:
          - link "Leaflet" [ref=f2e37] [cursor=pointer]:
            - /url: https://leafletjs.com
          - text: "| © OpenStreetMap contributors"
  - generic [ref=f2e42]:
    - generic [ref=f2e43]:
      - searchbox "¿A dónde quieres ir?" [ref=f2e45]: Entrada Edificio J
      - button "Ir" [ref=f2e46] [cursor=pointer]
    - generic [ref=f2e47]:
      - generic [ref=f2e48]:
        - generic [ref=f2e49]: Desde
        - strong [ref=f2e50]: Camino Entrada 1
      - generic [ref=f2e51]:
        - generic [ref=f2e52]: Hasta
        - strong [ref=f2e53]: Entrada Edificio J
      - button "✕" [ref=f2e54] [cursor=pointer]
    - generic [ref=f2e56]:
      - button "📋 Avisos de este edificio ▾" [active] [ref=f2e57]:
        - generic [ref=f2e58]: 📋 Avisos de este edificio
        - generic [ref=f2e59]: ▾
      - generic [ref=f2e60]:
        - paragraph [ref=f2e61]: Sin avisos activos.
        - button "＋ Agregar aviso" [ref=f2e62]
        - generic [ref=f2e63]:
          - text: "Sesión: e2e-blanco ·"
          - link "Salir" [ref=f2e64] [cursor=pointer]:
            - /url: "#"
```

# Test source

```ts
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
  112 |     await expect(error).toHaveText('Correo o contraseña incorrectos.');
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
> 171 |   expect(antes, 'el nombre mostrado tras registrarse no debe estar vacío').not.toBe('');
      |                                                                                ^ Error: el nombre mostrado tras registrarse no debe estar vacío
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
  213 |   await expect(area).toHaveValue('a'.repeat(280));
  214 |   await expect(page.locator('app-avisos-edificio .pie small')).toHaveText('280/280');
  215 |   await captura(page, 'cn-rf08-01-limite-280');
  216 | 
  217 |   await page.locator('app-avisos-edificio .publicar').click();
  218 | 
  219 |   await expect.poll(async () => (await avisosEnServidor()).length, { timeout: 15_000 }).toBe(1);
  220 |   const [guardado] = await avisosEnServidor();
  221 |   expect(guardado.texto).toHaveLength(280);
  222 | });
  223 | 
  224 | // ====================== Sin conexión ======================
  225 | 
  226 | test('RF-16: sin conexión el aviso queda pendiente y se sincroniza al reconectar', async ({ page, context }) => {
  227 |   test.setTimeout(180_000);
  228 |   const TEXTO = 'E2E sin conexión: aviso pendiente';
  229 | 
  230 |   const { email } = await prepararUsuario(page, 'e2e-offline');
  231 |   const edificio = await entrarAlPanel(page, email);
  232 | 
  233 |   await test.step('Sin internet: se publica y queda como pendiente', async () => {
  234 |     await context.setOffline(true);
  235 |     await abrirFormularioAviso(page);
  236 |     await page.locator('app-avisos-edificio textarea').fill(TEXTO);
  237 |     await page.locator('app-avisos-edificio .publicar').click();
  238 | 
  239 |     const tarjeta = page.locator('app-avisos-edificio .aviso');
  240 |     await expect(tarjeta).toContainText(TEXTO);
  241 |     await expect(tarjeta.locator('.pendiente')).toBeVisible();
  242 |     expect(await avisosEnServidor()).toHaveLength(0); // aún no llega al servidor
  243 |     await captura(page, 'cn-rf16-01-pendiente-sin-conexion');
  244 | 
  245 |     // Aviso de "sin conexión": depende del momento en que Firestore detecta la caída
  246 |     await expect.soft(page.locator('.offline-tag')).toBeVisible({ timeout: 20_000 });
  247 |   });
  248 | 
  249 |   await test.step('Al reconectar: el servidor recibe el aviso', async () => {
  250 |     await context.setOffline(false);
  251 |     await expect.poll(async () => (await avisosEnServidor()).length, { timeout: 90_000 }).toBe(1);
  252 |     const [guardado] = await avisosEnServidor();
  253 |     expect(guardado.texto).toBe(TEXTO);
  254 |   });
  255 | 
  256 |   await test.step('Tras recargar, el aviso ya no figura como pendiente', async () => {
  257 |     await page.reload();
  258 |     await irAlMapa(page);
  259 |     await seleccionarEdificio(page, edificio);
  260 |     await abrirAvisos(page);
  261 |     const tarjeta = page.locator('app-avisos-edificio .aviso');
  262 |     await expect(tarjeta).toContainText(TEXTO);
  263 |     await expect(tarjeta.locator('.pendiente')).toHaveCount(0);
  264 |     await captura(page, 'cn-rf16-02-sincronizado');
  265 |   });
  266 | });
  267 | 
  268 | 
```
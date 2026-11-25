# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: avisos.e2e.ts >> E2E: un visitante sin sesión no puede publicar y se le manda a iniciar sesión
- Location: tests/e2e/avisos.e2e.ts:245:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for locator('.node-dropdown button').first()
    - locator resolved to <button type="button" _ngcontent-ng-c1582007108="">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div tabindex="0" id="campus-map" _ngcontent-ng-c1582007108="" class="leaflet-container leaflet-touch leaflet-retina leaflet-fade-anim leaflet-grab leaflet-touch-drag leaflet-touch-zoom">…</div> from <main class="map-stage" _ngcontent-ng-c1582007108="">…</main> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div tabindex="0" id="campus-map" _ngcontent-ng-c1582007108="" class="leaflet-container leaflet-touch leaflet-retina leaflet-fade-anim leaflet-grab leaflet-touch-drag leaflet-touch-zoom">…</div> from <main class="map-stage" _ngcontent-ng-c1582007108="">…</main> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    169 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div tabindex="0" id="campus-map" _ngcontent-ng-c1582007108="" class="leaflet-container leaflet-touch leaflet-retina leaflet-fade-anim leaflet-grab leaflet-touch-drag leaflet-touch-zoom">…</div> from <main class="map-stage" _ngcontent-ng-c1582007108="">…</main> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - main [ref=e5]:
    - generic [ref=e6]:
      - generic:
        - generic:
          - button "Marker" [ref=e7] [cursor=pointer]
          - button "Marker" [ref=e8] [cursor=pointer]
          - button "Marker" [ref=e9] [cursor=pointer]
          - button "Marker" [ref=e10] [cursor=pointer]
          - button "Marker" [ref=e11] [cursor=pointer]
          - button "Marker" [ref=e12] [cursor=pointer]
          - button "Marker" [ref=e13] [cursor=pointer]
          - button "Marker" [ref=e14] [cursor=pointer]
          - button "Marker" [ref=e15] [cursor=pointer]
          - button "Marker" [ref=e16] [cursor=pointer]
          - button "Marker" [ref=e17] [cursor=pointer]
          - button "Marker" [ref=e18] [cursor=pointer]
          - button "Marker" [ref=e19] [cursor=pointer]
          - button "Marker" [ref=e20] [cursor=pointer]
          - button "Marker" [ref=e21] [cursor=pointer]
          - button "Marker" [ref=e22] [cursor=pointer]
          - button "Marker" [ref=e23] [cursor=pointer]
          - button "Marker" [ref=e24] [cursor=pointer]
          - button "Marker" [ref=e25] [cursor=pointer]
          - button "Marker" [ref=e26] [cursor=pointer]
          - button "Marker" [ref=e27] [cursor=pointer]
          - button "Marker" [ref=e28] [cursor=pointer]
          - button "Marker" [ref=e29] [cursor=pointer]
          - button "Marker" [ref=e30] [cursor=pointer]
          - button "Marker" [ref=e31] [cursor=pointer]
          - button "Marker" [ref=e32] [cursor=pointer]
      - generic:
        - generic [ref=e33]:
          - button "Zoom in" [ref=e34] [cursor=pointer]: +
          - button "Zoom out" [ref=e35] [cursor=pointer]: −
        - generic [ref=e36]:
          - link "Leaflet" [ref=e37] [cursor=pointer]:
            - /url: https://leafletjs.com
          - text: "| © OpenStreetMap contributors"
    - 'button "Avisos del campus: 0 vigentes" [ref=e42] [cursor=pointer]':
      - generic [ref=e47]: Avisos
  - generic [ref=e48]:
    - generic [ref=e50]: Busca tu destino.
    - generic [ref=e52]:
      - generic [ref=e53]:
        - searchbox "¿A dónde quieres ir?" [active] [ref=e54]: Edificio
        - button "Borrar búsqueda y quitar destino" [ref=e55] [cursor=pointer]
        - generic [ref=e59]:
          - button "Entrada Edificio J path" [ref=e60] [cursor=pointer]:
            - generic [ref=e61]: Entrada Edificio J
            - generic [ref=e62]: path
          - button "Entrada Edificio K path" [ref=e63] [cursor=pointer]:
            - generic [ref=e64]: Entrada Edificio K
            - generic [ref=e65]: path
          - button "Intersección Cafetería Edificio J junction" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]: Intersección Cafetería Edificio J
            - generic [ref=e68]: junction
          - button "Intersección Idiomas Edificio J junction" [ref=e69] [cursor=pointer]:
            - generic [ref=e70]: Intersección Idiomas Edificio J
            - generic [ref=e71]: junction
      - button "Ver ruta" [ref=e72] [cursor=pointer]
```

# Test source

```ts
  29  |   await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
  30  |     method: 'DELETE',
  31  |   });
  32  |   await fetch(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  33  | }
  34  | 
  35  | /** Crea el usuario directo en el Auth Emulator y devuelve su uid. */
  36  | async function crearUsuarioEnEmulador(email: string): Promise<string> {
  37  |   const cabeceras = { 'Content-Type': 'application/json' };
  38  | 
  39  |   const alta = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
  40  |     method: 'POST',
  41  |     headers: cabeceras,
  42  |     body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  43  |   });
  44  |   if (!alta.ok) throw new Error(`No se pudo crear el usuario de prueba: ${alta.status}`);
  45  |   const { idToken, localId } = (await alta.json()) as { idToken: string; localId: string };
  46  | 
  47  |   await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`, {
  48  |     method: 'POST',
  49  |     headers: cabeceras,
  50  |     body: JSON.stringify({ idToken, displayName: NOMBRE, returnSecureToken: false }),
  51  |   });
  52  | 
  53  |   return localId;
  54  | }
  55  | 
  56  | interface AvisoServidor {
  57  |   id: string;
  58  |   texto?: string;
  59  |   tipo?: string;
  60  |   autorUid?: string;
  61  |   edificioNombre?: string;
  62  | }
  63  | 
  64  | /** Lee los avisos directo del servidor (REST con "owner" salta las reglas). */
  65  | async function avisosEnServidor(): Promise<AvisoServidor[]> {
  66  |   const r = await fetch(`${FIRESTORE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/avisos`, {
  67  |     headers: { Authorization: 'Bearer owner' },
  68  |   });
  69  |   if (!r.ok) throw new Error(`Firestore REST respondió ${r.status}`);
  70  | 
  71  |   const json = (await r.json()) as {
  72  |     documents?: { name: string; fields?: Record<string, { stringValue?: string }> }[];
  73  |   };
  74  | 
  75  |   return (json.documents ?? []).map((d) => ({
  76  |     id: d.name.split('/').pop() ?? '',
  77  |     texto: d.fields?.['texto']?.stringValue,
  78  |     tipo: d.fields?.['tipo']?.stringValue,
  79  |     autorUid: d.fields?.['autorUid']?.stringValue,
  80  |     edificioNombre: d.fields?.['edificioNombre']?.stringValue,
  81  |   }));
  82  | }
  83  | 
  84  | // ---------- utilidades de la interfaz ----------
  85  | 
  86  | /** Activa la bandera para que la app use los emuladores y no prac9-db-sync. */
  87  | async function usarEmuladores(context: BrowserContext): Promise<void> {
  88  |   await context.addInitScript(() => {
  89  |     try {
  90  |       localStorage.setItem('USE_FIREBASE_EMULATOR', '1');
  91  |       localStorage.setItem('E2E_SIN_3D', '1'); // mapa 2D: el 3D por software congela el navegador de pruebas
  92  |     } catch {
  93  |       /* sin localStorage */
  94  |     }
  95  |   });
  96  | }
  97  | 
  98  | async function irAlMapa(page: Page): Promise<void> {
  99  |   const buscador = page.getByPlaceholder('¿A dónde quieres ir?');
  100 |   for (const ruta of RUTAS_MAPA) {
  101 |     await page.goto(ruta);
  102 |     const visible = await buscador.waitFor({ state: 'visible', timeout: 5_000 }).then(
  103 |       () => true,
  104 |       () => false,
  105 |     );
  106 |     if (visible) {
  107 |       console.log(`🟢 Pantalla del mapa encontrada en "${ruta}"`);
  108 |       return;
  109 |     }
  110 |   }
  111 |   throw new Error(`No encontré el buscador del mapa en ninguna de estas rutas: ${RUTAS_MAPA.join(', ')}`);
  112 | }
  113 | 
  114 | /** Busca y elige un edificio. Si no se da nombre, elige el primer resultado. */
  115 | async function seleccionarEdificio(page: Page, nombre?: string): Promise<string> {
  116 |   const buscador = page.getByPlaceholder('¿A dónde quieres ir?');
  117 |   const consultas = nombre ? [nombre] : ['Edificio', 'Aula', 'Biblioteca', 'Laboratorio', 'a', 'e'];
  118 | 
  119 |   for (const q of consultas) {
  120 |     await buscador.fill('');
  121 |     await buscador.fill(q);
  122 |     const opcion = page.locator('.node-dropdown button').first();
  123 |     const hayResultados = await opcion.waitFor({ state: 'visible', timeout: 2_000 }).then(
  124 |       () => true,
  125 |       () => false,
  126 |     );
  127 |     if (hayResultados) {
  128 |       const elegido = (await opcion.locator('span').first().innerText()).trim();
> 129 |       await opcion.click();
      |                    ^ Error: locator.click: Test timeout of 90000ms exceeded.
  130 |       await expect(page.locator('.search-field-wrap .clear-btn')).toBeVisible(); // el destino quedó elegido
  131 |       return elegido;
  132 |     }
  133 |   }
  134 |   throw new Error('El buscador no devolvió ningún edificio para elegir.');
  135 | }
  136 | 
  137 | async function abrirAvisos(page: Page): Promise<void> {
  138 |   await page.locator('app-avisos-modal .avisos-btn').click();
  139 |   await expect(page.locator('app-avisos-modal .cuerpo')).toBeVisible();
  140 | }
  141 | 
  142 | async function nuevoVisitante(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  143 |   const context = await browser.newContext({ bypassCSP: true });
  144 |   await usarEmuladores(context);
  145 |   return { context, page: await context.newPage() };
  146 | }
  147 | 
  148 | const captura = (page: Page, nombre: string) =>
  149 |   page.screenshot({ path: `${EVIDENCIA}/${nombre}.png`, fullPage: true });
  150 | 
  151 | // ---------- pruebas ----------
  152 | 
  153 | test.beforeEach(async ({ context }) => {
  154 |   await limpiarEmulador();
  155 |   await usarEmuladores(context);
  156 | });
  157 | 
  158 | test('E2E: login -> publicar aviso -> persiste -> lo ve un visitante -> eliminar', async ({ page, browser }) => {
  159 |   test.setTimeout(120_000);
  160 | 
  161 |   // El correo debe cumplir el dominio institucional que muestra el formulario
  162 |   await page.goto('/login');
  163 |   const placeholder = (await page.locator('input[type="email"]').getAttribute('placeholder')) ?? '';
  164 |   const dominio = placeholder.startsWith('correo') ? placeholder.slice('correo'.length) : '@prueba.test';
  165 |   const email = `e2e-autor${dominio}`;
  166 |   const uid = await crearUsuarioEnEmulador(email);
  167 | 
  168 |   await test.step('1. Iniciar sesión con el usuario de prueba', async () => {
  169 |     await page.locator('input[type="email"]').fill(email);
  170 |     await page.locator('input[type="password"]').fill(PASSWORD);
  171 |     await captura(page, '01-login');
  172 |     await page.locator('button.principal').click();
  173 |     await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  174 |   });
  175 | 
  176 |   let edificio = '';
  177 |   await test.step('2. Ir al mapa y elegir un edificio', async () => {
  178 |     await irAlMapa(page);
  179 |     edificio = await seleccionarEdificio(page);
  180 |     await abrirAvisos(page);
  181 |     await expect(page.locator('app-avisos-modal .vacio')).toBeVisible(); // base limpia
  182 |     await expect(page.locator('app-avisos-modal .sesion')).toContainText('Sesión:');
  183 |     await captura(page, '02-edificio-sin-avisos');
  184 |   });
  185 | 
  186 |   await test.step('3. Publicar un aviso de tipo "Cerrado"', async () => {
  187 |     await page.locator('app-avisos-modal .agregar', { hasText: 'Agregar aviso' }).click();
  188 |     await page.locator('app-avisos-modal .tipos button', { hasText: 'Cerrado' }).click();
  189 |     await page.locator('app-avisos-modal textarea').fill(TEXTO);
  190 |     await captura(page, '03-formulario-lleno');
  191 |     await page.locator('app-avisos-modal .publicar').click();
  192 |   });
  193 | 
  194 |   const tarjeta = page.locator('app-avisos-modal .aviso[data-tipo="cerrado"]');
  195 | 
  196 |   await test.step('4. El aviso aparece en pantalla', async () => {
  197 |     await expect(tarjeta).toContainText(TEXTO);
  198 |     await expect(tarjeta.getByRole('button', { name: 'Eliminar' })).toBeVisible(); // el autor puede borrarlo
  199 |     await captura(page, '04-aviso-publicado');
  200 |   });
  201 | 
  202 |   await test.step('5. Persistencia: el aviso quedó guardado en Firestore con los datos correctos', async () => {
  203 |     await expect.poll(async () => (await avisosEnServidor()).length, { timeout: 15_000 }).toBe(1);
  204 |     const [guardado] = await avisosEnServidor();
  205 |     expect(guardado.texto).toBe(TEXTO);
  206 |     expect(guardado.tipo).toBe('cerrado');
  207 |     expect(guardado.autorUid).toBe(uid);
  208 |     expect(guardado.edificioNombre).toBe(edificio);
  209 |   });
  210 | 
  211 |   await test.step('6. Tras recargar la página el aviso sigue ahí y la sesión se conserva', async () => {
  212 |     await page.reload();
  213 |     await irAlMapa(page);
  214 |     await seleccionarEdificio(page, edificio);
  215 |     await abrirAvisos(page);
  216 |     await expect(tarjeta).toContainText(TEXTO);
  217 |     await expect(tarjeta.getByRole('button', { name: 'Eliminar' })).toBeVisible();
  218 |     await captura(page, '05-despues-de-recargar');
  219 |   });
  220 | 
  221 |   await test.step('7. Un visitante SIN sesión ve el aviso pero no puede borrarlo', async () => {
  222 |     const visitante = await nuevoVisitante(browser);
  223 |     try {
  224 |       await irAlMapa(visitante.page);
  225 |       await seleccionarEdificio(visitante.page, edificio);
  226 |       await abrirAvisos(visitante.page);
  227 |       const suya = visitante.page.locator('app-avisos-modal .aviso[data-tipo="cerrado"]');
  228 |       await expect(suya).toContainText(TEXTO);
  229 |       await expect(suya.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
```
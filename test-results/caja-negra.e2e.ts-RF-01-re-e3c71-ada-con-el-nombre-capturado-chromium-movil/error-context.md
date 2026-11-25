# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: caja-negra.e2e.ts >> RF-01: registrar una cuenta deja la sesión iniciada con el nombre capturado
- Location: tests/e2e/caja-negra.e2e.ts:39:1

# Error details

```
Error: locator.click: Test ended.
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
    72 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div tabindex="0" id="campus-map" _ngcontent-ng-c1582007108="" class="leaflet-container leaflet-touch leaflet-retina leaflet-fade-anim leaflet-grab leaflet-touch-drag leaflet-touch-zoom">…</div> from <main class="map-stage" _ngcontent-ng-c1582007108="">…</main> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Test source

```ts
  42  | }
  43  | 
  44  | export interface AvisoServidor {
  45  |   id: string;
  46  |   texto?: string;
  47  |   tipo?: string;
  48  |   autorUid?: string;
  49  |   edificioNombre?: string;
  50  | }
  51  | 
  52  | /** Lee los avisos directo del servidor (REST con "owner" salta las reglas). */
  53  | export async function avisosEnServidor(): Promise<AvisoServidor[]> {
  54  |   const r = await fetch(`${FIRESTORE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/avisos`, {
  55  |     headers: { Authorization: 'Bearer owner' },
  56  |   });
  57  |   if (!r.ok) throw new Error(`Firestore REST respondió ${r.status}`);
  58  | 
  59  |   const json = (await r.json()) as {
  60  |     documents?: { name: string; fields?: Record<string, { stringValue?: string }> }[];
  61  |   };
  62  | 
  63  |   return (json.documents ?? []).map((d) => ({
  64  |     id: d.name.split('/').pop() ?? '',
  65  |     texto: d.fields?.['texto']?.stringValue,
  66  |     tipo: d.fields?.['tipo']?.stringValue,
  67  |     autorUid: d.fields?.['autorUid']?.stringValue,
  68  |     edificioNombre: d.fields?.['edificioNombre']?.stringValue,
  69  |   }));
  70  | }
  71  | 
  72  | // ---------- interfaz ----------
  73  | 
  74  | /** Activa la bandera para que la app use los emuladores y no prac9-db-sync. */
  75  | export async function usarEmuladores(context: BrowserContext): Promise<void> {
  76  |   await context.addInitScript(() => {
  77  |     try {
  78  |       localStorage.setItem('USE_FIREBASE_EMULATOR', '1');
  79  |       localStorage.setItem('E2E_SIN_3D', '1'); // mapa 2D: el 3D por software congela el navegador de pruebas
  80  |     } catch {
  81  |       /* sin localStorage */
  82  |     }
  83  |   });
  84  | }
  85  | 
  86  | export const captura = (page: Page, nombre: string) =>
  87  |   page.screenshot({ path: `${EVIDENCIA}/${nombre}.png`, fullPage: true });
  88  | 
  89  | /** Lee el dominio institucional que muestra el formulario (vacío = cualquier correo). */
  90  | export async function leerDominio(page: Page): Promise<string> {
  91  |   const placeholder = (await page.locator('input[type="email"]').getAttribute('placeholder')) ?? '';
  92  |   return placeholder.startsWith('correo') ? placeholder.slice('correo'.length) : '@prueba.test';
  93  | }
  94  | 
  95  | /** Va a /login, lee el dominio y crea en el emulador un usuario con ese correo. */
  96  | export async function prepararUsuario(
  97  |   page: Page,
  98  |   alias: string,
  99  |   nombre = 'Usuario E2E',
  100 | ): Promise<{ email: string; uid: string; dominio: string }> {
  101 |   await page.goto('/login');
  102 |   const dominio = await leerDominio(page);
  103 |   const email = `${alias}${dominio}`;
  104 |   const uid = await crearUsuarioEnEmulador(email, nombre);
  105 |   return { email, uid, dominio };
  106 | }
  107 | 
  108 | export async function abrirRegistro(page: Page): Promise<void> {
  109 |   await page.goto(`/login?redirect=${encodeURIComponent(RUTA_MAPA)}`);
  110 |   await page.locator('.tabs button', { hasText: 'Crear cuenta' }).click();
  111 | }
  112 | 
  113 | export async function iniciarSesionUI(page: Page, email: string, password = PASSWORD): Promise<void> {
  114 |   await page.goto(`/login?redirect=${encodeURIComponent(RUTA_MAPA)}`);
  115 |   await page.locator('input[type="email"]').fill(email);
  116 |   await page.locator('input[type="password"]').fill(password);
  117 |   await page.locator('button.principal').click();
  118 |   await page.waitForURL((url) => url.pathname === RUTA_MAPA);
  119 |   await expect(page.getByPlaceholder(BUSCADOR)).toBeVisible();
  120 | }
  121 | 
  122 | export async function irAlMapa(page: Page): Promise<void> {
  123 |   await page.goto(RUTA_MAPA);
  124 |   await expect(page.getByPlaceholder(BUSCADOR)).toBeVisible();
  125 | }
  126 | 
  127 | /** Busca y elige un edificio. Si no se da nombre, elige el primer resultado. */
  128 | export async function seleccionarEdificio(page: Page, nombre?: string): Promise<string> {
  129 |   const buscador = page.getByPlaceholder(BUSCADOR);
  130 |   const consultas = nombre ? [nombre] : ['Edificio', 'Aula', 'Biblioteca', 'Laboratorio', 'a', 'e'];
  131 | 
  132 |   for (const q of consultas) {
  133 |     await buscador.fill('');
  134 |     await buscador.fill(q);
  135 |     const opcion = page.locator('.node-dropdown button').first();
  136 |     const hayResultados = await opcion.waitFor({ state: 'visible', timeout: 2_000 }).then(
  137 |       () => true,
  138 |       () => false,
  139 |     );
  140 |     if (hayResultados) {
  141 |       const elegido = (await opcion.locator('span').first().innerText()).trim();
> 142 |       await opcion.click();
      |                    ^ Error: locator.click: Test ended.
  143 |       await expect(page.locator('.search-field-wrap .clear-btn')).toBeVisible(); // el destino quedó elegido
  144 |       return elegido;
  145 |     }
  146 |   }
  147 |   throw new Error('El buscador no devolvió ningún edificio para elegir.');
  148 | }
  149 | 
  150 | export async function abrirAvisos(page: Page): Promise<void> {
  151 |   await page.locator('app-avisos-modal .avisos-btn').click();
  152 |   await expect(page.locator('app-avisos-modal .cuerpo')).toBeVisible();
  153 | }
  154 | 
  155 | /** Sesión + mapa + edificio + panel de avisos abierto, listo para publicar. */
  156 | export async function entrarAlPanel(page: Page, email: string): Promise<string> {
  157 |   await iniciarSesionUI(page, email);
  158 |   const edificio = await seleccionarEdificio(page);
  159 |   await abrirAvisos(page);
  160 |   return edificio;
  161 | }
  162 | 
  163 | export async function abrirFormularioAviso(page: Page): Promise<void> {
  164 |   await page.locator('app-avisos-modal .agregar', { hasText: 'Agregar aviso' }).click();
  165 |   await expect(page.locator('app-avisos-modal textarea')).toBeVisible();
  166 | }
  167 | 
  168 | /** Extrae el nombre de "Sesión: {nombre} · Salir". */
  169 | export function nombreEnSesion(textoSesion: string): string {
  170 |   return textoSesion.match(/Sesión:\s*(.*?)\s*·/)?.[1] ?? '';
  171 | }
  172 | 
```
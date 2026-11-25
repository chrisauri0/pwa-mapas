# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: avisos.e2e.ts >> E2E: login -> publicar aviso -> persiste -> lo ve un visitante -> eliminar
- Location: tests/e2e/avisos.e2e.ts:158:1

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - main [ref=f1e5]:
    - generic [ref=f1e6]:
      - generic:
        - generic:
          - button "Marker" [ref=f1e7] [cursor=pointer]
          - button "Marker" [ref=f1e8] [cursor=pointer]
          - button "Marker" [ref=f1e9] [cursor=pointer]
          - button "Marker" [ref=f1e10] [cursor=pointer]
          - button "Marker" [ref=f1e11] [cursor=pointer]
          - button "Marker" [ref=f1e12] [cursor=pointer]
          - button "Marker" [ref=f1e13] [cursor=pointer]
          - button "Marker" [ref=f1e14] [cursor=pointer]
          - button "Marker" [ref=f1e15] [cursor=pointer]
          - button "Marker" [ref=f1e16] [cursor=pointer]
          - button "Marker" [ref=f1e17] [cursor=pointer]
          - button "Marker" [ref=f1e18] [cursor=pointer]
          - button "Marker" [ref=f1e19] [cursor=pointer]
          - button "Marker" [ref=f1e20] [cursor=pointer]
          - button "Marker" [ref=f1e21] [cursor=pointer]
          - button "Marker" [ref=f1e22] [cursor=pointer]
          - button "Marker" [ref=f1e23] [cursor=pointer]
          - button "Marker" [ref=f1e24] [cursor=pointer]
          - button "Marker" [ref=f1e25] [cursor=pointer]
          - button "Marker" [ref=f1e26] [cursor=pointer]
          - button "Marker" [ref=f1e27] [cursor=pointer]
          - button "Marker" [ref=f1e28] [cursor=pointer]
          - button "Marker" [ref=f1e29] [cursor=pointer]
          - button "Marker" [ref=f1e30] [cursor=pointer]
          - button "Marker" [ref=f1e31] [cursor=pointer]
          - button "Marker" [ref=f1e32] [cursor=pointer]
      - generic:
        - generic [ref=f1e33]:
          - button "Zoom in" [ref=f1e34] [cursor=pointer]: +
          - button "Zoom out" [ref=f1e35] [cursor=pointer]: −
        - generic [ref=f1e36]:
          - link "Leaflet" [ref=f1e37] [cursor=pointer]:
            - /url: https://leafletjs.com
          - text: "| © OpenStreetMap contributors"
    - 'button "Avisos del campus: 0 vigentes" [ref=f1e42] [cursor=pointer]':
      - generic [ref=f1e47]: Avisos
  - generic [ref=f1e48]:
    - generic [ref=f1e50]: Busca tu destino.
    - generic [ref=f1e52]:
      - generic [ref=f1e53]:
        - searchbox "¿A dónde quieres ir?" [active] [ref=f1e54]: Edificio
        - button "Borrar búsqueda y quitar destino" [ref=f1e55] [cursor=pointer]
        - generic [ref=f1e59]:
          - button "Entrada Edificio J path" [ref=f1e60] [cursor=pointer]:
            - generic [ref=f1e61]: Entrada Edificio J
            - generic [ref=f1e62]: path
          - button "Entrada Edificio K path" [ref=f1e63] [cursor=pointer]:
            - generic [ref=f1e64]: Entrada Edificio K
            - generic [ref=f1e65]: path
          - button "Intersección Cafetería Edificio J junction" [ref=f1e66] [cursor=pointer]:
            - generic [ref=f1e67]: Intersección Cafetería Edificio J
            - generic [ref=f1e68]: junction
          - button "Intersección Idiomas Edificio J junction" [ref=f1e69] [cursor=pointer]:
            - generic [ref=f1e70]: Intersección Idiomas Edificio J
            - generic [ref=f1e71]: junction
      - button "Ver ruta" [ref=f1e72] [cursor=pointer]
```
# Campus Dashboard — Ecosistema Multi-dispositivo

Sistema de mapeo y estadísticas del campus, compuesto por 3 aplicaciones sincronizadas:

- **PWA Móvil/TV (Angular)**: mapa interactivo con ruta óptima + dashboard tipo Smart TV
- **Wearable (Flutter)**: monitor de actividad (pasos + notificación de llegada)
- **Backend (NestJS)**: API REST + WebSocket Gateway

## Arquitectura



## Requisitos previos

- Node.js 20+
- pnpm
- Flutter SDK 3.44+
- Android Studio (con emulador Wear OS configurado)

## 1. Backend (NestJS)

```bash
cd horarios-tv-backend
pnpm install
pnpm run start:dev
```

Corre en `http://localhost:3000`

## 2. Frontend Angular (PWA)

```bash
cd angular-pwa
pnpm install
ng serve
```

Corre en `http://localhost:4200`

- Ruta `/map` → vista móvil con GPS y trazado de ruta óptima
- Ruta `/dashboard` → vista Smart TV con estadísticas en vivo

## 3. Wearable (Flutter)

```bash
cd campus_wearable
flutter pub get
flutter run -d emulator-5554
```

> Antes de correr, actualiza la IP en `lib/main.dart` (variable `apiUrl`) con la IP local de la máquina que corre el backend:
> ```bash
> hostname -I
> ```

## Flujo de sincronización

1. El usuario traza una ruta en `/map` (Angular)
2. El evento se emite vía WebSocket al backend NestJS
3. El backend actualiza estadísticas en tiempo real (usuarios activos, destino más buscado, ruta en vivo, distancia recorrida)
4. El dashboard `/dashboard` (Smart TV) y el wearable (Flutter, vía polling HTTP) reflejan los cambios en <2 segundos

## Variables de entorno

Cada proyecto (`angular-pwa`, `horarios-tv-backend`) requiere un archivo `.env` local (no incluido en el repo por seguridad). Ver `.env.example` en cada carpeta para las variables necesarias.

## Seguridad

- CSP configurada restringiendo `img-src`, `script-src`, `connect-src` a orígenes conocidos
- `.env` y credenciales excluidos del control de versiones
- Ver `SECURITY.md` para el detalle de OWASP Mobile Top 10 aplicado y aviso de privacidad (LFPDPPP)
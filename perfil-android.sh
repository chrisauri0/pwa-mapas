#!/usr/bin/env bash
# Práctica 12 · Fase 2: mide CPU, memoria y fluidez de la interfaz de la app en el celular, con adb.
#
# Requisitos: celular con "Depuración USB" activada y conectado; adb instalado.
#   En NixOS:  nix-shell -p android-tools   (o:  nix run nixpkgs#android-tools -- devices)
#
# Uso:
#   bash perfil-android.sh antes     # muestrea 90 s mientras tú haces las pruebas (ver abajo)
#   bash perfil-android.sh despues   # lo mismo con la versión optimizada, MISMAS acciones
# Duración distinta:  DURACION=120 bash perfil-android.sh antes
#
# Durante el muestreo haz, en este orden y sin prisa (anota la hora de cada paso en el informe):
#   1. 0-15 s   abrir la app y esperar el mapa
#   2. 15-40 s  consulta repetida: entrar y salir de la pantalla de avisos de 3 edificios
#   3. 40-55 s  escritura: publicar un aviso y borrarlo
#   4. 55-75 s  procesamiento: trazar 3 rutas distintas (usa la más larga del campus una vez)
#   5. 75-90 s  navegar entre las pantallas principales (mapa, avisos, login, términos)
set -u
ETIQUETA="${1:-antes}"
PAQUETE="mx.edu.uteq.mapa"
DURACION="${DURACION:-90}"
INTERVALO=2
OUT="evidencia-fase12"
mkdir -p "$OUT"
CSV="$OUT/perfil-$ETIQUETA.csv"
RESUMEN="$OUT/perfil-$ETIQUETA-resumen.txt"

if ! command -v adb >/dev/null; then echo "🔴 No encuentro adb. En NixOS: nix-shell -p android-tools"; exit 1; fi
if ! adb get-state >/dev/null 2>&1; then echo "🔴 No hay celular conectado (revisa USB y 'adb devices')."; exit 1; fi

MODELO=$(adb shell getprop ro.product.model | tr -d '\r')
ANDROID=$(adb shell getprop ro.build.version.release | tr -d '\r')
VERSION_APP=$(adb shell dumpsys package "$PAQUETE" | grep -m1 versionName | tr -d '\r ' )
NUCLEOS=$(adb shell nproc | tr -d '\r')
echo "🟡 Dispositivo: $MODELO · Android $ANDROID · $VERSION_APP · $NUCLEOS núcleos"

# Arranque limpio de la app y de las estadísticas de fotogramas
adb shell am force-stop "$PAQUETE"
adb shell dumpsys gfxinfo "$PAQUETE" reset >/dev/null 2>&1
adb shell monkey -p "$PAQUETE" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 3
PID=$(adb shell pidof "$PAQUETE" | tr -d '\r')
if [ -z "$PID" ]; then echo "🔴 La app no arrancó."; exit 1; fi
echo "🟡 App en ejecución (PID $PID). Muestreando $DURACION s: empieza las acciones ya."

echo "segundo,cpu_pct,ram_pss_mb" > "$CSV"
T0=$(date +%s)
while true; do
  S=$(( $(date +%s) - T0 ))
  [ "$S" -ge "$DURACION" ] && break
  # CPU: % del total de un núcleo (top -n 1); se normaliza dividiendo entre los núcleos
  CPU=$(adb shell top -b -n 1 -p "$PID" 2>/dev/null | awk -v p="$PID" '$1==p {print $9}' | head -1 | tr -d '\r')
  CPU=${CPU:-0}
  # Memoria: TOTAL PSS en KB
  PSS=$(adb shell dumpsys meminfo "$PAQUETE" 2>/dev/null | awk '/TOTAL PSS:/ {print $3; exit} /^ *TOTAL +[0-9]/ {print $2; exit}' | tr -d '\r')
  PSS=${PSS:-0}
  CPU_N=$(awk -v c="$CPU" -v n="$NUCLEOS" 'BEGIN{printf "%.1f", c/n}')
  RAM_MB=$(awk -v k="$PSS" 'BEGIN{printf "%.1f", k/1024}')
  echo "$S,$CPU_N,$RAM_MB" >> "$CSV"
  sleep "$INTERVALO"
done

GFX=$(adb shell dumpsys gfxinfo "$PAQUETE" 2>/dev/null | tr -d '\r')
awk -F, 'NR>1 && $3>0 {n++; c+=$2; if($2>cm)cm=$2; r=$3; if(n==1)ri=r; if(r>rm)rm=r; rf=r} END{
  printf "CPU promedio: %.1f %%  CPU máximo: %.1f %%  (de todos los núcleos)\n", c/n, cm;
  printf "RAM inicial: %.1f MB  RAM máxima: %.1f MB  RAM final: %.1f MB\n", ri, rm, rf }' "$CSV" > "$RESUMEN.tmp"
{
  echo "Dispositivo: $MODELO · Android $ANDROID · $VERSION_APP · $NUCLEOS núcleos"
  echo "Etiqueta: $ETIQUETA   Fecha: $(date '+%Y-%m-%d %H:%M:%S %Z')   Duración: $DURACION s, cada $INTERVALO s"
  cat "$RESUMEN.tmp"
  echo "--- Fluidez de la interfaz (gfxinfo) ---"
  echo "$GFX" | grep -E "Total frames rendered|Janky frames|50th percentile|90th percentile|95th percentile|99th percentile|Number Missed Vsync|Number Slow UI thread|Number Slow bitmap uploads|Number Slow issue draw commands"
} > "$RESUMEN"
rm -f "$RESUMEN.tmp"
cat "$RESUMEN"
echo "🟢 Listo. Pásame $RESUMEN y $CSV"

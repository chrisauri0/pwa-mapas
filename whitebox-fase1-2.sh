#!/usr/bin/env bash
# Corre uno por uno los comandos de las Fases 1 y 2 de la práctica 11 (White Box)
# y guarda TODO el log en evidencia-whitebox/. No se detiene si un paso falla.
#
# Uso (desde la raíz del proyecto):
#   bash whitebox-fase1-2.sh              -> corre los 11 pasos, log en evidencia-whitebox/
#   bash whitebox-fase1-2.sh 02 03 04     -> solo esos pasos, log en evidencia-whitebox-reintento/
# Al final te queda  <carpeta>/reporte-completo.txt  (el que me pasas)

set -u
SOLO=" $* "
if [ $# -gt 0 ]; then OUT="evidencia-whitebox-reintento"; else OUT="evidencia-whitebox"; fi
rm -rf "$OUT"
mkdir -p "$OUT"
LOG="$OUT/reporte-completo.txt"
RESUMEN="$OUT/resumen.txt"
: > "$LOG"
: > "$RESUMEN"

estampa() { date '+%Y-%m-%d %H:%M:%S %Z'; }

# $1 = id del paso, $2 = descripción, resto = comando (se ejecuta con bash -c)
paso() {
  local id="$1" desc="$2" cmd="$3"
  local archivo="$OUT/${id}.txt"
  # Si se pidieron pasos concretos, se saltan los demás
  if [ $# -gt 0 ] && [ "$SOLO" != "  " ] && [[ "$SOLO" != *" ${id%%-*} "* ]]; then return 0; fi
  local inicio fin codigo t0 t1

  echo "🟡 [$id] $desc"
  {
    echo
    echo "=================================================================="
    echo "[$id] $desc"
    echo "Comando : $cmd"
    echo "Inicio  : $(estampa)"
    echo "=================================================================="
  } | tee -a "$LOG" > "$archivo"

  t0=$(date +%s)
  bash -c "$cmd" 2>&1 | tee -a "$LOG" >> "$archivo"
  codigo=${PIPESTATUS[0]}
  t1=$(date +%s)

  {
    echo "------------------------------------------------------------------"
    echo "Código de salida: $codigo   Duración: $((t1 - t0)) s   Fin: $(estampa)"
  } | tee -a "$LOG" >> "$archivo"

  if [ "$codigo" -eq 0 ]; then
    echo "🟢 [$id] terminó bien ($((t1 - t0)) s)"
    echo "🟢 $id  código 0   $desc" >> "$RESUMEN"
  else
    echo "🔴 [$id] terminó con código $codigo ($((t1 - t0)) s). Es normal en lint, audit y outdated si hay hallazgos."
    echo "🔴 $id  código $codigo   $desc" >> "$RESUMEN"
  fi
}

# ---------------------------------------------------------------- entorno
{
  echo "ENTORNO DE EJECUCIÓN"
  echo "Fecha         : $(estampa)"
  echo "Equipo        : $(hostname)"
  echo "Sistema       : $(uname -srm)"
  echo "Node          : $(node --version 2>&1)"
  echo "pnpm          : $(pnpm --version 2>&1)"
  echo "Git (commit)  : $(git rev-parse --short HEAD 2>&1)"
  echo "Git (rama)    : $(git rev-parse --abbrev-ref HEAD 2>&1)"
  echo "Cambios sin commit:"
  git status --short 2>&1 | sed 's/^/   /'
  echo
} | tee -a "$LOG" > "$OUT/00-entorno.txt"

# ---------------------------------------------------------------- Fase 2
paso "01-pruebas-unitarias" "Pruebas unitarias y white box (pnpm test:unit)" \
  "pnpm test:unit"

paso "02-instalar-cobertura" "Instalar el proveedor de cobertura (@vitest/coverage-v8)" \
  "pnpm add -D @vitest/coverage-v8@\$(node -p \"require('vitest/package.json').version\")"

paso "03-cobertura" "Cobertura de instrucciones y ramas de avisos.logic y ruta.logic" \
  "pnpm exec ng test --watch=false --coverage \
     --include='src/app/core/services/*.spec.ts' \
     --coverage-include='src/app/core/services/avisos.logic.ts' \
     --coverage-include='src/app/core/services/ruta.logic.ts' \
     --coverage-reporters=text --coverage-reporters=html"

paso "04-complejidad" "Complejidad ciclomática medida por ESLint (umbral 6), con el archivo de cada método" \
  "pnpm exec eslint src/app --rule '{\"complexity\":[\"warn\",6]}' 2>&1 | awk '/^\\//{f=\$0} /complexity/{print f \" -> \" \$0; n++} END{if(!n) print \"(sin resultados de complexity: revisar la salida de eslint)\"}'"

paso "05-lint" "Análisis estático: ng lint" \
  "pnpm exec ng lint"

paso "06-tsc" "Análisis estático: compilación de tipos (tsc --noEmit)" \
  "pnpm exec tsc --noEmit -p tsconfig.app.json"

paso "07-audit" "Dependencias con vulnerabilidades conocidas (pnpm audit)" \
  "pnpm audit"

paso "08-outdated" "Dependencias desactualizadas (pnpm outdated)" \
  "pnpm outdated"

paso "09-secretos" "Búsqueda de credenciales y claves en el código versionado" \
  "git grep -nEi 'apikey|api_key|secret|password|token|private_key' -- ':!pnpm-lock.yaml' ':!*.md' ':!evidencia-whitebox*' || echo '(sin coincidencias)'"

paso "10-archivos-sensibles" "Archivos sensibles versionados (.env, google-services, keystore)" \
  "git ls-files | grep -Ei '\\.env|google-services|keystore|\\.jks' || echo '(ninguno versionado)'"

paso "11-version" "Versión del código evaluado" \
  "git rev-parse --short HEAD && git log -1 --format='%H%n%an%n%ad%n%s' && git status --short"

# ---------------------------------------------------------------- cierre
if [ -d coverage ]; then
  cp -r coverage "$OUT/coverage-html"
  echo "🟢 Reporte HTML de cobertura copiado a $OUT/coverage-html/index.html (ábrelo para las capturas)"
fi

echo
echo "================ RESUMEN ================"
cat "$RESUMEN"
echo "========================================="
echo "🟢 Listo. Pásame este archivo:  $LOG"

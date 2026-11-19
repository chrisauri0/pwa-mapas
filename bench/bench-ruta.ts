// Práctica 12 · Fase 6: mide la ruta más corta antes (arreglo lineal, O(V²)) y después (montículo, O(E log V)).
// Uso:  node --experimental-strip-types bench-ruta.ts
import { buscarRutaMasCorta as antes } from './ruta.baseline.ts';
import { buscarRutaMasCorta as despues } from '../src/app/core/services/ruta.logic.ts';
import { CAMPUS_NODES, CAMPUS_EDGES } from './graph.ts';

const ms = () => Number(process.hrtime.bigint()) / 1e6;
function medir(fn: () => unknown, reps: number): { prom: number; p95: number; max: number } {
  for (let i = 0; i < Math.min(50, reps); i++) fn(); // calentamiento
  const t: number[] = [];
  for (let i = 0; i < reps; i++) { const a = ms(); fn(); t.push(ms() - a); }
  t.sort((a, b) => a - b);
  return { prom: t.reduce((x, y) => x + y, 0) / t.length, p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1] };
}
const f = (n: number) => n.toFixed(4);

console.log(`Node ${process.version}  CPU: ${process.arch}`);
// 1) Corrección: mismas distancias en todos los pares del campus
const ids: string[] = CAMPUS_NODES.map((n: any) => n.id);
let pares = 0, difieren = 0;
for (const a of ids) for (const b of ids) {
  const x = antes(CAMPUS_NODES, CAMPUS_EDGES, a, b), y = despues(CAMPUS_NODES, CAMPUS_EDGES, a, b);
  pares++;
  if ((x?.distance ?? null) !== (y?.distance ?? null)) difieren++;
}
console.log(`Corrección: ${pares} pares de nodos del campus (${ids.length} nodos, ${CAMPUS_EDGES.length} aristas); distancias distintas: ${difieren}`);

// 2) Rendimiento en el grafo real: ruta entre los dos nodos más alejados (peor caso)
let mejor = { a: ids[0], b: ids[0], d: -1 };
for (const a of ids.slice(0, 40)) for (const b of ids) {
  const r = antes(CAMPUS_NODES, CAMPUS_EDGES, a, b);
  if (r && r.distance > mejor.d) mejor = { a, b, d: r.distance };
}
console.log(`Ruta más larga probada: ${mejor.a} → ${mejor.b} = ${mejor.d} m`);
const REPS = 2000;
const rA = medir(() => antes(CAMPUS_NODES, CAMPUS_EDGES, mejor.a, mejor.b), REPS);
const rD = medir(() => despues(CAMPUS_NODES, CAMPUS_EDGES, mejor.a, mejor.b), REPS);
console.log('\nGrafo real del campus (2,000 repeticiones):');
console.log(`  antes  : prom ${f(rA.prom)} ms  P95 ${f(rA.p95)} ms  máx ${f(rA.max)} ms`);
console.log(`  después: prom ${f(rD.prom)} ms  P95 ${f(rD.p95)} ms  máx ${f(rD.max)} ms`);

// 3) Escalabilidad: cuadrículas sintéticas de V nodos
console.log('\nEscalabilidad (cuadrícula, ruta de una esquina a la opuesta):');
console.log('  nodos | aristas | antes prom (ms) | después prom (ms) | mejora');
for (const lado of [11, 32, 71, 100]) {
  const nodos = Array.from({ length: lado * lado }, (_, i) => ({ id: `n${i}` }));
  const aristas: { from: string; to: string; distance: number }[] = [];
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const i = y * lado + x;
    if (x + 1 < lado) aristas.push({ from: `n${i}`, to: `n${i + 1}`, distance: 5 + ((x * 7 + y * 3) % 9) });
    if (y + 1 < lado) aristas.push({ from: `n${i}`, to: `n${i + lado}`, distance: 5 + ((x * 5 + y * 11) % 9) });
  }
  const o = 'n0', d = `n${lado * lado - 1}`;
  const reps = lado > 50 ? 15 : 200;
  const a = medir(() => antes(nodos, aristas, o, d), reps);
  const b = medir(() => despues(nodos, aristas, o, d), reps);
  console.log(`  ${String(nodos.length).padStart(5)} | ${String(aristas.length).padStart(7)} | ${f(a.prom).padStart(15)} | ${f(b.prom).padStart(17)} | ${(a.prom / b.prom).toFixed(1)}x`);
}

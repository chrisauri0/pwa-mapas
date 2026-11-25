import { describe, expect, it } from 'vitest';
import {
  type NodoConPunto,
  aristasConDistanciaReal,
  buscarRutasAlternativas,
} from './ruta.alternativas.logic';

// Un "metro" de cuadrícula: 0.0009° de latitud ≈ 100 m y 0.00096° de longitud ≈ 100 m a esta latitud
const nodo = (id: string, x: number, y: number): NodoConPunto => ({
  id,
  lat: 20.655 + y * 0.0009,
  lng: -100.405 + x * 0.00096,
});
const ids = (r: { nodes: { id: string }[] }) => r.nodes.map((n) => n.id);
const cerca = (valor: number, esperado: number, tolerancia: number): boolean =>
  Math.abs(valor - esperado) <= tolerancia;

// Cuadro de 100 m por lado:  B ─ C
//                            │   │
//                            A ─ D
const CUADRO = [nodo('A', 0, 0), nodo('B', 0, 1), nodo('C', 1, 1), nodo('D', 1, 0)];
const LADOS = [
  { from: 'A', to: 'B' },
  { from: 'B', to: 'C' },
  { from: 'A', to: 'D' },
  { from: 'D', to: 'C' },
];

describe('aristasConDistanciaReal', () => {
  it('la distancia sale de las coordenadas: 0.0009° de latitud son unos 100 m', () => {
    const { aristas } = aristasConDistanciaReal(CUADRO, [{ from: 'A', to: 'B' }]);
    expect(aristas).toHaveLength(1);
    expect(cerca(aristas[0].distance, 100, 1)).toBe(true);
  });

  it('ignora el número escrito a mano: solo cuentan las coordenadas', () => {
    const { aristas } = aristasConDistanciaReal(CUADRO, [{ from: 'A', to: 'D', distance: 5 } as never]);
    expect(cerca(aristas[0].distance, 100, 1)).toBe(true);
  });

  it('descarta las aristas con un nodo que no existe y las reporta', () => {
    const { aristas, descartadas } = aristasConDistanciaReal(CUADRO, [
      { from: 'A', to: 'B' },
      { from: 'A', to: 'fantasma' },
    ]);
    expect(aristas).toHaveLength(1);
    expect(descartadas).toEqual([{ from: 'A', to: 'fantasma' }]);
  });

  it('sin aristas no hay nada', () => {
    const r = aristasConDistanciaReal(CUADRO, []);
    expect(r.aristas).toHaveLength(0);
    expect(r.descartadas).toHaveLength(0);
  });
});

describe('buscarRutasAlternativas', () => {
  const { aristas } = aristasConDistanciaReal(CUADRO, LADOS);

  it('en un cuadro hay dos caminos distintos de A a C y no se repiten', () => {
    const rutas = buscarRutasAlternativas(CUADRO, aristas, 'A', 'C');
    expect(rutas).toHaveLength(2);
    expect(ids(rutas[0])).not.toEqual(ids(rutas[1]));
    expect([ids(rutas[0])[1], ids(rutas[1])[1]].sort()).toEqual(['B', 'D']);
  });

  it('la distancia de cada ruta es la real (no la penalizada)', () => {
    const rutas = buscarRutasAlternativas(CUADRO, aristas, 'A', 'C');
    for (const r of rutas) expect(cerca(r.distance, 200, 3)).toBe(true);
  });

  it('la primera es siempre la más corta', () => {
    const rutas = buscarRutasAlternativas(CUADRO, aristas, 'A', 'C');
    expect(rutas[0].distance <= rutas[1].distance).toBe(true);
  });

  it('con maximo 1 solo devuelve la más corta', () => {
    expect(buscarRutasAlternativas(CUADRO, aristas, 'A', 'C', { maximo: 1 })).toHaveLength(1);
  });

  it('en un camino sin otra salida solo hay una ruta', () => {
    const linea = [nodo('P', 0, 0), nodo('Q', 0, 1), nodo('R', 0, 2)];
    const { aristas: a } = aristasConDistanciaReal(linea, [
      { from: 'P', to: 'Q' },
      { from: 'Q', to: 'R' },
    ]);
    const rutas = buscarRutasAlternativas(linea, a, 'P', 'R');
    expect(rutas).toHaveLength(1);
    expect(ids(rutas[0])).toEqual(['P', 'Q', 'R']);
  });

  it('una alternativa mucho más larga que la mejor se descarta (tolerancia)', () => {
    // A-D-C mide 200 m; el rodeo A-E-F-G-C mide 500 m
    const nodos = [...CUADRO.filter((n) => n.id !== 'B'), nodo('E', 0, 2), nodo('F', 1, 3), nodo('G', 2, 2)];
    const { aristas: a } = aristasConDistanciaReal(nodos, [
      { from: 'A', to: 'D' },
      { from: 'D', to: 'C' },
      { from: 'A', to: 'E' },
      { from: 'E', to: 'F' },
      { from: 'F', to: 'G' },
      { from: 'G', to: 'C' },
    ]);
    const rutas = buscarRutasAlternativas(nodos, a, 'A', 'C');
    expect(rutas).toHaveLength(1);
    expect(ids(rutas[0])).toEqual(['A', 'D', 'C']);
  });

  it('una "alternativa" que solo cambia un tramito de la misma ruta se descarta por parecida', () => {
    // Línea de 10 tramos de 100 m (1000 m) y un rodeo que solo cambia el tramo 4-5: comparte el 90 %
    const nodos = [...Array.from({ length: 11 }, (_, i) => nodo(`N${i}`, i, 0)), nodo('X', 4.5, 0.05)];
    const tramos = Array.from({ length: 10 }, (_, i) => ({ from: `N${i}`, to: `N${i + 1}` }));
    const { aristas: a } = aristasConDistanciaReal(nodos, [
      ...tramos,
      { from: 'N4', to: 'X' },
      { from: 'X', to: 'N5' },
    ]);
    const rutas = buscarRutasAlternativas(nodos, a, 'N0', 'N10');
    expect(rutas).toHaveLength(1);
  });

  it('en cambio, un rodeo que cambia la mitad de la ruta sí cuenta como alternativa', () => {
    // Cuadro doble: A-B-C-D arriba y A-E-F-D abajo; las dos rutas no comparten ningún tramo
    const nodos = [nodo('A', 0, 0), nodo('B', 1, 1), nodo('C', 2, 1), nodo('D', 3, 0), nodo('E', 1, -1), nodo('F', 2, -1)];
    const { aristas: a } = aristasConDistanciaReal(nodos, [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'D' },
      { from: 'A', to: 'E' },
      { from: 'E', to: 'F' },
      { from: 'F', to: 'D' },
    ]);
    expect(buscarRutasAlternativas(nodos, a, 'A', 'D')).toHaveLength(2);
  });

  it('sin camino devuelve lista vacía; origen inexistente también', () => {
    const nodos = [...CUADRO, nodo('Z', 5, 5)];
    const { aristas: a } = aristasConDistanciaReal(nodos, LADOS);
    expect(buscarRutasAlternativas(nodos, a, 'A', 'Z')).toEqual([]);
    expect(buscarRutasAlternativas(nodos, a, 'no-existe', 'C')).toEqual([]);
  });

  it('origen y destino iguales: una sola ruta de 0 m', () => {
    const rutas = buscarRutasAlternativas(CUADRO, aristas, 'A', 'A');
    expect(rutas).toHaveLength(1);
    expect(rutas[0].distance).toBe(0);
  });
});

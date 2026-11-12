// Pruebas WHITE BOX de buscarRutaMasCorta (Dijkstra) y construirAdyacencia.
// Cada prueba lleva el ID del camino independiente (CR-xx) que ejecuta; ver la tabla
// de caminos y el grafo de flujo de control en el reporte.

import { describe, expect, it } from 'vitest';
import {
  buscarRutaMasCorta,
  construirAdyacencia,
  type AristaGrafo,
  type NodoGrafo,
} from './ruta.logic';

const nodo = (id: string): NodoGrafo => ({ id });
const arista = (from: string, to: string, distance: number): AristaGrafo => ({ from, to, distance });

const NODOS = ['A', 'B', 'C', 'D', 'E', 'X', 'Y'].map(nodo);
// A-B-C-D en cadena, atajo caro A-C, atajo barato A-D; E no tiene aristas; X-Y es otro componente
const ARISTAS = [
  arista('A', 'B', 1),
  arista('B', 'C', 1),
  arista('A', 'C', 5),
  arista('C', 'D', 1),
  arista('X', 'Y', 1),
];
const ids = (r: ReturnType<typeof buscarRutaMasCorta>) => r?.nodes.map((n) => n.id);

describe('construirAdyacencia', () => {
  it('CA-01: sin aristas devuelve un mapa vacío', () => {
    expect(construirAdyacencia([]).size).toBe(0);
  });

  it('CA-02: cada arista se registra en los dos sentidos', () => {
    const ady = construirAdyacencia([arista('A', 'B', 4)]);
    expect(ady.get('A')).toEqual([{ nodeId: 'B', distance: 4 }]);
    expect(ady.get('B')).toEqual([{ nodeId: 'A', distance: 4 }]);
  });

  it('CA-03: un nodo con varias aristas acumula sus vecinos (rama "ya existía la lista")', () => {
    const ady = construirAdyacencia([arista('A', 'B', 1), arista('A', 'C', 2)]);
    expect(ady.get('A')).toHaveLength(2);
    expect(ady.get('B')).toHaveLength(1);
  });
});

describe('buscarRutaMasCorta: caminos independientes', () => {
  it('CR-01: grafo vacío y destino distinto del origen -> null (sin entrar a ningún ciclo)', () => {
    expect(buscarRutaMasCorta([], [], 'A', 'B')).toBe(null);
  });

  it('CR-02: origen y destino son el mismo nodo -> ruta de un nodo y distancia 0 (sale por destino en la 1ª vuelta)', () => {
    const r = buscarRutaMasCorta(NODOS, ARISTAS, 'A', 'A');
    expect(ids(r)).toEqual(['A']);
    expect(r?.distance).toBe(0);
  });

  it('CR-03: vecinos directos -> ruta de dos nodos', () => {
    const r = buscarRutaMasCorta(NODOS, ARISTAS, 'A', 'B');
    expect(ids(r)).toEqual(['A', 'B']);
    expect(r?.distance).toBe(1);
  });

  it('CR-04: varios saltos, y elige el camino de menor suma aunque tenga más paradas', () => {
    // A-C directo cuesta 5; A-B-C cuesta 2. Cubre la actualización de una distancia ya conocida
    const r = buscarRutaMasCorta(NODOS, ARISTAS, 'A', 'D');
    expect(ids(r)).toEqual(['A', 'B', 'C', 'D']);
    expect(r?.distance).toBe(3);
  });

  it('CR-05: no reemplaza una distancia ya mejor (tentativa >= actual)', () => {
    const aristas = [...ARISTAS, arista('A', 'D', 2)]; // A-D directo = 2 gana a A-B-C-D = 3
    const r = buscarRutaMasCorta(NODOS, aristas, 'A', 'D');
    expect(ids(r)).toEqual(['A', 'D']);
    expect(r?.distance).toBe(2);
  });

  it('CR-06: el recorrido es simétrico (el camino inverso mide lo mismo)', () => {
    const ida = buscarRutaMasCorta(NODOS, ARISTAS, 'A', 'D');
    const vuelta = buscarRutaMasCorta(NODOS, ARISTAS, 'D', 'A');
    expect(vuelta?.distance).toBe(ida?.distance);
    expect(ids(vuelta)).toEqual(['D', 'C', 'B', 'A']);
  });

  it('CR-07: destino en otro componente -> null (el ciclo termina por distancia infinita)', () => {
    expect(buscarRutaMasCorta(NODOS, ARISTAS, 'A', 'X')).toBe(null);
  });

  it('CR-08: nodo aislado sin aristas -> null', () => {
    expect(buscarRutaMasCorta(NODOS, ARISTAS, 'A', 'E')).toBe(null);
  });

  it('CR-09: el origen no existe en la lista de nodos -> null (ningún nodo es alcanzable)', () => {
    expect(buscarRutaMasCorta(NODOS, ARISTAS, 'NO-EXISTE', 'D')).toBe(null);
  });

  it('CR-10: el destino no existe en la lista de nodos -> null (se agota la lista de pendientes)', () => {
    expect(buscarRutaMasCorta(NODOS, ARISTAS, 'A', 'NO-EXISTE')).toBe(null);
  });

  it('CR-11: origen = destino pero fuera de la lista de nodos -> null (ruta reconstruida vacía)', () => {
    expect(buscarRutaMasCorta(NODOS, ARISTAS, 'FANTASMA', 'FANTASMA')).toBe(null);
  });
  it('CR-12: el origen existe pero no tiene aristas -> null (rama "sin vecinos" de la adyacencia)', () => {
    expect(buscarRutaMasCorta(NODOS, ARISTAS, 'E', 'A')).toBe(null);
  });
});

describe('buscarRutaMasCorta: valores límite y excepciones', () => {
  it('aristas de distancia 0: la ruta existe y mide 0', () => {
    const r = buscarRutaMasCorta([nodo('A'), nodo('B')], [arista('A', 'B', 0)], 'A', 'B');
    expect(ids(r)).toEqual(['A', 'B']);
    expect(r?.distance).toBe(0);
  });

  it('una arista que apunta a un nodo inexistente se ignora y no lanza excepción', () => {
    const aristas = [arista('A', 'B', 1), arista('A', 'FANTASMA', 1)];
    const r = buscarRutaMasCorta([nodo('A'), nodo('B')], aristas, 'A', 'B');
    expect(ids(r)).toEqual(['A', 'B']);
  });

  it('con aristas duplicadas toma la más corta', () => {
    const aristas = [arista('A', 'B', 9), arista('A', 'B', 2)];
    expect(buscarRutaMasCorta([nodo('A'), nodo('B')], aristas, 'A', 'B')?.distance).toBe(2);
  });

  it('ninguna combinación de entradas vacías lanza excepción', () => {
    expect(() => buscarRutaMasCorta([], [], '', '')).not.toThrow();
    expect(() => buscarRutaMasCorta(NODOS, [], 'A', 'B')).not.toThrow();
  });

  it('conserva el objeto original del nodo (no lo copia), para poder leer coords y nombre', () => {
    const conDatos = [{ id: 'A', name: 'Entrada' }, { id: 'B', name: 'Biblioteca' }];
    const r = buscarRutaMasCorta(conDatos, [arista('A', 'B', 3)], 'A', 'B');
    expect(r?.nodes[1]).toBe(conDatos[1]);
  });
});

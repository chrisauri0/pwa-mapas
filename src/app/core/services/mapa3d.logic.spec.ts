import { describe, expect, it } from 'vitest';
import {
  type EdificioEntrada,
  type Posicion,
  ALTURA_PISO_M,
  ALTURA_PREDETERMINADA_M,
  alturaEdificio,
  areaM2,
  caminosGeoJSON,
  cambioSuficiente,
  centroDeContorno,
  centroDeEdificios,
  construirAreas,
  construirEdificios,
  construirEtiquetas,
  destinoTieneEtiqueta,
  estadoEtiqueta,
  limitesDePuntos,
  rumboDeseado,
  rutaGeoJSON,
  rutasGeoJSON,
  siguienteModo,
} from './mapa3d.logic';
import {
  CAMPUS_AREAS,
  CAMPUS_EDIFICIOS,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_EDIFICIO,
  NODO_DE_AREA,
  NODO_DE_EDIFICIO,
} from '../../src/hooks/graphs/campus-edificios';
import { CAMPUS_NODES } from '../../src/hooks/graphs/graph-campus';

const cerca = (valor: number, esperado: number, tolerancia: number): boolean =>
  Math.abs(valor - esperado) <= tolerancia;

// Rectángulo de ~40 m de ancho por ~30 m de alto cerca del campus (lat 20.655)
function rectangulo(lng: number, lat: number, anchoM: number, altoM: number): Posicion[] {
  const dLat = altoM / 111_320;
  const dLng = anchoM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng, lat],
    [lng + dLng, lat],
    [lng + dLng, lat + dLat],
    [lng, lat + dLat],
    [lng, lat],
  ];
}

const GRANDE: EdificioEntrada = {
  id: 'g',
  nombre: 'Grande',
  contorno: rectangulo(-100.405, 20.655, 40, 30), // 1200 m²
};
const CHICO: EdificioEntrada = {
  id: 'c',
  nombre: 'Chico',
  contorno: rectangulo(-100.404, 20.655, 10, 10), // 100 m²
};

describe('areaM2', () => {
  it('un rectángulo de 40 × 30 m mide unos 1200 m²', () => {
    expect(cerca(areaM2(GRANDE.contorno), 1200, 15)).toBe(true);
  });

  it('un contorno con menos de 4 puntos mide 0', () => {
    expect(areaM2([])).toBe(0);
    expect(
      areaM2([
        [0, 0],
        [1, 1],
        [0, 0],
      ]),
    ).toBe(0);
  });
});

describe('alturaEdificio', () => {
  it('sin datos: 7 m si es grande y 3.5 m si es chico', () => {
    expect(alturaEdificio(GRANDE)).toBe(ALTURA_PREDETERMINADA_M);
    expect(alturaEdificio(CHICO)).toBe(ALTURA_PISO_M);
  });

  it('si OpenStreetMap trae los pisos: pisos × 3.5 m', () => {
    expect(alturaEdificio({ ...GRANDE, niveles: 3 })).toBe(10.5);
  });

  it('la altura fijada a mano gana sobre todo lo demás', () => {
    expect(alturaEdificio({ ...GRANDE, niveles: 3 }, { g: 12 })).toBe(12);
  });

  it('una altura fijada inválida (0, negativa, NaN) se ignora', () => {
    expect(alturaEdificio(GRANDE, { g: 0 })).toBe(ALTURA_PREDETERMINADA_M);
    expect(alturaEdificio(GRANDE, { g: -5 })).toBe(ALTURA_PREDETERMINADA_M);
    expect(alturaEdificio(GRANDE, { g: NaN })).toBe(ALTURA_PREDETERMINADA_M);
  });
});

describe('construirEdificios', () => {
  const fc = construirEdificios([GRANDE, { ...CHICO, uso: 'servicio' }], { g: 'entrada-g' });

  it('crea una Feature por edificio con el polígono cerrado', () => {
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe('Polygon');
    expect(fc.features[0].geometry.coordinates[0]).toHaveLength(5);
  });

  it('enlaza el nodo del grafo y deja null si no hay', () => {
    expect(fc.features[0].properties.nodoId).toBe('entrada-g');
    expect(fc.features[1].properties.nodoId).toBe(null);
  });

  it('marca el uso y la altura', () => {
    expect(fc.features[0].properties.uso).toBe('aula');
    expect(fc.features[1].properties.uso).toBe('servicio');
    expect(fc.features[0].properties.altura).toBe(ALTURA_PREDETERMINADA_M);
    expect(fc.features[1].properties.altura).toBe(ALTURA_PISO_M);
  });
});

describe('construirAreas', () => {
  const fc = construirAreas(
    [
      { id: 'p', nombre: 'Pista', tipo: 'pista', contorno: GRANDE.contorno },
      { id: 'b', nombre: 'Básquet', tipo: 'basquet', contorno: CHICO.contorno },
    ],
    { p: 'entrada-p' },
  );

  it('crea un polígono plano por área con su tipo', () => {
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe('Polygon');
    expect(fc.features[0].properties.tipo).toBe('pista');
    expect(fc.features[1].properties.tipo).toBe('basquet');
  });

  it('enlaza el nodo y deja null si no hay', () => {
    expect(fc.features[0].properties.nodoId).toBe('entrada-p');
    expect(fc.features[1].properties.nodoId).toBe(null);
  });

  it('no lleva altura (es plano)', () => {
    expect('altura' in fc.features[0].properties).toBe(false);
  });
});

describe('rutaGeoJSON y caminosGeoJSON', () => {
  it('la ruta usa el orden [lng, lat] de GeoJSON', () => {
    const fc = rutaGeoJSON([
      { lat: 20.655, lng: -100.405 },
      { lat: 20.656, lng: -100.404 },
    ]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates[0]).toEqual([-100.405, 20.655]);
    expect(fc.features[0].geometry.coordinates[1]).toEqual([-100.404, 20.656]);
  });

  it('con menos de 2 puntos la ruta queda vacía', () => {
    expect(rutaGeoJSON([]).features).toHaveLength(0);
    expect(rutaGeoJSON([{ lat: 1, lng: 1 }]).features).toHaveLength(0);
  });

  it('rutasGeoJSON: una línea por ruta y omite las que no tienen al menos 2 puntos', () => {
    const a = [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ];
    const fc = rutasGeoJSON([a, [{ lat: 9, lng: 9 }], a]);
    expect(fc.features).toHaveLength(2);
    expect(rutasGeoJSON([]).features).toHaveLength(0);
  });

  it('caminos: una línea por arista y omite las que apuntan a un nodo inexistente', () => {
    const nodos = [
      { id: 'a', lat: 1, lng: 2 },
      { id: 'b', lat: 3, lng: 4 },
    ];
    const fc = caminosGeoJSON(nodos, [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'fantasma' },
    ]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates).toEqual([
      [2, 1],
      [4, 3],
    ]);
  });
});

describe('límites y centro', () => {
  it('limitesDePuntos devuelve [[oeste, sur], [este, norte]]', () => {
    const lim = limitesDePuntos([
      { lat: 20.6, lng: -100.5 },
      { lat: 20.7, lng: -100.3 },
      { lat: 20.65, lng: -100.4 },
    ]);
    expect(lim).toEqual([
      [-100.5, 20.6],
      [-100.3, 20.7],
    ]);
  });

  it('sin puntos no hay límites ni centro', () => {
    expect(limitesDePuntos([])).toBe(null);
    expect(centroDeEdificios([])).toBe(null);
  });

  it('el centro de los edificios queda dentro de sus límites', () => {
    const c = centroDeEdificios([GRANDE, CHICO]);
    expect(c).not.toBe(null);
    expect(c![0] > -100.405 && c![0] < -100.4039).toBe(true);
    expect(c![1] > 20.655 && c![1] < 20.6553).toBe(true);
  });
});

describe('etiquetas de los edificios', () => {
  const etiquetas = construirEtiquetas(
    [GRANDE, CHICO],
    { g: 'entrada-g' },
    { g: 'Grande corto' },
  );

  it('el centro de un contorno cerrado no cuenta dos veces el punto de cierre', () => {
    const c = centroDeContorno([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ]);
    expect(c).toEqual([1, 1]);
  });

  it('un contorno vacío da [0, 0] y no truena', () => {
    expect(centroDeContorno([])).toEqual([0, 0]);
  });

  it('usa el texto corto si existe y el nombre completo si no', () => {
    expect(etiquetas[0].texto).toBe('Grande corto');
    expect(etiquetas[1].texto).toBe('Chico');
  });

  it('enlaza el nodo y la posición queda dentro del edificio', () => {
    expect(etiquetas[0].nodoId).toBe('entrada-g');
    expect(etiquetas[1].nodoId).toBe(null);
    expect(etiquetas[0].lng > -100.405 && etiquetas[0].lng < -100.4046).toBe(true);
  });

  it('sin destino elegido todas se ven', () => {
    expect(etiquetas.map((e) => estadoEtiqueta(e, ''))).toEqual(['normal', 'normal']);
  });

  it('con destino elegido solo se ve esa y las demás se ocultan', () => {
    expect(estadoEtiqueta(etiquetas[0], 'entrada-g')).toBe('destino');
    expect(estadoEtiqueta(etiquetas[1], 'entrada-g')).toBe('oculta');
  });

  it('al quitar el destino vuelven a verse todas', () => {
    const con = etiquetas.map((e) => estadoEtiqueta(e, 'entrada-g'));
    const sin = etiquetas.map((e) => estadoEtiqueta(e, ''));
    expect(con).toEqual(['destino', 'oculta']);
    expect(sin).toEqual(['normal', 'normal']);
  });

  it('destinoTieneEtiqueta: solo si el destino es un edificio con etiqueta', () => {
    expect(destinoTieneEtiqueta(etiquetas, 'entrada-g')).toBe(true);
    expect(destinoTieneEtiqueta(etiquetas, 'entrada-oxxo')).toBe(false);
    expect(destinoTieneEtiqueta(etiquetas, '')).toBe(false);
  });
});

describe('rumbo de la cámara', () => {
  it('norte siempre es 0', () => {
    expect(rumboDeseado('norte', 123, 45)).toBe(0);
  });

  it('brújula sigue al teléfono y sin lectura vuelve a norte arriba', () => {
    expect(rumboDeseado('brujula', 123, 45)).toBe(123);
    expect(rumboDeseado('brujula', null, 45)).toBe(0);
  });

  it('ruta sigue al siguiente punto y sin dato no gira (null)', () => {
    expect(rumboDeseado('ruta', 123, 45)).toBe(45);
    expect(rumboDeseado('ruta', 123, null)).toBe(null);
  });

  it('siguienteModo recorre brújula → ruta → norte → brújula', () => {
    expect(siguienteModo('brujula')).toBe('ruta');
    expect(siguienteModo('ruta')).toBe('norte');
    expect(siguienteModo('norte')).toBe('brujula');
  });

  it('cambioSuficiente respeta la zona muerta y el salto 359° → 0°', () => {
    expect(cambioSuficiente(10, 13, 5)).toBe(false);
    expect(cambioSuficiente(10, 16, 5)).toBe(true);
    expect(cambioSuficiente(358, 2, 5)).toBe(false); // solo 4° por el camino corto
    expect(cambioSuficiente(358, 10, 5)).toBe(true); // 12°
  });
});

describe('datos reales del campus', () => {
  it('hay 26 edificios (25 de OpenStreetMap y el OXXO dibujado a mano) y todos traen un contorno cerrado', () => {
    expect(CAMPUS_EDIFICIOS).toHaveLength(26);
    for (const e of CAMPUS_EDIFICIOS) {
      expect(e.contorno.length >= 4).toBe(true);
      expect(e.contorno[0]).toEqual(e.contorno[e.contorno.length - 1]);
    }
  });

  it('cada edificio tiene su renglón en NODO_DE_EDIFICIO', () => {
    for (const e of CAMPUS_EDIFICIOS) expect(e.id in NODO_DE_EDIFICIO).toBe(true);
  });

  it('todo nodo enlazado existe en el grafo (sin ids mal escritos)', () => {
    const ids = new Set(CAMPUS_NODES.map((n) => n.id));
    for (const [edificio, nodo] of Object.entries(NODO_DE_EDIFICIO)) {
      if (nodo !== null) expect(ids.has(nodo)).toBe(true);
      expect(typeof edificio).toBe('string');
    }
  });

  it('cada texto corto es de un edificio que existe y cabe en el mapa', () => {
    const ids = new Set(CAMPUS_EDIFICIOS.map((e) => e.id));
    for (const [id, texto] of Object.entries(ETIQUETA_DE_EDIFICIO)) {
      expect(ids.has(id)).toBe(true);
      expect(texto.length > 0 && texto.length <= 24).toBe(true);
    }
  });

  it('hay 4 áreas con contorno cerrado y cada una tiene su renglón de nodo', () => {
    expect(CAMPUS_AREAS).toHaveLength(4);
    for (const a of CAMPUS_AREAS) {
      expect(a.contorno[0]).toEqual(a.contorno[a.contorno.length - 1]);
      expect(a.id in NODO_DE_AREA).toBe(true);
    }
  });

  it('los nodos de las áreas existen en el grafo y no chocan con los de los edificios', () => {
    const ids = new Set(CAMPUS_NODES.map((n) => n.id));
    const deEdificios = new Set(Object.values(NODO_DE_EDIFICIO));
    for (const nodo of Object.values(NODO_DE_AREA)) {
      if (nodo === null) continue;
      expect(ids.has(nodo)).toBe(true);
      expect(deEdificios.has(nodo)).toBe(false);
    }
  });

  it('los nombres de las áreas son de áreas que existen', () => {
    const ids = new Set(CAMPUS_AREAS.map((a) => a.id));
    for (const id of Object.keys(ETIQUETA_DE_AREA)) expect(ids.has(id)).toBe(true);
  });

  it('ningún nodo queda enlazado a dos edificios distintos', () => {
    const usados = Object.values(NODO_DE_EDIFICIO).filter((n): n is string => n !== null);
    expect(new Set(usados).size).toBe(usados.length);
  });
});

import { describe, expect, it } from 'vitest';
import { ICONOS, type NombreIcono, svgIcono } from './iconos.data';

const nombres = Object.keys(ICONOS) as NombreIcono[];

describe('ICONOS', () => {
  it('cada icono trae un viewBox de 4 números y un trazo', () => {
    for (const n of nombres) {
      const caja = ICONOS[n].caja.split(' ').map(Number);
      expect(caja).toHaveLength(4);
      expect(caja.every((v) => Number.isFinite(v))).toBe(true);
      expect(ICONOS[n].d.startsWith('M')).toBe(true);
    }
  });

  it('el trazo solo usa caracteres de un path SVG (nada que se pueda inyectar)', () => {
    for (const n of nombres) expect(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(ICONOS[n].d)).toBe(true);
  });
});

describe('svgIcono', () => {
  it('arma un SVG decorativo con el tamaño pedido', () => {
    const s = svgIcono('ubicacion', '16px');
    expect(s).toContain('<svg');
    expect(s).toContain('width="16px"');
    expect(s).toContain('aria-hidden="true"');
    expect(s).toContain(ICONOS.ubicacion.d);
  });

  it('por defecto mide 1em (toma el tamaño del texto)', () => {
    expect(svgIcono('lista')).toContain('width="1em"');
  });
});

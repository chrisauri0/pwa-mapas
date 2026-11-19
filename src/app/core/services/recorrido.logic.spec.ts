import { describe, expect, it } from 'vitest';
import {
  type Punto,
  diferenciaAngular,
  distanciaM,
  largoRuta,
  minutosEstimados,
  normalizarGrados,
  progresoEnRuta,
  rumboDesdeAlpha,
  rumboHacia,
  suavizarRumbo,
  textoCardinal,
} from './recorrido.logic';

// 0.0009° de latitud ≈ 100 m. Ruta en "L": 100 m al norte y luego 100 m al este.
const A: Punto = { lat: 20.656, lng: -100.405 };
const B: Punto = { lat: 20.6569, lng: -100.405 };
const C: Punto = { lat: 20.6569, lng: -100.4041 };
const RUTA = [A, B, C];

const cerca = (valor: number, esperado: number, tolerancia: number): boolean =>
  Math.abs(valor - esperado) <= tolerancia;

describe('distanciaM y largoRuta', () => {
  it('0.0009° de latitud son unos 100 m', () => {
    expect(cerca(distanciaM(A, B), 100, 1)).toBe(true);
  });

  it('largo de la ruta en L es la suma de sus dos tramos', () => {
    expect(cerca(largoRuta(RUTA), distanciaM(A, B) + distanciaM(B, C), 0.001)).toBe(true);
  });

  it('una ruta de un solo punto mide 0', () => {
    expect(largoRuta([A])).toBe(0);
  });
});

describe('ángulos y rumbo', () => {
  it('normalizarGrados lleva negativos y mayores de 360 al rango [0, 360)', () => {
    expect(normalizarGrados(-90)).toBe(270);
    expect(normalizarGrados(450)).toBe(90);
    expect(normalizarGrados(360)).toBe(0);
  });

  it('diferenciaAngular toma el camino corto y conserva el signo', () => {
    expect(diferenciaAngular(350, 10)).toBe(20);
    expect(diferenciaAngular(10, 350)).toBe(-20);
    expect(diferenciaAngular(0, 90)).toBe(90);
  });

  it('rumboHacia: norte = 0°, este = 90°, sur = 180°, oeste = 270°', () => {
    expect(cerca(rumboHacia(A, B), 0, 0.01)).toBe(true);
    expect(cerca(rumboHacia(B, C), 90, 0.5)).toBe(true);
    expect(cerca(rumboHacia(B, A), 180, 0.01)).toBe(true);
    expect(cerca(rumboHacia(C, B), 270, 0.5)).toBe(true);
  });

  it('rumboDesdeAlpha: alpha 0 es norte, alpha 90 (giro antihorario) apunta al oeste', () => {
    expect(rumboDesdeAlpha(0)).toBe(0);
    expect(rumboDesdeAlpha(90)).toBe(270);
    expect(rumboDesdeAlpha(270)).toBe(90);
  });

  it('rumboDesdeAlpha suma la rotación de la pantalla', () => {
    expect(rumboDesdeAlpha(0, 90)).toBe(90);
  });

  it('textoCardinal redondea al punto más cercano', () => {
    expect(textoCardinal(0)).toBe('N');
    expect(textoCardinal(359)).toBe('N');
    expect(textoCardinal(44)).toBe('NE');
    expect(textoCardinal(270)).toBe('O');
    expect(textoCardinal(200)).toBe('S');
  });
});

describe('suavizarRumbo', () => {
  it('sin lectura previa toma el valor tal cual', () => {
    expect(suavizarRumbo(null, 123)).toBe(123);
  });

  it('se acerca al nuevo valor sin saltar de golpe', () => {
    const r = suavizarRumbo(0, 100, 0.25);
    expect(cerca(r, 25, 0.001)).toBe(true);
  });

  it('cruza el norte por el camino corto (350° hacia 10° no pasa por 180°)', () => {
    const r = suavizarRumbo(350, 10, 0.5);
    expect(r).toBe(0);
  });

  it('con factor 1 no suaviza', () => {
    expect(suavizarRumbo(10, 200, 1)).toBe(200);
  });
});

describe('minutosEstimados', () => {
  it('0 m son 0 minutos', () => {
    expect(minutosEstimados(0)).toBe(0);
  });

  it('una distancia muy corta cuenta como 1 minuto', () => {
    expect(minutosEstimados(20)).toBe(1);
  });

  it('300 m a 1.3 m/s son unos 4 minutos', () => {
    expect(minutosEstimados(300)).toBe(4);
  });
});

describe('progresoEnRuta', () => {
  it('con menos de 2 puntos no hay ruta', () => {
    expect(progresoEnRuta([A], A)).toBe(null);
    expect(progresoEnRuta([], A)).toBe(null);
  });

  it('parado en el inicio: falta toda la ruta y no hay avance', () => {
    const p = progresoEnRuta(RUTA, A);
    expect(p).not.toBe(null);
    expect(cerca(p!.distanciaRestanteM, largoRuta(RUTA), 0.5)).toBe(true);
    expect(cerca(p!.distanciaRecorridaM, 0, 0.5)).toBe(true);
    expect(p!.tramo).toBe(0);
    expect(cerca(p!.fraccion, 0, 0.01)).toBe(true);
  });

  it('a la mitad del primer tramo: la línea restante empieza en tu posición y se acorta', () => {
    const mitad: Punto = { lat: 20.65645, lng: -100.405 };
    const p = progresoEnRuta(RUTA, mitad)!;
    expect(p.restante).toHaveLength(3); // punto proyectado, B y C
    expect(cerca(p.restante[0].lat, mitad.lat, 1e-7)).toBe(true);
    expect(cerca(p.distanciaRestanteM, largoRuta(RUTA) - 50, 1)).toBe(true);
    expect(cerca(p.desvioM, 0, 0.5)).toBe(true);
  });

  it('pasando el primer nodo: el tramo 0 ya no aparece en lo que falta', () => {
    const enSegundoTramo: Punto = { lat: 20.6569, lng: -100.40445 };
    const p = progresoEnRuta(RUTA, enSegundoTramo)!;
    expect(p.tramo).toBe(1);
    expect(p.restante).toHaveLength(2); // proyectado y C
    expect(cerca(p.distanciaRestanteM, distanciaM(enSegundoTramo, C), 1)).toBe(true);
  });

  it('en el destino: no falta nada y la fracción es 1', () => {
    const p = progresoEnRuta(RUTA, C)!;
    expect(cerca(p.distanciaRestanteM, 0, 0.5)).toBe(true);
    expect(cerca(p.fraccion, 1, 0.01)).toBe(true);
  });

  it('mide el desvío cuando estás fuera de la ruta (unos 47 m al oeste del primer tramo)', () => {
    const fuera: Punto = { lat: 20.65645, lng: -100.40545 };
    const p = progresoEnRuta(RUTA, fuera)!;
    expect(cerca(p.desvioM, 47, 2)).toBe(true);
  });

  it('antes del inicio se pega al primer punto (la proyección se limita al segmento)', () => {
    const antes: Punto = { lat: 20.6559, lng: -100.405 };
    const p = progresoEnRuta(RUTA, antes)!;
    expect(p.tramo).toBe(0);
    expect(cerca(p.restante[0].lat, A.lat, 1e-7)).toBe(true);
    expect(cerca(p.desvioM, 11, 1.5)).toBe(true);
  });

  it('desdeTramo impide retroceder a un tramo anterior', () => {
    // Estás cerca del tramo 0, pero ya habías pasado al tramo 1
    const cercaDelInicio: Punto = { lat: 20.65605, lng: -100.405 };
    expect(progresoEnRuta(RUTA, cercaDelInicio, 0)!.tramo).toBe(0);
    expect(progresoEnRuta(RUTA, cercaDelInicio, 1)!.tramo).toBe(1);
  });

  it('desdeTramo fuera de rango se limita al último tramo', () => {
    expect(progresoEnRuta(RUTA, A, 99)!.tramo).toBe(1);
  });

  it('tramo de largo cero no produce NaN', () => {
    const p = progresoEnRuta([A, A, B], A)!;
    expect(Number.isNaN(p.distanciaRestanteM)).toBe(false);
    expect(Number.isNaN(p.fraccion)).toBe(false);
  });

  it('una ruta con todos los puntos iguales termina con fracción 1', () => {
    const p = progresoEnRuta([A, A], A)!;
    expect(p.fraccion).toBe(1);
  });
});

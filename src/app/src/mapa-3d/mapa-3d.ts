import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import type { GeoJSONSource, Map as MapaMl, Marker } from 'maplibre-gl';
import {
  cambioSuficiente,
  caminosGeoJSON,
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
} from '../../core/services/mapa3d.logic';
import { Punto } from '../../core/services/recorrido.logic';
import {
  ALTURA_DE_EDIFICIO,
  CAMPUS_AREAS,
  CAMPUS_EDIFICIOS,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_EDIFICIO,
  NODO_DE_AREA,
  NODO_DE_EDIFICIO,
} from '../hooks/graphs/campus-edificios';
import { CAMPUS_EDGES, CAMPUS_NODES } from '../hooks/graphs/graph-campus';

type MapLibre = typeof import('maplibre-gl');

let workerListo = false;

const PITCH_RECORRIDO = 60; // cámara inclinada al caminar
const PITCH_VISTA = 50; // cámara inclinada al explorar
const ZOOM_INICIAL = 17.2;
const ZOOM_RECORRIDO = 18.5;
const ZONA_MUERTA_GRADOS = 4; // la brújula tiembla; menos de esto no gira el mapa
const DURACION_SEGUIR_MS = 800;
const DURACION_GIRO_MS = 400;
const ZOOM_ETIQUETAS = 16.6; // más lejos que esto los nombres estorban y se ocultan
const ESPERA_CARGA_MS = 10_000; // si en este tiempo no se dibuja nada, se avisa en pantalla
const COLOR_AULA = '#d9c9a8';
const COLOR_SERVICIO = '#d4d9df';
const COLOR_DESTINO = '#ef4444';
const COLOR_AREA_DESTINO = '#f87171';
// Las áreas que llevan nombre en el mapa (la cancha grande no, para no tapar el de la pista)
const AREAS_CON_NOMBRE = CAMPUS_AREAS.filter((a) => a.id in ETIQUETA_DE_AREA);

// Sin mapa de fondo: el "suelo" es un color plano y todo lo demás sale de nuestros propios datos.
// Así no hace falta internet ni descargar tiles, y tampoco fuentes (por eso no hay etiquetas de texto en el mapa).
const ESTILO_VACIO = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#eef3ea' } }],
};

const geo = (datos: unknown): never => datos as never;

function colorAreas(destinoId: string): unknown {
  return [
    'case',
    ['==', ['get', 'nodoId'], destinoId],
    COLOR_AREA_DESTINO,
    ['match', ['get', 'tipo'], 'pista', '#e0a58c', 'basquet', '#e9c98a', '#a8d8a0'],
  ];
}

function colorEdificios(destinoId: string): unknown {
  return [
    'case',
    ['==', ['get', 'nodoId'], destinoId],
    COLOR_DESTINO,
    ['==', ['get', 'uso'], 'servicio'],
    COLOR_SERVICIO,
    COLOR_AULA,
  ];
}

/**
 * Vista 3D del campus (MapLibre GL): edificios como cajas, tu ruta y tu posición con la cámara inclinada.
 * Es solo de presentación: el mapa de arriba (MapComponent) le pasa la posición, el rumbo y la ruta.
 */
@Component({
  selector: 'app-mapa-3d',
  templateUrl: './mapa-3d.html',
  styleUrl: './mapa-3d.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class Mapa3dComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');

  readonly posicion = input<Punto | null>(null);
  /** Hacia dónde apunta el teléfono (brújula). */
  readonly rumbo = input<number | null>(null);
  readonly rutaCompleta = input<Punto[]>([]);
  readonly rutaRestante = input<Punto[]>([]);
  /** Rutas que no se eligieron: se ven en gris para compararlas. */
  readonly rutasAlternativas = input<Punto[][]>([]);
  readonly destinoId = input('');
  readonly destinoNombre = input('');
  readonly navegando = input(false);
  readonly siguiendo = input(true);

  /** Tocaron un edificio que tiene entrada en el grafo; trae el id del nodo. */
  readonly edificioTocado = output<string>();
  /** El usuario arrastró el mapa con el dedo. */
  readonly mapaMovido = output<void>();
  /** El 3D no pudo dibujarse (sin WebGL, worker bloqueado...): la app vuelve al mapa plano. */
  readonly fallo = output<string>();

  private readonly listo = signal(false);
  /** Para que se vea en pantalla (y no solo en la consola) si el 3D cargó o falló. */
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly detalle = signal('');
  private temporizadorCarga?: ReturnType<typeof setTimeout>;
  private mapa?: MapaMl;
  private ml?: MapLibre;
  private destruido = false;
  private resizeObserver?: ResizeObserver;
  private marcadorGps?: Marker;
  private conoGps?: HTMLElement;
  private marcadorDestino?: Marker;
  private etiquetaDestino?: HTMLElement;
  private readonly etiquetas = construirEtiquetas(
    [...CAMPUS_EDIFICIOS, ...AREAS_CON_NOMBRE],
    { ...NODO_DE_EDIFICIO, ...NODO_DE_AREA },
    { ...ETIQUETA_DE_EDIFICIO, ...ETIQUETA_DE_AREA },
  );
  private readonly elementosEtiqueta = new Map<string, HTMLButtonElement>();
  private marcadoresEtiqueta: Marker[] = [];

  constructor() {
    // Ruta que falta por recorrer (se acorta al caminar)
    effect(() => {
      const puntos = this.rutaRestante();
      if (!this.listo()) return;
      this.poner('ruta', rutaGeoJSON(puntos));
    });

    effect(() => {
      const rutas = this.rutasAlternativas();
      if (!this.listo()) return;
      this.poner('ruta-alt', rutasGeoJSON(rutas));
    });

    // El edificio destino se pinta de rojo
    effect(() => {
      const destino = this.destinoId();
      if (!this.listo()) return;
      this.mapa?.setPaintProperty('edificios', 'fill-extrusion-color', colorEdificios(destino) as never);
      for (const capa of ['areas-pista', 'areas-campos']) {
        this.mapa?.setPaintProperty(capa, 'fill-color', colorAreas(destino) as never);
      }
    });

    effect(() => {
      if (!this.listo()) return;
      this.actualizarGps();
    });

    effect(() => {
      if (!this.listo()) return;
      this.actualizarDestino();
    });

    // Nombres de los edificios: todos a la vista, o solo el elegido
    effect(() => {
      if (!this.listo()) return;
      this.actualizarEtiquetas();
    });

    // Cámara: seguirte al caminar, o girar con el teléfono al explorar
    effect(() => {
      if (!this.listo()) return;
      this.moverCamara();
    });

    // Al trazar una ruta nueva (sin estar caminando) se encuadra completa
    effect(() => {
      const ruta = this.rutaCompleta();
      if (!this.listo()) return;
      untracked(() => this.encuadrarRuta(ruta));
    });
  }

  ngAfterViewInit(): void {
    this.iniciarMapa().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('🔴 3D: no se pudo cargar MapLibre:', msg);
      this.estado.set('error');
      this.detalle.set(msg.slice(0, 140));
      this.fallo.emit(msg.slice(0, 140));
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.temporizadorCarga) clearTimeout(this.temporizadorCarga);
    this.resizeObserver?.disconnect();
    this.marcadorGps?.remove();
    this.marcadorDestino?.remove();
    this.marcadoresEtiqueta.forEach((m) => m.remove());
    this.mapa?.remove();
    this.mapa = undefined;
  }

  // ── Creación del mapa ─────────────────────────────────────

  private async iniciarMapa(): Promise<void> {
    // maplibre-gl pesa bastante: se baja solo cuando alguien abre la vista 3D
    const modulo = await import('maplibre-gl');
    if (this.destruido) return;

    const ml: MapLibre = (modulo as unknown as { default?: MapLibre }).default ?? modulo;
    this.ml = ml;

    // Desde MapLibre 6 el worker es un archivo aparte y los bundlers no lo encuentran solos:
    // angular.json lo copia a /maplibre-gl/ y aquí le decimos dónde está. Va una sola vez.
    if (!workerListo) {
      const url = new URL(`maplibre-gl/maplibre-gl-worker.mjs?v=${ml.getVersion()}`, document.baseURI);
      ml.setWorkerUrl(url.toString());
      workerListo = true;
    }
    console.log('🔵 3D: MapLibre cargado, creando el mapa...');

    const centro = centroDeEdificios(CAMPUS_EDIFICIOS) ?? [-100.405, 20.655];
    const contenedor = this.contenedor().nativeElement;

    this.zone.runOutsideAngular(() => {
      const mapa = new ml.Map({
        container: contenedor,
        style: ESTILO_VACIO as never,
        center: centro,
        zoom: ZOOM_INICIAL,
        pitch: PITCH_VISTA,
        bearing: 0,
        minZoom: 15,
        maxZoom: 21,
        maxPitch: 70,
        // El giro lo controla la brújula; el usuario solo arrastra y hace zoom
        dragRotate: false,
        touchPitch: false,
        attributionControl: { compact: true, customAttribution: '© colaboradores de OpenStreetMap' },
      });
      mapa.touchZoomRotate.disableRotation();
      this.mapa = mapa;

      mapa.on('load', () => this.alCargar(mapa));
      // Cualquier error de estilo, fuente o worker llega aquí; sin esto MapLibre falla en silencio
      mapa.on('error', (e) => {
        const msg = e.error?.message ?? String(e);
        console.error('🔴 3D (MapLibre):', msg);
        this.zone.run(() => {
          // Solo se avisa en pantalla; si de verdad no dibuja nada, el temporizador de abajo manda `fallo`
          this.estado.set('error');
          this.detalle.set(msg.slice(0, 140));
        });
      });
      mapa.on('dragstart', () => this.zone.run(() => this.mapaMovido.emit()));
    });

    this.resizeObserver = new ResizeObserver(() => this.mapa?.resize());
    this.resizeObserver.observe(contenedor);

    this.temporizadorCarga = setTimeout(() => {
      if (this.estado() === 'listo') return;
      console.warn('🟡 3D: pasaron', ESPERA_CARGA_MS / 1000, 's y no se dibujó nada. ¿Worker bloqueado por la CSP?');
      this.estado.set('error');
      this.detalle.set('Tardó demasiado en dibujar. Revisa la consola del navegador.');
      this.fallo.emit('Tardó demasiado en dibujar.');
    }, ESPERA_CARGA_MS);
  }

  private alCargar(mapa: MapaMl): void {
    const nodos = CAMPUS_NODES.map((n) => {
      const ll = L.latLng(n.coords);
      return { id: n.id, lat: ll.lat, lng: ll.lng };
    });

    mapa.addSource('areas', { type: 'geojson', data: geo(construirAreas(CAMPUS_AREAS, NODO_DE_AREA)) });
    mapa.addSource('caminos', { type: 'geojson', data: geo(caminosGeoJSON(nodos, CAMPUS_EDGES)) });
    mapa.addSource('edificios', {
      type: 'geojson',
      data: geo(construirEdificios(CAMPUS_EDIFICIOS, NODO_DE_EDIFICIO, ALTURA_DE_EDIFICIO)),
    });
    mapa.addSource('ruta', { type: 'geojson', data: geo(rutaGeoJSON([])) });
    mapa.addSource('ruta-alt', { type: 'geojson', data: geo(rutaGeoJSON([])) });

    const redondo = { 'line-cap': 'round', 'line-join': 'round' };
    const esPista = ['==', ['get', 'tipo'], 'pista'];
    const capas = [
      // Primero la pista y luego las canchas encima: la cancha grande queda dentro de la pista
      { id: 'areas-pista', type: 'fill', source: 'areas', filter: esPista, paint: { 'fill-color': colorAreas('') } },
      {
        id: 'areas-campos',
        type: 'fill',
        source: 'areas',
        filter: ['!', esPista],
        paint: { 'fill-color': colorAreas('') },
      },
      {
        id: 'areas-borde',
        type: 'line',
        source: 'areas',
        paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.85 },
      },
      {
        id: 'caminos',
        type: 'line',
        source: 'caminos',
        layout: redondo,
        paint: {
          'line-color': '#c4cbd3',
          'line-width': ['interpolate', ['linear'], ['zoom'], 16, 2, 20, 6],
        },
      },
      {
        id: 'edificios',
        type: 'fill-extrusion',
        source: 'edificios',
        paint: {
          'fill-extrusion-color': colorEdificios(''),
          'fill-extrusion-height': ['get', 'altura'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.95,
        },
      },
      {
        id: 'ruta-alt',
        type: 'line',
        source: 'ruta-alt',
        layout: redondo,
        paint: {
          'line-color': '#6b7280',
          'line-width': ['interpolate', ['linear'], ['zoom'], 16, 4, 20, 9],
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
      },
      {
        id: 'ruta-borde',
        type: 'line',
        source: 'ruta',
        layout: redondo,
        paint: {
          'line-color': '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 16, 8, 20, 18],
        },
      },
      {
        id: 'ruta',
        type: 'line',
        source: 'ruta',
        layout: redondo,
        paint: {
          'line-color': '#ef4444',
          'line-width': ['interpolate', ['linear'], ['zoom'], 16, 5, 20, 12],
        },
      },
    ];
    for (const capa of capas) mapa.addLayer(capa as never);

    // Tocar un edificio o una cancha que tenga entrada en el grafo la elige como destino.
    // Se revisa todo lo que hay bajo el dedo (lo de arriba primero) y se toma el primero con nodo.
    mapa.on('click', (e) => {
      const tocados = mapa.queryRenderedFeatures(e.point, {
        layers: ['edificios', 'areas-campos', 'areas-pista'],
      });
      const nodoId = tocados
        .map((f) => f.properties?.['nodoId'])
        .find((n): n is string => typeof n === 'string' && n !== '');
      if (nodoId) this.zone.run(() => this.edificioTocado.emit(nodoId));
    });

    this.crearEtiquetas(mapa);

    // Lejos de los edificios los nombres se amontonan: se ocultan por zoom
    const ajustarZoom = (): void => {
      this.contenedor().nativeElement.classList.toggle('mapa3d--lejos', mapa.getZoom() < ZOOM_ETIQUETAS);
    };
    mapa.on('zoom', ajustarZoom);
    ajustarZoom();

    console.log('🟢 3D: capas agregadas, esperando el primer dibujo...');

    // Cuando termina de dibujar, comprobamos que de verdad haya edificios en pantalla
    mapa.once('idle', () => {
      const dibujados = mapa.queryRenderedFeatures({ layers: ['edificios'] }).length;
      console.log(`🟢 3D: ${dibujados} edificios dibujados`);
      this.zone.run(() => {
        if (dibujados > 0) {
          this.estado.set('listo');
        } else {
          this.estado.set('error');
          this.detalle.set('Cargó el mapa pero no se dibujó ningún edificio.');
          this.fallo.emit('No se dibujó ningún edificio.');
        }
      });
    });

    this.zone.run(() => this.listo.set(true));
  }

  private poner(fuente: string, datos: unknown): void {
    const origen = this.mapa?.getSource(fuente) as GeoJSONSource | undefined;
    origen?.setData(geo(datos));
  }

  // ── Nombres de los edificios ──────────────────────────────

  private crearEtiquetas(mapa: MapaMl): void {
    const ml = this.ml;
    if (!ml) return;

    for (const e of this.etiquetas) {
      // Es un <button> para que se pueda tocar el nombre igual que el edificio
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'etq3d';
      el.textContent = e.texto; // textContent, nunca innerHTML

      const nodoId = e.nodoId;
      if (nodoId) {
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.zone.run(() => this.edificioTocado.emit(nodoId));
        });
      } else {
        // Sin entrada en el grafo: solo informa, no se puede elegir
        el.disabled = true;
        el.classList.add('etq3d--sin-nodo');
      }

      this.marcadoresEtiqueta.push(new ml.Marker({ element: el }).setLngLat([e.lng, e.lat]).addTo(mapa));
      this.elementosEtiqueta.set(e.id, el);
    }
  }

  private actualizarEtiquetas(): void {
    const destino = this.destinoId();
    for (const e of this.etiquetas) {
      const el = this.elementosEtiqueta.get(e.id);
      if (!el) continue;
      const estado = estadoEtiqueta(e, destino);
      el.classList.toggle('etq3d--destino', estado === 'destino');
      el.classList.toggle('etq3d--oculta', estado === 'oculta');
    }
  }

  // ── Marcadores ────────────────────────────────────────────

  private actualizarGps(): void {
    const ml = this.ml;
    const mapa = this.mapa;
    const pos = this.posicion();
    const rumbo = this.rumbo();
    if (!ml || !mapa || !pos) return;

    if (!this.marcadorGps) {
      const el = document.createElement('div');
      el.className = 'gps3d';
      const cono = document.createElement('div');
      cono.className = 'gps3d-cono';
      const punto = document.createElement('div');
      punto.className = 'gps3d-punto';
      el.append(cono, punto);
      this.conoGps = cono;
      // Pegado al suelo y alineado con el mapa: así el cono apunta a donde mira el teléfono de verdad
      this.marcadorGps = new ml.Marker({
        element: el,
        pitchAlignment: 'map',
        rotationAlignment: 'map',
      })
        .setLngLat([pos.lng, pos.lat])
        .addTo(mapa);
    } else {
      this.marcadorGps.setLngLat([pos.lng, pos.lat]);
    }

    this.marcadorGps.setRotation(rumbo ?? 0);
    this.conoGps?.classList.toggle('gps3d-cono--oculto', rumbo === null);
  }

  private actualizarDestino(): void {
    const ml = this.ml;
    const mapa = this.mapa;
    const ruta = this.rutaCompleta();
    const nombre = this.destinoNombre();
    if (!ml || !mapa) return;

    // Si el destino es un edificio con nombre, ese nombre (en rojo) ya hace de globo del destino
    if (ruta.length === 0 || !nombre || destinoTieneEtiqueta(this.etiquetas, this.destinoId())) {
      this.marcadorDestino?.remove();
      this.marcadorDestino = undefined;
      this.etiquetaDestino = undefined;
      return;
    }

    const fin = ruta[ruta.length - 1];
    if (!this.marcadorDestino) {
      const el = document.createElement('div');
      el.className = 'dest3d';
      this.etiquetaDestino = el;
      this.marcadorDestino = new ml.Marker({ element: el, anchor: 'bottom', offset: [0, -14] })
        .setLngLat([fin.lng, fin.lat])
        .addTo(mapa);
    } else {
      this.marcadorDestino.setLngLat([fin.lng, fin.lat]);
    }
    // textContent (no innerHTML): el nombre nunca se interpreta como HTML
    if (this.etiquetaDestino) this.etiquetaDestino.textContent = nombre;
  }

  // ── Cámara ────────────────────────────────────────────────

  private moverCamara(): void {
    const mapa = this.mapa;
    if (!mapa) return;

    const pos = this.posicion();
    const caminando = this.navegando();
    const pitch = caminando ? PITCH_RECORRIDO : PITCH_VISTA;
    const actual = mapa.getBearing();
    const deseado = rumboDeseado('brujula', this.rumbo(), null);
    const bearing =
      deseado !== null && cambioSuficiente(actual, deseado, ZONA_MUERTA_GRADOS) ? deseado : actual;

    if (caminando && this.siguiendo() && pos) {
      // Tu punto queda en el tercio de abajo para ver más camino hacia adelante
      const arriba = Math.round(this.contenedor().nativeElement.clientHeight * 0.3);
      mapa.easeTo({
        center: [pos.lng, pos.lat],
        zoom: Math.max(mapa.getZoom(), ZOOM_RECORRIDO),
        pitch,
        bearing,
        padding: { top: arriba, bottom: 0, left: 0, right: 0 },
        duration: DURACION_SEGUIR_MS,
        easing: (t: number) => t,
      });
      return;
    }

    if (bearing !== actual) {
      mapa.easeTo({ bearing, pitch, duration: DURACION_GIRO_MS, easing: (t: number) => t });
    }
  }

  private encuadrarRuta(ruta: Punto[]): void {
    const mapa = this.mapa;
    const limites = limitesDePuntos(ruta);
    if (!mapa || !limites || ruta.length < 2 || this.navegando()) return;

    const deseado = rumboDeseado('brujula', this.rumbo(), null);
    mapa.fitBounds(limites, {
      padding: { top: 70, bottom: 70, left: 40, right: 40 },
      pitch: PITCH_VISTA,
      bearing: deseado ?? mapa.getBearing(),
      maxZoom: 19,
      duration: 900,
    });
  }
}

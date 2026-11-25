import { CommonModule } from '@angular/common';
import { BackButtonService } from '../../core/services/back-button.service';
import { calcularEsperaMs } from '../../core/services/reintento.logic';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  isDevMode,
  signal,
} from '@angular/core';

import * as L from 'leaflet';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import {
  aristasConDistanciaReal,
  buscarRutasAlternativas,
} from '../../core/services/ruta.alternativas.logic';
import { BrujulaService } from '../../core/services/brujula.service';
import {
  Punto,
  diferenciaAngular,
  distanciaM,
  minutosEstimados,
  progresoEnRuta,
  rumboHacia,
  textoCardinal,
} from '../../core/services/recorrido.logic';
import { CAMPUS_EDGES, CAMPUS_NODES } from '../hooks/graphs/graph-campus';
import { CampusNode } from '../hooks/models/models-graph';
import { CAMPUS_LAYERS } from '../hooks/models/models-map';
import { CampusSocketService } from '../services/campus-socket.service';
import { ArrivalCardComponent, LlegadaInfo } from '../../arrival-card/arrival-card';
import { AvisosModalComponent } from '../avisos-modal/avisos-modal';
import { Mapa3dComponent } from '../mapa-3d/mapa-3d';
import { IconoComponent } from '../../shared/icono/icono';
import { svgIcono } from '../../shared/icono/iconos.data';

import { StepCounterService } from '../../core/services/step-counter.service';
import { ArrivalNotificationService } from '../../core/services/arrival-notification.service';
import { AvisosService, infoTipo } from '../../core/services/avisos.service';
import { WidgetBridge } from '../../core/plugins/widget-bridge';

const RADIO_LLEGADA_M = 15;
const METROS_POR_PASO = 0.75;
const VELOCIDAD_CAMINATA_MS = 1.3; // ~4.7 km/h
const DURACION_DEMO_MS = 5000;
const INTERVALO_DEMO_MS = 50;
const DESVIO_AVISO_M = 40; // a partir de aquí se avisa que te saliste de la ruta
const COLOR_RUTA = '#ef4444';
const COLOR_ALTERNATIVA = '#6b7280';

interface RutaPosible {
  nodes: CampusNode[];
  distance: number;
}

// Las distancias de las aristas salen de las coordenadas de los nodos (no de los números escritos a mano
// en graph-campus.ts, que no coincidían con la realidad). Se calcula una sola vez al cargar.
const GRAFO = aristasConDistanciaReal(
  CAMPUS_NODES.map((n) => {
    const ll = L.latLng(n.coords);
    return { id: n.id, lat: ll.lat, lng: ll.lng };
  }),
  CAMPUS_EDGES,
);

@Component({
  selector: 'app-map-component',
  imports: [CommonModule, ArrivalCardComponent, AvisosModalComponent, IconoComponent, Mapa3dComponent],
  templateUrl: './map-component.html',
  styleUrl: './map-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly campusSocket = inject(CampusSocketService);
  private readonly notis = inject(ArrivalNotificationService);
  readonly steps = inject(StepCounterService);
  readonly brujula = inject(BrujulaService);
  readonly avisos = inject(AvisosService);
  private readonly back = inject(BackButtonService);
  private readonly quitarAtras = this.back.registrar(() => this.manejarAtras());

  // El botón de demo solo aparece en compilaciones de desarrollo (ng serve / build debug).
  // En el APK de producción desaparece solo.
  readonly modoDemo = isDevMode();

  map?: L.Map;
  private teselas?: L.TileLayer;
  gpsMarker?: L.CircleMarker;
  private gpsWatchId?: string;
  private gpsRetryTimer?: ReturnType<typeof setTimeout>;
  private destruido = false;
  private gpsIntentos = 0;
  private resizeObserver?: ResizeObserver;
  private nodeLayer?: L.LayerGroup;
  private edgeLayer?: L.LayerGroup;
  private avisoLayer?: L.LayerGroup;
  private routeLayer?: L.LayerGroup;
  private altLayer?: L.LayerGroup;
  /** Línea roja y su borde blanco: se acortan conforme avanzas. */
  private lineasRuta: L.Polyline[] = [];
  private tramoActual = 0;
  private selectionLayer?: L.LayerGroup;

  private navStart = 0;
  private simTimer?: ReturnType<typeof setInterval>;

  readonly debugLat = signal(0);
  readonly debugLng = signal(0);
  readonly debugAccuracy = signal(0);
  readonly callbackCount = signal(0);

  readonly nodes = signal<CampusNode[]>([...CAMPUS_NODES]);
  readonly edges = GRAFO.aristas;

  // ── Rutas alternativas ──
  /** La más corta primero y, si las hay, alternativas que van por otro lado. */
  readonly rutasPosibles = signal<RutaPosible[]>([]);
  readonly rutaElegida = signal(0);
  /** Las rutas que NO eligiste, para dibujarlas en gris en la vista 3D. */
  readonly rutasAlternativas = computed(() =>
    this.rutasPosibles()
      .filter((_, i) => i !== this.rutaElegida())
      .map((r) => r.nodes.map((n) => this.aPunto(n))),
  );
  readonly campusLayers = [...CAMPUS_LAYERS];

  readonly searchActive = signal(false);
  readonly endQuery = signal('');
  readonly selectedEndId = signal('');
  readonly nearestNodeId = signal('');

  readonly routeMessage = signal('Activa el GPS y busca tu destino.');
  readonly routeDistance = signal<number | null>(null);
  readonly activeRoute = signal<CampusNode[]>([]);

  // ── Navegación / llegada ──
  readonly navegando = signal(false);
  readonly simulando = signal(false);
  readonly pasosSimulados = signal(0);
  readonly llegada = signal<LlegadaInfo | null>(null);

  // ── Recorrido activo ──
  readonly restanteM = signal<number | null>(null);
  readonly fraccion = signal(0);
  readonly desvioM = signal(0);
  readonly rumboSiguiente = signal<number | null>(null);
  readonly siguiendo = signal(true);

  /** Hay una ruta trazada pero todavía no empieza el recorrido. */
  readonly rutaLista = computed(
    () => this.activeRoute().length > 0 && !this.navegando() && !this.llegada(),
  );
  readonly minutosTotales = computed(() => minutosEstimados(this.routeDistance() ?? 0));
  readonly minutosRestantes = computed(() => minutosEstimados(this.restanteM() ?? 0));
  readonly fueraDeRuta = computed(() => this.desvioM() > DESVIO_AVISO_M);
  readonly cardinalSiguiente = computed(() => {
    const r = this.rumboSiguiente();
    return r === null ? '' : textoCardinal(r);
  });
  /** Giro de la flecha: hacia dónde queda el siguiente punto respecto a donde apunta el teléfono. */
  readonly giroFlecha = computed(() => {
    const objetivo = this.rumboSiguiente();
    const mio = this.brujula.rumbo();
    if (objetivo === null) return null;
    return mio === null ? objetivo : diferenciaAngular(mio, objetivo);
  });

  // ── Vista 3D (MapLibre) ──
  /** El 3D es la vista principal. Solo pasa a false si el 3D no puede dibujarse (ver `alFallar3d`). */
  readonly vista3d = signal(!MapComponent.sinTresDPorPruebas());

  /**
   * Solo para pruebas E2E: el Chromium sin GPU dibuja el 3D por software y deja la página casi congelada.
   * Con la bandera E2E_SIN_3D en localStorage la app arranca directo en el mapa 2D (Leaflet).
   * En el teléfono y en producción la bandera no existe, así que no cambia nada.
   */
  private static sinTresDPorPruebas(): boolean {
    try {
      return localStorage.getItem('E2E_SIN_3D') === '1';
    } catch {
      return false;
    }
  }
  /** Posición actual (GPS real o simulada) para la vista 3D. */
  readonly posicionActual = signal<Punto | null>(null);
  readonly rutaCompleta = signal<Punto[]>([]);
  readonly rutaRestante = signal<Punto[]>([]);

  readonly pasosEnPantalla = computed(() =>
    this.simulando() ? this.pasosSimulados() : this.steps.pasos(),
  );

  readonly selectedStartNode = computed(() => this.findNodeById(this.nearestNodeId()));
  readonly selectedEndNode = computed(() => this.findNodeById(this.selectedEndId()));
  readonly filteredEndNodes = computed(() => this.filterNodes(this.endQuery()));

  // Cada vez que cambian los avisos (en tiempo real), se redibujan en el mapa
  private readonly avisosEffect = effect(() => {
    this.avisos.porEdificio();
    this.dibujarAvisos();
  });

  ngAfterViewInit(): void {
    this.configureLeafletIcons();

    this.map = L.map('campus-map', { bounceAtZoomLimits: false }).setView([20.656, -100.405], 18);

    this.map.createPane('routePane').style.zIndex = '650';

    // Si arrastras el mapa durante el recorrido, deja de seguirte hasta que pulses "Recentrar"
    this.map.on('dragstart', () => this.zone.run(() => this.siguiendo.set(false)));

    // El mapa plano ya no se ve (el 3D es el principal): sus tiles de OSM solo se piden si hace falta
    if (!this.vista3d()) this.asegurarTeselas();

    this.nodeLayer = L.layerGroup().addTo(this.map);
    this.edgeLayer = L.layerGroup().addTo(this.map);
    this.avisoLayer = L.layerGroup().addTo(this.map);
    // Las alternativas van antes que la ruta elegida para quedar debajo de ella
    this.altLayer = L.layerGroup().addTo(this.map);

    if (GRAFO.descartadas.length > 0) {
      console.warn('🟡 Aristas con un nodo que no existe (se ignoran):', GRAFO.descartadas);
    }

    // this.loadCampusLayers();
    this.loadNodes();
    // this.loadEdges();

    // Estos dos al final para quedar encima de todo
    this.selectionLayer = L.layerGroup().addTo(this.map);
    this.routeLayer = L.layerGroup().addTo(this.map);

    setTimeout(() => this.map?.invalidateSize(), 0);

    const container = document.getElementById('campus-map');
    if (container) {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(container);
    }

    void this.startGps();

    // La vista 3D gira con el teléfono: la brújula queda encendida desde el inicio
    this.brujula.iniciar();

    this.avisos.escuchar();
    this.dibujarAvisos();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.gpsRetryTimer) clearTimeout(this.gpsRetryTimer);
    this.stopSimulation();
    this.brujula.detener();
    void this.notis.cancelarRecorrido();
    if (this.steps.midiendo()) void this.steps.detener();
    if (this.gpsWatchId) void Geolocation.clearWatch({ id: this.gpsWatchId });
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.quitarAtras();
  }

  //boton atras
  // ── Botón atrás nativo ────────────────────────────────────

  /** Cierra lo que esté abierto, de lo más reciente a lo más general */
  private manejarAtras(): boolean {
    if (this.searchActive()) {
      this.searchActive.set(false);
      return true;
    }
    if (this.simulando()) {
      this.stopSimulation();
      this.routeMessage.set('Demo cancelada.');
      return true;
    }
    if (this.selectedEndNode() || this.navegando() || this.llegada()) {
      this.clearSelections();
      return true;
    }
    return false; // nada que cerrar: que el servicio regrese de pantalla
  }

  // ── GPS ───────────────────────────────────────────────────

  private async startGps(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        let status = await Geolocation.checkPermissions();
        console.log('🔍 Permiso de ubicación:', status.location);

        if (status.location !== 'granted') {
          status = await Geolocation.requestPermissions({ permissions: ['location'] });
          console.log('🙋 Resultado de la solicitud:', status.location);
        }

        if (status.location !== 'granted') {
          this.zone.run(() =>
            this.routeMessage.set(
              'Sin permiso de ubicación. Actívalo en Ajustes → Apps → Mapa UTEQ → Permisos.',
            ),
          );
          return;
        }
      }

      await this.getQuickFix();
      await this.startWatch();
    } catch (e) {
      this.zone.run(() => this.handleGpsError(e));
    }
  }

  private async getQuickFix(): Promise<void> {
    try {
      console.log('⚡ Pidiendo ubicación rápida...');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });
      console.log('⚡ Ubicación rápida:', position.coords.accuracy, 'm');
      this.zone.run(() => this.onPosition(position));
    } catch (e) {
      console.warn('⚡ Sin ubicación rápida, esperando GPS...', e);
    }
  }

  private async startWatch(): Promise<void> {
    if (this.gpsWatchId) {
      await Geolocation.clearWatch({ id: this.gpsWatchId });
      this.gpsWatchId = undefined;
    }

    this.gpsWatchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
        // En Capacitor 8 (Android) "interval" vale lo mismo que "timeout" si no se indica: con 30000 el
        // GPS entregaba una posición cada ~30 s y al caminar el punto parecía congelado.
        // Para ir a pie pedimos una lectura cada 2 s y dejamos pasar hasta 1 por segundo.
        interval: 2000,
        minimumUpdateInterval: 1000,
      },
      (position, error) => {
        this.zone.run(() => {
          if (error || !position) {
            this.handleGpsError(error);
            const msg = error instanceof Error ? error.message : String(error ?? '');
            if (/in time|timeout/i.test(msg)) {
              // Espera progresiva: 3 s, 6 s, 12 s... hasta 30 s, para no gastar batería reintentando sin señal
              this.gpsIntentos++;
              const espera = calcularEsperaMs(this.gpsIntentos, 3000, 30000);
              console.log(`🔁 Reintentando GPS en ${espera / 1000} s (intento ${this.gpsIntentos})...`);
              if (this.gpsRetryTimer) clearTimeout(this.gpsRetryTimer);
              this.gpsRetryTimer = setTimeout(() => {
                if (!this.destruido) void this.startWatch();
              }, espera);
            }
            return;
          }
          this.gpsIntentos = 0; // hubo señal: el próximo fallo vuelve a empezar en 3 s
          this.onPosition(position);
        });
      },
    );
    console.log('📡 GPS iniciado, watch id:', this.gpsWatchId);
  }

  private onPosition(position: Position): void {
    // Durante la demo ignoramos el GPS real para no "jalar" el punto
    if (this.simulando()) return;

    this.callbackCount.update((v) => v + 1);

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    this.debugLat.set(lat);
    this.debugLng.set(lng);
    this.debugAccuracy.set(position.coords.accuracy);
    this.updateNearestNode(lat, lng);

    if (
      this.routeMessage().startsWith('Activa el GPS') ||
      this.routeMessage().startsWith('Sin señal')
    ) {
      this.routeMessage.set('Busca tu destino.');
    }

    const pos = L.latLng(lat, lng);
    this.moveGpsMarker(pos);
    this.actualizarProgreso(lat, lng);
    if (this.navegando() && this.siguiendo()) this.map?.panTo(pos, { animate: true });
    this.checkArrival(lat, lng);
  }

  private moveGpsMarker(pos: L.LatLng): void {
    this.posicionActual.set({ lat: pos.lat, lng: pos.lng });
    if (this.gpsMarker) {
      this.gpsMarker.setLatLng(pos);
      return;
    }
    if (!this.map) return;

    this.gpsMarker = L.circleMarker(pos, {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#2563eb',
      fillOpacity: 1,
    }).addTo(this.map);
  }

  private handleGpsError(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error ?? 'Error desconocido');
    console.error('❌ GPS ERROR:', msg);

    if (/location services are not enabled|disabled/i.test(msg)) {
      this.routeMessage.set('El GPS del teléfono está apagado. Actívalo para ver tu ubicación.');
    } else if (/in time|timeout/i.test(msg)) {
      this.routeMessage.set('Sin señal GPS todavía. Intenta cerca de una ventana o al aire libre.');
    } else if (/denied|permission/i.test(msg)) {
      this.routeMessage.set('Sin permiso de ubicación. Actívalo en los ajustes de la app.');
    } else {
      this.routeMessage.set('No se pudo obtener tu ubicación.');
    }
  }

  private updateNearestNode(lat: number, lng: number): void {
    let minDist = Infinity;
    let nearestId = '';

    this.nodes().forEach((node) => {
      // Distancia real en metros (haversine de Leaflet); los grados de lat y lng no miden lo mismo
      const dist = L.latLng(lat, lng).distanceTo(node.coords as L.LatLngExpression);
      if (dist < minDist) {
        minDist = dist;
        nearestId = node.id;
      }
    });

    this.nearestNodeId.set(nearestId);
  }

  private configureLeafletIcons(): void {
    const iconDefault = L.icon({
      iconUrl: 'leaflet/marker-icon.png',
      iconRetinaUrl: 'leaflet/marker-icon-2x.png',
      shadowUrl: 'leaflet/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  // ── Avisos en el mapa ─────────────────────────────────────

  private dibujarAvisos(): void {
    const capa = this.avisoLayer;
    if (!capa) return;
    capa.clearLayers();

    this.avisos.porEdificio().forEach((lista, edificioId) => {
      const nodo = this.findNodeById(edificioId);
      if (!nodo || lista.length === 0) return;

      const principal = infoTipo(lista[0].tipo); // el más severo
      const icono = L.divIcon({
        className: 'aviso-icon',
        html: `<span>${svgIcono(principal.icono, '16px')}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 40],
      });

      // El texto viene de usuarios: se inserta con textContent, nunca como HTML (evita XSS)
      const popup = document.createElement('div');
      popup.className = 'aviso-popup';
      for (const a of lista) {
        const p = document.createElement('p');
        p.textContent = `${infoTipo(a.tipo).etiqueta}: ${a.texto}`;
        popup.appendChild(p);
      }

      L.marker(nodo.coords as L.LatLngExpression, { icon: icono, zIndexOffset: 1000 })
        .bindPopup(popup)
        .on('click', () => this.zone.run(() => this.selectEndNode(nodo)))
        .addTo(capa);
    });
  }

  // ── Navegación y llegada ──────────────────────────────────

  /** Botón "Iniciar recorrido": activa la navegación sobre la ruta ya trazada. */
  async iniciarRecorrido(): Promise<void> {
    const end = this.selectedEndNode();
    if (!end || this.activeRoute().length < 2 || this.navegando()) return;
    await this.startNavigation(end);
  }

  private async startNavigation(end: CampusNode): Promise<void> {
    this.stopSimulation();
    // Ya elegiste tu ruta: las alternativas se quitan del mapa
    this.altLayer?.clearLayers();
    this.rutasPosibles.set(this.rutasPosibles().slice(this.rutaElegida(), this.rutaElegida() + 1));
    this.rutaElegida.set(0);
    this.llegada.set(null);
    this.navegando.set(true);
    this.navStart = Date.now();
    this.tramoActual = 0;
    this.siguiendo.set(true);
    this.fraccion.set(0);
    this.desvioM.set(0);
    this.restanteM.set(this.routeDistance());
    this.rumboSiguiente.set(this.rumboInicial());
    this.routeMessage.set(`Recorrido iniciado hacia ${end.name}`);

    // Aviso de inicio: vibración corta + notificación fija mientras dura el recorrido
    this.brujula.iniciar();
    void this.vibrarInicio();
    void this.notis.notificarInicio(end.name, this.routeDistance() ?? 0, this.minutosTotales());

    // Reiniciamos el podómetro para contar solo esta ruta.
    // Si no hay permiso, la navegación sigue funcionando sin pasos.
    if (this.steps.midiendo()) await this.steps.detener();
    await this.steps.iniciar();

    // Si ya hay posición, acomodamos la línea y revisamos si ya estás junto al destino
    if (this.callbackCount() > 0) {
      this.actualizarProgreso(this.debugLat(), this.debugLng());
      this.checkArrival(this.debugLat(), this.debugLng());
      this.map?.panTo(L.latLng(this.debugLat(), this.debugLng()), { animate: true });
    }
  }

  /** Recentra el mapa en tu posición y vuelve a seguirte. */
  recentrar(): void {
    this.siguiendo.set(true);
    const pos = this.gpsMarker?.getLatLng();
    if (pos) this.map?.panTo(pos, { animate: true });
  }

  private rumboInicial(): number | null {
    const ruta = this.activeRoute();
    if (ruta.length < 2) return null;
    return rumboHacia(this.aPunto(ruta[0]), this.aPunto(ruta[1]));
  }

  private aPunto(nodo: CampusNode): Punto {
    const ll = L.latLng(nodo.coords);
    return { lat: ll.lat, lng: ll.lng };
  }

  /** Acorta la línea de la ruta: lo ya recorrido desaparece y solo queda lo que falta. */
  private actualizarProgreso(lat: number, lng: number): void {
    const ruta = this.activeRoute();
    if (!this.navegando() || ruta.length < 2) return;

    const pos: Punto = { lat, lng };
    const p = progresoEnRuta(ruta.map((n) => this.aPunto(n)), pos, this.tramoActual);
    if (!p) return;

    // El ruido del GPS no debe "regresar" la línea dentro del mismo tramo
    const actual = this.restanteM();
    if (p.tramo === this.tramoActual && actual !== null && p.distanciaRestanteM > actual) {
      this.desvioM.set(p.desvioM);
      return;
    }

    this.tramoActual = p.tramo;
    this.restanteM.set(p.distanciaRestanteM);
    this.fraccion.set(p.fraccion);
    this.desvioM.set(p.desvioM);
    this.rutaRestante.set(p.restante);

    const puntos = p.restante.map((q) => L.latLng(q.lat, q.lng));
    this.lineasRuta.forEach((l) => l.setLatLngs(puntos));

    // Siguiente punto de la ruta que no esté pegado a ti (a menos de 3 m no sirve para orientarte)
    const siguiente = p.restante.slice(1).find((q) => distanciaM(pos, q) > 3);
    this.rumboSiguiente.set(siguiente ? rumboHacia(pos, siguiente) : null);
  }

  private checkArrival(lat: number, lng: number): void {
    const end = this.selectedEndNode();
    if (!this.navegando() || !end) return;

    const distancia = L.latLng(lat, lng).distanceTo(end.coords as L.LatLngExpression);
    console.log(`🎯 Distancia al destino: ${distancia.toFixed(1)} m`);

    if (distancia <= RADIO_LLEGADA_M) {
      void this.handleArrival(false);
    }
  }

  private async handleArrival(simulado: boolean): Promise<void> {
    const end = this.selectedEndNode();
    if (!this.navegando() || !end) return;

    this.navegando.set(false);
    if (!this.vista3d()) this.brujula.detener();
    void this.notis.cancelarRecorrido();
    this.vaciarProgreso();

    const distancia = Math.round(this.routeDistance() ?? 0);
    const pasos = simulado ? Math.round(distancia / METROS_POR_PASO) : this.steps.pasos();
    const segundos = simulado
      ? Math.round(distancia / VELOCIDAD_CAMINATA_MS)
      : Math.round((Date.now() - this.navStart) / 1000);

    if (this.steps.midiendo()) await this.steps.detener();

    this.llegada.set({ destino: end.name, pasos, distancia, segundos, simulado });
    this.routeMessage.set(`¡Llegaste a ${end.name}!`);
    console.log('🎉 Llegada:', this.llegada());

    // Las tres al mismo tiempo; si una falla, las otras siguen
    await Promise.all([
      this.vibrarLlegada(),
      this.notis.notificarLlegada(end.name, pasos, simulado),
      this.actualizarWidget({ destino: end.name, pasos, distancia, simulado }),
    ]);
  }

  private async vibrarInicio(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      console.warn('📳 impact() falló:', e);
    }
  }

  private vaciarProgreso(): void {
    this.restanteM.set(null);
    this.fraccion.set(0);
    this.desvioM.set(0);
    this.rumboSiguiente.set(null);
    this.tramoActual = 0;
  }

  private async vibrarLlegada(): Promise<void> {
    // Primero la vibración directa: usa el motor del cel y es la más confiable
    try {
      await Haptics.vibrate({ duration: 600 });
      console.log('📳 Vibración enviada');
    } catch (e) {
      console.warn('📳 vibrate() falló:', e);
    }

    // Después el patrón háptico de "éxito"; si falla, ya no afecta a la anterior
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      console.warn('📳 notification() falló:', e);
    }
  }

  private async actualizarWidget(info: {
    destino: string;
    pasos: number;
    distancia: number;
    simulado: boolean;
  }): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { widgetsActualizados } = await WidgetBridge.guardarRecorrido(info);
      console.log(`🧩 Widget actualizado (${widgetsActualizados} en pantalla)`);
    } catch (e) {
      console.warn('🧩 No se pudo actualizar el widget:', e);
    }
  }

  // ── Vista 3D ──────────────────────────────────────────────

  /** El 3D no pudo dibujarse (sin WebGL, etc.): se muestra el mapa plano de siempre para no dejar la app vacía. */
  alFallar3d(motivo: string): void {
    if (!this.vista3d()) return;
    console.warn('🟡 3D no disponible, se usa el mapa plano:', motivo);
    this.vista3d.set(false);
    this.asegurarTeselas();
    this.brujula.detener();
    // El mapa plano estuvo oculto: que Leaflet recalcule su tamaño
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private asegurarTeselas(): void {
    if (!this.map || this.teselas) return;
    this.teselas = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 22,
    }).addTo(this.map);
  }

  /** Tocaron un edificio en la vista 3D: se elige como destino (no mientras vas caminando). */
  alTocarEdificio(nodoId: string): void {
    const nodo = this.findNodeById(nodoId);
    if (!nodo || this.navegando()) return;
    this.selectEndNode(nodo);
  }

  /** Desde el modal de avisos: "Ir" elige ese edificio como destino. */
  alIrAEdificio(nodoId: string): void {
    const nodo = this.findNodeById(nodoId);
    if (!nodo || this.navegando()) return;
    this.selectEndNode(nodo);
  }

  /** Arrastraron el mapa 3D: deja de seguirte hasta que pulses "Recentrar". */
  alMoverMapa3d(): void {
    this.siguiendo.set(false);
  }

  // ── Demo: recorre la ruta en el mapa sin caminar ──────────

  simulateArrival(): void {
    const route = this.activeRoute();
    if (!this.map || route.length === 0 || !this.navegando() || this.simulando()) return;

    const puntos = route.map((n) => L.latLng(n.coords as L.LatLngExpression));
    const acumulado = [0];
    for (let i = 1; i < puntos.length; i++) {
      acumulado.push(acumulado[i - 1] + puntos[i - 1].distanceTo(puntos[i]));
    }
    const total = acumulado[acumulado.length - 1];
    const frames = DURACION_DEMO_MS / INTERVALO_DEMO_MS;
    let frame = 0;

    this.simulando.set(true);
    this.pasosSimulados.set(0);
    this.routeMessage.set('Simulando recorrido...');
    this.moveGpsMarker(puntos[0]);
    this.actualizarProgreso(puntos[0].lat, puntos[0].lng);

    this.simTimer = setInterval(() => {
      frame++;
      const objetivo = total * Math.min(frame / frames, 1);

      // Encontrar en qué tramo de la ruta va el punto
      let i = 1;
      while (i < acumulado.length - 1 && acumulado[i] < objetivo) i++;

      const a = puntos[Math.max(i - 1, 0)];
      const b = puntos[Math.min(i, puntos.length - 1)];
      const tramo = acumulado[i] - acumulado[i - 1] || 1;
      const t = Math.min(Math.max((objetivo - (acumulado[i - 1] ?? 0)) / tramo, 0), 1);

      const simulada = L.latLng(a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t);
      this.moveGpsMarker(simulada);
      this.actualizarProgreso(simulada.lat, simulada.lng);
      this.pasosSimulados.set(Math.round(objetivo / METROS_POR_PASO));

      if (frame >= frames) {
        this.stopSimulation();
        void this.handleArrival(true);
      }
    }, INTERVALO_DEMO_MS);
  }

  private stopSimulation(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    this.simTimer = undefined;
    this.simulando.set(false);
  }

  // ── Búsqueda ──────────────────────────────────────────────

  updateEndQuery(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.endQuery.set(value);
    this.searchActive.set(value.length > 0);
  }

  selectEndNode(node: CampusNode): void {
    // Cambiar de destino cancela el recorrido en curso y quita la ruta anterior del mapa
    if (this.navegando() || this.lineasRuta.length > 0) this.clearSelections();
    this.selectedEndId.set(node.id);
    this.endQuery.set(node.name);
    this.searchActive.set(false);
    this.routeMessage.set('');
    this.routeDistance.set(null);
    this.activeRoute.set([]);
    this.rutasPosibles.set([]);
    this.rutaElegida.set(0);
    this.altLayer?.clearLayers();
    this.llegada.set(null);
  }

  // ── Ruta ──────────────────────────────────────────────────

  traceRoute(): void {
    const startNode = this.selectedStartNode();
    const endNode = this.selectedEndNode();

    if (!startNode || !endNode) {
      this.routeMessage.set('Espera la señal GPS o selecciona un destino.');
      this.routeDistance.set(null);
      this.activeRoute.set([]);
      this.rutasPosibles.set([]);
      return;
    }

    const rutas = buscarRutasAlternativas<CampusNode>(this.nodes(), this.edges, startNode.id, endNode.id, {
      maximo: 3,
    });
    const route = rutas[0];

    if (!route) {
      this.routeMessage.set('No hay un trazado disponible entre esos nodos.');
      this.routeDistance.set(null);
      this.activeRoute.set([]);
      this.rutasPosibles.set([]);
      return;
    }

    this.rutasPosibles.set(rutas);
    this.rutaElegida.set(0);
    this.activeRoute.set(route.nodes);
    this.routeDistance.set(route.distance);

    // Advertir si el destino tiene un aviso importante
    const alerta = (this.avisos.porEdificio().get(endNode.id) ?? []).find(
      (a) => a.tipo === 'cerrado' || a.tipo === 'mantenimiento',
    );
    this.routeMessage.set(
      alerta
        ? `Ojo: ${infoTipo(alerta.tipo).etiqueta.toLowerCase()} — ${alerta.texto}`
        : `Ruta lista con ${route.nodes.length} paradas.`,
    );

    this.campusSocket.emitirRutaTrazada(endNode.id, endNode.name, startNode.name, route.distance);
    this.drawRoute(route.nodes);
  }

  /** Cambia a otra de las rutas posibles (la más corta o una alternativa). */
  elegirRuta(indice: number): void {
    const ruta = this.rutasPosibles()[indice];
    if (!ruta || this.navegando() || indice === this.rutaElegida()) return;

    this.rutaElegida.set(indice);
    this.activeRoute.set(ruta.nodes);
    this.routeDistance.set(ruta.distance);
    this.drawRoute(ruta.nodes, false);
  }

  minutosDe(metros: number): number {
    return minutosEstimados(metros);
  }

  clearSelections(): void {
    this.stopSimulation();
    this.navegando.set(false);
    this.llegada.set(null);
    // En la vista 3D la brújula sigue girando el mapa aunque termines el recorrido
    if (!this.vista3d()) this.brujula.detener();
    void this.notis.cancelarRecorrido();
    this.vaciarProgreso();
    this.rutaCompleta.set([]);
    this.rutaRestante.set([]);
    this.rutasPosibles.set([]);
    this.rutaElegida.set(0);
    this.altLayer?.clearLayers();
    this.lineasRuta = [];
    if (this.steps.midiendo()) void this.steps.detener();

    this.selectedEndId.set('');
    this.endQuery.set('');
    this.searchActive.set(false);
    this.routeMessage.set('Activa el GPS y busca tu destino.');
    this.routeDistance.set(null);
    this.activeRoute.set([]);

    this.routeLayer?.clearLayers();
    this.selectionLayer?.clearLayers();
  }

  // ── Carga de mapa ─────────────────────────────────────────

  private loadCampusLayers(): void {
    if (!this.map) return;

    this.campusLayers.forEach((layer) => {
      if (!layer.bounds) return;

      L.imageOverlay(`assets/maps/${layer.name}.svg`, layer.bounds, {
        opacity: layer.opacity ?? 1,
      }).addTo(this.map!);
    });
  }

  private loadNodes(): void {
    const layer = this.nodeLayer;
    if (!layer) return;

    this.nodes().forEach((node) => {
      if (!this.normalizeText(node.name).includes('entrada')) return;

      L.marker(node.coords)
        .bindPopup(node.name)
        .on('click', () => this.zone.run(() => this.selectEndNode(node)))
        .addTo(layer);
    });
  }

  private loadEdges(): void {
    const layer = this.edgeLayer ?? this.map;
    if (!layer) return;

    this.edges.forEach((edge) => {
      const fromNode = this.findNodeById(edge.from);
      const toNode = this.findNodeById(edge.to);
      if (!fromNode || !toNode) return;

      L.polyline([fromNode.coords, toNode.coords], {
        color: '#2563eb',
        weight: 4,
        opacity: 0.65,
      }).addTo(layer);
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  private filterNodes(query: string): CampusNode[] {
    const normalizedQuery = this.normalizeText(query);

    return this.nodes()
      .filter((node) => {
        if (!normalizedQuery) return true;
        return (
          this.normalizeText(node.name).includes(normalizedQuery) ||
          this.normalizeText(node.id).includes(normalizedQuery) ||
          this.normalizeText(node.type).includes(normalizedQuery)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private findNodeById(nodeId: string): CampusNode | undefined {
    return this.nodes().find((node) => node.id === nodeId);
  }

  private drawRoute(routeNodes: CampusNode[], ajustarVista = true): void {
    if (!this.map || !this.routeLayer || !this.selectionLayer) return;

    this.routeLayer.clearLayers();
    this.selectionLayer.clearLayers();
    this.altLayer?.clearLayers();

    if (routeNodes.length === 0) return;

    // Alternativas en gris y punteadas; tocar una la elige
    if (this.altLayer) {
      const capa = this.altLayer;
      this.rutasPosibles().forEach((r, i) => {
        if (i === this.rutaElegida()) return;
        L.polyline(
          r.nodes.map((n) => n.coords),
          { color: COLOR_ALTERNATIVA, weight: 6, opacity: 0.85, dashArray: '10 10', pane: 'routePane' },
        )
          .on('click', () => this.zone.run(() => this.elegirRuta(i)))
          .addTo(capa);
      });
    }

    const completa = routeNodes.map((n) => this.aPunto(n));
    this.rutaCompleta.set(completa);
    this.rutaRestante.set(completa);

    // Borde blanco debajo + línea roja encima; las dos se acortan al caminar
    const puntos = routeNodes.map((n) => n.coords);
    const borde = L.polyline(puntos, { color: '#ffffff', weight: 12, opacity: 0.95, pane: 'routePane' });
    const linea = L.polyline(puntos, {
      color: COLOR_RUTA,
      weight: 7,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      pane: 'routePane',
    });
    borde.addTo(this.routeLayer);
    linea.addTo(this.routeLayer);
    this.lineasRuta = [borde, linea];

    const startNode = routeNodes[0];
    const endNode = routeNodes[routeNodes.length - 1];

    L.circleMarker(startNode.coords, {
      radius: 10,
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 1,
      weight: 2,
      pane: 'routePane',
    })
      .bindPopup(`Inicio: ${startNode.name}`)
      .addTo(this.selectionLayer);

    L.circleMarker(endNode.coords, {
      radius: 10,
      color: '#dc2626',
      fillColor: '#dc2626',
      fillOpacity: 1,
      weight: 2,
      pane: 'routePane',
    })
      .bindPopup(`Llegada: ${endNode.name}`)
      .addTo(this.selectionLayer);

    if (ajustarVista) {
      // La vista abarca la ruta y también sus alternativas
      const todos = [routeNodes, ...this.rutasPosibles().map((r) => r.nodes)].flat();
      const bounds = L.latLngBounds(todos.map((n) => n.coords as L.LatLngExpression));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }
}

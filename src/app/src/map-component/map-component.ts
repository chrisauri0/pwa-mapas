import { CommonModule } from '@angular/common';
import { BackButtonService } from '../../core/services/back-button.service';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import * as L from 'leaflet';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Haptics, NotificationType } from '@capacitor/haptics';

import { CAMPUS_EDGES, CAMPUS_NODES } from '../hooks/graphs/graph-campus';
import { CampusNode } from '../hooks/models/models-graph';
import { CAMPUS_LAYERS } from '../hooks/models/models-map';
import { CampusSocketService } from '../services/campus-socket.service';
import { ArrivalCardComponent, LlegadaInfo } from '../../arrival-card/arrival-card';
import { AvisosEdificioComponent } from '../avisos-edificio/avisos-edificio';

import { StepCounterService } from '../../core/services/step-counter.service';
import { ArrivalNotificationService } from '../../core/services/arrival-notification.service';
import { AvisosService, infoTipo } from '../../core/services/avisos.service';
import { WidgetBridge } from '../../core/plugins/widget-bridge';

const RADIO_LLEGADA_M = 15;
const METROS_POR_PASO = 0.75;
const VELOCIDAD_CAMINATA_MS = 1.3; // ~4.7 km/h
const DURACION_DEMO_MS = 5000;
const INTERVALO_DEMO_MS = 50;

@Component({
  selector: 'app-map-component',
  imports: [CommonModule, ArrivalCardComponent, AvisosEdificioComponent],
  templateUrl: './map-component.html',
  styleUrl: './map-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly campusSocket = inject(CampusSocketService);
  private readonly notis = inject(ArrivalNotificationService);
  readonly steps = inject(StepCounterService);
  readonly avisos = inject(AvisosService);
    private readonly back = inject(BackButtonService);
  private readonly quitarAtras = this.back.registrar(() => this.manejarAtras());

  // Pon en false para la entrega final y desaparece el botón de demo
  readonly modoDemo = true;

  map?: L.Map;
  gpsMarker?: L.CircleMarker;
  private gpsWatchId?: string;
  private resizeObserver?: ResizeObserver;
  private nodeLayer?: L.LayerGroup;
  private edgeLayer?: L.LayerGroup;
  private avisoLayer?: L.LayerGroup;
  private routeLayer?: L.LayerGroup;
  private selectionLayer?: L.LayerGroup;

  private navStart = 0;
  private simTimer?: ReturnType<typeof setInterval>;

  readonly debugLat = signal(0);
  readonly debugLng = signal(0);
  readonly debugAccuracy = signal(0);
  readonly callbackCount = signal(0);

  readonly nodes = signal<CampusNode[]>([...CAMPUS_NODES]);
  readonly edges = CAMPUS_EDGES;
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

    this.map = L.map('campus-map', { bounceAtZoomLimits: false }).setView(
      [20.656, -100.405],
      18,
    );

    this.map.createPane('routePane').style.zIndex = '650';

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 22,
    }).addTo(this.map);

    this.nodeLayer = L.layerGroup().addTo(this.map);
    this.edgeLayer = L.layerGroup().addTo(this.map);
    this.avisoLayer = L.layerGroup().addTo(this.map);

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

    this.avisos.escuchar();
    this.dibujarAvisos();
  }

  ngOnDestroy(): void {
    this.stopSimulation();
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
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
      (position, error) => {
        this.zone.run(() => {
          if (error || !position) {
            this.handleGpsError(error);
            const msg = error instanceof Error ? error.message : String(error ?? '');
            if (/in time|timeout/i.test(msg)) {
              console.log('🔁 Reintentando GPS en 3 s...');
              setTimeout(() => void this.startWatch(), 3000);
            }
            return;
          }
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

    this.moveGpsMarker(L.latLng(lat, lng));
    this.checkArrival(lat, lng);
  }

  private moveGpsMarker(pos: L.LatLng): void {
    if (this.gpsMarker) {
      this.gpsMarker.setLatLng(pos);
      return;
    }
    if (!this.map) return;

    this.gpsMarker = L.circleMarker(pos, {
      radius: 8,
      color: '#2563eb',
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
      const coords = node.coords as [number, number];
      const dist = Math.sqrt(Math.pow(lat - coords[0], 2) + Math.pow(lng - coords[1], 2));
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
        html: `<span>${principal.icono}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 40],
      });

      // El texto viene de usuarios: se inserta con textContent, nunca como HTML (evita XSS)
      const popup = document.createElement('div');
      popup.className = 'aviso-popup';
      for (const a of lista) {
        const p = document.createElement('p');
        p.textContent = `${infoTipo(a.tipo).icono} ${a.texto}`;
        popup.appendChild(p);
      }

      L.marker(nodo.coords as L.LatLngExpression, { icon: icono, zIndexOffset: 1000 })
        .bindPopup(popup)
        .on('click', () => this.zone.run(() => this.selectEndNode(nodo)))
        .addTo(capa);
    });
  }

  // ── Navegación y llegada ──────────────────────────────────

  private async startNavigation(): Promise<void> {
    this.stopSimulation();
    this.llegada.set(null);
    this.navegando.set(true);
    this.navStart = Date.now();
    void this.notis.preparar();

    // Reiniciamos el podómetro para contar solo esta ruta.
    // Si no hay permiso, la navegación sigue funcionando sin pasos.
    if (this.steps.midiendo()) await this.steps.detener();
    await this.steps.iniciar();

    // Por si ya estás parado junto al destino
    if (this.callbackCount() > 0) this.checkArrival(this.debugLat(), this.debugLng());
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

      this.moveGpsMarker(L.latLng(a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t));
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
    this.selectedEndId.set(node.id);
    this.endQuery.set(node.name);
    this.searchActive.set(false);
    this.routeMessage.set('');
    this.routeDistance.set(null);
    this.activeRoute.set([]);
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
      return;
    }

    const route = this.findShortestRoute(startNode.id, endNode.id);

    if (!route) {
      this.routeMessage.set('No hay un trazado disponible entre esos nodos.');
      this.routeDistance.set(null);
      this.activeRoute.set([]);
      return;
    }

    this.activeRoute.set(route.nodes);
    this.routeDistance.set(route.distance);

    // Advertir si el destino tiene un aviso importante
    const alerta = (this.avisos.porEdificio().get(endNode.id) ?? []).find(
      (a) => a.tipo === 'cerrado' || a.tipo === 'mantenimiento',
    );
    this.routeMessage.set(
      alerta
        ? `⚠️ Ojo: ${infoTipo(alerta.tipo).etiqueta.toLowerCase()} — ${alerta.texto}`
        : `Ruta encontrada con ${route.nodes.length} paradas.`,
    );

    this.campusSocket.emitirRutaTrazada(endNode.id, endNode.name, startNode.name, route.distance);
    this.drawRoute(route.nodes);
    void this.startNavigation();
  }

  clearSelections(): void {
    this.stopSimulation();
    this.navegando.set(false);
    this.llegada.set(null);
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
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private findNodeById(nodeId: string): CampusNode | undefined {
    return this.nodes().find((node) => node.id === nodeId);
  }

  private findShortestRoute(
    startId: string,
    endId: string,
  ): { nodes: CampusNode[]; distance: number } | null {
    const adjacency = this.buildAdjacency();
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    this.nodes().forEach((node) => {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    });

    distances.set(startId, 0);

    while (unvisited.size > 0) {
      let currentId: string | undefined;
      let currentDistance = Infinity;

      unvisited.forEach((nodeId) => {
        const d = distances.get(nodeId) ?? Infinity;
        if (d < currentDistance) {
          currentDistance = d;
          currentId = nodeId;
        }
      });

      if (!currentId || currentDistance === Infinity) break;

      const selectedId = currentId;
      unvisited.delete(selectedId);
      if (selectedId === endId) break;

      (adjacency.get(selectedId) ?? []).forEach(({ nodeId, distance }) => {
        if (!unvisited.has(nodeId)) return;
        const tentative = currentDistance + distance;
        if (tentative < (distances.get(nodeId) ?? Infinity)) {
          distances.set(nodeId, tentative);
          previous.set(nodeId, selectedId);
        }
      });
    }

    const finalDistance = distances.get(endId) ?? Infinity;
    if (finalDistance === Infinity) return null;

    const routeIds: string[] = [];
    let cur: string | null = endId;
    while (cur) {
      routeIds.unshift(cur);
      cur = previous.get(cur) ?? null;
    }

    const routeNodes = routeIds
      .map((id) => this.findNodeById(id))
      .filter((n): n is CampusNode => Boolean(n));

    if (routeNodes.length === 0 || routeNodes[0].id !== startId) return null;

    return { nodes: routeNodes, distance: finalDistance };
  }

  private buildAdjacency(): Map<string, Array<{ nodeId: string; distance: number }>> {
    const adjacency = new Map<string, Array<{ nodeId: string; distance: number }>>();

    this.edges.forEach((edge) => {
      const from = adjacency.get(edge.from) ?? [];
      const to = adjacency.get(edge.to) ?? [];
      from.push({ nodeId: edge.to, distance: edge.distance });
      to.push({ nodeId: edge.from, distance: edge.distance });
      adjacency.set(edge.from, from);
      adjacency.set(edge.to, to);
    });

    return adjacency;
  }

  private drawRoute(routeNodes: CampusNode[]): void {
    if (!this.map || !this.routeLayer || !this.selectionLayer) return;

    this.routeLayer.clearLayers();
    this.selectionLayer.clearLayers();

    if (routeNodes.length === 0) return;

    L.polyline(routeNodes.map((n) => n.coords), {
      color: '#ef4444',
      weight: 8,
      opacity: 1,
      pane: 'routePane',
    }).addTo(this.routeLayer);

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

    const bounds = L.latLngBounds(routeNodes.map((n) => n.coords as L.LatLngExpression));
    this.map.fitBounds(bounds, { padding: [40, 40] });
  }
}

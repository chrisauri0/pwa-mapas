import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import * as L from 'leaflet';

import { CAMPUS_EDGES, CAMPUS_NODES } from '../hooks/graphs/graph-campus';
import { CampusNode } from '../hooks/models/models-graph';
import { CAMPUS_LAYERS } from '../hooks/models/models-map';

@Component({
  selector: 'app-map-component',
  imports: [CommonModule],
  templateUrl: './map-component.html',
  styleUrl: './map-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);

  map?: L.Map;
  gpsMarker?: L.CircleMarker;
  private gpsWatchId?: number;
  private nodeLayer?: L.LayerGroup;
  private edgeLayer?: L.LayerGroup;
  private routeLayer?: L.LayerGroup;
  private selectionLayer?: L.LayerGroup;

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

  readonly selectedStartNode = computed(() => this.findNodeById(this.nearestNodeId()));
  readonly selectedEndNode = computed(() => this.findNodeById(this.selectedEndId()));
  readonly filteredEndNodes = computed(() => this.filterNodes(this.endQuery()));

  ngOnInit(): void {
    if (!navigator.geolocation) {
      this.routeMessage.set('La geolocalización no está disponible en este navegador.');
      return;
    }

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.zone.run(() => {
          this.callbackCount.update((v) => v + 1);

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.debugLat.set(lat);
          this.debugLng.set(lng);
          this.debugAccuracy.set(position.coords.accuracy);
          this.updateNearestNode(lat, lng);

          if (this.gpsMarker) {
            this.gpsMarker.setLatLng([lat, lng]);
            return;
          }

          if (!this.map) return;

          this.gpsMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#2563eb',
            fillColor: '#2563eb',
            fillOpacity: 1,
          }).addTo(this.map);
        });
      },
      (error) => console.error('GPS ERROR:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  ngAfterViewInit(): void {
   this.map = L.map('campus-map', {bounceAtZoomLimits: false,
      }).setView([20.656, -100.405], 18);

    this.map.createPane('routePane').style.zIndex = '650';
    

    // this.nodeLayer = L.layerGroup(); // sin .addTo — se muestra solo cuando hay búsqueda
        this.nodeLayer = L.layerGroup().addTo(this.map); // ← agregar al mapa desde el inicio

    this.edgeLayer = L.layerGroup().addTo(this.map);

    this.loadCampusLayers();
    this.loadNodes(); // carga markers en nodeLayer pero no los muestra aún
    // this.loadEdges(); // carga líneas en edgeLayer y las muestra desde el inicio
    

    // estos dos al final para quedar encima de todo
    this.selectionLayer = L.layerGroup().addTo(this.map);
    this.routeLayer = L.layerGroup().addTo(this.map);
  }

  ngOnDestroy(): void {
    if (this.gpsWatchId !== undefined) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
    }
    this.map?.remove();
  }

  // ── Búsqueda ──────────────────────────────────────────────

  updateEndQuery(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.endQuery.set(value);
    this.searchActive.set(value.length > 0);

    // mostrar u ocultar markers de entradas según si hay búsqueda activa
    // if (value.length > 0) {
    //   this.nodeLayer?.addTo(this.map!);
    // } else {
    //   this.nodeLayer?.remove();
    // }
  }

  selectEndNode(node: CampusNode): void {
    this.selectedEndId.set(node.id);
    this.endQuery.set(node.name);
    this.searchActive.set(false);
    // this.nodeLayer?.remove(); // ocultamos markers al seleccionar
    this.routeMessage.set('');
    this.routeDistance.set(null);
    this.activeRoute.set([]);
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
    this.routeMessage.set(`Ruta encontrada con ${route.nodes.length} paradas.`);
    this.drawRoute(route.nodes);
  }

  clearSelections(): void {
    this.selectedEndId.set('');
    this.endQuery.set('');
    this.searchActive.set(false);
    this.routeMessage.set('Activa el GPS y busca tu destino.');
    this.routeDistance.set(null);
    this.activeRoute.set([]);
    // this.nodeLayer?.remove();

    this.routeLayer?.clearLayers();
    this.selectionLayer?.clearLayers();
  }


  

  // ── GPS ───────────────────────────────────────────────────
private updateNearestNode(lat: number, lng: number): void {
  let minDist = Infinity;
  let nearestId = '';

  this.nodes().forEach((node) => {
    const coords = node.coords as [number, number];  // ← cast explícito
    const dist = Math.sqrt(Math.pow(lat - coords[0], 2) + Math.pow(lng - coords[1], 2));
    if (dist < minDist) {
      minDist = dist;
      nearestId = node.id;
    }
  });

  this.nearestNodeId.set(nearestId);
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

    if (!layer) {
      return;
    }

    this.edges.forEach((edge) => {
      const fromNode = this.findNodeById(edge.from);
      const toNode = this.findNodeById(edge.to);

      if (!fromNode || !toNode) {
        return;
      }

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
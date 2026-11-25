// Edificios del campus UTEQ para la vista 3D.
// Los contornos salen de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL), consulta de
// Overpass del 2026-11-23 sin los 4 edificios del otro lado de la avenida ni el del estacionamiento norte.
// Para cambiar una altura o enlazar un edificio con otro nodo, edita las tablas de abajo (no hace falta tocar el código).

import type { TipoArea } from '../../../core/services/mapa3d.logic';

export interface EdificioOsm {
  /** Id de OpenStreetMap (número del way). */
  id: string;
  nombre: string;
  /** Contorno [lng, lat] cerrado: el primer punto se repite al final. */
  contorno: [number, number][];
  /** Pisos, solo si OpenStreetMap lo trae. */
  niveles?: number;
  /** Edificios chicos de servicio (se pintan más claros y bajos). */
  uso?: 'servicio';
}

export const CAMPUS_EDIFICIOS: EdificioOsm[] = [
  { id: '1409853117', nombre: 'Laboratorio de Mantenimiento Industrial', contorno: [[-100.4041205,20.6540089],[-100.4040907,20.6538125],[-100.4039116,20.6538423],[-100.4037848,20.6538634],[-100.4038153,20.6540659],[-100.4041205,20.6540089]] },
  { id: '1474320277', nombre: 'Edificio de Idiomas', contorno: [[-100.4066365,20.6551637],[-100.4065903,20.6549404],[-100.4063146,20.6549929],[-100.4061747,20.6550196],[-100.4062555,20.6552501],[-100.4066365,20.6551637]], niveles: 2 },
  { id: '1474320278', nombre: 'Laboratorio de Mecatrónica', contorno: [[-100.4058899,20.6553185],[-100.4058476,20.6550845],[-100.4054745,20.6551854],[-100.405355,20.6552177],[-100.4053973,20.6554122],[-100.4058899,20.6553185]] },
  { id: '1474320279', nombre: 'Auditorio', contorno: [[-100.4061786,20.6562908],[-100.4060823,20.6557831],[-100.4059556,20.6558012],[-100.4058319,20.6558188],[-100.4056783,20.6558407],[-100.4058168,20.6563628],[-100.4061786,20.6562908]] },
  { id: '1474327669', nombre: 'División de Tecnologías de la Automatización', contorno: [[-100.4049946,20.6545053],[-100.4049351,20.6542781],[-100.4046626,20.6543393],[-100.4044591,20.654385],[-100.4045186,20.6545921],[-100.4049946,20.6545053]] },
  { id: '1474327670', nombre: 'División Industrial', contorno: [[-100.4042934,20.6545113],[-100.4042333,20.6542791],[-100.4037632,20.6543769],[-100.4038207,20.6545944],[-100.4042039,20.654527],[-100.4042934,20.6545113]] },
  { id: '1474327671', nombre: 'Biblioteca', contorno: [[-100.4040662,20.6550783],[-100.4040348,20.6548265],[-100.4036483,20.6549023],[-100.4037136,20.6551467],[-100.4040662,20.6550783]] },
  { id: '1474327672', nombre: 'Laboratorio de Informática', contorno: [[-100.4048393,20.6550465],[-100.4048079,20.6548314],[-100.4044337,20.654899],[-100.4042934,20.6549243],[-100.4043352,20.655132],[-100.4048393,20.6550465]] },
  { id: '1474327673', nombre: 'Desarrollo de Negocios', contorno: [[-100.404108,20.6555768],[-100.4040531,20.6553764],[-100.4035778,20.6554717],[-100.4036248,20.6556795],[-100.403946,20.6556112],[-100.404108,20.6555768]] },
  { id: '1474327678', nombre: 'Enfermería', contorno: [[-100.4052232,20.6552982],[-100.4051971,20.6551882],[-100.4051475,20.6552033],[-100.4050926,20.65522],[-100.4051109,20.6553324],[-100.4052232,20.6552982]] },
  { id: '1474327681', nombre: 'División Tecnológica Ambiental', contorno: [[-100.4049124,20.6552445],[-100.4046098,20.6553256],[-100.4045879,20.6553315],[-100.4043926,20.6553838],[-100.4044458,20.6555971],[-100.4049698,20.655484],[-100.4049124,20.6552445]] },
  { id: '1474327682', nombre: 'Nanotecnología y Laboratorios', contorno: [[-100.4050987,20.6558559],[-100.4050585,20.6556818],[-100.4050404,20.6556033],[-100.4046063,20.6556922],[-100.4046667,20.6559468],[-100.4047951,20.6559198],[-100.4050987,20.6558559]] },
  { id: '1474327686', nombre: 'Cafetería', contorno: [[-100.4051103,20.65484],[-100.4050621,20.6546552],[-100.4048991,20.6546896],[-100.4049473,20.6548808],[-100.4051103,20.65484]], uso: 'servicio' },
  { id: '1474327687', nombre: 'Edificio de Rectoría', contorno: [[-100.4056727,20.6544877],[-100.4056195,20.6542715],[-100.4055786,20.6541053],[-100.4051769,20.6541848],[-100.4052733,20.6545672],[-100.4056727,20.6544877]] },
  { id: '1474327688', nombre: 'División Administrativa', contorno: [[-100.4054644,20.6537454],[-100.4054185,20.6535115],[-100.4049333,20.653607],[-100.4049937,20.6538428],[-100.4051632,20.6538077],[-100.4054644,20.6537454]] },
  { id: '1474327689', nombre: 'Laboratorios de Procesos Industriales', contorno: [[-100.404852,20.6540884],[-100.4048125,20.6538896],[-100.4044991,20.6539456],[-100.4042897,20.6539831],[-100.4043439,20.6541761],[-100.404852,20.6540884]] },
  { id: '1474327692', nombre: 'Baños', contorno: [[-100.4041621,20.6541864],[-100.4041531,20.6541505],[-100.4041371,20.6540868],[-100.4040399,20.6541014],[-100.404065,20.654207],[-100.4041621,20.6541864]], uso: 'servicio' },
  { id: '1474327693', nombre: 'Baños', contorno: [[-100.4042342,20.6561973],[-100.4042122,20.6561094],[-100.4040838,20.656124],[-100.4041151,20.6562178],[-100.4041746,20.6562076],[-100.4042342,20.6561973]], uso: 'servicio' },
  { id: '1474327694', nombre: 'Almacén General', contorno: [[-100.4039396,20.6560808],[-100.4039096,20.6559335],[-100.4034322,20.656027],[-100.4034622,20.656179],[-100.4039396,20.6560808]] },
  { id: '1474327695', nombre: 'Stellantis', contorno: [[-100.4038571,20.6566094],[-100.4038271,20.6563919],[-100.4035577,20.6564435],[-100.4033022,20.6564924],[-100.4033322,20.6566959],[-100.4038571,20.6566094]] },
  { id: '1474828118', nombre: 'Edificio PIDET', contorno: [[-100.4037716,20.6573952],[-100.4037574,20.6573168],[-100.4037587,20.6572589],[-100.4038386,20.6571878],[-100.4037574,20.6571214],[-100.4036556,20.6572227],[-100.4035525,20.6572541],[-100.4035162,20.65726],[-100.4032999,20.6572951],[-100.403336,20.6574036],[-100.4031878,20.6575399],[-100.4032831,20.6575954],[-100.4033927,20.6574977],[-100.4037716,20.6573952]] },
  { id: '1474828119', nombre: 'Edificio CISCO', contorno: [[-100.4038269,20.6577203],[-100.4037199,20.6576577],[-100.4035994,20.6577304],[-100.4034588,20.6577563],[-100.4032462,20.6577955],[-100.4032395,20.6579006],[-100.4031137,20.6580421],[-100.4032154,20.658121],[-100.4033198,20.6580321],[-100.4034536,20.658007],[-100.4037158,20.6579582],[-100.4036971,20.6578593],[-100.4038269,20.6577203]] },
  { id: '1477862941', nombre: 'Edificio de Vinculaciones', contorno: [[-100.4063,20.6540363],[-100.4062442,20.6537391],[-100.4058365,20.6538315],[-100.4058592,20.6539406],[-100.4058966,20.6541206],[-100.4060987,20.6540784],[-100.4063,20.6540363]] },
  { id: '1492876286', nombre: 'Actividades Culturales', contorno: [[-100.4064146,20.6546549],[-100.4064023,20.6545691],[-100.4062505,20.6546],[-100.4061296,20.6546246],[-100.406152,20.6547061],[-100.4064146,20.6546549]] },
  // Dibujado a mano en geojson.io (OpenStreetMap no lo tiene): el OXXO que abrieron dentro del campus
  { id: 'manual-oxxo', nombre: 'OXXO', contorno: [[-100.4052739,20.6551652],[-100.4051995,20.6551766],[-100.4051806,20.6550931],[-100.4052563,20.6550766],[-100.4052739,20.6551652]], uso: 'servicio' },
  { id: '1492876287', nombre: 'Salón de canto', contorno: [[-100.4065595,20.6545547],[-100.4065394,20.6544351],[-100.4064277,20.6544495],[-100.406457,20.6545734],[-100.4065595,20.6545547]] },
];

/**
 * Qué nodo del grafo se usa como destino al tocar cada edificio (id de OpenStreetMap → id de nodo).
 * Se calculó por cercanía: el nodo "entrada-…" que queda dentro o a pocos metros del contorno.
 * null = el edificio no tiene entrada en el grafo (tocarlo no hace nada).
 */
export const NODO_DE_EDIFICIO: Record<string, string | null> = {
  '1409853117': 'entrada-laboratorio-industrial',
  '1474320277': 'entrada-idiomas',
  '1474320278': 'entrada-edificio-j',  // el nodo se llama "Edificio J"
  '1474320279': 'entrada-auditorio',
  '1474327669': 'entrada-edificio-k',
  '1474327670': 'entrada-industrial',
  '1474327671': 'biblioteca',
  '1474327672': 'entrada-laboratorio-informatica',
  '1474327673': 'entrada-marketing',
  '1474327678': 'entrada-enfermeria',
  '1474327681': 'entrada-ambiental',
  '1474327682': 'entrada-nanotecnologia',
  '1474327686': 'entrada-cafeteria-1',  // la cafetería tiene 2 entradas (entrada-cafeteria-1 y -2)
  '1474327687': 'entrada-rectoria',
  '1474327688': 'entrada-dea',
  '1474327689': 'entrada-mantenimiento',  // dudoso: también está a ~13 m de entrada-edificio-k
  '1474327692': null,
  '1474327693': null,
  '1474327694': null,
  '1474327695': 'entrada-stellantis',
  '1474828118': 'entrada-cic4.0',  // OJO: en OSM este polígono es PIDET pero tu nodo "entrada-cic4.0" cae dentro de él
  '1474828119': 'entrada-pidet',  // OJO: en OSM este polígono es CISCO pero tu nodo "entrada-pidet" cae dentro de él
  '1477862941': 'entrada-servicios-escolares',  // el nodo se llama "Servicios Escolares"
  '1492876286': 'entrada-musica',  // el nodo se llama "Música"
  '1492876287': null,
  'manual-oxxo': 'entrada-oxxo',
};

/**
 * Alturas en metros que quieras fijar a mano (id de OpenStreetMap → metros).
 * Sin entrada aquí: pisos × 3.5 m si OpenStreetMap trae los pisos, 3.5 m si es un edificio chico
 * (menos de 400 m²) y 7 m en cualquier otro caso.
 */
export const ALTURA_DE_EDIFICIO: Record<string, number> = {
  // '1474327671': 10, // Biblioteca
};

/**
 * Texto corto que se ve sobre cada edificio en el mapa 3D (id de OpenStreetMap → texto).
 * Si un edificio no aparece aquí, se usa su nombre completo.
 */
export const ETIQUETA_DE_EDIFICIO: Record<string, string> = {
  '1409853117': 'Lab. Mantenimiento',
  '1474320277': 'Idiomas',
  '1474320278': 'Mecatrónica',
  '1474320279': 'Auditorio',
  '1474327669': 'Automatización',
  '1474327670': 'Industrial',
  '1474327671': 'Biblioteca',
  '1474327672': 'Informática',
  '1474327673': 'Negocios',
  '1474327678': 'Enfermería',
  '1474327681': 'Ambiental',
  '1474327682': 'Nanotecnología',
  '1474327686': 'Cafetería',
  '1474327687': 'Rectoría',
  '1474327688': 'Administrativa',
  '1474327689': 'Procesos Industriales',
  '1474327692': 'Baños',
  '1474327693': 'Baños',
  '1474327694': 'Almacén',
  '1474327695': 'Stellantis',
  '1474828118': 'PIDET',
  '1474828119': 'CISCO',
  '1477862941': 'Vinculaciones',
  '1492876286': 'Act. Culturales',
  '1492876287': 'Salón de canto',
  'manual-oxxo': 'OXXO',
};

// ── Áreas planas (canchas y pista) ──────────────────────────
// También vienen de OpenStreetMap (consulta de Overpass del 2026-11-23). Se dibujan a ras de suelo, sin altura.

export interface AreaOsm {
  id: string;
  nombre: string;
  tipo: TipoArea;
  /** Contorno [lng, lat] cerrado. */
  contorno: [number, number][];
}

export const CAMPUS_AREAS: AreaOsm[] = [
  // La pista de atletismo rodea a la cancha de fútbol grande, que queda dentro de ella
  { id: '961643854', nombre: 'Pista de atletismo', tipo: 'pista', contorno: [[-100.4054806,20.6579207],[-100.4051042,20.656283],[-100.404128,20.6564794],[-100.4045042,20.6581172],[-100.4054806,20.6579207]] },
  { id: '961643850', nombre: 'Cancha de fútbol', tipo: 'futbol', contorno: [[-100.4052587,20.6576414],[-100.4050484,20.6567079],[-100.4043508,20.6568455],[-100.4045612,20.657779],[-100.4052587,20.6576414]] },
  { id: '961643851', nombre: 'Cancha de fútbol (oeste)', tipo: 'futbol', contorno: [[-100.405803,20.6571795],[-100.4057075,20.6567333],[-100.4054944,20.6567732],[-100.4055898,20.6572194],[-100.405803,20.6571795]] },
  { id: '961643852', nombre: 'Cancha de básquetbol', tipo: 'basquet', contorno: [[-100.405625,20.6565649],[-100.4055535,20.6562804],[-100.4054205,20.6563097],[-100.4053765,20.6563194],[-100.4054481,20.6566039],[-100.405625,20.6565649]] },
];

/**
 * Nodo del grafo que se elige al tocar cada área (id de OpenStreetMap → id de nodo).
 * La pista y la cancha de fútbol grande comparten nodo porque son el mismo campo.
 * null = sin entrada en el grafo (solo se ve, no se puede elegir).
 */
export const NODO_DE_AREA: Record<string, string | null> = {
  '961643854': 'entrada-canchas-futbol', // a 6 m del borde de la pista
  '961643850': 'entrada-canchas-futbol', // dentro de la pista
  '961643851': null, // la cancha del oeste queda a ~22 m de ese nodo
  '961643852': 'entrada-canchas-basquetbol', // a 3 m
};

/**
 * Nombre que se ve sobre cada área. Las que no aparecen aquí no llevan nombre
 * (la cancha grande no lo lleva porque su nombre taparía el de la pista).
 */
export const ETIQUETA_DE_AREA: Record<string, string> = {
  '961643854': 'Atletismo',
  '961643851': 'Fútbol',
  '961643852': 'Básquetbol',
};

import {
CampusNode,
CampusEdge
} from '../models/models-graph';

export const CAMPUS_NODES:CampusNode[]=[

{

id:'biblioteca',
name:'Biblioteca',

type:'building',

coords:[20.65485,-100.40373]

},

{

id:'salida-biblioteca',
name:'Salida Biblioteca',

type:'path',

coords:[20.6547, -100.4037]

},

{

id:'salida-biblioteca-1',
name:'Salida Biblioteca 1',

type:'path',

coords:[20.65468,-100.4039]

},
{

id:'salida-biblioteca-2',
name:'Salida Biblioteca 2',

type:'path',

coords:[20.65459,-100.4039]

},
{
    id:'salida-biblioteca-3',
    name:'Salida Biblioteca 3',
    type:'path',
    coords:[20.65459,-100.40405]

},
{
id:'interseccion-biblioteca',
name:'Intersección Biblioteca',
type:'junction',
coords:[20.65456, -100.4041]
},
{
id:'entrada-industrial',
name:'Entrada Industrial',
type:'path',
coords:[20.65445, -100.4041]
},
{
id:'salida-industrial-2',
name:'Salida Industrial 2',
type:'path',
coords:[20.6545, -100.4044]
},
{
    id:'pasillo-industrial-tecnologias',
    name:'Pasillo Industrial Tecnologías',
    type:'path',
    coords:[20.65423, -100.40432]
},{
id:'interseccion-industrial-tecnologias',
name:'Intersección Industrial Tecnologías',
type:'junction',
coords:[20.65418, -100.4043]
},
{
id:'salida-tecnologias-d',
name:'Salida Tecnologías D',

type:'path',

coords:[20.65416, -100.40455]
},
{
id:'interseccion-tecnologias-1',
name:'Intersección Tecnologías 1',
type:'junction',
coords:[20.6541530555007, -100.40461063385011]
},
{
id:'entrada-edificio-k',
name:'Entrada Edificio K',
type:'path',
coords:[20.654244036240208, -100.40462069213393]
},
{
id:'salida-tecnologias-i',
name:'Salida Tecnologías I',

type:'path',

coords:[20.654102859207317, -100.40487550199033]
},
{
    coords: [20.65408905522374, -100.40491992607714],
    id: "interseccion-tecnologias-2",
    name: "Intersección Tecnologías 2",
    type: "junction"
},
{
    coords
: 
[20.653937838776017, -100.40489779785278],
id
: 
"camino-tecnologias-dea",
name
: 
"Camino Tecnologías DEA",
type
: 
"path"
},
{coords
: 
 [20.6539121131413, -100.40489243343472],
id
: 
"interseccion-tecnologias-dea",
name
: 
"Intersección Tecnologías DEA",
type
: 
"junction"},
{
    coords
: 
 [20.65388230904686, -100.40488773956896],
id
: 
"camino-dea-industrial-1",
name
: 
"Camino DEA Industrial 1",
type
: 
"path"
},
{
    coords
: 
 [20.653678072410877, -100.40483493357898],
id
: 
"camino-dea-industrial-2",
name
: 
"Camino DEA Industrial 2",
type
: 
"path"
},
{coords
: 
[20.65369187643178, -100.4047692194581],
id
: 
"camino-dea-industrial-3",
name
: 
"Camino DEA Industrial 3",
type
: 
"path"},
{
    coords
: 
[20.65369877844177, -100.40472362190486],
id
: 
"interseccion-dea-industrial",
name
: 
"Intersección DEA Industrial",
type
: 
"junction"
},
{
    coords
: 
 [20.653545051781503, -100.40468540042642],
id
: 
"camino-industrial-estatua-1",
name
: 
"Camino Industrial Estatua 1",
type
: 
"path"

},
{
    coords
: 
[20.653565757830524, -100.40459487587215],
id
: 
"camino-industrial-estatua-2",
name
: 
"Camino Industrial Estatua 2",
type
: 
"path"
},
{
    coords
: 
[20.653572032390276, -100.40455732494594],
id
: 
"interseccion-industrial-estatua",
name
: 
"Intersección Industrial Estatua",
type
: 
"junction"
},
{
    coords
: 
[20.65347258058774, -100.40453201159838],
id
: 
"camino-industrial-estatua-3",
name
: 
"Camino Industrial Estatua 3",
type
: 
"path"
},
{
    coords
: 
 [20.653543796869354, -100.40414996445179],
id
: 
"camino-hacia-industrial",
name
: 
"Camino Hacia Industrial",
type
: 
"path"
},
{
    coords
: 
 [20.653553836166278, -100.40411375463009],
id
: 
"interseccion-industrial-1",
name
: 
"Intersección  Industrial 1",
type
: 
"junction"
},
{
    coords
: 
[20.653245127482478, -100.40401585400105],
id
: 
"camino-entrada-1",
name
: 
"Camino Entrada 1",
type
: 
"path"
},
{
    coords
: 
 [20.65362584163149, -100.40412522736008],
id
: 
"camino-2",
name
: 
"Camino 2",
type
: 
"path"
}, 
{
    coords
: 
 [20.65367729299347, -100.40383420768195],
id
: 
"camino-laboratorio-industrial",
name
: 
"Camino Laboratorio Industrial",
type
: 
"path"
},
{
    coords
: 
 [20.653763881831605, -100.40386505308562],
id
: 
"entrada-laboratorio-industrial",
name
: 
"Entrada Laboratorio Industrial",
type
: 
"path"
},
{
    coords
: 
[20.653751332727694, -100.40415070834571],
id
: 
"camino-laboratorio-industrial-2",
name
: 
"Camino Laboratorio Industrial 2",
type
: 
"path"
},
{coords
: 
 [20.653790234946467, -100.40415875497276],
id
: 
"interseccion-laboratorio-industrial",
name
: 
"Intersección Laboratorio Industrial",
type
: 
"junction"},
{
    coords
: 
 [20.653851725530053, -100.40417082491331],
id
: 
"camino-tecnologias",
name
: 
"Camino Tecnologías",
type
: 
"path"
},
{
    coords
: 
 [20.654129060301983, -100.40424995007925],
id
: 
"camino-tecnologias-2",
name
: 
"Camino Tecnologías 2",
type
: 
"path"
},
{
    coords
: 
[20.6537852153059, -100.40421508136207],
id
: 
"camino-laboratorio-industrial",
name
: 
"Camino Laboratorio Industrial",
type
: 
"path"
},
{
    coords
: 
 [20.65376137201092, -100.40439076605254],
id
: 
"camino-mantenimiento",
name
: 
"Camino Mantenimiento",
type
: 
"path"
},
{
    coords
: 
 [20.653755097458976, -100.40443502250129],
id
: 
"interseccion-mantenimiento",
name
: 
"Intersección Mantenimiento",
type
: 
"junction"
},
{
    coords
: 
[20.65374254835433, -100.40449403109962],
id
: 
"camino-mantenimiento-2",
name
: 
"Camino Mantenimiento 2",
type
: 
"path"
},
{
    coords
: 
[20.653736273801613, -100.4045262176078],
id
: 
"interseccion-mantenimiento-2",
name
: 
"Intersección Mantenimiento 2",
type
: 
"junction"
},
{
    coords
: 
 [20.653804038957194, -100.4045436519664],
id
: 
"entrada-mantenimiento",
name
: 
"Entrada Mantenimiento",
type
: 
"path"
},
{
    coords
: 
 [20.653728744338032, -100.40457449737006],
id
: 
"camino-mantenimiento-dea",
name
: 
"Camino Mantenimiento DEA",
type
: 
"path"
},
{
    coords
: 
 [20.653701136301645, -100.40442965808326],
id
: 
"camino-mantenimiento-estatua",
name
: 
"Camino Mantenimiento Estatua",
type
: 
"path"
},
{
    coords
: 
 [20.653598233576428, -100.40441758814269],
id
: 
"camino-mantenimiento-estatua-2",
name
: 
"Camino Mantenimiento Estatua 2",
type
: 
"path"
},
{
    coords
: 
[20.653580664811493, -100.40451146545823],
id
: 
"camino-mantenimiento-estatua-3",
name
: 
"Camino Mantenimiento Estatua 3",
type
: 
"path"
}
,
{
    coords
: 
 [20.654731759042267, -100.4041412472725],
id: "camino-industrial-laboratorios-informatica",
name: "Camino Industrial Laboratorios Informática",
type: "path"
},
{
    coords
: 
 [20.65477682592671, -100.40415331721309],
id
: 
"interseccion-industrial-laboratorios-informatica",
name
: 
"Intersección Industrial Laboratorios Informática",
type
: 
"junction"
},
{

coords
: 
[20.654764280247676, -100.40422573685647],
id
: 
"camino-laboratorio-informatica-cafeteria-1",
name
: 
"Camino Laboratorio Informática Cafetería 1",
type
: 
"path"
},

{
    coords
: 
 [20.654740443454667, -100.40437996387482],
id
: 
"camino-laboratorio-informatica-izquierda",
name
: 
"Camino Laboratorio Informática Izquierda",
type
: 
"path"
}
,{

coords
: 
[20.654727897772627, -100.4044282436371],
id
: 
"salida-laboratorio-informatica",
name
: 
"Salida Laboratorio Informática",
type
: 
"junction"
},

{
    coords
: 
[20.65485209997912, -100.40446311235429],
id
: 
"entrada-laboratorio-informatica",
name
: 
"Entrada Laboratorio Informática",
type
: 
"path"
},
{
    coords
: 
[20.65521629759243, -100.4042485356331],
id
: 
"interseccion-informatica-ambiental",
name
: 
"Intersección Informática Ambiental",
type
: 
"junction"
},
{
    coords
: 
 [20.655234989755243, -100.40418416261674],
id
: 
"interseccion-ambiental-markting-1",
name
: 
"Intersección Ambiental Marketing 1",
type
: 
"junction"

}
,
{
   
coords
: 
 [20.65564001984964, -100.4042627417017],
id
: 
"interseccion-ambiental-markting-2",
name
: 
"Intersección Ambiental Marketing 2",
type
: 
"junction"
},
{

coords
: 
 [20.655692114181505, -100.40390609762996],
id
: 
"salida-marketing",
name
: 
"Salida Marketing",
type
: 
"junction"
},

{

coords
: 
 [20.655607382427792, -100.40386721538155],
id
: 
"entrada-marketing",
name
: 
"Entrada Marketing",
type
: 
"path"

},
{

coords
: 
[20.65592607605958, -100.40432244175744],
id
: 
"interseccion-derecha-nanotecnologia",
name
: 
"Intersección Derecha Nanotecnología",
type
: 
"junction"
},
{
    coords
: 
[20.656184036488494, -100.40438612316856],
id
: 
"interseccion-derecha-superior-nanotecnologia",
name
: 
"Intersección Derecha Superior Nanotecnología",
type
: 
"junction"
}
,
{
    coords
: 
 [20.65610371743208, -100.40481190612083],
id
: 
"interseccion-central-nanotecnologia",
name
: 
"Intersección Central Nanotecnología",
type
: 
"junction"
},{
    
coords
: 
 [20.655959555649215, -100.40478506427175],
id
: 
"interseccion-central-nanotecnologia-2",
name
: 
"Intersección Central Nanotecnología 2",
type
: 
"path"
},
{
    coords
: 
 [20.655911227258304, -100.40476830600564],
id
: 
"entrada-nanotecnologia",
name
: 
"Entrada Nanotecnología",
type
: 
"path"
},
{

coords
: 
[20.655928903539397, -100.40450739415009],
id
: 
"camino-grava-nanotecnologia",
name
: 
"Camino Grava Nanotecnología",
type
: 
"path"
},
{
    coords
: 
[20.656047902262262, -100.40509703003305],
id
: 
"interseccion-nanotecnologia-futbol",
name
: 
"Intersección Nanotecnología Fútbol",
type
: 
"junction"
}
,
{

coords
: 
[20.65594496910736, -100.40516540375864],
id
: 
"interseccion-izquierda-superior-nanotecnologia",
name
: 
"Intersección Izquierda Superior Nanotecnología",
type
: 
"junction"
},
{

coords
: 
 [20.655671317210185, -100.40516339276671],
id
: 
"interseccion-izquierda-nanotecnologia",
name
: 
"Intersección Izquierda Nanotecnología",
type
: 
"junction"
},
{

coords
: 
 [20.6556863806302, -100.40508898606531],
id
: 
"entrada-lateral-nanotecnologia",
name
: 
"Entrada Lateral Nanotecnología",
type
: 
"path"
}
,
{

coords
: 
 [20.656012396411978, -100.40520196820044],
id
: 
"interseccion-izquierda-superior-2-nanotecnologia",
name
: 
"Intersección Izquierda Superior 2 Nanotecnología",
type
: 
"junction"
},
{

coords
: 
 [20.655735199438123, -100.40580210789366],
id
: 
"interseccion-1-auditorio",
name
: 
"Intersección 1 Auditorio",
type
: 
"junction"
}
,{
    coords
: 
 [20.65580800592368, -100.4058724926112],
id
: 
"entrada-auditorio",
name
: 
"Entrada Auditorio",
type
: 
"path"
},
{
    coords
: 
 [20.655700679109525, -100.40597036088512],
id
: 
"interseccion-2-auditorio",
name
: 
"Intersección 2 Auditorio",
type
: 
"junction"
},
{
    coords
: 
 [20.65549669518945, -100.40594153666747],
id
: 
"interseccion-3-auditorio",
name
: 
"Intersección 3 Auditorio",
type
: 
"junction"
}
,
{

coords
: 
[20.6555337261368, -100.40573574515997],
id
: 
"interseccion-4-auditorio",
name
: 
"Intersección 4 Auditorio",
type
: 
"junction"
}
,
{
    coords
: 
[20.65550567380429, -100.40535109063248],
id
: 
"interseccion-nanotecnologia-auditorio",
name
: 
"Intersección Nanotecnología Auditorio",
type
: 
"junction"
},
{

coords
: 
 [20.655356710487734, -100.4059624587315],
id
: 
"pasillo-trasero-idiomas",
name
: 
"Pasillo Trasero Idiomas",
type
: 
"path"
},
{
    coords
: 
[20.654895426223376, -100.40586962038745],
id
: 
"interseccion-idiomas-edificio-j",
name
: 
"Intersección Idiomas Edificio J",
type
: 
"junction"
},
{
    coords
: 
 [20.654802534626185, -100.40628656604756],
id
: 
"salida-idiomas",
name
: 
"Salida Idiomas",
type
: 
"path"
},
{

coords
: 
[20.65492053205072, -100.40632142324104],
id
: 
"entrada-idiomas",
name
: 
"Entrada Idiomas",
type
: 
"path"
},
{

coords
: 
[20.654821949461503, -100.40617840544313],
id
: 
"interseccion-idiomas-musica",
name
: 
"Intersección Idiomas Música",
type
: 
"junction"
},
{

coords
: 
 [20.654589720249803, -100.40609126245948],
id
: 
"interseccion-musica-idiomas",
name
: 
"Intersección Música Idiomas",
type
: 
"junction"
},
{
    coords
: 
[20.654559593190953, -100.40618779007212],
id
: 
"entrada-musica",
name
: 
"Entrada Música",
type
: 
"path"
},
{

coords
: 
 [20.654223566241598, -100.40604363232512],
id
: 
"interseccion-servicios-escolares-rectoria",
name
: 
"Intersección Servicios Escolares Rectoría",
type
: 
"junction"
},
{
    coords
: 
[20.654023973884524, -100.40613479729261],
id
: 
"entrada-servicios-escolares",
name
: 
"Entrada Servicios Escolares",
type
: 
"path"
},
{
    coords
: 
[20.654251182773518, -100.40565953286651],
id
: 
"entrada-rectoria",
name
: 
"Entrada Rectoría",
type
: 
"path"
},
{

coords
: 
 [20.653740384316986, -100.40517113468293],
id
: 
"entrada-dea",
name
: 
"Entrada DEA",
type
: 
"path"
},
{
    coords
: 
[20.653860893166122, -100.40519459625546],
id
: 
"interseccion-salida-dea",
name
: 
"Intersección Salida DEA",
type
: 
"junction"
},
{
    coords
: 
 [20.654010273794416, -100.40525157436014],
id
: 
"interseccion-salida-dea-2",
name
: 
"Intersección Salida DEA 2",
type
: 
"junction"
},
{

coords
: 
[20.65407680461522, -100.40497874978831],
id
: 
"interseccion-dea-tecnologias",
name
: 
"Intersección DEA Tecnologías",
type
: 
"junction"
},
{

coords
: 
 [20.654580330380657, -100.40510313278133],
id
: 
"interseccion-cafeteria-informatica",
name
: 
"Intersección Cafetería Informática",
type
: 
"junction"
},
{
    coords
: 
 [20.65466757329365, -100.40510916575715],
id
: 
"entrada-cafeteria-1",
name
: 
"Entrada Cafetería 1",
type
: 
"path"
},
{

coords
: 
[20.654627586048104, -100.40532935768405],
id
: 
"interseccion-cafeteria-1",
name
: 
"Intersección Cafetería 1",
type
: 
"junction"
},
{
    coords
: 
 [20.65450115438495, -100.40580126521998],
id
: 
"interseccion-cafeteria-rectoria",
name
: 
"Intersección Cafetería Rectoría",
type
: 
"junction"
},
{
    coords
: 
 [20.654627939099456, -100.40586896861494],
id
: 
"interseccion-rectoria-musica",
name
: 
"Intersección Rectoría Música",
type
: 
"junction"

}
,
{
    coords
: 
 [20.654220139447915, -100.40576404653525],
id
: 
"interseccion-rectoria-dea",
name
: 
"Intersección Rectoría DEA",
type
: 
"junction"
},
{
    coords
: 
[20.65392577200525, -100.40565545297106],
id
: 
"camino-dea-rectoria",
name
: 
"Camino DEA Rectoría",
type
: 
"path"
},
{
    coords
: 
 [20.654968087773653, -100.40543629208508],
id
: 
"interseccion-cafeteria-edificio-j",
name
: 
"Intersección Cafetería Edificio J",
type
: 
"junction"
},
{
    coords
: 
 [20.655108680286087, -100.4055187427542],
id
: 
"entrada-edificio-j",
name
: 
"Entrada Edificio J",
type
: 
"path"
},
{

coords
: 
 [20.655021437626278, -100.40524859950499],

id
: 
"interseccion-cafeteria-oxxo",
name
: 
"Intersección Cafetería OXXO",
type
: 
"junction"
},
{
    coords
: 
 [20.655046543432796, -100.40518022577933],
id
: 
"entrada-oxxo",
name
: 
"Entrada OXXO",
type
: 
"path"
},
{
    coords
: 
 [20.65482362628188, -100.40516073905806],
id
: 
"salida-cafeteria-2",
name
: 
"Salida Cafetería 2",
type
: 
"junction"
},
{
    coords
: 
 [20.65474231757991, -100.40512045786907],
id
: 
"entrada-cafeteria-2",
name
: 
"Entrada Cafetería 2",
type
: 
"path"
},
{

coords
: 
 [20.65506421391174, -100.40510541115069],
id
: 
"salida-enfermeria",
name
: 
"Salida Enfermería",
type
: 
"junction"
},
{
    coords
: 
 [20.655168342810796, -100.40513357928158],
id
: 
"entrada-enfermeria",
name
: 
"Entrada Enfermería",
type
: 
"path"

},
{

coords
: 
[20.65516955484019, -100.40453144526019],
id
: 
"salida-ambiental",
name
: 
"Salida Ambiental",
type
: 
"junction"
},
{

coords
: 
 [20.655297594285287, -100.40456965410684],

id
: 
"entrada-ambiental",
name
: 
"Entrada Ambiental",
type
: 
"path"
},
{

coords
: 
 [20.65623728643646, -100.4040847379999],
id
: 
"interseccion-stallantis-nanotecnologia",
name
: 
"Intersección Stellantis Nanotecnología",
type
: 
"junction"
},
{
    coords
: 
 [20.656258626201538, -100.40351495695309],
id
: 
"salida-stellantis",
name
: 
"Salida Stellantis",
type
: 
"path"
},
{

coords
: 
 [20.656340267524538, -100.40352656182897],

id
: 
"entrada-stellantis",
name
: 
"Entrada Stellantis",
type
: 
"path"
},
{
    coords
: 
 [20.6564569199081, -100.4038983786271],
id
: 
"interseccion-stellantis-cic4.0",
name
: 
"Intersección Stellantis CIC4.0",
type
: 
"junction"
},
{
    coords
: 
[20.656731776632817, -100.40391812195932],
id
: 
"esquina-rotonda-cic4.0-1",
name
: 
"Esquina Rotonda CIC4.0 1",
type
: 
"junction"
},
{
    coords
: 
 [20.65677069019323, -100.40375925359686],
id
: 
"esquina-rotonda-cic4.0-2",
name
: 
"Esquina Rotonda CIC4.0 2",
type
: 
"path"
},
{
    coords
: 
 [20.65692418192844, -100.40375748350502],
id
: 
"esquina-rotonda-cic4.0-3",
name
: 
"Esquina Rotonda CIC4.0 3",
type
: 
"junction"
},
{coords
: 
 [20.657153897027488, -100.40364620861824],
id
: 
"esquina-cic4.0-1",
name
: 
"Esquina CIC4.0 1",
type
: 
"path"}
,
{

coords
: 
 [20.657202966754053, -100.40348894885184],
id
: 
"salida-cic4.0",
name
: 
"Salida CIC4.0",
type
: 
"path"
},
{

coords
: 
 [20.657260103894604, -100.4035043549329],
id
: 
"entrada-cic4.0",
name
: 
"Entrada CIC4.0",
type
: 
"path"
},
{

coords
: 
 [20.656954096669836, -100.4038621139538],

id
: 
"esquina-cic4.0-4",
name
: 
"Esquina CIC4.0 4",
type
: 
"junction"
},
{
    coords
: 
 [20.65721378827279, -100.4039063781595],
id
: 
"camino-pidet-1",
name
: 
"Camino PIDET 1",
type
: 
"path"
},
{

coords
: 
[20.657348024821122, -100.40379236429635],
id
: 
"camino-pidet-2",
name
: 
"Camino PIDET 2",
type
: 
"path"
}
,
{

coords
: 
[20.657493552160105, -100.40382187376682],
id
: 
"camino-pidet-3",
name
: 
"Camino PIDET 3",
type
: 
"path"
},
{

coords
: 
 [20.65754749760382, -100.40359116336136],
id
: 
"camino-pidet-4",
name
: 
"Camino PIDET 4",
type
: 
"path"
},
{

coords
: 
 [20.657815969992345, -100.40345032270687],
id
: 
"entrada-pidet",
name
: 
"Entrada PIDET",
type
: 
"path"
},
{
    coords
: 
 [20.656532418263147, -100.40521759557647],
id
: 
"interseccion-canchas",
name
: 
"Intersección Canchas",
type
: 
"junction"
},
{

coords
: 
 [20.656510450897446, -100.40539456286629],
id
: 
"entrada-canchas-basquetbol",
name
: 
"Entrada Canchas Basquetbol",
type
: 
"path"
},
{

coords
: 
[20.65688616495988, -100.40530409502082],
id
: 
"entrada-canchas-futbol",
name
: 
"Entrada Canchas Futbol",
type
: 
"path"
}

];

export const CAMPUS_EDGES:CampusEdge[]=[
{

from:'biblioteca',

to:'salida-biblioteca',

distance:5

},

{

from:'salida-biblioteca',

to:'salida-biblioteca-1',

distance:5

},

{

from:'salida-biblioteca-1',

to:'salida-biblioteca-2',

distance:5

},

{
from:'salida-biblioteca-2',

to:'salida-biblioteca-3',

distance:5
},
{
from:'salida-biblioteca-3',

to:'interseccion-biblioteca',

distance:5
},
{
from:'interseccion-biblioteca',

to:'salida-industrial-1',

distance:5
},
{
    from:'interseccion-biblioteca',

    to:'salida-industrial-2',

    distance:10
},
{
from:'salida-industrial-2',

to:'pasillo-industrial-tecnologias',

distance:10
},
{
from:'pasillo-industrial-tecnologias',

to:'interseccion-industrial-tecnologias',

distance:2
},
{
from:'interseccion-industrial-tecnologias',

to:'salida-tecnologias-d',

distance:10
},
{
from:'salida-tecnologias-d',

to:'interseccion-tecnologias-1',

distance:5
},
{
from:'interseccion-tecnologias-1',

to:'salida-tecnologias-e',

distance:5
},
{
from:'interseccion-tecnologias-1',

to:'salida-tecnologias-i',

distance:10
},
{
from:'salida-tecnologias-i',
to:'interseccion-tecnologias-2',

distance:2

},
{
from:'camino-tecnologias-dea',
to:'interseccion-tecnologias-dea',
distance:2
},
{
from:'interseccion-tecnologias-2',
to:'camino-tecnologias-dea',

distance:5
},
{
    from:'interseccion-tecnologias-dea',
    to:'camino-dea-industrial-1',
    distance:2
},
{
from:'camino-dea-industrial-1',
to:'camino-dea-industrial-2',

distance:5
},
{
from:'camino-dea-industrial-2',

to:'camino-dea-industrial-3',

distance:5
},
{
from:'camino-dea-industrial-3',

to:'interseccion-dea-industrial',

distance:5
},
{
from:'interseccion-dea-industrial',

to:'camino-industrial-estatua-1',

distance:5
},
{
from:'camino-industrial-estatua-1',

to:'camino-industrial-estatua-2',

distance:5
},
{
from:'camino-industrial-estatua-2',

to:'interseccion-industrial-estatua',

distance:5
},
{
from:'interseccion-industrial-estatua',

to:'camino-industrial-estatua-3',

distance:5
},
{
from:'camino-industrial-estatua-3',

to:'camino-hacia-industrial',

distance:5
},
{
from:'camino-hacia-industrial',

to:'interseccion-industrial-1',

distance:5
},
{
from:'interseccion-industrial-1',
to:'camino-entrada-1',

distance:5
},
{
from:'interseccion-industrial-1',

to:'camino-2',

distance:5
},
{
from:'camino-2',

to:'camino-laboratorio-industrial',

distance:5
},
{
from:'camino-laboratorio-industrial',
to:'entrada-laboratorio-industrial',

distance:5
},
{
from:'camino-2',
to:'camino-laboratorio-industrial-2',

distance:5
},
{
from:'camino-laboratorio-industrial-2',

to:'interseccion-laboratorio-industrial',

distance:2
},
{
from:'interseccion-laboratorio-industrial',

to:'camino-tecnologias',

distance:2
},
{
from:'camino-tecnologias',
to:'camino-tecnologias-2',

distance:5
},
{
from:'camino-tecnologias-2',
to:'interseccion-industrial-tecnologias',
distance:3
},
{
    from:'interseccion-laboratorio-industrial',
    to:'camino-entrada-laboratorio-industrial',
    distance:2
},
{
from:'camino-entrada-laboratorio-industrial',
to:'camino-entrada-mantenimiento',

distance:5
},
{
from:'camino-entrada-mantenimiento',
to:'interseccion-entrada-mantenimiento',

distance:2
},
{
from:'interseccion-entrada-mantenimiento',
to:'camino-entrada-mantenimiento-2',

distance:2

},
{
from:'camino-entrada-mantenimiento-2',
to:'interseccion-entrada-mantenimiento-2',

distance:2
},
{
from:'interseccion-entrada-mantenimiento-2',
to:'camino-mantenimiento-dea',

distance:2
},
{
    from:'camino-mantenimiento-dea',
    to:'interseccion-dea-industrial',   
distance:5
},
{
    from:'interseccion-biblioteca',
    to:'camino-industrial-laboratorios-informatica',
    distance:6
},
{
from:'camino-industrial-laboratorios-informatica',
to:'interseccion-industrial-laboratorios-informatica',

distance:2
},
{
from:'interseccion-industrial-laboratorios-informatica',
to:'camino-laboratorio-informatica-cafeteria-1',

distance:2
},
{
from:'camino-laboratorio-informatica-cafeteria-1',
to:'camino-laboratorio-informatica-izquierda',

distance:5
},
{
from:'camino-laboratorio-informatica-izquierda',
to:'salida-laboratorio-informatica',

distance:2
},
{
    from:'salida-laboratorio-informatica',
    to:'entrada-laboratorio-informatica',
    distance:5
}
,
{
from:'interseccion-industrial-laboratorios-informatica',
to:'interseccion-informatica-ambiental',
distance:12
},
{
from:'interseccion-informatica-ambiental',
to:'interseccion-ambiental-markting-1',

distance:3
},
{
from:'interseccion-ambiental-markting-1',
to:'interseccion-ambiental-markting-2',

distance:10
},
{
from:'interseccion-ambiental-markting-2',
to:'salida-marketing',

distance:9
},
{
from:'salida-marketing',
to:'entrada-marketing',
distance:5
},
{
   from:'interseccion-ambiental-markting-2',
    to:'interseccion-derecha-nanotecnologia',
    distance:5 
},
{
from:'interseccion-derecha-nanotecnologia',
to:'interseccion-derecha-superior-nanotecnologia',

distance:4
},
{
from:'interseccion-derecha-superior-nanotecnologia',
to:'interseccion-central-nanotecnologia',

distance:4
},
{
from:'interseccion-central-nanotecnologia',
to:'interseccion-central-nanotecnologia-2',
distance:3
},
{
from:'interseccion-central-nanotecnologia-2',
to:'entrada-nanotecnologia',
distance:1
}
,
{
    from:'interseccion-central-nanotecnologia-2',
to:'camino-grava-nanotecnologia',
distance:3
},
{
from:'camino-grava-nanotecnologia',
to:'interseccion-derecha-nanotecnologia',
distance:3
}
,{
from:'interseccion-izquierda-superior-nanotecnologia',
to:'interseccion-izquierda-nanotecnologia',
distance:4
},
{
from:'interseccion-izquierda-nanotecnologia',
to:'entrada-lateral-nanotecnologia',
distance:1
}
,{
from:'interseccion-izquierda-superior-nanotecnologia',
to:'interseccion-izquierda-superior-2-nanotecnologia',
distance:1
}
,{
from:'interseccion-izquierda-superior-2-nanotecnologia',
to:'interseccion-1-auditorio',
distance:9
},
{
from:'interseccion-1-auditorio',
to:'entrada-auditorio',
distance:2
}
,{
from:'interseccion-1-auditorio',
to:'interseccion-2-auditorio',
distance:2
}
,{
from:'interseccion-2-auditorio',
to:'interseccion-3-auditorio',
distance:2
},
{
from:'interseccion-3-auditorio',
to:'interseccion-4-auditorio',
distance:2
},
{
from:'interseccion-4-auditorio',
to:'interseccion-nanotecnologia-auditorio',
distance:5
},
{
from:'interseccion-nanotecnologia-auditorio',
to:'interseccion-izquierda-nanotecnologia',
distance:5
},
{
from:'interseccion-central-nanotecnologia',
to:'interseccion-nanotecnologia-futbol',
distance:3
}
,{
from:'interseccion-nanotecnologia-futbol',
to:'interseccion-izquierda-superior-nanotecnologia',
distance:1
}
,{from:'interseccion-nanotecnologia-futbol',
to:'interseccion-izquierda-superior-2-nanotecnologia',
distance:1
}
,{
    from:'interseccion-3-auditorio',
    to:'pasillo-trasero-idiomas',
    distance:3
},{
from:'pasillo-trasero-idiomas',
to:'interseccion-idiomas-edificio-j',
distance:5
},
{
from:'interseccion-idiomas-edificio-j',
to:'salida-idiomas',
distance:2
},
{
from:'salida-idiomas',
to:'entrada-idiomas',
distance:2
},
{
from:'interseccion-idiomas-musica',
to:'interseccion-musica-idiomas',
distance:3
},
{from:'interseccion-musica-idiomas',
to:'entrada-musica',
distance:1},
{
from:'interseccion-musica-idiomas',
to:'interseccion-servicios-escolares-rectoria',
distance:5
},
{
from:'interseccion-servicios-escolares-rectoria',
to:'entrada-servicios-escolares',
distance:3
},
{
from:'interseccion-servicios-escolares-rectoria',to:'entrada-rectoria',
distance:5
},
{
from:'entrada-dea',
to:'interseccion-salida-dea',
distance:2
},
{
from:'interseccion-salida-dea',
to:'interseccion-salida-dea-2',
distance:3
}
,
{
from:'interseccion-salida-dea-2',
to:'interseccion-dea-tecnologias',
distance:3
},

{
from:'interseccion-dea-tecnologias',
to:'interseccion-cafeteria-informatica',
distance:5
},{
from:'interseccion-cafeteria-informatica',
to:'entrada-cafeteria-1',
distance:2
},
{
from:'entrada-cafeteria-1', 
to:'interseccion-cafeteria-1',
distance:3
}
,{
from:'interseccion-cafeteria-1',
to:'interseccion-cafeteria-rectoria',
distance:4
},
{
    from:'interseccion-cafeteria-rectoria',
    to:'interseccion-rectoria-musica',
    distance:2
},
{
from:'interseccion-rectoria-musica',
to:'interseccion-musica-idiomas',
distance:3
},
{
    from:'interseccion-cafeteria-rectoria',
    to:'entrada-rectoria',
    distance:3
},
{
from:'interseccion-cafeteria-rectoria',
to:'interseccion-servicios-escolares-rectoria',
distance:4
}
,
{
from:'interseccion-rectoria-dea',
to:'camino-dea-rectoria',
distance:3
},
{
from:'camino-dea-rectoria',
to:'interseccion-salida-dea-2',
distance:6
},
{
from:'interseccion-rectoria-dea',
to:'interseccion-servicios-escolares-rectoria',
distance:3
},
{
from:'interseccion-rectoria-dea',
to:'entrada-rectoria',
distance:2
},
{
from:'interseccion-rectoria-dea',
to:'interseccion-cafeteria-rectoria',
distance:3
}
,
{
from:'interseccion-cafeteria-edificio-j',
to:'entrada-edificio-j',
distance:2
},
{
from:'interseccion-cafeteria-oxxo',
to:'entrada-oxxo',
distance:1
},
{
from:'salida-cafeteria-2',
to:'entrada-cafeteria-2',
distance:2
},
{
    from:'interseccion-cafeteria-oxxo',
    to:'interseccion-cafeteria-edificio-j',
    distance:3
},
{
    from:'interseccion-cafeteria-oxxo',
    to:'salida-cafeteria-2',
    distance:3
},
{
from:'interseccion-cafeteria-edificio-j',
to:'interseccion-idiomas-edificio-j',
distance:4
},
{
from:'interseccion-nanotecnologia-auditorio',
to:'interseccion-cafeteria-oxxo',
distance:6
},
{
from:'interseccion-cafeteria-edificio-j',
to:'interseccion-cafeteria-1',
distance:5
},
{
from:'entrada-oxxo',
to:'salida-enfermeria',
distance:1
},
{
from:'salida-enfermeria',
to:'entrada-enfermeria',
distance:2
},
{
    from:'interseccion-cafeteria-informatica',
    to:'salida-laboratorio-informatica',
    distance:12
},
{
from:'salida-ambiental',
to:'entrada-ambiental',
distance:2
},
{
from:'salida-ambiental',
to:'salida-enfermeria',
distance:8
},
{
from:'salida-ambiental',
to:'interseccion-informatica-ambiental',
distance:4
}
,
{
from:'interseccion-stallantis-nanotecnologia',
to:'salida-stellantis',
distance:4
},
{
from:'interseccion-stallantis-nanotecnologia',
to:'interseccion-derecha-superior-nanotecnologia',
distance:3
},
{
from:'salida-stellantis',
to:'entrada-stellantis',
distance:1
}
,
{
from:'interseccion-stellantis-cic4.0',
to:'esquina-rotonda-cic4.0-1',
distance:3
},

{
from:'esquina-rotonda-cic4.0-1',
to:'esquina-rotonda-cic4.0-2',
distance:2
},
{from:'esquina-rotonda-cic4.0-2',
to:'esquina-rotonda-cic4.0-3',
distance:2
},
{
from:'esquina-rotonda-cic4.0-3',
to:'esquina-cic4.0-1',
distance:3
},
{
from:'esquina-cic4.0-1',
to:'salida-cic4.0',
distance:2
},
{
from:'salida-cic4.0',
to:'entrada-cic4.0',
distance:1
},
{from:'interseccion-stellantis-cic4.0',
to:'interseccion-stallantis-nanotecnologia',
distance:3
},
{
from:'esquina-cic4.0-4',
to:'camino-pidet-1',
distance:2
},
{

    from:'esquina-cic4.0-4',
    to:'esquina-rotonda-cic4.0-1',
    distance:3
},

{
from:'camino-pidet-1',
to:'camino-pidet-2',
distance:3
},
{
from:'camino-pidet-2',to:'camino-pidet-3',
distance:3
},
{
from:'camino-pidet-3',to:'camino-pidet-4',
distance:3
},
{
from:'camino-pidet-4',to:'entrada-pidet',
distance:2  
},
{
from:'interseccion-canchas',
to:'entrada-canchas-basquetbol',
distance:3

},
{
from:'interseccion-canchas',
to:'entrada-canchas-futbol',
distance:3
},
{
    from:'interseccion-nanotecnologia-futbol',
    to:'interseccion-canchas',
    distance:3
},
{
    from:'interseccion-tecnologias-2',
    to:'interseccion-dea-tecnologias',
    distance:1
}

];
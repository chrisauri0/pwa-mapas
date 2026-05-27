import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import * as L from 'leaflet';
import { NgZone } from '@angular/core';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-map-component',
  standalone:true,
  imports:[CommonModule],
  templateUrl:'./map-component.html',
  styleUrl:'./map-component.scss',
})

export class MapComponent implements OnInit{

  constructor(
private zone:NgZone
){}

  layers=[

    'almacen-industrial',
    'auditorio',
    'biblioteca',
    'cafeteria',
    'camino-grande',
    'cancha-atletismo',
    'cancha-basquetbol',
    'cancha-fut7',
    'cancha-futbol',
    'CIC4.0',
    'edificio-dea',
    'edificio-h',
    'edificio-i',
    'edificio-idiomas',
    'edificio-industrial',
    'edificio-j',
    'edificio-k',
    'edificio-marketing',
    'edificio-nano',
    'enfermeria',
    'frame-campus',
    'graphlogico',
    'laboratorio-industrial',
    'laboratorio-mantenimineto',
    'PIDET',
    'rectoria',
    'sala-de-tv',
    'stellantis',
    'talent-hub-servicios-escolares'

  ];

  readonly MAP_WIDTH = 860;
  readonly MAP_HEIGHT = 1016;

  readonly MIN_LAT = 20.653162;
  readonly MAX_LAT = 20.658593;

  readonly MIN_LNG = -100.407434;
  readonly MAX_LNG = -100.402883;

  userX=0;
  userY=0;
  debugLat=0;
debugLng=0;
debugAccuracy=0;
callbackCount=0;



insideCampus=false;

  loadedLayers:string[]=[];
  failedLayers:string[]=[];





map!:L.Map;

ngAfterViewInit(){

this.map = L.map(
'campus-map'
).setView(
[20.656,-100.405],
18
);

L.tileLayer(

'https://tile.openstreetmap.org/{z}/{x}/{y}.png',

{

attribution:'OpenStreetMap'

}

).addTo(this.map);


const bounds:L.LatLngBoundsExpression=[

[20.658593,-100.406429],

[20.653162,-100.402883]

];

L.imageOverlay(

'assets/maps/frame-campus.svg',

bounds,

{

opacity:0.8

}

).addTo(this.map);


navigator.geolocation.watchPosition(

(position)=>{

const lat=
position.coords.latitude;

const lng=
position.coords.longitude;

L.circleMarker(

[lat,lng],

{

radius:8,

color:'red'

}

).addTo(this.map);

}

);
}





testGps(){

console.log('button works');

navigator.geolocation.getCurrentPosition(

(position)=>{

alert(
'GPS OK: ' +

position.coords.latitude +

' , ' +

position.coords.longitude
);

},

(error)=>{

alert(
'GPS ERROR: ' +

JSON.stringify(error)
);

}

);

}
  
  gpsToSvg(
lat:number,
lng:number
){

const westTop = -100.406429;
const eastTop = -100.402883;

const westBottom = -100.407434;
const eastBottom = -100.403767;

const topLat = 20.658593;
const bottomLat = 20.653162;

const verticalFactor =

(topLat-lat) /

(topLat-bottomLat);

const leftLng =

westTop +

(verticalFactor *

(westBottom-westTop));

const rightLng =

eastTop +

(verticalFactor *

(eastBottom-eastTop));

const horizontalFactor =

(lng-leftLng) /

(rightLng-leftLng);

return{

x:
horizontalFactor
*
this.MAP_WIDTH,

y:
verticalFactor
*
this.MAP_HEIGHT

};

}
  isInsideCampus(
    lat:number,
    lng:number
  ){

    return(

      lat >= this.MIN_LAT &&
      lat <= this.MAX_LAT &&

      lng >= this.MIN_LNG &&
      lng <= this.MAX_LNG

    );

  }

  loaded(layer:string){

    console.log(
      'loaded:',
      layer
    );

    this.loadedLayers.push(layer);

  }

  error(layer:string){

    console.log(
      'ERROR:',
      layer
    );

    this.failedLayers.push(layer);

  }


  rotatePoint(
x:number,
y:number,
angle:number
){

const cx =
this.MAP_WIDTH/2;

const cy =
this.MAP_HEIGHT/2;

const radians =
angle*Math.PI/180;

const dx=x-cx;
const dy=y-cy;

return{

x:
cx +
(dx*Math.cos(radians))
-
(dy*Math.sin(radians)),

y:
cy +
(dx*Math.sin(radians))
+
(dy*Math.cos(radians))

};

}

  

  ngOnInit(){
    console.log(
      'MapComponent initialized'
    );

navigator.geolocation.watchPosition(

(position)=>{

this.zone.run(()=>{

this.callbackCount++;

const lat =
position.coords.latitude;

const lng =
position.coords.longitude;

const accuracy =
position.coords.accuracy;

this.debugLat=lat;
this.debugLng=lng;
this.debugAccuracy=accuracy;

const svg =
this.gpsToSvg(lat,lng);


const rotated =
this.rotatePoint(
svg.x,
svg.y,
-5
);

this.userX=rotated.x;
this.userY=rotated.y;

this.userX=svg.x;
this.userY=svg.y;
setInterval(()=>{

this.userX+=20;
this.userY+=20;

},1000);



});

},

(error)=>{

console.error(error);

}

);
  }

}
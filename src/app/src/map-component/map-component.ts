import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

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

    const normalizedLng =

      (lng-this.MIN_LNG) /

      (this.MAX_LNG-this.MIN_LNG);

    const normalizedLat =

      (this.MAX_LAT-lat) /

      (this.MAX_LAT-this.MIN_LAT);

    return{

      x:
      normalizedLng*this.MAP_WIDTH,

      y:
      normalizedLat*this.MAP_HEIGHT

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
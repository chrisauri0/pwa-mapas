import * as L from 'leaflet';

export interface CampusNode{

id:string;

name:string;

coords:L.LatLngExpression;
type:'building'|'junction'|'path';

}

export interface CampusEdge{

from:string;

to:string;

distance:number;

}
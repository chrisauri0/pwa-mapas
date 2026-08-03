import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Edificio } from '../hooks/models/models-dashboard';

@Injectable({ providedIn: 'root' })
export class EdificiosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/edificios';

  getEdificios(): Observable<Edificio[]> {
    return this.http.get<Edificio[]>(this.apiUrl);
  }
}
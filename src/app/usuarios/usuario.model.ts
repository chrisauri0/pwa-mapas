// Entity: representa una fila de la tabla "usuarios"
export interface Usuario {
  id?: number;        // lo genera SQLite (AUTOINCREMENT)
  nombre: string;
  edad: number;
  profesion: string;  // carrera
  correo: string;     // 🆕 Caso 4
}

import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Usuario } from './usuario.model';

const DB_NAME = 'mapa_uteq';
const DB_VERSION = 2; // 🆕 Caso 4: v1 = tabla original, v2 = columna correo

// DAO: todas las operaciones sobre la tabla usuarios (equivalente al @Dao de Room)
@Injectable({ providedIn: 'root' })
export class UsuarioDao {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db?: SQLiteDBConnection;
  private listo?: Promise<void>;

  // Abre la base una sola vez; si falla, permite reintentar
  private iniciar(): Promise<void> {
    if (!this.listo) {
      this.listo = this.abrir().catch(e => { this.listo = undefined; throw e; });
    }
    return this.listo;
  }

  private async abrir(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('SQLite solo está disponible en el dispositivo (Android)');
    }
    console.log('🗄️ [DAO] Abriendo base de datos...');
    const consistente = (await this.sqlite.checkConnectionsConsistency()).result;
    const existe = (await this.sqlite.isConnection(DB_NAME, false)).result;
    this.db = consistente && existe
      ? await this.sqlite.retrieveConnection(DB_NAME, false)
      : await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    await this.db.open();

    // Estructura original (versión 1)
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre    TEXT    NOT NULL,
        edad      INTEGER NOT NULL,
        profesion TEXT    NOT NULL
      );
    `);

    await this.migrar(); // 🆕 Caso 4
    console.log('✅ [DAO] Tabla usuarios lista (versión', DB_VERSION + ')');
  }

  // 🆕 Caso 4: migración. Conserva los registros que ya existían.
  private async migrar(): Promise<void> {
    const res = await this.db!.query('PRAGMA user_version;');
    const version = Number(res.values?.[0]?.user_version ?? 0);
    console.log('🔎 [DAO] Versión actual de la base:', version);

    if (version < 2) {
      console.log('🔧 [DAO] Migrando a v2: agregando columna correo');
      await this.db!.execute(`ALTER TABLE usuarios ADD COLUMN correo TEXT NOT NULL DEFAULT '';`);
      await this.db!.execute('PRAGMA user_version = 2;');
    }
  }

  async insertar(u: Usuario): Promise<number> {
    await this.iniciar();
    const res = await this.db!.run(
      'INSERT INTO usuarios (nombre, edad, profesion, correo) VALUES (?, ?, ?, ?);', // 🆕 correo
      [u.nombre, u.edad, u.profesion, u.correo]
    );
    console.log('➕ [DAO] Insertado id', res.changes?.lastId);
    return res.changes?.lastId ?? 0;
  }

  async obtenerTodos(): Promise<Usuario[]> {
    await this.iniciar();
    const res = await this.db!.query(
      'SELECT id, nombre, edad, profesion, correo FROM usuarios ORDER BY id;' // 🆕 correo
    );
    console.log('📋 [DAO] Registros:', res.values?.length ?? 0);
    return (res.values ?? []) as Usuario[];
  }

  async actualizar(u: Usuario): Promise<void> {
    await this.iniciar();
    await this.db!.run(
      'UPDATE usuarios SET nombre = ?, edad = ?, profesion = ?, correo = ? WHERE id = ?;', // 🆕 correo
      [u.nombre, u.edad, u.profesion, u.correo, u.id]
    );
    console.log('✏️ [DAO] Actualizado id', u.id);
  }

  async eliminar(id: number): Promise<void> {
    await this.iniciar();
    await this.db!.run('DELETE FROM usuarios WHERE id = ?;', [id]);
    console.log('🗑️ [DAO] Eliminado id', id);
  }
}

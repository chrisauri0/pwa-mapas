import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsuarioDao } from './usuario.dao';
import { Usuario } from './usuario.model';

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class UsuariosComponent {
  private dao = inject(UsuarioDao);

  usuarios = signal<Usuario[]>([]);
  mostrando = signal(false);
  editandoId = signal<number | null>(null);
  mensaje = signal('');
  esError = signal(false);

  form = { nombre: '', edad: null as number | null, profesion: '', correo: '' }; // 🆕 correo

  async guardar() {
    const { nombre, edad, profesion, correo } = this.form;
    if (!nombre.trim() || !edad || !profesion.trim() || !correo.trim()) {
      this.avisar('Completa nombre, edad, carrera y correo.', true);
      return;
    }
    // 🆕 Caso 4: validación básica del correo
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      this.avisar('Escribe un correo válido, por ejemplo ana@uteq.edu.mx.', true);
      return;
    }
    const datos: Usuario = {
      nombre: nombre.trim(),
      edad: Number(edad),
      profesion: profesion.trim(),
      correo: correo.trim().toLowerCase(), // 🆕 correo
    };

    try {
      const id = this.editandoId();
      if (id === null) {
        await this.dao.insertar(datos);
        this.avisar('Usuario registrado.');
      } else {
        await this.dao.actualizar({ ...datos, id });
        this.avisar('Usuario actualizado.');
      }
      this.limpiar();
      if (this.mostrando()) await this.verUsuarios();
    } catch (e) {
      console.error('❌ [Usuarios] guardar', e);
      this.avisar('No se pudo guardar el usuario.', true);
    }
  }

  // Botón "VER usuarios" -> dao.obtenerTodos()
  async verUsuarios() {
    try {
      this.usuarios.set(await this.dao.obtenerTodos());
      this.mostrando.set(true);
    } catch (e) {
      console.error('❌ [Usuarios] obtenerTodos', e);
      this.avisar('No se pudo leer la base de datos.', true);
    }
  }

  editar(u: Usuario) {
    this.editandoId.set(u.id!);
    this.form = { nombre: u.nombre, edad: u.edad, profesion: u.profesion, correo: u.correo ?? '' }; // 🆕 correo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async eliminar(u: Usuario) {
    if (!confirm(`¿Eliminar a ${u.nombre}?`)) return;
    try {
      await this.dao.eliminar(u.id!);
      if (this.editandoId() === u.id) this.limpiar();
      this.avisar('Usuario eliminado.');
      await this.verUsuarios();
    } catch (e) {
      console.error('❌ [Usuarios] eliminar', e);
      this.avisar('No se pudo eliminar el usuario.', true);
    }
  }

  limpiar() {
    this.editandoId.set(null);
    this.form = { nombre: '', edad: null, profesion: '', correo: '' }; // 🆕 correo
  }

  private avisar(texto: string, error = false) {
    this.mensaje.set(texto);
    this.esError.set(error);
    setTimeout(() => this.mensaje.set(''), 3000);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SqliteApiFallbackService } from './sqlite-api-fallback.service';
import { Task } from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private apiUrl = 'http://192.168.1.6:3000/tasks'; // Cambia si usas otro puerto o despliegue

  constructor(
    private http: HttpClient,
    private sqliteService: SqliteApiFallbackService
  ) {}

  /**
   * Envía tareas locales no sincronizadas al backend
   */
  async syncToServer(): Promise<Task[]> {
    await this.sqliteService.createDB();
    const allTasks = await this.sqliteService.getTasks();
    const unsynced = allTasks.filter(t => !t.isSynced);
    if (unsynced.length === 0) return [];
    console.log('[SyncService] Enviando tareas no sincronizadas:', unsynced);
    try {
      const res: any = await firstValueFrom(this.http.post(`${this.apiUrl}/sync`, { tasks: unsynced }));
      console.log('[SyncService] Respuesta de la API /sync:', res);
      // Marcar como sincronizadas en SQLite
      for (const t of unsynced) {
        t.isSynced = true;
        await this.sqliteService.updateTask(t);
      }
      return res.updated || [];
    } catch (error) {
      let errorMsg = '[SyncService] Error al sincronizar con la API /sync:';
      try {
        errorMsg += '\n' + JSON.stringify(error);
      } catch (e) {
        errorMsg += '\n' + String(error);
      }
      console.error(errorMsg);
      throw error;
    }
  }

  /**
   * Descarga tareas del backend y actualiza SQLite
   */
  async fetchFromServer(): Promise<Task[]> {
    await this.sqliteService.createDB();
    console.log('[SyncService] Descargando tareas del backend...');
    try {
      const res: any = await firstValueFrom(this.http.get(this.apiUrl));
      console.log('[SyncService] Respuesta de la API /tasks:', res);
      if (!res.tasks) return [];
      // Actualiza o inserta tareas en SQLite
      for (const t of res.tasks) {
        await this.sqliteService.updateTask({ ...t, isSynced: true });
      }
      return res.tasks;
    } catch (error) {
      let errorMsg = '[SyncService] Error al descargar tareas del backend:';
      try {
        errorMsg += '\n' + JSON.stringify(error);
      } catch (e) {
        errorMsg += '\n' + String(error);
      }
      console.error(errorMsg);
      throw error;
    }
  }

  /**
   * Sincronización completa (envía y recibe)
   */
  async fullSync(): Promise<void> {
    try {
      await this.syncToServer();
    } catch (e) {
      console.error('[SyncService] Error en syncToServer:', e);
    }
    try {
      await this.fetchFromServer();
    } catch (e) {
      console.error('[SyncService] Error en fetchFromServer:', e);
    }
  }
}

// npx cap open android

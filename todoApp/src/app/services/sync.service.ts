import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SqliteService } from './sqlite.service';
import { Task } from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private apiUrl = 'http://localhost:3000/tasks'; // Cambia si usas otro puerto o despliegue

  constructor(
    private http: HttpClient,
    private sqliteService: SqliteService
  ) {}

  /**
   * Envía tareas locales no sincronizadas al backend
   */
  async syncToServer(): Promise<Task[]> {
    await this.sqliteService.createDB();
    const allTasks = await this.sqliteService.getTasks();
    const unsynced = allTasks.filter(t => !t.isSynced);
    if (unsynced.length === 0) return [];
    const res: any = await firstValueFrom(this.http.post(`${this.apiUrl}/sync`, { tasks: unsynced }));
    // Marcar como sincronizadas en SQLite
    for (const t of unsynced) {
      t.isSynced = true;
      await this.sqliteService.updateTask(t);
    }
    return res.updated || [];
  }

  /**
   * Descarga tareas del backend y actualiza SQLite
   */
  async fetchFromServer(): Promise<Task[]> {
    await this.sqliteService.createDB();
    const res: any = await firstValueFrom(this.http.get(this.apiUrl));
    if (!res.tasks) return [];
    // Actualiza o inserta tareas en SQLite
    for (const t of res.tasks) {
      await this.sqliteService.updateTask({ ...t, isSynced: true });
    }
    return res.tasks;
  }

  /**
   * Sincronización completa (envía y recibe)
   */
  async fullSync(): Promise<void> {
    await this.syncToServer();
    await this.fetchFromServer();
  }
}

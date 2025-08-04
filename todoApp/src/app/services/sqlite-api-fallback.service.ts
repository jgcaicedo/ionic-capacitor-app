import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SQLiteConnection, SQLiteDBConnection, CapacitorSQLite } from '@capacitor-community/sqlite';
import { HttpClient } from '@angular/common/http';
import { Task } from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SqliteApiFallbackService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private dbName = 'todoapp.db';
  private tableName = 'tasks';
  private apiUrl = 'http://192.168.1.6:3000/tasks'; // Cambia si usas otro puerto
  private isNative: boolean;

  constructor(private http: HttpClient) {
    this.isNative = Capacitor.isNativePlatform();
    if (this.isNative) {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
    } else {
      this.sqlite = null;
    }
  }

  async createDB(): Promise<void> {
    if (!this.isNative) return; // En web, no hace nada
    const isConn = await this.sqlite!.isConnection(this.dbName, false);
    if (isConn.result && this.db) return;
    this.db = await this.sqlite!.createConnection(
      this.dbName, false, 'no-encryption', 1, false
    );
    await this.db.open();
    const createTableSQL = `CREATE TABLE IF NOT EXISTS ${this.tableName} (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      isCompleted INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      isSynced INTEGER NOT NULL
    );`;
    await this.db.execute(createTableSQL);
  }

  async addTask(task: Task): Promise<void> {
    if (this.isNative) {
      if (!this.db) await this.createDB();
      const sql = `INSERT INTO ${this.tableName} (id, title, description, isCompleted, createdAt, updatedAt, isSynced) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const values = [
        task.id,
        task.title,
        task.description || '',
        task.isCompleted ? 1 : 0,
        task.createdAt,
        task.updatedAt,
        task.isSynced ? 1 : 0
      ];
      await this.db!.run(sql, values);
    } else {
      await firstValueFrom(this.http.post(this.apiUrl, task));
    }
  }

  async getTasks(): Promise<Task[]> {
    if (this.isNative) {
      if (!this.db) await this.createDB();
      const sql = `SELECT * FROM ${this.tableName}`;
      const res = await this.db!.query(sql);
      return res.values?.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        isCompleted: !!row.isCompleted,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isSynced: !!row.isSynced
      })) || [];
    } else {
      const res: any = await firstValueFrom(this.http.get(this.apiUrl));
      return res.tasks || [];
    }
  }

  async updateTask(task: Task): Promise<void> {
    if (this.isNative) {
      if (!this.db) await this.createDB();
      const sql = `UPDATE ${this.tableName} SET title=?, description=?, isCompleted=?, updatedAt=?, isSynced=? WHERE id=?`;
      const values = [
        task.title,
        task.description || '',
        task.isCompleted ? 1 : 0,
        task.updatedAt,
        task.isSynced ? 1 : 0,
        task.id
      ];
      await this.db!.run(sql, values);
    } else {
      await firstValueFrom(this.http.put(`${this.apiUrl}/${task.id}`, task));
    }
  }

  async deleteTask(id: string): Promise<void> {
    if (this.isNative) {
      if (!this.db) await this.createDB();
      const sql = `DELETE FROM ${this.tableName} WHERE id=?`;
      await this.db!.run(sql, [id]);
    } else {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
    }
  }
}

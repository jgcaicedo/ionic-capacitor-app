
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SQLiteConnection, SQLiteDBConnection, CapacitorSQLite } from '@capacitor-community/sqlite';
import { Task } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private dbName = 'todoapp.db';
  private tableName = 'tasks';

  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
    } else {
      this.sqlite = null; // O puedes usar un mock para web
    }
  }

  /**
   * Crea la base de datos y la tabla de tareas si no existen
   */
  async createDB(): Promise<void> {
    if (!this.sqlite) throw new Error('SQLite solo disponible en dispositivo móvil');
    // Si ya hay una conexión abierta, reutilízala
    const isConn = await this.sqlite.isConnection(this.dbName, false);
    if (isConn.result && this.db) {
      // Ya existe y está abierta
      return;
    }
    // Si no existe, créala
    this.db = await this.sqlite.createConnection(
      this.dbName, // database
      false,       // encrypted
      'no-encryption', // mode
      1,           // version
      false        // readonly
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

  /**
   * Agrega una tarea a la base de datos
   */
  async addTask(task: Task): Promise<void> {
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
  }

  /**
   * Obtiene todas las tareas de la base de datos
   */
  async getTasks(): Promise<Task[]> {
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
  }

  /**
   * Actualiza una tarea existente
   */
  async updateTask(task: Task): Promise<void> {
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
  }

  /**
   * Elimina una tarea por id
   */
  async deleteTask(id: string): Promise<void> {
    if (!this.db) await this.createDB();
    const sql = `DELETE FROM ${this.tableName} WHERE id=?`;
    await this.db!.run(sql, [id]);
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Task } from '../models';
import { SqliteService } from '../services/sqlite.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  
  // Estado de datos
  allTasks: Task[] = [];
  filteredTasks: Task[] = [];
  currentFilter: 'all' | 'pending' | 'completed' = 'all';
  
  // Estado de la aplicación
  isOnline: boolean = true;
  pendingSyncCount: number = 0;
  
  // Suscripciones para limpiar memoria
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private sqliteService: SqliteService
  ) {}

  ngOnInit() {
    console.log('🏠 HomePage initialized');
    this.loadInitialData();
    this.setupNetworkListener();
  }

  ngOnDestroy() {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Carga los datos iniciales y configura los listeners
   */
  private async loadInitialData() {
    await this.sqliteService.createDB();
    await this.loadTasksFromStorage();
    this.filterTasks();
  }

  /**
   * Configura el listener para detectar cambios de conectividad
   */
  private setupNetworkListener() {
    // TODO: Implementar con Capacitor Network plugin
    // Por ahora simulamos el estado online
    this.isOnline = navigator.onLine;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📶 App is online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 App is offline');
    });
  }

  /**
   * Carga las tareas desde el almacenamiento local
   * TODO: Conectar con SQLite service
   */
  private async loadTasksFromStorage() {
    this.allTasks = await this.sqliteService.getTasks();
    this.pendingSyncCount = this.allTasks.filter(task => !task.isSynced).length;
  }

  /**
   * Filtra las tareas según el filtro activo
   */
  filterTasks() {
    switch (this.currentFilter) {
      case 'pending':
        this.filteredTasks = this.allTasks.filter(task => !task.isCompleted);
        break;
      case 'completed':
        this.filteredTasks = this.allTasks.filter(task => task.isCompleted);
        break;
      default:
        this.filteredTasks = [...this.allTasks];
    }
  }

  /**
   * Navega a la página de creación de tareas
   */
  goToAddTask() {
    this.router.navigate(['/task-form']);
  }

  /**
   * Navega a la página de edición de una tarea
   */
  editTask(task: Task) {
    this.router.navigate(['/task-form'], { 
      queryParams: { id: task.id } 
    });
  }

  /**
   * Cambia el estado de completado de una tarea
   */
  async toggleTaskCompletion(task: Task) {
    try {
      task.isCompleted = !task.isCompleted;
      task.updatedAt = new Date().toISOString();
      task.isSynced = false;
      await this.sqliteService.updateTask(task);
      this.pendingSyncCount = this.allTasks.filter(t => !t.isSynced).length;
      this.filterTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      task.isCompleted = !task.isCompleted;
    }
  }

  /**
   * Elimina una tarea con confirmación
   */
  async deleteTask(task: Task) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar "${task.title}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.performDeleteTask(task);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Ejecuta la eliminación de la tarea
   */
  private async performDeleteTask(task: Task) {
    try {
      await this.sqliteService.deleteTask(task.id);
      this.allTasks = this.allTasks.filter(t => t.id !== task.id);
      this.filterTasks();
      this.pendingSyncCount = this.allTasks.filter(t => !t.isSynced).length;
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  /**
   * Sincroniza las tareas con el servidor
   */
  async syncTasks() {
    if (!this.isOnline) {
      console.log('📵 Cannot sync - offline');
      return;
    }

    try {
      console.log('🔄 Starting sync...');
      // TODO: Implementar sincronización real
      
      // Simular sincronización
      setTimeout(() => {
        this.allTasks.forEach(task => {
          task.isSynced = true;
        });
        this.pendingSyncCount = 0;
        console.log('✅ Sync completed');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }

  /**
   * Función de tracking para ngFor (mejora performance)
   */
  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Hace un momento';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Mensaje cuando no hay tareas en el filtro actual
   */
  getEmptyMessage(): string {
    switch (this.currentFilter) {
      case 'pending':
        return '¡Genial! No tienes tareas pendientes';
      case 'completed':
        return 'Aún no has completado ninguna tarea';
      default:
        return 'No tienes tareas aún. ¡Crea tu primera tarea!';
    }
  }

  // Getters para templates
  get pendingTasks(): Task[] {
    return this.allTasks.filter(task => !task.isCompleted);
  }

  get completedTasks(): Task[] {
    return this.allTasks.filter(task => task.isCompleted);
  }
}

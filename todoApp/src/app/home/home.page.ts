import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Task } from '../models';
import { SqliteService } from '../services/sqlite.service';
import { SyncService } from '../services/sync.service';

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
    private sqliteService: SqliteService,
    private syncService: SyncService
  ) {}

  ngOnInit() {
    console.log('🏠 HomePage initialized');
    this.loadInitialData();
    this.setupNetworkListener();
    // Si ya está online y hay pendientes, mostrar aviso
    setTimeout(() => this.checkPendingSync(), 500);
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
    this.isOnline = navigator.onLine;
    window.addEventListener('online', async () => {
      this.isOnline = true;
      console.log('📶 App is online');
      await this.checkPendingSync(true);
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('� App is offline');
    });
  }

  /**
   * Verifica si hay tareas pendientes de sincronizar y avisa
   * Si autoSync=true, sincroniza automáticamente y muestra alerta
   */
  private async checkPendingSync(autoSync: boolean = false) {
    await this.loadTasksFromStorage();
    if (this.isOnline && this.pendingSyncCount > 0) {
      if (autoSync) {
        await this.syncTasks(true);
      } else {
        this.showSyncAvailableAlert();
      }
    }
  }

  /**
   * Muestra un aviso de que hay tareas listas para sincronizar
   */
  private async showSyncAvailableAlert() {
    const alert = await this.alertController.create({
      header: 'Sincronización disponible',
      message: `Tienes ${this.pendingSyncCount} tareas listas para sincronizar con el servidor.`,
      buttons: ['OK']
    });
    await alert.present();
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
  /**
   * Sincroniza las tareas con el servidor (manual o automático)
   * Si triggeredByNetwork=true, muestra alerta de éxito/error
   */
  async syncTasks(triggeredByNetwork: boolean = false) {
    if (!this.isOnline) {
      console.log('📵 Cannot sync - offline');
      return;
    }
    try {
      console.log('🔄 Starting sync...');
      await this.syncService.fullSync();
      await this.loadTasksFromStorage();
      this.filterTasks();
      if (triggeredByNetwork) {
        const alert = await this.alertController.create({
          header: 'Sincronización exitosa',
          message: 'Las tareas se sincronizaron correctamente con el servidor.',
          buttons: ['OK']
        });
        await alert.present();
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      if (triggeredByNetwork) {
        const alert = await this.alertController.create({
          header: 'Error de sincronización',
          message: 'Ocurrió un error al sincronizar con el servidor.',
          buttons: ['OK']
        });
        await alert.present();
      }
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

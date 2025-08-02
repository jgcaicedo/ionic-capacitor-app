import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../../models';
import { SqliteService } from '../../services/sqlite.service';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.page.html',
  styleUrls: ['./task-form.page.scss'],
  standalone: false,
})
export class TaskFormPage implements OnInit, OnDestroy {

  // Formulario reactivo
  taskForm: FormGroup;
  
  // Estado del componente
  isEditing: boolean = false;
  isSaving: boolean = false;
  currentTask: Task | null = null;
  
  // Suscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private sqliteService: SqliteService
  ) {
    this.taskForm = this.createForm();
  }

  ngOnInit() {
    console.log('📝 TaskFormPage initialized');
    this.checkEditMode();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Crea el formulario reactivo con validaciones
   */
  private createForm(): FormGroup {
    return this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      isCompleted: [false]
    });
  }

  /**
   * Verifica si estamos en modo edición basado en los query params
   */
  private checkEditMode() {
    const taskId = this.route.snapshot.queryParams['id'];
    
    if (taskId) {
      this.isEditing = true;
      this.loadTaskForEditing(taskId);
    } else {
      this.isEditing = false;
      // Enfocar el campo título para nueva tarea
      setTimeout(() => {
        const titleInput = document.querySelector('ion-input[formControlName="title"]');
        if (titleInput) {
          (titleInput as any).setFocus();
        }
      }, 300);
    }
  }

  /**
   * Carga los datos de la tarea para edición
   * TODO: Conectar con SQLite service
   */
  private async loadTaskForEditing(taskId: string) {
    try {
      await this.sqliteService.createDB();
      const tasks = await this.sqliteService.getTasks();
      this.currentTask = tasks.find(t => t.id === taskId) || null;
      if (this.currentTask) {
        this.taskForm.patchValue({
          title: this.currentTask.title,
          description: this.currentTask.description || '',
          isCompleted: this.currentTask.isCompleted
        });
      } else {
        await this.showErrorAndGoBack('Tarea no encontrada');
      }
    } catch (error) {
      console.error('Error loading task:', error);
      await this.showErrorAndGoBack('Error al cargar la tarea');
    }
  }

  /**
   * Guarda la tarea (crear nueva o actualizar existente)
   */
  async saveTask() {
    if (!this.taskForm.valid || this.isSaving) {
      return;
    }

    this.isSaving = true;

    try {
      if (this.isEditing) {
        await this.updateExistingTask();
      } else {
        await this.createNewTask();
      }
      
      // Mostrar mensaje de éxito
      await this.showSuccessToast(
        this.isEditing ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente'
      );
      
      // Navegar de vuelta al home
      this.router.navigate(['/home']);
      
    } catch (error) {
      console.error('Error saving task:', error);
      await this.showErrorToast('Error al guardar la tarea');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Crea una nueva tarea
   */
  private async createNewTask() {
    const formValue = this.taskForm.value;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: formValue.title.trim(),
      description: formValue.description?.trim() || undefined,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynced: false
    };
    await this.sqliteService.addTask(newTask);
    console.log('✅ Nueva tarea creada:', newTask);
  }

  /**
   * Actualiza una tarea existente
   */
  private async updateExistingTask() {
    if (!this.currentTask) {
      throw new Error('No hay tarea actual para actualizar');
    }
    const formValue = this.taskForm.value;
    const updatedTask: Task = {
      ...this.currentTask,
      title: formValue.title.trim(),
      description: formValue.description?.trim() || undefined,
      isCompleted: formValue.isCompleted,
      updatedAt: new Date().toISOString(),
      isSynced: false
    };
    await this.sqliteService.updateTask(updatedTask);
    console.log('📝 Tarea actualizada:', updatedTask);
  }

  /**
   * Elimina la tarea actual (solo en modo edición)
   */
  async deleteTask() {
    if (!this.isEditing || !this.currentTask) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar "${this.currentTask.title}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.performDelete();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Ejecuta la eliminación de la tarea
   */
  private async performDelete() {
    if (!this.currentTask) {
      return;
    }
    this.isSaving = true;
    try {
      await this.sqliteService.deleteTask(this.currentTask.id);
      console.log(`🗑️ Tarea eliminada: ${this.currentTask.id}`);
      await this.showSuccessToast('Tarea eliminada correctamente');
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error deleting task:', error);
      await this.showErrorToast('Error al eliminar la tarea');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Cancela el formulario y regresa al home
   */
  async cancelForm() {
    if (this.taskForm.dirty && !this.isSaving) {
      // Si hay cambios sin guardar, mostrar confirmación
      const alert = await this.alertController.create({
        header: 'Descartar cambios',
        message: '¿Estás seguro de que quieres salir sin guardar los cambios?',
        buttons: [
          {
            text: 'Continuar editando',
            role: 'cancel'
          },
          {
            text: 'Descartar',
            role: 'destructive',
            handler: () => {
              this.router.navigate(['/home']);
            }
          }
        ]
      });

      await alert.present();
    } else {
      // No hay cambios, regresar directamente
      this.router.navigate(['/home']);
    }
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Muestra un toast de éxito
   */
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Muestra un toast de error
   */
  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Muestra error y regresa al home
   */
  private async showErrorAndGoBack(message: string) {
    await this.showErrorToast(message);
    this.router.navigate(['/home']);
  }

  // Getters para el template
  get titleControl() {
    return this.taskForm.get('title');
  }

  get descriptionControl() {
    return this.taskForm.get('description');
  }
}

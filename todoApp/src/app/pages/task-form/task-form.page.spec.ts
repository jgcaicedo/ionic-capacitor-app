import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskFormPage } from './task-form.page';

describe('TaskFormPage', () => {
  let component: TaskFormPage;
  let fixture: ComponentFixture<TaskFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

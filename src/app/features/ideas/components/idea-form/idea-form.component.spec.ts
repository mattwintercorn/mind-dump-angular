import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IdeaFormComponent } from './idea-form.component';
import { IdeaService } from '../../../../core/services/idea.service';
import { signal } from '@angular/core';

describe('IdeaFormComponent', () => {
  let component: IdeaFormComponent;
  let fixture: ComponentFixture<IdeaFormComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<IdeaFormComponent>>;
  let mockIdeaService: any;

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    
    mockIdeaService = {
      allProjects: signal([]),
      allComponents: signal([])
    };

    await TestBed.configureTestingModule({
      imports: [
        IdeaFormComponent,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatChipsModule,
        MatSelectModule,
        MatRadioModule,
        MatButtonModule,
        MatIconModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: null },
        { provide: IdeaService, useValue: mockIdeaService }
      ]
    }).compileComponents();

    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<IdeaFormComponent>>;
    fixture = TestBed.createComponent(IdeaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form in create mode', () => {
    expect(component.ideaForm.value).toEqual({
      title: '',
      description: '',
      component: '',
      project: '',
      status: 'new',
      priority: 'medium'
    });
    expect(component.keywords()).toEqual([]);
  });

  it('should display "New Idea" as dialog title in create mode', () => {
    const compiled = fixture.nativeElement;
    const title = compiled.querySelector('h2');
    expect(title.textContent).toBe('New Idea');
  });

  it('should populate form with existing data in edit mode', () => {
    const existingIdea = {
      id: '1',
      title: 'Test Idea',
      description: 'Test Description',
      keywords: ['test', 'angular'],
      status: 'in-progress' as const,
      priority: 'high' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        IdeaFormComponent,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatChipsModule,
        MatSelectModule,
        MatRadioModule,
        MatButtonModule,
        MatIconModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: existingIdea }
      ]
    });

    fixture = TestBed.createComponent(IdeaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.ideaForm.value).toEqual({
      title: 'Test Idea',
      description: 'Test Description',
      component: '',
      project: '',
      status: 'in-progress',
      priority: 'high'
    });
    expect(component.keywords()).toEqual(['test', 'angular']);
  });

  it('should display "Edit Idea" as dialog title in edit mode', () => {
    const existingIdea = {
      id: '1',
      title: 'Test Idea',
      description: 'Test Description',
      keywords: [],
      status: 'new' as const,
      priority: 'medium' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        IdeaFormComponent,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatChipsModule,
        MatSelectModule,
        MatRadioModule,
        MatButtonModule,
        MatIconModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: existingIdea }
      ]
    });

    fixture = TestBed.createComponent(IdeaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const title = compiled.querySelector('h2');
    expect(title.textContent).toBe('Edit Idea');
  });

  it('should mark title as required and show validation error', () => {
    const titleControl = component.ideaForm.get('title');
    
    titleControl?.setValue('');
    titleControl?.markAsTouched();
    fixture.detectChanges();

    expect(titleControl?.hasError('required')).toBe(true);
    expect(titleControl?.invalid).toBe(true);
  });

  it('should disable save button when form is invalid', () => {
    component.ideaForm.get('title')?.setValue('');
    component.ideaForm.get('title')?.markAsTouched();
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('button[color="primary"]');
    expect(saveButton.disabled).toBe(true);
  });

  it('should add keyword to keywords array', () => {
    const input = fixture.nativeElement.querySelector('input[placeholder="Add keyword..."]');
    
    input.value = 'test-keyword';
    input.dispatchEvent(new Event('input'));
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    input.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.keywords()).toContain('test-keyword');
  });

  it('should remove keyword from keywords array', () => {
    component.keywords.set(['keyword1', 'keyword2']);
    fixture.detectChanges();

    component.removeKeyword('keyword1');

    expect(component.keywords()).toEqual(['keyword2']);
  });

  it('should call dialogRef.close with form data when save is clicked', () => {
    component.ideaForm.patchValue({
      title: 'New Idea Title',
      description: 'Description',
      component: '',
      project: '',
      status: 'new',
      priority: 'high'
    });
    component.keywords.set(['keyword1']);

    component.onSave();

    expect(dialogRef.close).toHaveBeenCalledWith({
      title: 'New Idea Title',
      description: 'Description',
      component: '',
      project: '',
      keywords: ['keyword1'],
      status: 'new',
      priority: 'high'
    });
  });

  it('should call dialogRef.close without data when cancel is clicked', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});

// src/app/features/ideas/components/idea-card/idea-card.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdeaCardComponent } from './idea-card.component';
import { ColorService } from '../../../../core/services/color.service';
import { Idea } from '../../../../core/models/idea.model';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('IdeaCardComponent', () => {
  let component: IdeaCardComponent;
  let fixture: ComponentFixture<IdeaCardComponent>;

  const mockIdea: Idea = {
    id: '1',
    title: 'Test Idea',
    description: 'Test description',
    keywords: ['angular', 'testing'],
    status: 'new',
    priority: 'high',
    color: '#3B82F6',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdeaCardComponent],
      providers: [ColorService, provideAnimationsAsync()]
    }).compileComponents();

    fixture = TestBed.createComponent(IdeaCardComponent);
    component = fixture.componentInstance;
    component.idea = mockIdea;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display idea title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-card-title')?.textContent).toContain('Test Idea');
  });

  it('should display idea description', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.description')?.textContent).toContain('Test description');
  });

  it('should display keywords as chips', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chips = compiled.querySelectorAll('mat-chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('angular');
    expect(chips[1].textContent).toContain('testing');
  });

  it('should display status badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.status-badge');
    expect(badge?.textContent).toContain('new');
  });

  it('should show priority border color', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('mat-card') as HTMLElement;
    expect(card.style.borderLeftColor).toBeTruthy();
  });

  it('should emit select event when card is clicked', () => {
    spyOn(component.select, 'emit');
    const card = fixture.nativeElement.querySelector('mat-card') as HTMLElement;
    card.click();
    expect(component.select.emit).toHaveBeenCalledWith(mockIdea);
  });

  it('should emit edit event when edit button is clicked', () => {
    spyOn(component.edit, 'emit');
    const editBtn = fixture.nativeElement.querySelector('[aria-label="Edit idea"]') as HTMLButtonElement;
    editBtn.click();
    expect(component.edit.emit).toHaveBeenCalledWith(mockIdea);
  });

  it('should emit delete event when delete button is clicked', () => {
    spyOn(component.delete, 'emit');
    const deleteBtn = fixture.nativeElement.querySelector('[aria-label="Delete idea"]') as HTMLButtonElement;
    deleteBtn.click();
    expect(component.delete.emit).toHaveBeenCalledWith(mockIdea.id);
  });
});

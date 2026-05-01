import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { IdeaListComponent } from './idea-list.component';
import { IdeaService } from '../../../../core/services/idea.service';
import { Idea } from '../../../../core/models/idea.model';

describe('IdeaListComponent', () => {
  let component: IdeaListComponent;
  let fixture: ComponentFixture<IdeaListComponent>;
  let mockIdeaService: any;
  let ideasSignal: WritableSignal<Idea[]>;
  let loadingSignal: WritableSignal<boolean>;

  const mockIdeas: Idea[] = [
    {
      id: '1',
      title: 'Test Idea 1',
      description: 'Description 1',
      keywords: ['tag1'],
      status: 'new',
      priority: 'medium',
      color: '#3B82F6',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      title: 'Test Idea 2',
      description: 'Description 2',
      keywords: ['tag2'],
      status: 'active',
      priority: 'high',
      color: '#EF4444',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ];

  beforeEach(async () => {
    ideasSignal = signal<Idea[]>([]);
    loadingSignal = signal<boolean>(false);

    mockIdeaService = jasmine.createSpyObj('IdeaService', ['deleteIdea']);
    Object.defineProperty(mockIdeaService, 'ideas', {
      get: () => ideasSignal.asReadonly()
    });
    Object.defineProperty(mockIdeaService, 'loading', {
      get: () => loadingSignal.asReadonly()
    });

    await TestBed.configureTestingModule({
      imports: [IdeaListComponent]
    })
      .overrideComponent(IdeaListComponent, {
        set: {
          providers: [
            { provide: IdeaService, useValue: mockIdeaService }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(IdeaListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display idea cards when ideas are available', () => {
    ideasSignal.set(mockIdeas);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const ideaCards = compiled.querySelectorAll('app-idea-card');

    expect(ideaCards.length).toBe(2);
  });

  it('should display empty state when no ideas', () => {
    ideasSignal.set([]);
    loadingSignal.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.empty-state');

    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain('No ideas yet');
  });

  it('should emit ideaSelected when idea card is clicked', () => {
    ideasSignal.set(mockIdeas);
    fixture.detectChanges();

    spyOn(component.ideaSelected, 'emit');

    component.onIdeaClick(mockIdeas[0]);

    expect(component.ideaSelected.emit).toHaveBeenCalledWith(mockIdeas[0]);
  });

  it('should emit ideaEdit when edit is triggered', () => {
    ideasSignal.set(mockIdeas);
    fixture.detectChanges();

    spyOn(component.ideaEdit, 'emit');

    component.onIdeaEdit(mockIdeas[0]);

    expect(component.ideaEdit.emit).toHaveBeenCalledWith(mockIdeas[0]);
  });

  it('should call deleteIdea service method when delete is triggered', () => {
    ideasSignal.set(mockIdeas);
    fixture.detectChanges();

    component.onIdeaDelete(mockIdeas[0].id);

    expect(mockIdeaService.deleteIdea).toHaveBeenCalledWith(mockIdeas[0].id);
  });
});

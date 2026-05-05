import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForceGraphComponent } from './force-graph.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IdeaService } from '../../../../core/services/idea.service';
import { FilterService } from '../../../../core/services/filter.service';
import { signal } from '@angular/core';
import { Idea } from '../../../../core/models/idea.model';

describe('ForceGraphComponent', () => {
  let component: ForceGraphComponent;
  let fixture: ComponentFixture<ForceGraphComponent>;
  let mockIdeaService: jasmine.SpyObj<IdeaService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;

  const testIdeas: Idea[] = [];

  beforeEach(async () => {
    mockIdeaService = jasmine.createSpyObj('IdeaService', [], {
      ideas: signal(testIdeas)
    });
    
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'filterIdeas',
      'hasActiveFilters',
      'clearFilters'
    ]);
    mockFilterService.filterIdeas.and.returnValue(testIdeas);
    mockFilterService.hasActiveFilters.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [
        ForceGraphComponent,
        BrowserAnimationsModule,
        MatButtonModule,
        MatIconModule
      ],
      providers: [
        { provide: IdeaService, useValue: mockIdeaService },
        { provide: FilterService, useValue: mockFilterService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForceGraphComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have an SVG container element', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const svg = compiled.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('should have zoom control buttons', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const zoomIn = compiled.querySelector('[aria-label="Zoom in"]');
    const zoomOut = compiled.querySelector('[aria-label="Zoom out"]');
    const zoomReset = compiled.querySelector('[aria-label="Reset zoom"]');
    expect(zoomIn).toBeTruthy();
    expect(zoomOut).toBeTruthy();
    expect(zoomReset).toBeTruthy();
  });

  it('should initialize D3 simulation on ngOnInit', () => {
    spyOn<any>(component, 'initializeSimulation');
    component.ngOnInit();
    expect(component['initializeSimulation']).toHaveBeenCalled();
  });

  it('should cleanup simulation on destroy', () => {
    fixture.detectChanges();
    const simulation = component['simulation'];
    if (simulation) {
      spyOn(simulation, 'stop');
      component.ngOnDestroy();
      expect(simulation.stop).toHaveBeenCalled();
    }
  });
});

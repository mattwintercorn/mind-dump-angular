import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForceGraphComponent } from './force-graph.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ComponentFixtureAutoDetect } from '@angular/core/testing';

describe('ForceGraphComponent', () => {
  let component: ForceGraphComponent;
  let fixture: ComponentFixture<ForceGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ForceGraphComponent,
        BrowserAnimationsModule,
        MatButtonModule,
        MatIconModule
      ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForceGraphComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('ideas', []);
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

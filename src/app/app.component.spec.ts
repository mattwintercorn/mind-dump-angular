import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize with grid view mode', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.viewMode).toBe('grid');
  });

  it('should handle new idea event', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    spyOn(console, 'log');
    
    app.onNewIdea();
    
    expect(console.log).toHaveBeenCalledWith('New idea clicked');
  });

  it('should handle view mode change event', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    spyOn(console, 'log');
    
    app.onViewModeChange('list');
    
    expect(app.viewMode).toBe('list');
    expect(console.log).toHaveBeenCalledWith('View mode changed to:', 'list');
  });
});

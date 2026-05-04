import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { Router, provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { IdeaService } from './core/services/idea.service';
import { SwUpdate } from '@angular/service-worker';
import { of, NEVER } from 'rxjs';

describe('AppComponent', () => {
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockIdeaService: jasmine.SpyObj<IdeaService>;
  let mockSwUpdate: jasmine.SpyObj<SwUpdate>;

  beforeEach(async () => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockIdeaService = jasmine.createSpyObj('IdeaService', ['addIdea']);
    mockSwUpdate = jasmine.createSpyObj('SwUpdate', ['checkForUpdate'], {
      isEnabled: false,
      versionUpdates: NEVER
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: MatDialog, useValue: mockDialog },
        { provide: IdeaService, useValue: mockIdeaService },
        { provide: SwUpdate, useValue: mockSwUpdate }
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

  it('should open dialog when new idea is clicked', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const mockDialogRef = { afterClosed: () => of(null) };
    mockDialog.open.and.returnValue(mockDialogRef as any);

    app.onNewIdea();

    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should call addIdea when dialog returns data', (done) => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const mockIdeaData = {
      title: 'Test Idea',
      description: 'Test description',
      keywords: ['test'],
      status: 'new' as const,
      priority: 'medium' as const,
      color: '#3B82F6'
    };
    const mockDialogRef = { afterClosed: () => of(mockIdeaData) };
    mockDialog.open.and.returnValue(mockDialogRef as any);

    app.onNewIdea();

    setTimeout(() => {
      expect(mockIdeaService.addIdea).toHaveBeenCalledWith(mockIdeaData);
      done();
    }, 0);
  });

  it('should handle view mode change event', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    app.onViewModeChange('grid');
    
    expect(app.viewMode).toBe('grid');
    expect(router.navigate).toHaveBeenCalledWith(['/graph']);
  });
});

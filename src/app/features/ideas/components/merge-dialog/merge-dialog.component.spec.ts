import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MergeDialogComponent, MergeDialogData } from './merge-dialog.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('MergeDialogComponent', () => {
  let component: MergeDialogComponent;
  let fixture: ComponentFixture<MergeDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<MergeDialogComponent>>;

  const mockData: MergeDialogData = {
    localIdeasCount: 5
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        MergeDialogComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MergeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display local ideas count', () => {
    const compiled = fixture.nativeElement;
    const intro = compiled.querySelector('.dialog-intro');
    expect(intro.textContent).toContain('5');
    expect(intro.textContent).toContain('ideas');
  });

  it('should display singular "idea" for count of 1', () => {
    component.data.localIdeasCount = 1;
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const intro = compiled.querySelector('.dialog-intro');
    expect(intro.textContent).toContain('1');
    expect(intro.textContent).toContain('idea');
    expect(intro.textContent).not.toContain('ideas');
  });

  it('should have 3 merge strategies', () => {
    expect(component.strategies.length).toBe(3);
    expect(component.strategies.map(s => s.value)).toEqual(['upload', 'download', 'separate']);
  });

  it('should mark upload strategy as recommended', () => {
    const uploadStrategy = component.strategies.find(s => s.value === 'upload');
    expect(uploadStrategy?.recommended).toBe(true);
  });

  it('should start with no strategy selected', () => {
    expect(component.selectedStrategy).toBeNull();
    expect(component.canContinue).toBe(false);
  });

  it('should enable continue button when strategy is selected', () => {
    component.selectedStrategy = 'upload';
    fixture.detectChanges();
    expect(component.canContinue).toBe(true);
  });

  it('should close dialog with null on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('should close dialog with selected strategy on continue', () => {
    component.selectedStrategy = 'download';
    component.onContinue();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ strategy: 'download' });
  });

  it('should not close with strategy if none selected', () => {
    component.selectedStrategy = null;
    component.onContinue();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should disable continue button when no strategy selected', () => {
    const compiled = fixture.nativeElement;
    const continueButton = compiled.querySelector('button[color="primary"]');
    expect(continueButton.disabled).toBe(true);
  });

  it('should enable continue button after selecting strategy', () => {
    component.selectedStrategy = 'upload';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const continueButton = compiled.querySelector('button[color="primary"]');
    expect(continueButton.disabled).toBe(false);
  });
});

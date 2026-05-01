// src/app/shared/components/layout/toolbar/toolbar.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolbarComponent } from './toolbar.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ToolbarComponent,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatButtonToggleModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title', () => {
    component.title = 'Mind Dump';
    fixture.detectChanges();
    const titleElement = fixture.nativeElement.querySelector('.toolbar-title');
    expect(titleElement.textContent).toContain('Mind Dump');
  });

  it('should have New Idea button', () => {
    const button = fixture.debugElement.query(By.css('button[aria-label="New Idea"]'));
    expect(button).toBeTruthy();
    const buttonText = button.nativeElement.textContent;
    expect(buttonText).toContain('New Idea');
  });

  it('should emit newIdea event when New Idea button is clicked', () => {
    spyOn(component.newIdea, 'emit');
    const button = fixture.debugElement.query(By.css('button[aria-label="New Idea"]'));
    button.nativeElement.click();
    expect(component.newIdea.emit).toHaveBeenCalled();
  });

  it('should have view mode toggle', () => {
    const toggle = fixture.debugElement.query(By.css('mat-button-toggle-group'));
    expect(toggle).toBeTruthy();
  });

  it('should emit viewModeChange event when view mode changes', () => {
    spyOn(component.viewModeChange, 'emit');
    component.onViewModeChange('list');
    expect(component.viewModeChange.emit).toHaveBeenCalledWith('list');
  });
});

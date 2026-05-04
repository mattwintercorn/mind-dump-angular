import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspaceSwitcherComponent } from './workspace-switcher.component';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { signal } from '@angular/core';
import { Workspace } from '../../../../core/models/workspace.model';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatButtonHarness } from '@angular/material/button/testing';

describe('WorkspaceSwitcherComponent', () => {
  let component: WorkspaceSwitcherComponent;
  let fixture: ComponentFixture<WorkspaceSwitcherComponent>;
  let loader: HarnessLoader;
  let mockWorkspaceService: jasmine.SpyObj<WorkspaceService>;

  const mockWorkspaces: Workspace[] = [
    {
      id: 'ws1',
      name: 'Personal',
      ownerId: 'user1',
      isDefault: true,
      members: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'ws2',
      name: 'Work Projects',
      ownerId: 'user1',
      isDefault: false,
      members: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'ws3',
      name: 'Shared Team',
      ownerId: 'user2',
      isDefault: false,
      members: { 'user1': 'editor' },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(async () => {
    mockWorkspaceService = jasmine.createSpyObj('WorkspaceService', [
      'switchWorkspace',
      'createWorkspace'
    ], {
      // Setup readonly signals as properties
      activeWorkspace: signal<Workspace | null>(mockWorkspaces[0]),
      ownedWorkspaces: signal(mockWorkspaces.slice(0, 2)),
      sharedWorkspaces: signal([mockWorkspaces[2]])
    });

    await TestBed.configureTestingModule({
      imports: [
        WorkspaceSwitcherComponent,
        MatMenuModule,
        MatButtonModule,
        MatIconModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: WorkspaceService, useValue: mockWorkspaceService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceSwitcherComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display active workspace name in button', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button?.textContent).toContain('Personal');
  });

  it('should display folder icon for active workspace', () => {
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon?.textContent?.trim()).toBe('folder');
  });

  it('should open menu when button is clicked', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    const menu = await loader.getHarness(MatMenuHarness);
    expect(await menu.isOpen()).toBe(true);
  });

  it('should display owned workspaces section with lock icon', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = document.body;
    const ownedSection = compiled.querySelector('.owned-workspaces');
    expect(ownedSection).toBeTruthy();
    
    const lockIcon = ownedSection?.querySelector('mat-icon');
    expect(lockIcon?.textContent?.trim()).toBe('lock');
  });

  it('should display shared workspaces section with people icon', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = document.body;
    const sharedSection = compiled.querySelector('.shared-workspaces');
    expect(sharedSection).toBeTruthy();
    
    const peopleIcon = sharedSection?.querySelector('mat-icon');
    expect(peopleIcon?.textContent?.trim()).toBe('people');
  });

  it('should display all owned workspaces in menu', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const menuItems = document.body.querySelectorAll('.workspace-item');
    const ownedItems = Array.from(menuItems).filter((item: any) => 
      item.closest('.owned-workspaces')
    );
    
    expect(ownedItems.length).toBe(2);
  });

  it('should display all shared workspaces in menu', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const menuItems = document.body.querySelectorAll('.workspace-item');
    const sharedItems = Array.from(menuItems).filter((item: any) => 
      item.closest('.shared-workspaces')
    );
    
    expect(sharedItems.length).toBe(1);
  });

  it('should call switchWorkspace when workspace item is clicked', async () => {
    mockWorkspaceService.switchWorkspace.and.returnValue(Promise.resolve());
    
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const workspaceItems = document.body.querySelectorAll('.workspace-item');
    const secondWorkspace = workspaceItems[1] as HTMLElement;
    secondWorkspace.click();

    expect(mockWorkspaceService.switchWorkspace).toHaveBeenCalledWith('ws2');
  });

  it('should display "Create Workspace" option at bottom of menu', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const createButton = document.body.querySelector('.create-workspace');
    expect(createButton).toBeTruthy();
    expect(createButton?.textContent).toContain('Create Workspace');
  });

  it('should emit createWorkspace event when create option is clicked', async () => {
    spyOn(component.createWorkspace, 'emit');
    
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const createButton = document.body.querySelector('.create-workspace') as HTMLElement;
    createButton.click();

    expect(component.createWorkspace.emit).toHaveBeenCalled();
  });

  it('should highlight active workspace in menu', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const activeItem = document.body.querySelector('.workspace-item.active');
    expect(activeItem).toBeTruthy();
    expect(activeItem?.textContent).toContain('Personal');
  });

  it('should display workspace name in menu items', async () => {
    const button = await loader.getHarness(MatButtonHarness);
    await button.click();
    
    // Wait for menu to open
    await fixture.whenStable();
    fixture.detectChanges();

    const menuItems = document.body.querySelectorAll('.workspace-item .workspace-name');
    const names = Array.from(menuItems).map((item: any) => item.textContent?.trim());
    
    expect(names).toContain('Personal');
    expect(names).toContain('Work Projects');
    expect(names).toContain('Shared Team');
  });
});

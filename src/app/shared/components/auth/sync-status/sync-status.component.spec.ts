import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncStatusComponent } from './sync-status.component';
import { SyncService } from '../../../../core/services/sync.service';
import { AuthService } from '../../../../core/services/auth.service';
import { signal } from '@angular/core';
import { SyncStatus } from '../../../../core/models/sync.model';

describe('SyncStatusComponent', () => {
  let component: SyncStatusComponent;
  let fixture: ComponentFixture<SyncStatusComponent>;
  let mockSyncService: any;
  let mockAuthService: any;
  let syncStatusSignal: any;
  let pendingCountSignal: any;
  let isAuthenticatedSignal: any;

  beforeEach(async () => {
    // Create writable signals for testing
    syncStatusSignal = signal<SyncStatus>('idle');
    pendingCountSignal = signal<number>(0);
    isAuthenticatedSignal = signal<boolean>(false);

    mockSyncService = {
      syncStatus: syncStatusSignal.asReadonly(),
      pendingCount: pendingCountSignal.asReadonly()
    };

    mockAuthService = {
      isAuthenticated: isAuthenticatedSignal.asReadonly()
    };

    await TestBed.configureTestingModule({
      imports: [SyncStatusComponent],
      providers: [
        { provide: SyncService, useValue: mockSyncService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SyncStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide when status is idle', () => {
    syncStatusSignal.set('idle');
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    expect(component.shouldShow()).toBe(false);
    const container = fixture.nativeElement.querySelector('.sync-status-container');
    expect(container).toBeNull();
  });

  it('should hide when status is synced', () => {
    syncStatusSignal.set('synced');
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    expect(component.shouldShow()).toBe(false);
    const container = fixture.nativeElement.querySelector('.sync-status-container');
    expect(container).toBeNull();
  });

  it('should show when status is syncing and authenticated', () => {
    syncStatusSignal.set('syncing');
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    expect(component.shouldShow()).toBe(true);
    const container = fixture.nativeElement.querySelector('.sync-status-container');
    expect(container).toBeTruthy();
    expect(container?.getAttribute('data-status')).toBe('syncing');
  });

  it('should show syncing state with spinner', () => {
    syncStatusSignal.set('syncing');
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    const syncingDiv = fixture.nativeElement.querySelector('.sync-status.syncing');
    expect(syncingDiv).toBeTruthy();
    
    const spinner = fixture.nativeElement.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();
    
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusText?.textContent?.trim()).toBe('Syncing');
  });

  it('should show error state with error icon and retry button', () => {
    syncStatusSignal.set('error');
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.sync-status.error');
    expect(errorDiv).toBeTruthy();
    
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon?.textContent?.trim()).toBe('error');
    
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusText?.textContent?.trim()).toBe('Sync Error');
    
    const retryButton = fixture.nativeElement.querySelector('.retry-button');
    expect(retryButton).toBeTruthy();
    expect(retryButton?.textContent?.trim()).toBe('Retry');
  });

  it('should show offline state with cloud_off icon', () => {
    syncStatusSignal.set('offline');
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    const offlineDiv = fixture.nativeElement.querySelector('.sync-status.offline');
    expect(offlineDiv).toBeTruthy();
    
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon?.textContent?.trim()).toBe('cloud_off');
    
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusText?.textContent?.trim()).toBe('Offline');
  });

  it('should display pending count when greater than 0', () => {
    syncStatusSignal.set('syncing');
    pendingCountSignal.set(5);
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    const pendingCount = fixture.nativeElement.querySelector('.pending-count');
    expect(pendingCount).toBeTruthy();
    expect(pendingCount?.textContent?.trim()).toBe('(5)');
  });

  it('should not display pending count when 0', () => {
    syncStatusSignal.set('syncing');
    pendingCountSignal.set(0);
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    const pendingCount = fixture.nativeElement.querySelector('.pending-count');
    expect(pendingCount).toBeNull();
  });

  it('should hide when not authenticated', () => {
    syncStatusSignal.set('syncing');
    isAuthenticatedSignal.set(false);
    fixture.detectChanges();

    expect(component.shouldShow()).toBe(false);
    const container = fixture.nativeElement.querySelector('.sync-status-container');
    expect(container).toBeNull();
  });

  it('should call retry() when retry button is clicked', () => {
    spyOn(component, 'retry');
    syncStatusSignal.set('error');
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('.retry-button');
    retryButton?.click();

    expect(component.retry).toHaveBeenCalled();
  });

  it('should update visibility when auth state changes', () => {
    syncStatusSignal.set('syncing');
    isAuthenticatedSignal.set(false);
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(false);

    // User signs in
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(true);

    // User signs out
    isAuthenticatedSignal.set(false);
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(false);
  });

  it('should update visibility when sync status changes', () => {
    isAuthenticatedSignal.set(true);
    
    // Start with idle - should hide
    syncStatusSignal.set('idle');
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(false);

    // Change to syncing - should show
    syncStatusSignal.set('syncing');
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(true);

    // Change to synced - should hide
    syncStatusSignal.set('synced');
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(false);

    // Change to error - should show
    syncStatusSignal.set('error');
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(true);

    // Change to offline - should show
    syncStatusSignal.set('offline');
    fixture.detectChanges();
    expect(component.shouldShow()).toBe(true);
  });
});

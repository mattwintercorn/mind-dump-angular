// src/app/core/services/color.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ColorService } from './color.service';

describe('ColorService', () => {
  let service: ColorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ColorService]
    });
    service = TestBed.inject(ColorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return consistent color for same keyword', () => {
    const color1 = service.getKeywordColor('typescript');
    const color2 = service.getKeywordColor('typescript');
    expect(color1).toBe(color2);
  });

  it('should return different colors for different keywords', () => {
    const color1 = service.getKeywordColor('typescript');
    const color2 = service.getKeywordColor('angular');
    expect(color1).not.toBe(color2);
  });

  it('should return valid hex color', () => {
    const color = service.getKeywordColor('test');
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should handle empty string', () => {
    const color = service.getKeywordColor('');
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should handle special characters', () => {
    const color = service.getKeywordColor('test-keyword-123!@#');
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

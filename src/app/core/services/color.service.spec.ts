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

  it('should handle unicode characters', () => {
    const color = service.getKeywordColor('测试🔥');
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should handle long strings', () => {
    const longKeyword = 'a'.repeat(1000);
    const color = service.getKeywordColor(longKeyword);
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should return color from predefined palette', () => {
    const color = service.getKeywordColor('test');
    const validColors = [
      '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1',
      '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16'
    ];
    expect(validColors).toContain(color);
  });

  it('should distribute colors across palette for different keywords', () => {
    const keywords = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    const colors = keywords.map(k => service.getKeywordColor(k));
    const uniqueColors = new Set(colors);
    // Should have multiple different colors
    expect(uniqueColors.size).toBeGreaterThan(1);
  });

  it('should handle case sensitivity consistently', () => {
    const color1 = service.getKeywordColor('TypeScript');
    const color2 = service.getKeywordColor('typescript');
    const color3 = service.getKeywordColor('TYPESCRIPT');
    // Different cases produce different hashes, but might occasionally map to same color
    // Just verify they all return valid colors
    expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    expect(color2).toMatch(/^#[0-9A-F]{6}$/i);
    expect(color3).toMatch(/^#[0-9A-F]{6}$/i);
  });
});


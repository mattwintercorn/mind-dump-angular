// src/app/core/services/color.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private readonly colors = [
    '#EF4444', // red-500
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#3B82F6', // blue-500
    '#6366F1', // indigo-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
    '#F97316', // orange-500
    '#84CC16', // lime-500
  ];

  /**
   * Get consistent color for a keyword using FNV-1a hash
   */
  getKeywordColor(keyword: string): string {
    const hash = this.fnv1aHash(keyword);
    return this.colors[hash % this.colors.length];
  }

  /**
   * FNV-1a hash algorithm for consistent color mapping
   */
  private fnv1aHash(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash *= 16777619;
    }
    return Math.abs(hash);
  }
}

import { describe, it, expect } from 'vitest';
import { quickTemplates } from './quickTemplates';

describe('quickTemplates catalog', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(quickTemplates)).toBe(true);
    expect(quickTemplates.length).toBeGreaterThan(0);
  });

  it('every entry has the fields the UI relies on', () => {
    for (const t of quickTemplates) {
      expect(typeof t.id).toBe('number');
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.category).toBe('string');
      expect(t.category.length).toBeGreaterThan(0);
      // icon is a lucide component reference (function or forwardRef object)
      expect(['function', 'object']).toContain(typeof t.icon);
      expect(t.icon).toBeTruthy();
      expect(typeof t.template).toBe('string');
      expect(t.template.length).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = quickTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes the styling fields used for rendering', () => {
    for (const t of quickTemplates) {
      expect(typeof t.color).toBe('string');
      expect(typeof t.bgColor).toBe('string');
    }
  });
});

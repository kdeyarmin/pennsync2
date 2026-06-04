/**
 * Canonical categorical palette for charts (recharts `<Cell>` fills, series
 * colors, etc.). Centralizing the previously-duplicated `const COLORS = [...]`
 * arrays keeps chart theming consistent and editable in one place.
 *
 * Order is significant: callers cycle with `CHART_COLORS[i % CHART_COLORS.length]`,
 * so appending new colors is safe but reordering changes existing chart output.
 */
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

/**
 * Six-color subset, byte-identical to the first six entries of {@link CHART_COLORS}.
 * Provided for call sites that historically used a six-element palette so the
 * `index % length` color cycling is preserved exactly.
 */
export const CHART_COLORS_6 = CHART_COLORS.slice(0, 6);

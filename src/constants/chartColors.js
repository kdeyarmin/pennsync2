/**
 * Canonical categorical palette for charts (recharts `<Cell>` fills, series
 * colors, etc.). Centralizing the previously-duplicated `const COLORS = [...]`
 * arrays keeps chart theming consistent and editable in one place.
 *
 * Order is significant: callers cycle with `CHART_COLORS[i % CHART_COLORS.length]`,
 * so appending new colors is safe but reordering changes existing chart output.
 */
export const CHART_COLORS = [
  '#264491', // navy — brand primary
  '#0e9f6e', // emerald
  '#dcab35', // gold — brand accent
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#dc2626', // red
  '#db2777', // pink
  '#ea580c', // orange
];

/**
 * Six-color subset, byte-identical to the first six entries of {@link CHART_COLORS}.
 * Provided for call sites that historically used a six-element palette so the
 * `index % length` color cycling is preserved exactly.
 */
export const CHART_COLORS_6 = CHART_COLORS.slice(0, 6);

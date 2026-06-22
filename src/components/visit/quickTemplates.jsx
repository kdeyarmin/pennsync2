import { quickTemplatesPart1 } from "./quickTemplatesPart1";
import { quickTemplatesPart2 } from "./quickTemplatesPart2";

/**
 * Static library of quick-insert clinical documentation templates surfaced by
 * QuickTemplatesLibrary. The catalog is split across quickTemplatesPart1 (ids
 * 1–6) and quickTemplatesPart2 (ids 7–12) so each data module stays focused and
 * under the file-size limit. This module just concatenates them back into the
 * single `quickTemplates` array the UI consumes — the public API is unchanged.
 * Each entry: { id, name, category, icon (lucide component), color, bgColor,
 * template (insertable text) }.
 */
export const quickTemplates = [...quickTemplatesPart1, ...quickTemplatesPart2];
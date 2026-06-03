# Page layout standard

Every routed page in `src/pages` follows one structure so the whole app reads as
a single, consistent product. Two components enforce it:

- **`@/components/ui/PageContainer`** — the page shell. One content width
  (`max-w-7xl`), centered, with a `space-y-6` rhythm between top-level sections.
- **`@/components/ui/PageHeader`** — the page header. A subtle gradient card with
  an icon tile, an uppercase **eyebrow** (the page's section), a **title**, an
  optional **description**, optional **badges**/**actions**, and a favorite star.

## The canonical page

```jsx
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import { Users } from 'lucide-react';

export default function Example() {
  return (
    <PageContainer>
      <PageHeader
        icon={Users}
        eyebrow="Patient Care"
        title="Patients"
        description="Search, filter, and manage your patient roster."
        favoritePage="Example"
        actions={<Button>…</Button>}   // optional header buttons
      />
      {/* page sections */}
    </PageContainer>
  );
}
```

## Rules

1. **Never** wrap a page in `min-h-screen`, a background (`bg-*`,
   `bg-gradient-*`), or outer padding (`p-6`, `p-4 md:p-8`, …). The Layout's
   `<main>` already supplies the padding and the slate background. Pages that add
   their own produce double gutters and mismatched widths.
2. **One width.** Use `PageContainer` (`max-w-7xl`). Do not hand-pick
   `max-w-4xl/5xl/6xl` per page. Constrain a narrow form *inside* a card instead.
3. **One header.** Use `PageHeader`, not a hand-rolled `<h1>` block or a
   full-bleed colored banner. The `icon` + `eyebrow` come from the page's entry
   in `src/lib/nav.manifest.js` so the header matches the sidebar and
   breadcrumbs. Header buttons go in the `actions` prop.
4. **Icon tile** stays the default gradient — don't override `iconColor` per
   page, so every header shares one accent.

Public, pre-login pages (`JoinTelehealth`, `SignerPortal`) render outside the
Layout and are the only intentional exception: they keep their own centered,
full-height shell.

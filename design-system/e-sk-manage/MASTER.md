# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** e-SK Manage
**Generated:** 2026-10-11 04:12:04
**Category:** Government/Public Service
**Design Dials:** Variance 3/10 (Centered / Minimal) | Motion 2/10 (Subtle) | Density 6/10 (Standard)

---

## Project Adaptation (authoritative — overrides the generated values below)

The generated palette was adapted to the Sangguniang Kabataan brand. The live
tokens are CSS variables in `frontend/src/index.css`, exposed as Tailwind colors
in `frontend/tailwind.config.cjs`. **Use the tokens, never raw hex, in components.**

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `brand` | `#0F2740` SK navy | same | identity surfaces (hero bands, brand panel) |
| `primary` | `#1D4ED8` blue-700 | blue-400 | actions, links, active nav |
| `accent` | `#B45309` amber-700 | amber-500 | points / SK gold (passes AA as text) |
| `success` / `warning` / `danger` / `info` | green-700 / amber-700 / red-700 / sky-700 | lighter steps | status — always with text or icon, never color alone |
| `muted` / `subtle` | slate-600 / slate-500 | slate-300 / slate-400 | secondary text (all ≥ 4.5:1) |
| `chart-1`, `chart-2` | `#1D4ED8`, `#EB6834` | `#3B82F6`, `#D95926` | chart marks — validated with the dataviz palette checker in both modes |

- **Font:** Atkinson Hyperlegible Next (variable 200–800), from the typography recommendation.
- **Radii:** `xl` 10px, `2xl` 12px, `3xl` 16px — no bubbly cards. **Shadows:** borders carry structure; `shadow-card` is barely visible.
- **No gradients or decorative blobs** in app UI (only the landing hero's readability overlay on the photo).
- **App shell:** every portal uses `components/layout/AppShell.jsx` (collapsible icon-rail sidebar, labelled drawer, skip link, page-titled tabs). Members get a bottom tab bar (≤ 4 tabs + More).
  - Sidebar is the navy `sidebar` token (darker than the page in dark mode) with the SK blue/red/yellow stripe on top; the active page gets a `gold` marker and icon; section labels turn gold when they contain the current page; the footer links to the user's account (`accountTo`).
  - Top bar: breadcrumb (portal › section › page) on desktop, page title on phones — the page's own `PageHeader` carries the big title.
- **Shared pieces:** event date tiles and type colours come from `components/events/DateTile.jsx` + `lib/events.js`; program icons/status dots from `lib/programs.js`. Don't re-declare them per page.
- **Kabataan portal — "Clean & light" (chosen by the user, 2026-10-11; the navy/colour-block version was rejected):** `AppShell skin="light"` (white sidebar), light page, white cards. SK blue is the only accent; points are gold (`text-accent` + filled star). No `BrandBanner`, no navy heroes or illustrations, no orange blocks, no per-type coloured event badges (neutral `bg-surface2 text-muted`). The consoles keep `skin="navy"`.
- **Phones:** the top bar hides while scrolling down and returns on scroll up (`useHideOnScroll` in AppShell); bottom tabs stay fixed.
- **Tints:** `/12` opacity is enabled in Tailwind (`bg-primary/12` etc.); other steps follow Tailwind's default scale.
- **Tables:** `<Table label stack footer>` + `<TD label>` → cards on phones; `SortableTH` sets `aria-sort`; paginate long lists with `useTableData` + `TablePagination`.
- **Focus:** global 2px primary ring with offset; `prefers-reduced-motion` disables transitions/animations.
- **Dialogs:** `ui/Modal` labels itself, traps Tab, closes on Escape and restores focus. Dialogs can stack (e.g. a form opened from the program panel) — only the top one reacts to Escape/Tab.
- **Calendar:** `components/events/EventCalendar.jsx` (month grid; titles on desktop, dots on phones; selected day renders the page's own event card via `renderEvents`). Used by both consoles' Meetings and the kabataan Events page.
- **Program panel:** `components/programs/ProgramDetail.jsx` — Updates · Projects & activities (attendance) · Photos · Files. Open it from a program card; don't build separate pages for these.
- **Dates in forms:** use `localDateInput` / `localDateTimeInput` (`lib/utils.js`) and send meeting times with `combineDateTime` (`lib/events.js`). Never `toISOString().slice()` for input values — it is UTC (wrong day before 8 AM in PH).
- **QR codes** are drawn locally with `qrcode.react`; never send a check-in token to an outside QR service.

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0F172A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#334155` | `--color-secondary` |
| On Secondary | `#FFFFFF` | `--color-on-secondary` |
| Accent/CTA | `#0369A1` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#020617` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#020617` | `--color-card-foreground` |
| Muted | `#E8ECF1` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#0F172A` | `--color-ring` |

**Color Notes:** High contrast navy + blue

### Typography

- **Heading Font:** Atkinson Hyperlegible
- **Body Font:** Atkinson Hyperlegible
- **Mood:** accessible, readable, inclusive, WCAG, dyslexia-friendly, clear
- **Google Fonts:** [Atkinson Hyperlegible + Atkinson Hyperlegible](https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');
```

### Spacing Variables

*Density: 6/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #0369A1;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #0F172A;
  border: 2px solid #0F172A;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0F172A;
  outline: none;
  box-shadow: 0 0 0 3px #0F172A20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Minimal Single Column

- **Conversion Strategy:** Single CTA focus. Large typography. Lots of whitespace. No nav clutter. Mobile-first.
- **CTA Placement:** Center, large CTA button
- **Section Order:** Hero headline > Short description > Benefit bullets (3 max) > CTA > Footer

---

## Motion

**Scroll Reveal** (Subtle) — Trigger: scroll (viewport enter) | Duration: 300-400ms | Easing: `power1.out`

```js
gsap.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } });
```

**Framework notes:** Requires the ScrollTrigger plugin registered once via gsap.registerPlugin(ScrollTrigger); Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately

- ✅ Keep the y offset small (8-16px) so it reads as a fade, not a slide
- ❌ Don't reveal below-the-fold content needed for SEO/crawlers as invisible-by-default without a no-JS fallback
- ⚡ toggleActions 'play none none reverse' avoids re-triggering on every scroll direction change

---

## Anti-Patterns (Do NOT Use)

- ❌ Ornate design
- ❌ Low contrast
- ❌ Motion effects
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

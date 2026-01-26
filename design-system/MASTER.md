# Luma Design System

> **Global Source of Truth** for Luma - AI-Powered PDF Learning Assistant
>
> **Usage:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. Otherwise, strictly follow the rules below.

---

**Project:** Luma
**Type:** EdTech / Learning Platform
**Target Users:** University Students
**Generated:** 2026-01-24

---

## 1. Color Palette

### Primary Colors

| Role | Hex | RGB | Tailwind | CSS Variable | Usage |
|------|-----|-----|----------|--------------|-------|
| **Primary** | `#4F46E5` | `79, 70, 229` | `indigo-600` | `--color-primary` | Brand color, main actions, links |
| **Primary Light** | `#818CF8` | `129, 140, 248` | `indigo-400` | `--color-primary-light` | Hover states, secondary elements |
| **Primary Dark** | `#3730A3` | `55, 48, 163` | `indigo-800` | `--color-primary-dark` | Active states, emphasis |

### Secondary Colors

| Role | Hex | RGB | Tailwind | CSS Variable | Usage |
|------|-----|-----|----------|--------------|-------|
| **Secondary** | `#0EA5E9` | `14, 165, 233` | `sky-500` | `--color-secondary` | Accents, highlights |
| **Secondary Light** | `#38BDF8` | `56, 189, 248` | `sky-400` | `--color-secondary-light` | Hover, subtle accents |
| **Secondary Dark** | `#0284C7` | `2, 132, 199` | `sky-600` | `--color-secondary-dark` | Active states |

### Semantic Colors

| Role | Hex | Tailwind | CSS Variable | Usage |
|------|-----|----------|--------------|-------|
| **Success** | `#22C55E` | `green-500` | `--color-success` | Completed, positive feedback |
| **Success Light** | `#DCFCE7` | `green-100` | `--color-success-bg` | Success backgrounds |
| **Warning** | `#F59E0B` | `amber-500` | `--color-warning` | Cautions, alerts |
| **Warning Light** | `#FEF3C7` | `amber-100` | `--color-warning-bg` | Warning backgrounds |
| **Error** | `#EF4444` | `red-500` | `--color-error` | Errors, destructive actions |
| **Error Light** | `#FEE2E2` | `red-100` | `--color-error-bg` | Error backgrounds |
| **Info** | `#3B82F6` | `blue-500` | `--color-info` | Informational messages |
| **Info Light** | `#DBEAFE` | `blue-100` | `--color-info-bg` | Info backgrounds |

### Neutral Colors

| Role | Hex | Tailwind | CSS Variable | Usage |
|------|-----|----------|--------------|-------|
| **Text Primary** | `#1E293B` | `slate-800` | `--color-text` | Headings, primary text |
| **Text Secondary** | `#475569` | `slate-600` | `--color-text-muted` | Body text, descriptions |
| **Text Tertiary** | `#94A3B8` | `slate-400` | `--color-text-subtle` | Placeholder, disabled |
| **Border** | `#E2E8F0` | `slate-200` | `--color-border` | Borders, dividers |
| **Border Focus** | `#CBD5E1` | `slate-300` | `--color-border-focus` | Focus state borders |
| **Background** | `#FFFFFF` | `white` | `--color-bg` | Main background |
| **Background Alt** | `#F8FAFC` | `slate-50` | `--color-bg-alt` | Alternate sections |
| **Background Muted** | `#F1F5F9` | `slate-100` | `--color-bg-muted` | Cards, sidebars |
| **Background Accent** | `#EEF2FF` | `indigo-50` | `--color-bg-accent` | Highlighted sections |

### Color Usage Notes

- **Learning Indigo + Progress Green:** Primary indigo represents focus and concentration; green indicates progress and success
- **Light theme only:** Dark mode is NOT supported to maintain optimal reading conditions for academic content
- **Contrast ratio:** Minimum 4.5:1 for all text on backgrounds

---

## 2. Typography

### Font Family

| Type | Font | Fallback | Usage |
|------|------|----------|-------|
| **Heading** | `EB Garamond` | `Georgia, serif` | H1-H6, display text |
| **Body** | `Inter` | `system-ui, sans-serif` | Body text, UI elements |
| **Mono** | `JetBrains Mono` | `monospace` | Code, technical content |

### Google Fonts Import

```css
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Tailwind Config

```typescript
// tailwind.config.ts
fontFamily: {
  heading: ['EB Garamond', 'Georgia', 'serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

### Type Scale

| Level | Size | Line Height | Weight | Tailwind | Usage |
|-------|------|-------------|--------|----------|-------|
| **Display** | `48px` / `3rem` | `1.1` | `700` | `text-5xl font-bold` | Hero headlines |
| **H1** | `36px` / `2.25rem` | `1.2` | `700` | `text-4xl font-bold` | Page titles |
| **H2** | `30px` / `1.875rem` | `1.25` | `600` | `text-3xl font-semibold` | Section headings |
| **H3** | `24px` / `1.5rem` | `1.3` | `600` | `text-2xl font-semibold` | Subsection headings |
| **H4** | `20px` / `1.25rem` | `1.4` | `600` | `text-xl font-semibold` | Card titles |
| **H5** | `18px` / `1.125rem` | `1.4` | `600` | `text-lg font-semibold` | Small headings |
| **Body Large** | `18px` / `1.125rem` | `1.6` | `400` | `text-lg` | Lead paragraphs |
| **Body** | `16px` / `1rem` | `1.6` | `400` | `text-base` | Default body text |
| **Body Small** | `14px` / `0.875rem` | `1.5` | `400` | `text-sm` | Secondary text |
| **Caption** | `12px` / `0.75rem` | `1.4` | `400` | `text-xs` | Labels, timestamps |

### Typography Rules

- **Line length:** Maximum 65-75 characters per line for optimal readability
- **Paragraph spacing:** `1.5em` between paragraphs
- **Headings:** Use `font-heading` (EB Garamond) for all headings
- **Body text:** Use `font-sans` (Inter) for body and UI elements
- **Academic feel:** EB Garamond provides scholarly, university aesthetic

---

## 3. Spacing System

### Base Unit

Base spacing unit: `4px` / `0.25rem`

### Spacing Scale

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `space-0` | `0` | `p-0`, `m-0` | Reset |
| `space-1` | `4px` / `0.25rem` | `p-1`, `gap-1` | Tight gaps, icon padding |
| `space-2` | `8px` / `0.5rem` | `p-2`, `gap-2` | Inline spacing, icon margins |
| `space-3` | `12px` / `0.75rem` | `p-3`, `gap-3` | Button padding (vertical) |
| `space-4` | `16px` / `1rem` | `p-4`, `gap-4` | Standard padding, card padding |
| `space-5` | `20px` / `1.25rem` | `p-5`, `gap-5` | Medium spacing |
| `space-6` | `24px` / `1.5rem` | `p-6`, `gap-6` | Section padding, card gaps |
| `space-8` | `32px` / `2rem` | `p-8`, `gap-8` | Large section spacing |
| `space-10` | `40px` / `2.5rem` | `p-10`, `gap-10` | Major section gaps |
| `space-12` | `48px` / `3rem` | `p-12`, `gap-12` | Section margins |
| `space-16` | `64px` / `4rem` | `p-16`, `gap-16` | Hero padding, page margins |
| `space-20` | `80px` / `5rem` | `p-20`, `gap-20` | Large hero sections |
| `space-24` | `96px` / `6rem` | `p-24`, `gap-24` | Extra large spacing |

### Container Widths

| Name | Width | Tailwind | Usage |
|------|-------|----------|-------|
| **xs** | `320px` | `max-w-xs` | Mobile dialogs |
| **sm** | `384px` | `max-w-sm` | Small modals |
| **md** | `448px` | `max-w-md` | Forms, auth pages |
| **lg** | `512px` | `max-w-lg` | Content modals |
| **xl** | `576px` | `max-w-xl` | Large modals |
| **2xl** | `672px` | `max-w-2xl` | Reading content |
| **4xl** | `896px` | `max-w-4xl` | Main content area |
| **6xl** | `1152px` | `max-w-6xl` | Wide content |
| **7xl** | `1280px` | `max-w-7xl` | Full-width sections |

### Layout Spacing Guidelines

```
Page Container:
├── Horizontal padding: 16px (mobile) → 24px (tablet) → 32px (desktop)
├── Max width: 1280px (7xl)
└── Center: mx-auto

Section Spacing:
├── Between sections: 64px (py-16)
├── Within sections: 32px (gap-8)
└── Card grids: 24px (gap-6)

Component Internal:
├── Card padding: 24px (p-6)
├── Button padding: 12px 24px (py-3 px-6)
└── Input padding: 12px 16px (py-3 px-4)
```

---

## 4. Shadows & Elevation

| Level | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| **None** | `none` | `shadow-none` | Flat elements |
| **XS** | `0 1px 2px rgba(0,0,0,0.05)` | `shadow-xs` | Subtle lift |
| **SM** | `0 1px 3px rgba(0,0,0,0.1)` | `shadow-sm` | Buttons, small cards |
| **MD** | `0 4px 6px rgba(0,0,0,0.1)` | `shadow-md` | Cards, dropdowns |
| **LG** | `0 10px 15px rgba(0,0,0,0.1)` | `shadow-lg` | Modals, popovers |
| **XL** | `0 20px 25px rgba(0,0,0,0.15)` | `shadow-xl` | Large modals |
| **2XL** | `0 25px 50px rgba(0,0,0,0.25)` | `shadow-2xl` | Hero elements |

### Focus Ring

```css
/* Standard focus ring */
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
```

---

## 5. Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| **None** | `0` | `rounded-none` | Sharp edges |
| **SM** | `4px` | `rounded` | Small elements |
| **MD** | `6px` | `rounded-md` | Buttons, inputs |
| **LG** | `8px` | `rounded-lg` | Cards, containers |
| **XL** | `12px` | `rounded-xl` | Large cards, modals |
| **2XL** | `16px` | `rounded-2xl` | Hero cards |
| **Full** | `9999px` | `rounded-full` | Avatars, pills |

---

## 6. Component Styles

### Buttons

#### Primary Button
```tsx
// Tailwind classes
className="inline-flex items-center justify-center px-6 py-3
           bg-indigo-600 text-white font-medium rounded-lg
           hover:bg-indigo-700 active:bg-indigo-800
           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors duration-200 cursor-pointer"
```

#### Secondary Button
```tsx
className="inline-flex items-center justify-center px-6 py-3
           bg-white text-indigo-600 font-medium rounded-lg
           border-2 border-indigo-600
           hover:bg-indigo-50 active:bg-indigo-100
           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors duration-200 cursor-pointer"
```

#### Ghost Button
```tsx
className="inline-flex items-center justify-center px-6 py-3
           bg-transparent text-slate-600 font-medium rounded-lg
           hover:bg-slate-100 active:bg-slate-200
           focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
           transition-colors duration-200 cursor-pointer"
```

#### Danger Button
```tsx
className="inline-flex items-center justify-center px-6 py-3
           bg-red-600 text-white font-medium rounded-lg
           hover:bg-red-700 active:bg-red-800
           focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
           transition-colors duration-200 cursor-pointer"
```

#### Button Sizes

| Size | Padding | Font Size | Tailwind |
|------|---------|-----------|----------|
| **SM** | `8px 16px` | `14px` | `px-4 py-2 text-sm` |
| **MD** | `12px 24px` | `16px` | `px-6 py-3 text-base` |
| **LG** | `16px 32px` | `18px` | `px-8 py-4 text-lg` |

### Input Fields

```tsx
// Text Input
className="w-full px-4 py-3
           bg-white border border-slate-200 rounded-lg
           text-slate-800 placeholder:text-slate-400
           hover:border-slate-300
           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
           disabled:bg-slate-50 disabled:cursor-not-allowed
           transition-colors duration-200"

// Error State
className="... border-red-500 focus:ring-red-500"

// With Icon (left)
<div className="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
  <input className="... pl-10" />
</div>
```

### Cards

#### Standard Card
```tsx
className="bg-white rounded-xl p-6
           border border-slate-200
           shadow-sm hover:shadow-md
           transition-shadow duration-200"
```

#### Interactive Card
```tsx
className="bg-white rounded-xl p-6
           border border-slate-200
           shadow-sm hover:shadow-md hover:border-indigo-200
           transition-all duration-200 cursor-pointer"
```

#### Elevated Card
```tsx
className="bg-white rounded-xl p-6
           shadow-md hover:shadow-lg
           transition-shadow duration-200"
```

### Navigation

#### Top Navigation Bar
```tsx
className="fixed top-0 left-0 right-0 z-50
           bg-white/95 backdrop-blur-sm
           border-b border-slate-200
           px-6 py-4"
```

#### Sidebar
```tsx
className="fixed left-0 top-0 bottom-0 z-40
           w-64 bg-white border-r border-slate-200
           flex flex-col"
```

#### Nav Link
```tsx
// Default
className="flex items-center gap-3 px-4 py-2.5
           text-slate-600 rounded-lg
           hover:bg-slate-100 hover:text-slate-800
           transition-colors duration-200 cursor-pointer"

// Active
className="... bg-indigo-50 text-indigo-600 font-medium"
```

### Modals

```tsx
// Overlay
className="fixed inset-0 z-50
           bg-black/50 backdrop-blur-sm
           flex items-center justify-center p-4"

// Modal Container
className="bg-white rounded-2xl shadow-xl
           w-full max-w-md p-6
           animate-in fade-in zoom-in-95 duration-200"
```

### Badges / Tags

```tsx
// Default
className="inline-flex items-center px-2.5 py-0.5
           text-xs font-medium rounded-full
           bg-slate-100 text-slate-700"

// Primary
className="... bg-indigo-100 text-indigo-700"

// Success
className="... bg-green-100 text-green-700"

// Warning
className="... bg-amber-100 text-amber-700"

// Error
className="... bg-red-100 text-red-700"
```

### Progress Indicators

```tsx
// Progress Bar
<div className="h-2 bg-slate-200 rounded-full overflow-hidden">
  <div
    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>

// Circular Progress (use SVG or library)
```

### Tooltips

```tsx
className="absolute z-50 px-3 py-2
           bg-slate-800 text-white text-sm rounded-lg
           shadow-lg
           animate-in fade-in zoom-in-95 duration-150"
```

---

## 7. Icons

### Icon Library

Use **Lucide React** as the primary icon library.

```bash
npm install lucide-react
```

### Icon Sizes

| Size | Dimension | Tailwind | Usage |
|------|-----------|----------|-------|
| **XS** | `16px` | `w-4 h-4` | Inline, badges |
| **SM** | `20px` | `w-5 h-5` | Buttons, inputs |
| **MD** | `24px` | `w-6 h-6` | Navigation, cards |
| **LG** | `32px` | `w-8 h-8` | Feature icons |
| **XL** | `48px` | `w-12 h-12` | Hero, empty states |

### Icon Usage

```tsx
import { BookOpen, FileText, Settings, User } from 'lucide-react'

// In button
<button>
  <BookOpen className="w-5 h-5 mr-2" />
  Courses
</button>

// Standalone
<FileText className="w-6 h-6 text-slate-400" />
```

### Forbidden

- Never use emojis as icons
- Always use SVG icons from Lucide

---

## 8. Animation & Transitions

### Transition Durations

| Speed | Duration | Usage |
|-------|----------|-------|
| **Fast** | `150ms` | Hover states, color changes |
| **Normal** | `200ms` | Most interactions |
| **Slow** | `300ms` | Page transitions, modals |

### Transition Properties

```css
/* Default transition */
transition: all 200ms ease;

/* Color only */
transition: color 150ms ease, background-color 150ms ease;

/* Transform */
transition: transform 200ms ease-out;
```

### Tailwind Transition Classes

```tsx
// Standard
className="transition-all duration-200 ease-out"

// Colors only
className="transition-colors duration-150"

// Transform
className="transition-transform duration-200"

// Opacity
className="transition-opacity duration-200"
```

### Micro-interactions

```tsx
// Button hover lift
className="hover:translate-y-[-1px]"

// Card hover
className="hover:shadow-lg hover:translate-y-[-2px]"

// Scale on click
className="active:scale-95"
```

### Respect User Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Tailwind Prefix | Target |
|------------|-------|-----------------|--------|
| **Default** | `0px+` | (none) | Mobile first |
| **SM** | `640px+` | `sm:` | Large phones |
| **MD** | `768px+` | `md:` | Tablets |
| **LG** | `1024px+` | `lg:` | Laptops |
| **XL** | `1280px+` | `xl:` | Desktops |
| **2XL** | `1536px+` | `2xl:` | Large screens |

### Responsive Patterns

```tsx
// Grid columns
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Padding scale
className="p-4 md:p-6 lg:p-8"

// Text size
className="text-2xl md:text-3xl lg:text-4xl"

// Hide/Show
className="hidden md:block"  // Show on tablet+
className="block md:hidden"  // Mobile only
```

---

## 10. Accessibility Guidelines

### Color Contrast

- **Normal text:** Minimum 4.5:1 ratio
- **Large text (18px+ bold, 24px+ regular):** Minimum 3:1 ratio
- **Interactive elements:** Minimum 3:1 against adjacent colors

### Focus States

All interactive elements must have visible focus states:

```tsx
className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
```

### Keyboard Navigation

- Tab order must follow visual order
- All interactive elements must be keyboard accessible
- Escape key should close modals and dropdowns

### ARIA Labels

```tsx
// Icon-only buttons
<button aria-label="Close modal">
  <X className="w-5 h-5" />
</button>

// Form inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-describedby="email-hint" />
<p id="email-hint">We'll never share your email.</p>
```

### Touch Targets

Minimum touch target size: `44px x 44px`

---

## 11. Anti-Patterns (DO NOT USE)

| Pattern | Why to Avoid | Alternative |
|---------|--------------|-------------|
| Dark mode | Reduces readability for academic content | Light theme only |
| Emojis as icons | Inconsistent rendering, unprofessional | SVG icons (Lucide) |
| Missing cursor:pointer | Users don't know element is clickable | Add cursor-pointer |
| Layout-shifting hovers | Causes visual instability | Use opacity/color changes |
| Low contrast text | Accessibility violation | Minimum 4.5:1 ratio |
| Instant state changes | Feels jarring | 150-300ms transitions |
| Invisible focus states | Keyboard users can't navigate | Visible focus rings |
| Complex jargon | Confuses students | Simple, clear language |
| Horizontal scroll | Poor mobile experience | Responsive layouts |

---

## 12. Pre-Delivery Checklist

Before delivering any UI code, verify:

### Visual Quality
- [ ] No emojis used as icons (use Lucide SVG instead)
- [ ] All icons from consistent icon set (Lucide React)
- [ ] Hover states don't cause layout shift
- [ ] Consistent spacing using Tailwind scale

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-200ms)
- [ ] Loading states for async operations

### Accessibility
- [ ] Text contrast minimum 4.5:1
- [ ] Focus states visible for keyboard navigation
- [ ] Touch targets minimum 44x44px
- [ ] Form inputs have associated labels
- [ ] `prefers-reduced-motion` respected

### Responsive
- [ ] Works at 375px (mobile)
- [ ] Works at 768px (tablet)
- [ ] Works at 1024px (laptop)
- [ ] Works at 1440px (desktop)
- [ ] No horizontal scroll on any viewport
- [ ] No content hidden behind fixed elements

---

## 13. Tailwind CSS Variables

Add to `globals.css`:

```css
@layer base {
  :root {
    /* Colors */
    --color-primary: 79 70 229;        /* indigo-600 */
    --color-primary-light: 129 140 248; /* indigo-400 */
    --color-primary-dark: 55 48 163;    /* indigo-800 */

    --color-secondary: 14 165 233;      /* sky-500 */

    --color-success: 34 197 94;         /* green-500 */
    --color-warning: 245 158 11;        /* amber-500 */
    --color-error: 239 68 68;           /* red-500 */
    --color-info: 59 130 246;           /* blue-500 */

    --color-text: 30 41 59;             /* slate-800 */
    --color-text-muted: 71 85 105;      /* slate-600 */
    --color-text-subtle: 148 163 184;   /* slate-400 */

    --color-border: 226 232 240;        /* slate-200 */
    --color-bg: 255 255 255;            /* white */
    --color-bg-alt: 248 250 252;        /* slate-50 */
    --color-bg-muted: 241 245 249;      /* slate-100 */
    --color-bg-accent: 238 242 255;     /* indigo-50 */
  }
}
```

---

## 14. File Structure

```
design-system/
├── MASTER.md              # This file (Global Source of Truth)
└── pages/                  # Page-specific overrides
    ├── auth.md            # Login, Register, Reset Password
    ├── courses.md         # Course list, Course detail
    ├── reader.md          # PDF reader interface
    ├── settings.md        # User settings
    └── admin.md           # Admin dashboard
```

---

**Last Updated:** 2026-01-24
**Version:** 1.0.0

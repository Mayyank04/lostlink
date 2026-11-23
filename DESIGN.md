# LostLink 2.0 — Design System Specification (DESIGN.md)

This document establishes the official design system, visual direction, design tokens, typography scale, layout rules, component standards, and anti-patterns for LostLink 2.0.

---

## 1. Product Identity & Domain Direction

### 1.1 Purpose
LostLink 2.0 is a secure, multi-university lost and found management platform. It replaces informal social media posts and scattered bulletin boards with an accountable, privacy-preserving, institutional campus workflow.

### 1.2 Core Design Principles
1. **Institutional Trust & Restraint:** The visual language reflects academic infrastructure, public safety custody desks, and student affairs offices. We avoid whimsical SaaS decorations, saturated neon colors, and gimmicky AI metaphors.
2. **Deterministic Clarity:** Matching and claims are mathematically explainable (rule-based similarity scores across 6 weighted factors: Category 25%, Keywords 25%, Color 15%, Brand 10%, Location 15%, Timeline 10%). Icons and UI copy must reflect deterministic algorithms, not "magical AI".
3. **Zero-Knowledge Privacy by Design:** The UI strictly separates public item metadata from confidential ownership escrow proofs (serial snippets, lockscreen contents, identifying marks).
4. **Equal Edges & Compositional Balance:** Sections maintain equal vertical rhythm and structured grid alignments. We reject arbitrary bento box collages and floating gradient orbs.
5. **Authentic Product Content:** Every screen displays real platform capabilities, accurate academic terms, and transparent demonstration labels. Never use fabricated testimonials, unverified statistics, or fake partner logos.

---

## 2. Color System & Semantic Tokens

LostLink uses an academic teal and deep slate palette, supplemented by clear semantic status tokens.

### 2.1 Brand & Neutral Scales
- **Primary Brand (Academic Teal):**
  - `brandTeal-50`: `#F0FDFA` (Light tint backgrounds)
  - `brandTeal-100`: `#CCFBF1` (Subtle selection highlight)
  - `brandTeal-500`: `#14B8A6` (Active indicators)
  - `brandTeal-600`: `#0D9488` (Interactive hover states)
  - `brandTeal-700`: `#0F766E` (Primary button fill, brand accents, dark text on light)
  - `brandTeal-800`: `#115E59` (Primary button active state)
  - `brandTeal-900`: `#134E4A` (Deep surface tint)
  - `brandTeal-950`: `#042F2E` (Dark mode surface accent)

- **Neutral Canvas & Surfaces (Slate / Navy):**
  - Canvas Light: `slate-50` (`#F8FAFC`) — Soft neutral base preventing pure white glare
  - Surface Light (Cards / Panels): `#FFFFFF` — Crisp container surface with 1px border
  - Border Light: `slate-200` (`#E2E8F0`) — Structural 1px separation
  - Border Light Subtle: `slate-100` (`#F1F5F9`) — Internal divider lines
  - Canvas Dark: `slate-950` (`#020617`) — Deep background
  - Surface Dark: `slate-900` (`#0F172A`) — Card and panel surface
  - Border Dark: `slate-800` (`#1E293B`) — Dark mode container border
  - Text Primary: `slate-900` (`#0F172A`) on light / `white` (`#FFFFFF`) on dark
  - Text Secondary: `slate-600` (`#475569`) on light / `slate-300` (`#CBD5E1`) on dark
  - Text Muted: `slate-400` (`#94A3B8`) on light / `slate-500` (`#64748B`) on dark

### 2.2 Semantic Status Tokens
Status indicators are strictly bound to functional states:
| State | Light Background | Border Token | Text Token | Indicator Dot | Meaning |
|---|---|---|---|---|---|
| **Lost Report** | `rose-50` (`#FFF1F2`) | `rose-200` (`#FECDD3`) | `rose-700` (`#BE123C`) | `rose-500` | Item reported lost by owner |
| **Found Report** | `teal-50` (`#F0FDFA`) | `teal-200` (`#99F6E4`) | `teal-700` (`#0F766E`) | `teal-500` | Item recovered on campus |
| **Potential Match** | `indigo-50` (`#EEF2FF`) | `indigo-200` (`#C7D2FE`) | `indigo-700` (`#4338CA`) | `indigo-500` | Correlated by match engine |
| **Claim Under Review** | `amber-50` (`#FEFCE8`) | `amber-200` (`#FDE047`) | `amber-800` (`#854D0E`) | `amber-500` | Custody desk reviewing proof |
| **Returned / Complete**| `emerald-50` (`#F0FDF4`)| `emerald-200` (`#BBF7D0`)| `emerald-700` (`#15803D`)| `emerald-500`| Physical handover completed |

---

## 3. Typography Scale & Hierarchy

- **Primary Font Family:** Inter / Plus Jakarta Sans (`font-sans`)
- **Monospace Font Family:** JetBrains Mono / ui-monospace (`font-mono`) — strictly used for Reference IDs, Exchange Verification Codes, and Serial Numbers.

### 3.1 Scale & Leading
| Level | Font Size | Line Height | Tracking | Weight | Typical Element |
|---|---|---|---|---|---|
| Display Hero | 40px–52px (`sm:text-5xl`) | 1.1 | `tracking-tight` | `font-black` (900) | Landing page hero headline |
| H1 Section | 28px–36px (`text-3xl`) | 1.2 | `tracking-tight` | `font-bold` (700) | Major page headers & modal titles |
| H2 Subtitle | 20px–24px (`text-xl`) | 1.25 | `tracking-tight` | `font-bold` (700) | Section headings & card titles |
| H3 Component | 16px–18px (`text-base`) | 1.4 | `tracking-normal` | `font-semibold` (600) | Item card titles, table headers |
| Body Default | 14px (`text-sm`) | 1.5 | `tracking-normal` | `font-normal` (400) | Form labels, description text |
| Body Compact | 12px–13px (`text-xs`) | 1.5 | `tracking-normal` | `font-normal` (400) | Metadata, table cells, secondary copy |
| Caption / Code | 11px–12px (`text-[11px]`) | 1.4 | `tracking-wide` | `font-mono font-medium` | Ref IDs, timestamps, exchange tokens |

---

## 4. Radius, Border & Elevation Scale

### 4.1 Corner Radius Scale
To maintain consistent geometry across all viewports:
- **`rounded-md` (6px):** Badges, status pills, small code snippets, inline tags.
- **`rounded-lg` (8px):** Form inputs, buttons, dropdown menu triggers.
- **`rounded-xl` (12px):** Standard cards, table rows, image thumbnails.
- **`rounded-2xl` (16px):** Modals, interactive demonstration panels, large feature containers.
- **`rounded-full`:** Reserved exclusively for user profile avatars and status indicator dots.

### 4.2 Elevation & Shadows
- Avoid heavy, blurry `shadow-2xl` drop shadows.
- Primary tactile definition is achieved via a crisp **1px border** (`border border-slate-200 dark:border-slate-800`).
- Subtle elevation is used sparingly:
  - `shadow-xs`: Buttons, small dropdowns
  - `shadow-sm`: Interactive cards on hover (`hover:shadow-sm`)
  - `shadow-md`: Floating modals and slide-overs

---

## 5. Iconography Conventions

- **Library:** Lucide React icons.
- **Principle:** Every icon must perform a distinct orientation or navigational purpose. No decorative filler.
- **Replacements for AI Clichés:**
  - `Sparkles` $\rightarrow$ Replaced with `Target`, `SlidersHorizontal`, or `Layers` for the deterministic matching radar.
  - Emojis in titles/buttons $\rightarrow$ Replaced with standard SVG icons or clean semantic labels.
  - Bouncing arrows $\rightarrow$ Replaced with static `ArrowRight` with gentle horizontal transition on hover.

---

## 6. Motion & Interaction Standards

1. **Duration:** 150ms–200ms maximum for UI transitions (`duration-150 ease-out`).
2. **Hover States:**
   - Buttons: Subtle brightness/background shift (`bg-brandTeal-700 hover:bg-brandTeal-800`).
   - Cards: 1px border highlight (`hover:border-slate-300 dark:hover:border-slate-700`) and subtle 1px upward translation (`hover:-translate-y-0.5`).
   - No continuous bouncing, spinning, or large scale zoom transforms (`hover:scale-105` is removed).
3. **Accessibility:** All interactive elements feature high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-brandTeal-600 focus-visible:outline-none`).

---

## 7. Anti-Patterns & Prohibited AI Tropes

1. **No Harsh Multi-Hue Gradients:** No rainbow background gradients or artificial clip-text gradients across headlines.
2. **No Pure White Glare:** Canvas surfaces use `slate-50` with distinct card borders.
3. **No Radial Blur Orbs:** No floating `blur-3xl` gradient circles behind content.
4. **No Bento Grid Puzzles:** Layouts are structured as clean procedural timelines, split inspection panels, or data tables.
5. **No Fake Testimonials or Fabricated Metrics:** Any demonstration metrics must be explicitly identified as evaluation fixtures.
6. **No "It's not X, it's Y" Marketing Slogans:** Copy is clear, declarative, and domain-accurate.
7. **No Three Pricing Tiers:** LostLink is an institutional university platform without SaaS pricing plans.
8. **No Repetitive Checkmark Bullets:** Use labeled attributes and structured rows instead.

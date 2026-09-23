# GroundedApply - Design System & UI Architecture

## 1. Aesthetic Direction
GroundedApply adheres to a calm, technical, clear, and trustworthy aesthetic:
- **Visual Tone**: Precision tool, restrained palette, brand-tinted dark and light neutrals, hairline borders (`1px solid var(--border)`).
- **Primary Accent**: Calm indigo / cobalt (`#2563eb` / `#3b82f6`) for high-confidence actions, amber/gold (`#d97706` / `#f59e0b`) for review notices, and emerald (`#059669` / `#10b981`) for verified fills.
- **Typography**: Clean sans-serif system stack (`Inter`, system-ui, -apple-system, sans-serif), crisp tabular figures for metrics, sentence-case labels.
- **Scale**: 4-pixel rhythmic spacing scale (4px, 8px, 12px, 16px, 20px, 24px).
- **Target Sizes**: Minimum 44x44px for primary interactive touch/click targets.
- **Accessibility**: Strict WCAG AA contrast, explicit visible focus rings (`2px solid var(--ring)` with `offset`), reduced motion query support.

## 2. Surfaces
1. **Side Panel (380px - 440px)**:
   - Header with active application/opportunity pill, connection indicator, and settings gear.
   - Primary Navigation: 5 destinations:
     1. **Apply**: Overview of detected form, match counts, fill safe fields, review matches, undo transaction.
     2. **Questions**: List of written long-form questions, knowledge pairing, answer generation, length limit counter, humanized review, and insertion.
     3. **Profile**: Structured sections (Personal, Links, Education, Employment, Research, Projects, Skills, Awards, Leadership, Authorization, Availability, Preferences, Resumes).
     4. **Knowledge**: Searchable, categorized knowledge repository (Background, AI Safety, Projects, Experiments, etc.) with canonical facts and sensitivity levels.
     5. **Activity**: Locally tracked applications, statuses, timestamps, generated answers, and resume used.
2. **Floating Launcher**:
   - Compact, unobtrusive floating pill on supported form pages pinned to the right edge.
   - Clicking opens the Side Panel or triggers quick rescan.
3. **Options Page**:
   - Full-page interface for managing BYOK OpenAI API keys, base URLs, model names, test connection, bulk export/import, data wipe, and advanced privacy settings.
4. **Contextual In-Page Badges**:
   - Subtle helper pills alongside textareas to quickly jump to GroundedApply Questions view for drafting.

## 3. Interaction States
Every non-trivial component explicitly implements:
- **Empty State**: Clear contextual guidance, primary setup CTA.
- **Loading State**: Subtle indeterminate progress bars and skeleton loaders (no jarring spinners).
- **Success State**: Verified fill checkmarks, transient highlights on touched inputs.
- **Error State**: Non-blocking banner with actionable recovery steps. User inputs are never discarded on error.
- **Offline / Missing Key State**: Deterministic autofill remains 100% active; AI generation triggers clear inline setup prompt.

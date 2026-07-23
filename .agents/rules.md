# Frontend Development Rules

## Philosophy

Build products that look intentionally designed by experienced frontend engineers.

Avoid AI-generated patterns:
- Generic landing pages
- Random gradients
- Oversized rounded corners
- Excessive shadows
- Emoji everywhere
- Uneven spacing
- Placeholder copy
- Empty cards
- Repeated components

Every element must have a reason to exist.

---

# Design Principles

## Visual hierarchy

- One primary action per screen.
- Maximum two accent colors.
- Use whitespace instead of borders whenever possible.
- Typography creates hierarchy, not font weight alone.
- Align everything to an 8px spacing grid.

## Spacing

Allowed spacing:

4
8
12
16
24
32
48
64
96

Never use arbitrary spacing like:

17px
21px
35px

---

# Layout

Prefer:

- CSS Grid
- Flexbox
- max-width containers

Avoid:

- absolute positioning
- magic margins
- unnecessary wrappers

Every page should have:

Header

↓

Content

↓

Footer (if needed)

---

# Colors

Use semantic colors only.

Example:

Primary

Secondary

Success

Warning

Danger

Muted

Never hardcode random hex values throughout the app.

Define colors inside theme.

---

# Typography

Maximum:

- 2 font families
- 6 font sizes
- 3 font weights

Use:

Display

Heading

Subheading

Body

Caption

Avoid giant hero text unless justified.

---

# Components

Every component must satisfy:

Single responsibility.

Reusable.

Typed.

Accessible.

Avoid components over 250 lines.

Split logic from presentation.

---

# State

Prefer:

Server state

↓

Derived state

↓

Local state

Avoid duplicated state.

Never store computable values.

---

# Forms

Every form must include:

Validation

Loading state

Disabled state

Error state

Success state

Keyboard accessibility

Autocomplete where appropriate

---

# Buttons

Each screen should have:

One primary button.

Secondary buttons only when necessary.

Never place two primary buttons together.

---

# Icons

Use one icon library only.

Icons should communicate.

Never decorate for no reason.

---

# Animations

Animations must improve usability.

Duration:

150–250ms

Prefer:

opacity

transform

Avoid:

large bounces

long fades

spinning loaders everywhere

---

# Responsive

Support:

Mobile

Tablet

Desktop

No horizontal scrolling.

Touch targets:

minimum 44x44px

---

# Accessibility

Every page must include:

- semantic HTML
- keyboard navigation
- visible focus
- sufficient contrast
- aria labels where necessary

Never rely on color alone.

---

# Performance

Target:

Lighthouse > 90

Avoid:

large client bundles

unused dependencies

render blocking JS

memoize only when needed

Lazy load:

images

heavy components

routes

---

# Copywriting

Never generate lorem ipsum.

Never write:

"Welcome to our amazing platform"

"Unlock your potential"

"Revolutionary solution"

Write concise, human copy.

Buttons:

Good:

Save changes

Create project

Generate report

Bad:

Let's Go!

Start Now!!

Awesome!!

---

# Code Style

Use:

TypeScript

Strict mode

Named exports

Small files

Meaningful names

Avoid:

utils.ts with 200 helpers

helperFinal2.ts

component_new.tsx

---

# Folder Structure

src/

components/

features/

hooks/

services/

lib/

styles/

types/

pages/

Do not create deeply nested folders.

Maximum depth: 3.

---

# CSS

Prefer:

Tailwind utilities

or

CSS Modules

Avoid inline styles.

Avoid !important.

---

# Error Handling

Every async action must have:

Loading

Retry

Error message

Empty state

Timeout handling

---

# Empty States

Every empty state should explain:

Why it's empty.

What the user can do next.

---

# Tables

Support:

sorting

loading

empty state

overflow

responsive scrolling

---

# Modals

Never put large forms inside modals.

Maximum:

Confirmation

Small edits

Information

---

# AI Anti-Slop Checklist

Before finishing, verify:

□ Consistent spacing

□ Consistent typography

□ No duplicated components

□ No dead code

□ No unused imports

□ No placeholder copy

□ No unnecessary gradients

□ No random colors

□ Accessible

□ Responsive

□ Loading state exists

□ Error state exists

□ Empty state exists

□ Looks like a product, not a template

If any item fails, refactor before completing.

---

# Definition of Done

The implementation should be indistinguishable from code written by a senior frontend engineer.

Quality is preferred over speed.

Do not generate unnecessary code just to satisfy the prompt.

If uncertain, choose the simpler implementation.
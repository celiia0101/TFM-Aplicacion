---
name: Bio-Logic Interface
colors:
  surface: '#13121b'
  surface-dim: '#13121b'
  surface-bright: '#393842'
  surface-container-lowest: '#0e0d16'
  surface-container-low: '#1b1b24'
  surface-container: '#1f1f28'
  surface-container-high: '#2a2933'
  surface-container-highest: '#35343e'
  on-surface: '#e4e1ee'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#e4e1ee'
  inverse-on-surface: '#302f39'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#44e2cd'
  on-secondary: '#003731'
  secondary-container: '#03c6b2'
  on-secondary-container: '#004d44'
  tertiary: '#ffb695'
  on-tertiary: '#571f00'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#13121b'
  on-background: '#e4e1ee'
  surface-variant: '#35343e'
typography:
  display-timer:
    fontFamily: Plus Jakarta Sans
    fontSize: 80px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  card-gap: 20px
---

## Brand & Style

The design system is centered on the intersection of artificial intelligence and biological rhythm. It facilitates "Adaptive & Organic Tech," a style that merges the precision of algorithmic data with the fluidity of human energy levels. The goal is to evoke a sense of calm focus, high-tech support, and rhythmic breathing.

The aesthetic utilizes **Glassmorphism** as its primary structural metaphor—representing the transparency of AI logic—layered over **Organic Gradients** that shift based on the user's current cognitive load or energy state. The interface should feel like a living organism that breathes with the user, transitioning from sharp, high-contrast states during "Deep Work" to soft, diffused states during "Rest."

## Colors

The palette is anchored in a sophisticated **Dark Slate** background to minimize ocular fatigue. 

- **Primary Logic:** Deep Indigo represents the AI's analytical foundation. 
- **Active Focus:** Adaptive Teal is used for progress indicators and active timers, signifying flow.
- **Mood States:** The system dynamically tints UI highlights and background glows based on user state:
    - **Energetic (Soft Yellow):** High-intensity sprints.
    - **Stable (Calming Blue):** Standard focus intervals.
    - **Relaxed (Sage Green):** Long breaks and recovery.
    - **Low Energy (Muted Rose):** Suggested light tasks or extended rest.

Gradients should be implemented using `mesh` techniques to create a "glowing" effect behind glass layers.

## Typography

The typography strategy uses **Plus Jakarta Sans** for display and headlines to provide a friendly, organic roundness to the technical data. **Inter** is used for functional text and labels to ensure maximum legibility at small sizes during high-stress focus periods.

The `display-timer` role is the focal point of the application, requiring a tight letter-spacing to feel like a cohesive singular object. All labels use a slight tracking increase to maintain clarity against glowing background elements.

## Layout & Spacing

The design system employs a **Fluid Grid** approach. On mobile, components occupy a single column with a 24px margin. On desktop, a 12-column layout is used, but content is often centered in a "Focus Column" (8 columns wide) to prevent eye-strain across wide monitors.

Spacing follows an 8px linear scale. Large internal padding (24px+) is preferred within cards to enhance the "Organic" and "Airy" feel of the interface. Vertical rhythm should be generous to avoid cognitive overload.

## Elevation & Depth

Depth is achieved through **Glassmorphism** rather than traditional shadows. 

1.  **Base Layer:** The Dark Slate background.
2.  **Aura Layer:** Subtle, animated radial gradients (mesh gradients) that move slowly to represent the AI "breathing."
3.  **Glass Panels:** Surfaces use a background blur (12px to 20px) and a semi-transparent white stroke (10-15% opacity) to define edges.
4.  **Active Focus:** The primary timer card should have a slightly higher saturation in its border stroke and a more intense background blur to appear "closer" to the user.

## Shapes

The shape language is consistently **Rounded** (Level 2). This avoids the clinical feel of sharp corners while maintaining more structure than a full pill-shape. 

Buttons and input fields should use `rounded-lg` (16px), while the main Pomodoro timer and container cards use `rounded-xl` (24px) to emphasize their role as "vessels" for the user's time. Icons must be strictly rounded-stroke style with no sharp terminals.

## Components

- **Glass Buttons:** Use a high-blur background with a subtle inner glow. The "Start" button should use the Primary-to-Secondary gradient.
- **Adaptive Chips:** Small pill-shaped indicators for "Mood" or "Energy Level" that change color based on the Mood Accents defined in the color section.
- **The Breathing Timer:** A circular or organic blob-shaped progress indicator that expands and contracts slightly (1-2% scale) to mimic a breathing rhythm.
- **Bio-Cards:** Information containers with a 1px border-top (high-light) to simulate light hitting the edge of a glass pane.
- **Input Fields:** Minimalist under-lines or very soft glass wells. Use Inter for input text to contrast against the display typography.
- **Activity Feed:** A vertical list with soft connectors, using Teal for completed focus blocks and Slate for upcoming ones.
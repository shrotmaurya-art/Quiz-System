---
name: Cinematic Grandeur
colors:
  surface: '#0e141a'
  surface-dim: '#0e141a'
  surface-bright: '#333a40'
  surface-container-lowest: '#080f14'
  surface-container-low: '#161c22'
  surface-container: '#1a2026'
  surface-container-high: '#242b31'
  surface-container-highest: '#2f353c'
  on-surface: '#dde3eb'
  on-surface-variant: '#c7c5ce'
  inverse-surface: '#dde3eb'
  inverse-on-surface: '#2b3137'
  outline: '#919098'
  outline-variant: '#46464d'
  surface-tint: '#c1c4e8'
  primary: '#c1c4e8'
  on-primary: '#2b2e4b'
  primary-container: '#0a0e29'
  on-primary-container: '#777a9b'
  inverse-primary: '#595c7b'
  secondary: '#f0c03e'
  on-secondary: '#3e2e00'
  secondary-container: '#ba9000'
  on-secondary-container: '#3c2c00'
  tertiary: '#c4c0ff'
  on-tertiary: '#2300a3'
  tertiary-container: '#0a0049'
  on-tertiary-container: '#7268f9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#c1c4e8'
  on-primary-fixed: '#151935'
  on-primary-fixed-variant: '#414562'
  secondary-fixed: '#ffdf95'
  secondary-fixed-dim: '#f0c03e'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#594400'
  tertiary-fixed: '#e3dfff'
  tertiary-fixed-dim: '#c4c0ff'
  on-tertiary-fixed: '#130068'
  on-tertiary-fixed-variant: '#3a28c0'
  background: '#0e141a'
  on-background: '#dde3eb'
  surface-variant: '#2f353c'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '900'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system captures the high-stakes, theatrical essence of a flagship television quiz show. The brand personality is prestigious, intense, and intellectual, designed to evoke a sense of aspiration and dramatic tension. 

The aesthetic is a hybrid of **Cinematic Modernism** and **Glassmorphism**, utilizing deep radial depth to create a stage-like environment. The UI should feel like a premium broadcast interface: high-contrast, luminous, and authoritative. Visual elements are treated as physical light sources, with "glow-emitters" used to signify importance or active states, ensuring the interface remains legible and captivating even in low-light or projection environments.

## Colors
The palette is rooted in the depth of a midnight sky, contrasted against the prestige of molten gold.

- **Primary (Midnight Base):** #0A0E29 is the foundation. Use radial gradients transitioning to #1A1245 toward the center of the screen to simulate stage lighting.
- **Accent 1 (Trophy Gold):** #F5C542 is reserved for theatrical headings, victory states, and decorative borders. It should be treated as a metallic light source.
- **Accent 2 (Electric Pulse):** #5B4FE0 provides the "tech" layer. Use this for interactive states, focused inputs, and digital glows.
- **Surface Neutrals:** Use high-transparency whites and light greys (#E2E8F0) for body text to maintain maximum readability against dark backgrounds.

## Typography
The typography strategy creates a clear hierarchy between "Theatrical Legend" and "Functional Information."

- **Headlines:** Utilize *Playfair Display* for its high-contrast strokes and authoritative feel. These should almost always appear in Gold (#F5C542) or White with a subtle gold drop shadow.
- **Body:** *Work Sans* provides the necessary grounding. It is neutral and highly legible, ensuring complex questions and rules are processed quickly.
- **Labels/Data:** *Space Grotesk* is used for technical metadata (timers, scores, levels) to inject a subtle futuristic, geometric edge to the broadcast aesthetic.

## Layout & Spacing
The layout mimics a center-stage focus. 

- **Grid Strategy:** A 12-column fluid grid is used, but content is often constrained to a "Central Diamond" flow. Large margins on desktop (64px) help focus the user's eye on the center of the screen where the "Hot Seat" action occurs.
- **The Diamond Ratio:** Where possible, interactive containers should follow a hexagonal or diamond-like silhouette, often achieved through clipped corners or CSS `clip-path`.
- **Adaptation:** On mobile, the theatrical side-margins collapse, and the central "Question & Answer" stack occupies the full width to maintain font size scale.

## Elevation & Depth
Depth is not created through gray shadows, but through **Luminous Aura**.

- **Backdrop:** Use a heavy `backdrop-filter: blur(20px)` on all panels to create a frosted glass effect over the midnight-blue radial background.
- **Inner Glows:** Instead of outer shadows, use `box-shadow: inset 0 0 15px ...` using the Electric Purple or Gold to make panels look like they are powered by internal light.
- **Layering:** Level 1 surfaces are dark indigo. Level 2 (active panels) have a 1px solid Gold or Electric Purple border. Level 3 (active/hover) emits an outer bloom effect (diffuse shadow with 25% opacity of the border color).

## Shapes
The shape language is sharp and geometric, echoing the facets of a diamond. 

While the base `roundedness` is set to Soft (0.25rem) to keep the UI modern, the defining characteristic is the **Angled Corner**. Use 45-degree clipped corners for primary buttons and the main question container to evoke the classic TV show geometry. Borders must be crisp; avoid overly organic or circular shapes except for circular timers or profile avatars.

## Components
- **Buttons (Options):** Designed as wide, horizontal hexagonal panels. Default state is a semi-transparent Indigo with a thin White border. Active/Focus state switches the border to Gold with a "Pulsing" gold glow.
- **Question Card:** The largest component on the screen. Features a thick top and bottom Gold border with "light beam" gradients reflecting off the surface.
- **Lifelines/Chips:** Circular containers with an inner Electric Purple glow. When "used," they should desaturate to a 50% opacity grey.
- **Progress Ladder (Money Tree):** A vertical stack of labels. Current level is highlighted with a full Gold background and black text; upcoming levels are white; past levels are dimmed gold.
- **Input Fields:** Dark, recessed wells with a 1px Electric Purple bottom-border that expands to a full border glow on focus.
- **Animations:** All transitions should use a "fade and bloom" effect. When an answer is selected, it should pulse between its base color and a bright white light before locking into Green (Correct) or Red (Incorrect).
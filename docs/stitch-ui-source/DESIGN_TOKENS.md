# DESIGN TOKENS (Source of Truth from Stitch HTML/CSS Exports)

This file is the single reference for styling values (border-radius, box-shadow, color hex/rgba, gradient stops and angles, typography, and animations) extracted from the RAW Stitch exports in `docs/stitch-ui/`.

---

## Screen: admin_settings_backup

### 1. Custom Styles (<style> block)
```css
.glass-panel {
            backdrop-filter: blur(20px);
            box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.1), 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        .glow-border:focus-within {
            box-shadow: 0 0 10px rgba(196, 192, 255, 0.5);
            border-color: #c4c0ff;
        }
        .btn-gold-pulse {
            box-shadow: 0 0 15px rgba(240, 192, 62, 0.4);
            animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 15px rgba(240, 192, 62, 0.4); }
            50% { box-shadow: 0 0 25px rgba(240, 192, 62, 0.8); }
            100% { box-shadow: 0 0 15px rgba(240, 192, 62, 0.4); }
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-error-container": "#ffdad6",
                        "on-secondary-container": "#3c2c00",
                        "background": "#0e141a",
                        "primary-container": "#0a0e29",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "on-tertiary-container": "#7268f9",
                        "surface-container-highest": "#2f353c",
                        "on-background": "#dde3eb",
                        "surface-container-low": "#161c22",
                        "on-tertiary": "#2300a3",
                        "on-primary-fixed": "#151935",
                        "outline": "#919098",
                        "error": "#ffb4ab",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "surface": "#0e141a",
                        "inverse-surface": "#dde3eb",
                        "inverse-primary": "#595c7b",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-secondary": "#3e2e00",
                        "on-primary-container": "#777a9b",
                        "surface-container-high": "#242b31",
                        "error-container": "#93000a",
                        "secondary-container": "#ba9000",
                        "on-surface-variant": "#c7c5ce",
                        "on-secondary-fixed": "#251a00",
                        "surface-dim": "#0e141a",
                        "primary": "#c1c4e8",
                        "on-primary-fixed-variant": "#414562",
                        "tertiary-container": "#0a0049",
                        "surface-variant": "#2f353c",
                        "surface-tint": "#c1c4e8",
                        "surface-container": "#1a2026",
                        "surface-bright": "#333a40",
                        "secondary-fixed-dim": "#f0c03e",
                        "outline-variant": "#46464d",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-fixed": "#130068",
                        "on-secondary-fixed-variant": "#594400",
                        "on-primary": "#2b2e4b",
                        "on-surface": "#dde3eb",
                        "secondary-fixed": "#ffdf95",
                        "secondary": "#f0c03e",
                        "tertiary": "#c4c0ff",
                        "surface-container-lowest": "#080f14",
                        "inverse-on-surface": "#2b3137",
                        "on-error": "#690005",
                        "primary-fixed": "#dfe0ff"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-b`, `border-error/30`, `border-l-4`, `border-outline-variant/10`, `border-outline-variant/20`, `border-outline-variant/30`, `border-r`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-secondary/50`, `border-t`, `border-tertiary`, `border-tertiary-fixed-dim/30`, `border-tertiary-fixed-dim/50`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-background`, `bg-error-container/20`, `bg-primary-container/40`, `bg-secondary`, `bg-secondary/10`, `bg-secondary/20`, `bg-surface-container-high`, `bg-surface-container-highest/30`, `bg-surface-container-highest/40`, `bg-surface-container-highest/50`, `bg-surface-container-low/95`, `bg-surface-container-lowest`, `bg-surface/80`, `bg-tertiary/20`, `bg-transparent`, `text-2xl`, `text-background`, `text-body-lg`, `text-body-md`, `text-display-lg`, `text-error`, `text-headline-md`, `text-label-caps`, `text-on-background`, `text-on-surface`, `text-on-surface-variant`, `text-outline`, `text-secondary`, `text-secondary-fixed`, `text-sm`, `text-tertiary`, `text-xs`
- **Shadows:** `shadow-[0_0_15px_rgba(240,192,62,0.2)]`, `shadow-[0_0_20px_rgba(240,192,62,0.3)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_15px_rgba(196,192,255,0.1)]`, `shadow-[inset_0_0_20px_rgba(196,192,255,0.05)]`
- **Typography:** `font-black`, `font-body-lg`, `font-body-md`, `font-bold`, `font-display-lg`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `after:transition-all`, `duration-200`, `duration-300`, `transition-all`, `transition-colors`, `transition-transform`

---

## Screen: candidate_roster_management

### 1. Custom Styles (<style> block)
```css
.hexagon-clip {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .glow-gold {
            box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.5), 0 0 20px rgba(240, 192, 62, 0.2);
        }
        .glow-purple {
            box-shadow: inset 0 0 15px rgba(196, 192, 255, 0.5), 0 0 20px rgba(196, 192, 255, 0.2);
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                            "inverse-primary": "#595c7b",
                            "inverse-on-surface": "#2b3137",
                            "secondary-container": "#ba9000",
                            "on-primary": "#2b2e4b",
                            "error": "#ffb4ab",
                            "tertiary-fixed-dim": "#c4c0ff",
                            "primary-fixed-dim": "#c1c4e8",
                            "surface-tint": "#c1c4e8",
                            "surface-container-lowest": "#080f14",
                            "on-surface-variant": "#c7c5ce",
                            "on-primary-container": "#777a9b",
                            "on-primary-fixed-variant": "#414562",
                            "on-error": "#690005",
                            "surface-container": "#1a2026",
                            "secondary": "#f0c03e",
                            "surface-bright": "#333a40",
                            "on-secondary-fixed": "#251a00",
                            "surface-container-highest": "#2f353c",
                            "on-surface": "#dde3eb",
                            "surface-container-high": "#242b31",
                            "background": "#0e141a",
                            "error-container": "#93000a",
                            "tertiary-fixed": "#e3dfff",
                            "on-tertiary": "#2300a3",
                            "surface-dim": "#0e141a",
                            "outline": "#919098",
                            "surface-container-low": "#161c22",
                            "on-tertiary-fixed-variant": "#3a28c0",
                            "tertiary": "#c4c0ff",
                            "tertiary-container": "#0a0049",
                            "secondary-fixed-dim": "#f0c03e",
                            "primary-fixed": "#dfe0ff",
                            "on-error-container": "#ffdad6",
                            "surface-variant": "#2f353c",
                            "on-background": "#dde3eb",
                            "inverse-surface": "#dde3eb",
                            "on-secondary-container": "#3c2c00",
                            "secondary-fixed": "#ffdf95",
                            "surface": "#0e141a",
                            "primary": "#c1c4e8",
                            "on-tertiary-container": "#7268f9",
                            "outline-variant": "#46464d",
                            "primary-container": "#0a0e29",
                            "on-secondary": "#3e2e00",
                            "on-tertiary-fixed": "#130068",
                            "on-secondary-fixed-variant": "#594400",
                            "on-primary-fixed": "#151935"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 0;`
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-b`, `border-error/30`, `border-l-4`, `border-outline-variant`, `border-outline-variant/20`, `border-outline-variant/30`, `border-outline-variant/50`, `border-r`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-secondary/50`, `border-t`, `rounded-DEFAULT`, `rounded-full`, `rounded-lg`, `rounded-sm`, `rounded-xl`
- **Colors & Gradients:** `bg-background`, `bg-background/60`, `bg-outline`, `bg-outline-variant`, `bg-secondary`, `bg-secondary/10`, `bg-secondary/20`, `bg-surface-container`, `bg-surface-container-high/60`, `bg-surface-container-low/80`, `bg-surface-container-low/95`, `bg-surface-dim`, `bg-surface/80`, `bg-tertiary`, `bg-white`, `text-[10px]`, `text-[12px]`, `text-[13px]`, `text-[16px]`, `text-[18px]`, `text-[24px]`, `text-body-md`, `text-display-lg-mobile`, `text-error`, `text-headline-md`, `text-label-caps`, `text-on-surface`, `text-on-surface-variant`, `text-outline`, `text-outline-variant`, `text-secondary`, `text-tertiary`, `text-xs`
- **Shadows:** `shadow-[0_0_10px_rgba(196,192,255,0.6)]`, `shadow-[0_0_10px_rgba(240,192,62,0.2)]`, `shadow-[0_0_15px_rgba(240,192,62,0.2)]`, `shadow-[0_0_15px_rgba(240,192,62,0.3)]`, `shadow-[0_0_15px_rgba(240,192,62,0.4)]`, `shadow-[0_0_8px_rgba(240,192,62,0.8)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_15px_rgba(240,192,62,0.3),0_0_20px_rgba(240,192,62,0.2)]`, `shadow-[inset_0_0_20px_rgba(196,192,255,0.02)]`, `shadow-[inset_0_0_20px_rgba(196,192,255,0.05)]`
- **Typography:** `font-black`, `font-body-md`, `font-bold`, `font-display-lg`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`, `font-mono`
- **Animations & Transitions:** `duration-200`, `duration-300`, `transition-all`, `transition-colors`, `transition-transform`

---

## Screen: candidate_tablet_invalid_link_error

### 1. Custom Styles (<style> block)
```css
/* Base Styles & Glow Utilities */
        body {
            background-color: theme('colors.background');
            color: theme('colors.on-background');
            overflow-x: hidden;
        }
        
        .bg-radial-cinematic {
            background: radial-gradient(circle at center, #1a2026 0%, #080f14 100%);
        }

        .glass-panel {
            background: rgba(22, 28, 34, 0.75);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid theme('colors.secondary-fixed-dim');
            box-shadow: inset 0 0 20px rgba(240, 192, 62, 0.1), 0 0 30px rgba(240, 192, 62, 0.15);
        }
        
        .text-glow-secondary {
            text-shadow: 0 0 10px rgba(240, 192, 62, 0.5);
        }
        
        .pulse-slow {
            animation: pulse-op 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-op {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        /* Custom Diamond Shape for decorative elements */
        .clip-diamond {
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "inverse-primary": "#595c7b",
                    "tertiary": "#c4c0ff",
                    "on-secondary-container": "#3c2c00",
                    "error": "#ffb4ab",
                    "surface-container-low": "#161c22",
                    "secondary-fixed": "#ffdf95",
                    "error-container": "#93000a",
                    "tertiary-fixed-dim": "#c4c0ff",
                    "surface-container": "#1a2026",
                    "secondary-fixed-dim": "#f0c03e",
                    "surface-container-highest": "#2f353c",
                    "on-secondary-fixed": "#251a00",
                    "surface-container-high": "#242b31",
                    "on-primary-container": "#777a9b",
                    "surface-tint": "#c1c4e8",
                    "secondary": "#f0c03e",
                    "tertiary-container": "#0a0049",
                    "primary-container": "#0a0e29",
                    "on-secondary-fixed-variant": "#594400",
                    "on-tertiary": "#2300a3",
                    "on-error": "#690005",
                    "surface-bright": "#333a40",
                    "surface": "#0e141a",
                    "primary": "#c1c4e8",
                    "inverse-on-surface": "#2b3137",
                    "on-primary-fixed-variant": "#414562",
                    "surface-container-lowest": "#080f14",
                    "tertiary-fixed": "#e3dfff",
                    "on-error-container": "#ffdad6",
                    "on-tertiary-fixed-variant": "#3a28c0",
                    "on-tertiary-fixed": "#130068",
                    "surface-variant": "#2f353c",
                    "on-primary": "#2b2e4b",
                    "inverse-surface": "#dde3eb",
                    "on-surface": "#dde3eb",
                    "on-secondary": "#3e2e00",
                    "primary-fixed-dim": "#c1c4e8",
                    "primary-fixed": "#dfe0ff",
                    "on-primary-fixed": "#151935",
                    "outline-variant": "#46464d",
                    "on-surface-variant": "#c7c5ce",
                    "background": "#0e141a",
                    "outline": "#919098",
                    "on-tertiary-container": "#7268f9",
                    "surface-dim": "#0e141a",
                    "secondary-container": "#ba9000",
                    "on-background": "#dde3eb"
            };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-secondary`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-gradient-to-r`, `bg-radial-cinematic`, `bg-secondary`, `bg-surface-container`, `text-5xl`, `text-body-lg`, `text-center`, `text-display-lg-mobile`, `text-glow-secondary`, `text-label-caps`, `text-on-surface`, `text-outline`, `text-secondary`
- **Shadows:** `shadow-[0_0_10px_theme('colors.secondary')]`, `shadow-[inset_0_0_15px_rgba(240,192,62,0.3)]`
- **Typography:** `font-body-lg`, `font-display-lg-mobile`, `font-label-caps`
- **Animations & Transitions:** `duration-500`, `transition-all`

---

## Screen: candidate_tablet_live_mcq_active

### 1. Custom Styles (<style> block)
```css
body {
            background-color: #080f14; /* surface-container-lowest */
            color: #dde3eb; /* on-background */
        }
        
        .bg-cinematic-radial {
            background: radial-gradient(circle at 50% 30%, rgba(10, 0, 73, 0.8) 0%, rgba(8, 15, 20, 1) 70%);
        }
        
        .spotlight {
            background: radial-gradient(circle at 50% -20%, rgba(240, 192, 62, 0.2) 0%, transparent 60%);
        }

        .clip-diamond {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }

        .option-glow {
            box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.3);
        }
        
        .option-hover-bloom:hover {
            box-shadow: 0 0 25px rgba(240, 192, 62, 0.25), inset 0 0 15px rgba(240, 192, 62, 0.5);
        }
        
        .sparkle-bg {
            background-image: 
                radial-gradient(circle at 20% 40%, rgba(240, 192, 62, 0.4) 1px, transparent 1px),
                radial-gradient(circle at 80% 30%, rgba(240, 192, 62, 0.6) 2px, transparent 2px),
                radial-gradient(circle at 40% 70%, rgba(240, 192, 62, 0.3) 1px, transparent 1px),
                radial-gradient(circle at 70% 80%, rgba(240, 192, 62, 0.5) 1.5px, transparent 1.5px);
            background-size: 100px 100px;
            animation: twinkle 4s infinite alternate;
        }

        @keyframes twinkle {
            0% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .timer-ring circle {
            transition: stroke-dashoffset 0.5s linear;
        }
        
        /* Particle effect for button active state */
        .active-pulse {
            animation: pulse-glow 1.5s infinite;
        }
        
        @keyframes pulse-glow {
            0% { box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.3); }
            50% { box-shadow: inset 0 0 30px rgba(240, 192, 62, 0.6), 0 0 20px rgba(240, 192, 62, 0.4); }
            100% { box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.3); }
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "secondary-container": "#ba9000",
                        "surface-dim": "#0e141a",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-primary-fixed-variant": "#414562",
                        "inverse-primary": "#595c7b",
                        "surface-variant": "#2f353c",
                        "on-tertiary": "#2300a3",
                        "surface-tint": "#c1c4e8",
                        "inverse-surface": "#dde3eb",
                        "inverse-on-surface": "#2b3137",
                        "secondary-fixed": "#ffdf95",
                        "surface-container-high": "#242b31",
                        "on-error": "#690005",
                        "surface-container-lowest": "#080f14",
                        "on-background": "#dde3eb",
                        "outline": "#919098",
                        "surface-container-low": "#161c22",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "on-surface-variant": "#c7c5ce",
                        "primary-fixed": "#dfe0ff",
                        "on-secondary-fixed": "#251a00",
                        "background": "#0e141a",
                        "on-secondary": "#3e2e00",
                        "surface-container-highest": "#2f353c",
                        "secondary": "#f0c03e",
                        "outline-variant": "#46464d",
                        "on-secondary-container": "#3c2c00",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "on-tertiary-container": "#7268f9",
                        "surface": "#0e141a",
                        "secondary-fixed-dim": "#f0c03e",
                        "on-primary-container": "#777a9b",
                        "tertiary": "#c4c0ff",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed": "#151935",
                        "tertiary-fixed": "#e3dfff",
                        "primary": "#c1c4e8",
                        "error-container": "#93000a",
                        "primary-container": "#0a0e29",
                        "error": "#ffb4ab",
                        "on-tertiary-fixed": "#130068",
                        "on-secondary-fixed-variant": "#594400",
                        "on-surface": "#dde3eb",
                        "tertiary-container": "#0a0049",
                        "surface-bright": "#333a40",
                        "on-error-container": "#ffdad6",
                        "surface-container": "#1a2026"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 0;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-b`, `border-b-2`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-t`, `border-t-2`, `border-white/20`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-cinematic-radial`, `bg-gradient-to-r`, `bg-surface-container/60`, `bg-surface-dim/80`, `bg-surface-dim/90`, `bg-tertiary-container/80`, `text-body-md`, `text-center`, `text-display-lg-mobile`, `text-headline-md`, `text-label-caps`, `text-on-surface`, `text-on-surface-variant`, `text-on-surface-variant/70`, `text-secondary`, `text-secondary-fixed-dim`
- **Shadows:** `shadow-[0_-10px_40px_rgba(0,0,0,0.8)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_30px_rgba(240,192,62,0.1),0_10px_40px_rgba(0,0,0,0.6)]`
- **Typography:** `font-body-md`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `duration-150`, `duration-200`, `duration-300`, `transition-all`, `transition-colors`

---

## Screen: candidate_tablet_live_mcq_locked_in

### 1. Custom Styles (<style> block)
```css
.hexagon-clip {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .radial-bg {
            background: radial-gradient(circle at center, rgba(10, 0, 73, 0.8) 0%, #080f14 100%);
        }
        .spotlight {
            background: radial-gradient(ellipse at top, rgba(240, 192, 62, 0.15) 0%, transparent 70%);
        }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.8), 0 0 20px rgba(240, 192, 62, 0.4); }
            50% { box-shadow: inset 0 0 25px rgba(240, 192, 62, 1), 0 0 40px rgba(240, 192, 62, 0.6); }
        }
        .locked-glow {
            animation: pulse-glow 2s infinite ease-in-out;
        }
        .timer-ring {
            stroke-dasharray: 283;
            stroke-dashoffset: 113; /* ~60% */
            transition: stroke-dashoffset 1s linear;
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "secondary-container": "#ba9000",
                      "surface-dim": "#0e141a",
                      "primary-fixed-dim": "#c1c4e8",
                      "on-primary-fixed-variant": "#414562",
                      "inverse-primary": "#595c7b",
                      "surface-variant": "#2f353c",
                      "on-tertiary": "#2300a3",
                      "surface-tint": "#c1c4e8",
                      "inverse-surface": "#dde3eb",
                      "inverse-on-surface": "#2b3137",
                      "secondary-fixed": "#ffdf95",
                      "surface-container-high": "#242b31",
                      "on-error": "#690005",
                      "surface-container-lowest": "#080f14",
                      "on-background": "#dde3eb",
                      "outline": "#919098",
                      "surface-container-low": "#161c22",
                      "on-tertiary-fixed-variant": "#3a28c0",
                      "on-surface-variant": "#c7c5ce",
                      "primary-fixed": "#dfe0ff",
                      "on-secondary-fixed": "#251a00",
                      "background": "#0e141a",
                      "on-secondary": "#3e2e00",
                      "surface-container-highest": "#2f353c",
                      "secondary": "#f0c03e",
                      "outline-variant": "#46464d",
                      "on-secondary-container": "#3c2c00",
                      "tertiary-fixed-dim": "#c4c0ff",
                      "on-tertiary-container": "#7268f9",
                      "surface": "#0e141a",
                      "secondary-fixed-dim": "#f0c03e",
                      "on-primary-container": "#777a9b",
                      "tertiary": "#c4c0ff",
                      "on-primary": "#2b2e4b",
                      "on-primary-fixed": "#151935",
                      "tertiary-fixed": "#e3dfff",
                      "primary": "#c1c4e8",
                      "error-container": "#93000a",
                      "primary-container": "#0a0e29",
                      "error": "#ffb4ab",
                      "on-tertiary-fixed": "#130068",
                      "on-secondary-fixed-variant": "#594400",
                      "on-surface": "#dde3eb",
                      "tertiary-container": "#0a0049",
                      "surface-bright": "#333a40",
                      "on-error-container": "#ffdad6",
                      "surface-container": "#1a2026"
              };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-b`, `border-b-4`, `border-outline/30`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-t`, `border-t-4`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjUiIG51bU9jdGF2ZXM9IjEiIHN0aXRjaFRpbZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]`, `bg-gradient-to-r`, `bg-primary-container/40`, `bg-secondary`, `bg-secondary/5`, `bg-surface-container-lowest`, `bg-surface-container/50`, `bg-surface-dim/80`, `bg-surface-dim/90`, `text-[10px]`, `text-body-lg`, `text-center`, `text-display-lg-mobile`, `text-headline-md`, `text-label-caps`, `text-left`, `text-on-secondary`, `text-on-surface`, `text-on-surface-variant`, `text-on-surface-variant/70`, `text-secondary`, `text-surface-variant`
- **Shadows:** `shadow-[0_-10px_40px_rgba(0,0,0,0.8)]`, `shadow-[0_10px_30px_rgba(240,192,62,0.3)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_30px_rgba(240,192,62,0.1)]`
- **Typography:** `font-body-lg`, `font-bold`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `duration-150`, `duration-200`, `duration-300`, `transition-all`, `transition-colors`

---

## Screen: candidate_tablet_rapid_fire_active

### 1. Custom Styles (<style> block)
```css
.radial-bg {
            background: radial-gradient(circle at center, #1a1a3a 0%, #080f14 80%);
        }
        .spotlight {
            background: radial-gradient(ellipse at top, rgba(240, 192, 62, 0.15) 0%, transparent 60%);
        }
        .beam {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: conic-gradient(from 180deg at 50% 100%, transparent 45%, rgba(240, 192, 62, 0.05) 50%, transparent 55%);
            pointer-events: none;
        }
        .pulse-border {
            animation: pulse-ring 2s infinite;
        }
        @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(240, 192, 62, 0.7); }
            70% { box-shadow: 0 0 0 30px rgba(240, 192, 62, 0); }
            100% { box-shadow: 0 0 0 0 rgba(240, 192, 62, 0); }
        }
        .timer-ring {
            transform: rotate(-90deg);
            transform-origin: center;
        }
        .timer-circle {
            stroke-dasharray: 283;
            stroke-dashoffset: 0;
            animation: countdown 15s linear infinite;
        }
        @keyframes countdown {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: 283; }
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-container-high": "#242b31",
                        "on-surface": "#dde3eb",
                        "outline-variant": "#46464d",
                        "on-primary-fixed-variant": "#414562",
                        "tertiary-container": "#0a0049",
                        "inverse-primary": "#595c7b",
                        "on-primary-container": "#777a9b",
                        "on-error": "#690005",
                        "error": "#ffb4ab",
                        "tertiary-fixed": "#e3dfff",
                        "on-secondary": "#3e2e00",
                        "on-secondary-fixed": "#251a00",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "inverse-on-surface": "#2b3137",
                        "outline": "#919098",
                        "background": "#0e141a",
                        "error-container": "#93000a",
                        "surface-container-low": "#161c22",
                        "on-error-container": "#ffdad6",
                        "surface-container": "#1a2026",
                        "on-secondary-container": "#3c2c00",
                        "surface-tint": "#c1c4e8",
                        "on-tertiary": "#2300a3",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed": "#151935",
                        "secondary": "#f0c03e",
                        "primary-container": "#0a0e29",
                        "surface": "#0e141a",
                        "primary-fixed": "#dfe0ff",
                        "surface-dim": "#0e141a",
                        "secondary-fixed": "#ffdf95",
                        "on-surface-variant": "#c7c5ce",
                        "on-secondary-fixed-variant": "#594400",
                        "on-tertiary-container": "#7268f9",
                        "secondary-container": "#ba9000",
                        "primary": "#c1c4e8",
                        "surface-container-highest": "#2f353c",
                        "primary-fixed-dim": "#c1c4e8",
                        "secondary-fixed-dim": "#f0c03e",
                        "on-tertiary-fixed": "#130068",
                        "tertiary": "#c4c0ff",
                        "surface-bright": "#333a40",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "surface-container-lowest": "#080f14",
                        "surface-variant": "#2f353c",
                        "on-background": "#dde3eb",
                        "inverse-surface": "#dde3eb"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`
- `filter: drop-shadow(0 0 8px rgba(240,192,62,0.8));`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-4`, `border-b`, `border-secondary-fixed`, `border-secondary/20`, `border-secondary/30`, `border-t`, `rounded-full`
- **Colors & Gradients:** `bg-background`, `bg-gradient-to-br`, `bg-secondary/20`, `bg-surface-dim/80`, `bg-surface-dim/90`, `text-[10px]`, `text-[64px]`, `text-center`, `text-headline-md`, `text-label-caps`, `text-on-secondary`, `text-on-surface`, `text-on-surface-variant/70`, `text-secondary`, `text-xl`
- **Shadows:** `shadow-[0_-10px_40px_rgba(0,0,0,0.8)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_40px_rgba(255,255,255,0.4),0_10px_50px_rgba(240,192,62,0.6)]`
- **Typography:** `font-bold`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `duration-150`, `duration-200`, `duration-300`, `transition-all`, `transition-colors`, `transition-transform`

---

## Screen: candidate_tablet_rapid_fire_locked

### 1. Custom Styles (<style> block)
```css
.material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .material-symbols-outlined.fill {
            font-variation-settings: 'FILL' 1;
        }
        
        .hex-clip {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        
        .glow-secondary {
            box-shadow: inset 0 0 20px rgba(240, 192, 62, 0.4), 0 0 30px rgba(240, 192, 62, 0.2);
        }
        
        .radial-bg {
            background: radial-gradient(circle at center, #151935 0%, #080f14 80%);
        }

        .timer-circle {
            stroke-dasharray: 283;
            stroke-dashoffset: 80;
            transition: stroke-dashoffset 1s linear;
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "surface-container-high": "#242b31",
                      "on-surface": "#dde3eb",
                      "outline-variant": "#46464d",
                      "on-primary-fixed-variant": "#414562",
                      "tertiary-container": "#0a0049",
                      "inverse-primary": "#595c7b",
                      "on-primary-container": "#777a9b",
                      "on-error": "#690005",
                      "error": "#ffb4ab",
                      "tertiary-fixed": "#e3dfff",
                      "on-secondary": "#3e2e00",
                      "on-secondary-fixed": "#251a00",
                      "on-tertiary-fixed-variant": "#3a28c0",
                      "inverse-on-surface": "#2b3137",
                      "outline": "#919098",
                      "background": "#0e141a",
                      "error-container": "#93000a",
                      "surface-container-low": "#161c22",
                      "on-error-container": "#ffdad6",
                      "surface-container": "#1a2026",
                      "on-secondary-container": "#3c2c00",
                      "surface-tint": "#c1c4e8",
                      "on-tertiary": "#2300a3",
                      "on-primary": "#2b2e4b",
                      "on-primary-fixed": "#151935",
                      "secondary": "#f0c03e",
                      "primary-container": "#0a0e29",
                      "surface": "#0e141a",
                      "primary-fixed": "#dfe0ff",
                      "surface-dim": "#0e141a",
                      "secondary-fixed": "#ffdf95",
                      "on-surface-variant": "#c7c5ce",
                      "on-secondary-fixed-variant": "#594400",
                      "on-tertiary-container": "#7268f9",
                      "secondary-container": "#ba9000",
                      "primary": "#c1c4e8",
                      "surface-container-highest": "#2f353c",
                      "primary-fixed-dim": "#c1c4e8",
                      "secondary-fixed-dim": "#f0c03e",
                      "on-tertiary-fixed": "#130068",
                      "tertiary": "#c4c0ff",
                      "surface-bright": "#333a40",
                      "tertiary-fixed-dim": "#c4c0ff",
                      "surface-container-lowest": "#080f14",
                      "surface-variant": "#2f353c",
                      "on-background": "#dde3eb",
                      "inverse-surface": "#dde3eb"
              };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-b`, `border-secondary/20`, `border-secondary/30`, `border-t`, `rounded-full`
- **Colors & Gradients:** `bg-secondary`, `bg-secondary-fixed/5`, `bg-surface-dim`, `bg-surface-dim/80`, `bg-surface-dim/90`, `bg-tertiary-fixed/5`, `text-3xl`, `text-center`, `text-display-lg-mobile`, `text-headline-md`, `text-label-caps`, `text-on-secondary-fixed`, `text-on-surface`, `text-on-surface-variant/70`, `text-secondary`
- **Shadows:** `shadow-[0_-10px_40px_rgba(0,0,0,0.8)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`
- **Typography:** `font-bold`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `duration-150`, `duration-200`, `duration-300`, `transition-all`, `transition-colors`

---

## Screen: candidate_tablet_results_correct

### 1. Custom Styles (<style> block)
```css
.radial-bg {
            background: radial-gradient(circle at 50% 40%, rgba(10, 14, 41, 1) 0%, rgba(8, 15, 20, 1) 70%, rgba(0, 0, 0, 1) 100%);
        }
        .glow-border {
            box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.3), 0 0 30px rgba(240, 192, 62, 0.1);
        }
        .correct-pulse {
            animation: pulse-correct 2s infinite ease-in-out;
        }
        @keyframes pulse-correct {
            0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(74, 222, 128, 0); }
            100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        .diamond-clip {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
        }
        /* Particles */
        .particles-container { position: absolute; inset: 0; pointer-events: none; z-index: 10; overflow: hidden; }
        .particle {
            position: absolute;
            background: rgba(240, 192, 62, 0.6);
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(240, 192, 62, 0.8);
            animation: float-up 10s infinite linear;
        }
        @keyframes float-up {
            0% { transform: translateY(100vh) scale(0); opacity: 0; }
            20% { opacity: 1; transform: translateY(80vh) scale(1); }
            80% { opacity: 0.8; }
            100% { transform: translateY(-10vh) scale(0.5); opacity: 0; }
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "inverse-primary": "#595c7b",
                        "secondary": "#f0c03e",
                        "primary-container": "#0a0e29",
                        "on-primary-container": "#777a9b",
                        "outline": "#919098",
                        "error-container": "#93000a",
                        "on-secondary-fixed-variant": "#594400",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-fixed": "#130068",
                        "outline-variant": "#46464d",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "surface-dim": "#0e141a",
                        "on-background": "#dde3eb",
                        "surface-variant": "#2f353c",
                        "surface-container": "#1a2026",
                        "surface": "#0e141a",
                        "surface-container-lowest": "#080f14",
                        "secondary-container": "#ba9000",
                        "background": "#0e141a",
                        "primary-fixed": "#dfe0ff",
                        "surface-bright": "#333a40",
                        "on-surface-variant": "#c7c5ce",
                        "primary": "#c1c4e8",
                        "inverse-surface": "#dde3eb",
                        "primary-fixed-dim": "#c1c4e8",
                        "inverse-on-surface": "#2b3137",
                        "on-secondary-fixed": "#251a00",
                        "on-error": "#690005",
                        "surface-container-high": "#242b31",
                        "on-primary-fixed": "#151935",
                        "error": "#ffb4ab",
                        "on-secondary": "#3e2e00",
                        "tertiary": "#c4c0ff",
                        "secondary-fixed": "#ffdf95",
                        "on-error-container": "#ffdad6",
                        "surface-container-low": "#161c22",
                        "surface-container-highest": "#2f353c",
                        "surface-tint": "#c1c4e8",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-container": "#3c2c00",
                        "tertiary-container": "#0a0049",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "on-tertiary": "#2300a3",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed-variant": "#414562",
                        "on-surface": "#dde3eb",
                        "secondary-fixed-dim": "#f0c03e"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-[#4ade80]`, `border-b-2`, `border-l-2`, `border-outline-variant/30`, `border-r-2`, `border-secondary/30`, `border-secondary/50`, `border-t-2`, `rounded-3xl`, `rounded-bl-3xl`, `rounded-br-3xl`, `rounded-full`, `rounded-tl-3xl`, `rounded-tr-3xl`, `rounded-xl`
- **Colors & Gradients:** `bg-background`, `bg-secondary-fixed`, `bg-secondary/5`, `bg-surface-container-lowest`, `bg-surface-container-lowest/50`, `bg-surface-dim/80`, `text-[#4ade80]`, `text-[12px]`, `text-[64px]`, `text-body-lg`, `text-center`, `text-display-lg-mobile`, `text-headline-md`, `text-label-caps`, `text-lg`, `text-on-background`, `text-on-surface-variant`, `text-on-surface-variant/70`, `text-primary-fixed`, `text-secondary`, `text-secondary-fixed/60`
- **Shadows:** `shadow-[0_20px_50px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_20px_rgba(74,222,128,0.2)]`
- **Typography:** `font-body-lg`, `font-body-md`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `animate-pulse`, `duration-700`, `transition-all`

---

## Screen: candidate_tablet_results_incorrect

### 1. Custom Styles (<style> block)
```css
.clip-diamond {
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        .clip-hex {
            clip-path: polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
        }
        
        /* Particle Animation */
        .particle {
            position: absolute;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            pointer-events: none;
            animation: float 4s infinite linear;
        }
        @keyframes float {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            50% { opacity: 0.8; }
            100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
        }

        /* Ambient Glows */
        .ambient-glow-error {
            box-shadow: inset 0 0 40px rgba(147, 0, 10, 0.4), 0 0 30px rgba(147, 0, 10, 0.2);
        }
        .ambient-glow-correct {
            box-shadow: inset 0 0 20px rgba(240, 192, 62, 0.2), 0 0 15px rgba(240, 192, 62, 0.1);
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "inverse-primary": "#595c7b",
                        "secondary": "#f0c03e",
                        "primary-container": "#0a0e29",
                        "on-primary-container": "#777a9b",
                        "outline": "#919098",
                        "error-container": "#93000a",
                        "on-secondary-fixed-variant": "#594400",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-fixed": "#130068",
                        "outline-variant": "#46464d",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "surface-dim": "#0e141a",
                        "on-background": "#dde3eb",
                        "surface-variant": "#2f353c",
                        "surface-container": "#1a2026",
                        "surface": "#0e141a",
                        "surface-container-lowest": "#080f14",
                        "secondary-container": "#ba9000",
                        "background": "#0e141a",
                        "primary-fixed": "#dfe0ff",
                        "surface-bright": "#333a40",
                        "on-surface-variant": "#c7c5ce",
                        "primary": "#c1c4e8",
                        "inverse-surface": "#dde3eb",
                        "primary-fixed-dim": "#c1c4e8",
                        "inverse-on-surface": "#2b3137",
                        "on-secondary-fixed": "#251a00",
                        "on-error": "#690005",
                        "surface-container-high": "#242b31",
                        "on-primary-fixed": "#151935",
                        "error": "#ffb4ab",
                        "on-secondary": "#3e2e00",
                        "tertiary": "#c4c0ff",
                        "secondary-fixed": "#ffdf95",
                        "on-error-container": "#ffdad6",
                        "surface-container-low": "#161c22",
                        "surface-container-highest": "#2f353c",
                        "surface-tint": "#c1c4e8",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-container": "#3c2c00",
                        "tertiary-container": "#0a0049",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "on-tertiary": "#2300a3",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed-variant": "#414562",
                        "on-surface": "#dde3eb",
                        "secondary-fixed-dim": "#f0c03e"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-b`, `border-outline-variant/30`, `border-outline/50`, `border-secondary/20`, `border-secondary/30`, `border-t`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-[radial-gradient(circle_at_center,_var(--tw-colors-primary-container)_0%,_var(--tw-colors-surface-container-lowest)_100%)]`, `bg-[radial-gradient(ellipse_at_top,_rgba(240,192,62,0.1)_0%,_transparent_70%)]`, `bg-background`, `bg-error-container/10`, `bg-secondary/20`, `bg-surface-container-high/80`, `bg-surface-dim/80`, `bg-surface-dim/90`, `bg-surface-variant/40`, `text-5xl`, `text-[10px]`, `text-body-lg`, `text-center`, `text-display-lg-mobile`, `text-error-container`, `text-headline-md`, `text-label-caps`, `text-on-background`, `text-on-surface`, `text-on-surface-variant`, `text-on-surface-variant/50`, `text-on-surface-variant/70`, `text-secondary`, `text-secondary/80`
- **Shadows:** `shadow-[0_-10px_40px_rgba(0,0,0,0.8)]`, `shadow-[0_0_15px_rgba(240,192,62,0.3)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]`
- **Typography:** `font-body-lg`, `font-body-md`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `animate-[fadeIn_0.5s_ease-out]`, `animate-[fadeIn_0.5s_ease-out_0.5s_both]`, `animate-[fadeIn_0.5s_ease-out_0.8s_both]`, `animate-[scaleIn_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_0.2s_both]`, `duration-150`, `duration-200`, `duration-300`, `duration-700`, `transition-all`, `transition-colors`

---

## Screen: candidate_tablet_results_winner

### 1. Custom Styles (<style> block)
```css
.clip-hexagon {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        
        .glow-gold {
            box-shadow: inset 0 0 20px rgba(240, 192, 62, 0.4), 0 0 30px rgba(240, 192, 62, 0.2);
        }
        
        .glow-red {
            box-shadow: inset 0 0 20px rgba(255, 180, 171, 0.3), 0 0 20px rgba(255, 180, 171, 0.1);
        }
        
        .glow-green {
            box-shadow: inset 0 0 20px rgba(163, 222, 190, 0.4), 0 0 30px rgba(163, 222, 190, 0.2);
        }
        
        .bg-radial-theatrical {
            background: radial-gradient(circle at 50% 40%, rgba(36, 43, 49, 0.8) 0%, rgba(14, 20, 26, 1) 70%);
        }
        
        .particles-overlay {
            background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 30px 30px;
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "inverse-primary": "#595c7b",
                        "secondary": "#f0c03e",
                        "primary-container": "#0a0e29",
                        "on-primary-container": "#777a9b",
                        "outline": "#919098",
                        "error-container": "#93000a",
                        "on-secondary-fixed-variant": "#594400",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-fixed": "#130068",
                        "outline-variant": "#46464d",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "surface-dim": "#0e141a",
                        "on-background": "#dde3eb",
                        "surface-variant": "#2f353c",
                        "surface-container": "#1a2026",
                        "surface": "#0e141a",
                        "surface-container-lowest": "#080f14",
                        "secondary-container": "#ba9000",
                        "background": "#0e141a",
                        "primary-fixed": "#dfe0ff",
                        "surface-bright": "#333a40",
                        "on-surface-variant": "#c7c5ce",
                        "primary": "#c1c4e8",
                        "inverse-surface": "#dde3eb",
                        "primary-fixed-dim": "#c1c4e8",
                        "inverse-on-surface": "#2b3137",
                        "on-secondary-fixed": "#251a00",
                        "on-error": "#690005",
                        "surface-container-high": "#242b31",
                        "on-primary-fixed": "#151935",
                        "error": "#ffb4ab",
                        "on-secondary": "#3e2e00",
                        "tertiary": "#c4c0ff",
                        "secondary-fixed": "#ffdf95",
                        "on-error-container": "#ffdad6",
                        "surface-container-low": "#161c22",
                        "surface-container-highest": "#2f353c",
                        "surface-tint": "#c1c4e8",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-container": "#3c2c00",
                        "tertiary-container": "#0a0049",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "on-tertiary": "#2300a3",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed-variant": "#414562",
                        "on-surface": "#dde3eb",
                        "secondary-fixed-dim": "#f0c03e"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-[#a3debe]/50`, `border-b`, `border-error/30`, `border-outline`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-secondary/50`, `border-t`, `border-y`, `border-y-2`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-[#a3debe]/20`, `bg-background`, `bg-error/10`, `bg-radial-theatrical`, `bg-secondary-container`, `bg-secondary/20`, `bg-surface-container`, `bg-surface-container-high/40`, `bg-surface-container-high/60`, `bg-surface-container-high/80`, `bg-surface-container-highest`, `bg-surface-dim/80`, `bg-surface-dim/90`, `bg-surface-variant`, `text-[#a3debe]`, `text-[10px]`, `text-[40px]`, `text-[48px]`, `text-body-lg`, `text-center`, `text-display-lg-mobile`, `text-error`, `text-headline-md`, `text-label-caps`, `text-on-secondary-fixed`, `text-on-surface`, `text-on-surface-variant`, `text-on-surface-variant/70`, `text-secondary`, `text-white`, `text-xs`
- **Shadows:** `shadow-[0_-10px_40px_rgba(0,0,0,0.8)]`, `shadow-[0_0_15px_rgba(240,192,62,0.3)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`
- **Typography:** `font-body-lg`, `font-body-md`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`, `font-mono`
- **Animations & Transitions:** `duration-150`, `duration-200`, `duration-300`, `duration-500`, `transition`, `transition-all`, `transition-colors`

---

## Screen: candidate_tablet_waiting_room

### 1. Custom Styles (<style> block)
```css
body {
            background-color: #0e141a;
            background-image: radial-gradient(circle at center, rgba(10,0,73,0.8) 0%, rgba(14,20,26,1) 70%);
            overflow: hidden;
        }

        .light-beams {
            background: conic-gradient(from 0deg at 50% 50%, rgba(240,192,62,0) 0%, rgba(240,192,62,0.15) 15%, rgba(240,192,62,0) 30%, rgba(240,192,62,0) 50%, rgba(240,192,62,0.15) 65%, rgba(240,192,62,0) 80%);
            animation: spin 30s linear infinite;
        }

        .sparkle-layer {
            background-image: radial-gradient(rgba(240,192,62,0.4) 1px, transparent 1px);
            background-size: 50px 50px;
            opacity: 0.3;
            animation: drift 20s linear infinite;
        }

        @keyframes spin {
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes drift {
            0% { background-position: 0 0; }
            100% { background-position: 100px 100px; }
        }

        .glow-ring {
            box-shadow: 0 0 40px rgba(240,192,62,0.4), inset 0 0 20px rgba(240,192,62,0.5);
        }

body {
      min-height: max(884px, 100dvh);
    }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "tertiary-fixed-dim": "#c4c0ff",
                        "tertiary": "#c4c0ff",
                        "on-tertiary": "#2300a3",
                        "secondary": "#f0c03e",
                        "on-primary-container": "#777a9b",
                        "tertiary-fixed": "#e3dfff",
                        "outline": "#919098",
                        "on-surface": "#dde3eb",
                        "on-primary-fixed": "#151935",
                        "error-container": "#93000a",
                        "secondary-container": "#ba9000",
                        "on-background": "#dde3eb",
                        "secondary-fixed": "#ffdf95",
                        "on-primary": "#2b2e4b",
                        "on-error-container": "#ffdad6",
                        "surface": "#0e141a",
                        "inverse-primary": "#595c7b",
                        "primary-container": "#0a0e29",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-error": "#690005",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-container": "#3c2c00",
                        "surface-bright": "#333a40",
                        "surface-variant": "#2f353c",
                        "surface-container-highest": "#2f353c",
                        "on-secondary-fixed": "#251a00",
                        "surface-container": "#1a2026",
                        "tertiary-container": "#0a0049",
                        "background": "#0e141a",
                        "primary": "#c1c4e8",
                        "primary-fixed": "#dfe0ff",
                        "on-tertiary-fixed": "#130068",
                        "surface-container-low": "#161c22",
                        "outline-variant": "#46464d",
                        "surface-dim": "#0e141a",
                        "secondary-fixed-dim": "#f0c03e",
                        "surface-container-high": "#242b31",
                        "on-surface-variant": "#c7c5ce",
                        "inverse-on-surface": "#2b3137",
                        "surface-container-lowest": "#080f14",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "on-primary-fixed-variant": "#414562",
                        "on-secondary": "#3e2e00",
                        "error": "#ffb4ab",
                        "surface-tint": "#c1c4e8",
                        "on-secondary-fixed-variant": "#594400",
                        "inverse-surface": "#dde3eb"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `transform: translate(-50%, -50%); mask-image: radial-gradient(circle at center, black 20%, transparent 60%); -webkit-mask-image: radial-gradient(circle at center, black 20%, transparent 60%);`
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-[6px]`, `border-secondary`, `rounded-full`
- **Colors & Gradients:** `bg-secondary`, `bg-surface-container-highest`, `text-[20px]`, `text-body-lg`, `text-center`, `text-display-lg-mobile`, `text-on-surface`, `text-on-surface-variant`, `text-secondary`
- **Shadows:** *None*
- **Typography:** `font-body-lg`, `font-display-lg-mobile`
- **Animations & Transitions:** `animate-pulse`

---

## Screen: candidate_tablet_waiting_room_desktop

### 1. Custom Styles (<style> block)
```css
.radial-bg {
            background: radial-gradient(circle at center, rgba(35, 0, 163, 0.4) 0%, rgba(10, 14, 41, 0.9) 60%, #0e141a 100%);
        }
        .light-beams {
            background: conic-gradient(from 0deg at 50% 50%, 
                transparent 0deg, 
                rgba(240, 192, 62, 0.05) 45deg, 
                transparent 90deg, 
                rgba(240, 192, 62, 0.05) 135deg, 
                transparent 180deg, 
                rgba(240, 192, 62, 0.05) 225deg, 
                transparent 270deg, 
                rgba(240, 192, 62, 0.05) 315deg, 
                transparent 360deg);
            animation: rotate-beams 60s linear infinite;
        }
        @keyframes rotate-beams {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .gold-glow {
            box-shadow: 0 0 30px rgba(240, 192, 62, 0.5), inset 0 0 15px rgba(240, 192, 62, 0.3);
        }
        .pulse-text {
            animation: pulse-opacity 2s ease-in-out infinite;
        }
        @keyframes pulse-opacity {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; text-shadow: 0 0 10px rgba(240, 192, 62, 0.4); }
        }
        
        .sparkle {
            position: absolute;
            background: white;
            border-radius: 50%;
            animation: sparkle-anim 3s ease-in-out infinite;
        }
        @keyframes sparkle-anim {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 0.8; transform: scale(1); box-shadow: 0 0 8px rgba(240, 192, 62, 0.8); }
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "secondary-fixed-dim": "#f0c03e",
                        "on-primary-container": "#777a9b",
                        "tertiary": "#c4c0ff",
                        "surface-container-highest": "#2f353c",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-error-container": "#ffdad6",
                        "on-secondary-container": "#3c2c00",
                        "on-surface": "#dde3eb",
                        "on-secondary": "#3e2e00",
                        "primary": "#c1c4e8",
                        "on-secondary-fixed-variant": "#594400",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "secondary": "#f0c03e",
                        "on-background": "#dde3eb",
                        "surface-container-high": "#242b31",
                        "outline-variant": "#46464d",
                        "surface-bright": "#333a40",
                        "primary-container": "#0a0e29",
                        "on-tertiary-fixed": "#130068",
                        "error-container": "#93000a",
                        "surface-container-low": "#161c22",
                        "on-tertiary": "#2300a3",
                        "secondary-fixed": "#ffdf95",
                        "on-error": "#690005",
                        "on-surface-variant": "#c7c5ce",
                        "primary-fixed": "#dfe0ff",
                        "surface": "#0e141a",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "on-primary-fixed-variant": "#414562",
                        "surface-container-lowest": "#080f14",
                        "background": "#0e141a",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed": "#151935",
                        "inverse-surface": "#dde3eb",
                        "surface-container": "#1a2026",
                        "error": "#ffb4ab",
                        "tertiary-container": "#0a0049",
                        "surface-dim": "#0e141a",
                        "inverse-primary": "#595c7b",
                        "surface-tint": "#c1c4e8",
                        "secondary-container": "#ba9000",
                        "inverse-on-surface": "#2b3137",
                        "surface-variant": "#2f353c",
                        "outline": "#919098",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-fixed": "#251a00"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-4`, `border-secondary`, `border-surface`, `rounded-full`
- **Colors & Gradients:** `bg-[#4ade80]`, `bg-background`, `bg-gradient-to-br`, `bg-secondary/10`, `bg-surface`, `text-body-md`, `text-center`, `text-display-lg`, `text-headline-md`, `text-label-caps`, `text-on-background`, `text-on-surface-variant`, `text-primary`, `text-secondary`
- **Shadows:** `shadow-[0_0_15px_rgba(240,192,62,0.3)]`, `shadow-[0_0_8px_#4ade80]`
- **Typography:** `font-black`, `font-body-md`, `font-display-lg`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `animate-pulse`

---

## Screen: grand_opening_idle_screen

### 1. Custom Styles (<style> block)
```css
/* Custom slower pulse for the cinematic feel */
        @keyframes slow-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        .animate-slow-pulse {
            animation: slow-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "secondary-fixed": "#ffdf95",
                        "secondary-container": "#ba9000",
                        "on-background": "#dde3eb",
                        "on-error-container": "#ffdad6",
                        "on-primary": "#2b2e4b",
                        "on-tertiary": "#2300a3",
                        "tertiary": "#c4c0ff",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "tertiary-fixed": "#e3dfff",
                        "outline": "#919098",
                        "on-surface": "#dde3eb",
                        "on-primary-fixed": "#151935",
                        "error-container": "#93000a",
                        "secondary": "#f0c03e",
                        "on-primary-container": "#777a9b",
                        "surface-bright": "#333a40",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-container": "#3c2c00",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-error": "#690005",
                        "surface-variant": "#2f353c",
                        "primary-container": "#0a0e29",
                        "inverse-primary": "#595c7b",
                        "surface": "#0e141a",
                        "primary-fixed": "#dfe0ff",
                        "primary": "#c1c4e8",
                        "surface-container": "#1a2026",
                        "surface-container-highest": "#2f353c",
                        "on-secondary-fixed": "#251a00",
                        "tertiary-container": "#0a0049",
                        "background": "#0e141a",
                        "on-secondary": "#3e2e00",
                        "error": "#ffb4ab",
                        "on-primary-fixed-variant": "#414562",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "inverse-surface": "#dde3eb",
                        "on-secondary-fixed-variant": "#594400",
                        "surface-tint": "#c1c4e8",
                        "surface-dim": "#0e141a",
                        "surface-container-low": "#161c22",
                        "outline-variant": "#46464d",
                        "on-tertiary-fixed": "#130068",
                        "surface-container-lowest": "#080f14",
                        "surface-container-high": "#242b31",
                        "on-surface-variant": "#c7c5ce",
                        "inverse-on-surface": "#2b3137",
                        "secondary-fixed-dim": "#f0c03e"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** *None*
- **Colors & Gradients:** `bg-background`, `bg-radial-gradient`, `text-center`, `text-display-lg`, `text-headline-md`, `text-on-background`, `text-on-surface-variant`, `text-secondary`
- **Shadows:** *None*
- **Typography:** `font-display-lg`, `font-headline-md`
- **Animations & Transitions:** `animate-slow-pulse`

---

## Screen: live_control_center_judging_phase

### 1. Custom Styles (<style> block)
```css
/* Theatrical Glows & Clip Paths */
        .glass-panel {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            background: rgba(22, 28, 34, 0.7); /* surface-container-low approx */
        }
        .hex-clip {
            clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%);
        }
        .diamond-clip {
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        .inner-glow-gold {
            box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.3); /* secondary */
        }
        .bloom-gold {
            box-shadow: 0 0 20px rgba(240, 192, 62, 0.25);
        }
        .correct-btn:hover {
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.4); /* Emerald-ish bloom */
            border-color: #10b981;
        }
        .incorrect-btn:hover {
            box-shadow: 0 0 25px rgba(225, 29, 72, 0.4); /* Ruby-ish bloom */
            border-color: #e11d48;
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "surface-container-low": "#161c22",
                      "on-tertiary": "#2300a3",
                      "on-primary-fixed": "#151935",
                      "inverse-surface": "#dde3eb",
                      "inverse-primary": "#595c7b",
                      "primary-fixed-dim": "#c1c4e8",
                      "on-secondary": "#3e2e00",
                      "on-primary-container": "#777a9b",
                      "surface-container-high": "#242b31",
                      "error-container": "#93000a",
                      "outline": "#919098",
                      "error": "#ffb4ab",
                      "on-tertiary-fixed-variant": "#3a28c0",
                      "surface": "#0e141a",
                      "primary-container": "#0a0e29",
                      "on-error-container": "#ffdad6",
                      "on-secondary-container": "#3c2c00",
                      "background": "#0e141a",
                      "surface-container-highest": "#2f353c",
                      "on-background": "#dde3eb",
                      "tertiary-fixed-dim": "#c4c0ff",
                      "on-tertiary-container": "#7268f9",
                      "secondary-fixed": "#ffdf95",
                      "secondary": "#f0c03e",
                      "on-tertiary-fixed": "#130068",
                      "on-secondary-fixed-variant": "#594400",
                      "on-primary": "#2b2e4b",
                      "on-surface": "#dde3eb",
                      "on-error": "#690005",
                      "primary-fixed": "#dfe0ff",
                      "tertiary": "#c4c0ff",
                      "surface-container-lowest": "#080f14",
                      "inverse-on-surface": "#2b3137",
                      "surface-dim": "#0e141a",
                      "primary": "#c1c4e8",
                      "on-primary-fixed-variant": "#414562",
                      "tertiary-container": "#0a0049",
                      "surface-variant": "#2f353c",
                      "secondary-container": "#ba9000",
                      "on-surface-variant": "#c7c5ce",
                      "on-secondary-fixed": "#251a00",
                      "outline-variant": "#46464d",
                      "tertiary-fixed": "#e3dfff",
                      "surface-tint": "#c1c4e8",
                      "surface-container": "#1a2026",
                      "surface-bright": "#333a40",
                      "secondary-fixed-dim": "#f0c03e"
              };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-b`, `border-b-2`, `border-error-container/30`, `border-l-4`, `border-none`, `border-outline-variant`, `border-outline-variant/10`, `border-outline-variant/30`, `border-outline/30`, `border-r`, `border-secondary`, `border-secondary/10`, `border-secondary/20`, `border-secondary/30`, `border-secondary/50`, `border-t`, `border-t-2`, `border-transparent`, `rounded-full`, `rounded-sm`
- **Colors & Gradients:** `bg-background`, `bg-gradient-to-r`, `bg-radial`, `bg-secondary`, `bg-secondary-container/20`, `bg-secondary/10`, `bg-secondary/20`, `bg-surface-container-high`, `bg-surface-container-highest`, `bg-surface-container-low/95`, `bg-surface-container-lowest`, `bg-surface/50`, `bg-surface/80`, `bg-transparent`, `text-[10px]`, `text-body-lg`, `text-body-md`, `text-center`, `text-error`, `text-headline-md`, `text-inverse-surface`, `text-label-caps`, `text-lg`, `text-on-background`, `text-on-secondary`, `text-on-surface`, `text-on-surface-variant`, `text-on-surface-variant/70`, `text-outline`, `text-outline-variant`, `text-secondary`, `text-sm`, `text-xs`
- **Shadows:** `shadow-[0_0_15px_rgba(240,192,62,0.2)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_20px_rgba(196,192,255,0.05)]`
- **Typography:** `font-black`, `font-body-md`, `font-bold`, `font-display-lg`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `animate-[pulse_3s_ease-in-out_infinite]`, `animate-ping`, `duration-1000`, `duration-200`, `duration-300`, `transition-all`, `transition-colors`, `transition-transform`

---

## Screen: live_control_center_question_live_phase

### 1. Custom Styles (<style> block)
```css
.glow-border {
            box-shadow: inset 0 0 15px rgba(240,192,62,0.2), 0 0 10px rgba(240,192,62,0.1);
        }
        .glow-border-active {
            box-shadow: inset 0 0 20px rgba(240,192,62,0.4), 0 0 20px rgba(240,192,62,0.25);
            border-color: #f0c03e;
        }
        .hex-clip {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .diamond-clip {
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        .timer-gradient {
            background: conic-gradient(from 0deg, #f0c03e 0%, #93000a 75%, transparent 75%);
        }
        .pulse-animation {
            animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 0 0 rgba(240, 192, 62, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(240, 192, 62, 0); }
            100% { box-shadow: 0 0 0 0 rgba(240, 192, 62, 0); }
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-container-low": "#161c22",
                        "on-tertiary": "#2300a3",
                        "on-primary-fixed": "#151935",
                        "inverse-surface": "#dde3eb",
                        "inverse-primary": "#595c7b",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-secondary": "#3e2e00",
                        "on-primary-container": "#777a9b",
                        "surface-container-high": "#242b31",
                        "error-container": "#93000a",
                        "outline": "#919098",
                        "error": "#ffb4ab",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "surface": "#0e141a",
                        "primary-container": "#0a0e29",
                        "on-error-container": "#ffdad6",
                        "on-secondary-container": "#3c2c00",
                        "background": "#0e141a",
                        "surface-container-highest": "#2f353c",
                        "on-background": "#dde3eb",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "on-tertiary-container": "#7268f9",
                        "secondary-fixed": "#ffdf95",
                        "secondary": "#f0c03e",
                        "on-tertiary-fixed": "#130068",
                        "on-secondary-fixed-variant": "#594400",
                        "on-primary": "#2b2e4b",
                        "on-surface": "#dde3eb",
                        "on-error": "#690005",
                        "primary-fixed": "#dfe0ff",
                        "tertiary": "#c4c0ff",
                        "surface-container-lowest": "#080f14",
                        "inverse-on-surface": "#2b3137",
                        "surface-dim": "#0e141a",
                        "primary": "#c1c4e8",
                        "on-primary-fixed-variant": "#414562",
                        "tertiary-container": "#0a0049",
                        "surface-variant": "#2f353c",
                        "secondary-container": "#ba9000",
                        "on-surface-variant": "#c7c5ce",
                        "on-secondary-fixed": "#251a00",
                        "outline-variant": "#46464d",
                        "tertiary-fixed": "#e3dfff",
                        "surface-tint": "#c1c4e8",
                        "surface-container": "#1a2026",
                        "surface-bright": "#333a40",
                        "secondary-fixed-dim": "#f0c03e"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 0;`
- `font-variation-settings: 'FILL' 1;`
- `mask-image: radial-gradient(transparent 65%, black 66%); -webkit-mask-image: radial-gradient(transparent 65%, black 66%);`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-4`, `border-b`, `border-l`, `border-l-4`, `border-on-tertiary-container`, `border-on-tertiary-container/30`, `border-outline-variant`, `border-outline/10`, `border-outline/20`, `border-outline/30`, `border-outline/50`, `border-r`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-secondary/50`, `border-surface-container-highest`, `border-t`, `border-y-[3px]`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]`, `bg-background`, `bg-background/60`, `bg-error`, `bg-gradient-to-b`, `bg-secondary`, `bg-secondary/10`, `bg-secondary/20`, `bg-surface-container-highest`, `bg-surface-container-highest/80`, `bg-surface-container-low/50`, `bg-surface-container-low/90`, `bg-surface-container-low/95`, `bg-surface-variant`, `bg-surface-variant/30`, `bg-surface-variant/40`, `bg-surface/50`, `bg-surface/80`, `bg-tertiary-container`, `text-[11px]`, `text-[12px]`, `text-[14px]`, `text-[16px]`, `text-[18px]`, `text-[32px]`, `text-[64px]`, `text-body-lg`, `text-center`, `text-headline-md`, `text-label-caps`, `text-on-error`, `text-on-secondary`, `text-on-surface`, `text-on-surface-variant`, `text-outline`, `text-secondary`, `text-tertiary`
- **Shadows:** `shadow-[0_-10px_30px_rgba(0,0,0,0.5)]`, `shadow-[0_0_10px_rgba(240,192,62,0.5)]`, `shadow-[0_0_15px_rgba(147,0,10,0.5)]`, `shadow-[0_0_15px_rgba(240,192,62,0.2)]`, `shadow-[0_0_20px_#f0c03e]`, `shadow-[0_0_50px_rgba(240,192,62,0.15)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_15px_rgba(114,104,249,0.2)]`, `shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_20px_rgba(114,104,249,0.4),0_0_15px_rgba(114,104,249,0.3)]`, `shadow-[inset_0_0_20px_rgba(196,192,255,0.05)]`, `shadow-[inset_0_0_20px_rgba(240,192,62,0.1)]`, `shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]`
- **Typography:** `font-black`, `font-body-lg`, `font-body-md`, `font-bold`, `font-display-lg`, `font-headline-md`, `font-label-caps`, `font-semibold`
- **Animations & Transitions:** `duration-200`, `duration-300`, `transition-all`, `transition-colors`, `transition-transform`

---

## Screen: live_control_center_results_phase

### 1. Custom Styles (<style> block)
```css
.hex-clip { clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%); }
        .inner-glow-gold { box-shadow: inset 0 0 20px rgba(240,192,62,0.3); }
        .inner-glow-purple { box-shadow: inset 0 0 15px rgba(196,192,255,0.1); }
        .bloom-gold { box-shadow: 0 0 30px rgba(240,192,62,0.4); }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(240,192,62,0.5), inset 0 0 15px rgba(240,192,62,0.3); }
            50% { box-shadow: 0 0 40px rgba(240,192,62,0.8), inset 0 0 25px rgba(240,192,62,0.5); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }

@keyframes shimmer {
            100% { transform: translateX(100%); }
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-container-low": "#161c22",
                        "on-tertiary": "#2300a3",
                        "on-primary-fixed": "#151935",
                        "inverse-surface": "#dde3eb",
                        "inverse-primary": "#595c7b",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-secondary": "#3e2e00",
                        "on-primary-container": "#777a9b",
                        "surface-container-high": "#242b31",
                        "error-container": "#93000a",
                        "outline": "#919098",
                        "error": "#ffb4ab",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "surface": "#0e141a",
                        "primary-container": "#0a0e29",
                        "on-error-container": "#ffdad6",
                        "on-secondary-container": "#3c2c00",
                        "background": "#0e141a",
                        "surface-container-highest": "#2f353c",
                        "on-background": "#dde3eb",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "on-tertiary-container": "#7268f9",
                        "secondary-fixed": "#ffdf95",
                        "secondary": "#f0c03e",
                        "on-tertiary-fixed": "#130068",
                        "on-secondary-fixed-variant": "#594400",
                        "on-primary": "#2b2e4b",
                        "on-surface": "#dde3eb",
                        "on-error": "#690005",
                        "primary-fixed": "#dfe0ff",
                        "tertiary": "#c4c0ff",
                        "surface-container-lowest": "#080f14",
                        "inverse-on-surface": "#2b3137",
                        "surface-dim": "#0e141a",
                        "primary": "#c1c4e8",
                        "on-primary-fixed-variant": "#414562",
                        "tertiary-container": "#0a0049",
                        "surface-variant": "#2f353c",
                        "secondary-container": "#ba9000",
                        "on-surface-variant": "#c7c5ce",
                        "on-secondary-fixed": "#251a00",
                        "outline-variant": "#46464d",
                        "tertiary-fixed": "#e3dfff",
                        "surface-tint": "#c1c4e8",
                        "surface-container": "#1a2026",
                        "surface-bright": "#333a40",
                        "secondary-fixed-dim": "#f0c03e"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-b`, `border-l-4`, `border-outline-variant`, `border-outline-variant/10`, `border-outline-variant/20`, `border-outline-variant/30`, `border-outline-variant/50`, `border-r`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-t`, `rounded-full`, `rounded-sm`
- **Colors & Gradients:** `bg-background`, `bg-gradient-to-b`, `bg-gradient-to-r`, `bg-secondary`, `bg-secondary/10`, `bg-secondary/20`, `bg-secondary/90`, `bg-surface-container-high`, `bg-surface-container-high/90`, `bg-surface-container-highest/80`, `bg-surface-container-low/60`, `bg-surface-container-low/80`, `bg-surface-container-low/95`, `bg-surface-container-lowest`, `bg-surface/80`, `text-[#4ade80]`, `text-[16px]`, `text-[18px]`, `text-body-lg`, `text-body-md`, `text-center`, `text-display-lg`, `text-display-lg-mobile`, `text-error`, `text-headline-md`, `text-label-caps`, `text-lg`, `text-on-background`, `text-on-secondary`, `text-on-surface`, `text-on-surface-variant`, `text-outline`, `text-outline-variant`, `text-right`, `text-secondary`, `text-sm`
- **Shadows:** `shadow-[0_0_15px_rgba(240,192,62,0.2)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_20px_rgba(196,192,255,0.05)]`
- **Typography:** `font-black`, `font-body-lg`, `font-body-md`, `font-bold`, `font-display-lg`, `font-headline-md`, `font-label-caps`, `font-medium`
- **Animations & Transitions:** `animate-pulse`, `animate-pulse-glow`, `duration-200`, `duration-300`, `group-hover:animate-[shimmer_1.5s_infinite]`, `transition-all`, `transition-colors`, `transition-transform`

---

## Screen: projector_view_final_leaderboard_champion_reveal

### 1. Custom Styles (<style> block)
```css
.clip-diamond {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .text-glow-gold {
            text-shadow: 0 0 10px rgba(240,192,62,0.5), 0 0 20px rgba(240,192,62,0.3);
        }
        .bg-glow-gold {
            box-shadow: inset 0 0 15px rgba(240,192,62,0.6), 0 0 30px rgba(240,192,62,0.2);
        }
        .bg-glow-purple {
            box-shadow: inset 0 0 15px rgba(196,192,255,0.4);
        }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: inset 0 0 15px rgba(240,192,62,0.6), 0 0 30px rgba(240,192,62,0.2); }
            50% { box-shadow: inset 0 0 25px rgba(240,192,62,0.8), 0 0 50px rgba(240,192,62,0.4); }
        }
        .animate-pulse-glow {
            animation: pulse-glow 2s infinite;
        }
        @keyframes row-flash {
            0% { background-color: rgba(47,53,60, 0.4); border-color: rgba(240,192,62,0); }
            10% { background-color: rgba(240,192,62, 0.3); border-color: rgba(240,192,62,1); }
            100% { background-color: rgba(47,53,60, 0.4); border-color: rgba(240,192,62,0); }
        }
        .animate-row-flash {
            animation: row-flash 3s ease-out;
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-container-lowest": "#080f14",
                        "primary-fixed": "#dfe0ff",
                        "secondary-container": "#ba9000",
                        "background": "#0e141a",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "surface-dim": "#0e141a",
                        "on-background": "#dde3eb",
                        "surface-variant": "#2f353c",
                        "surface": "#0e141a",
                        "surface-container": "#1a2026",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-fixed": "#130068",
                        "outline-variant": "#46464d",
                        "on-primary-container": "#777a9b",
                        "outline": "#919098",
                        "inverse-primary": "#595c7b",
                        "secondary": "#f0c03e",
                        "primary-container": "#0a0e29",
                        "on-secondary-fixed-variant": "#594400",
                        "error-container": "#93000a",
                        "tertiary-container": "#0a0049",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "surface-tint": "#c1c4e8",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-container": "#3c2c00",
                        "on-surface": "#dde3eb",
                        "secondary-fixed-dim": "#f0c03e",
                        "on-tertiary": "#2300a3",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed-variant": "#414562",
                        "tertiary": "#c4c0ff",
                        "secondary-fixed": "#ffdf95",
                        "on-error-container": "#ffdad6",
                        "on-secondary": "#3e2e00",
                        "surface-container-highest": "#2f353c",
                        "surface-container-low": "#161c22",
                        "surface-container-high": "#242b31",
                        "on-primary-fixed": "#151935",
                        "error": "#ffb4ab",
                        "on-error": "#690005",
                        "surface-bright": "#333a40",
                        "on-surface-variant": "#c7c5ce",
                        "on-secondary-fixed": "#251a00",
                        "primary": "#c1c4e8",
                        "inverse-surface": "#dde3eb",
                        "primary-fixed-dim": "#c1c4e8",
                        "inverse-on-surface": "#2b3137"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-[#ffdab9]`, `border-[#fff8dc]`, `border-outline`, `border-outline-variant/20`, `border-outline-variant/30`, `border-outline-variant/50`, `border-secondary`, `border-t`, `border-transparent`, `border-white`, `border-white/20`, `rounded-full`
- **Colors & Gradients:** `bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]`, `bg-gradient-to-b`, `bg-gradient-to-br`, `bg-gradient-to-r`, `bg-secondary`, `bg-surface`, `bg-surface-container-lowest`, `bg-surface-container/60`, `bg-surface-container/80`, `bg-surface-variant`, `bg-surface-variant/30`, `bg-surface-variant/40`, `text-[16px]`, `text-[20px]`, `text-[24px]`, `text-[28px]`, `text-[32px]`, `text-[40px]`, `text-[56px]`, `text-body-lg`, `text-center`, `text-display-lg`, `text-error`, `text-glow-gold`, `text-headline-md`, `text-label-caps`, `text-on-secondary`, `text-on-surface`, `text-on-surface-variant`, `text-right`, `text-secondary`, `text-secondary/80`, `text-surface-container-lowest`, `text-tertiary-fixed-dim`
- **Shadows:** `shadow-[0_0_10px_rgba(205,127,50,0.3)]`, `shadow-[0_0_10px_rgba(224,224,224,0.3)]`, `shadow-[0_0_10px_rgba(240,192,62,0.3)]`, `shadow-[0_0_15px_rgba(240,192,62,0.6)]`, `shadow-[0_0_20px_rgba(255,215,0,0.5)]`
- **Typography:** `font-black`, `font-body-lg`, `font-body-md`, `font-bold`, `font-display-lg`, `font-headline-md`, `font-label-caps`, `font-semibold`
- **Animations & Transitions:** `animate-pulse`, `animate-pulse-glow`, `animate-row-flash`, `duration-500`, `transition-colors`, `transition-opacity`

---

## Screen: projector_view_live_question_pre_reveal

### 1. Custom Styles (<style> block)
```css
.clip-diamond {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .glow-gold {
            box-shadow: inset 0 0 15px rgba(240,192,62,0.8), 0 0 20px rgba(240,192,62,0.3);
        }
        .glow-purple {
            box-shadow: inset 0 0 15px rgba(163,222,254,0.3); /* Adjusting to fit the hybrid vibe */
        }
        .option-bg {
            background: linear-gradient(135deg, rgba(10,0,73,0.9) 0%, rgba(21,25,53,0.9) 100%);
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "secondary-container": "#ba9000",
                        "background": "#0e141a",
                        "primary-fixed": "#dfe0ff",
                        "surface-container-lowest": "#080f14",
                        "surface-container": "#1a2026",
                        "surface": "#0e141a",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "surface-dim": "#0e141a",
                        "on-background": "#dde3eb",
                        "surface-variant": "#2f353c",
                        "outline-variant": "#46464d",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-fixed": "#130068",
                        "error-container": "#93000a",
                        "on-secondary-fixed-variant": "#594400",
                        "inverse-primary": "#595c7b",
                        "secondary": "#f0c03e",
                        "primary-container": "#0a0e29",
                        "on-primary-container": "#777a9b",
                        "outline": "#919098",
                        "on-tertiary": "#2300a3",
                        "on-primary": "#2b2e4b",
                        "on-primary-fixed-variant": "#414562",
                        "on-surface": "#dde3eb",
                        "secondary-fixed-dim": "#f0c03e",
                        "surface-tint": "#c1c4e8",
                        "on-tertiary-container": "#7268f9",
                        "on-secondary-container": "#3c2c00",
                        "tertiary-container": "#0a0049",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "surface-container-low": "#161c22",
                        "surface-container-highest": "#2f353c",
                        "on-secondary": "#3e2e00",
                        "tertiary": "#c4c0ff",
                        "secondary-fixed": "#ffdf95",
                        "on-error-container": "#ffdad6",
                        "on-error": "#690005",
                        "surface-container-high": "#242b31",
                        "on-primary-fixed": "#151935",
                        "error": "#ffb4ab",
                        "primary": "#c1c4e8",
                        "inverse-surface": "#dde3eb",
                        "primary-fixed-dim": "#c1c4e8",
                        "inverse-on-surface": "#2b3137",
                        "on-secondary-fixed": "#251a00",
                        "surface-bright": "#333a40",
                        "on-surface-variant": "#c7c5ce"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`
- `font-variation-settings: 'FILL' 0;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-outline-variant`, `border-outline-variant/30`, `border-secondary`, `border-secondary/30`, `border-secondary/50`, `border-t`, `border-y-4`, `rounded-full`, `rounded-lg`, `rounded-t-xl`, `rounded-xl`
- **Colors & Gradients:** `bg-[radial-gradient(circle_at_bottom,_rgba(240,192,62,0.1),_transparent_60%)]`, `bg-[radial-gradient(circle_at_top,_rgba(240,192,62,0.15),_transparent_60%)]`, `bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]`, `bg-background`, `bg-primary-container/90`, `bg-secondary/0`, `bg-surface-container`, `bg-surface-container-lowest/50`, `bg-surface-container-lowest/80`, `bg-surface-variant`, `bg-surface/80`, `text-2xl`, `text-center`, `text-display-lg`, `text-headline-md`, `text-label-caps`, `text-on-background`, `text-on-surface`, `text-outline-variant`, `text-secondary`
- **Shadows:** `shadow-[0_0_20px_rgba(240,192,62,0.4)]`, `shadow-[0_0_40px_rgba(10,0,73,0.8)]`
- **Typography:** `font-body-lg`, `font-display-lg`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `duration-1000`, `duration-300`, `transition-all`, `transition-colors`

---

## Screen: projector_view_rapid_fire_round

### 1. Custom Styles (<style> block)
```css
.bloom-shadow {
            box-shadow: 0 0 30px rgba(240, 192, 62, 0.4), inset 0 0 15px rgba(240, 192, 62, 0.3);
        }
        .bloom-shadow-purple {
            box-shadow: 0 0 40px rgba(114, 104, 249, 0.5), inset 0 0 20px rgba(114, 104, 249, 0.4);
        }
        .clip-diamond {
            clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .clip-hex {
            clip-path: polygon(5% 0, 95% 0, 100% 50%, 95% 100%, 5% 100%, 0 50%);
        }
        
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 30px rgba(240, 192, 62, 0.4), inset 0 0 15px rgba(240, 192, 62, 0.3); }
            50% { box-shadow: 0 0 50px rgba(240, 192, 62, 0.7), inset 0 0 25px rgba(240, 192, 62, 0.5); }
        }
        .animate-pulse-glow {
            animation: pulse-glow 2s infinite;
        }

        @keyframes lightning {
            0% { text-shadow: 0 0 10px #7268f9; }
            10% { text-shadow: 0 0 20px #7268f9, 0 0 40px #fff; }
            20% { text-shadow: 0 0 10px #7268f9; }
            30% { text-shadow: 0 0 30px #7268f9, 0 0 50px #fff; }
            40% { text-shadow: 0 0 10px #7268f9; }
            100% { text-shadow: 0 0 10px #7268f9; }
        }
        .animate-lightning {
            animation: lightning 3s infinite;
        }

        @keyframes spark {
            0% { opacity: 0; transform: translateY(0) scale(0); }
            50% { opacity: 1; transform: translateY(-20px) scale(1); }
            100% { opacity: 0; transform: translateY(-40px) scale(0); }
        }
        .spark {
            position: absolute;
            background: white;
            border-radius: 50%;
            box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.8);
            animation: spark 1s linear infinite;
        }

        .timer-ring {
            stroke-dasharray: 283;
            stroke-dashoffset: 0;
            animation: timer-drain 10s linear forwards;
        }
        @keyframes timer-drain {
            0% { stroke-dashoffset: 0; stroke: #f0c03e; }
            80% { stroke: #f0c03e; }
            100% { stroke-dashoffset: 283; stroke: #ffb4ab; }
        }
        @keyframes pulse-timer {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .animate-timer {
            animation: pulse-timer 1s infinite;
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-tertiary-container": "#7268f9",
                        "on-error": "#690005",
                        "surface-tint": "#c1c4e8",
                        "on-background": "#dde3eb",
                        "error-container": "#93000a",
                        "primary": "#c1c4e8",
                        "surface": "#0e141a",
                        "on-primary-fixed": "#151935",
                        "error": "#ffb4ab",
                        "on-error-container": "#ffdad6",
                        "surface-dim": "#0e141a",
                        "on-primary-fixed-variant": "#414562",
                        "primary-fixed-dim": "#c1c4e8",
                        "inverse-on-surface": "#2b3137",
                        "tertiary-fixed": "#e3dfff",
                        "primary-fixed": "#dfe0ff",
                        "surface-container": "#1a2026",
                        "on-tertiary": "#2300a3",
                        "tertiary-container": "#0a0049",
                        "secondary-fixed-dim": "#f0c03e",
                        "secondary": "#f0c03e",
                        "primary-container": "#0a0e29",
                        "surface-container-highest": "#2f353c",
                        "on-primary-container": "#777a9b",
                        "background": "#0e141a",
                        "on-tertiary-fixed": "#130068",
                        "surface-container-lowest": "#080f14",
                        "surface-container-low": "#161c22",
                        "on-secondary-container": "#3c2c00",
                        "outline": "#919098",
                        "surface-container-high": "#242b31",
                        "on-secondary-fixed-variant": "#594400",
                        "inverse-surface": "#dde3eb",
                        "secondary-container": "#ba9000",
                        "on-primary": "#2b2e4b",
                        "surface-variant": "#2f353c",
                        "surface-bright": "#333a40",
                        "on-secondary-fixed": "#251a00",
                        "inverse-primary": "#595c7b",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "tertiary": "#c4c0ff",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "secondary-fixed": "#ffdf95",
                        "on-surface": "#dde3eb",
                        "on-surface-variant": "#c7c5ce",
                        "on-secondary": "#3e2e00",
                        "outline-variant": "#46464d"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-b-4`, `border-outline-variant`, `border-secondary`, `border-secondary/30`, `border-t-4`, `border-white/50`, `rounded-full`, `rounded-lg`
- **Colors & Gradients:** `bg-background`, `bg-gradient-to-b`, `bg-gradient-to-r`, `bg-outline-variant`, `bg-secondary`, `bg-surface-container-high/90`, `bg-surface-container-highest`, `bg-surface-container-highest/80`, `bg-surface-container-low/80`, `bg-surface-container/50`, `text-[36px]`, `text-[40px]`, `text-center`, `text-display-lg`, `text-label-caps`, `text-on-background`, `text-on-surface-variant`, `text-outline`, `text-secondary`, `text-surface`, `text-white`
- **Shadows:** `shadow-[0_0_15px_rgba(240,192,62,0.6)]`, `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_20px_rgba(240,192,62,0.2)]`
- **Typography:** `font-black`, `font-body-md`, `font-bold`, `font-display-lg`, `font-label-caps`
- **Animations & Transitions:** `animate-lightning`, `animate-pulse-glow`, `animate-timer`

---

## Screen: projector_view_results_winner_reveal

### 1. Custom Styles (<style> block)
```css
.diamond-clip {
            clip-path: polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
        }
        .diamond-inner {
            clip-path: polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
        }
        
        .pulse-glow {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.8), 0 0 20px rgba(240, 192, 62, 0.4);
            }
            50% {
                box-shadow: inset 0 0 25px rgba(240, 192, 62, 1), 0 0 40px rgba(240, 192, 62, 0.7);
            }
        }
        
        .winner-bg {
            background: radial-gradient(circle at center, rgba(240, 192, 62, 0.15) 0%, transparent 70%);
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "on-primary-fixed-variant": "#414562",
                      "secondary": "#f0c03e",
                      "error": "#ffb4ab",
                      "surface-variant": "#2f353c",
                      "surface-dim": "#0e141a",
                      "tertiary": "#c4c0ff",
                      "tertiary-container": "#0a0049",
                      "primary-fixed-dim": "#c1c4e8",
                      "on-secondary-fixed-variant": "#594400",
                      "on-tertiary": "#2300a3",
                      "surface-container-lowest": "#080f14",
                      "surface-container-high": "#242b31",
                      "secondary-container": "#ba9000",
                      "on-secondary": "#3e2e00",
                      "on-error-container": "#ffdad6",
                      "surface-container-highest": "#2f353c",
                      "on-primary-fixed": "#151935",
                      "surface-bright": "#333a40",
                      "secondary-fixed-dim": "#f0c03e",
                      "error-container": "#93000a",
                      "inverse-on-surface": "#2b3137",
                      "inverse-primary": "#595c7b",
                      "on-primary": "#2b2e4b",
                      "inverse-surface": "#dde3eb",
                      "outline-variant": "#46464d",
                      "tertiary-fixed-dim": "#c4c0ff",
                      "primary-fixed": "#dfe0ff",
                      "secondary-fixed": "#ffdf95",
                      "on-tertiary-container": "#7268f9",
                      "on-surface": "#dde3eb",
                      "on-tertiary-fixed-variant": "#3a28c0",
                      "surface": "#0e141a",
                      "on-surface-variant": "#c7c5ce",
                      "surface-tint": "#c1c4e8",
                      "on-error": "#690005",
                      "outline": "#919098",
                      "on-secondary-fixed": "#251a00",
                      "surface-container-low": "#161c22",
                      "primary": "#c1c4e8",
                      "on-primary-container": "#777a9b",
                      "background": "#0e141a",
                      "surface-container": "#1a2026",
                      "on-secondary-container": "#3c2c00",
                      "on-background": "#dde3eb",
                      "primary-container": "#0a0e29",
                      "on-tertiary-fixed": "#130068",
                      "tertiary-fixed": "#e3dfff"
              };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-outline-variant/10`, `border-outline-variant/30`, `border-outline-variant/50`, `border-outline/50`, `border-secondary`, `border-secondary/30`, `border-secondary/50`, `rounded-full`, `rounded-lg`, `rounded-xl`
- **Colors & Gradients:** `bg-background`, `bg-gradient-to-r`, `bg-secondary`, `bg-secondary/20`, `bg-surface-container-low/95`, `bg-surface-container-lowest/50`, `bg-surface-container-lowest/80`, `bg-surface-container-lowest/90`, `bg-surface-container/80`, `bg-surface-variant`, `text-[#4ade80]`, `text-[20px]`, `text-[32px]`, `text-[40px]`, `text-[48px]`, `text-body-lg`, `text-body-md`, `text-center`, `text-display-lg-mobile`, `text-error/80`, `text-headline-md`, `text-label-caps`, `text-on-background`, `text-on-surface`, `text-on-surface-variant`, `text-outline`, `text-outline-variant`, `text-right`, `text-secondary`
- **Shadows:** `shadow-[0_0_15px_rgba(240,192,62,0.3)]`, `shadow-[0_0_20px_rgba(240,192,62,0.4)]`, `shadow-[0_0_40px_rgba(240,192,62,0.4)]`, `shadow-[inset_0_0_15px_rgba(240,192,62,0.05)]`, `shadow-[inset_0_0_30px_rgba(240,192,62,0.2)]`
- **Typography:** `font-black`, `font-body-lg`, `font-body-md`, `font-bold`, `font-display-lg`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `duration-1000`, `transition-opacity`

---

## Screen: projector_view_suspense_interlude

### 1. Custom Styles (<style> block)
```css
@keyframes pulse-glow {
            0%, 100% {
                text-shadow: 0 0 20px rgba(240, 192, 62, 0.5), 0 0 40px rgba(240, 192, 62, 0.3);
                filter: drop-shadow(0 0 15px rgba(240, 192, 62, 0.6));
                transform: scale(1);
            }
            50% {
                text-shadow: 0 0 40px rgba(240, 192, 62, 0.9), 0 0 80px rgba(240, 192, 62, 0.7);
                filter: drop-shadow(0 0 30px rgba(240, 192, 62, 0.9));
                transform: scale(1.05);
            }
        }

        .animate-suspense-pulse {
            animation: pulse-glow 2s infinite ease-in-out;
        }
        
        .luminous-text {
            background: linear-gradient(to bottom, #ffdf95, #f0c03e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "primary-container": "#0a0e29",
                    "inverse-primary": "#595c7b",
                    "outline": "#919098",
                    "on-secondary-fixed": "#251a00",
                    "background": "#0e141a",
                    "tertiary-fixed": "#e3dfff",
                    "surface-container-lowest": "#080f14",
                    "surface-variant": "#2f353c",
                    "inverse-surface": "#dde3eb",
                    "on-primary-container": "#777a9b",
                    "on-error-container": "#ffdad6",
                    "on-primary": "#2b2e4b",
                    "inverse-on-surface": "#2b3137",
                    "error-container": "#93000a",
                    "on-surface-variant": "#c7c5ce",
                    "surface-tint": "#c1c4e8",
                    "outline-variant": "#46464d",
                    "error": "#ffb4ab",
                    "on-tertiary-fixed": "#130068",
                    "surface-container-highest": "#2f353c",
                    "secondary-fixed-dim": "#f0c03e",
                    "secondary-fixed": "#ffdf95",
                    "secondary-container": "#ba9000",
                    "surface-container": "#1a2026",
                    "secondary": "#f0c03e",
                    "primary-fixed": "#dfe0ff",
                    "on-error": "#690005",
                    "tertiary-fixed-dim": "#c4c0ff",
                    "surface-container-high": "#242b31",
                    "on-secondary-fixed-variant": "#594400",
                    "on-secondary-container": "#3c2c00",
                    "on-primary-fixed": "#151935",
                    "on-surface": "#dde3eb",
                    "surface-dim": "#0e141a",
                    "primary": "#c1c4e8",
                    "on-tertiary-fixed-variant": "#3a28c0",
                    "surface-container-low": "#161c22",
                    "surface": "#0e141a",
                    "primary-fixed-dim": "#c1c4e8",
                    "on-background": "#dde3eb",
                    "on-secondary": "#3e2e00",
                    "surface-bright": "#333a40",
                    "tertiary-container": "#0a0049",
                    "on-tertiary": "#2300a3",
                    "on-primary-fixed-variant": "#414562",
                    "tertiary": "#c4c0ff",
                    "on-tertiary-container": "#7268f9"
            };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `background: radial-gradient(circle at center, transparent 0%, rgba(14, 20, 26, 0.8) 70%, #0e141a 100%);`
- `font-variation-settings: 'FILL' 1, 'wght' 200;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** *None*
- **Colors & Gradients:** `bg-background`, `bg-radial-gradient`, `text-[120px]`, `text-[150px]`, `text-center`, `text-display-lg`, `text-on-background`, `text-secondary`
- **Shadows:** *None*
- **Typography:** `font-body-md`, `font-display-lg`
- **Animations & Transitions:** `animate-suspense-pulse`

---

## Screen: quiz_master_control_login

### 1. Custom Styles (<style> block)
```css
.hex-clip {
            clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
        }
        
        .glow-border {
            box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.5);
            border: 1px solid rgba(240, 192, 62, 0.8);
        }
        
        .glow-border-error {
             box-shadow: inset 0 0 15px rgba(255, 180, 171, 0.5);
             border: 1px solid rgba(255, 180, 171, 0.8);
        }

        .bloom-effect {
            box-shadow: 0 0 30px rgba(240, 192, 62, 0.3);
        }
        
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 15px rgba(240, 192, 62, 0.4); }
            50% { box-shadow: 0 0 35px rgba(240, 192, 62, 0.8); }
            100% { box-shadow: 0 0 15px rgba(240, 192, 62, 0.4); }
        }
        
        .animate-pulse-glow {
            animation: pulse-glow 2s infinite ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
            animation: shake 0.5s;
        }

@keyframes shimmer {
            100% { transform: translateX(100%); }
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-secondary": "#3e2e00",
                        "tertiary-fixed": "#e3dfff",
                        "on-tertiary-fixed": "#130068",
                        "on-error": "#690005",
                        "inverse-surface": "#dde3eb",
                        "on-primary-fixed": "#151935",
                        "surface-tint": "#c1c4e8",
                        "secondary-fixed": "#ffdf95",
                        "secondary": "#f0c03e",
                        "error-container": "#93000a",
                        "surface": "#0e141a",
                        "on-tertiary": "#2300a3",
                        "surface-dim": "#0e141a",
                        "surface-container-low": "#161c22",
                        "outline": "#919098",
                        "primary": "#c1c4e8",
                        "on-error-container": "#ffdad6",
                        "surface-container": "#1a2026",
                        "tertiary-fixed-dim": "#c4c0ff",
                        "secondary-container": "#ba9000",
                        "background": "#0e141a",
                        "on-primary-container": "#777a9b",
                        "surface-variant": "#2f353c",
                        "on-surface-variant": "#c7c5ce",
                        "secondary-fixed-dim": "#f0c03e",
                        "surface-bright": "#333a40",
                        "on-tertiary-container": "#7268f9",
                        "outline-variant": "#46464d",
                        "surface-container-lowest": "#080f14",
                        "tertiary": "#c4c0ff",
                        "error": "#ffb4ab",
                        "primary-fixed-dim": "#c1c4e8",
                        "on-tertiary-fixed-variant": "#3a28c0",
                        "surface-container-high": "#242b31",
                        "on-secondary-container": "#3c2c00",
                        "on-primary": "#2b2e4b",
                        "surface-container-highest": "#2f353c",
                        "on-secondary-fixed": "#251a00",
                        "inverse-primary": "#595c7b",
                        "on-primary-fixed-variant": "#414562",
                        "on-background": "#dde3eb",
                        "on-secondary-fixed-variant": "#594400",
                        "primary-fixed": "#dfe0ff",
                        "on-surface": "#dde3eb",
                        "primary-container": "#0a0e29",
                        "inverse-on-surface": "#2b3137",
                        "tertiary-container": "#0a0049"
                    };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-error/50`, `border-outline-variant/30`, `border-outline-variant/50`, `border-secondary`, `rounded-b-lg`, `rounded-full`, `rounded-xl`
- **Colors & Gradients:** `bg-[radial-gradient(circle_at_center,rgba(10,0,73,0.3)_0%,rgba(8,15,20,0.95)_100%)]`, `bg-background`, `bg-error-container/80`, `bg-gradient-to-r`, `bg-primary-container`, `bg-secondary/20`, `bg-surface-container-highest/50`, `bg-surface/60`, `bg-tertiary-fixed`, `text-[18px]`, `text-[20px]`, `text-[80px]`, `text-body-md`, `text-center`, `text-display-lg-mobile`, `text-error`, `text-headline-md`, `text-label-caps`, `text-on-error-container`, `text-on-surface`, `text-secondary`, `text-tertiary-fixed`
- **Shadows:** `shadow-[0_0_20px_rgba(255,180,171,0.2)]`, `shadow-[inset_0_0_30px_rgba(10,0,73,0.8)]`
- **Typography:** `font-body-md`, `font-display-lg-mobile`, `font-headline-md`, `font-label-caps`
- **Animations & Transitions:** `animate-pulse`, `animate-pulse-glow`, `animate-shake`, `duration-200`, `duration-300`, `group-hover:animate-[shimmer_1.5s_infinite]`, `transition-all`, `transition-transform`

---

## Screen: rounds_questions_management

### 1. Custom Styles (<style> block)
```css
.clip-diamond {
            clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
        }
        
        .gold-glow {
            box-shadow: inset 0 0 15px rgba(240,192,62,0.4), 0 0 20px rgba(240,192,62,0.1);
        }
        
        .purple-glow {
            box-shadow: inset 0 0 15px rgba(114,104,249,0.4), 0 0 20px rgba(114,104,249,0.1);
        }
        
        .glass-panel {
            background: rgba(14, 20, 26, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(240,192,62,0.3);
        }
        
        .glass-panel-active {
            background: rgba(10, 14, 41, 0.9);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(240,192,62,0.8);
            box-shadow: inset 0 0 30px rgba(240,192,62,0.15), 0 0 40px rgba(240,192,62,0.1);
        }
```

### 2. Custom Tailwind Config
```javascript
tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "inverse-on-surface": "#2b3137",
                      "on-surface": "#dde3eb",
                      "on-error": "#690005",
                      "surface-container-high": "#242b31",
                      "on-error-container": "#ffdad6",
                      "surface": "#0e141a",
                      "on-tertiary": "#2300a3",
                      "on-primary": "#2b2e4b",
                      "on-secondary-fixed-variant": "#594400",
                      "on-primary-fixed": "#151935",
                      "surface-container-low": "#161c22",
                      "outline-variant": "#46464d",
                      "on-tertiary-fixed": "#130068",
                      "on-primary-container": "#777a9b",
                      "on-primary-fixed-variant": "#414562",
                      "inverse-surface": "#dde3eb",
                      "tertiary-fixed": "#e3dfff",
                      "on-secondary": "#3e2e00",
                      "secondary-fixed": "#ffdf95",
                      "primary-fixed-dim": "#c1c4e8",
                      "secondary-container": "#ba9000",
                      "surface-bright": "#333a40",
                      "on-secondary-container": "#3c2c00",
                      "tertiary": "#c4c0ff",
                      "error-container": "#93000a",
                      "surface-tint": "#c1c4e8",
                      "primary-fixed": "#dfe0ff",
                      "on-tertiary-container": "#7268f9",
                      "background": "#0e141a",
                      "surface-container-highest": "#2f353c",
                      "secondary": "#f0c03e",
                      "on-tertiary-fixed-variant": "#3a28c0",
                      "inverse-primary": "#595c7b",
                      "primary": "#c1c4e8",
                      "surface-dim": "#0e141a",
                      "tertiary-container": "#0a0049",
                      "tertiary-fixed-dim": "#c4c0ff",
                      "surface-variant": "#2f353c",
                      "outline": "#919098",
                      "on-surface-variant": "#c7c5ce",
                      "surface-container": "#1a2026",
                      "on-background": "#dde3eb",
                      "surface-container-lowest": "#080f14",
                      "primary-container": "#0a0e29",
                      "secondary-fixed-dim": "#f0c03e",
                      "error": "#ffb4ab",
                      "on-secondary-fixed": "#251a00"
              };
```


### 3. Key Inline Styles (Gradients, Shapes, Sizes)
- `font-variation-settings: 'FILL' 1;`

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** `border-2`, `border-b`, `border-collapse`, `border-dashed`, `border-l-2`, `border-l-4`, `border-l-secondary`, `border-outline`, `border-outline-variant/10`, `border-outline-variant/20`, `border-outline-variant/30`, `border-outline-variant/50`, `border-outline/30`, `border-primary/30`, `border-r`, `border-secondary`, `border-secondary/20`, `border-secondary/30`, `border-secondary/40`, `border-secondary/50`, `border-t`, `border-tertiary`, `border-tertiary/30`, `rounded-lg`, `rounded-t`, `rounded-xl`
- **Colors & Gradients:** `bg-background`, `bg-background/80`, `bg-error`, `bg-primary-container`, `bg-primary-container/20`, `bg-primary-container/40`, `bg-secondary`, `bg-secondary/10`, `bg-secondary/5`, `bg-surface`, `bg-surface-container`, `bg-surface-container-highest`, `bg-surface-container-low/95`, `bg-surface-container/50`, `bg-tertiary-container/50`, `text-3xl`, `text-4xl`, `text-[10px]`, `text-center`, `text-display-lg`, `text-error`, `text-headline-md`, `text-label-caps`, `text-left`, `text-lg`, `text-on-error`, `text-on-secondary`, `text-on-surface`, `text-on-surface-variant`, `text-outline`, `text-outline-variant`, `text-primary`, `text-right`, `text-secondary`, `text-sm`, `text-tertiary`, `text-xl`, `text-xs`
- **Shadows:** `shadow-[0_0_15px_rgba(240,192,62,0.2)]`, `shadow-[0_0_15px_rgba(255,180,171,0.3)]`, `shadow-[0_0_20px_rgba(240,192,62,0.5)]`, `shadow-[0_20px_50px_rgba(0,0,0,0.8)]`, `shadow-[inset_0_0_10px_rgba(0,0,0,0.3)]`, `shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]`, `shadow-[inset_0_0_10px_rgba(193,196,232,0.2)]`, `shadow-[inset_0_0_20px_rgba(196,192,255,0.05)]`
- **Typography:** `font-body-lg`, `font-body-md`, `font-bold`, `font-display-lg`, `font-headline-md`, `font-label-caps`, `font-normal`
- **Animations & Transitions:** `duration-200`, `transition-all`, `transition-colors`, `transition-transform`

---

## Screen: shader_1

### 1. Custom Styles (<style> block)
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
```



### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** *None*
- **Colors & Gradients:** *None*
- **Shadows:** *None*
- **Typography:** *None*
- **Animations & Transitions:** *None*

---

## Screen: shader_2

### 1. Custom Styles (<style> block)
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
```



### 3. Key Inline Styles (Gradients, Shapes, Sizes)
*None found*

### 4. Style-Affecting Tailwind Classes
- **Borders & Radii:** *None*
- **Colors & Gradients:** *None*
- **Shadows:** *None*
- **Typography:** *None*
- **Animations & Transitions:** *None*

---


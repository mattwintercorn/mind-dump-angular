# Task 16: Implement DeFi Dark Theme UI Style

## Overview

Implement a modern DeFi-inspired dark theme based on the CompotFi Dashboard design reference:
https://me.muz.li/meris-c34f3534a379/compotfi-defi-dashboard-ui

This theme will provide a professional, data-heavy aesthetic suitable for technical users while maintaining accessibility.

## Design System

### Color Palette

#### Base Colors
```scss
$bg-primary: #0A0A0A;           // Main background
$bg-secondary: #1A1A1A;         // Secondary background
$bg-card: #1E1E1E;              // Card backgrounds
$bg-card-hover: #252525;        // Card hover state
$bg-input: #161616;             // Input backgrounds

$border-subtle: #2A2A2A;        // Subtle borders
$border-default: #333333;       // Default borders
$border-focus: #FF6B35;         // Focus state borders
```

#### Brand Colors
```scss
$primary: #FF6B35;              // Primary orange
$primary-hover: #FF7A47;        // Hover state
$primary-dark: #E65A2B;         // Pressed state

$gradient-orange: linear-gradient(135deg, #FF6B35 0%, #F97316 100%);
```

#### Semantic Colors
```scss
$success: #10B981;              // Green for positive
$error: #EF4444;                // Red for negative
$warning: #F59E0B;              // Orange for warnings
$info: #3B82F6;                 // Blue for info
```

#### Text Colors
```scss
$text-primary: #FFFFFF;         // Primary text
$text-secondary: #A0A0A0;       // Secondary text
$text-tertiary: #666666;        // Tertiary/muted text
$text-disabled: #4A4A4A;        // Disabled text
```

### Typography

#### Font Stack
```scss
$font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
              'Roboto', sans-serif;
```

#### Font Sizes
```scss
$font-xs: 0.75rem;    // 12px - Labels, captions
$font-sm: 0.875rem;   // 14px - Body small
$font-base: 1rem;     // 16px - Body
$font-lg: 1.125rem;   // 18px - Subheadings
$font-xl: 1.25rem;    // 20px - Headings
$font-2xl: 1.5rem;    // 24px - Large headings
$font-3xl: 2rem;      // 32px - Hero text
```

#### Font Weights
```scss
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;
```

### Spacing

```scss
$space-xs: 0.25rem;   // 4px
$space-sm: 0.5rem;    // 8px
$space-md: 1rem;      // 16px
$space-lg: 1.5rem;    // 24px
$space-xl: 2rem;      // 32px
$space-2xl: 3rem;     // 48px
```

### Border Radius

```scss
$radius-sm: 4px;      // Small elements
$radius-md: 8px;      // Cards, buttons
$radius-lg: 12px;     // Large cards
$radius-xl: 16px;     // Hero sections
$radius-full: 9999px; // Pills, avatars
```

### Shadows

```scss
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
$shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
$shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
$shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.6);

// Glow effects for accents
$shadow-glow-orange: 0 0 20px rgba(255, 107, 53, 0.3);
```

## Component Styles

### 1. Material Theme Override

Create `src/styles/_theme-defi-dark.scss`:

```scss
@use '@angular/material' as mat;

// Define custom palette
$defi-primary: (
  50: #FFF5F2,
  100: #FFE7DE,
  200: #FFCFBD,
  300: #FFB79C,
  400: #FF8F6B,
  500: #FF6B35,  // Primary
  600: #E65A2B,
  700: #CC4A21,
  800: #B33A17,
  900: #992A0D,
  contrast: (
    50: #000000,
    100: #000000,
    200: #000000,
    300: #000000,
    400: #FFFFFF,
    500: #FFFFFF,
    600: #FFFFFF,
    700: #FFFFFF,
    800: #FFFFFF,
    900: #FFFFFF,
  )
);

$defi-accent: (
  50: #F0F9FF,
  100: #E0F2FE,
  200: #BAE6FD,
  300: #7DD3FC,
  400: #38BDF8,
  500: #0EA5E9,
  600: #0284C7,
  700: #0369A1,
  800: #075985,
  900: #0C4A6E,
  contrast: (
    50: #000000,
    100: #000000,
    200: #000000,
    300: #000000,
    400: #000000,
    500: #FFFFFF,
    600: #FFFFFF,
    700: #FFFFFF,
    800: #FFFFFF,
    900: #FFFFFF,
  )
);

// Create theme
$defi-dark-theme: mat.define-dark-theme((
  color: (
    primary: mat.define-palette($defi-primary),
    accent: mat.define-palette($defi-accent),
    warn: mat.define-palette(mat.$red-palette),
  ),
  typography: mat.define-typography-config(
    $font-family: 'Inter, sans-serif',
  ),
  density: 0,
));

// Apply theme
@include mat.all-component-themes($defi-dark-theme);
```

### 2. Global Styles

Update `src/styles.scss`:

```scss
@import 'styles/theme-defi-dark';
@import 'styles/variables-defi';

body {
  background: $bg-primary;
  color: $text-primary;
  font-family: $font-family;
}

// Card styling
.card {
  background: $bg-card;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
  
  &:hover {
    background: $bg-card-hover;
    border-color: $border-focus;
  }
}

// Button styling
.btn-primary {
  background: $gradient-orange;
  color: $text-primary;
  border: none;
  border-radius: $radius-md;
  padding: $space-sm $space-lg;
  font-weight: $font-semibold;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: $shadow-glow-orange;
  }
  
  &:active {
    transform: translateY(0);
  }
}

// Data table styling
.data-table {
  background: $bg-card;
  border-radius: $radius-md;
  overflow: hidden;
  
  tr {
    border-bottom: 1px solid $border-subtle;
    
    &:hover {
      background: $bg-card-hover;
    }
  }
  
  th {
    background: $bg-secondary;
    color: $text-secondary;
    font-size: $font-sm;
    font-weight: $font-semibold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: $space-md;
  }
  
  td {
    padding: $space-md;
    color: $text-primary;
  }
}

// Chart styling
.chart-container {
  background: $bg-card;
  border: 1px solid $border-default;
  border-radius: $radius-lg;
  padding: $space-lg;
  
  // Orange line charts
  .chart-line {
    stroke: $primary;
    stroke-width: 2px;
  }
  
  .chart-area {
    fill: url(#gradient-orange-fade);
  }
}

// Badge/Tag styling
.badge {
  background: rgba(255, 107, 53, 0.15);
  color: $primary;
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: $radius-full;
  padding: $space-xs $space-sm;
  font-size: $font-xs;
  font-weight: $font-medium;
}

// Input styling
.input {
  background: $bg-input;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  color: $text-primary;
  padding: $space-sm $space-md;
  
  &:focus {
    outline: none;
    border-color: $border-focus;
    box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
  }
  
  &::placeholder {
    color: $text-tertiary;
  }
}
```

### 3. Toolbar Update

Update `toolbar.component.scss`:

```scss
.app-toolbar {
  background: $bg-secondary !important;
  border-bottom: 1px solid $border-default;
  box-shadow: $shadow-md;
  
  .app-title {
    font-size: $font-xl;
    font-weight: $font-bold;
    background: $gradient-orange;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  // View buttons
  .view-controls button {
    color: $text-secondary;
    
    &.active {
      color: $primary;
      background: rgba(255, 107, 53, 0.15);
    }
  }
}
```

### 4. Idea Card Styling

Update `idea-card.component.scss`:

```scss
.idea-card {
  background: $bg-card;
  border: 1px solid $border-default;
  border-radius: $radius-lg;
  padding: $space-lg;
  transition: all 0.2s ease;
  
  &:hover {
    background: $bg-card-hover;
    border-color: $primary;
    box-shadow: $shadow-glow-orange;
    transform: translateY(-2px);
  }
  
  .idea-title {
    color: $text-primary;
    font-size: $font-lg;
    font-weight: $font-semibold;
    margin-bottom: $space-sm;
  }
  
  .idea-description {
    color: $text-secondary;
    font-size: $font-sm;
    margin-bottom: $space-md;
  }
  
  .idea-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: $space-sm;
    
    .keyword {
      @extend .badge;
    }
  }
  
  .idea-meta {
    display: flex;
    gap: $space-md;
    margin-top: $space-md;
    padding-top: $space-md;
    border-top: 1px solid $border-subtle;
    font-size: $font-xs;
    color: $text-tertiary;
  }
}
```

### 5. Graph Visualization

Update `force-graph.component.scss`:

```scss
.graph-container {
  background: $bg-primary;
  
  // Node styling
  .node {
    fill: $bg-card;
    stroke: $primary;
    stroke-width: 2px;
    
    &:hover {
      fill: $bg-card-hover;
      stroke-width: 3px;
      filter: drop-shadow(0 0 10px rgba(255, 107, 53, 0.6));
    }
  }
  
  // Link styling
  .link {
    stroke: $border-default;
    stroke-width: 1px;
    opacity: 0.6;
    
    &.active {
      stroke: $primary;
      stroke-width: 2px;
      opacity: 1;
    }
  }
  
  // Labels
  .node-label {
    fill: $text-primary;
    font-size: $font-sm;
    font-weight: $font-medium;
  }
}
```

## Implementation Steps

### Phase 1: Setup (2 hours)

1. **Install Inter font**
   ```bash
   npm install @fontsource/inter
   ```
   
2. **Import in main.ts**
   ```typescript
   import '@fontsource/inter/400.css';
   import '@fontsource/inter/500.css';
   import '@fontsource/inter/600.css';
   import '@fontsource/inter/700.css';
   ```

3. **Create SCSS variables file**
   - `src/styles/_variables-defi.scss` with all color/spacing variables

4. **Create theme file**
   - `src/styles/_theme-defi-dark.scss` with Material theme override

### Phase 2: Global Styles (3 hours)

1. **Update `styles.scss`** with new base styles
2. **Update Material components** (buttons, inputs, cards)
3. **Add utility classes** for common patterns

### Phase 3: Component Updates (4 hours)

1. **Toolbar** - Dark background, orange accents
2. **Idea Cards** - Dark cards with hover glow
3. **Filter Panel** - Dark sidebar styling
4. **Graph Visualization** - Orange nodes and links
5. **Forms/Dialogs** - Dark modal backgrounds

### Phase 4: Testing & Polish (2 hours)

1. **Visual regression testing** - Compare before/after screenshots
2. **Accessibility audit** - Contrast ratios, focus states
3. **Animation polish** - Smooth transitions
4. **Dark mode toggle** (optional) - Allow switching between themes

## Acceptance Criteria

- [ ] Dark theme applied across all pages
- [ ] Orange primary color used consistently
- [ ] All text meets WCAG AA contrast requirements (4.5:1 minimum)
- [ ] Hover states provide clear feedback
- [ ] Cards have subtle shadows and glow effects
- [ ] Graphs use orange accent colors
- [ ] Inter font loaded and applied
- [ ] No visual regressions in existing functionality
- [ ] Toolbar updated with gradient logo text
- [ ] Buttons have orange gradient background

## Design Reference

**Primary Reference:** https://me.muz.li/meris-c34f3534a379/compotfi-defi-dashboard-ui

**Key Characteristics:**
- Data-dense dashboard aesthetic
- Professional DeFi/Web3 styling
- High contrast for readability
- Orange/coral as primary accent
- Subtle animations and hover effects
- Clean, modern card-based layout

## Notes

- This theme emphasizes data density and professionalism
- Orange accent provides energy without being overwhelming
- Dark theme reduces eye strain for long sessions
- Design is suitable for technical/power users
- Maintains accessibility while looking modern

## Timeline

**Total Estimate:** 11 hours

- Phase 1: 2 hours
- Phase 2: 3 hours
- Phase 3: 4 hours
- Phase 4: 2 hours

## Dependencies

- None - can be implemented immediately after Phase 1 completion

## Future Enhancements

- Theme toggle (light/dark/defi modes)
- Custom theme builder
- Additional color schemes (blue, purple, green variants)
- Advanced animation library integration

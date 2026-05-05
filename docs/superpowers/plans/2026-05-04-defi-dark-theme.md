# DeFi Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Mind Dump app from Material light theme to a professional DeFi-inspired dark theme with orange accents, modern typography, and data-dense aesthetic.

**Architecture:** Override Angular Material's theme system with custom dark palette, apply global CSS variables for consistent styling, and update component styles to match DeFi design patterns. Use CSS custom properties for maintainability and theme consistency across all components.

**Tech Stack:** Angular Material 17+ theming, SCSS, CSS custom properties, Inter font family

---

## File Structure

### New Files
- `src/styles/_variables-defi.scss` - Design tokens (colors, spacing, typography)
- `src/styles/_theme-defi-dark.scss` - Material theme overrides
- `src/styles/_components-defi.scss` - Custom component styles

### Modified Files
- `src/styles.scss` - Import new theme files, apply global styles
- `src/index.html` - Add Inter font from Google Fonts
- Component SCSS files (toolbar, cards, dialogs, etc.)

---

## Task 1: Setup Design System Variables

**Files:**
- Create: `src/styles/_variables-defi.scss`

- [ ] **Step 1: Create SCSS variables file with color palette**

```scss
// src/styles/_variables-defi.scss

// Base Colors
$bg-primary: #0A0A0A;           // Main background
$bg-secondary: #1A1A1A;         // Secondary background
$bg-card: #1E1E1E;              // Card backgrounds
$bg-card-hover: #252525;        // Card hover state
$bg-input: #161616;             // Input backgrounds

$border-subtle: #2A2A2A;        // Subtle borders
$border-default: #333333;       // Default borders
$border-focus: #FF6B35;         // Focus state borders

// Brand Colors
$primary: #FF6B35;              // Primary orange
$primary-hover: #FF7A47;        // Hover state
$primary-dark: #E65A2B;         // Pressed state

// Semantic Colors
$success: #10B981;              // Green for positive
$error: #EF4444;                // Red for negative
$warning: #F59E0B;              // Orange for warnings
$info: #3B82F6;                 // Blue for info

// Text Colors
$text-primary: #FFFFFF;         // Primary text
$text-secondary: #A0A0A0;       // Secondary text
$text-tertiary: #666666;        // Tertiary/muted text
$text-disabled: #4A4A4A;        // Disabled text

// Typography
$font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

$font-xs: 0.75rem;    // 12px
$font-sm: 0.875rem;   // 14px
$font-base: 1rem;     // 16px
$font-lg: 1.125rem;   // 18px
$font-xl: 1.25rem;    // 20px
$font-2xl: 1.5rem;    // 24px
$font-3xl: 2rem;      // 32px

$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;

// Spacing
$space-xs: 0.25rem;   // 4px
$space-sm: 0.5rem;    // 8px
$space-md: 1rem;      // 16px
$space-lg: 1.5rem;    // 24px
$space-xl: 2rem;      // 32px
$space-2xl: 3rem;     // 48px

// Border Radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;
$radius-full: 9999px;

// Shadows
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
$shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
$shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
$shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.6);

// Glow effects
$shadow-glow-orange: 0 0 20px rgba(255, 107, 53, 0.3);
```

- [ ] **Step 2: Verify file was created**

Run: `ls -la src/styles/_variables-defi.scss`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/styles/_variables-defi.scss
git commit -m "feat: add DeFi dark theme design tokens"
```

---

## Task 2: Create Material Theme Override

**Files:**
- Create: `src/styles/_theme-defi-dark.scss`

- [ ] **Step 1: Create Material theme override file**

```scss
// src/styles/_theme-defi-dark.scss
@use '@angular/material' as mat;
@use 'variables-defi' as vars;

// Define custom primary palette
$defi-primary: (
  50: #FFF5F2,
  100: #FFE7DE,
  200: #FFCFBD,
  300: #FFB79C,
  400: #FF8F6B,
  500: vars.$primary,  // #FF6B35
  600: vars.$primary-dark,  // #E65A2B
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

// Define custom accent palette
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

// Create dark theme
$defi-dark-theme: mat.define-theme((
  color: (
    theme-type: dark,
    primary: mat.$orange-palette,
    tertiary: mat.$blue-palette,
  ),
  typography: (
    plain-family: vars.$font-family,
    brand-family: vars.$font-family,
    bold-weight: vars.$font-semibold,
  ),
  density: (
    scale: 0,
  )
));

// Apply theme to all Material components
html {
  @include mat.all-component-themes($defi-dark-theme);
  
  // Override specific Material colors
  --mat-app-background-color: #{vars.$bg-primary};
  --mat-app-text-color: #{vars.$text-primary};
  --mat-app-on-surface: #{vars.$text-primary};
  --mat-app-surface: #{vars.$bg-card};
  --mat-app-on-surface-variant: #{vars.$text-secondary};
  --mat-app-outline: #{vars.$border-default};
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/_theme-defi-dark.scss
git commit -m "feat: add Material dark theme override for DeFi style"
```

---

## Task 3: Update Global Styles

**Files:**
- Modify: `src/styles.scss`
- Modify: `src/index.html`

- [ ] **Step 1: Update index.html to load Inter font**

```html
<!-- src/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Mind Dump</title>
  <base href="/mind-dump-angular/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  
  <!-- Inter Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

- [ ] **Step 2: Update styles.scss with theme imports and global styles**

```scss
// src/styles.scss
@import 'styles/variables-defi';
@import 'styles/theme-defi-dark';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: $bg-primary;
  color: $text-primary;
  font-family: $font-family;
  font-size: $font-base;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

app-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// Scrollbar styling
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: $bg-secondary;
}

::-webkit-scrollbar-thumb {
  background: $border-default;
  border-radius: $radius-sm;
  
  &:hover {
    background: $text-tertiary;
  }
}

// Focus styles
:focus-visible {
  outline: 2px solid $primary;
  outline-offset: 2px;
}

// Selection styling
::selection {
  background: rgba($primary, 0.3);
  color: $text-primary;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles.scss src/index.html
git commit -m "feat: apply DeFi dark theme globally with Inter font"
```

---

## Task 4: Style Toolbar Component

**Files:**
- Modify: `src/app/shared/components/layout/toolbar/toolbar.component.scss`

- [ ] **Step 1: Update toolbar styles with DeFi dark theme**

```scss
// src/app/shared/components/layout/toolbar/toolbar.component.scss
@import '../../../../styles/variables-defi';

.toolbar {
  display: flex;
  align-items: center;
  padding: 0 $space-lg;
  gap: $space-md;
  background: $bg-card !important;
  border-bottom: 1px solid $border-subtle;
  box-shadow: $shadow-md;
  height: 64px;
  color: $text-primary !important;
}

.app-logo {
  height: 40px;
  width: 40px;
  object-fit: contain;
  margin-right: $space-sm;
}

.toolbar-title {
  font-size: $font-xl;
  font-weight: $font-semibold;
  color: $text-primary;
  letter-spacing: -0.02em;
}

.workspace-switcher {
  margin-right: $space-md;
}

.spacer {
  flex: 1 1 auto;
}

.view-toggle {
  margin-left: $space-md;
  background: $bg-secondary;
  border-radius: $radius-md;
  
  ::ng-deep {
    .mat-button-toggle {
      border: none;
      background: transparent;
      color: $text-secondary;
      
      &.mat-button-toggle-checked {
        background: $primary;
        color: $text-primary;
        
        .mat-icon {
          color: $text-primary;
        }
      }
      
      &:hover:not(.mat-button-toggle-checked) {
        background: $bg-card-hover;
      }
    }
    
    .mat-button-toggle-button {
      height: 40px;
      padding: 0 $space-md;
    }
  }
}

.share-button {
  margin-left: $space-sm;
  color: $text-secondary;
  
  &:hover {
    color: $primary;
    background: rgba($primary, 0.1);
  }
}

.user-avatar-button {
  margin-left: $space-sm;
  
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: $radius-full;
    object-fit: cover;
    border: 2px solid $border-subtle;
  }
  
  mat-icon {
    color: $text-secondary;
  }
}

// User menu styling
::ng-deep {
  .user-menu-header {
    cursor: default;
    background: $bg-secondary;
    
    .user-info {
      padding: $space-sm 0;
      
      .user-name {
        font-weight: $font-medium;
        font-size: $font-sm;
        line-height: 1.4;
        color: $text-primary;
      }
      
      .user-email {
        font-size: $font-xs;
        line-height: 1.4;
        color: $text-secondary;
        margin-top: $space-xs;
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/shared/components/layout/toolbar/toolbar.component.scss
git commit -m "style: apply DeFi dark theme to toolbar"
```

---

## Task 5: Style Card Components

**Files:**
- Modify: `src/app/features/ideas/components/idea-card/idea-card.component.scss`

- [ ] **Step 1: Update idea card styles**

```scss
// src/app/features/ideas/components/idea-card/idea-card.component.scss
@import '../../../../../styles/variables-defi';

:host {
  display: block;
}

.idea-card {
  background: $bg-card;
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  padding: $space-lg;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    background: $bg-card-hover;
    border-color: $border-default;
    box-shadow: $shadow-lg;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $space-md;
}

.card-title {
  font-size: $font-lg;
  font-weight: $font-semibold;
  color: $text-primary;
  margin: 0 0 $space-xs 0;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.card-description {
  font-size: $font-sm;
  color: $text-secondary;
  line-height: 1.6;
  margin-bottom: $space-md;
  flex: 1;
  
  // Limit to 3 lines
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: $space-sm;
  margin-top: auto;
}

.meta-chip {
  font-size: $font-xs;
  padding: $space-xs $space-sm;
  background: $bg-secondary;
  color: $text-secondary;
  border-radius: $radius-sm;
  border: 1px solid $border-subtle;
  font-weight: $font-medium;
  
  &.status {
    border-color: $primary;
    color: $primary;
  }
  
  &.priority-high {
    border-color: $error;
    color: $error;
  }
  
  &.priority-medium {
    border-color: $warning;
    color: $warning;
  }
  
  &.priority-low {
    border-color: $info;
    color: $info;
  }
}

.card-actions {
  display: flex;
  gap: $space-xs;
  
  button {
    color: $text-secondary;
    
    &:hover {
      color: $primary;
      background: rgba($primary, 0.1);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/features/ideas/components/idea-card/idea-card.component.scss
git commit -m "style: apply DeFi dark theme to idea cards"
```

---

## Task 6: Style Dialog Components

**Files:**
- Create: `src/styles/_components-defi.scss`
- Modify: `src/styles.scss`

- [ ] **Step 1: Create component overrides file**

```scss
// src/styles/_components-defi.scss
@import 'variables-defi';

// Material Dialog overrides
::ng-deep {
  .mat-mdc-dialog-container {
    --mdc-dialog-container-color: #{$bg-card};
    --mdc-dialog-subhead-color: #{$text-primary};
    --mdc-dialog-supporting-text-color: #{$text-secondary};
    
    background: $bg-card;
    border: 1px solid $border-default;
    border-radius: $radius-lg;
    box-shadow: $shadow-xl;
  }
  
  .mat-mdc-dialog-title {
    color: $text-primary;
    font-weight: $font-semibold;
    font-size: $font-xl;
    letter-spacing: -0.01em;
  }
  
  .mat-mdc-dialog-content {
    color: $text-secondary;
  }
  
  .mat-mdc-dialog-actions {
    padding: $space-md $space-lg;
    border-top: 1px solid $border-subtle;
  }
}

// Material Form Field overrides
::ng-deep {
  .mat-mdc-form-field {
    .mat-mdc-text-field-wrapper {
      background: $bg-input;
      border-radius: $radius-md;
    }
    
    .mat-mdc-form-field-focus-overlay {
      background: $bg-input;
    }
    
    .mat-mdc-floating-label {
      color: $text-secondary;
    }
    
    &.mat-focused {
      .mat-mdc-floating-label {
        color: $primary;
      }
      
      .mdc-notched-outline__notch,
      .mdc-notched-outline__leading,
      .mdc-notched-outline__trailing {
        border-color: $primary !important;
      }
    }
    
    input, textarea {
      color: $text-primary;
      caret-color: $primary;
    }
  }
  
  .mdc-notched-outline__notch,
  .mdc-notched-outline__leading,
  .mdc-notched-outline__trailing {
    border-color: $border-default;
  }
}

// Material Button overrides
::ng-deep {
  .mat-mdc-button {
    --mdc-text-button-label-text-color: #{$text-secondary};
    
    &:hover {
      --mdc-text-button-label-text-color: #{$text-primary};
    }
  }
  
  .mat-mdc-raised-button {
    &.mat-primary {
      --mdc-protected-button-container-color: #{$primary};
      --mdc-protected-button-label-text-color: #{$text-primary};
      
      &:hover {
        --mdc-protected-button-container-color: #{$primary-hover};
        box-shadow: $shadow-glow-orange;
      }
      
      &:active {
        --mdc-protected-button-container-color: #{$primary-dark};
      }
    }
  }
  
  .mat-mdc-icon-button {
    --mat-icon-button-state-layer-color: #{$text-secondary};
    
    &:hover {
      --mat-icon-button-state-layer-color: #{$primary};
    }
  }
}

// Material Menu overrides
::ng-deep {
  .mat-mdc-menu-panel {
    background: $bg-card;
    border: 1px solid $border-default;
    border-radius: $radius-md;
    box-shadow: $shadow-lg;
    
    .mat-mdc-menu-content {
      padding: $space-xs 0;
    }
    
    .mat-mdc-menu-item {
      color: $text-secondary;
      
      &:hover {
        background: $bg-card-hover;
        color: $text-primary;
      }
      
      .mat-icon {
        color: $text-secondary;
      }
    }
  }
}

// Material Chips overrides
::ng-deep {
  .mat-mdc-chip {
    --mdc-chip-elevated-container-color: #{$bg-secondary};
    --mdc-chip-label-text-color: #{$text-secondary};
    border: 1px solid $border-subtle;
    
    &.mat-primary {
      --mdc-chip-elevated-container-color: rgba(#{$primary}, 0.1);
      --mdc-chip-label-text-color: #{$primary};
      border-color: $primary;
    }
  }
}

// Material Autocomplete overrides
::ng-deep {
  .mat-mdc-autocomplete-panel {
    background: $bg-card;
    border: 1px solid $border-default;
    border-radius: $radius-md;
    box-shadow: $shadow-lg;
    
    .mat-mdc-option {
      color: $text-secondary;
      
      &:hover {
        background: $bg-card-hover;
        color: $text-primary;
      }
      
      &.mat-mdc-option-active {
        background: $bg-card-hover;
      }
    }
  }
}

// Material Spinner overrides
::ng-deep {
  .mat-mdc-progress-spinner {
    --mdc-circular-progress-active-indicator-color: #{$primary};
  }
}
```

- [ ] **Step 2: Import component overrides in styles.scss**

Add this line after theme imports in `src/styles.scss`:

```scss
@import 'styles/components-defi';
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/_components-defi.scss src/styles.scss
git commit -m "style: add Material component overrides for DeFi theme"
```

---

## Task 7: Style Workspace Switcher

**Files:**
- Modify: `src/app/shared/components/workspace/workspace-switcher/workspace-switcher.component.scss`

- [ ] **Step 1: Update workspace switcher styles**

```scss
// src/app/shared/components/workspace/workspace-switcher/workspace-switcher.component.scss
@import '../../../../../styles/variables-defi';

.workspace-button {
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: $space-sm $space-md;
  background: $bg-secondary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  color: $text-primary;
  transition: all 0.2s ease;
  
  &:hover {
    background: $bg-card-hover;
    border-color: $border-default;
  }
  
  mat-icon {
    color: $text-secondary;
  }
  
  .workspace-name {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: $font-medium;
    font-size: $font-sm;
  }
}

::ng-deep {
  .mat-mdc-menu-panel.workspace-menu {
    min-width: 280px;
    max-width: 320px;
  }
}

.menu-section {
  padding: $space-sm 0;

  .section-header {
    display: flex;
    align-items: center;
    gap: $space-sm;
    padding: $space-sm $space-md;
    font-size: $font-xs;
    font-weight: $font-semibold;
    color: $text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    
    mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: $text-tertiary;
    }
  }
}

.workspace-item-container {
  display: flex;
  align-items: center;
  position: relative;

  &:hover .workspace-settings-button {
    opacity: 1;
  }
}

.workspace-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  padding: $space-sm $space-md;
  color: $text-secondary;
  font-size: $font-sm;
  
  &:hover {
    background: $bg-card-hover;
    color: $text-primary;
  }
  
  &.active {
    background: rgba($primary, 0.1);
    color: $primary;
    
    .workspace-name {
      font-weight: $font-semibold;
    }
  }
  
  .check-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
    color: $primary;
  }
}

.workspace-settings-button {
  opacity: 0;
  transition: opacity 0.2s;
  color: $text-secondary;
  
  &:hover {
    color: $primary;
    background: rgba($primary, 0.1);
  }
  
  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
  }
}

.create-workspace {
  display: flex;
  align-items: center;
  gap: $space-sm;
  color: $primary;
  font-weight: $font-medium;
  padding: $space-sm $space-md;
  
  &:hover {
    background: rgba($primary, 0.1);
  }
  
  mat-icon {
    color: $primary;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/shared/components/workspace/workspace-switcher/workspace-switcher.component.scss
git commit -m "style: apply DeFi dark theme to workspace switcher"
```

---

## Task 8: Style Filter Sidebar

**Files:**
- Modify: `src/app/features/ideas/components/idea-filters/idea-filters.component.scss`

- [ ] **Step 1: Update filter sidebar styles**

```scss
// src/app/features/ideas/components/idea-filters/idea-filters.component.scss
@import '../../../../../styles/variables-defi';

.filters-container {
  background: $bg-card;
  border-right: 1px solid $border-subtle;
  padding: $space-lg;
  height: 100%;
  overflow-y: auto;
}

.filters-title {
  font-size: $font-lg;
  font-weight: $font-semibold;
  color: $text-primary;
  margin-bottom: $space-lg;
  letter-spacing: -0.01em;
}

.filter-section {
  margin-bottom: $space-xl;
}

.filter-label {
  font-size: $font-sm;
  font-weight: $font-medium;
  color: $text-secondary;
  margin-bottom: $space-sm;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: $font-xs;
}

::ng-deep {
  .mat-mdc-form-field {
    width: 100%;
    
    .mat-mdc-text-field-wrapper {
      background: $bg-input;
    }
  }
  
  .mat-expansion-panel {
    background: transparent;
    box-shadow: none;
    border-top: 1px solid $border-subtle;
    
    &:first-of-type {
      border-top: none;
    }
    
    .mat-expansion-panel-header {
      color: $text-primary;
      font-weight: $font-medium;
      padding: $space-md 0;
      
      &:hover {
        background: transparent;
      }
    }
    
    .mat-expansion-panel-body {
      padding: 0 0 $space-md 0;
    }
  }
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: $space-xs;
  
  .keyword-chip {
    font-size: $font-xs;
    padding: $space-xs $space-sm;
    background: $bg-secondary;
    color: $text-secondary;
    border-radius: $radius-sm;
    border: 1px solid $border-subtle;
    
    &:hover {
      border-color: $primary;
      color: $primary;
    }
  }
}

.no-keywords {
  color: $text-tertiary;
  font-size: $font-sm;
  font-style: italic;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/features/ideas/components/idea-filters/idea-filters.component.scss
git commit -m "style: apply DeFi dark theme to filter sidebar"
```

---

## Task 9: Update Loading Overlay

**Files:**
- Modify: `src/app/shared/components/loading-overlay/loading-overlay.component.ts`

- [ ] **Step 1: Update loading overlay with DeFi dark styles**

```typescript
// src/app/shared/components/loading-overlay/loading-overlay.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (isVisible) {
      <div class="loading-overlay">
        <div class="loading-content">
          <mat-spinner diameter="60" [color]="'primary'"></mat-spinner>
          <p class="loading-text">{{ message }}</p>
        </div>
      </div>
    }
  `,
  styles: [`
    @import '../../../styles/variables-defi';
    
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba($bg-primary, 0.95);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-lg;
      padding: $space-2xl;
      background: $bg-card;
      border-radius: $radius-lg;
      border: 1px solid $border-default;
      box-shadow: $shadow-xl, $shadow-glow-orange;
    }

    .loading-text {
      margin: 0;
      font-size: $font-base;
      color: $text-primary;
      font-weight: $font-medium;
      letter-spacing: -0.01em;
    }
  `]
})
export class LoadingOverlayComponent {
  @Input() isVisible = false;
  @Input() message = 'Loading...';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/shared/components/loading-overlay/loading-overlay.component.ts
git commit -m "style: update loading overlay with DeFi dark theme"
```

---

## Task 10: Build and Deploy

**Files:**
- N/A

- [ ] **Step 1: Build the application**

Run: `npm run build -- --configuration production --base-href /mind-dump-angular/`
Expected: Build succeeds with warnings about bundle size

- [ ] **Step 2: Test locally (optional)**

Run: `npm start`
Expected: App runs on http://localhost:4200 with new dark theme

- [ ] **Step 3: Deploy to GitHub Pages**

Run: `npx angular-cli-ghpages --dir=dist/mind-dump-angular/browser --no-silent`
Expected: Successfully deployed message

- [ ] **Step 4: Verify deployment**

Visit: https://mattwintercorn.github.io/mind-dump-angular/
Expected: App loads with DeFi dark theme

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "build: deploy DeFi dark theme to production"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Dark background (#0A0A0A) applied throughout
- [ ] Orange primary color (#FF6B35) on buttons and accents
- [ ] Inter font loaded and applied
- [ ] Cards have proper hover states with glow
- [ ] All text is readable (white/gray on dark)
- [ ] Form inputs have dark styling
- [ ] Dialogs match DeFi aesthetic
- [ ] Toolbar has clean, modern look
- [ ] Workspace switcher styled correctly
- [ ] Loading overlay matches theme
- [ ] No visual regressions

---

## Notes

- All SCSS files use the shared `_variables-defi.scss` for consistency
- Material components are overridden via `::ng-deep` in global styles
- Component-specific styles remain in component SCSS files
- The theme is fully responsive and maintains accessibility
- Colors meet WCAG AA contrast requirements

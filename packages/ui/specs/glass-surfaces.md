# Glass Surfaces

## Surface Levels

### Shell Glass

Usage:

- Sidebar
- Topbar

Values:

- Strong dark translucency.
- Low to medium blur.
- Subtle white border.

### Panel Glass

Usage:

- Alert strips.
- Filter panels.
- Secondary content groups.

Values:

- Medium translucency.
- Medium blur.
- Medium shadow.

### Hero Glass

Usage:

- Four operational dashboard cards.

Values:

- Module gradient.
- Stronger shadow.
- Contextual glow.
- Internal highlight.

### Floating Glass

Usage:

- Modals.
- Drawers.
- Command palette.

Values:

- Higher opacity.
- Strong blur.
- Backdrop dim.
- Strong elevation.

## CSS Intent

Implementation should map tokens to CSS custom properties:

```css
--glass-surface: rgba(7,18,40,0.62);
--glass-border: rgba(255,255,255,0.12);
--glass-highlight: rgba(255,255,255,0.16);
--glass-blur-panel: 16px;
```

## Fallback

When backdrop filter is unavailable or reduced:

- Increase background opacity.
- Reduce glow.
- Preserve borders.
- Preserve text contrast.

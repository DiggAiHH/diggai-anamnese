# DiggAI Anamnese Platform - Typography Specification

> **Phase 2 Implementation** | Psychology-Based Typography for Elderly & Anxious Users  
> **Version**: 2.0.0 | **Date**: 2026-03-24 | **Status**: Implemented

---

## Executive Summary

This document specifies the typography system implemented in Phase 2, designed specifically for elderly users and patients with anxiety. The system is grounded in research showing that **18px body text reduces senior operation time to levels comparable with younger users**.

### Key Changes from Phase 1

| Aspect | Phase 1 | Phase 2 (Current) |
|--------|---------|-------------------|
| Base Font Size | 16px | **18px** |
| Primary Font | Outfit + Inter | **Inter only** |
| RTL Support | Basic | **Noto Sans Arabic** |
| Body Line Height | 1.5 | **1.625** |
| Touch Targets | Standard | **Enlarged** |

---

## Font Stack

### Primary Font Stack (LTR Languages)
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Why Inter?**
- Optimized for screen readability
- Excellent at small sizes
- Large x-height improves legibility
- Designed by Rasmus Andersson (Google)
- Open source and freely available

### RTL Font Stack (Arabic & Persian)
```css
--font-rtl: 'Noto Sans Arabic', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Why Noto Sans Arabic?**
- Comprehensive Arabic script coverage
- Four weights (400, 500, 600, 700)
- Designed for UI applications
- Excellent hinting for screen display
- Maintains visual harmony with Inter

### Monospace Font Stack
```css
--font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

**Use Cases:**
- Medical codes and identifiers
- Date/time stamps
- Numeric data display
- Technical specifications

---

## Type Scale

Based on **18px base size** (up from 16px in Phase 1).

| Token | Size | Pixels | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|--------|-------------|----------------|-------|
| **H1** | 2rem | 32px | 600 | 1.3 | -0.02em | Page titles, hero content |
| **H2** | 1.5rem | 24px | 600 | 1.4 | -0.01em | Section headings |
| **H3** | 1.25rem | 20px | 500 | 1.4 | 0 | Subsection headings |
| **H4** | 1.125rem | 18px | 600 | 1.5 | 0 | Card titles |
| **H5** | 1rem | 16px | 600 | 1.5 | 0.01em | Labels, small headings |
| **H6** | 0.875rem | 14px | 600 | 1.5 | 0.02em | Uppercase labels |
| **Body** | 1.125rem | 18px | 400 | 1.625 | 0.01em | Primary content |
| **Small** | 1rem | 16px | 400 | 1.5 | 0.01em | Secondary content |
| **Caption** | 0.875rem | 14px | 400 | 1.5 | 0.02em | Metadata, hints |

### CSS Class Mapping

```css
/* Heading Classes */
.text-h1  /* 32px, weight 600, line-height 1.3 */
.text-h2  /* 24px, weight 600, line-height 1.4 */
.text-h3  /* 20px, weight 500, line-height 1.4 */
.text-h4  /* 18px, weight 600, line-height 1.5 */
.text-h5  /* 16px, weight 600, line-height 1.5 */
.text-h6  /* 14px, weight 600, line-height 1.5, uppercase */

/* Body Classes */
.text-body         /* 18px, weight 400, line-height 1.625 */
.text-body-small   /* 16px, weight 400, line-height 1.5 */
.text-caption      /* 14px, weight 400, line-height 1.5 */
.text-label        /* 14px, weight 500, line-height 1.5 */
```

---

## Research Foundation

### 18px Base Size Rationale

Research in gerontechnology and accessibility has established:

1. **Legibility Threshold**: 16px is the minimum for general readability; 18px significantly improves speed for users 60+
2. **Presbyopia Compensation**: Beginning around age 40, the eye's lens loses flexibility. Larger text compensates for this natural decline.
3. **Cognitive Load**: Larger text reduces cognitive processing overhead, particularly important for anxious users.
4. **Motor Control**: Larger text implies larger touch targets, accommodating reduced fine motor precision.

### Line Height (1.625) Rationale

- **Dyslexia Accommodation**: Increased line spacing (vs. 1.5) aids readers with dyslexia
- **Scanning Efficiency**: Prevents lines from blending together during quick scanning
- **Visual Rest**: Reduces eye strain during extended form completion
- **Medical Context**: Patients may be tired, stressed, or medicated; generous spacing accommodates reduced concentration

### Letter Spacing Strategy

| Spacing | Value | Purpose |
|---------|-------|---------|
| Tight (-0.02em) | Headings | Creates visual cohesion in large type |
| Normal (0) | H3-H4 | Standard readability |
| Expanded (0.01em) | Body | Slight openness aids letter recognition |
| Wide (0.02em) | Captions | Compensates for small size |

---

## RTL (Right-to-Left) Considerations

### Language Support

| Language | Code | Direction | Font |
|----------|------|-----------|------|
| Arabic | ar | RTL | Noto Sans Arabic |
| Persian/Farsi | fa | RTL | Noto Sans Arabic |
| All others | - | LTR | Inter |

### RTL-Specific Adjustments

```css
/* Automatic application based on lang attribute */
html[lang="ar"],
html[lang="fa"],
[dir="rtl"] {
  --font-sans: var(--font-rtl);
}

/* Increased line height for Arabic script complexity */
[dir="rtl"] body {
  line-height: 1.7;  /* vs 1.625 for LTR */
}

/* No negative letter spacing for Arabic */
[dir="rtl"] h1, [dir="rtl"] h2, [dir="rtl"] h3 {
  letter-spacing: 0;
  line-height: 1.5;
}
```

### Technical Implementation

The system automatically applies RTL fonts based on:
1. `html lang` attribute (ar, fa)
2. CSS `dir="rtl"` attribute
3. i18n language detection

---

## Accessibility Compliance

### WCAG 2.1 AA Requirements

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| **1.4.3 Contrast** | 4.5:1 minimum (text) | Color tokens ensure compliance |
| **1.4.4 Resize Text** | 200% zoom support | rem-based sizing throughout |
| **1.4.8 Visual Presentation** | Line spacing adjustable | CSS custom properties |
| **1.4.12 Text Spacing** | No content loss at increased spacing | Flexible layouts |

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  /* Enhanced borders and focus states */
  /* Ensures text remains legible in forced colors mode */
}
```

---

## Component-Specific Typography

### Question Containers

```css
.question-title {
  font-size: 1.375rem;    /* 22px - larger than body */
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.question-description {
  font-size: 1rem;        /* 16px - secondary importance */
  line-height: 1.625;
}
```

### Input Fields

```css
.input-base {
  font-size: 1.125rem;    /* 18px - matches body */
  padding: 1rem 1.125rem; /* Larger touch target */
}
```

### Buttons

```css
.btn-primary, .btn-secondary {
  font-size: 1rem;        /* 16px - clear and actionable */
  padding: 0.875rem 2rem; /* Generous touch target */
  letter-spacing: 0.01em; /* Slight openness */
}

.btn-large {
  font-size: 1.125rem;    /* 18px - high priority actions */
  padding: 1rem 2.5rem;
}
```

### Option Cards

```css
.option-card {
  font-size: 1.125rem;    /* 18px */
  padding: 1.125rem 1.375rem; /* Increased for touch */
}
```

---

## Print Styles

For PDF export and printing:

```css
@media print {
  html {
    font-size: 12pt;      /* Standard print size */
  }
  
  body {
    font-family: 'Inter', Arial, sans-serif;
    line-height: 1.5;
    color: #1e293b;       /* High contrast black */
  }
}
```

---

## Implementation Checklist

- [x] Update `index.html` with Noto Sans Arabic font
- [x] Update `src/index.css` with new font stacks
- [x] Update `src/tokens/tokens.css` with new font tokens
- [x] Increase base font size to 18px
- [x] Implement RTL font switching
- [x] Update heading hierarchy
- [x] Update body text line height to 1.625
- [x] Update component typography (buttons, inputs, cards)
- [x] Add accessibility utilities (sr-only, focus-visible)
- [x] Ensure print styles updated
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Test RTL languages (Arabic, Persian)
- [ ] Validate WCAG 2.1 AA compliance

---

## Performance Considerations

### Font Loading Strategy

```html
<!-- Preconnect to Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload critical font -->
<link rel="preload" as="style" 
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" />
```

### Font Display

- `font-display: swap` is applied by Google Fonts
- System fonts used as fallbacks during load
- No layout shift due to font size changes (rem-based)

### Bundle Impact

| Font | Weights | Estimated Size |
|------|---------|----------------|
| Inter | 400, 500, 600, 700 | ~90KB |
| Noto Sans Arabic | 400, 500, 600, 700 | ~180KB (loaded on demand) |

---

## Migration Guide

### For Developers

**Before (Phase 1):**
```css
body {
  font-family: 'Outfit', 'Inter', ...;
  font-size: 16px;
}
```

**After (Phase 2):**
```css
body {
  font-family: var(--font-sans); /* Inter stack */
  /* font-size: 18px via html { font-size: 18px } */
}
```

### Backward Compatibility

- All existing `rem` values automatically scale to new base
- Class names remain unchanged
- Token system extended, not replaced
- Outfit font references fall back to Inter

---

## Testing Requirements

### Visual Regression Testing

1. Compare all screens at 18px vs 16px base
2. Verify no text overflow or truncation
3. Check button text fits within bounds
4. Validate form field labels

### Accessibility Testing

1. **Zoom Test**: 200% browser zoom, verify all text scales
2. **Screen Reader Test**: Verify heading hierarchy (H1→H6)
3. **Color Contrast**: Validate 4.5:1 minimum ratio
4. **Keyboard Navigation**: Ensure focus indicators visible

### RTL Testing

1. Switch to Arabic (ar) or Persian (fa)
2. Verify Noto Sans Arabic loads
3. Check text alignment (right-to-left)
4. Validate increased line height applied

### Device Testing

| Device | Priority | Focus |
|--------|----------|-------|
| Desktop (1920px) | High | General layout |
| Tablet (768px) | High | Touch targets |
| Mobile (375px) | Critical | Font scaling |
| Large text settings | Critical | Accessibility |

---

## Future Enhancements

1. **Variable Fonts**: Consider Inter variable for finer weight control
2. **User Preferences**: Respect browser font-size preferences
3. **Dynamic Scaling**: Auto-adjust based on user age selection
4. **Dyslexia Font**: Optional OpenDyslexic toggle
5. **Reading Mode**: Simplified layout with maximum readability

---

## References

1. [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
2. [Inter Font Family](https://rsms.me/inter/)
3. [Noto Fonts - Google](https://fonts.google.com/noto)
4. [Accessible Typography - WebAIM](https://webaim.org/articles/type/)
5. [Typography for Older Adults - NNGroup](https://www.nngroup.com/articles/legibility-readability-comprehension/)
6. [Dyslexia and Typography - British Dyslexia Association](https://www.bdadyslexia.org.uk/)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-20 | Initial typography system (Outfit + Inter, 16px base) |
| 2.0.0 | 2026-03-24 | **Phase 2**: Psychology-based optimization (Inter only, 18px base, Noto Sans Arabic RTL) |

---

*Document maintained by the DiggAI UX Engineering Team*  
*For questions, contact: ux-team@diggai.de*

# ♿ Accessibility Guidelines

Hướng dẫn tuân thủ WCAG 2.1 AA.

## 🎯 WCAG 2.1 AA Requirements

### Level A (Must Have)

| Criterion | Description | Implementation |
|-----------|-------------|----------------|
| 1.1.1 Non-text Content | All non-text content has text alternative | `alt` attributes for images |
| 1.2.1 Audio-only and Video-only | Alternatives for prerecorded media | Captions, transcripts |
| 1.3.1 Info and Relationships | Structure is programmatically determinable | Semantic HTML |
| 1.3.2 Meaningful Sequence | Reading order is correct | Logical DOM order |
| 1.4.1 Use of Color | Color is not only means of conveying info | Text labels, icons |
| 1.4.3 Contrast (Minimum) | Text has contrast ratio of at least 4.5:1 | `--color-text-primary` |
| 2.1.1 Keyboard | All functionality available by keyboard | Tab navigation |
| 2.1.2 No Keyboard Trap | No keyboard trap | Focus management |
| 2.4.1 Bypass Blocks | Skip navigation links | Skip links |
| 2.4.2 Page Titled | Pages have descriptive titles | `<title>` tags |
| 2.4.3 Focus Order | Focus order is logical | Tabindex, DOM order |
| 2.4.4 Link Purpose | Link purpose is clear | Descriptive link text |
| 3.1.1 Language of Page | Page language is identified | `lang` attribute |
| 3.2.1 On Focus | No unexpected changes on focus | Avoid autofocus traps |
| 3.3.1 Error Identification | Errors are clearly identified | Error messages |
| 3.3.2 Labels or Instructions | Labels provided for inputs | `<label>` elements |
| 4.1.1 Parsing | No duplicate IDs | Unique IDs |
| 4.1.2 Name, Role, Value | UI components have accessible info | ARIA attributes |

### Level AA (Should Have)

| Criterion | Description | Target |
|-----------|-------------|--------|
| 1.4.4 Resize Text | Text can resize to 200% | Responsive typography |
| 1.4.5 Images of Text | Images of text avoided | CSS text styling |
| 1.4.10 Reflow | Content reflows without loss | Responsive breakpoints |
| 1.4.11 Non-text Contrast | UI components have 3:1 contrast | Button borders, inputs |
| 1.4.12 Text Spacing | Text spacing can be overridden | CSS overrides allowed |
| 1.4.13 Content on Hover or Focus | Content is dismissible | Tooltips, modals |
| 2.4.5 Multiple Ways | Multiple ways to find content | Search, navigation |
| 2.4.6 Headings and Labels | Headings and labels describe topic | Semantic headings |
| 2.4.7 Focus Visible | Focus indicator is visible | Outline styles |
| 3.1.2 Language of Parts | Language of parts is identified | `lang` attributes |
| 3.2.3 Consistent Navigation | Navigation is consistent | Same nav structure |
| 3.2.4 Consistent Identification | Components are consistent | Same labels |
| 3.3.3 Suggestions | Suggestions for errors | Helpful error messages |
| 3.3.4 Error Prevention | Errors can be prevented | Confirmation dialogs |

## 🎨 Color Contrast

### Minimum Contrast Ratios

| Text Type | Minimum Ratio | Example |
|-----------|---------------|---------|
| Normal text (< 18px) | 4.5:1 | `--color-gray-600` on white |
| Large text (≥ 18px) | 3:1 | `--color-gray-500` on white |
| UI components | 3:1 | Button borders |
| Focus indicators | 3:1 | Focus outline |

### Implementation

```css
/* ✅ Good contrast */
.text-primary {
  color: #111827; /* contrast: 16.1:1 */
  background: #ffffff;
}

/* ❌ Poor contrast */
.text-muted {
  color: #9ca3af; /* contrast: 2.2:1 */
  background: #ffffff;
}
```

## 🔤 Typography

### Requirements

```css
/* Minimum font size */
body {
  font-size: 16px; /* Don't go below 16px */
  line-height: 1.5; /* Minimum 1.5 for body text */
  letter-spacing: 0;
}

/* Line length */
.max-width-prose {
  max-width: 65ch; /* Optimal reading width */
}

/* Text spacing - must not break with overrides */
.text-spacing {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
```

## 🖱️ Keyboard Navigation

### Focus Order

```tsx
// ❌ Bad: Missing focus management
<Modal isOpen={isOpen} onClose={onClose}>
  <button onClick={onClose}>Close</button>
</Modal>

// ✅ Good: Focus management
<Modal 
  isOpen={isOpen} 
  onClose={onClose}
  initialFocus={cancelButtonRef}
  finalFocus={triggerRef}
>
  <button ref={cancelButtonRef}>Close</button>
</Modal>
```

### Skip Links

```tsx
// Add to layout
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// CSS
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 0;
}
```

### Focus Indicators

```css
/* Don't remove outline without replacement */
*:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Or use box-shadow */
*:focus {
  box-shadow: 0 0 0 2px var(--color-primary-500);
}

/* Remove for mouse users only */
*:focus:not(:focus-visible) {
  outline: none;
}
```

## 🖼️ Images

### Alt Text Guidelines

```tsx
// ✅ Good alt text
<img src="book-cover.jpg" alt="Clean Code book cover showing a wrench on blue background" />

// ❌ Bad: Missing or useless alt
<img src="book-cover.jpg" alt="" /> {/* Decorative */}
<img src="book-cover.jpg" alt="Book" /> {/* Too vague */}

// ✅ Icons need aria-hidden or label
<button>
  <SearchIcon aria-hidden="true" />
  <span className="sr-only">Search</span>
</button>
```

### Decorative Images

```tsx
// Decorative images
<img src="decoration.svg" alt="" role="presentation" />
// or
<img src="decoration.svg" aria-hidden="true" />
```

## 📝 Forms

### Labels and Instructions

```tsx
// ✅ Good: Associated labels
<div>
  <label htmlFor="email">Email address</label>
  <input 
    id="email" 
    type="email" 
    aria-describedby="email-hint" 
  />
  <span id="email-hint">We'll never share your email</span>
</div>

// ✅ Good: Error messages
<label htmlFor="password">Password</label>
<input 
  id="password" 
  type="password"
  aria-invalid={hasError}
  aria-describedby={hasError ? 'password-error' : undefined}
/>
{hasError && (
  <span id="password-error" role="alert">
    Password must be at least 8 characters
  </span>
)}
```

### Required Fields

```tsx
// ✅ Good: Indicate required fields
<label htmlFor="email">
  Email address
  <span aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</label>
```

## 🔊 Media

### Video

```tsx
// Video with captions
<video controls>
  <source src="video.mp4" type="video/mp4" />
  <track 
    kind="captions" 
    src="captions.vtt" 
    srclang="vi" 
    label="Vietnamese" 
    default
  />
</video>
```

## 🧭 Navigation

### Semantic Structure

```tsx
// ✅ Good: Semantic HTML5
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/books">Books</a></li>
    </ul>
  </nav>
</header>

<main id="main-content" tabIndex={-1}>
  <h1>Page Title</h1>
</main>

<footer>
  <nav aria-label="Footer navigation">
    {/* Footer links */}
  </nav>
</footer>
```

### ARIA Landmarks

```tsx
// When HTML5 elements aren't sufficient
<div role="banner">Header</div>
<div role="main" id="main-content">Main content</div>
<div role="navigation" aria-label="Main">Nav</div>
<div role="contentinfo">Footer</div>
```

## 🛠️ Testing Tools

### Automated Testing

```bash
# Install axe-core
npm install @axe-core/react

// In development
import React from 'react';
import ReactDOM from 'react-dom';
import axe from '@axe-core/react';

if (process.env.NODE_ENV !== 'production') {
  axe(React, ReactDOM, 1000);
}
```

### Manual Testing Checklist

- [ ] Navigate with keyboard only
- [ ] Test with screen reader (NVDA, VoiceOver)
- [ ] Check color contrast
- [ ] Test zoom to 200%
- [ ] Verify focus indicators
- [ ] Check error messages are announced
- [ ] Test skip links
- [ ] Verify form labels

## 📱 Mobile Accessibility

### Touch Targets

```css
/* Minimum touch target size: 44x44px */
button,
a,
input[type="checkbox"],
input[type="radio"] {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}
```

### Screen Orientation

```css
/* Allow both orientations */
@media (orientation: portrait) {
  /* Portrait styles */
}

@media (orientation: landscape) {
  /* Landscape styles */
}
```

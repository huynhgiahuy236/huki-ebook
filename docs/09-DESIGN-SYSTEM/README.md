# 🎨 Design System

Hệ thống thiết kế cho HUKI EBOOK.

## 📁 Design Tokens

### Colors

```css
:root {
  /* Primary Colors */
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-200: #bae6fd;
  --color-primary-300: #7dd3fc;
  --color-primary-400: #38bdf8;
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-800: #075985;
  --color-primary-900: #0c4a6e;
  --color-primary-950: #082f49;

  /* Accent Colors */
  --color-accent-500: #f59e0b;
  --color-accent-600: #d97706;

  /* Semantic Colors */
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-warning-500: #eab308;
  --color-warning-600: #ca8a04;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-info-500: #3b82f6;
  --color-info-600: #2563eb;

  /* Neutral Colors */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --color-gray-950: #030712;

  /* Background */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;

  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-tertiary: #9ca3af;
  --color-text-inverse: #ffffff;
}
```

### Typography

```css
:root {
  /* Font Family */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Font Size */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */

  /* Font Weight */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Height */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;

  /* Letter Spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
}
```

### Spacing

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;    /* 4px */
  --radius-md: 0.375rem;     /* 6px */
  --radius-lg: 0.5rem;       /* 8px */
  --radius-xl: 0.75rem;     /* 12px */
  --radius-2xl: 1rem;       /* 16px */
  --radius-3xl: 1.5rem;      /* 24px */
  --radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}
```

### Breakpoints

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

## 📦 Components

### Button

```tsx
// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button isLoading>Loading</Button>
<Button disabled>Disabled</Button>
```

### Input

```tsx
// Basic
<Input placeholder="Enter text" />

// With label
<FormField label="Email" error="Invalid email">
  <Input type="email" placeholder="email@example.com" />
</FormField>

// With icon
<Input leftIcon={<SearchIcon />} placeholder="Search..." />
```

### Card

```tsx
<Card>
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
    <Card.Description>Card description text</Card.Description>
  </Card.Header>
  <Card.Content>
    Card content goes here
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

### Badge

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>
```

### Modal

```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>
    <Modal.Title>Modal Title</Modal.Title>
    <Modal.CloseButton />
  </Modal.Header>
  <Modal.Body>
    Modal content
  </Modal.Body>
  <Modal.Footer>
    <Button variant="outline" onClick={onClose}>Cancel</Button>
    <Button>Confirm</Button>
  </Modal.Footer>
</Modal>
```

## 📏 Layout

### Container

```tsx
// Max widths
<Container>...</Container>                    // Default (1280px)
<Container size="sm">...</Container>           // 640px
<Container size="md">...</Container>           // 768px
<Container size="lg">...</Container>           // 1024px
<Container size="xl">...</Container>           // 1280px
<Container size="full">...</Container>        // 100%
```

### Grid

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {items.map(item => <BookCard key={item.id} book={item} />)}
</div>
```

### Stack

```tsx
// Vertical stack
<VStack gap={4}>
  <Box>Item 1</Box>
  <Box>Item 2</Box>
  <Box>Item 3</Box>
</VStack>

// Horizontal stack
<HStack gap={4}>
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</HStack>
```

## 🔧 Utility Classes

```css
/* Flexbox */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-4 { gap: 1rem; }
.flex-1 { flex: 1 1 0%; }

/* Grid */
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

/* Spacing */
.p-4 { padding: 1rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.m-4 { margin: 1rem; }
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.ml-auto { margin-left: auto; }
.mr-auto { margin-right: auto; }

/* Typography */
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
.text-center { text-align: center; }

/* Colors */
.bg-white { background-color: white; }
.text-gray-500 { color: #6b7280; }
.border-gray-200 { border-color: #e5e7eb; }

/* Borders */
.border { border-width: 1px; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-full { border-radius: 9999px; }

/* Shadows */
.shadow-sm { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
.shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }

/* Transitions */
.transition { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.duration-200 { transition-duration: 200ms; }
.ease-in-out { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
```

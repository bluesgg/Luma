# Dependency Details and Usage Reference

## Added Dependencies

### 1. KaTeX (Production)

**Version:** 0.16.10
**NPM Package:** `katex`
**Type:** Production dependency

#### Purpose

Renders mathematical expressions and LaTeX notation in a browser environment. Used for displaying mathematical formulas in educational content.

#### Usage Locations

- `/src/components/learn/latex-renderer.tsx` - Main LaTeX/Math renderer component
  - Handles inline (`$...$`) and display (`$$...$$`) math notation
  - Renders five-layer explanations with mathematical content
  - Falls back to raw text if rendering fails

#### Key Features

- Dynamic import to avoid SSR issues
- Graceful error handling with fallbacks
- CSS styling support via `katex/dist/katex.min.css`
- Supports both inline and display modes

#### Implementation Details

```typescript
// Dynamic import pattern used in latex-renderer.tsx
const katex = await import('katex')
await import('katex/dist/katex.min.css')

// Rendering
katex.renderToString(formula, {
  displayMode: true, // or false for inline
  throwOnError: false,
})
```

### 2. @radix-ui/react-scroll-area (Production)

**Version:** 1.2.0
**NPM Package:** `@radix-ui/react-scroll-area`
**Type:** Production dependency

#### Purpose

Provides an accessible, styled scroll area component built on Radix UI primitives.

#### Usage Locations

- `/src/components/ui/scroll-area.tsx` - Base ScrollArea component wrapper
- `/src/components/learn/explanation-panel.tsx` - Scrollable explanation layers
- `/src/components/learn/topic-outline.tsx` - Scrollable topic navigation

#### Key Features

- Accessible scrolling with proper ARIA attributes
- Custom scrollbar styling
- Responsive to content changes
- Smooth scroll behavior

#### Component Exports

- `ScrollArea` - Main component
- `ScrollBar` - Custom scrollbar styling

### 3. @radix-ui/react-radio-group (Production)

**Version:** 1.2.0
**NPM Package:** `@radix-ui/react-radio-group`
**Type:** Production dependency

#### Purpose

Provides accessible radio button group component following WAI-ARIA specifications.

#### Usage Locations

- `/src/components/ui/radio-group.tsx` - Base RadioGroup wrapper
- `/src/components/learn/topic-test.tsx` - Multiple choice question selection

#### Key Features

- Accessible keyboard navigation
- ARIA support for screen readers
- Proper focus management
- Visual indicator for selection (circle filled with color)

#### Component Exports

- `RadioGroup` - Main group container
- `RadioGroupItem` - Individual radio button item

#### Implementation in TopicTest

```typescript
// Used in multiple choice questions
<RadioGroup value={answer} onValueChange={setAnswer}>
  <div className="space-y-2">
    {currentQuestion.options?.map((option, index) => (
      <div key={index} className="flex items-center space-x-2">
        <RadioGroupItem
          value={option}
          id={`option-${index}`}
          disabled={!!feedback}
        />
        <Label htmlFor={`option-${index}`}>
          <LatexRenderer content={option} />
        </Label>
      </div>
    ))}
  </div>
</RadioGroup>
```

### 4. @types/katex (DevDependency)

**Version:** 0.16.7
**NPM Package:** `@types/katex`
**Type:** Development dependency (TypeScript types)

#### Purpose

Provides TypeScript type definitions for the KaTeX library.

#### Usage

- TypeScript type checking in `latex-renderer.tsx`
- IDE autocompletion and type hints
- Build-time type validation

#### Provides

- Type definitions for `katex` module
- Interface definitions for KaTeX render options
- Return type specifications

## Component Integration Map

### Learning Session Flow

```
LearningPage ([sessionId]/page.tsx)
├── ProgressBar (progress-bar.tsx)
│   └── @radix-ui/react-scroll-area
├── TopicOutline (topic-outline.tsx)
│   └── @radix-ui/react-scroll-area
├── ExplanationPanel (explanation-panel.tsx)
│   ├── LatexRenderer (latex-renderer.tsx)
│   │   └── katex
│   ├── PageImages (page-images.tsx)
│   └── @radix-ui/react-scroll-area
└── TopicTest (topic-test.tsx)
    ├── LatexRenderer (latex-renderer.tsx)
    │   └── katex
    ├── RadioGroup (@radix-ui/react-radio-group)
    └── Input components
```

## Version Compatibility

### KaTeX 0.16.10

- Requires: None (pure JavaScript)
- CSS: Inline via dynamic import
- Browser support: Modern browsers (ES6+)

### Radix UI React Scroll Area 1.2.0

- Requires: React 16.8+, React DOM 16.8+
- Peer dependency: `@radix-ui/react-primitive`
- Inherits: Scroll Area Primitive from Radix

### Radix UI React Radio Group 1.2.0

- Requires: React 16.8+, React DOM 16.8+
- Uses: `lucide-react` for Circle indicator icon
- Peer dependency: `@radix-ui/react-primitive`

## Potential Issues and Solutions

### KaTeX Dynamic Import

**Issue:** SSR rendering of KaTeX
**Solution:** Component uses dynamic import in useEffect hook only

```typescript
useEffect(() => {
  const renderLatex = async () => {
    const katex = await import('katex')
    // ... render logic
  }
}, [content])
```

### Radio Group with Custom Content

**Issue:** Using LaTeX within radio group labels
**Solution:** Wrap label content in a `<label>` element with proper htmlFor

```typescript
<Label htmlFor={`option-${index}`}>
  <LatexRenderer content={option} />
</Label>
```

### Scroll Area Styling

**Issue:** Custom scrollbar appearance in different browsers
**Solution:** Use CSS classes and Tailwind utilities for consistent styling

## Testing Considerations

### Unit Tests

- KaTeX: Mock dynamic imports in tests
- Scroll Area: Test scroll behavior and content overflow
- Radio Group: Test selection and keyboard navigation

### E2E Tests

- Verify LaTeX formulas render correctly
- Verify scrolling works in explanation panels
- Verify radio button selection in tests

## Performance Implications

1. **KaTeX Bundle Size:** ~100KB (gzipped)
   - Loaded dynamically only when needed
   - Consider lazy loading for better initial page load

2. **Radix UI Scroll Area:** ~5KB (gzipped)
   - Lightweight primitive-based component
   - Minimal performance impact

3. **Radix UI Radio Group:** ~3KB (gzipped)
   - Lightweight accessible component
   - No performance concerns

## Migration Notes

If updating these dependencies in the future:

1. **KaTeX:** Check for rendering changes in math notation
2. **@radix-ui packages:** Follow Radix UI breaking changes guide
3. **TypeScript types:** May need to update corresponding @types packages

## Additional Resources

- KaTeX Documentation: https://katex.org/
- Radix UI Scroll Area: https://www.radix-ui.com/docs/primitives/components/scroll-area
- Radix UI Radio Group: https://www.radix-ui.com/docs/primitives/components/radio-group
- React Query Integration: Uses TanStack React Query for data fetching

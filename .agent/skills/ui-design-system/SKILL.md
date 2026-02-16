---
description: Guide for maintaining consistent "Premium" UI design using Tailwind CSS and custom components
---

# UI Design System

Use this skill when creating new frontend components or pages to ensure consistency with the "Premium" design language.

## Design Philosophy

-   **Glassmorphism**: Use translucent backgrounds with blur for cards and panels.
-   **Dark Mode**: The application is primarily dark mode. Use dark grays and blacks.
-   **Accents**: Use subtle gradients (Cyan, Green, Violet) for highlights.
-   **Spacing**: Use consistent spacing (multiples of 4px via Tailwind classes like `p-4`, `m-6`).

## Core Components

Prefer using these existing components over creating new styles from scratch:

-   `GlassCard`: For content containers.
-   `Button`: Standard buttons with variants (`default`, `outline`, `ghost`).
-   `Input` / `Select`: Form controls.
-   `Badge`: Status indicators.

## Styling Rules

1.  **Tailwind First**: Avoid writing custom CSS in `.css` files unless absolutely necessary for complex animations.
2.  **`cn` Utility**: Always use `cn()` (from `lib/utils`) to merge classes dynamically.
    ```tsx
    import { cn } from "@/lib/utils";
    // ...
    className={cn("bg-neutral-900 border border-white/10", className)}
    ```
3.  **Responsive**: Always implement mobile styles first, then override for larger screens (`md:`, `lg:`).
4.  **Icons**: Use `lucide-react` for icons. Set `size` and `className` as needed.

## Examples

### Card Structure
```tsx
<div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-6">
  <h2 className="text-xl font-bold text-white mb-2">Title</h2>
  <p className="text-neutral-400">Description</p>
</div>
```

### Gradients
Use text gradients for emphasis:
```tsx
<span className="bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
  Healthy
</span>
```

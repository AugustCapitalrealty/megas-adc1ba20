

# Fix: Warning "Function components cannot be given refs"

The issue is that `ErrorBoundary` (a class component) wraps `ThemeProvider` (a function component from `next-themes`). React class components can attempt to attach refs to their children, triggering this warning.

## Solution

Move `ThemeProvider` **outside** the outer `ErrorBoundary`, so `ErrorBoundary` wraps a regular DOM-rendering tree instead of directly wrapping a function component that doesn't forward refs.

**File: `src/App.tsx`** (lines 94-113)

```tsx
const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ScrollToTop />
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </ThemeProvider>
);
```

This is safe because `ThemeProvider` itself is unlikely to throw — it just sets a CSS class on `<html>`. The `ErrorBoundary` still catches everything meaningful inside it.


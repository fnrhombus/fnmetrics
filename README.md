# fnmetrics

**See your code's complexity at a glance. Both kinds.**

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/fnrhombus.fnmetrics)](https://marketplace.visualstudio.com/items?itemName=fnrhombus.fnmetrics)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

```
  Complexity: 3 (cyclomatic) · 2 (cognitive)     <- simple, green
  function calculateTotal(items: Item[]) {
    return items.reduce((sum, item) => sum + item.price, 0);
  }

  Complexity: 12 (cyclomatic) · 18 (cognitive)   <- complex, red
  function processOrder(order: Order) {
    for (const item of order.items) {
      if (item.inStock) {
        if (item.quantity > 0 && item.price > 0) {
          // deeply nested logic...
        }
      }
    }
  }
```

Color-coded inline indicators appear above every function:
- Green: complexity <= 5 (simple, easy to understand)
- Yellow: complexity 6-10 (moderate, consider refactoring)
- Red: complexity > 10 (complex, should be refactored)

All thresholds are configurable.

## The problem

[CodeMetrics](https://marketplace.visualstudio.com/items?itemName=kisstkondoros.vscode-codemetrics) had 1.1M installs but hasn't been updated since 2022. It only supports cyclomatic complexity, which counts decision paths but doesn't account for how *hard* code is to understand.

Deeply nested code is harder to read than flat code with the same number of branches. Cyclomatic complexity doesn't capture this. Cognitive complexity does.

## What fnmetrics shows

**Both metrics, side by side:**

- **Cyclomatic complexity** counts execution paths. A function with 10 `if` statements has cyclomatic complexity 11, whether they're flat or nested 10 levels deep. Useful for estimating test coverage needs.

- **Cognitive complexity** measures how hard code is to *understand*. It penalizes nesting: an `if` inside a `for` inside a `try` costs more than three flat `if` statements. Based on the [SonarSource cognitive complexity specification](https://www.sonarsource.com/docs/CognitiveComplexity.pdf).

## Comparison with CodeMetrics

| Feature | fnmetrics | CodeMetrics |
|---------|-----------|-------------|
| Cyclomatic complexity | Yes | Yes |
| Cognitive complexity | Yes | No |
| Color-coded indicators | Yes | Yes |
| Configurable thresholds | Yes | Yes |
| TypeScript support | Yes | Yes |
| JavaScript support | Yes | Yes |
| TSX/JSX support | Yes | Yes |
| Actively maintained | Yes | No (last update 2022) |
| Status bar summary | Yes | No |
| Lightweight (no bundled TS) | Yes | Yes |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `fnmetrics.greenThreshold` | `5` | Max complexity for green (simple) |
| `fnmetrics.yellowThreshold` | `10` | Max complexity for yellow (moderate) |
| `fnmetrics.enabled` | `true` | Enable/disable complexity indicators |

## How it works

fnmetrics uses the TypeScript Compiler API to parse your source files and walk the AST. It finds every function-like declaration (functions, methods, arrow functions, getters/setters, constructors) and computes both complexity metrics by counting decision points and tracking nesting depth.

No external services. No network requests. Everything runs locally in your editor.

## Support

If fnmetrics saves you time, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/fnrhombus)
- [Buy Me a Coffee](https://buymeacoffee.com/fnrhombus)

## License

[MIT](LICENSE)

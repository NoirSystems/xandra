# Xandra CSS Framework

A standardization contract for consistent UI.

## Installation

```bash
npm install xandra
```

## Usage

```javascript
// In your entry file (React, Svelte, Vue, Angular, etc.)
import 'xandra';
```

Or you can use the raw CSS files directly if your bundler supports it:

```javascript
import 'xandra/src/xandra.css'; // Full source
// Or individual modules:
import 'xandra/src/_typography.css';
```

## Features

- **No external dependencies needed**: Pure CSS implementation.
- **Philosophy**: One class = one visual contract.
- **Audit System**: Built-in NS Audit system `[ns]`, `data-ns="reason"`, `x-audit`.
- **Themes**: Support for `x-theme-dark`, `x-theme-light`, `x-theme-nvg`, `x-theme-high-contrast`.

## Philosophy

The Xandra framework uses custom attributes and standard classes to produce standard compliant user interfaces. Designed specifically to reduce standard bloat while creating premium aesthetics and animations.

## License
Apache 2.0

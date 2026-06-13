# Dossier — Brand Assets & Spec

Handoff package for implementing the **Dossier** app identity. Everything here is final
and production-ready. The wordmark/glyph is **outlined vector** (no font dependency) so it
renders identically everywhere.

The mark: a lowercase **d** set in a Courier-family slab-serif typewriter face — a nod to a
typed dossier on the desk — in warm ink on cream, with a single oxblood underscore rule.

---

## Files

```
Dossier-Brand/
├── AppIcon.appiconset/         ← drag straight into Assets.xcassets (Xcode 14+)
│   ├── Contents.json           ← single-size 1024 (modern app-icon)
│   └── icon-1024.png
├── assets/
│   ├── svg/
│   │   ├── dossier-icon.svg            ← app icon, d only (primary)
│   │   ├── dossier-lockup.svg          ← d + "dossier" stacked (splash / App Store / marketing)
│   │   └── dossier-logo-horizontal.svg ← d | dossier, transparent bg (web header / nav bar)
│   └── png/
│       ├── dossier-icon-1024.png
│       └── icon-{20,29,40,58,60,72,76,80,87,100,114,120,144,152,167,180,1024}.png
└── BRAND.md
```

All SVGs are vector — scale to any size with no quality loss.

---

## Color tokens

| Token            | Hex        | Use                                   |
|------------------|------------|---------------------------------------|
| `ink`            | `#211B14`  | Glyph, primary text                   |
| `cream`          | `#EFE7D5`  | Flat background (solid)               |
| `cream-top`      | `#F3ECDC`  | Background gradient start             |
| `cream-bottom`   | `#E9DFC9`  | Background gradient end               |
| `oxblood`        | `#9B3526`  | Accent — underscore rule, active tint |
| `keyline`        | `#D6CCB6`  | Hairline border (ink @ 16% on cream)  |
| `charcoal`       | `#181410`  | Optional dark-mode background         |

The icon background is a subtle top-left → bottom-right gradient from `cream-top` to
`cream-bottom`. For flat fills, `cream` (`#EFE7D5`) is the single-value equivalent.

Suggested system roles:
- App background: `cream` (light) / `charcoal` (dark)
- Accent / tint: `oxblood`
- Text: `ink` on light, `#F1E6CD` on dark

---

## Typeface

The logo itself needs **no font** — it's outlined.

For everything else (UI, marketing), the brand voice is a **Courier-family slab-serif
typewriter**. The logo was drawn from a Courier-family face; the recommended licensable
equivalents are:

- **Courier Prime** — free, SIL Open Font License, embeddable in apps. Best match for the
  logo's character. https://fonts.google.com/specimen/Courier+Prime
- **IBM Plex Mono** — free, OFL. Cleaner/neutral; good for dense UI and small sizes.

> Note: avoid shipping *Courier New* itself — it's a proprietary system font and not
> licensed for app embedding. Use Courier Prime instead.

Wordmark is set **all lowercase** with light letter-tracking. Don't use title case for the
wordmark.

---

## iOS implementation

1. Delete the default `AppIcon` in `Assets.xcassets`, then drag in the provided
   `AppIcon.appiconset` folder. It uses the modern single-1024 format; Xcode generates the
   rest. (The `assets/png/icon-*.png` set is included if a target needs explicit sizes.)
2. The 1024 master is **fully opaque, no transparency, square** — App Store compliant. iOS
   applies the rounded-corner mask automatically; do not pre-round it.
3. Launch / splash screen: center `dossier-lockup.svg` on a `cream` background. Import the
   SVG as a vector asset (Xcode: "Preserve Vector Data" on) or use the PDF export.
4. Set the app accent/tint to `oxblood` (`#9B3526`).

The thin keyline in the icon is intentional but optional — if you'd prefer a cleaner
full-bleed tile, it can be removed (ask for a no-keyline variant).

---

## Web / other

- Header logo: `dossier-logo-horizontal.svg` (transparent background, inherits page bg).
- Favicon / PWA icon: `icon-180.png` or the SVG.
- Keep clear space around the mark equal to the height of the underscore rule on all sides.

## Don't
- Don't recolor the glyph outside the palette above.
- Don't set the wordmark in title case or a non-mono font.
- Don't add drop shadows or effects to the icon glyph.
- Don't place the mark on a busy background — it wants cream, charcoal, or white.

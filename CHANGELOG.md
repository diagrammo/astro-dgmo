# Changelog

Releases before 0.7.0 are documented at
https://github.com/diagrammo/astro-dgmo/releases

## 0.7.0

Build against dgmo 0.53.0 via remark-dgmo 0.10.0 — decision #48 language
consistency. All legacy spellings still parse, so existing diagrams are
unaffected.

- `@diagrammo/dgmo` → `^0.53.0`, `remark-dgmo` → `^0.10.0`.
- Embed toolbar moved from the diagram's top-right to its bottom-right, so it
  no longer collides with a host's own top-right chart chrome.
- Behavior changes inherited from dgmo 0.53.0: boxes-and-lines prints values by
  default, tech-radar renders its blip listing by default, and treemap colors
  by heat before tags.

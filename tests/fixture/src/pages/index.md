---
title: astro-dgmo fixture
layout: ../layouts/Base.astro
---

# astro-dgmo fixture

A minimal Astro 6 site for `astro-dgmo` + `remark-dgmo`. Copy
`astro.config.mjs` in the parent directory as a template for your own
site.

Toggle the button (top right) to flip `[data-theme="dark"]` on `<html>`.
Plain blocks under `colorMode: 'auto'` should swap palette; the
per-block override at the bottom is locked to light and shouldn't
change.

## Plain block (colorMode auto — dual-render)

```dgmo
sequence
Browser -GET /-> Server
Server -200 OK-> Browser
```

## Colored sequence diagram with tags

```dgmo
sequence Treasure Hunt App
active-tag Layer

tag Layer as l
  Frontend teal
  Backend purple
  Data red

User is an actor
WebApp | l: Frontend
API | l: Backend
MapDB is a database | l: Data

User -Search nearby loot-> WebApp
WebApp -GET /loot?lat&lon-> API
API -SELECT-> MapDB
MapDB -rows-> API
API -200 OK-> WebApp
WebApp -render markers-> User
```

## Showcase mode

```dgmo showcase title="Login flow"
sequence
Client -POST /login-> API
API -validate-> Auth
Auth -JWT-> API
API -200 OK-> Client
```

## Per-block override — single-render light, catppuccin palette

```dgmo palette=catppuccin colorMode=light
pie
TypeScript  45
Python       30
Rust         25
```

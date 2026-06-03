# Friedman's Curve Builder

A React app for generating a Friedman-style labor curve.

- Cervical dilation plots in blue on the left 0-10 cm axis.
- Station plots in red on the right -5 to +5 axis.
- Observation time is calculated from the selected start time.
- The chart can be printed or downloaded as SVG/PNG.

## Local Development

```bash
npm install
npm run dev
```

## Deployment

This repository deploys to GitHub Pages through `.github/workflows/deploy.yml`.
After a push to `main`, the app will be published at:

```text
https://micahnut.github.io/friedmans-curve/
```

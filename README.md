# Friedman's Curve Builder

A React/Vite app for building, reviewing, saving, restoring, printing, and exporting a Friedman-style labor curve.

The chart plots:

- Cervical dilation as the blue line on the left 0-10 cm axis.
- Fetal station as the red line on the right -5 to +5 axis.
- Timeline notes as in-chart callouts with connector lines to the related graph time or plotted point.
- Longer clinical annotations as readable callout boxes inside the graph.
- Optional dotted event markers at selected timestamps.
- Oxytocin activity inferred from timeline notes.
- Patient details, final diagnosis, and resident name on the full chart export.

The live chart no longer shows the old blue/red text legend because the latest-observation summary already identifies each series.

## User Guide

See [GUIDE.md](GUIDE.md) for the full workflow, including patient setup, observations, notes, annotations, saved charts, chart-file upload/restore, and export options.

## Export Behavior

Use the `Export` menu for output:

- `Presentation PNG (16:9)`: creates a 2560 x 1440 slide-ready image focused on the graph.
- `Full chart PNG`: creates a complete chart image with patient details, final diagnosis, and resident name.
- `Print chart`: prints the cleaned full chart.
- `Chart data file`: downloads a `.friedman.json` file that can be uploaded later from the `Manage` menu to restore the chart data.

Exports remove redundant chart legend text. Oxytocin highlights are simplified in exports to `OXYTOCIN`; the live chart still shows the active/start/stop details for easier editing.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

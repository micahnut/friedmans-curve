# Friedman's Curve Builder

A React app for generating and exporting a Friedman-style labor curve.

The chart plots:

- Cervical dilation in blue on the left 0-10 cm axis.
- Fetal station in red on the right -5 to +5 axis.
- Observation notes above the graph.
- Optional dotted event markers at selected timestamps.
- Patient details, final diagnosis, resident name, and a small credit line.

## How To Use

Open the app and fill in the Patient panel first.

- `Name`: patient name. Long names wrap automatically on the chart.
- `Age`: patient age.
- `OB Score`: obstetric score, such as `G1P0`.
- `AOG`: age of gestation. Long text wraps automatically.
- `Date`: chart date.
- `Start Time`: the baseline time for hour `0` on the graph.
- `Final Diagnosis`: use this for the final diagnosis text. Long text wraps on the chart.
- `Resident`: resident or clinician name.

The app saves your work in the browser automatically.

## Entering Observations

Use the Observations table to plot each exam or event.

- `Time`: the clock time of the observation.
- `Day`: use `0` for the start date, `1` for the next day, `2` for the day after that, and so on.
- `Hour`: calculated automatically from Start Time, Time, and Day.
- `Cervix`: cervical dilation from `0` to `10`.
- `Station`: fetal station from `-5` to `5`.
- `Event marker`: check this to draw a dotted vertical timestamp line.
- `Note`: event note, medication, intervention, or other label.

Click `Add` to create a new observation row. Click `X` to remove a row.

## Event Markers

The `Event marker` checkbox draws a dotted vertical line at that row's timestamp.

Use it when you want to mark an event time clearly, like:

- Admission
- Oxytocin started or changed
- Medication given
- Procedure or intervention
- Mount
- Baby out

The event marker can be used even if the row has only a time and note.

## Notes

Notes appear above the graph as vertical labels. Long notes wrap into small vertical columns. If multiple notes are close together, the app shifts them into staggered lanes and draws a connector line back to the exact timestamp.

## Going Beyond One Day

If labor continues past midnight or past the original 18-hour graph:

1. Enter the clock time normally.
2. Set `Day` to `1` for next day, `2` for the following day, etc.
3. The graph expands horizontally and can be scrolled if needed.

Example:

- Start Time: `07:30`
- Observation Time: `08:30`
- Day: `1`

This plots the observation at hour `25`.

## Buttons

The top-right buttons are:

- Print: opens the browser print dialog.
- Export chart: choose PNG (best for sharing) or SVG (best for editing).

The chart is designed to print in landscape format and fit on A4 or short bond paper.

## Sample Data

Click `Load Sample` to load example patient details and observations. Sample data includes plotted cervix/station points, notes, and checked event markers for selected events.

Click `Clear` to remove all observation rows.

## Local Development

```bash
npm install
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

## Deployment

This repository deploys to GitHub Pages through `.github/workflows/deploy.yml`.
After a push to `main`, the app will be published at:

```text
https://micahnut.github.io/friedmans-curve/
```

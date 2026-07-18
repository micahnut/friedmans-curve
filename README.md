# Friedman's Curve Builder

A React/Vite app for building, reviewing, printing, and exporting a Friedman-style labor curve.

The chart plots:

- Cervical dilation in blue on the left 0-10 cm axis.
- Fetal station in red on the right -5 to +5 axis.
- Timeline notes above the graph with connector lines to the exact timestamp.
- Longer chart annotations as callout boxes inside the graph.
- Optional dotted event markers at selected timestamps.
- Patient details, final diagnosis, and resident name on the full chart export.

## How To Use

Open the app and fill in the Patient panel first.

- `Name`: patient name. Long names wrap automatically on the chart.
- `Age`: patient age.
- `OB Score`: obstetric score, such as `G1P0`.
- `AOG`: age of gestation. Long text wraps automatically.
- `Date`: chart date.
- `Start Time`: the baseline time for hour `0` on the graph.
- `Final Diagnosis`: footer text shown on the full chart export.
- `Resident`: resident or clinician name shown on the full chart export.

The app saves the active chart in the browser automatically. Use `Save` to keep up to 5 named chart snapshots, and `Restore` to bring back a saved chart later on the same device and browser.

## Entering Observations

Use the Add form to plot each exam or event.

- `Time`: the clock time of the observation.
- `Day`: use `0` for the start date, `1` for the next day, `2` for the day after that, and so on.
- `Hour`: calculated automatically from Start Time, Time, and Day.
- `Cervix`: cervical dilation from `0` to `10`.
- `Station`: fetal station from `-5` to `5`.
- `Event marker`: draws a dotted vertical timestamp line.
- `Timeline note`: a concise label such as admission, medication, mount, or baby out.

Recorded observations appear as cards. Use `Edit` to reopen the full observation form, or the trash button to delete a record.

## Timeline Notes And Event Markers

Timeline notes appear above the graph. Long notes wrap into larger readable labels, and nearby notes are staggered into lanes to reduce overlap.

Use the `Event marker` checkbox when you want a dotted line for a specific time, such as:

- Admission
- Oxytocin started, titrated, paused, or stopped
- Medication given
- Procedure or intervention
- Mount
- Baby out

The event marker can be used even when the row only has a time and note.

## Chart Annotations

Use Chart annotations for longer clinical narratives that belong inside the graph.

- Attach the annotation to a recorded observation.
- Connect it to either the cervical dilation or station point.
- Choose a type: clinical note, medication, intervention, or outcome.
- Edit, close, or delete annotations after adding them.

Annotations and note text are centered inside their callout boxes on the chart and exports.

## Oxytocin Notes

The chart detects oxytocin activity from timeline notes.

- Notes containing `oxy` or `oxytocin` start or continue an amber activity highlight.
- Notes such as `oxy stopped`, `oxytocin stopped`, `held`, `paused`, or `discontinued` stop the activity highlight.
- If no stop note exists, the highlight continues to the latest plotted clinical entry and is labeled as active.

## Chart View

The live chart is fitted to the available page width. Tap or click the chart to open the expanded viewer.

- Pinch to zoom on mobile.
- Double-tap or double-click to toggle zoom.
- Use `Reset zoom` to return to the fitted chart.

On iPad and mobile, the bottom navigation keeps the rounded segmented design and jumps between Chart, Add, Annotate, Records, and Patient.

## Export And Print

Use the Export menu for output.

- `Print chart`: prints the same cleaned content as the full chart image export.
- `Presentation PNG (16:9)`: creates a 2560 x 1440 slide-ready image focused on the graph. It hides the document-style patient header, diagnosis, and resident footer.
- `Full chart PNG`: creates a complete chart image with patient details, final diagnosis, and resident name.
- `SVG`: exports the editable live chart SVG.

Photo-style exports and print use the app font, hide the small clock-time labels, and enlarge chart text so labels stay readable while fitting their containers.

## Going Beyond One Day

If labor continues past midnight or past the original 18-hour graph:

1. Enter the clock time normally.
2. Set `Day` to `1` for next day, `2` for the following day, etc.
3. The graph expands horizontally when needed.

Example:

- Start Time: `07:30`
- Observation Time: `08:30`
- Day: `1`

This plots the observation at hour `25`.

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

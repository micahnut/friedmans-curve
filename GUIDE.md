# Friedman's Curve Builder Guide

This guide explains the current charting workflow and the main UI decisions.

## 1. Set Up The Patient

Fill in the Patient panel before adding observations.

- `Name`: patient name.
- `Age`: patient age.
- `OB Score`: obstetric score, such as `G1P0`.
- `AOG`: age of gestation.
- `Date`: chart date.
- `Start Time`: the baseline time for hour `0` on the graph.
- `Final Diagnosis`: footer text shown on the full chart export.
- `Resident`: resident or clinician name shown on the full chart export.

The latest-observation summary above the chart identifies the current cervical dilation and station values, so the chart itself does not include a separate blue/red legend.

## 2. Add Observations

Use the New observation form for exams and events.

- `Time`: clock time of the observation.
- `Day`: `0` for the start date, `1` for the next day, and so on.
- `Hour`: calculated automatically from Start Time, Time, and Day.
- `Cervix`: cervical dilation from `0` to `10`.
- `Station`: fetal station from `-5` to `5`.
- `Event marker`: draws a dotted vertical timestamp line.
- `Timeline note`: concise event text such as admission, medication, mount, or baby out.

Recorded observations appear as cards. Use `Edit` to reopen a record, or the trash button to delete it.

## 3. Use Timeline Notes

Timeline notes are placed inside the graph as callout boxes with connector lines.

- If the observation has cervical dilation, the note connects to the blue plotted point.
- If it has station but no dilation, the note connects to the red station point.
- If it has no dilation or station, the note stays at its real chart hour and connects to that timestamp.
- If the first note-only entry is exactly at the chart start time, it can anchor at the origin, like the sample Friedman curve.

The layout tries to keep notes inside open chart space and away from the plotted blue/red lines. When the chart is crowded, it chooses the clearest available callout position.

## 4. Add Chart Annotations

Use Chart annotations for longer clinical narratives.

- Attach the annotation to a recorded observation.
- Choose whether it connects to cervical dilation or station.
- Select the type: clinical note, medication, intervention, or outcome.
- Edit or delete annotations after adding them.

Annotations also use connector lines and are placed to avoid covering plotted data as much as possible.

## 5. Oxytocin Notes

The chart detects oxytocin activity from timeline notes.

- Notes containing `oxy` or `oxytocin` start or continue an amber oxytocin highlight.
- Notes such as `oxy stopped`, `oxytocin stopped`, `held`, `paused`, or `discontinued` stop the highlight.
- If no stop note exists, the live chart labels the highlight as active and shows the start time.

Exports simplify this label to `OXYTOCIN` only, while the live chart keeps the extra detail for editing.

## 6. Manage Charts

Use the `Manage` menu for chart actions:

- `Save in browser`: keeps a named snapshot on the current device and browser.
- `Upload chart file`: restores a previously exported `.friedman.json` chart file.
- `Load sample`: loads the demo patient chart.
- `Reset chart`: clears the current chart.
- Saved charts list: restore or delete browser-saved charts.

Browser saves are device/browser-specific. The chart data file is better when you need to move or retrieve a chart later.

## 7. Export

Use the `Export` menu for final output.

- `Presentation PNG (16:9)`: creates a slide-ready chart image.
- `Full chart PNG`: exports the complete chart with patient details and footer.
- `Print chart`: prints the cleaned full chart.
- `Chart data file`: downloads a `.friedman.json` file for later upload and retrieval.

Exports remove redundant blue/red legend labels and simplify oxytocin text to keep the output neat.

## 8. Chart Viewer

Click or tap the chart to open the expanded viewer.

- Pinch to zoom on touch devices.
- Double-tap or double-click to toggle zoom.
- Use `Reset zoom` to return to the fitted chart.

## 9. Multi-Day Charting

If labor continues past midnight or beyond the original chart width:

1. Enter the clock time normally.
2. Set `Day` to `1` for next day, `2` for the following day, and so on.
3. The graph expands horizontally when needed.

Example:

- Start Time: `07:30`
- Observation Time: `08:30`
- Day: `1`

This plots the observation at hour `25`.

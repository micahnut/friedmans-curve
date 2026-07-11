import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "friedmans-curve-builder-v2";
const SAVED_CHARTS_KEY = "friedmans-curve-saved-charts-v1";
const MAX_SAVED_CHARTS = 5;
// Oxytocin infusion tracking is intentionally hidden for now.
// Change this to true when the feature is ready to return to the UI.
const SHOW_OXYTOCIN_FEATURE = false;
const STATION_VALUES = Array.from({ length: 11 }, (_, index) => index - 5);
const DAY_VALUES = Array.from({ length: 8 }, (_, index) => index);
const NOTE_LABEL_MAX_CHARS = 23;
const NOTE_LABEL_MAX_WIDTH = 176;
const NOTE_LABEL_LANE_LIMIT = 5;
const NOTE_LABEL_LINE_HEIGHT = 12;
const NOTE_LABEL_GAP = 8;
const PATIENT_FIELDS = [
  "patientName",
  "patientAge",
  "patientObScore",
  "patientAog",
  "patientDate",
  "startTime",
  "finalDiagnosis",
  "residentName"
];

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `obs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createObservation(values = {}) {
  return {
    id: values.id || makeId(),
    time: values.time || "",
    dayOffset: values.dayOffset ?? "",
    dilation: values.dilation ?? "",
    station: values.station ?? "",
    guideLine: values.guideLine ?? false,
    note: values.note || ""
  };
}

function createObservationDraft(values = {}) {
  return {
    time: values.time || "",
    dayOffset: values.dayOffset ?? "",
    dilation: values.dilation ?? "",
    station: values.station ?? "",
    guideLine: values.guideLine ?? false,
    note: values.note || ""
  };
}

function createChartAnnotation(values = {}) {
  return {
    id: values.id || makeId(),
    observationId: values.observationId || "",
    time: values.time || "",
    dayOffset: values.dayOffset ?? "0",
    targetSeries: values.targetSeries || "dilation",
    type: values.type || "clinical",
    text: values.text || ""
  };
}

function createAnnotationDraft(values = {}) {
  return {
    observationId: values.observationId || "",
    time: values.time || "",
    dayOffset: values.dayOffset ?? "0",
    targetSeries: values.targetSeries || "dilation",
    type: values.type || "clinical",
    text: values.text || ""
  };
}

function annotationTypeLabel(type) {
  if (type === "clinical") return "Clinical note";
  if (type === "outcome") return "Outcome / decision";
  return type ? `${type[0].toUpperCase()}${type.slice(1)}` : "Clinical note";
}

function createOxytocinEvent(values = {}) {
  return {
    id: values.id || makeId(),
    time: values.time || "",
    dayOffset: values.dayOffset ?? "0",
    action: values.action || "start",
    rate: values.rate ?? "",
    unit: values.unit || "mU/min",
    note: values.note || ""
  };
}

function createOxytocinDraft(values = {}) {
  return {
    time: values.time || "",
    dayOffset: values.dayOffset ?? "0",
    action: values.action || "start",
    rate: values.rate ?? "",
    unit: values.unit || "mU/min",
    note: values.note || ""
  };
}

function makeDefaultState() {
  return {
    patient: {
      patientName: "",
      patientAge: "",
      patientObScore: "",
      patientAog: "",
      patientDate: todayValue(),
      startTime: "07:30",
      finalDiagnosis: "",
      residentName: ""
    },
    observations: [],
    annotations: [],
    oxytocinEvents: []
  };
}

function makeSampleState() {
  const sample = makeDefaultState();
  const observations = [
    createObservation({ time: "07:30", dayOffset: "0", dilation: "4", station: "-3", note: "Admission" }),
    createObservation({ time: "10:30", dayOffset: "0", dilation: "5", station: "-3", note: "Oxytocin started @ 8 gtts/min" }),
    createObservation({ time: "10:45", dayOffset: "0", note: "Titrated oxy to 12 gtts/min" }),
    createObservation({ time: "11:00", dayOffset: "0", note: "Titrated oxytocin to 16 gtts/min" }),
    createObservation({ time: "11:15", dayOffset: "0", note: "Titrated oxy to 20 gtts/min" }),
    createObservation({ time: "11:30", dayOffset: "0", note: "Titrated oxytocin to 24 gtts/min" }),
    createObservation({ time: "12:30", dayOffset: "0", note: "Oxy stopped due to tachysystole" }),
    createObservation({ time: "13:00", dayOffset: "0", note: "Oxytocin resumed @ 8 gtts/min" }),
    createObservation({ time: "13:15", dayOffset: "0", note: "Titrated oxy to 12 gtts/min" }),
    createObservation({ time: "13:30", dayOffset: "0", dilation: "5", station: "-3", note: "Titrated oxytocin to 16 gtts/min" }),
    createObservation({ time: "14:00", dayOffset: "0", note: "Oxytocin stopped" }),
    createObservation({ time: "15:00", dayOffset: "0", dilation: "7", station: "-2", guideLine: true, note: "evening primerose 3 caps" }),
    createObservation({ time: "15:30", dayOffset: "0", dilation: "8", station: "-1" }),
    createObservation({ time: "15:50", dayOffset: "0", dilation: "10", station: "0", note: "mount" }),
    createObservation({ time: "16:10", dayOffset: "0", dilation: "10", station: "5", guideLine: true, note: "baby out" })
  ];

  return {
    patient: {
      ...sample.patient,
      patientName: "Juana Dela Cruz",
      patientAge: "23",
      patientObScore: "G1P0",
      patientAog: "40 2/7 weeks",
      startTime: "06:00",
      finalDiagnosis:
        "1. G1P1(1001), Pregnancy Uterine, delivered by Normal Spontaneous Vaginal Delivery with mediolateral episiotomy and repair under local anesthesia, male, cephalic, term, appropriate for gestational age ",
      residentName: "Dr. Yu"
    },
    observations,
    annotations: [
      createChartAnnotation({
        observationId: observations[0].id,
        time: "07:30",
        dayOffset: "0",
        targetSeries: "dilation",
        type: "clinical",
        text: "FHR 140 bpm with moderate variability; contractions every 5–6 minutes."
      }),
      createChartAnnotation({
        observationId: observations[12].id,
        time: "15:30",
        dayOffset: "0",
        targetSeries: "dilation",
        type: "intervention",
        text: "Maternal repositioning and hydration initiated."
      })
    ],
    oxytocinEvents: [
      createOxytocinEvent({ time: "10:30", dayOffset: "0", action: "start", rate: "8", unit: "gtt/min", note: "Oxytocin started" }),
      createOxytocinEvent({ time: "10:45", dayOffset: "0", action: "increase", rate: "12", unit: "gtt/min", note: "Titrated" }),
      createOxytocinEvent({ time: "11:00", dayOffset: "0", action: "increase", rate: "16", unit: "gtt/min", note: "Titrated" }),
      createOxytocinEvent({ time: "11:15", dayOffset: "0", action: "increase", rate: "20", unit: "gtt/min", note: "Titrated" }),
      createOxytocinEvent({ time: "11:30", dayOffset: "0", action: "increase", rate: "24", unit: "gtt/min", note: "Titrated" }),
      createOxytocinEvent({ time: "12:30", dayOffset: "0", action: "stop", rate: "", unit: "gtt/min", note: "Stopped due to tachysystole" }),
      createOxytocinEvent({ time: "13:00", dayOffset: "0", action: "resume", rate: "8", unit: "gtt/min", note: "Resumed" }),
      createOxytocinEvent({ time: "13:15", dayOffset: "0", action: "increase", rate: "12", unit: "gtt/min", note: "Titrated" }),
      createOxytocinEvent({ time: "13:30", dayOffset: "0", action: "increase", rate: "16", unit: "gtt/min", note: "Titrated" }),
      createOxytocinEvent({ time: "14:00", dayOffset: "0", action: "stop", rate: "", unit: "gtt/min", note: "Stopped" })
    ]
  };
}

function isLegacySampleState(state) {
  const sample = makeSampleState();

  if (Array.isArray(state?.annotations) && state.annotations.length > 0) {
    return false;
  }

  if (
    state?.patient?.patientName !== sample.patient.patientName ||
    state?.patient?.residentName !== sample.patient.residentName ||
    state?.patient?.finalDiagnosis !== sample.patient.finalDiagnosis ||
    !Array.isArray(state?.observations) ||
    state.observations.length !== sample.observations.length
  ) {
    return false;
  }

  return state.observations.every((observation, index) => {
    const sampleObservation = sample.observations[index];
    return ["time", "dayOffset", "dilation", "station", "guideLine", "note"].every(
      (field) => observation[field] === sampleObservation[field]
    );
  });
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const defaults = makeDefaultState();

    if (!stored || !stored.patient || !Array.isArray(stored.observations)) {
      return defaults;
    }

    // Older builds persisted the bundled demo record. Treat that record as
    // uninitialized so a first visit opens with an empty chart.
    if (isLegacySampleState(stored)) {
      localStorage.removeItem(STORAGE_KEY);
      return defaults;
    }

    const observations = stored.observations.map(createObservation);
    const annotations = Array.isArray(stored.annotations) ? stored.annotations.map(createChartAnnotation) : [];

    return {
      patient: { ...defaults.patient, ...stored.patient },
      observations,
      annotations: pruneAnnotationsForObservations(annotations, observations),
      oxytocinEvents: Array.isArray(stored.oxytocinEvents) ? stored.oxytocinEvents.map(createOxytocinEvent) : []
    };
  } catch {
    return makeDefaultState();
  }
}

function normalizeChartState(values = {}) {
  const defaults = makeDefaultState();
  const observations = Array.isArray(values.observations) ? values.observations.map(createObservation) : [];
  const annotations = Array.isArray(values.annotations) ? values.annotations.map(createChartAnnotation) : [];

  return {
    patient: { ...defaults.patient, ...(values.patient || {}) },
    observations,
    annotations: pruneAnnotationsForObservations(annotations, observations),
    oxytocinEvents: Array.isArray(values.oxytocinEvents) ? values.oxytocinEvents.map(createOxytocinEvent) : []
  };
}

function pruneAnnotationsForObservations(annotations, observations) {
  const observationIds = new Set(observations.map((observation) => observation.id));

  return annotations.filter((annotation) => annotation.observationId && observationIds.has(annotation.observationId));
}

function chartSaveLabel(chartState) {
  const name = chartState.patient.patientName?.trim() || "Untitled patient";
  const date = chartState.patient.patientDate ? formatDisplayDate(chartState.patient.patientDate) : "No date";

  return `${name} · ${date}`;
}

function formatSavedTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown save time";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function createSavedChart(chartState) {
  const savedState = normalizeChartState(chartState);
  const savedAt = new Date().toISOString();

  return {
    id: makeId(),
    savedAt,
    label: chartSaveLabel(savedState),
    state: savedState
  };
}

function loadSavedCharts() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVED_CHARTS_KEY));

    if (!Array.isArray(stored)) return [];

    return stored
      .filter((chart) => chart && chart.id && chart.state)
      .map((chart) => {
        const state = normalizeChartState(chart.state);

        return {
          id: chart.id,
          savedAt: chart.savedAt || new Date(0).toISOString(),
          label: chart.label || chartSaveLabel(state),
          state
        };
      })
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, MAX_SAVED_CHARTS);
  } catch {
    return [];
  }
}

function minutesFromTime(value) {
  if (!value || !value.includes(":")) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function hourFromStart(time, startTime, dayOffset = "") {
  const start = minutesFromTime(startTime);
  let current = minutesFromTime(time);

  if (start === null || current === null) return null;
  const day = numberOrNull(dayOffset);

  if (day !== null) {
    return (current - start) / 60 + Math.max(0, day) * 24;
  }

  if (current < start) current += 24 * 60;

  return (current - start) / 60;
}

function dayOffsetFromStartHour(hour, startTime) {
  const start = minutesFromTime(startTime) ?? 0;
  return Math.floor((start + hour * 60) / (24 * 60));
}

function timeFromStart(hour, startTime) {
  const start = minutesFromTime(startTime) ?? 0;
  const total = start + hour * 60;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = Math.round(normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDisplayTime(value) {
  const minutesFromMidnight = minutesFromTime(value);

  if (minutesFromMidnight === null) return value || "--";

  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatStationValue(value) {
  const station = numberOrNull(value);

  if (station === null) return "--";
  if (station > 0) return `+${station}`;
  return String(station);
}

function noteMentionsOxytocin(note = "") {
  return /\b(?:oxy|oxytocin)\b/i.test(note);
}

function noteStopsOxytocin(note = "") {
  const mentionsOxytocin = noteMentionsOxytocin(note);
  const hasStopWord = /\b(?:stop|stopped|off|discontinued|dc|d\/c|held|paused)\b/i.test(note);

  return mentionsOxytocin && hasStopWord;
}

function StationSelect({ value, onChange, ariaLabel = "Station" }) {
  return (
    <select className="station-select" value={value === "" ? "" : String(value)} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select station</option>
      {STATION_VALUES.map((station) => (
        <option key={station} value={String(station)}>
          {station > 0 ? `+${station}` : station}
        </option>
      ))}
    </select>
  );
}

function CervixSelect({ value, onChange, ariaLabel = "Cervical dilation" }) {
  return (
    <select className="cervix-select" value={value === "" ? "" : String(value)} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select cervix</option>
      {Array.from({ length: 11 }, (_, index) => (
        <option key={index} value={String(index)}>
          {index} cm
        </option>
      ))}
    </select>
  );
}

function DaySelect({ value, onChange, ariaLabel = "Day" }) {
  const currentValue = value === "" ? "0" : String(normalizedDay(value));
  const options = DAY_VALUES.includes(Number(currentValue)) ? DAY_VALUES : [...DAY_VALUES, Number(currentValue)];

  return (
    <select className="day-select" value={currentValue} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)}>
      {options.map((day) => (
        <option key={day} value={String(day)}>
          Day {day}
        </option>
      ))}
    </select>
  );
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pointStatus(observation, startTime) {
  const hour = hourFromStart(observation.time, startTime, observation.dayOffset);
  const dilation = numberOrNull(observation.dilation);
  const station = numberOrNull(observation.station);

  const validTime = hour !== null && hour >= 0;
  const validDilation = dilation === null || (dilation >= 0 && dilation <= 10);
  const validStation = station === null || (station >= -5 && station <= 5);

  return { hour, dilation, station, validTime, validDilation, validStation };
}

function normalizedDay(value) {
  const day = numberOrNull(value);
  return String(day === null ? 0 : Math.max(0, day));
}

function observationWarnings(observation, startTime, observations = [], currentId = null) {
  const status = pointStatus(observation, startTime);
  const messages = [];
  const currentMinutes = minutesFromTime(observation.time);
  const startMinutes = minutesFromTime(startTime);
  const day = numberOrNull(observation.dayOffset);
  const duplicate = observation.time
    ? observations.some((item) =>
        item.id !== currentId &&
        item.time === observation.time &&
        normalizedDay(item.dayOffset) === normalizedDay(observation.dayOffset)
      )
    : false;

  if (!observation.time) {
    messages.push("Enter a time for this observation.");
  } else if (!status.validTime && day === 0 && currentMinutes !== null && startMinutes !== null && currentMinutes < startMinutes) {
    messages.push("This time is before the chart start. Use Day 1 if it happened after midnight.");
  } else if (!status.validTime) {
    messages.push("Check the time/day. This observation cannot be plotted yet.");
  }

  if (day !== null && day < 0) {
    messages.push("Day cannot be negative.");
  }

  if (status.dilation !== null && !status.validDilation) {
    messages.push("Cervix should be between 0 and 10 cm.");
  }

  if (status.station !== null && !status.validStation) {
    messages.push("Station should be between -5 and +5.");
  }

  if (status.dilation === null && status.station === null && !observation.note.trim() && !observation.guideLine) {
    messages.push("Enter cervix, station, a note, or mark it as an event.");
  }

  if (duplicate) {
    messages.push("Another observation already uses this same time and day.");
  }

  return messages;
}

function nextObservationDraft(observations, startTime) {
  const sorted = sortedObservations(observations, startTime);
  const last = sorted.at(-1);
  const lastHour = last ? hourFromStart(last.time, startTime, last.dayOffset) : null;
  const nextHour = lastHour === null ? 0 : lastHour + 1;
  const nextTime = timeFromStart(nextHour, startTime);
  const nextDayOffset = dayOffsetFromStartHour(nextHour, startTime);

  return createObservationDraft({
    time: nextTime,
    dayOffset: nextDayOffset ? String(nextDayOffset) : "0"
  });
}

function sortedObservations(observations, startTime) {
  return [...observations].sort((a, b) => {
    const hourA = hourFromStart(a.time, startTime, a.dayOffset);
    const hourB = hourFromStart(b.time, startTime, b.dayOffset);
    return (hourA ?? 99) - (hourB ?? 99);
  });
}

function sortedOxytocinEvents(events, startTime) {
  return [...events].sort((a, b) => {
    const hourA = hourFromStart(a.time, startTime, a.dayOffset);
    const hourB = hourFromStart(b.time, startTime, b.dayOffset);
    return (hourA ?? 999) - (hourB ?? 999);
  });
}

function oxytocinActionLabel(action) {
  return {
    start: "Started",
    increase: "Increased",
    decrease: "Decreased",
    stop: "Stopped",
    resume: "Resumed"
  }[action] || action;
}

function oxytocinEventWarnings(draft, events, startTime) {
  const messages = [];
  const hour = hourFromStart(draft.time, startTime, draft.dayOffset);
  const rateRequired = draft.action !== "stop";

  if (!draft.time) messages.push("Enter the event time.");
  if (hour !== null && hour < 0) messages.push("This event is before the chart start. Check the day.");
  if (rateRequired && draft.rate === "") messages.push("Enter the documented infusion rate.");
  if (numberOrNull(draft.rate) !== null && Number(draft.rate) < 0) messages.push("Rate cannot be negative.");

  if (draft.time && events.some((event) =>
    event.time === draft.time && normalizedDay(event.dayOffset) === normalizedDay(draft.dayOffset)
  )) {
    messages.push("An oxytocin event already exists at this time and day.");
  }

  if (hour !== null && hour >= 0) {
    let running = false;
    sortedOxytocinEvents(events, startTime).forEach((event) => {
      const eventHour = hourFromStart(event.time, startTime, event.dayOffset);
      if (eventHour === null || eventHour >= hour) return;
      running = event.action !== "stop";
    });

    if (draft.action === "start" && running) messages.push("The infusion is already active. Choose Increase or Decrease rate.");
    if (["increase", "decrease"].includes(draft.action) && !running) messages.push("Start or resume the infusion before changing its rate.");
    if (draft.action === "stop" && !running) messages.push("The infusion is not active at this time.");
    if (draft.action === "resume" && running) messages.push("The infusion is already active. Choose a rate change instead.");
  }

  return messages;
}

function clinicalSummary(observations, startTime) {
  const validObservations = sortedObservations(observations, startTime)
    .map((observation) => ({
      observation,
      status: pointStatus(observation, startTime)
    }))
    .filter(({ status }) => status.validTime && status.validDilation && status.validStation && status.hour !== null);
  const latest = validObservations.at(-1);

  if (!latest) {
    return {
      hasData: false,
      primary: [
        ["Start", formatDisplayTime(startTime), "latest"],
        ["Latest", "--", "latest"],
        ["Cervix", "--", "dilation"],
        ["Station", "--", "station"]
      ]
    };
  }

  const latestDilation = [...validObservations].reverse().find(({ status }) => status.dilation !== null)?.status.dilation;
  const latestStation = [...validObservations].reverse().find(({ status }) => status.station !== null)?.status.station;
  const latestDilationText = latestDilation === undefined ? "--" : `${latestDilation} cm`;
  const latestStationText = latestStation === undefined ? "--" : `${latestStation > 0 ? "+" : ""}${latestStation}`;

  return {
    hasData: true,
    primary: [
      ["Start", formatDisplayTime(startTime), "latest"],
      ["Latest", formatDisplayTime(latest.observation.time), "latest"],
      ["Cervix", latestDilationText, "dilation"],
      ["Station", latestStationText, "station"]
    ]
  };
}

function buildSvgData(patient, observations, annotations = [], oxytocinEvents = []) {
  const baseWidth = 1200;
  const left = 92;
  const noteObservations = observations.filter((observation) => observation.note.trim());
  const desiredGridHeight = 508;
  const hourWidth = 57;
  const maxObservationHour = Math.max(
    18,
    ...observations.map((observation) => {
      const hour = hourFromStart(observation.time, patient.startTime, observation.dayOffset);
      return hour !== null && hour >= 0 ? Math.ceil(hour) : 0;
    }),
    ...annotations.map((annotation) => {
      const hour = hourFromStart(annotation.time, patient.startTime, annotation.dayOffset);
      return hour !== null && hour >= 0 ? Math.ceil(hour) : 0;
    }),
    ...oxytocinEvents.map((event) => {
      const hour = hourFromStart(event.time, patient.startTime, event.dayOffset);
      return hour !== null && hour >= 0 ? Math.ceil(hour) : 0;
    })
  );
  const maxHour = Math.max(18, maxObservationHour);
  const width = Math.max(baseWidth, left + maxHour * hourWidth + 80);
  const horizontalGrid = {
    left,
    right: width - 80
  };
  const horizontalGridWidth = horizontalGrid.right - horizontalGrid.left;
  const xForHour = (hour) => horizontalGrid.left + (clamp(hour, 0, maxHour) / maxHour) * horizontalGridWidth;
  const noteLayoutMetrics = positionNoteLabels(
    prepareNoteLabels(sortedObservations(observations, patient.startTime).flatMap((observation) => {
      const status = pointStatus(observation, patient.startTime);

      if (!status.validTime || !status.validDilation || !status.validStation || status.hour === null || !observation.note.trim()) {
        return [];
      }

      return [{
        x: xForHour(status.hour),
        time: formatDisplayTime(observation.time),
        text: observation.note.trim()
      }];
    })),
    horizontalGrid
  );
  const top = noteObservations.length
    ? Math.max(226, 154 + noteLayoutMetrics.usedLaneCount * noteLayoutMetrics.laneStride)
    : 226;
  const bottom = top + desiredGridHeight;
  const height = bottom + 116;
  const grid = {
    left,
    top,
    right: horizontalGrid.right,
    bottom
  };
  const gridHeight = grid.bottom - grid.top;
  const yForDilation = (dilation) => grid.bottom - (clamp(dilation, 0, 10) / 10) * gridHeight;
  const yForStation = (station) => grid.top + ((clamp(station, -5, 5) + 5) / 10) * gridHeight;
  const dilationPoints = [];
  const stationPoints = [];
  const guideLines = [];
  const notes = [];
  const chartAnnotations = [];
  const oxytocinNoteHighlights = [];
  const oxytocinNoteEvents = [];
  let validCount = 0;
  let warningCount = 0;

  sortedObservations(observations, patient.startTime).forEach((observation) => {
    const status = pointStatus(observation, patient.startTime);

    if (!status.validTime || !status.validDilation || !status.validStation) {
      warningCount += 1;
      return;
    }

    if (status.hour === null) return;
    validCount += 1;

    if (observation.guideLine) {
      guideLines.push({
        x: xForHour(status.hour),
        hour: status.hour
      });
    }

    if (status.dilation !== null) {
      dilationPoints.push({
        observationId: observation.id,
        x: xForHour(status.hour),
        y: yForDilation(status.dilation),
        hour: status.hour,
        value: status.dilation
      });
    }

    if (status.station !== null) {
      stationPoints.push({
        observationId: observation.id,
        x: xForHour(status.hour),
        y: yForStation(status.station),
        hour: status.hour,
        value: status.station
      });
    }

    if (observation.note.trim()) {
      const isOxytocinNote = noteMentionsOxytocin(observation.note);
      const isOxytocinStopNote = noteStopsOxytocin(observation.note);

      notes.push({
        x: xForHour(status.hour),
        hour: status.hour,
        time: formatDisplayTime(observation.time),
        text: observation.note.trim(),
        isOxytocinNote
      });

      if (isOxytocinNote) {
        oxytocinNoteEvents.push({
          hour: status.hour,
          timeLabel: formatDisplayTime(observation.time),
          isStop: isOxytocinStopNote
        });
      }
    }
  });

  annotations.forEach((annotation, index) => {
    const linkedObservation = observations.find((observation) => observation.id === annotation.observationId);
    const annotationTime = linkedObservation?.time || annotation.time;
    const annotationDay = linkedObservation?.dayOffset ?? annotation.dayOffset;
    const hour = hourFromStart(annotationTime, patient.startTime, annotationDay);

    if (hour === null || hour < 0 || !annotation.text.trim()) return;

    const preferredPoints = annotation.targetSeries === "station" ? stationPoints : dilationPoints;
    const fallbackPoints = annotation.targetSeries === "station" ? dilationPoints : stationPoints;
    const preferredPoint = preferredPoints.find((point) => point.observationId === annotation.observationId)
      || preferredPoints.find((point) => Math.abs(point.hour - hour) < 0.01);
    const fallbackPoint = fallbackPoints.find((point) => point.observationId === annotation.observationId)
      || fallbackPoints.find((point) => Math.abs(point.hour - hour) < 0.01);
    const anchorPoint = preferredPoint || fallbackPoint;

    chartAnnotations.push({
      id: annotation.id,
      x: anchorPoint?.x ?? xForHour(hour),
      anchorY: anchorPoint?.y ?? grid.top + gridHeight * (0.42 + (index % 2) * 0.18),
      time: formatDisplayTime(annotationTime),
      targetSeries: annotation.targetSeries || "dilation",
      type: annotation.type || "clinical",
      text: annotation.text.trim()
    });
  });

  const oxytocinBands = [];
  const oxytocinChanges = [];
  const validOxytocinEvents = sortedOxytocinEvents(oxytocinEvents, patient.startTime)
    .map((event) => ({
      ...event,
      hour: hourFromStart(event.time, patient.startTime, event.dayOffset)
    }))
    .filter((event) => event.hour !== null && event.hour >= 0);
  const latestClinicalHour = Math.max(
    0,
    ...dilationPoints.map((point) => point.hour),
    ...stationPoints.map((point) => point.hour),
    ...guideLines.map((line) => line.hour),
    ...notes.map((note) => note.hour)
  );

  let noteInfusionStart = null;
  let noteInfusionStartLabel = "";

  oxytocinNoteEvents.forEach((event) => {
    if (event.isStop) {
      if (noteInfusionStart !== null && event.hour > noteInfusionStart) {
        oxytocinNoteHighlights.push({
          startHour: noteInfusionStart,
          endHour: event.hour,
          x1: xForHour(noteInfusionStart),
          x2: xForHour(event.hour),
          startLabel: noteInfusionStartLabel,
          endLabel: event.timeLabel,
          ended: true
        });
      }

      noteInfusionStart = null;
      noteInfusionStartLabel = "";
      return;
    }

    if (noteInfusionStart === null) {
      noteInfusionStart = event.hour;
      noteInfusionStartLabel = event.timeLabel;
    }
  });

  if (noteInfusionStart !== null) {
    const endHour = Math.max(noteInfusionStart + 0.5, latestClinicalHour);

    oxytocinNoteHighlights.push({
      startHour: noteInfusionStart,
      endHour,
      x1: xForHour(noteInfusionStart),
      x2: xForHour(endHour),
      startLabel: noteInfusionStartLabel,
      endLabel: "",
      ended: false
    });
  }

  let infusionRunning = false;
  let currentRate = "";
  let currentUnit = "mU/min";
  let intervalStart = null;

  validOxytocinEvents.forEach((event) => {
    if (infusionRunning && intervalStart !== null && event.hour > intervalStart) {
      oxytocinBands.push({
        startHour: intervalStart,
        endHour: event.hour,
        x1: xForHour(intervalStart),
        x2: xForHour(event.hour),
        rate: currentRate,
        unit: currentUnit
      });
    }

    oxytocinChanges.push({
      ...event,
      x: xForHour(event.hour),
      timeLabel: formatDisplayTime(event.time)
    });

    if (event.action === "stop") {
      infusionRunning = false;
      currentRate = "";
    } else {
      infusionRunning = true;
      currentRate = event.rate;
      currentUnit = event.unit;
    }

    intervalStart = event.hour;
  });

  if (infusionRunning && intervalStart !== null) {
    const endHour = Math.max(intervalStart + 0.5, latestClinicalHour);

    oxytocinBands.push({
      startHour: intervalStart,
      endHour,
      x1: xForHour(intervalStart),
      x2: xForHour(endHour),
      rate: currentRate,
      unit: currentUnit
    });
  }

  return {
    width,
    height,
    grid,
    xForHour,
    yForDilation,
    timeFromHour: (hour) => formatDisplayTime(timeFromStart(hour, patient.startTime)),
    maxHour,
    dilationPoints,
    stationPoints,
    guideLines,
    notes,
    annotations: chartAnnotations,
    oxytocinNoteHighlights,
    oxytocinBands,
    oxytocinChanges,
    validCount,
    warningCount
  };
}

function formatPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function wrapText(value, maxChars) {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    if (word.length > maxChars) {
      if (line) {
        lines.push(line);
        line = "";
      }

      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }

      return;
    }

    const nextLine = line ? `${line} ${word}` : word;

    if (nextLine.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function prepareNoteLabels(notes) {
  const charWidth = 5.8;

  return notes.slice(0, 16).map((note) => {
    const labelLines = wrapText(`${note.time} · ${note.text}`, NOTE_LABEL_MAX_CHARS);

    return {
      ...note,
      width: Math.min(NOTE_LABEL_MAX_WIDTH, Math.max(86, Math.max(...labelLines.map((line) => line.length)) * charWidth + 18)),
      height: labelLines.length * NOTE_LABEL_LINE_HEIGHT + 12,
      labelLines
    };
  });
}

function positionNoteLabels(preparedNotes, grid) {
  const laneCount = Math.min(NOTE_LABEL_LANE_LIMIT, Math.max(1, preparedNotes.length));
  const laneStride = Math.max(...preparedNotes.map((note) => note.height), 0) + NOTE_LABEL_GAP;
  const lanes = Array.from({ length: laneCount }, () => ({ endX: grid.left - NOTE_LABEL_GAP }));
  let highestUsedLane = -1;
  const layouts = preparedNotes.map((note) => {
    const labelX = Math.max(
      grid.left + 4,
      Math.min(note.x - note.width / 2, grid.right - note.width - 4)
    );
    const candidates = lanes.map((lane, laneIndex) => ({
      laneIndex,
      fits: labelX >= lane.endX + NOTE_LABEL_GAP
    }));
    const placement = candidates.find((candidate) => candidate.fits)
      || candidates.reduce((best, candidate) => (
        lanes[candidate.laneIndex].endX < lanes[best.laneIndex].endX ? candidate : best
      ));
    const laneIndex = placement.laneIndex;

    lanes[laneIndex].endX = labelX + note.width;
    highestUsedLane = Math.max(highestUsedLane, laneIndex);

    return {
      ...note,
      labelX,
      laneIndex
    };
  });

  return {
    layouts,
    laneStride,
    usedLaneCount: highestUsedLane + 1
  };
}

function wrapHeaderValue(value, maxChars, maxLines = 5) {
  const lines = wrapText(value || "", maxChars);

  if (lines.length <= maxLines) return lines;

  const visibleLines = lines.slice(0, maxLines);
  const lastLine = visibleLines.at(-1) || "";
  visibleLines[visibleLines.length - 1] = `${lastLine.slice(0, Math.max(0, maxChars - 3))}...`;
  return visibleLines;
}

function formatDisplayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function Chart({ patient, observations, annotations, oxytocinEvents, chartRef, chartId = "curveChart" }) {
  const data = useMemo(
    () => buildSvgData(patient, observations, annotations, oxytocinEvents),
    [patient, observations, annotations, oxytocinEvents]
  );
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const internalChartRef = useRef(null);
  const activeChartRef = chartRef || internalChartRef;
  const { width, grid } = data;
  const info = [
    ["Name", patient.patientName, 3.2],
    ["Age", patient.patientAge, 1.15],
    ["OB score", patient.patientObScore, 2.05],
    ["AOG", patient.patientAog, 2.3],
    ["Date", formatDisplayDate(patient.patientDate), 1.95]
  ];
  const headerLineHeight = 16;
  const headerLabelWidths = {
    Name: 62,
    Age: 54,
    "OB score": 82,
    AOG: 58,
    Date: 58
  };
  const headerGap = 18;
  const headerWeight = info.reduce((total, [, , weight]) => total + weight, 0);
  const headerWidth = grid.right - grid.left;
  let headerCursorX = grid.left;
  const headerItems = info.map(([label, value, weight]) => {
    const slotWidth = (headerWidth * weight) / headerWeight;
    const labelWidth = headerLabelWidths[label] || 70;
    const valueX = headerCursorX + labelWidth;
    const lineEndX = headerCursorX + slotWidth - headerGap;
    const maxChars = Math.max(5, Math.floor((lineEndX - valueX) / 7.4));
    const item = {
      label,
      lines: wrapHeaderValue(value, maxChars, 3),
      x: headerCursorX,
      valueX,
      lineEndX
    };
    headerCursorX += slotWidth;

    return {
      ...item
    };
  });
  const maxHeaderLines = Math.max(...headerItems.map((item) => item.lines.length));
  const diagnosisText = patient.finalDiagnosis ? `Final Diagnosis: ${patient.finalDiagnosis}` : "Final Diagnosis:";
  const diagnosisLines = wrapText(diagnosisText, patient.residentName ? 102 : 132);
  const hasFooter = Boolean(patient.finalDiagnosis || patient.residentName);
  const gridCenterY = (grid.top + grid.bottom) / 2;
  const stationLabelX = grid.right + 54;
  const legendY = 124 + (maxHeaderLines - 1) * headerLineHeight;
  const timeLabelY = grid.bottom + 70;
  const diagnosisY = grid.bottom + 90;
  const diagnosisLineHeight = 17;
  const residentY = diagnosisY + Math.max(diagnosisLines.length, 1) * diagnosisLineHeight + 2;
  const height = hasFooter ? Math.max(data.height, residentY + 24) : data.height;
  const presentationTop = Math.max(0, data.notes.length ? Math.min(legendY - 6, grid.top - 150) : legendY - 6);
  const presentationBox = {
    x: Math.max(0, grid.left - 70),
    y: presentationTop,
    width: Math.min(width, grid.right + 72) - Math.max(0, grid.left - 70),
    height: Math.min(height, grid.bottom + 78) - presentationTop
  };
  const showPointDetails = (point, series) => {
    const bounds = activeChartRef.current?.getBoundingClientRect();

    if (!bounds) return;

    setHoveredPoint({
      series,
      value: point.value,
      time: data.timeFromHour(point.hour),
      left: (point.x / width) * bounds.width,
      top: (point.y / height) * bounds.height,
      below: point.y / height < 0.2
    });
  };

  return (
    <div className="chart-interactive">
      <svg
        id={chartId}
        ref={activeChartRef}
        role="group"
        aria-label="Generated Friedman's curve. Hover or focus a plotted point to inspect it."
        viewBox={`0 0 ${width} ${height}`}
        data-presentation-x={presentationBox.x}
        data-presentation-y={presentationBox.y}
        data-presentation-width={presentationBox.width}
        data-presentation-height={presentationBox.height}
        data-presentation-grid-top={grid.top}
        data-presentation-grid-bottom={grid.bottom}
        xmlns="http://www.w3.org/2000/svg"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
      <rect width={width} height={height} fill="#ffffff" />
      <defs>
        <marker id="annotation-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#7b8794" />
        </marker>
      </defs>
      <text x={width / 2} y="42" textAnchor="middle" fontSize="27" fontWeight="900" fill="#111820">
        FRIEDMAN&apos;S CURVE
      </text>
      <text x={width / 2} y="65" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4f5865">
        Generated chart
      </text>

      {headerItems.map(({ label, lines, x, valueX, lineEndX }) => {
        return (
          <g key={label}>
            <text x={x} y="105" fontSize="14" fontWeight="900" fill="#1c1f24">
              {label}:
            </text>
            <text x={valueX} y="105" fontSize="15" fontWeight="700" fill="#1c1f24">
              {lines.map((line, index) => (
                <tspan key={`${line}-${index}`} x={valueX} dy={index === 0 ? 0 : headerLineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
            <line x1={valueX - 2} y1="110" x2={lineEndX} y2="110" stroke="#1c1f24" strokeWidth="1.5" />
          </g>
        );
      })}

      <OxytocinNoteHighlights highlights={data.oxytocinNoteHighlights} grid={grid} />
      {SHOW_OXYTOCIN_FEATURE && <OxytocinBands bands={data.oxytocinBands} grid={grid} />}

      {Array.from({ length: data.maxHour + 1 }, (_, hour) => {
        const x = data.xForHour(hour);
        const isEdge = hour === 0 || hour === data.maxHour;

        return (
          <g key={`hour-${hour}`}>
            <line
              x1={x}
              y1={grid.top}
              x2={x}
              y2={grid.bottom}
              stroke={isEdge ? "#14181d" : "#252b33"}
              strokeWidth={isEdge ? 2 : 1.2}
            />
            {hour > 0 && (
              <text x={x} y={grid.bottom + 34} textAnchor="middle" fontSize="16" fontWeight="900" fill="#111820">
                {hour}
              </text>
            )}
            <text x={x} y={grid.bottom + 17} textAnchor="middle" fontSize="10" fontWeight="800" fill="#4f5865">
              {data.timeFromHour(hour)}
            </text>
          </g>
        );
      })}

      {Array.from({ length: 11 }, (_, dilation) => {
        const y = data.yForDilation(dilation);
        const station = 5 - dilation;
        const isEdge = dilation === 0 || dilation === 10;

        return (
          <g key={`dilation-${dilation}`}>
            <line
              x1={grid.left}
              y1={y}
              x2={grid.right}
              y2={y}
              stroke={isEdge ? "#14181d" : "#252b33"}
              strokeWidth={isEdge ? 2 : 1.2}
            />
            <text x={grid.left - 16} y={y + 5} textAnchor="end" fontSize="16" fontWeight="900" fill="#111820">
              {dilation}
            </text>
            <text x={grid.right + 18} y={y + 5} textAnchor="start" fontSize="16" fontWeight="900" fill="#111820">
              {station}
            </text>
          </g>
        );
      })}

      <text x="36" y={gridCenterY} fontSize="15" fontWeight="900" fill="#111820" textAnchor="middle" transform={`rotate(-90 36 ${gridCenterY})`}>
        CERVICAL DILATATION (CM)
      </text>
      <text x={stationLabelX} y={gridCenterY} fontSize="15" fontWeight="900" fill="#111820" textAnchor="middle" transform={`rotate(90 ${stationLabelX} ${gridCenterY})`}>
        STATION
      </text>
      <text x={(grid.left + grid.right) / 2} y={timeLabelY} textAnchor="middle" fontSize="15" fontWeight="900" fill="#111820">
        TIME (HOURS)
      </text>
      <text x={grid.left} y={legendY} fontSize="12" fontWeight="900" fill="#0f63ce">
        Blue: cervical dilation
      </text>
      <text x={grid.left + 168} y={legendY} fontSize="12" fontWeight="900" fill="#c62828">
        Red: station
      </text>

      {data.guideLines.map((line) => (
        <line
          key={`guide-${line.hour}`}
          x1={line.x}
          y1={grid.top}
          x2={line.x}
          y2={grid.bottom}
          stroke="#1f2933"
          strokeWidth="2"
          strokeDasharray="7 8"
          strokeLinecap="round"
          opacity="0.72"
        />
      ))}
      {SHOW_OXYTOCIN_FEATURE && <OxytocinTrack bands={data.oxytocinBands} changes={data.oxytocinChanges} grid={grid} />}
      <NoteLabels notes={data.notes} grid={grid} />
      <ChartAnnotationLabels annotations={data.annotations} grid={grid} dilationPoints={data.dilationPoints} stationPoints={data.stationPoints} />
      <StartConnectors data={data} />
      <Series
        points={data.dilationPoints.map((point) => ({ ...point, time: data.timeFromHour(point.hour) }))}
        color="#0f63ce"
        marker="circle"
        onPointEnter={showPointDetails}
        onPointLeave={() => setHoveredPoint(null)}
      />
      <Series
        points={data.stationPoints.map((point) => ({ ...point, time: data.timeFromHour(point.hour) }))}
        color="#c62828"
        marker="cross"
        onPointEnter={showPointDetails}
        onPointLeave={() => setHoveredPoint(null)}
      />

      {hasFooter && (
        <>
          <text x={grid.left} y={diagnosisY} fontSize="13" fontWeight="900" fill="#111820">
            {diagnosisLines.map((line, index) => (
              <tspan key={`${line}-${index}`} x={grid.left} dy={index === 0 ? 0 : diagnosisLineHeight}>
                {line}
              </tspan>
            ))}
          </text>
          <text x={grid.right} y={residentY} textAnchor="end" fontSize="13" fontWeight="900" fill="#111820">
            {patient.residentName ? `Resident: ${patient.residentName}` : ""}
          </text>
        </>
      )}
      <text x="18" y={height - 10} textAnchor="start" fontSize="8" fontWeight="700" fill="#c7cdd5">
        (c) chu im - batch adamantos
      </text>
      </svg>
      {hoveredPoint && (
        <div
          className={`chart-tooltip${hoveredPoint.below ? " below" : ""}`}
          role="status"
          style={{ left: `${hoveredPoint.left}px`, top: `${hoveredPoint.top}px` }}
        >
          <strong>{hoveredPoint.series}</strong>
          <span>{hoveredPoint.series === "Cervical dilation" ? `${hoveredPoint.value} cm` : `Station ${hoveredPoint.value}`}</span>
          <span>{hoveredPoint.time}</span>
        </div>
      )}
    </div>
  );
}

function NoteLabels({ notes, grid }) {
  const { layouts, laneStride } = positionNoteLabels(prepareNoteLabels(notes), grid);

  return layouts.map((note) => {
    const y = grid.top - NOTE_LABEL_GAP - note.laneIndex * laneStride - note.height;
    const connectorY = y + note.height;
    const fill = note.isOxytocinNote ? "#fef3c7" : "#f8f6f2";
    const stroke = note.isOxytocinNote ? "#d6a72c" : "#e2ddd3";
    const ink = note.isOxytocinNote ? "#6f4b00" : "#4b4034";

    return (
      <g key={`${note.x}-${note.text}`} data-presentation-note="true" data-presentation-note-y={y}>
        <polyline points={`${note.x},${grid.top} ${note.x},${connectorY} ${note.labelX + note.width / 2},${connectorY}`} fill="none" stroke={stroke} strokeWidth="1" />
        <rect x={note.labelX} y={y} width={note.width} height={note.height} rx="5" fill={fill} stroke={stroke} strokeWidth="1" opacity="0.98" />
        <text x={note.labelX + 9} y={y + 15} fontSize="10" fontWeight="800" fill={ink}>
          {note.labelLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={note.labelX + 9} dy={index === 0 ? 0 : NOTE_LABEL_LINE_HEIGHT}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  });
}

function OxytocinNoteHighlights({ highlights, grid }) {
  if (!highlights.length) return null;

  return (
    <g aria-label="Oxytocin periods inferred from observation notes">
      {highlights.map((highlight, index) => {
        const width = Math.max(10, highlight.x2 - highlight.x1);
        const x = clamp(highlight.x1, grid.left, grid.right - width);
        const labelX = x + width / 2;

        return (
          <g key={`${highlight.startHour}-${highlight.endHour}-${index}`}>
            <rect
              x={x}
              y={grid.top}
              width={width}
              height={grid.bottom - grid.top}
              fill="#f2c94c"
              opacity={highlight.ended ? "0.12" : "0.075"}
            />
            <line
              x1={highlight.x1}
              y1={grid.top}
              x2={highlight.x1}
              y2={grid.bottom}
              stroke="#c89200"
              strokeWidth="1.2"
              strokeDasharray="5 7"
              opacity="0.58"
            />
            {highlight.ended && (
              <line
                x1={highlight.x2}
                y1={grid.top}
                x2={highlight.x2}
                y2={grid.bottom}
                stroke="#c89200"
                strokeWidth="1.2"
                strokeDasharray="5 7"
                opacity="0.48"
              />
            )}
            <text x={labelX} y={grid.bottom - 36} textAnchor="middle" fontSize="9" fontWeight="900" fill="#795600">
              {highlight.ended ? "OXYTOCIN" : "OXYTOCIN ACTIVE"}
            </text>
            <text x={labelX} y={grid.bottom - 23} textAnchor="middle" fontSize="8" fontWeight="800" fill="#795600">
              {highlight.ended ? `${highlight.startLabel} to ${highlight.endLabel}` : `from ${highlight.startLabel}; no stop note`}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function OxytocinBands({ bands, grid }) {
  if (!bands.length) return null;

  return (
    <g aria-label="Oxytocin infusion periods">
      {bands.map((band, index) => (
        <rect
          key={`${band.startHour}-${band.endHour}-${index}`}
          x={band.x1}
          y={grid.top}
          width={Math.max(2, band.x2 - band.x1)}
          height={grid.bottom - grid.top}
          fill="#f2c94c"
          opacity="0.16"
        />
      ))}
    </g>
  );
}

function OxytocinTrack({ bands, changes, grid }) {
  if (!changes.length) return null;

  const trackY = grid.bottom - 16;

  return (
    <g aria-label="Oxytocin rate timeline">
      {bands.map((band, index) => (
        <line
          key={`${band.startHour}-${band.endHour}-${index}`}
          x1={band.x1}
          y1={trackY}
          x2={band.x2}
          y2={trackY}
          stroke="#c89200"
          strokeWidth="5"
          strokeLinecap="butt"
          opacity="0.9"
        />
      ))}
      {changes.map((change, index) => {
        const isStop = change.action === "stop";
        const detail = isStop ? "Stopped" : `${change.rate || "--"} ${change.unit}`;

        return (
          <g key={change.id}>
            <line x1={change.x} y1={grid.top} x2={change.x} y2={grid.bottom} stroke="#c89200" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.55" />
            <rect x={change.x - 4} y={trackY - 4} width="8" height="8" rx="1" fill={isStop ? "#ffffff" : "#c89200"} stroke="#8a6400" strokeWidth="1.2" />
            <text x={change.x + 5} y={trackY - 9 - (index % 3) * 11} fontSize="8.5" fontWeight="900" fill="#795600">
              {change.timeLabel} · {detail}
            </text>
          </g>
        );
      })}
      <text x={bands[0]?.x1 ?? changes[0].x} y={grid.bottom - 58} fontSize="9" fontWeight="900" fill="#795600">
        OXYTOCIN
      </text>
    </g>
  );
}

function ChartAnnotationLabels({ annotations, grid, dilationPoints, stationPoints }) {
  const styles = {
    clinical: { fill: "#fce7f3", stroke: "#db8fba", label: "Clinical note" },
    medication: { fill: "#fef3c7", stroke: "#d6a72c", label: "Medication" },
    intervention: { fill: "#dbeafe", stroke: "#6aa4dc", label: "Intervention" },
    outcome: { fill: "#fee2e2", stroke: "#d97878", label: "Outcome" }
  };
  const boxWidth = 205;
  const lineHeight = 12;
  const plottedPoints = [...dilationPoints, ...stationPoints];
  const plottedSegments = [dilationPoints, stationPoints].flatMap((points) =>
    points.slice(1).map((point, index) => [points[index], point])
  );
  const placedBoxes = [];
  const pointInsideRect = (point, rect, padding = 12) =>
    point.x >= rect.x - padding && point.x <= rect.x + rect.width + padding &&
    point.y >= rect.y - padding && point.y <= rect.y + rect.height + padding;
  const lineIntersectsRect = ([start, end], rect, padding = 8) => {
    const left = rect.x - padding;
    const right = rect.x + rect.width + padding;
    const top = rect.y - padding;
    const bottom = rect.y + rect.height + padding;
    const steps = Math.max(4, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 16));

    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps;
      const x = start.x + (end.x - start.x) * ratio;
      const y = start.y + (end.y - start.y) * ratio;

      if (x >= left && x <= right && y >= top && y <= bottom) return true;
    }

    return false;
  };
  const boxesOverlap = (first, second, padding = 10) =>
    first.x < second.x + second.width + padding &&
    first.x + first.width + padding > second.x &&
    first.y < second.y + second.height + padding &&
    first.y + first.height + padding > second.y;

  return annotations.slice(0, 12).map((annotation) => {
    const style = styles[annotation.type] || styles.clinical;
    const targetLabel = annotation.targetSeries === "station" ? "station" : "cervix";
    const title = `${annotation.time} · ${style.label} · ${targetLabel}`;
    const bodyLines = wrapText(annotation.text, 31);
    const height = 31 + bodyLines.length * lineHeight + 12;
    const gapX = 28;
    const gapY = 24;
    const rawCandidates = [
      { x: annotation.x + gapX, y: annotation.anchorY - height - gapY },
      { x: annotation.x - boxWidth - gapX, y: annotation.anchorY - height - gapY },
      { x: annotation.x + gapX, y: annotation.anchorY + gapY },
      { x: annotation.x - boxWidth - gapX, y: annotation.anchorY + gapY },
      { x: annotation.x - boxWidth / 2, y: annotation.anchorY - height - 46 },
      { x: annotation.x - boxWidth / 2, y: annotation.anchorY + 46 },
      { x: grid.left + 10, y: grid.bottom - height - 12 },
      { x: grid.right - boxWidth - 10, y: grid.top + 12 }
    ];
    const candidates = rawCandidates.map((candidate, order) => {
      const rect = {
        x: clamp(candidate.x, grid.left + 10, grid.right - boxWidth - 10),
        y: clamp(candidate.y, grid.top + 10, grid.bottom - height - 10),
        width: boxWidth,
        height
      };
      const pointCollisions = plottedPoints.filter((point) => pointInsideRect(point, rect)).length;
      const lineCollisions = plottedSegments.filter((segment) => lineIntersectsRect(segment, rect)).length;
      const boxCollisions = placedBoxes.filter((box) => boxesOverlap(rect, box)).length;
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const distance = Math.hypot(centerX - annotation.x, centerY - annotation.anchorY);

      return {
        ...rect,
        score: pointCollisions * 10000 + lineCollisions * 2600 + boxCollisions * 16000 + distance + order * 4
      };
    });
    const placement = candidates.reduce((best, candidate) => candidate.score < best.score ? candidate : best);
    placedBoxes.push(placement);
    const connectorX = clamp(annotation.x, placement.x + 12, placement.x + boxWidth - 12);
    const connectorY = annotation.anchorY < placement.y
      ? placement.y
      : annotation.anchorY > placement.y + height
        ? placement.y + height
        : clamp(annotation.anchorY, placement.y + 12, placement.y + height - 12);

    return (
      <g key={annotation.id}>
        <line
          x1={connectorX}
          y1={connectorY}
          x2={annotation.x}
          y2={annotation.anchorY}
          stroke={style.stroke}
          strokeWidth="1.5"
          markerEnd="url(#annotation-arrow)"
        />
        <rect x={placement.x} y={placement.y} width={boxWidth} height={height} rx="5" fill={style.fill} stroke={style.stroke} strokeWidth="1.2" opacity="0.96" />
        <text x={placement.x + 10} y={placement.y + 17} fontSize="10" fontWeight="900" fill="#28313d">
          {title}
        </text>
        <text x={placement.x + 10} y={placement.y + 34} fontSize="10" fontWeight="700" fill="#3e4650">
          {bodyLines.map((line, lineIndex) => (
            <tspan key={`${line}-${lineIndex}`} x={placement.x + 10} dy={lineIndex === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  });
}

function StartConnectors({ data }) {
  const dilationStart = data.dilationPoints[0];
  const stationStart = data.stationPoints[0];

  return (
    <>
      {dilationStart && dilationStart.hour > 0 && (
        <line
          x1={data.grid.left}
          y1={data.yForDilation(0)}
          x2={dilationStart.x}
          y2={dilationStart.y}
          stroke="#0f63ce"
          strokeWidth="2.4"
          strokeDasharray="5 8"
          strokeLinecap="round"
          opacity="0.72"
        />
      )}
      {stationStart && stationStart.hour > 0 && (
        <line
          x1={data.grid.left}
          y1={stationStart.y}
          x2={stationStart.x}
          y2={stationStart.y}
          stroke="#c62828"
          strokeWidth="2.4"
          strokeDasharray="5 8"
          strokeLinecap="round"
          opacity="0.72"
        />
      )}
    </>
  );
}

function Series({ points, color, marker, onPointEnter, onPointLeave }) {
  return (
    <>
      {points.length >= 2 && (
        <path
          d={formatPath(points)}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {points.map((point, index) =>
        marker === "circle" ? (
          <circle
            key={`${marker}-${index}`}
            className="chart-point"
            cx={point.x}
            cy={point.y}
            r="8"
            fill="#fff"
            stroke={color}
            strokeWidth="3"
            tabIndex="0"
            aria-label={`Cervical dilation: ${point.value} cm at ${point.time}`}
            onMouseEnter={() => onPointEnter(point, "Cervical dilation")}
            onFocus={() => onPointEnter(point, "Cervical dilation")}
            onMouseLeave={onPointLeave}
            onBlur={onPointLeave}
          />
        ) : (
          <g
            key={`${marker}-${index}`}
            className="chart-point"
            tabIndex="0"
            aria-label={`Fetal station: ${point.value} at ${point.time}`}
            onMouseEnter={() => onPointEnter(point, "Fetal station")}
            onFocus={() => onPointEnter(point, "Fetal station")}
            onMouseLeave={onPointLeave}
            onBlur={onPointLeave}
          >
            <line x1={point.x - 9} y1={point.y - 9} x2={point.x + 9} y2={point.y + 9} stroke={color} strokeWidth="3" strokeLinecap="round" />
            <line x1={point.x + 9} y1={point.y - 9} x2={point.x - 9} y2={point.y + 9} stroke={color} strokeWidth="3" strokeLinecap="round" />
          </g>
        )
      )}
    </>
  );
}

function Icon({ name }) {
  if (name === "info") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
    );
  }

  if (name === "guide") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </svg>
    );
  }

  if (name === "print") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 8V3h10v5" />
        <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
        <path d="M7 14h10v7H7z" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 15H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="m8 15 2.5-3 2 2.3L15 11l3 4" />
      <path d="M8.5 8.5h.01" />
    </svg>
  );
}

function GuidePage() {
  return (
    <main className="guide-page">
      <section className="panel guide-panel" aria-labelledby="guide-title">
        <div className="guide-heading">
          <div>
            <p className="eyebrow">User Guide</p>
            <h2 id="guide-title">How to use the Friedman&apos;s Curve Builder</h2>
          </div>
        </div>

        <div className="guide-grid">
          <article>
            <h3>Patient Details</h3>
            <p>Fill in the patient panel first. These fields print into the generated chart header and footer.</p>
            <ul>
              <li>Name, Age, OB Score, AOG, Date, Start Time</li>
              <li>Final Diagnosis for the lower chart text</li>
              <li>Resident for the signature line</li>
              <li>Long values wrap automatically on the chart.</li>
            </ul>
          </article>

          <article>
            <h3>Save and Restore</h3>
            <p>Use Save to keep the current chart in this browser. Restore opens the saved chart list.</p>
            <ul>
              <li>Up to 5 patient charts are saved locally.</li>
              <li>Saving a 6th chart asks before removing the oldest saved chart.</li>
              <li>Restoring a chart asks before replacing the chart currently on screen.</li>
              <li>Saved charts stay on this device and browser only.</li>
            </ul>
          </article>

          <article>
            <h3>Observations</h3>
            <p>Each observation can plot cervical dilation, station, a timeline note, or an event marker.</p>
            <ul>
              <li>Time is the clock time of the event.</li>
              <li>Day is selected from the dropdown: 0 for the start date, 1 for the next day, and so on.</li>
              <li>Hour is calculated automatically from Start Time, Time, and Day.</li>
              <li>Cervix is selected from 0 to 10 cm.</li>
              <li>Station is selected from -5 to +5.</li>
            </ul>
          </article>

          <article>
            <h3>Records List</h3>
            <p>Recorded observations appear as compact cards using the same blue for cervix and red for station as the chart.</p>
            <ul>
              <li>Edit opens the full observation form.</li>
              <li>The trash button deletes that observation.</li>
              <li>Deleting an observation also removes chart annotations attached to it.</li>
              <li>Clear removes all observations and chart annotations.</li>
            </ul>
          </article>

          <article>
            <h3>Timeline Notes</h3>
            <p>Short observation notes appear above the graph with their time. Use these for concise labels such as admission, medication, mount, or baby out.</p>
            <ul>
              <li>Notes can be used even when the row has no cervix or station value.</li>
              <li>Notes containing oxy or oxytocin tint amber and can highlight oxytocin activity on the chart.</li>
            </ul>
          </article>

          <article>
            <h3>Oxytocin Notes</h3>
            <p>The chart automatically detects oxytocin activity from observation notes.</p>
            <ul>
              <li>A note with oxy or oxytocin starts an amber active band.</li>
              <li>Notes such as oxy stopped, oxytocin stopped, off, held, paused, or discontinued stop the band.</li>
              <li>If no stop note exists, the band continues to the latest plotted clinical entry and is labeled as active.</li>
              <li>Titration notes such as Titrated oxy to 12 gtts/min keep the active band running.</li>
            </ul>
          </article>

          <article>
            <h3>Event Marker</h3>
            <p>Check Event Marker on an observation row to draw a dotted vertical line at that timestamp, like the paper sample chart.</p>
            <ul>
              <li>Use it for admission, medication, procedures, mount, baby out, or other important events.</li>
              <li>It can be used even when the row only has a time and note.</li>
            </ul>
          </article>

          <article>
            <h3>Chart Annotations</h3>
            <p>Use Chart annotations for longer clinical narratives that need a callout box inside the graph.</p>
            <ul>
              <li>Select the exact recorded observation.</li>
              <li>Choose whether the callout connects to the cervix or station point.</li>
              <li>Choose a type: clinical note, medication, intervention, or outcome.</li>
              <li>Annotations can be edited or deleted after adding.</li>
            </ul>
          </article>

          <article>
            <h3>Chart View</h3>
            <p>The chart stays fitted in the page. Tap the chart to open the expanded viewer.</p>
            <ul>
              <li>Pinch to zoom on mobile.</li>
              <li>Double-tap or double-click to toggle zoom.</li>
              <li>Use Reset zoom to return to the fitted chart.</li>
            </ul>
          </article>

          <article>
            <h3>Navigation</h3>
            <p>Use the bottom navigation on mobile or the sticky rail on desktop to jump between sections.</p>
            <ul>
              <li>Chart jumps to the generated curve.</li>
              <li>Add opens the mobile observation sheet.</li>
              <li>Annotate jumps to chart annotations.</li>
              <li>Records jumps to recorded observations.</li>
              <li>Patient jumps to patient details.</li>
            </ul>
          </article>

          <article>
            <h3>Long Labor</h3>
            <p>If labor continues past midnight, enter the next clock time and set Day to 1. The graph expands horizontally when observations go beyond 18 hours.</p>
            <p>Example: Start Time 7:30 AM, Time 8:30 AM, Day 1 plots at hour 25.</p>
          </article>

          <article>
            <h3>Export</h3>
            <p>Use Presentation PNG (16:9) for PowerPoint, Keynote, Google Slides, or Zoom. It enlarges the graph and removes the document-style header and footer. Use Full chart PNG or SVG when patient details and diagnosis must remain visible.</p>
            <ul>
              <li>Print opens the browser print dialog.</li>
              <li>Presentation PNG is a 2560 × 1440 slide-ready image.</li>
              <li>SVG is best for crisp editing or archiving.</li>
              <li>Full chart PNG is best for sharing the complete record.</li>
            </ul>
          </article>

          <article>
            <h3>Feedback Messages</h3>
            <p>Small messages appear after important actions such as loading the sample, saving, restoring, deleting, resetting, and exporting.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

function serializeSvg(chartNode, viewBoxOverride = null) {
  const clone = chartNode.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  if (viewBoxOverride) {
    clone.setAttribute("viewBox", `${viewBoxOverride.x} ${viewBoxOverride.y} ${viewBoxOverride.width} ${viewBoxOverride.height}`);
    clone.setAttribute("width", viewBoxOverride.width);
    clone.setAttribute("height", viewBoxOverride.height);
    clone.removeAttribute("style");
  }

  return new XMLSerializer().serializeToString(clone);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [newObservation, setNewObservation] = useState(() => nextObservationDraft(state.observations, state.patient.startTime));
  const [newAnnotation, setNewAnnotation] = useState(() => createAnnotationDraft({ time: state.patient.startTime }));
  const [newOxytocinEvent, setNewOxytocinEvent] = useState(() => createOxytocinDraft({ time: state.patient.startTime }));
  const [showGuide, setShowGuide] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showRestoreMenu, setShowRestoreMenu] = useState(false);
  const [savedCharts, setSavedCharts] = useState(loadSavedCharts);
  const [showMobileEntrySheet, setShowMobileEntrySheet] = useState(false);
  const [showMobileAnnotationSheet, setShowMobileAnnotationSheet] = useState(false);
  const [showChartViewer, setShowChartViewer] = useState(false);
  const [chartZoom, setChartZoom] = useState(1);
  const [confirmation, setConfirmation] = useState(null);
  const [notification, setNotification] = useState(null);
  const [expandedObservationId, setExpandedObservationId] = useState(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState(null);
  const chartRef = useRef(null);
  const exportMenuRef = useRef(null);
  const restoreMenuRef = useRef(null);
  const chartPinchRef = useRef({ distance: 0, zoom: 1 });
  const observations = useMemo(
    () => sortedObservations(state.observations, state.patient.startTime),
    [state.observations, state.patient.startTime]
  );
  const annotations = state.annotations || [];
  const oxytocinEvents = state.oxytocinEvents || [];
  const sortedInfusionEvents = useMemo(
    () => sortedOxytocinEvents(oxytocinEvents, state.patient.startTime),
    [oxytocinEvents, state.patient.startTime]
  );
  const chartData = useMemo(
    () => buildSvgData(state.patient, state.observations, annotations, oxytocinEvents),
    [state.patient, state.observations, annotations, oxytocinEvents]
  );
  const summary = useMemo(
    () => clinicalSummary(state.observations, state.patient.startTime),
    [state.observations, state.patient.startTime]
  );
  const newObservationStatus = pointStatus(newObservation, state.patient.startTime);
  const newObservationWarnings = observationWarnings(newObservation, state.patient.startTime, state.observations).filter(
    (message) => message !== "Enter cervix, station, a note, or mark it as an event."
  );
  const newOxytocinWarnings = oxytocinEventWarnings(newOxytocinEvent, oxytocinEvents, state.patient.startTime);
  const confirmationType = confirmation?.type;
  const confirmationObservation = confirmation?.observation;
  const confirmationAnnotation = confirmation?.annotation;
  const confirmationSavedChart = confirmation?.savedChart;
  const confirmationPendingSave = confirmation?.pendingSave;
  const confirmationAnnotationObservation = confirmationAnnotation
    ? state.observations.find((observation) => observation.id === confirmationAnnotation.observationId)
    : null;
  const confirmationObservationStatus = confirmationObservation ? pointStatus(confirmationObservation, state.patient.startTime) : null;
  const confirmationObservationDetails = confirmationObservation
    ? [
        ["Time", formatDisplayTime(confirmationObservation.time)],
        ["Day", normalizedDay(confirmationObservation.dayOffset)],
        ["Hour", confirmationObservationStatus?.hour === null ? "--" : confirmationObservationStatus?.hour.toFixed(1)],
        ["Cervix", confirmationObservation.dilation === "" ? "--" : `${confirmationObservation.dilation} cm`],
        ["Station", formatStationValue(confirmationObservation.station)],
        ["Event marker", confirmationObservation.guideLine ? "Yes" : "No"],
        ["Note", confirmationObservation.note.trim() || "--"]
      ]
    : [];
  const confirmationAnnotationDetails = confirmationAnnotation
    ? [
        ["Time", formatDisplayTime(confirmationAnnotationObservation?.time || confirmationAnnotation.time)],
        ["Day", normalizedDay(confirmationAnnotationObservation?.dayOffset ?? confirmationAnnotation.dayOffset)],
        ["Type", annotationTypeLabel(confirmationAnnotation.type)],
        ["Connected to", confirmationAnnotation.targetSeries === "station" ? "Station" : "Cervix"],
        ["Annotation", confirmationAnnotation.text.trim() || "--"]
      ]
    : [];
  const confirmationSavedChartDetails = confirmationSavedChart
    ? [
        ["Patient", confirmationSavedChart.label],
        ["Saved", formatSavedTimestamp(confirmationSavedChart.savedAt)],
        ["Records", String(confirmationSavedChart.state.observations.length)],
        ["Annotations", String(confirmationSavedChart.state.annotations.length)]
      ]
    : [];
  const confirmationTitle = confirmationType === "clear-observations"
    ? "Clear observations?"
    : confirmationType === "delete-observation"
      ? "Delete this observation?"
      : confirmationType === "delete-annotation"
        ? "Delete this annotation?"
      : confirmationType === "save-chart-limit"
        ? "Save chart and remove oldest?"
      : confirmationType === "restore-chart"
        ? "Restore saved chart?"
      : confirmationType === "delete-saved-chart"
        ? "Delete saved chart?"
      : "Reset patient details?";
  const confirmationMessage = confirmationType === "clear-observations"
    ? "This will remove all recorded observations and chart annotations. This cannot be undone."
    : confirmationType === "delete-observation"
      ? "This will remove the observation shown below and any chart annotations attached to it. This cannot be undone."
      : confirmationType === "delete-annotation"
        ? "This will remove the chart annotation shown below. This cannot be undone."
      : confirmationType === "save-chart-limit"
        ? `You already have ${MAX_SAVED_CHARTS} saved charts. Saving this chart will remove the oldest saved chart shown below.`
      : confirmationType === "restore-chart"
        ? "This will replace the current chart on screen with the saved chart shown below. Save the current chart first if you need to keep it."
      : confirmationType === "delete-saved-chart"
        ? "This will permanently remove the saved chart shown below from this browser."
      : "This will reset patient details and remove all observations, chart annotations, and oxytocin events. This cannot be undone.";
  const confirmationActionLabel = confirmationType === "clear-observations"
    ? "Clear observations"
    : confirmationType === "delete-observation"
      ? "Delete observation"
      : confirmationType === "delete-annotation"
        ? "Delete annotation"
      : confirmationType === "save-chart-limit"
        ? "Save and remove oldest"
      : confirmationType === "restore-chart"
        ? "Restore chart"
      : confirmationType === "delete-saved-chart"
        ? "Delete saved chart"
      : "Reset all";
  const confirmationIsDestructive = ["clear-observations", "delete-observation", "delete-annotation", "delete-saved-chart", "reset-patient"].includes(confirmationType);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(SAVED_CHARTS_KEY, JSON.stringify(savedCharts));
  }, [savedCharts]);

  useEffect(() => {
    if (!showExportMenu) return undefined;

    const closeExportMenu = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !exportMenuRef.current?.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("pointerdown", closeExportMenu);
    document.addEventListener("keydown", closeExportMenu);

    return () => {
      document.removeEventListener("pointerdown", closeExportMenu);
      document.removeEventListener("keydown", closeExportMenu);
    };
  }, [showExportMenu]);

  useEffect(() => {
    if (!showRestoreMenu) return undefined;

    const closeRestoreMenu = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !restoreMenuRef.current?.contains(event.target)) {
        setShowRestoreMenu(false);
      }
    };

    document.addEventListener("pointerdown", closeRestoreMenu);
    document.addEventListener("keydown", closeRestoreMenu);

    return () => {
      document.removeEventListener("pointerdown", closeRestoreMenu);
      document.removeEventListener("keydown", closeRestoreMenu);
    };
  }, [showRestoreMenu]);

  useEffect(() => {
    if (!confirmation) return undefined;

    const closeConfirmation = (event) => {
      if (event.key === "Escape") {
        setConfirmation(null);
      }
    };

    document.addEventListener("keydown", closeConfirmation);
    return () => document.removeEventListener("keydown", closeConfirmation);
  }, [confirmation]);

  useEffect(() => {
    if (!notification) return undefined;

    const timeout = window.setTimeout(() => setNotification(null), 2800);

    return () => window.clearTimeout(timeout);
  }, [notification]);

  useEffect(() => {
    if (!showMobileEntrySheet) return undefined;

    const closeMobileEntrySheet = (event) => {
      if (event.key === "Escape") {
        setShowMobileEntrySheet(false);
      }
    };

    document.addEventListener("keydown", closeMobileEntrySheet);
    return () => document.removeEventListener("keydown", closeMobileEntrySheet);
  }, [showMobileEntrySheet]);

  useEffect(() => {
    if (!showMobileAnnotationSheet) return undefined;

    const closeMobileAnnotationSheet = (event) => {
      if (event.key === "Escape") {
        setShowMobileAnnotationSheet(false);
      }
    };

    document.addEventListener("keydown", closeMobileAnnotationSheet);
    return () => document.removeEventListener("keydown", closeMobileAnnotationSheet);
  }, [showMobileAnnotationSheet]);

  useEffect(() => {
    if (!showChartViewer) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowChartViewer(false);
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showChartViewer]);

  const notify = (message, tone = "success") => {
    setNotification({
      id: makeId(),
      message,
      tone
    });
  };

  const updatePatient = (field, value) => {
    setState((current) => ({
      ...current,
      patient: {
        ...current.patient,
        [field]: value
      }
    }));
  };

  const updateObservation = (id, field, value) => {
    setState((current) => ({
      ...current,
      observations: current.observations.map((observation) =>
        observation.id === id ? { ...observation, [field]: value } : observation
      )
    }));
  };

  const updateNewObservation = (field, value) => {
    setNewObservation((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateNewAnnotation = (field, value) => {
    setNewAnnotation((current) => ({ ...current, [field]: value }));
  };

  const updateAnnotation = (id, field, value) => {
    setState((current) => ({
      ...current,
      annotations: (current.annotations || []).map((annotation) =>
        annotation.id === id ? { ...annotation, [field]: value } : annotation
      )
    }));
  };

  const selectAnnotationObservation = (observationId) => {
    const observation = state.observations.find((item) => item.id === observationId);

    if (!observation) {
      setNewAnnotation((current) => ({ ...current, observationId: "" }));
      return;
    }

    setNewAnnotation((current) => ({
      ...current,
      observationId,
      time: observation.time,
      dayOffset: normalizedDay(observation.dayOffset),
      targetSeries: observation.dilation !== "" ? "dilation" : "station"
    }));
  };

  const selectSavedAnnotationObservation = (annotationId, observationId) => {
    const observation = state.observations.find((item) => item.id === observationId);

    setState((current) => ({
      ...current,
      annotations: (current.annotations || []).map((annotation) => {
        if (annotation.id !== annotationId) return annotation;

        if (!observation) {
          return { ...annotation, observationId: "" };
        }

        return {
          ...annotation,
          observationId,
          time: observation.time,
          dayOffset: normalizedDay(observation.dayOffset),
          targetSeries: observation.dilation !== "" ? "dilation" : "station"
        };
      })
    }));
  };

  const addAnnotation = () => {
    if (!newAnnotation.observationId || !newAnnotation.time || !newAnnotation.text.trim()) return;

    setState((current) => ({
      ...current,
      annotations: [...(current.annotations || []), createChartAnnotation(newAnnotation)]
    }));
    setNewAnnotation(createAnnotationDraft({
      type: newAnnotation.type
    }));
    notify("Annotation added.");
  };

  const resetNewAnnotation = () => {
    setNewAnnotation(createAnnotationDraft({ type: newAnnotation.type, time: state.patient.startTime }));
  };

  const confirmDeleteAnnotation = (id) => {
    setState((current) => ({
      ...current,
      annotations: (current.annotations || []).filter((annotation) => annotation.id !== id)
    }));
    setEditingAnnotationId((currentId) => (currentId === id ? null : currentId));
    notify("Annotation deleted.");
  };

  const deleteAnnotation = (annotation) => {
    setConfirmation({ type: "delete-annotation", annotation: { ...annotation } });
  };

  const updateNewOxytocinEvent = (field, value) => {
    setNewOxytocinEvent((current) => ({ ...current, [field]: value }));
  };

  const addOxytocinEvent = () => {
    if (newOxytocinWarnings.length > 0) return;

    const event = createOxytocinEvent(newOxytocinEvent);
    setState((current) => ({
      ...current,
      oxytocinEvents: [...(current.oxytocinEvents || []), event]
    }));
    setNewOxytocinEvent(createOxytocinDraft({
      time: newOxytocinEvent.time,
      dayOffset: newOxytocinEvent.dayOffset,
      action: newOxytocinEvent.action === "stop" ? "resume" : "increase",
      unit: newOxytocinEvent.unit
    }));
    notify("Infusion event added.");
  };

  const deleteOxytocinEvent = (id) => {
    setState((current) => ({
      ...current,
      oxytocinEvents: (current.oxytocinEvents || []).filter((event) => event.id !== id)
    }));
    notify("Infusion event deleted.");
  };

  const addObservation = () => {
    const observation = createObservation(newObservation);
    const nextObservations = [...state.observations, observation];

    setState((current) => ({
      ...current,
      observations: [...current.observations, observation]
    }));
    setNewObservation(nextObservationDraft(nextObservations, state.patient.startTime));
    setExpandedObservationId(observation.id);
    setShowMobileEntrySheet(false);
    notify("Observation added.");
  };

  const resetNewObservation = () => {
    setNewObservation(nextObservationDraft(state.observations, state.patient.startTime));
  };

  const confirmClearObservations = () => {
    setState((current) => ({ ...current, observations: [], annotations: [] }));
    setNewObservation(nextObservationDraft([], state.patient.startTime));
    setExpandedObservationId(null);
    setEditingAnnotationId(null);
    notify("Observations and annotations cleared.");
  };

  const clearObservations = () => {
    if (!state.observations.length && !annotations.length) return;
    setConfirmation({ type: "clear-observations" });
  };

  const confirmDeleteObservation = (id) => {
    setState((current) => ({
      ...current,
      observations: current.observations.filter((observation) => observation.id !== id),
      annotations: (current.annotations || []).filter((annotation) => annotation.observationId !== id)
    }));
    setExpandedObservationId((currentId) => (currentId === id ? null : currentId));
    notify("Observation deleted.");
  };

  const deleteObservation = (observation) => {
    setConfirmation({ type: "delete-observation", observation: { ...observation } });
  };

  const saveChartSnapshot = (savedChart, shouldDropOldest = false) => {
    setSavedCharts((current) => {
      const nextCharts = shouldDropOldest
        ? [savedChart, ...current]
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            .slice(0, MAX_SAVED_CHARTS)
        : [savedChart, ...current].slice(0, MAX_SAVED_CHARTS);

      return nextCharts;
    });
    setShowRestoreMenu(false);
    notify(shouldDropOldest ? "Chart saved. Oldest saved chart removed." : "Chart saved.");
  };

  const saveCurrentChart = () => {
    const savedChart = createSavedChart(state);

    if (savedCharts.length >= MAX_SAVED_CHARTS) {
      const oldestChart = [...savedCharts].sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())[0];
      setConfirmation({ type: "save-chart-limit", pendingSave: savedChart, savedChart: oldestChart });
      return;
    }

    saveChartSnapshot(savedChart);
  };

  const restoreSavedChart = (savedChart) => {
    setConfirmation({ type: "restore-chart", savedChart });
    setShowRestoreMenu(false);
  };

  const confirmRestoreSavedChart = (savedChart) => {
    const restoredState = normalizeChartState(savedChart.state);

    setState(restoredState);
    setNewObservation(nextObservationDraft(restoredState.observations, restoredState.patient.startTime));
    setNewAnnotation(createAnnotationDraft({ time: restoredState.patient.startTime }));
    setNewOxytocinEvent(createOxytocinDraft({ time: restoredState.patient.startTime }));
    setExpandedObservationId(null);
    setEditingAnnotationId(null);
    setShowMobileEntrySheet(false);
    setShowMobileAnnotationSheet(false);
    notify("Saved chart restored.");
  };

  const deleteSavedChart = (savedChart) => {
    setConfirmation({ type: "delete-saved-chart", savedChart });
    setShowRestoreMenu(false);
  };

  const confirmDeleteSavedChart = (id) => {
    setSavedCharts((current) => current.filter((chart) => chart.id !== id));
    notify("Saved chart deleted.");
  };

  const loadSample = () => {
    const sample = makeSampleState();
    setState(sample);
    setNewObservation(nextObservationDraft(sample.observations, sample.patient.startTime));
    setNewAnnotation(createAnnotationDraft({ time: sample.patient.startTime }));
    setNewOxytocinEvent(createOxytocinDraft({ time: sample.patient.startTime }));
    setExpandedObservationId(null);
    notify("Sample chart loaded.");
  };

  const confirmResetPatient = () => {
    const defaults = makeDefaultState();
    setState((current) => ({
      ...current,
      patient: defaults.patient,
      observations: [],
      annotations: [],
      oxytocinEvents: []
    }));
    setNewObservation(nextObservationDraft([], defaults.patient.startTime));
    setNewAnnotation(createAnnotationDraft({ time: defaults.patient.startTime }));
    setNewOxytocinEvent(createOxytocinDraft({ time: defaults.patient.startTime }));
    setExpandedObservationId(null);
    notify("Chart reset.");
  };

  const resetPatient = () => {
    const defaults = makeDefaultState();
    const hasPatientInfo = PATIENT_FIELDS.some((field) => state.patient[field] !== defaults.patient[field]);
    const hasObservations = state.observations.length > 0 || annotations.length > 0 || oxytocinEvents.length > 0;

    if (hasPatientInfo || hasObservations) {
      setConfirmation({ type: "reset-patient" });
      return;
    }

    confirmResetPatient();
  };

  const confirmPendingAction = () => {
    if (confirmationType === "clear-observations") {
      confirmClearObservations();
    }

    if (confirmationType === "reset-patient") {
      confirmResetPatient();
    }

    if (confirmationType === "delete-observation" && confirmationObservation?.id) {
      confirmDeleteObservation(confirmationObservation.id);
    }

    if (confirmationType === "delete-annotation" && confirmationAnnotation?.id) {
      confirmDeleteAnnotation(confirmationAnnotation.id);
    }

    if (confirmationType === "save-chart-limit" && confirmationPendingSave) {
      saveChartSnapshot(confirmationPendingSave, true);
    }

    if (confirmationType === "restore-chart" && confirmationSavedChart) {
      confirmRestoreSavedChart(confirmationSavedChart);
    }

    if (confirmationType === "delete-saved-chart" && confirmationSavedChart?.id) {
      confirmDeleteSavedChart(confirmationSavedChart.id);
    }

    setConfirmation(null);
  };

  const downloadSvg = () => {
    if (!chartRef.current) return;
    download("friedmans-curve.svg", serializeSvg(chartRef.current), "image/svg+xml;charset=utf-8");
    notify("SVG downloaded.");
  };

  const downloadPng = () => {
    if (!chartRef.current) return;

    const svgText = serializeSvg(chartRef.current);
    const image = new Image();
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const viewBox = chartRef.current.viewBox.baseVal;
      const canvas = document.createElement("canvas");
      canvas.width = viewBox.width * 2;
      canvas.height = viewBox.height * 2;

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "friedmans-curve.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(pngUrl);
        notify("Full chart PNG downloaded.");
      }, "image/png");
    };

    image.src = url;
  };

  const downloadPresentationPng = () => {
    if (!chartRef.current) return;

    const gridTop = Number(chartRef.current.dataset.presentationGridTop);
    const gridBottom = Number(chartRef.current.dataset.presentationGridBottom);
    const noteTops = [...chartRef.current.querySelectorAll('[data-presentation-note="true"]')]
      .map((note) => Number(note.dataset.presentationNoteY))
      .filter(Number.isFinite);
    const cropTop = noteTops.length ? Math.max(0, Math.min(...noteTops) - 8) : Math.max(0, gridTop - 24);
    const cropBottom = gridBottom + 78;
    const presentationBox = {
      x: Number(chartRef.current.dataset.presentationX),
      y: cropTop,
      width: Number(chartRef.current.dataset.presentationWidth),
      height: cropBottom - cropTop
    };

    if (Object.values(presentationBox).some((value) => !Number.isFinite(value))) return;

    const svgText = serializeSvg(chartRef.current, presentationBox);
    const image = new Image();
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const slideWidth = 2560;
      const slideHeight = 1440;
      const margin = 32;
      const scale = Math.min(
        (slideWidth - margin * 2) / presentationBox.width,
        (slideHeight - margin * 2) / presentationBox.height
      );
      const drawWidth = presentationBox.width * scale;
      const drawHeight = presentationBox.height * scale;
      const drawX = (slideWidth - drawWidth) / 2;
      const drawY = (slideHeight - drawHeight) / 2;

      canvas.width = slideWidth;
      canvas.height = slideHeight;

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, slideWidth, slideHeight);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "friedmans-curve-presentation-16x9.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(pngUrl);
        notify("Presentation PNG downloaded.");
      }, "image/png");
    };

    image.src = url;
  };

  const scrollToMobileSection = (id) => {
    setShowMobileEntrySheet(false);
    setShowMobileAnnotationSheet(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openMobileEntrySheet = () => {
    setShowMobileAnnotationSheet(false);
    setShowMobileEntrySheet(true);
  };

  const openMobileAnnotationSheet = () => {
    setShowMobileEntrySheet(false);
    setShowMobileAnnotationSheet(true);
  };

  const openChartViewer = () => {
    setChartZoom(1);
    setShowChartViewer(true);
  };
  const touchDistance = (touches) => {
    const [first, second] = touches;
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };
  const startChartPinch = (event) => {
    if (event.touches.length !== 2) return;

    chartPinchRef.current = {
      distance: touchDistance(event.touches),
      zoom: chartZoom
    };
  };
  const moveChartPinch = (event) => {
    if (event.touches.length !== 2 || !chartPinchRef.current.distance) return;

    event.preventDefault();
    const nextZoom = chartPinchRef.current.zoom * (touchDistance(event.touches) / chartPinchRef.current.distance);
    setChartZoom(Math.min(2.75, Math.max(1, Number(nextZoom.toFixed(2)))));
  };
  const endChartPinch = () => {
    chartPinchRef.current = { distance: 0, zoom: chartZoom };
  };
  const toggleChartZoom = () => {
    setChartZoom((zoom) => (zoom > 1.05 ? 1 : 1.8));
  };

  const renderNewObservationForm = (variant = "inline") => (
    <div className={`entry-card ${variant === "sheet" ? "mobile-entry-card" : ""}`} aria-label="New observation">
      <div className="entry-heading">
        <h3>New observation</h3>
        <span>Enter the next labor record, then add it to the chart.</span>
      </div>
      <div className="entry-grid">
        <label className="entry-time">
          Time
          <input value={newObservation.time} type="time" onChange={(event) => updateNewObservation("time", event.target.value)} />
        </label>
        <label className="entry-day">
          Day
          <DaySelect value={newObservation.dayOffset} onChange={(value) => updateNewObservation("dayOffset", value)} />
        </label>
        <div className="computed-field">
          <span>Hour</span>
          <strong>{newObservationStatus.hour === null ? "--" : newObservationStatus.hour.toFixed(1)}</strong>
        </div>
        <label className="checkbox-field">
          Event marker
          <input checked={Boolean(newObservation.guideLine)} type="checkbox" title="Mark this event time with a dotted line" aria-label="Mark this event time with a dotted line" onChange={(event) => updateNewObservation("guideLine", event.target.checked)} />
        </label>
        <label className="entry-cervix">
          Cervix
          <CervixSelect value={newObservation.dilation} onChange={(value) => updateNewObservation("dilation", value)} />
        </label>
        <label className="entry-station">
          Station
          <StationSelect value={newObservation.station} onChange={(value) => updateNewObservation("station", value)} />
        </label>
        <label className="entry-note">
          Timeline note
          <input value={newObservation.note} placeholder="e.g., Oxytocin started" type="text" onChange={(event) => updateNewObservation("note", event.target.value)} />
        </label>
      </div>
      {newObservationWarnings.length > 0 && (
        <ul className="validation-list" aria-live="polite">
          {newObservationWarnings.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <div className="entry-actions">
        <button className="ghost-button" type="button" onClick={resetNewObservation}>
          Reset entry
        </button>
        <button className="primary-button" type="button" onClick={addObservation}>
          Add to chart
        </button>
      </div>
    </div>
  );

  const renderAnnotationForm = (variant = "inline") => (
    <div className={`annotation-form ${variant === "sheet" ? "mobile-annotation-form" : ""}`}>
      <label>
        Attach to observation
        <select value={newAnnotation.observationId} onChange={(event) => selectAnnotationObservation(event.target.value)}>
          <option value="">Select a plotted entry</option>
          {observations.map((observation) => (
            <option key={observation.id} value={observation.id}>
              {formatDisplayTime(observation.time)} · Day {normalizedDay(observation.dayOffset)} · Cervix {observation.dilation || "--"} · Station {formatStationValue(observation.station)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Connect to
        <select value={newAnnotation.targetSeries} onChange={(event) => updateNewAnnotation("targetSeries", event.target.value)}>
          <option value="dilation">Cervical dilation point</option>
          <option value="station">Station point</option>
        </select>
      </label>
      <label>
        Type
        <select value={newAnnotation.type} onChange={(event) => updateNewAnnotation("type", event.target.value)}>
          <option value="clinical">Clinical note</option>
          <option value="medication">Medication</option>
          <option value="intervention">Intervention</option>
          <option value="outcome">Outcome / decision</option>
        </select>
      </label>
      <label className="annotation-text">
        Annotation
        <textarea value={newAnnotation.text} rows="3" placeholder="e.g., FHR pattern, contraction findings, or clinical action taken" onChange={(event) => updateNewAnnotation("text", event.target.value)} />
      </label>
      <div className="annotation-actions">
        <button className="primary-button annotation-add" type="button" disabled={!newAnnotation.observationId || !newAnnotation.text.trim()} onClick={() => {
          addAnnotation();
          if (variant === "sheet") setShowMobileAnnotationSheet(false);
        }}>
          Add annotation
        </button>
        <button className="ghost-button annotation-reset" type="button" onClick={resetNewAnnotation}>
          Reset entry
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title-block">
          <div className="title-top-row">
            <div className="title-eyebrow-row">
              <p className="eyebrow">Labor Charting</p>
              {!showGuide && (
                <button className="guide-info-button" type="button" aria-label="Open user guide" title="User guide" onClick={() => setShowGuide(true)}>
                  <Icon name="info" />
                </button>
              )}
            </div>
            {!showGuide && (
              <div className="title-utility-actions">
                <button className="ghost-button compact-title-button" type="button" onClick={loadSample}>
                  Load Sample
                </button>
                <button className="ghost-button compact-title-button" type="button" onClick={saveCurrentChart}>
                  Save
                </button>
                <div className="restore-menu" ref={restoreMenuRef}>
                  <button
                    className="ghost-button compact-title-button"
                    type="button"
                    aria-expanded={showRestoreMenu}
                    aria-haspopup="menu"
                    onClick={() => setShowRestoreMenu((open) => !open)}
                  >
                    Restore
                  </button>
                  {showRestoreMenu && (
                    <div className="restore-options" role="menu" aria-label="Saved patient charts">
                      <div className="restore-menu-heading">
                        <strong>Saved charts</strong>
                        <span>{savedCharts.length}/{MAX_SAVED_CHARTS}</span>
                      </div>
                      {savedCharts.length > 0 ? (
                        savedCharts.map((savedChart) => (
                          <div className="saved-chart-row" key={savedChart.id}>
                            <button type="button" role="menuitem" onClick={() => restoreSavedChart(savedChart)}>
                              {savedChart.label}
                              <span>{formatSavedTimestamp(savedChart.savedAt)} · {savedChart.state.observations.length} records</span>
                            </button>
                            <button className="row-delete saved-chart-delete" type="button" title="Delete saved chart" aria-label={`Delete saved chart ${savedChart.label}`} onClick={() => deleteSavedChart(savedChart)}>
                              <Icon name="trash" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="restore-empty">No saved charts yet.</div>
                      )}
                    </div>
                  )}
                </div>
                <button className="ghost-button compact-title-button" type="button" onClick={resetPatient}>
                  Reset
                </button>
              </div>
            )}
          </div>
          <h1>Friedman&apos;s Curve</h1>
        </div>
        <div className="header-actions" aria-label="Chart actions">
          {showGuide ? (
            <button className="ghost-button" type="button" onClick={() => setShowGuide(false)}>
              Back to chart
            </button>
          ) : (
            <div className="export-menu" ref={exportMenuRef}>
              <button
                className="export-button"
                type="button"
                aria-expanded={showExportMenu}
                aria-haspopup="menu"
                onClick={() => setShowExportMenu((open) => !open)}
              >
                <Icon name="download" />
                Export
              </button>
              {showExportMenu && (
                <div className="export-options" role="menu" aria-label="Export chart">
                  <button type="button" role="menuitem" onClick={() => { window.print(); notify("Print dialog opened."); setShowExportMenu(false); }}>
                    Print chart
                    <span>Use the browser print dialog</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => { downloadPresentationPng(); setShowExportMenu(false); }}>
                    Presentation PNG (16:9)
                    <span>Graph-focused for slides</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => { downloadPng(); setShowExportMenu(false); }}>
                    Full chart PNG
                    <span>Includes patient details</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => { downloadSvg(); setShowExportMenu(false); }}>
                    Download SVG
                    <span>Best for editing</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showGuide ? (
        <GuidePage />
      ) : (
      <div className="desktop-layout">
        <nav className="desktop-rail" aria-label="Desktop section navigation">
          <button type="button" onClick={() => scrollToMobileSection("chart-section")}>
            <span>Chart</span>
          </button>
          <button type="button" onClick={() => scrollToMobileSection("records-section")}>
            <span>Add</span>
          </button>
          <button type="button" onClick={() => scrollToMobileSection("annotations-section")}>
            <span>Annotate</span>
          </button>
          <button type="button" onClick={() => scrollToMobileSection("records-section")}>
            <span>Records</span>
          </button>
          <button type="button" onClick={() => scrollToMobileSection("patient-section")}>
            <span>Patient</span>
          </button>
        </nav>
        <main className="workspace">
        <section className="panel patient-panel" id="patient-section" aria-label="Patient information">
          <div className="panel-heading">
            <h2>Patient</h2>
          </div>

          <div className="patient-grid">
            <label>
              Name
              <input value={state.patient.patientName} autoComplete="off" placeholder="e.g., Maria Santos" type="text" onChange={(event) => updatePatient("patientName", event.target.value)} />
            </label>
            <label>
              Age
              <input value={state.patient.patientAge} autoComplete="off" inputMode="numeric" placeholder="e.g., 24" type="text" onChange={(event) => updatePatient("patientAge", event.target.value)} />
            </label>
            <label>
              OB Score
              <input value={state.patient.patientObScore} autoComplete="off" placeholder="e.g., G1P0" type="text" onChange={(event) => updatePatient("patientObScore", event.target.value)} />
            </label>
            <label>
              AOG
              <input value={state.patient.patientAog} autoComplete="off" placeholder="e.g., 39 2/7 weeks" type="text" onChange={(event) => updatePatient("patientAog", event.target.value)} />
            </label>
            <label className="date-field">
              Date
              <span className="field-help">Admission date</span>
              <input value={state.patient.patientDate} type="date" onChange={(event) => updatePatient("patientDate", event.target.value)} />
            </label>
            <label className="start-time-field">
              Start Time
              <span className="field-help">Time used to start the chart (labor onset, rupture of membranes, or first IE)</span>
              <input value={state.patient.startTime} type="time" onChange={(event) => updatePatient("startTime", event.target.value)} />
            </label>
            <label className="wide">
              Final Diagnosis
              <textarea value={state.patient.finalDiagnosis} autoComplete="off" placeholder="e.g., G1P1, delivered via normal spontaneous vaginal delivery" rows="4" onChange={(event) => updatePatient("finalDiagnosis", event.target.value)} />
            </label>
            <label className="resident-field">
              Resident
              <input value={state.patient.residentName} autoComplete="off" placeholder="e.g., Dr. Santos" type="text" onChange={(event) => updatePatient("residentName", event.target.value)} />
            </label>
          </div>
        </section>

        <section className="chart-panel" id="chart-section" aria-label="Friedman's curve chart">
          <div className="chart-toolbar">
            <div className="legend" aria-label="Chart legend">
              <span>
                <i className="swatch blue" />
                Cervical dilation
              </span>
              <span>
                <i className="swatch red" />
                Station
              </span>
              {SHOW_OXYTOCIN_FEATURE && (
                <span>
                  <i className="swatch amber" />
                  Oxytocin active
                </span>
              )}
            </div>
            <div className="chart-toolbar-actions">
              <div className="chart-status" aria-live="polite">
                {chartData.warningCount
                  ? `${chartData.validCount} plotted, ${chartData.warningCount} out of range`
                  : `${chartData.validCount} observation${chartData.validCount === 1 ? "" : "s"} plotted`}
              </div>
            </div>
          </div>
          <div className="clinical-summary" aria-label="Clinical summary">
            <div className="summary-tile-grid">
              {summary.primary.map(([label, value, tone]) => (
                <div className={`summary-tile ${tone || ""}`} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-scroller" role="button" tabIndex="0" aria-label="Open expanded chart viewer" onClick={openChartViewer} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openChartViewer();
            }
          }}>
            <Chart patient={state.patient} observations={state.observations} annotations={annotations} oxytocinEvents={oxytocinEvents} chartRef={chartRef} />
          </div>
        </section>

        <aside className="panel data-panel" id="records-section" aria-label="Observation data">
          <div className="panel-heading">
            <h2>Observations</h2>
          </div>

          <div className="desktop-entry">{renderNewObservationForm()}</div>

          <div className="recorded-heading">
            <h3>Recorded observations</h3>
            <span>{observations.length ? `${observations.length} record${observations.length === 1 ? "" : "s"}` : "No records yet"}</span>
          </div>

          {observations.length ? (
            <div className="observation-list" aria-label="Recorded observations">
              {observations.map((observation) => {
                const status = pointStatus(observation, state.patient.startTime);
                const rowWarnings = observationWarnings(observation, state.patient.startTime, state.observations, observation.id);
                const hasWarning = rowWarnings.length > 0;
                const isExpanded = expandedObservationId === observation.id;
                const noteText = observation.note.trim();
                const hourText = status.hour === null ? "--" : status.hour.toFixed(1);

                return (
                  <article key={observation.id} className={`observation-card${hasWarning ? " row-warning" : ""}${isExpanded ? " expanded" : ""}`}>
                    <div className="observation-summary-row">
                      <button
                        className="observation-summary"
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`observation-editor-${observation.id}`}
                        onClick={() => setExpandedObservationId(isExpanded ? null : observation.id)}
                      >
                        <span className="observation-time">
                          {formatDisplayTime(observation.time)}
                          <small>Day {normalizedDay(observation.dayOffset)} · Hour {hourText}</small>
                        </span>
                        <span className="observation-metrics" aria-label="Observation values">
                          <span className="observation-metric dilation">
                            <small>Cervix</small>
                            <strong>{observation.dilation === "" ? "--" : `${observation.dilation} cm`}</strong>
                          </span>
                          <span className="observation-metric station">
                            <small>Station</small>
                            <strong>{formatStationValue(observation.station)}</strong>
                          </span>
                        </span>
                        <span className="observation-note-preview">
                          {observation.guideLine && <small>Event</small>}
                          <strong>{noteText || "No note"}</strong>
                        </span>
                      </button>
                      <div className="observation-card-actions">
                        <button
                          className={`observation-toggle${isExpanded ? " close-toggle" : ""}`}
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`observation-editor-${observation.id}`}
                          onClick={() => setExpandedObservationId(isExpanded ? null : observation.id)}
                        >
                          {isExpanded ? "Close" : "Edit"}
                        </button>
                        <button className="row-delete compact-delete" type="button" title="Remove observation" aria-label="Remove observation" onClick={() => deleteObservation(observation)}>
                          <Icon name="trash" />
                        </button>
                      </div>
                    </div>

                    {hasWarning && !isExpanded && (
                      <div className="compact-warning" aria-label="Observation needs attention">
                        Needs attention
                      </div>
                    )}

                    {isExpanded && (
                      <div className="observation-editor" id={`observation-editor-${observation.id}`}>
                        <div className="entry-grid">
                          <label className="entry-time">
                            Time
                            <input value={observation.time} type="time" onChange={(event) => updateObservation(observation.id, "time", event.target.value)} />
                          </label>
                          <label className="entry-day">
                            Day
                            <DaySelect
                              value={observation.dayOffset}
                              ariaLabel={`Day for ${formatDisplayTime(observation.time)}`}
                              onChange={(value) => updateObservation(observation.id, "dayOffset", value)}
                            />
                          </label>
                          <div className="computed-field">
                            <span>Hour</span>
                            <strong>{hourText}</strong>
                          </div>
                          <label className="checkbox-field">
                            Event marker
                            <input checked={Boolean(observation.guideLine)} type="checkbox" title="Mark this event time with a dotted line" aria-label="Mark this event time with a dotted line" onChange={(event) => updateObservation(observation.id, "guideLine", event.target.checked)} />
                          </label>
                          <label className="entry-cervix">
                            Cervix
                            <CervixSelect
                              value={observation.dilation}
                              ariaLabel={`Cervical dilation at ${formatDisplayTime(observation.time)}`}
                              onChange={(value) => updateObservation(observation.id, "dilation", value)}
                            />
                          </label>
                          <label className="entry-station">
                            Station
                            <StationSelect
                              value={observation.station}
                              ariaLabel={`Station at ${formatDisplayTime(observation.time)}`}
                              onChange={(value) => updateObservation(observation.id, "station", value)}
                            />
                          </label>
                          <label className="entry-note">
                            Timeline note
                            <input value={observation.note} placeholder="e.g., Oxytocin started" type="text" onChange={(event) => updateObservation(observation.id, "note", event.target.value)} />
                          </label>
                        </div>
                        {rowWarnings.length > 0 && (
                          <ul className="row-warning-messages">
                            {rowWarnings.map((message) => (
                              <li key={message}>{message}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              No observations yet. Fill out the new observation form above, then tap Add to chart.
            </div>
          )}

          <div className="data-actions">
            <button className="danger-button" type="button" disabled={!observations.length && !annotations.length} onClick={clearObservations}>
              Clear
            </button>
          </div>

          <section className="annotation-section" id="annotations-section" aria-labelledby="annotation-heading">
            <div className="annotation-heading">
              <div>
                <h3 id="annotation-heading">Chart annotations</h3>
                <p>Long clinical narratives shown as callout boxes inside the graph.</p>
              </div>
              <span>{annotations.length} added</span>
            </div>
            {renderAnnotationForm()}

            {annotations.length > 0 && (
              <div className="annotation-list" aria-label="Saved chart annotations">
                {annotations.map((annotation) => {
                  const linkedObservation = state.observations.find((observation) => observation.id === annotation.observationId);
                  const displayTime = linkedObservation?.time || annotation.time;
                  const displayDay = linkedObservation?.dayOffset ?? annotation.dayOffset;
                  const isEditing = editingAnnotationId === annotation.id;

                  return (
                    <article className={`annotation-item ${annotation.type}${isEditing ? " editing" : ""}`} key={annotation.id}>
                      <div className="annotation-item-body">
                        <div>
                          <strong>{formatDisplayTime(displayTime)} · Day {normalizedDay(displayDay)}</strong>
                          <span>{annotationTypeLabel(annotation.type)} · {annotation.targetSeries === "station" ? "Station" : "Cervix"}</span>
                          <p>{annotation.text}</p>
                        </div>
                        {isEditing && (
                          <div className="annotation-edit-form" aria-label={`Edit annotation at ${formatDisplayTime(displayTime)}`}>
                            <label>
                              Attach to observation
                              <select value={annotation.observationId} onChange={(event) => selectSavedAnnotationObservation(annotation.id, event.target.value)}>
                                <option value="">Select a plotted entry</option>
                                {observations.map((observation) => (
                                  <option key={observation.id} value={observation.id}>
                                    {formatDisplayTime(observation.time)} · Day {normalizedDay(observation.dayOffset)} · Cervix {observation.dilation || "--"} · Station {formatStationValue(observation.station)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Connect to
                              <select value={annotation.targetSeries} onChange={(event) => updateAnnotation(annotation.id, "targetSeries", event.target.value)}>
                                <option value="dilation">Cervical dilation point</option>
                                <option value="station">Station point</option>
                              </select>
                            </label>
                            <label>
                              Type
                              <select value={annotation.type} onChange={(event) => updateAnnotation(annotation.id, "type", event.target.value)}>
                                <option value="clinical">Clinical note</option>
                                <option value="medication">Medication</option>
                                <option value="intervention">Intervention</option>
                                <option value="outcome">Outcome / decision</option>
                              </select>
                            </label>
                            <label className="annotation-edit-text">
                              Annotation
                              <textarea value={annotation.text} rows="3" onChange={(event) => updateAnnotation(annotation.id, "text", event.target.value)} />
                            </label>
                          </div>
                        )}
                      </div>
                      <div className="annotation-item-actions">
                        <button
                          className={`ghost-button annotation-edit-toggle${isEditing ? " close-toggle" : ""}`}
                          type="button"
                          aria-expanded={isEditing}
                          onClick={() => setEditingAnnotationId(isEditing ? null : annotation.id)}
                        >
                          {isEditing ? "Close" : "Edit"}
                        </button>
                        <button className="row-delete" type="button" title="Remove chart annotation" aria-label={`Remove annotation at ${formatDisplayTime(displayTime)}`} onClick={() => deleteAnnotation(annotation)}>
                          <Icon name="trash" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {SHOW_OXYTOCIN_FEATURE && (
          <section className="oxytocin-section" aria-labelledby="oxytocin-heading">
            <div className="annotation-heading">
              <div>
                <h3 id="oxytocin-heading">Oxytocin infusion</h3>
                <p>Record starts, rate changes, stops, and resumptions. Follow your facility&apos;s protocol.</p>
              </div>
              <span>{sortedInfusionEvents.length} event{sortedInfusionEvents.length === 1 ? "" : "s"}</span>
            </div>
            <div className="oxytocin-form">
              <label>
                Time
                <input value={newOxytocinEvent.time} type="time" onChange={(event) => updateNewOxytocinEvent("time", event.target.value)} />
              </label>
              <label>
                Day
                <DaySelect value={newOxytocinEvent.dayOffset} onChange={(value) => updateNewOxytocinEvent("dayOffset", value)} />
              </label>
              <label>
                Action
                <select value={newOxytocinEvent.action} onChange={(event) => updateNewOxytocinEvent("action", event.target.value)}>
                  <option value="start">Start</option>
                  <option value="increase">Increase rate</option>
                  <option value="decrease">Decrease rate</option>
                  <option value="stop">Stop / pause</option>
                  <option value="resume">Resume</option>
                </select>
              </label>
              <label>
                Rate
                <input
                  value={newOxytocinEvent.rate}
                  disabled={newOxytocinEvent.action === "stop"}
                  inputMode="decimal"
                  placeholder={newOxytocinEvent.action === "stop" ? "Not required" : "e.g., 2"}
                  type="number"
                  min="0"
                  step="0.1"
                  onChange={(event) => updateNewOxytocinEvent("rate", event.target.value)}
                />
              </label>
              <label>
                Unit
                <select value={newOxytocinEvent.unit} disabled={newOxytocinEvent.action === "stop"} onChange={(event) => updateNewOxytocinEvent("unit", event.target.value)}>
                  <option value="mU/min">mU/min</option>
                  <option value="mL/hr">mL/hr</option>
                  <option value="gtt/min">gtt/min</option>
                </select>
              </label>
              <label className="oxytocin-note">
                Remark (optional)
                <input value={newOxytocinEvent.note} placeholder="e.g., Titrated per order" type="text" onChange={(event) => updateNewOxytocinEvent("note", event.target.value)} />
              </label>
              <button
                className="primary-button oxytocin-add"
                type="button"
                disabled={newOxytocinWarnings.length > 0}
                onClick={addOxytocinEvent}
              >
                Add infusion event
              </button>
            </div>
            {newOxytocinWarnings.length > 0 && (
              <ul className="validation-list" aria-live="polite">
                {newOxytocinWarnings.map((message) => <li key={message}>{message}</li>)}
              </ul>
            )}

            {sortedInfusionEvents.length > 0 && (
              <div className="oxytocin-list" aria-label="Oxytocin infusion events">
                {sortedInfusionEvents.map((event) => (
                  <article className={`oxytocin-item ${event.action}`} key={event.id}>
                    <div className="oxytocin-event-time">
                      <strong>{formatDisplayTime(event.time)}</strong>
                      <span>Day {normalizedDay(event.dayOffset)}</span>
                    </div>
                    <div>
                      <strong>{oxytocinActionLabel(event.action)}</strong>
                      <span>{event.action === "stop" ? "Infusion off" : `${event.rate} ${event.unit}`}</span>
                      {event.note && <p>{event.note}</p>}
                    </div>
                    <button className="row-delete" type="button" title="Remove infusion event" aria-label={`Remove oxytocin event at ${formatDisplayTime(event.time)}`} onClick={() => deleteOxytocinEvent(event.id)}>
                      <Icon name="trash" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
          )}
        </aside>
        </main>
      </div>
      )}
      {!showGuide && (
        <nav className="mobile-bottom-nav" aria-label="Mobile chart navigation">
          <button type="button" onClick={() => scrollToMobileSection("chart-section")}>
            Chart
          </button>
          <button className="mobile-add-button" type="button" onClick={openMobileEntrySheet}>
            Add
          </button>
          <button type="button" onClick={() => scrollToMobileSection("annotations-section")}>
            Annotate
          </button>
          <button type="button" onClick={() => scrollToMobileSection("records-section")}>
            Records
          </button>
          <button type="button" onClick={() => scrollToMobileSection("patient-section")}>
            Patient
          </button>
        </nav>
      )}
      {showChartViewer && (
        <div className="chart-viewer-backdrop" role="presentation" onMouseDown={() => setShowChartViewer(false)}>
          <section className="chart-viewer" role="dialog" aria-modal="true" aria-labelledby="chart-viewer-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="chart-viewer-header">
              <div>
                <p className="eyebrow">Expanded chart</p>
                <h2 id="chart-viewer-title">Friedman&apos;s Curve</h2>
              </div>
              <div className="chart-viewer-actions">
                <span className="chart-zoom-readout" aria-live="polite">{Math.round(chartZoom * 100)}%</span>
                <button className="ghost-button" type="button" onClick={() => setShowChartViewer(false)}>
                  Close
                </button>
              </div>
            </div>
            <div
              className="chart-viewer-scroller"
              onDoubleClick={toggleChartZoom}
              onTouchStart={startChartPinch}
              onTouchMove={moveChartPinch}
              onTouchEnd={endChartPinch}
              onTouchCancel={endChartPinch}
            >
              <div className="chart-viewer-canvas" style={{ width: `${Math.round(chartZoom * 100)}%` }}>
                <Chart patient={state.patient} observations={state.observations} annotations={annotations} oxytocinEvents={oxytocinEvents} chartId="expandedCurveChart" />
              </div>
            </div>
          </section>
        </div>
      )}
      {showMobileEntrySheet && (
        <div className="mobile-entry-backdrop" role="presentation" onMouseDown={() => setShowMobileEntrySheet(false)}>
          <section className="mobile-entry-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-entry-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-heading">
              <h2 id="mobile-entry-title">Add observation</h2>
              <button className="row-delete close-button" type="button" aria-label="Close add observation" onClick={() => setShowMobileEntrySheet(false)}>
                X
              </button>
            </div>
            {renderNewObservationForm("sheet")}
          </section>
        </div>
      )}
      {showMobileAnnotationSheet && (
        <div className="mobile-entry-backdrop" role="presentation" onMouseDown={() => setShowMobileAnnotationSheet(false)}>
          <section className="mobile-entry-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-annotation-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-heading">
              <h2 id="mobile-annotation-title">Add annotation</h2>
              <button className="row-delete close-button" type="button" aria-label="Close add annotation" onClick={() => setShowMobileAnnotationSheet(false)}>
                X
              </button>
            </div>
            {renderAnnotationForm("sheet")}
          </section>
        </div>
      )}
      {confirmation && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setConfirmation(null)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" onMouseDown={(event) => event.stopPropagation()}>
            <div className="confirm-icon" aria-hidden="true">!</div>
            <div className="confirm-copy">
              <h2 id="confirm-title">
                {confirmationTitle}
              </h2>
              <p id="confirm-message">
                {confirmationMessage}
              </p>
              {confirmationType === "delete-observation" && (
                <dl className="confirm-details" aria-label="Observation to delete">
                  {confirmationObservationDetails.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {confirmationType === "delete-annotation" && (
                <dl className="confirm-details" aria-label="Annotation to delete">
                  {confirmationAnnotationDetails.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {["save-chart-limit", "restore-chart", "delete-saved-chart"].includes(confirmationType) && (
                <dl className="confirm-details" aria-label="Saved chart details">
                  {confirmationSavedChartDetails.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div className="confirm-actions">
              <button className="ghost-button" type="button" onClick={() => setConfirmation(null)}>
                Cancel
              </button>
              <button className={`${confirmationIsDestructive ? "danger-button confirm-danger" : "primary-button"}`} type="button" onClick={confirmPendingAction}>
                {confirmationActionLabel}
              </button>
            </div>
          </section>
        </div>
      )}
      {notification && (
        <div className={`app-toast ${notification.tone}`} role="status" aria-live="polite">
          {notification.message}
        </div>
      )}
    </div>
  );
}

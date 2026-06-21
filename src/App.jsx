import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "friedmans-curve-builder-v2";
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
    observations: []
  };
}

function makeSampleState() {
  const sample = makeDefaultState();

  return {
    patient: {
      ...sample.patient,
      patientName: "Juana Dela Cruz",
      patientAge: "23",
      patientObScore: "G1P0",
      patientAog: "40 2/7 weeks",
      finalDiagnosis:
        "1. G1P1(1001), Pregnancy Uterine, delivered by Normal Spontaneous Vaginal Delivery with mediolateral episiotomy and repair under local anesthesia, male, cephalic, term, appropriate for gestational age ",
      residentName: "Dr. Yu"
    },
    observations: [
      createObservation({ time: "07:30", dayOffset: "0", dilation: "4", station: "-3", note: "Admission" }),
      createObservation({ time: "10:30", dayOffset: "0", dilation: "5", station: "-3", note: "oxytocin @ 8gtt/min" }),
      createObservation({ time: "13:30", dayOffset: "0", dilation: "5", station: "-3", note: "" }),
      createObservation({ time: "15:00", dayOffset: "0", dilation: "7", station: "-2", guideLine: true, note: "evening primerose 3 caps" }),
      createObservation({ time: "15:30", dayOffset: "0", dilation: "8", station: "-1" }),
      createObservation({ time: "15:50", dayOffset: "0", dilation: "10", station: "0", note: "mount" }),
      createObservation({ time: "16:10", dayOffset: "0", dilation: "10", station: "5", guideLine: true, note: "baby out" })
    ]
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const defaults = makeDefaultState();

    if (!stored || !stored.patient || !Array.isArray(stored.observations)) {
      return defaults;
    }

    return {
      patient: { ...defaults.patient, ...stored.patient },
      observations: stored.observations.map(createObservation)
    };
  } catch {
    return makeDefaultState();
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

function sortedObservations(observations, startTime) {
  return [...observations].sort((a, b) => {
    const hourA = hourFromStart(a.time, startTime, a.dayOffset);
    const hourB = hourFromStart(b.time, startTime, b.dayOffset);
    return (hourA ?? 99) - (hourB ?? 99);
  });
}

function buildSvgData(patient, observations) {
  const baseWidth = 1200;
  const height = 850;
  const left = 92;
  const top = 226;
  const bottom = 734;
  const hourWidth = 57;
  const maxObservationHour = Math.max(
    18,
    ...observations.map((observation) => {
      const hour = hourFromStart(observation.time, patient.startTime, observation.dayOffset);
      return hour !== null && hour >= 0 ? Math.ceil(hour) : 0;
    })
  );
  const maxHour = Math.max(18, maxObservationHour);
  const width = Math.max(baseWidth, left + maxHour * hourWidth + 80);
  const grid = {
    left,
    top,
    right: width - 80,
    bottom
  };
  const gridWidth = grid.right - grid.left;
  const gridHeight = grid.bottom - grid.top;
  const xForHour = (hour) => grid.left + (clamp(hour, 0, maxHour) / maxHour) * gridWidth;
  const yForDilation = (dilation) => grid.bottom - (clamp(dilation, 0, 10) / 10) * gridHeight;
  const yForStation = (station) => grid.top + ((clamp(station, -5, 5) + 5) / 10) * gridHeight;
  const dilationPoints = [];
  const stationPoints = [];
  const guideLines = [];
  const notes = [];
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
        x: xForHour(status.hour),
        y: yForDilation(status.dilation),
        value: status.dilation
      });
    }

    if (status.station !== null) {
      stationPoints.push({
        x: xForHour(status.hour),
        y: yForStation(status.station),
        value: status.station
      });
    }

    if (observation.note.trim()) {
      notes.push({
        x: xForHour(status.hour),
        text: observation.note.trim()
      });
    }
  });

  return {
    width,
    height,
    grid,
    xForHour,
    yForDilation,
    timeFromHour: (hour) => timeFromStart(hour, patient.startTime),
    maxHour,
    dilationPoints,
    stationPoints,
    guideLines,
    notes,
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

function wrapHeaderValue(value, maxChars, maxLines = 5) {
  const lines = wrapText(value || "", maxChars);

  if (lines.length <= maxLines) return lines;

  const visibleLines = lines.slice(0, maxLines);
  const lastLine = visibleLines.at(-1) || "";
  visibleLines[visibleLines.length - 1] = `${lastLine.slice(0, Math.max(0, maxChars - 3))}...`;
  return visibleLines;
}

function Chart({ patient, observations, chartRef }) {
  const data = useMemo(() => buildSvgData(patient, observations), [patient, observations]);
  const { width, grid } = data;
  const info = [
    ["Name", patient.patientName, 300],
    ["Age", patient.patientAge, 145],
    ["OB score", patient.patientObScore, 145],
    ["AOG", patient.patientAog, 210],
    ["Date", patient.patientDate, 145]
  ];
  const headerLineHeight = 16;
  const headerItems = info.map(([label, value, slotWidth]) => {
    const maxChars = Math.max(5, Math.floor((slotWidth - 88) / 7.6));
    return {
      label,
      lines: wrapHeaderValue(value, maxChars),
      slotWidth
    };
  });
  const maxHeaderLines = Math.max(...headerItems.map((item) => item.lines.length));
  let cursorX = grid.left;
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

  return (
    <svg
      id="curveChart"
      ref={chartRef}
      role="img"
      aria-label="Generated Friedman's curve"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ minWidth: `${width}px`, aspectRatio: `${width} / ${height}` }}
    >
      <rect width={width} height={height} fill="#ffffff" />
      <text x={width / 2} y="42" textAnchor="middle" fontSize="27" fontWeight="900" fill="#111820">
        FRIEDMAN&apos;S CURVE
      </text>
      <text x={width / 2} y="65" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4f5865">
        Generated chart
      </text>

      {headerItems.map(({ label, lines, slotWidth }) => {
        const x = cursorX;
        cursorX += slotWidth;

        return (
          <g key={label}>
            <text x={x} y="105" fontSize="14" fontWeight="900" fill="#1c1f24">
              {label}:
            </text>
            <text x={x + 74} y="105" fontSize="15" fontWeight="700" fill="#1c1f24">
              {lines.map((line, index) => (
                <tspan key={`${line}-${index}`} x={x + 74} dy={index === 0 ? 0 : headerLineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
            <line x1={x + 72} y1="110" x2={x + slotWidth - 14} y2="110" stroke="#1c1f24" strokeWidth="1.5" />
          </g>
        );
      })}

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
      <NoteLabels notes={data.notes} grid={grid} />
      <Series points={data.dilationPoints} color="#0f63ce" marker="circle" />
      <Series points={data.stationPoints} color="#c62828" marker="cross" />

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
  );
}

function NoteLabels({ notes, grid }) {
  const columnWidth = 13;
  const lanes = Array.from({ length: 4 }, (_, index) => ({
    y: grid.top - 12 - index * 22,
    endX: grid.left
  }));
  const layouts = notes
    .slice(0, 16)
    .map((note) => {
      const noteLines = wrapText(note.text, 14);
      const visibleLines =
        noteLines.length > 6
          ? [...noteLines.slice(0, 5), `${noteLines.slice(5).join(" ").slice(0, 13)}...`]
          : noteLines;
      const width = visibleLines.length * columnWidth;
      const naturalX = note.x + 4;
      const candidates = lanes.map((lane, laneIndex) => {
        const x = Math.max(naturalX, lane.endX + 8);
        return {
          laneIndex,
          x,
          fits: x + width <= grid.right - 4
        };
      });
      const placement = candidates.find((candidate) => candidate.fits) || candidates.reduce((best, candidate) => (candidate.x < best.x ? candidate : best));
      const lane = lanes[placement.laneIndex];
      const labelX = Math.min(placement.x, Math.max(grid.left + 4, grid.right - width - 4));

      lane.endX = labelX + width;

      return {
        ...note,
        labelX,
        y: lane.y,
        visibleLines
      };
    });

  return layouts.map((note) => {
    const y = note.y;

    return (
      <g key={`${note.x}-${note.text}`}>
        <polyline points={`${note.x},${grid.top} ${note.x},${y + 3} ${note.labelX},${y + 3}`} fill="none" stroke="#9aa3af" strokeWidth="1" />
        {note.visibleLines.map((line, lineIndex) => {
          const x = note.labelX + lineIndex * columnWidth;

          return (
            <text key={`${line}-${lineIndex}`} x={x} y={y} fontSize="11" fontWeight="800" fill="#3e4650" textAnchor="start" transform={`rotate(-90 ${x} ${y})`}>
              {line}
            </text>
          );
        })}
      </g>
    );
  });
}

function Series({ points, color, marker }) {
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
          <circle key={`${marker}-${index}`} cx={point.x} cy={point.y} r="8" fill="#fff" stroke={color} strokeWidth="3" />
        ) : (
          <g key={`${marker}-${index}`}>
            <line x1={point.x - 9} y1={point.y - 9} x2={point.x + 9} y2={point.y + 9} stroke={color} strokeWidth="3" strokeLinecap="round" />
            <line x1={point.x + 9} y1={point.y - 9} x2={point.x - 9} y2={point.y + 9} stroke={color} strokeWidth="3" strokeLinecap="round" />
          </g>
        )
      )}
    </>
  );
}

function Icon({ name }) {
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

  if (name === "svg") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
        <path d="M6 3h12v5H6z" />
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

function GuidePage({ onBack }) {
  return (
    <main className="guide-page">
      <section className="panel guide-panel" aria-labelledby="guide-title">
        <div className="guide-heading">
          <div>
            <p className="eyebrow">User Guide</p>
            <h2 id="guide-title">How to use the Friedman&apos;s Curve Builder</h2>
          </div>
          <button className="primary-button" type="button" onClick={onBack}>
            Back to chart
          </button>
        </div>

        <div className="guide-grid">
          <article>
            <h3>Patient Details</h3>
            <p>Fill in the patient panel first. Long names, AOG, OB score, and final diagnosis text wrap automatically on the generated chart.</p>
            <ul>
              <li>Name, Age, OB Score, AOG, Date, Start Time</li>
              <li>Final Diagnosis for the lower chart text</li>
              <li>Resident for the signature line</li>
            </ul>
          </article>

          <article>
            <h3>Observations</h3>
            <p>Each row can plot cervical dilation, station, notes, or a timestamp guide line.</p>
            <ul>
              <li>Time is the clock time of the event.</li>
              <li>Day is 0 for the start date, 1 for the next day, 2 for the day after that.</li>
              <li>Hour is calculated automatically from Start Time, Time, and Day.</li>
              <li>Cervix accepts 0 to 10.</li>
              <li>Station accepts -5 to 5.</li>
            </ul>
          </article>

          <article>
            <h3>Guide Button</h3>
            <p>Check Guide on an observation row to draw a dotted vertical line at that timestamp, like the paper sample chart.</p>
            <ul>
              <li>Use it for admission, oxytocin, medication, procedures, mount, or baby out.</li>
              <li>It can be used even when the row only has a time and note.</li>
            </ul>
          </article>

          <article>
            <h3>Notes</h3>
            <p>Notes appear above the graph as vertical labels. Long notes wrap into small columns, and close notes are staggered to reduce overlap.</p>
          </article>

          <article>
            <h3>Long Labor</h3>
            <p>If labor continues past midnight, enter the next clock time and set Day to 1. The graph expands horizontally when observations go beyond 18 hours.</p>
            <p>Example: Start Time 07:30, Time 08:30, Day 1 plots at hour 25.</p>
          </article>

          <article>
            <h3>Export</h3>
            <p>Use the header buttons to print, download SVG, or download PNG. Print is set up for landscape A4 or short bond paper.</p>
            <ul>
              <li>Print opens the browser print dialog.</li>
              <li>SVG is best for crisp editing or archiving.</li>
              <li>PNG is best for sharing as an image.</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}

function serializeSvg(chartNode) {
  const clone = chartNode.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
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
  const [showGuide, setShowGuide] = useState(false);
  const chartRef = useRef(null);
  const observations = useMemo(
    () => sortedObservations(state.observations, state.patient.startTime),
    [state.observations, state.patient.startTime]
  );
  const chartData = useMemo(
    () => buildSvgData(state.patient, state.observations),
    [state.patient, state.observations]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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

  const addObservation = () => {
    setState((current) => {
      const sorted = sortedObservations(current.observations, current.patient.startTime);
      const last = sorted.at(-1);
      const lastHour = last ? hourFromStart(last.time, current.patient.startTime, last.dayOffset) : null;
      const nextHour = lastHour === null ? 0 : lastHour + 1;
      const nextTime = timeFromStart(nextHour, current.patient.startTime);
      const nextDayOffset = dayOffsetFromStartHour(nextHour, current.patient.startTime);

      return {
        ...current,
        observations: [...current.observations, createObservation({ time: nextTime, dayOffset: nextDayOffset ? String(nextDayOffset) : "" })]
      };
    });
  };

  const deleteObservation = (id) => {
    setState((current) => ({
      ...current,
      observations: current.observations.filter((observation) => observation.id !== id)
    }));
  };

  const loadSample = () => {
    setState(makeSampleState());
  };

  const resetPatient = () => {
    setState((current) => ({
      ...current,
      patient: makeDefaultState().patient
    }));
  };

  const downloadSvg = () => {
    if (!chartRef.current) return;
    download("friedmans-curve.svg", serializeSvg(chartRef.current), "image/svg+xml;charset=utf-8");
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
      }, "image/png");
    };

    image.src = url;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Labor Charting</p>
          <h1>Friedman&apos;s Curve</h1>
        </div>
        <div className="header-actions" aria-label="Chart actions">
          {showGuide ? (
            <button className="ghost-button" type="button" onClick={() => setShowGuide(false)}>
              Back to chart
            </button>
          ) : (
            <>
              <button className="ghost-button" type="button" onClick={() => setShowGuide(true)}>
                User Guide
              </button>
              <button className="icon-button" type="button" title="Print chart" aria-label="Print chart" onClick={() => window.print()}>
                <Icon name="print" />
              </button>
              <button className="icon-button" type="button" title="Download SVG" aria-label="Download SVG" onClick={downloadSvg}>
                <Icon name="svg" />
              </button>
              <button className="icon-button" type="button" title="Download PNG" aria-label="Download PNG" onClick={downloadPng}>
                <Icon name="png" />
              </button>
            </>
          )}
        </div>
      </header>

      {showGuide ? (
        <GuidePage onBack={() => setShowGuide(false)} />
      ) : (
      <main className="workspace">
        <section className="panel patient-panel" aria-label="Patient information">
          <div className="panel-heading">
            <h2>Patient</h2>
            <button className="ghost-button" type="button" onClick={resetPatient}>
              Reset
            </button>
          </div>

          <div className="patient-grid">
            <label>
              Name
              <input value={state.patient.patientName} autoComplete="off" type="text" onChange={(event) => updatePatient("patientName", event.target.value)} />
            </label>
            <label>
              Age
              <input value={state.patient.patientAge} autoComplete="off" inputMode="numeric" type="text" onChange={(event) => updatePatient("patientAge", event.target.value)} />
            </label>
            <label>
              OB Score
              <input value={state.patient.patientObScore} autoComplete="off" type="text" onChange={(event) => updatePatient("patientObScore", event.target.value)} />
            </label>
            <label>
              AOG
              <input value={state.patient.patientAog} autoComplete="off" type="text" onChange={(event) => updatePatient("patientAog", event.target.value)} />
            </label>
            <label>
              Date
              <input value={state.patient.patientDate} type="date" onChange={(event) => updatePatient("patientDate", event.target.value)} />
            </label>
            <label>
              Start Time
              <input value={state.patient.startTime} type="time" onChange={(event) => updatePatient("startTime", event.target.value)} />
            </label>
            <label className="wide">
              Final Diagnosis
              <textarea value={state.patient.finalDiagnosis} autoComplete="off" rows="4" onChange={(event) => updatePatient("finalDiagnosis", event.target.value)} />
            </label>
            <label>
              Resident
              <input value={state.patient.residentName} autoComplete="off" type="text" onChange={(event) => updatePatient("residentName", event.target.value)} />
            </label>
          </div>
        </section>

        <section className="chart-panel" aria-label="Friedman's curve chart">
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
            </div>
            <div className="chart-status" aria-live="polite">
              {chartData.warningCount
                ? `${chartData.validCount} plotted, ${chartData.warningCount} out of range`
                : `${chartData.validCount} observation${chartData.validCount === 1 ? "" : "s"} plotted`}
            </div>
          </div>
          <div className="chart-scroller">
            <Chart patient={state.patient} observations={state.observations} chartRef={chartRef} />
          </div>
        </section>

        <aside className="panel data-panel" aria-label="Observation data">
          <div className="panel-heading">
            <h2>Observations</h2>
            <button className="primary-button" type="button" onClick={addObservation}>
              Add
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Day</th>
                  <th scope="col">Hour</th>
                  <th scope="col">Cervix</th>
                  <th scope="col">Station</th>
                  <th scope="col">Guide</th>
                  <th scope="col">Note</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {observations.map((observation) => {
                  const status = pointStatus(observation, state.patient.startTime);
                  const hasWarning = !status.validTime || !status.validDilation || !status.validStation;

                  return (
                    <tr key={observation.id} className={hasWarning ? "row-warning" : undefined}>
                      <td>
                        <input value={observation.time} type="time" onChange={(event) => updateObservation(observation.id, "time", event.target.value)} />
                      </td>
                      <td>
                        <input value={observation.dayOffset} inputMode="numeric" type="number" min="0" step="1" onChange={(event) => updateObservation(observation.id, "dayOffset", event.target.value)} />
                      </td>
                      <td className="hour-cell">{status.hour === null ? "--" : status.hour.toFixed(1)}</td>
                      <td>
                        <input value={observation.dilation} inputMode="decimal" type="number" min="0" max="10" step="0.5" onChange={(event) => updateObservation(observation.id, "dilation", event.target.value)} />
                      </td>
                      <td>
                        <input value={observation.station} inputMode="decimal" type="number" min="-5" max="5" step="1" onChange={(event) => updateObservation(observation.id, "station", event.target.value)} />
                      </td>
                      <td className="checkbox-cell">
                        <input checked={Boolean(observation.guideLine)} type="checkbox" title="Show dotted timestamp guide" aria-label="Show dotted timestamp guide" onChange={(event) => updateObservation(observation.id, "guideLine", event.target.checked)} />
                      </td>
                      <td>
                        <input value={observation.note} type="text" onChange={(event) => updateObservation(observation.id, "note", event.target.value)} />
                      </td>
                      <td>
                        <button className="row-delete" type="button" title="Remove observation" aria-label="Remove observation" onClick={() => deleteObservation(observation.id)}>
                          X
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="data-actions">
            <button className="ghost-button" type="button" onClick={loadSample}>
              Load Sample
            </button>
            <button className="danger-button" type="button" onClick={() => setState((current) => ({ ...current, observations: [] }))}>
              Clear
            </button>
          </div>
        </aside>
      </main>
      )}
    </div>
  );
}

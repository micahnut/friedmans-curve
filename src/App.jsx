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
    dilation: values.dilation ?? "",
    station: values.station ?? "",
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
    observations: [
      createObservation({ time: "07:30", dilation: "4", station: "-3", note: "Admission" }),
      createObservation({ time: "10:30", dilation: "5", station: "-3", note: "" }),
      createObservation({ time: "13:30", dilation: "5", station: "-3", note: "" }),
      createObservation({ time: "15:00", dilation: "7", station: "-2", note: "" }),
      createObservation({ time: "15:30", dilation: "8", station: "-1", note: "" })
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

function hourFromStart(time, startTime) {
  const start = minutesFromTime(startTime);
  let current = minutesFromTime(time);

  if (start === null || current === null) return null;
  if (current < start) current += 24 * 60;

  return (current - start) / 60;
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
  const hour = hourFromStart(observation.time, startTime);
  const dilation = numberOrNull(observation.dilation);
  const station = numberOrNull(observation.station);

  const validTime = hour !== null && hour >= 0 && hour <= 18;
  const validDilation = dilation === null || (dilation >= 0 && dilation <= 10);
  const validStation = station === null || (station >= -5 && station <= 5);

  return { hour, dilation, station, validTime, validDilation, validStation };
}

function sortedObservations(observations, startTime) {
  return [...observations].sort((a, b) => {
    const hourA = hourFromStart(a.time, startTime);
    const hourB = hourFromStart(b.time, startTime);
    return (hourA ?? 99) - (hourB ?? 99);
  });
}

function buildSvgData(patient, observations) {
  const width = 1200;
  const height = 760;
  const grid = {
    left: 92,
    top: 142,
    right: 1120,
    bottom: 650
  };
  const gridWidth = grid.right - grid.left;
  const gridHeight = grid.bottom - grid.top;
  const xForHour = (hour) => grid.left + (clamp(hour, 0, 18) / 18) * gridWidth;
  const yForDilation = (dilation) => grid.bottom - (clamp(dilation, 0, 10) / 10) * gridHeight;
  const yForStation = (station) => grid.top + ((clamp(station, -5, 5) + 5) / 10) * gridHeight;
  const dilationPoints = [];
  const stationPoints = [];
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
    dilationPoints,
    stationPoints,
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

function Chart({ patient, observations, chartRef }) {
  const data = useMemo(() => buildSvgData(patient, observations), [patient, observations]);
  const { width, height, grid } = data;
  const info = [
    ["Name", patient.patientName, 300],
    ["Age", patient.patientAge, 145],
    ["OB score", patient.patientObScore, 145],
    ["AOG", patient.patientAog, 210],
    ["Date", patient.patientDate, 145]
  ];
  let cursorX = grid.left;

  return (
    <svg
      id="curveChart"
      ref={chartRef}
      role="img"
      aria-label="Generated Friedman's curve"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={width} height={height} fill="#ffffff" />
      <text x={width / 2} y="42" textAnchor="middle" fontSize="27" fontWeight="900" fill="#111820">
        FRIEDMAN&apos;S CURVE
      </text>
      <text x={width / 2} y="65" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4f5865">
        Generated chart
      </text>

      {info.map(([label, value, slotWidth]) => {
        const x = cursorX;
        cursorX += slotWidth;

        return (
          <g key={label}>
            <text x={x} y="105" fontSize="14" fontWeight="900" fill="#1c1f24">
              {label}:
            </text>
            <text x={x + 74} y="105" fontSize="15" fontWeight="700" fill="#1c1f24">
              {value || ""}
            </text>
            <line x1={x + 72} y1="110" x2={x + slotWidth - 14} y2="110" stroke="#1c1f24" strokeWidth="1.5" />
          </g>
        );
      })}

      {Array.from({ length: 19 }, (_, hour) => {
        const x = data.xForHour(hour);
        const isEdge = hour === 0 || hour === 18;

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

      <text x="36" y="286" fontSize="15" fontWeight="900" fill="#111820" transform="rotate(-90 36 286)">
        CERVICAL DILATATION (CM)
      </text>
      <text x="1164" y="344" fontSize="15" fontWeight="900" fill="#111820" transform="rotate(90 1164 344)">
        STATION
      </text>
      <text x={(grid.left + grid.right) / 2} y="720" textAnchor="middle" fontSize="15" fontWeight="900" fill="#111820">
        TIME (HOURS)
      </text>
      <text x={grid.left} y="126" fontSize="12" fontWeight="900" fill="#0f63ce">
        Blue: cervical dilation
      </text>
      <text x={grid.left + 168} y="126" fontSize="12" fontWeight="900" fill="#c62828">
        Red: station
      </text>

      <NoteLabels notes={data.notes} grid={grid} />
      <Series points={data.dilationPoints} color="#0f63ce" marker="circle" />
      <Series points={data.stationPoints} color="#c62828" marker="cross" />

      {(patient.finalDiagnosis || patient.residentName) && (
        <>
          <text x={grid.left} y="736" fontSize="13" fontWeight="900" fill="#111820">
            Final Diagnosis: {patient.finalDiagnosis || ""}
          </text>
          <text x={grid.right} y="736" textAnchor="end" fontSize="13" fontWeight="900" fill="#111820">
            {patient.residentName ? `Resident: ${patient.residentName}` : ""}
          </text>
        </>
      )}
    </svg>
  );
}

function NoteLabels({ notes, grid }) {
  return notes.slice(0, 16).map((note, index) => {
    const y = grid.top - 12 - (index % 2) * 13;
    const text = note.text.length > 28 ? `${note.text.slice(0, 27)}...` : note.text;

    return (
      <g key={`${note.x}-${note.text}`}>
        <line x1={note.x} y1={grid.top} x2={note.x} y2={y + 3} stroke="#9aa3af" strokeWidth="1" />
        <text
          x={note.x + 4}
          y={y}
          fontSize="11"
          fontWeight="800"
          fill="#3e4650"
          transform={`rotate(-65 ${note.x + 4} ${y})`}
        >
          {text}
        </text>
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
      const lastHour = last ? hourFromStart(last.time, current.patient.startTime) : null;
      const nextTime = lastHour === null ? current.patient.startTime : timeFromStart(lastHour + 1, current.patient.startTime);

      return {
        ...current,
        observations: [...current.observations, createObservation({ time: nextTime })]
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
    const sample = makeDefaultState();
    sample.patient.patientName = "Sample Patient";
    sample.patient.patientAge = "23";
    sample.patient.patientObScore = "G4P3";
    sample.patient.patientAog = "40 2/7 weeks";
    setState(sample);
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
      const canvas = document.createElement("canvas");
      canvas.width = 2400;
      canvas.height = 1520;

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
          <button className="icon-button" type="button" title="Print chart" aria-label="Print chart" onClick={() => window.print()}>
            <Icon name="print" />
          </button>
          <button className="icon-button" type="button" title="Download SVG" aria-label="Download SVG" onClick={downloadSvg}>
            <Icon name="svg" />
          </button>
          <button className="icon-button" type="button" title="Download PNG" aria-label="Download PNG" onClick={downloadPng}>
            <Icon name="png" />
          </button>
        </div>
      </header>

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
              <input value={state.patient.finalDiagnosis} autoComplete="off" type="text" onChange={(event) => updatePatient("finalDiagnosis", event.target.value)} />
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
                  <th scope="col">Hour</th>
                  <th scope="col">Cervix</th>
                  <th scope="col">Station</th>
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
                      <td className="hour-cell">{status.hour === null ? "--" : status.hour.toFixed(1)}</td>
                      <td>
                        <input value={observation.dilation} inputMode="decimal" type="number" min="0" max="10" step="0.5" onChange={(event) => updateObservation(observation.id, "dilation", event.target.value)} />
                      </td>
                      <td>
                        <input value={observation.station} inputMode="decimal" type="number" min="-5" max="5" step="1" onChange={(event) => updateObservation(observation.id, "station", event.target.value)} />
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
    </div>
  );
}

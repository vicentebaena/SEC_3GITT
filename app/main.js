const controls = {
  modeSelect: document.querySelector("#modeSelect"),
  iterations: document.querySelector("#iterations"),
  wordLength: document.querySelector("#wordLength"),
  fractionalBits: document.querySelector("#fractionalBits"),
  lutWidth: document.querySelector("#lutWidth"),
  angle: document.querySelector("#angle"),
  inputX: document.querySelector("#inputX"),
  inputY: document.querySelector("#inputY"),
};

const outputs = {
  iterations: document.querySelector("#iterationsOut"),
  wordLength: document.querySelector("#wordLengthOut"),
  fractionalBits: document.querySelector("#fractionalBitsOut"),
  lutWidth: document.querySelector("#lutWidthOut"),
  angle: document.querySelector("#angleOut"),
  helpTitle: document.querySelector("#helpTitle"),
  helpText: document.querySelector("#helpText"),
  runStatus: document.querySelector("#runStatus"),
  stageTitle: document.querySelector("#stageTitle"),
  stageSubtitle: document.querySelector("#stageSubtitle"),
  metricIteration: document.querySelector("#metricIteration"),
  metricAngleError: document.querySelector("#metricAngleError"),
  metricVectorError: document.querySelector("#metricVectorError"),
  metricGain: document.querySelector("#metricGain"),
  iterationTable: document.querySelector("#iterationTable"),
  busDiagram: document.querySelector("#busDiagram"),
  vhdlCode: document.querySelector("#vhdlCode"),
  playPause: document.querySelector("#playPause"),
};

const tabs = [...document.querySelectorAll(".tab")];
const vectorCanvas = document.querySelector("#cordicCanvas");
const errorCanvas = document.querySelector("#errorCanvas");
const vectorCtx = vectorCanvas.getContext("2d");
const errorCtx = errorCanvas.getContext("2d");

const help = {
  mode: {
    title: "Modo CORDIC",
    text: "En rotación, el circuito consume un ángulo z y gira el vector de entrada. En vectorización, fuerza y hacia cero y acumula en z el ángulo del vector. Es la misma arquitectura con una regla de decisión distinta.",
  },
  iterations: {
    title: "Número de iteraciones",
    text: "Cada iteración añade una microrrotación atan(2^-i). Más iteraciones reducen el error angular, pero aumentan latencia, registros y consumo. La gráfica permite ver cuándo deja de compensar seguir iterando.",
  },
  wordLength: {
    title: "Ancho de palabra",
    text: "Define el tamaño total de los registros x, y y z. Si es pequeño, aparecen saturación y cuantización gruesa; si crece, mejora la precisión a costa de más área hardware.",
  },
  fractionalBits: {
    title: "Bits fraccionales",
    text: "Controla N en el formato de punto fijo (M,N). Muchos bits fraccionales reducen el escalón de cuantización, aunque dejan menos margen entero para señales grandes.",
  },
  lutWidth: {
    title: "Ancho de la LUT atan",
    text: "Define cuántos bits se usan para guardar los valores atan(2^-i). Si la LUT angular es estrecha, z acumula ángulos cuantizados y el error puede dejar de bajar aunque aumenten las iteraciones.",
  },
  angle: {
    title: "Ángulo objetivo",
    text: "En modo rotación es el ángulo que se desea sintetizar. En modo vectorización se usa como referencia visual para comparar contra el ángulo realmente medido por el algoritmo.",
  },
  inputX: {
    title: "Componente X inicial",
    text: "Representa la entrada del registro x. En comunicaciones puede ser la componente en fase I de una muestra compleja.",
  },
  inputY: {
    title: "Componente Y inicial",
    text: "Representa la entrada del registro y. En comunicaciones puede ser la componente en cuadratura de una muestra compleja. En vectorización, CORDIC intenta anularla.",
  },
  busData: {
    title: "Bus de datos en punto fijo",
    text: "Este bus transporta una componente x o y como entero con signo en complemento a dos. El formato se escribe como (M,N): M es el número total de bits del bus y N los bits fraccionales. El valor real se obtiene dividiendo el entero almacenado por 2^N.",
  },
  busAngle: {
    title: "Bus angular en punto fijo",
    text: "El bus z usa su propio ancho, ANGLE_WIDTH, porque los ángulos no tienen por qué compartir precisión con x e y. También se expresa como (M,N): M bits totales para el acumulador angular y N bits fraccionales para la resolución en radianes.",
  },
  busLut: {
    title: "Entrada de la LUT atan",
    text: "Este valor es atan(2^-i) cuantizado con el ancho de la LUT. En una arquitectura iterativa se lee una posición distinta de la tabla en cada ciclo y se suma o resta al acumulador z.",
  },
  busShift: {
    title: "Desplazador aritmético",
    text: "CORDIC evita multiplicadores usando desplazamientos. Desplazar x o y i posiciones equivale a multiplicar por 2^-i, manteniendo el signo en complemento a dos.",
  },
  busDecision: {
    title: "Decisión dᵢ",
    text: "La señal dᵢ selecciona si la etapa suma o resta. En rotación depende del signo de zᵢ; en vectorización depende del signo de yᵢ para empujar la componente y hacia cero.",
  },
};

let state = {};
let frames = [];
let activeStep = 0;
let playing = false;
let lastFrame = 0;
let audioContext = null;
const animationIntervalMs = 1450;

function q(value, fractionalBits, wordLength) {
  const scale = 2 ** fractionalBits;
  const max = 2 ** (wordLength - 1) - 1;
  const min = -(2 ** (wordLength - 1));
  const fixed = Math.max(min, Math.min(max, Math.round(value * scale)));
  return fixed / scale;
}

function qAngle(value, lutWidth) {
  return q(value, lutWidth - 3, lutWidth);
}

function ensureAudioContext() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return null;
  if (!audioContext) audioContext = new AudioEngine();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playIterationTick() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(920, now);
  oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.045);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.075, now + 0.006);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.06);
}

function fixedInfo(value, fractionalBits, width) {
  const scale = 2 ** fractionalBits;
  const max = 2 ** (width - 1) - 1;
  const min = -(2 ** (width - 1));
  const raw = Math.max(min, Math.min(max, Math.round(value * scale)));
  const unsigned = raw < 0 ? 2 ** width + raw : raw;
  const hexDigits = Math.ceil(width / 4);
  const binary = unsigned.toString(2).padStart(width, "0");
  return {
    raw,
    hex: `0x${unsigned.toString(16).toUpperCase().padStart(hexDigits, "0")}`,
    binary: binary.replace(/(.{4})/g, "$1 ").trim(),
    q: `(${width},${fractionalBits})`,
  };
}

function gain(iterations) {
  let k = 1;
  for (let i = 0; i < iterations; i += 1) {
    k *= 1 / Math.sqrt(1 + 2 ** (-2 * i));
  }
  return k;
}

function simulate() {
  const mode = controls.modeSelect.value;
  const iterations = Number(controls.iterations.value);
  const wordLength = Number(controls.wordLength.value);
  const fractionalBits = Math.min(Number(controls.fractionalBits.value), wordLength - 3);
  controls.fractionalBits.value = fractionalBits;
  const lutWidth = Number(controls.lutWidth.value);
  const angleDeg = Number(controls.angle.value);
  const targetRad = (angleDeg * Math.PI) / 180;
  const x0 = Number(controls.inputX.value);
  const y0 = Number(controls.inputY.value);
  const k = gain(iterations);

  let x = q(mode === "rotation" ? x0 * k : x0, fractionalBits, wordLength);
  let y = q(mode === "rotation" ? y0 * k : y0, fractionalBits, wordLength);
  let z = mode === "rotation" ? qAngle(targetRad, lutWidth) : 0;
  const idealRotated = {
    x: x0 * Math.cos(targetRad) - y0 * Math.sin(targetRad),
    y: x0 * Math.sin(targetRad) + y0 * Math.cos(targetRad),
  };

  const rows = [
    {
      i: 0,
      d: 0,
      x,
      y,
      z,
      error: mode === "rotation" ? Math.abs(z) : Math.abs(y),
    },
  ];

  for (let i = 0; i < iterations; i += 1) {
    const d = mode === "rotation" ? (z >= 0 ? 1 : -1) : (y >= 0 ? 1 : -1);
    const shift = 2 ** -i;
    const angle = qAngle(Math.atan(shift), lutWidth);
    const nextX = mode === "rotation" ? x - d * y * shift : x + d * y * shift;
    const nextY = mode === "rotation" ? y + d * x * shift : y - d * x * shift;
    const nextZ = mode === "rotation" ? z - d * angle : z + d * angle;
    x = q(nextX, fractionalBits, wordLength);
    y = q(nextY, fractionalBits, wordLength);
    z = qAngle(nextZ, lutWidth);
    const vectorError =
      mode === "rotation"
        ? Math.hypot(x - idealRotated.x, y - idealRotated.y)
        : Math.abs(y);
    rows.push({ i: i + 1, d, x, y, z, error: vectorError });
  }

  state = {
    mode,
    iterations,
    wordLength,
    fractionalBits,
    lutWidth,
    angleDeg,
    targetRad,
    x0,
    y0,
    k,
    rows,
    idealRotated,
  };
  frames = rows;
  activeStep = Math.min(activeStep, iterations);
  renderAll();
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { width: rect.width, height: rect.height, scale };
}

function drawGrid(ctx, width, height, center, units) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#071013";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(199, 231, 226, 0.10)";
  ctx.lineWidth = 1;
  for (let x = center.x % units; x < width; x += units) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = center.y % units; y < height; y += units) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(238, 248, 246, 0.38)";
  ctx.beginPath();
  ctx.moveTo(0, center.y);
  ctx.lineTo(width, center.y);
  ctx.moveTo(center.x, 0);
  ctx.lineTo(center.x, height);
  ctx.stroke();
}

function drawReferenceCircle(ctx, center, radius) {
  ctx.save();
  ctx.strokeStyle = "rgba(238, 248, 246, 0.24)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(238, 248, 246, 0.72)";
  ctx.font = "800 16px Inter, sans-serif";
  const labelX = Math.min(center.x + radius + 12, ctx.canvas.clientWidth - 142);
  const labelY = Math.max(36, center.y - 16);
  ctx.fillText("circunferencia", labelX, labelY);
  ctx.fillText("de módulo 1", labelX, labelY + 18);
  ctx.restore();
}

function drawVector(ctx, center, units, x, y, color, label, width = 4) {
  const end = { x: center.x + x * units, y: center.y - y * units };
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  const angle = Math.atan2(center.y - end.y, end.x - center.x);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - 18 * Math.cos(angle - 0.42), end.y + 18 * Math.sin(angle - 0.42));
  ctx.lineTo(end.x - 18 * Math.cos(angle + 0.42), end.y + 18 * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();
  ctx.font = "800 20px Inter, sans-serif";
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 8;
  ctx.fillText(label, end.x + 16, end.y - 14);
  ctx.shadowBlur = 0;
}

function drawVectorScene() {
  const { width, height } = resizeCanvas(vectorCanvas);
  const center = { x: width * 0.5, y: height * 0.56 };
  const maxMagnitude = Math.max(
    1,
    Math.hypot(state.x0, state.y0),
    Math.hypot(state.idealRotated.x, state.idealRotated.y),
    ...state.rows.map((item) => Math.hypot(item.x, item.y)),
  );
  const units = (Math.min(width, height) * 0.42) / maxMagnitude;
  const row = frames[activeStep] || frames[0];
  drawGrid(vectorCtx, width, height, center, units / 2);
  drawReferenceCircle(vectorCtx, center, units);

  drawVector(vectorCtx, center, units, state.x0, state.y0, "#7cb7ff", "entrada", 3);
  if (state.mode === "rotation") {
    drawVector(vectorCtx, center, units, state.idealRotated.x, state.idealRotated.y, "#c8f560", "ideal", 3);
    drawVector(vectorCtx, center, units, row.x, row.y, "#ff6b5f", "CORDIC", 5);
  } else {
    drawVector(vectorCtx, center, units, row.x * state.k, row.y * state.k, "#ff6b5f", "iteración", 5);
    drawVector(vectorCtx, center, units, Math.hypot(state.x0, state.y0), 0, "#c8f560", "módulo", 3);
  }

  const angle = state.mode === "rotation" ? state.targetRad - row.z : row.z;
  const vectorRadius = Math.hypot(state.x0, state.y0) * units;
  vectorCtx.strokeStyle = "rgba(255, 200, 87, 0.88)";
  vectorCtx.lineWidth = 4;
  vectorCtx.beginPath();
  vectorCtx.arc(center.x, center.y, Math.max(24, vectorRadius), 0, -angle, angle < 0);
  vectorCtx.stroke();

  vectorCtx.fillStyle = "rgba(238, 248, 246, 0.86)";
  vectorCtx.font = "900 28px Inter, sans-serif";
  vectorCtx.fillText(`z = ${radToDeg(row.z).toFixed(4)}°`, 28, 46);
  vectorCtx.font = "750 20px Inter, sans-serif";
  vectorCtx.fillStyle = "rgba(167, 187, 183, 0.95)";
  vectorCtx.fillText(`x=${row.x.toFixed(5)}  y=${row.y.toFixed(5)}  d=${row.d}`, 28, 78);
}

function drawErrorChart() {
  const { width, height } = resizeCanvas(errorCanvas);
  const pad = { left: 58, right: 24, top: 26, bottom: 42 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const errors = state.rows.map((row) => Math.max(row.error, 1e-8));
  const maxLog = Math.log10(Math.max(...errors));
  const minLog = Math.log10(Math.min(...errors));
  errorCtx.clearRect(0, 0, width, height);
  errorCtx.fillStyle = "#071013";
  errorCtx.fillRect(0, 0, width, height);
  errorCtx.strokeStyle = "rgba(199, 231, 226, 0.14)";
  errorCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (h * i) / 4;
    errorCtx.beginPath();
    errorCtx.moveTo(pad.left, y);
    errorCtx.lineTo(width - pad.right, y);
    errorCtx.stroke();
  }
  const xFor = (idx) => pad.left + (w * idx) / Math.max(1, errors.length - 1);
  const yFor = (err) => {
    const t = (Math.log10(err) - minLog) / Math.max(0.0001, maxLog - minLog);
    return pad.top + h - t * h;
  };
  errorCtx.strokeStyle = "#48d6c8";
  errorCtx.lineWidth = 4;
  errorCtx.beginPath();
  errors.forEach((err, idx) => {
    const x = xFor(idx);
    const y = yFor(err);
    if (idx === 0) errorCtx.moveTo(x, y);
    else errorCtx.lineTo(x, y);
  });
  errorCtx.stroke();

  errors.forEach((err, idx) => {
    errorCtx.fillStyle = idx === activeStep ? "#ffc857" : "#c8f560";
    errorCtx.beginPath();
    errorCtx.arc(xFor(idx), yFor(err), idx === activeStep ? 7 : 4, 0, Math.PI * 2);
    errorCtx.fill();
  });

  errorCtx.fillStyle = "rgba(238, 248, 246, 0.86)";
  errorCtx.font = "700 14px Inter, sans-serif";
  errorCtx.fillText("error", 12, pad.top + 8);
  errorCtx.fillText("iteración", width - 96, height - 12);
}

function renderTable() {
  outputs.iterationTable.innerHTML = state.rows
    .map(
      (row) => `<tr>
        <td>${row.i}</td>
        <td>${row.d > 0 ? "+1" : row.d < 0 ? "-1" : "0"}</td>
        <td>${row.x.toFixed(5)}</td>
        <td>${row.y.toFixed(5)}</td>
        <td>${radToDeg(row.z).toFixed(4)}°</td>
        <td>${row.error.toExponential(2)}</td>
      </tr>`,
    )
    .join("");
}

function busChip(label, value, info, extra = "") {
  const isAngle = label.startsWith("z_");
  const isLut = label.startsWith("LUT");
  const helpKey = isLut ? "busLut" : isAngle ? "busAngle" : "busData";
  return `<div class="bus-chip ${isAngle ? "angle" : ""} ${isLut ? "lut" : ""}" data-help="${helpKey}" tabindex="0" title="${info.binary}">
    <span>${label}</span>
    <strong>${value}</strong>
    <code>${info.hex} · ${info.raw}</code>
    ${extra ? `<code>${extra}</code>` : ""}
  </div>`;
}

function renderBusDiagram() {
  const stage = Math.min(activeStep, state.iterations - 1);
  const input = state.rows[stage];
  const output = state.rows[stage + 1] || input;
  const decision = output.d;
  const dataFrac = state.fractionalBits;
  const dataWidth = state.wordLength;
  const angleFrac = state.lutWidth - 3;
  const angleWidth = state.lutWidth;
  const atanValue = qAngle(Math.atan(2 ** -stage), state.lutWidth);
  const shiftedX = q(input.x * 2 ** -stage, dataFrac, dataWidth);
  const shiftedY = q(input.y * 2 ** -stage, dataFrac, dataWidth);
  const xInfo = fixedInfo(input.x, dataFrac, dataWidth);
  const yInfo = fixedInfo(input.y, dataFrac, dataWidth);
  const zInfo = fixedInfo(input.z, angleFrac, angleWidth);
  const atanInfo = fixedInfo(atanValue, angleFrac, angleWidth);
  const outXInfo = fixedInfo(output.x, dataFrac, dataWidth);
  const outYInfo = fixedInfo(output.y, dataFrac, dataWidth);
  const outZInfo = fixedInfo(output.z, angleFrac, angleWidth);

  outputs.busDiagram.innerHTML = `
    ${busChip(`x_${stage}`, input.x.toFixed(5), xInfo, xInfo.q)}
    ${busChip(`y_${stage}`, input.y.toFixed(5), yInfo, yInfo.q)}
    ${busChip(`z_${stage}`, `${radToDeg(input.z).toFixed(4)}°`, zInfo, zInfo.q)}
    <div class="datapath-core">
      <div class="datapath-block" data-help="busShift" tabindex="0">
        <span>Desplazador x >>> ${stage}</span>
        <strong>${shiftedX.toFixed(5)}</strong>
        <code>${fixedInfo(shiftedX, dataFrac, dataWidth).hex}</code>
      </div>
      <div class="datapath-block" data-help="busDecision" tabindex="0">
        <span>d_${stage}</span>
        <strong>${decision > 0 ? "+1" : decision < 0 ? "-1" : "0"}</strong>
        <code>${state.mode === "rotation" ? "signo(z_i)" : "signo(y_i)"}</code>
      </div>
      <div class="datapath-block" data-help="busShift" tabindex="0">
        <span>Desplazador y >>> ${stage}</span>
        <strong>${shiftedY.toFixed(5)}</strong>
        <code>${fixedInfo(shiftedY, dataFrac, dataWidth).hex}</code>
      </div>
    </div>
    ${busChip(`LUT atan(${stage})`, `${radToDeg(atanValue).toFixed(4)}°`, atanInfo, atanInfo.q)}
    ${busChip(`x_${stage + 1}`, output.x.toFixed(5), outXInfo, outXInfo.q)}
    ${busChip(`y_${stage + 1}`, output.y.toFixed(5), outYInfo, outYInfo.q)}
    ${busChip(`z_${stage + 1}`, `${radToDeg(output.z).toFixed(4)}°`, outZInfo, outZInfo.q)}
    <p class="datapath-note">El bloque representa una arquitectura iterativa: en cada ciclo se reutilizan sumadores, desplazadores y la entrada ${stage} de la LUT.</p>
  `;
}

function renderMetrics() {
  const row = frames[activeStep] || frames[0];
  const angleError =
    state.mode === "rotation"
      ? Math.abs(radToDeg(row.z))
      : Math.abs(radToDeg(Math.atan2(state.y0, state.x0) - row.z));
  const vectorError =
    state.mode === "rotation"
      ? Math.hypot(row.x - state.idealRotated.x, row.y - state.idealRotated.y)
      : Math.abs(row.y);
  outputs.metricIteration.textContent = `${activeStep} / ${state.iterations}`;
  outputs.metricAngleError.textContent = `${angleError.toFixed(5)}°`;
  outputs.metricVectorError.textContent = vectorError.toExponential(2);
  outputs.metricGain.textContent = state.k.toFixed(5);
}

function renderVhdl() {
  const modeName = state.mode === "rotation" ? "rotation" : "vectoring";
  const directionRule =
    state.mode === "rotation"
      ? "d_i <= 1 when z_i >= 0 else -1;"
      : "d_i <= 1 when y_i >= 0 else -1;";
  const positiveBranch =
    state.mode === "rotation"
      ? {
          x: "x(i) - shift_right(y(i), i)",
          y: "y(i) + shift_right(x(i), i)",
          z: "z(i) - atan_table(i)",
        }
      : {
          x: "x(i) + shift_right(y(i), i)",
          y: "y(i) - shift_right(x(i), i)",
          z: "z(i) + atan_table(i)",
        };
  const negativeBranch =
    state.mode === "rotation"
      ? {
          x: "x(i) + shift_right(y(i), i)",
          y: "y(i) - shift_right(x(i), i)",
          z: "z(i) + atan_table(i)",
        }
      : {
          x: "x(i) - shift_right(y(i), i)",
          y: "y(i) + shift_right(x(i), i)",
          z: "z(i) - atan_table(i)",
        };
  outputs.vhdlCode.textContent = `-- CORDIC ${modeName}
-- Configuracion actual:
--   Datos x/y: formato (${state.wordLength},${state.fractionalBits})
--   Angulos z/LUT atan: formato (${state.lutWidth},${state.lutWidth - 3})
--   Iteraciones: ${state.iterations}

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity cordic_${modeName} is
  generic (
    WORD_LENGTH : positive := ${state.wordLength};
    FRAC_BITS   : natural  := ${state.fractionalBits};
    ANGLE_WIDTH : positive := ${state.lutWidth};
    ITERATIONS  : positive := ${state.iterations}
  );
  port (
    clk   : in  std_logic;
    rst   : in  std_logic;
    x_in  : in  signed(WORD_LENGTH-1 downto 0);
    y_in  : in  signed(WORD_LENGTH-1 downto 0);
    z_in  : in  signed(ANGLE_WIDTH-1 downto 0);
    x_out : out signed(WORD_LENGTH-1 downto 0);
    y_out : out signed(WORD_LENGTH-1 downto 0);
    z_out : out signed(ANGLE_WIDTH-1 downto 0)
  );
end entity;

architecture rtl of cordic_${modeName} is
  type reg_array is array (0 to ITERATIONS) of signed(WORD_LENGTH-1 downto 0);
  type angle_array is array (0 to ITERATIONS) of signed(ANGLE_WIDTH-1 downto 0);
  signal x, y : reg_array;
  signal z    : angle_array;
begin
  x(0) <= x_in;
  y(0) <= y_in;
  z(0) <= z_in;

  stages : for i in 0 to ITERATIONS-1 generate
    signal d_i : integer range -1 to 1;
  begin
    ${directionRule}

    process(clk)
    begin
      if rising_edge(clk) then
        if rst = '1' then
          x(i+1) <= (others => '0');
          y(i+1) <= (others => '0');
          z(i+1) <= (others => '0');
        elsif d_i = 1 then
          x(i+1) <= ${positiveBranch.x};
          y(i+1) <= ${positiveBranch.y};
          z(i+1) <= ${positiveBranch.z};
        else
          x(i+1) <= ${negativeBranch.x};
          y(i+1) <= ${negativeBranch.y};
          z(i+1) <= ${negativeBranch.z};
        end if;
      end if;
    end process;
  end generate;

  x_out <= x(ITERATIONS);
  y_out <= y(ITERATIONS);
  z_out <= z(ITERATIONS);
end architecture;`;
}

function renderLabels() {
  outputs.iterations.textContent = state.iterations;
  outputs.wordLength.textContent = `${state.wordLength} bits`;
  outputs.fractionalBits.textContent = state.fractionalBits;
  outputs.lutWidth.textContent = `${state.lutWidth} bits`;
  outputs.angle.textContent = `${state.angleDeg}°`;
  outputs.runStatus.textContent = "Modelo actualizado";
  outputs.stageTitle.textContent =
    state.mode === "rotation" ? "Rotación paso a paso" : "Vectorización paso a paso";
  outputs.stageSubtitle.textContent =
    state.mode === "rotation"
      ? "El vector se aproxima al ángulo indicado usando solo sumas, restas y desplazamientos."
      : "El algoritmo empuja la componente y hacia cero y acumula el ángulo de la muestra compleja.";
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === state.mode));
}

function renderAll() {
  renderLabels();
  drawVectorScene();
  drawErrorChart();
  renderBusDiagram();
  renderTable();
  renderMetrics();
  renderVhdl();
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function setMode(mode) {
  controls.modeSelect.value = mode;
  activeStep = 0;
  simulate();
}

Object.values(controls).forEach((control) => {
  control.addEventListener("input", () => {
    activeStep = 0;
    simulate();
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

function showHelp(helpKey) {
  const item = help[helpKey];
  if (!item) return;
  outputs.helpTitle.textContent = item.title;
  outputs.helpText.textContent = item.text;
}

document.addEventListener("mouseover", (event) => {
  const node = event.target.closest("[data-help]");
  if (node) showHelp(node.dataset.help);
});

document.addEventListener("focusin", (event) => {
  const node = event.target.closest("[data-help]");
  if (node) showHelp(node.dataset.help);
});

outputs.playPause.addEventListener("click", () => {
  playing = !playing;
  if (playing) ensureAudioContext();
  outputs.playPause.textContent = playing ? "Ⅱ" : "▶";
});

function tick(now) {
  if (playing && now - lastFrame > animationIntervalMs) {
    activeStep = activeStep >= state.iterations ? 0 : activeStep + 1;
    lastFrame = now;
    playIterationTick();
    renderAll();
  }
  requestAnimationFrame(tick);
}

window.addEventListener("resize", renderAll);
simulate();
requestAnimationFrame(tick);

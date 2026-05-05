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

const ofdmControls = {
  nfft: document.querySelector("#ofdmNfft"),
  occupied: document.querySelector("#ofdmOccupied"),
  sampleRate: document.querySelector("#ofdmSampleRate"),
  cp: document.querySelector("#ofdmCp"),
  constellation: document.querySelector("#ofdmConstellation"),
  snr: document.querySelector("#ofdmSnr"),
  hermitian: document.querySelector("#ofdmHermitian"),
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

const ofdmOutputs = {
  occupied: document.querySelector("#ofdmOccupiedOut"),
  sampleRate: document.querySelector("#ofdmSampleRateOut"),
  cp: document.querySelector("#ofdmCpOut"),
  snr: document.querySelector("#ofdmSnrOut"),
  deltaF: document.querySelector("#ofdmDeltaF"),
  usefulTime: document.querySelector("#ofdmUsefulTime"),
  symbolTime: document.querySelector("#ofdmSymbolTime"),
  bitrate: document.querySelector("#ofdmBitrate"),
  helpTitle: document.querySelector("#ofdmHelpTitle"),
  helpText: document.querySelector("#ofdmHelpText"),
  runStatus: document.querySelector("#ofdmRunStatus"),
  stageTitle: document.querySelector("#ofdmStageTitle"),
  stageSubtitle: document.querySelector("#ofdmStageSubtitle"),
};

const labTabs = [...document.querySelectorAll(".lab-tab")];
const labViews = {
  cordic: document.querySelector("#cordicLab"),
  ofdm: document.querySelector("#ofdmLab"),
};
const tabs = [...document.querySelectorAll(".cordic-tab")];
const ofdmViewTabs = [...document.querySelectorAll(".ofdm-view-tab")];
const vectorCanvas = document.querySelector("#cordicCanvas");
const errorCanvas = document.querySelector("#errorCanvas");
const ofdmCanvas = document.querySelector("#ofdmCanvas");
const vectorCtx = vectorCanvas.getContext("2d");
const errorCtx = errorCanvas.getContext("2d");
const ofdmCtx = ofdmCanvas.getContext("2d");

const help = {
  mode: {
    title: "CORDIC mode",
    text: "In rotation mode, the circuit consumes an angle z and rotates the input vector. In vectoring mode, it drives y toward zero and accumulates the vector angle in z. It is the same architecture with a different decision rule.",
  },
  iterations: {
    title: "Number of iterations",
    text: "Each iteration adds one atan(2^-i) microrotation. More iterations reduce angular error, but increase latency, registers, and power. The plot shows when extra iterations stop paying off.",
  },
  wordLength: {
    title: "Word length",
    text: "Defines the total size of the x, y, and z registers. If it is too small, saturation and coarse quantization appear; if it grows, precision improves at the cost of more hardware area.",
  },
  fractionalBits: {
    title: "Fractional bits",
    text: "Controls N in the fixed-point format (M,N). More fractional bits reduce the quantization step, but leave less integer headroom for large signals.",
  },
  lutWidth: {
    title: "atan LUT width",
    text: "Defines how many bits are used to store atan(2^-i) values. If the angular LUT is narrow, z accumulates quantized angles and the error may stop decreasing even when iterations increase.",
  },
  angle: {
    title: "Target angle",
    text: "In rotation mode this is the angle to synthesize. In vectoring mode it is used as a visual reference against the angle actually measured by the algorithm.",
  },
  inputX: {
    title: "Initial X component",
    text: "Represents the x-register input. In communications, it can be the in-phase I component of a complex sample.",
  },
  inputY: {
    title: "Initial Y component",
    text: "Represents the y-register input. In communications, it can be the quadrature component of a complex sample. In vectoring mode, CORDIC tries to drive it to zero.",
  },
  busData: {
    title: "Fixed-point data bus",
    text: "This bus carries an x or y component as a signed two's-complement integer. The format is written as (M,N): M is the total number of bus bits and N is the number of fractional bits. The real value is obtained by dividing the stored integer by 2^N.",
  },
  busAngle: {
    title: "Fixed-point angular bus",
    text: "The z bus uses its own width, ANGLE_WIDTH, because angles do not need to share precision with x and y. It is also expressed as (M,N): M total bits for the angular accumulator and N fractional bits for radian resolution.",
  },
  busLut: {
    title: "atan LUT entry",
    text: "This value is atan(2^-i) quantized with the LUT width. In an iterative architecture, a different table entry is read every cycle and added to or subtracted from the z accumulator.",
  },
  busShift: {
    title: "Arithmetic shifter",
    text: "CORDIC avoids multipliers by using shifts. Shifting x or y by i positions is equivalent to multiplying by 2^-i while preserving the two's-complement sign.",
  },
  busDecision: {
    title: "Decision dᵢ",
    text: "The dᵢ signal selects whether the stage adds or subtracts. In rotation mode it depends on the sign of zᵢ; in vectoring mode it depends on the sign of yᵢ to drive y toward zero.",
  },
};

const ofdmHelp = {
  nfft: {
    title: "IFFT/FFT size",
    text: "NFFT sets the number of useful OFDM-symbol samples and the total number of available frequency bins. The subcarrier spacing is Δf = Fs/NFFT.",
  },
  occupied: {
    title: "Occupied carriers",
    text: "In normal mode the number is odd and the DC carrier is occupied. With Hermitian symmetry it becomes even, DC is left null, and positive carriers determine their negative conjugates.",
  },
  sampleRate: {
    title: "Sample rate",
    text: "Fs defines the time and frequency scale. With fixed NFFT, increasing Fs increases Δf and reduces the useful symbol duration.",
  },
  cp: {
    title: "Cyclic prefix",
    text: "The cyclic prefix copies the last samples of the useful symbol and prepends them. It helps against multipath, but reduces the useful rate because it adds samples without new bits.",
  },
  constellation: {
    title: "Constellation",
    text: "The constellation sets how many bits each occupied carrier transports: BPSK uses 1 bit, QPSK 2 bits, and 16QAM 4 bits per subcarrier symbol.",
  },
  snr: {
    title: "SNR",
    text: "Signal-to-noise ratio in dB used in the received-constellation view. Low SNR opens the point cloud; high SNR makes received points cluster near the ideal constellation.",
  },
  hermitian: {
    title: "Hermitian symmetry",
    text: "Enables X[-k] = conj(X[k]) so the IFFT produces a real time-domain signal. It is useful in intensity-modulated optical systems, such as LiFi. In this mode DC is left null and the number of occupied carriers must be even.",
  },
  graph: {
    title: "Frequency/time/constellation view",
    text: "The frequency view shows sinc curves and Δf. The time view shows the complex symbol with cyclic prefix. The constellation view shows noisy received symbols and ideal points.",
  },
};

let state = {};
let frames = [];
let activeStep = 0;
let playing = false;
let lastFrame = 0;
let audioContext = null;
let activeLab = "cordic";
let ofdmState = {};
let ofdmView = "frequency";
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

function formatFrequency(value) {
  if (value >= 1e6) return `${(value / 1e6).toFixed(3)} MHz`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(3)} kHz`;
  return `${value.toFixed(1)} Hz`;
}

function formatTime(seconds) {
  if (seconds >= 1e-3) return `${(seconds * 1e3).toFixed(3)} ms`;
  if (seconds >= 1e-6) return `${(seconds * 1e6).toFixed(3)} µs`;
  return `${(seconds * 1e9).toFixed(3)} ns`;
}

function formatBitrate(value) {
  if (value >= 1e6) return `${(value / 1e6).toFixed(3)} Mb/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(3)} kb/s`;
  return `${value.toFixed(1)} b/s`;
}

function bitsPerSymbol(constellation) {
  return { bpsk: 1, qpsk: 2, "16qam": 4 }[constellation] || 1;
}

function seededUnit(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function randomIndex(seed, size) {
  return Math.floor(seededUnit(seed) * size) % size;
}

function gaussianNoise(seed) {
  const u1 = Math.max(1e-9, seededUnit(seed));
  const u2 = seededUnit(seed + 19.37);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function constellationPoint(seed, constellation) {
  if (constellation === "bpsk") return { re: randomIndex(seed, 2) === 0 ? 1 : -1, im: 0 };
  if (constellation === "qpsk") {
    const points = [
      { re: 1, im: 1 },
      { re: -1, im: 1 },
      { re: -1, im: -1 },
      { re: 1, im: -1 },
    ];
    const point = points[randomIndex(seed, points.length)];
    return { re: point.re / Math.SQRT2, im: point.im / Math.SQRT2 };
  }
  const levels = [-3, -1, 3, 1];
  const point = randomIndex(seed, 16);
  return { re: levels[point % 4] / Math.sqrt(10), im: levels[Math.floor(point / 4) % 4] / Math.sqrt(10) };
}

function idealConstellationPoints(constellation) {
  if (constellation === "bpsk") return [{ re: -1, im: 0 }, { re: 1, im: 0 }];
  if (constellation === "qpsk") {
    return [
      { re: 1 / Math.SQRT2, im: 1 / Math.SQRT2 },
      { re: -1 / Math.SQRT2, im: 1 / Math.SQRT2 },
      { re: -1 / Math.SQRT2, im: -1 / Math.SQRT2 },
      { re: 1 / Math.SQRT2, im: -1 / Math.SQRT2 },
    ];
  }
  const levels = [-3, -1, 1, 3];
  return levels.flatMap((re) => levels.map((im) => ({ re: re / Math.sqrt(10), im: im / Math.sqrt(10) })));
}

function sinc(x) {
  if (Math.abs(x) < 1e-6) return 1;
  return Math.sin(Math.PI * x) / (Math.PI * x);
}

function occupiedBins(nfft, occupied, hermitian) {
  const bins = [];
  if (hermitian) {
    const half = occupied / 2;
    for (let k = -half; k < 0; k += 1) bins.push(k);
    for (let k = 1; k <= half; k += 1) bins.push(k);
    return bins.slice(0, occupied);
  }
  const half = Math.floor(occupied / 2);
  for (let k = -half; k <= half; k += 1) bins.push(k);
  return bins.slice(0, occupied);
}

function simulateOfdm() {
  const nfft = Number(ofdmControls.nfft.value);
  const hermitian = ofdmControls.hermitian.checked;
  const maxOccupied = hermitian ? nfft - 2 : nfft - 1;
  ofdmControls.occupied.max = maxOccupied;
  ofdmControls.occupied.min = hermitian ? 2 : 3;
  ofdmControls.occupied.step = 2;
  let occupied = Math.min(Number(ofdmControls.occupied.value), maxOccupied);
  if (hermitian && occupied % 2 !== 0) occupied -= 1;
  if (!hermitian && occupied % 2 === 0) occupied += 1;
  occupied = Math.max(hermitian ? 2 : 3, Math.min(occupied, maxOccupied));
  ofdmControls.occupied.value = occupied;
  ofdmControls.cp.max = Math.floor(nfft / 2);
  const cp = Math.min(Number(ofdmControls.cp.value), Math.floor(nfft / 2));
  ofdmControls.cp.value = cp;
  const sampleRate = Math.max(1, Number(ofdmControls.sampleRate.value));
  const constellation = ofdmControls.constellation.value;
  const snrDb = Number(ofdmControls.snr.value);
  const bins = occupiedBins(nfft, occupied, hermitian);
  const spectrum = Array.from({ length: nfft }, () => ({ re: 0, im: 0 }));
  const dataSymbols = [];
  const constellationSampleCount = 1000;
  const constellationSamples = Array.from({ length: constellationSampleCount }, (_, index) =>
    constellationPoint(index + 4096, constellation),
  );
  if (hermitian) {
    const positiveBins = bins.filter((bin) => bin > 0);
    positiveBins.forEach((bin, index) => {
      const point = constellationPoint(index + nfft + occupied, constellation);
      dataSymbols.push(point);
      spectrum[bin] = point;
      spectrum[nfft - bin] = { re: point.re, im: -point.im };
    });
  } else {
    bins.forEach((bin, index) => {
      const point = constellationPoint(index + nfft + occupied, constellation);
      const arrayIndex = (bin + nfft) % nfft;
      spectrum[arrayIndex] = point;
      dataSymbols.push(point);
    });
  }
  const useful = [];
  for (let n = 0; n < nfft; n += 1) {
    let re = 0;
    let im = 0;
    spectrum.forEach((symbol, k) => {
      const angle = (2 * Math.PI * k * n) / nfft;
      re += symbol.re * Math.cos(angle) - symbol.im * Math.sin(angle);
      im += symbol.re * Math.sin(angle) + symbol.im * Math.cos(angle);
    });
    useful.push({ re: re / nfft, im: im / nfft });
  }
  const prefix = useful.slice(nfft - cp);
  const waveform = [...prefix, ...useful];
  const deltaF = sampleRate / nfft;
  const usefulTime = nfft / sampleRate;
  const symbolTime = (nfft + cp) / sampleRate;
  const independentCarriers = hermitian ? occupied / 2 : occupied;
  const bitrate = (independentCarriers * bitsPerSymbol(constellation)) / symbolTime;
  ofdmState = {
    nfft,
    occupied,
    sampleRate,
    cp,
    constellation,
    snrDb,
    hermitian,
    bins,
    useful,
    waveform,
    dataSymbols,
    constellationSamples,
    deltaF,
    usefulTime,
    symbolTime,
    bitrate,
    independentCarriers,
  };
  renderOfdm();
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
  ctx.fillText("unit circle", labelX, labelY);
  ctx.fillText("magnitude 1", labelX, labelY + 18);
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

  drawVector(vectorCtx, center, units, state.x0, state.y0, "#7cb7ff", "input", 3);
  if (state.mode === "rotation") {
    drawVector(vectorCtx, center, units, state.idealRotated.x, state.idealRotated.y, "#c8f560", "ideal", 3);
    drawVector(vectorCtx, center, units, row.x, row.y, "#ff6b5f", "CORDIC", 5);
  } else {
    drawVector(vectorCtx, center, units, row.x * state.k, row.y * state.k, "#ff6b5f", "iteration", 5);
    drawVector(vectorCtx, center, units, Math.hypot(state.x0, state.y0), 0, "#c8f560", "magnitude", 3);
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
  errorCtx.fillText("iteration", width - 96, height - 12);
}

function drawOfdmAxes(ctx, width, height, pad, xLabel, yLabel) {
  ctx.strokeStyle = "rgba(238, 248, 246, 0.34)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.stroke();
  ctx.fillStyle = "rgba(238, 248, 246, 0.82)";
  ctx.font = "800 14px Inter, sans-serif";
  ctx.fillText(yLabel, 18, pad.top + 6);
  ctx.fillText(xLabel, width - pad.right - 96, height - 14);
}

function drawOfdmFrequency() {
  const { width, height } = resizeCanvas(ofdmCanvas);
  const pad = { left: 58, right: 28, top: 34, bottom: 54 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const { bins, occupied, deltaF } = ofdmState;
  const minBin = Math.min(...bins) - 2;
  const maxBin = Math.max(...bins) + 2;
  const span = maxBin - minBin;
  ofdmCtx.clearRect(0, 0, width, height);
  ofdmCtx.fillStyle = "#071013";
  ofdmCtx.fillRect(0, 0, width, height);
  drawOfdmAxes(ofdmCtx, width, height, pad, "frequency", "|S(f)|");

  const xFor = (bin) => pad.left + ((bin - minBin) / span) * w;
  const yFor = (amp) => pad.top + h - amp * h * 0.82;
  ofdmCtx.strokeStyle = "rgba(199, 231, 226, 0.13)";
  ofdmCtx.lineWidth = 1;
  for (let k = Math.ceil(minBin); k <= Math.floor(maxBin); k += 1) {
    const x = xFor(k);
    ofdmCtx.beginPath();
    ofdmCtx.moveTo(x, pad.top);
    ofdmCtx.lineTo(x, height - pad.bottom);
    ofdmCtx.stroke();
  }

  bins.forEach((bin, index) => {
    const hue = 175 + ((index % 7) - 3) * 13;
    ofdmCtx.strokeStyle = `hsla(${hue}, 78%, 62%, 0.42)`;
    ofdmCtx.lineWidth = 2;
    ofdmCtx.beginPath();
    for (let p = 0; p <= 420; p += 1) {
      const f = minBin + (span * p) / 420;
      const amp = Math.abs(sinc(f - bin));
      const x = xFor(f);
      const y = yFor(amp);
      if (p === 0) ofdmCtx.moveTo(x, y);
      else ofdmCtx.lineTo(x, y);
    }
    ofdmCtx.stroke();
  });

  ofdmCtx.strokeStyle = "rgba(255, 200, 87, 0.95)";
  ofdmCtx.lineWidth = 4;
  bins.forEach((bin) => {
    const x = xFor(bin);
    ofdmCtx.beginPath();
    ofdmCtx.moveTo(x, height - pad.bottom + 8);
    ofdmCtx.lineTo(x, height - pad.bottom - 22);
    ofdmCtx.stroke();
  });

  const centerA = xFor(-0.5);
  const centerB = xFor(0.5);
  ofdmCtx.strokeStyle = "#ffc857";
  ofdmCtx.lineWidth = 2;
  ofdmCtx.beginPath();
  ofdmCtx.moveTo(centerA, pad.top + 22);
  ofdmCtx.lineTo(centerB, pad.top + 22);
  ofdmCtx.stroke();
  ofdmCtx.fillStyle = "#ffc857";
  ofdmCtx.font = "900 16px Inter, sans-serif";
  ofdmCtx.fillText(`Δf = ${formatFrequency(deltaF)}`, Math.min(centerA + 8, width - 170), pad.top + 16);
  ofdmCtx.fillStyle = "rgba(167, 187, 183, 0.95)";
  ofdmCtx.font = "700 14px Inter, sans-serif";
  const occupancyText = ofdmState.hermitian
    ? `${occupied} occupied carriers, null DC, ${ofdmState.independentCarriers} independent`
    : `${occupied} occupied carriers including DC`;
  ofdmCtx.fillText(occupancyText, pad.left, height - 18);
}

function drawOfdmTime() {
  const { width, height } = resizeCanvas(ofdmCanvas);
  const pad = { left: 58, right: 28, top: 34, bottom: 54 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const { waveform, cp, nfft } = ofdmState;
  const maxAmp = Math.max(1e-6, ...waveform.map((sample) => Math.max(Math.abs(sample.re), Math.abs(sample.im))));
  const mid = pad.top + h / 2;
  const xFor = (idx) => pad.left + (idx / Math.max(1, waveform.length - 1)) * w;
  const yFor = (value) => mid - (value / maxAmp) * h * 0.38;
  ofdmCtx.clearRect(0, 0, width, height);
  ofdmCtx.fillStyle = "#071013";
  ofdmCtx.fillRect(0, 0, width, height);
  drawOfdmAxes(ofdmCtx, width, height, pad, "samples", "I/Q");
  if (cp > 0) {
    ofdmCtx.fillStyle = "rgba(255, 200, 87, 0.14)";
    ofdmCtx.fillRect(pad.left, pad.top, xFor(cp) - pad.left, h);
    ofdmCtx.fillStyle = "#ffc857";
    ofdmCtx.font = "900 15px Inter, sans-serif";
    ofdmCtx.fillText(`cyclic prefix (${cp} samples)`, pad.left + 10, pad.top + 24);
  }
  ofdmCtx.strokeStyle = "rgba(238, 248, 246, 0.2)";
  ofdmCtx.beginPath();
  ofdmCtx.moveTo(pad.left, mid);
  ofdmCtx.lineTo(width - pad.right, mid);
  ofdmCtx.stroke();

  [
    { key: "re", color: "#48d6c8", label: "real part" },
    { key: "im", color: "#ff6b5f", label: "imaginary part" },
  ].forEach((series) => {
    ofdmCtx.strokeStyle = series.color;
    ofdmCtx.lineWidth = 3;
    ofdmCtx.beginPath();
    waveform.forEach((sample, idx) => {
      const x = xFor(idx);
      const y = yFor(sample[series.key]);
      if (idx === 0) ofdmCtx.moveTo(x, y);
      else ofdmCtx.lineTo(x, y);
    });
    ofdmCtx.stroke();
  });
  const usefulStart = xFor(cp);
  ofdmCtx.strokeStyle = "rgba(200, 245, 96, 0.85)";
  ofdmCtx.lineWidth = 2;
  ofdmCtx.setLineDash([6, 6]);
  ofdmCtx.beginPath();
  ofdmCtx.moveTo(usefulStart, pad.top);
  ofdmCtx.lineTo(usefulStart, height - pad.bottom);
  ofdmCtx.stroke();
  ofdmCtx.setLineDash([]);
  ofdmCtx.fillStyle = "#48d6c8";
  ofdmCtx.font = "900 15px Inter, sans-serif";
  ofdmCtx.fillText("real", width - pad.right - 132, pad.top + 22);
  ofdmCtx.fillStyle = "#ff6b5f";
  ofdmCtx.fillText("imaginary", width - pad.right - 84, pad.top + 22);
  ofdmCtx.fillStyle = "rgba(167, 187, 183, 0.95)";
  ofdmCtx.font = "700 14px Inter, sans-serif";
  ofdmCtx.fillText(`${nfft} useful samples + ${cp} prefix samples`, pad.left, height - 18);
}

function drawOfdmConstellation() {
  const { width, height } = resizeCanvas(ofdmCanvas);
  const pad = { left: 58, right: 34, top: 36, bottom: 54 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const plotSize = Math.min(w, h);
  const origin = { x: pad.left + w / 2, y: pad.top + h / 2 };
  const scale = plotSize * 0.36;
  const snrLinear = 10 ** (ofdmState.snrDb / 10);
  const noisePower = 1 / snrLinear;
  const noiseSigma = Math.sqrt(noisePower / 2);
  const noiseRmsRadius = Math.sqrt(noisePower);
  ofdmCtx.clearRect(0, 0, width, height);
  ofdmCtx.fillStyle = "#071013";
  ofdmCtx.fillRect(0, 0, width, height);
  ofdmCtx.strokeStyle = "rgba(238, 248, 246, 0.28)";
  ofdmCtx.lineWidth = 1;
  ofdmCtx.beginPath();
  ofdmCtx.moveTo(pad.left, origin.y);
  ofdmCtx.lineTo(width - pad.right, origin.y);
  ofdmCtx.moveTo(origin.x, pad.top);
  ofdmCtx.lineTo(origin.x, height - pad.bottom);
  ofdmCtx.stroke();

  const xFor = (value) => origin.x + value * scale;
  const yFor = (value) => origin.y - value * scale;
  ofdmCtx.fillStyle = "rgba(72, 214, 200, 0.34)";
  ofdmState.constellationSamples.forEach((symbol, index) => {
    const noisyRe = symbol.re + noiseSigma * gaussianNoise(index + 101);
    const noisyIm = symbol.im + noiseSigma * gaussianNoise(index + 211);
    ofdmCtx.beginPath();
    ofdmCtx.arc(xFor(noisyRe), yFor(noisyIm), 2.4, 0, Math.PI * 2);
    ofdmCtx.fill();
  });

  const idealPoints = idealConstellationPoints(ofdmState.constellation);
  const upperRightPoint = idealPoints.reduce((best, point) => {
    if (point.re > best.re) return point;
    if (point.re === best.re && point.im > best.im) return point;
    return best;
  }, idealPoints[0]);
  ofdmCtx.strokeStyle = "rgba(200, 245, 96, 0.72)";
  ofdmCtx.lineWidth = 2;
  ofdmCtx.setLineDash([8, 6]);
  ofdmCtx.beginPath();
  ofdmCtx.arc(xFor(upperRightPoint.re), yFor(upperRightPoint.im), noiseRmsRadius * scale, 0, Math.PI * 2);
  ofdmCtx.stroke();
  ofdmCtx.setLineDash([]);

  ofdmCtx.strokeStyle = "#ffc857";
  ofdmCtx.fillStyle = "#ffc857";
  ofdmCtx.lineWidth = 2;
  idealPoints.forEach((point) => {
    const x = xFor(point.re);
    const y = yFor(point.im);
    ofdmCtx.beginPath();
    ofdmCtx.moveTo(x - 8, y);
    ofdmCtx.lineTo(x + 8, y);
    ofdmCtx.moveTo(x, y - 8);
    ofdmCtx.lineTo(x, y + 8);
    ofdmCtx.stroke();
    ofdmCtx.beginPath();
    ofdmCtx.arc(x, y, 3, 0, Math.PI * 2);
    ofdmCtx.fill();
  });

  ofdmCtx.fillStyle = "rgba(238, 248, 246, 0.86)";
  ofdmCtx.font = "900 16px Inter, sans-serif";
  ofdmCtx.fillText(`SNR = ${ofdmState.snrDb} dB`, pad.left, pad.top + 4);
  ofdmCtx.fillStyle = "#c8f560";
  ofdmCtx.fillText(`noise RMS radius = ${noiseRmsRadius.toFixed(3)}`, pad.left, pad.top + 26);
  ofdmCtx.fillStyle = "#ffc857";
  ofdmCtx.fillText("ideal", width - pad.right - 120, pad.top + 4);
  ofdmCtx.fillStyle = "#48d6c8";
  ofdmCtx.fillText("received", width - pad.right - 70, pad.top + 4);
  ofdmCtx.fillStyle = "rgba(167, 187, 183, 0.95)";
  ofdmCtx.font = "700 14px Inter, sans-serif";
  ofdmCtx.fillText(`${ofdmState.constellationSamples.length} received symbols with AWGN noise`, pad.left, height - 18);
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
    <p class="datapath-note">This block represents an iterative architecture: adders, shifters, and LUT entry ${stage} are reused every cycle.</p>
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
-- Current configuration:
--   x/y data: format (${state.wordLength},${state.fractionalBits})
--   z angles/atan LUT: format (${state.lutWidth},${state.lutWidth - 3})
--   Iterations: ${state.iterations}

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
  outputs.runStatus.textContent = "Model updated";
  outputs.stageTitle.textContent =
    state.mode === "rotation" ? "Step-by-step rotation" : "Step-by-step vectoring";
  outputs.stageSubtitle.textContent =
    state.mode === "rotation"
      ? "The vector approaches the requested angle using only additions, subtractions, and shifts."
      : "The algorithm drives the y component toward zero and accumulates the complex-sample angle.";
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === state.mode));
}

function renderOfdm() {
  ofdmOutputs.occupied.textContent = ofdmState.occupied;
  ofdmOutputs.sampleRate.textContent = formatFrequency(ofdmState.sampleRate);
  ofdmOutputs.cp.textContent = ofdmState.cp;
  ofdmOutputs.snr.textContent = `${ofdmState.snrDb} dB`;
  ofdmOutputs.deltaF.textContent = formatFrequency(ofdmState.deltaF);
  ofdmOutputs.usefulTime.textContent = formatTime(ofdmState.usefulTime);
  ofdmOutputs.symbolTime.textContent = formatTime(ofdmState.symbolTime);
  ofdmOutputs.bitrate.textContent = formatBitrate(ofdmState.bitrate);
  ofdmOutputs.runStatus.textContent = "Model updated";
  ofdmViewTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.ofdmView === ofdmView));
  ofdmOutputs.stageTitle.textContent =
    ofdmView === "frequency"
      ? "OFDM subcarrier spectrum"
      : ofdmView === "time"
        ? "OFDM time-domain symbol"
        : "Received constellation";
  ofdmOutputs.stageSubtitle.textContent =
    ofdmView === "frequency"
      ? ofdmState.hermitian
        ? "Positive carriers contain data and negative carriers are their conjugates to obtain a real time-domain signal."
        : "The sinc curves of occupied carriers have zeros at neighboring carrier centers; DC is occupied."
      : ofdmView === "time"
        ? "The highlighted initial section copies the end of the useful symbol: it is the cyclic prefix."
        : "Received points include AWGN according to the SNR; crosses mark the ideal constellation.";
  if (activeLab === "ofdm") {
    if (ofdmView === "frequency") drawOfdmFrequency();
    else if (ofdmView === "time") drawOfdmTime();
    else drawOfdmConstellation();
  }
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

function setLab(lab) {
  activeLab = lab;
  labTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.lab === lab));
  Object.entries(labViews).forEach(([name, view]) => {
    view.hidden = name !== lab;
    view.classList.toggle("active", name === lab);
  });
  if (lab === "cordic") renderAll();
  if (lab === "ofdm") renderOfdm();
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

labTabs.forEach((tab) => {
  tab.addEventListener("click", () => setLab(tab.dataset.lab));
});

Object.values(ofdmControls).forEach((control) => {
  control.addEventListener("input", simulateOfdm);
});

ofdmViewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    ofdmView = tab.dataset.ofdmView;
    renderOfdm();
  });
});

function showHelp(helpKey) {
  const item = help[helpKey];
  if (!item) return;
  outputs.helpTitle.textContent = item.title;
  outputs.helpText.textContent = item.text;
}

function showOfdmHelp(helpKey) {
  const item = ofdmHelp[helpKey];
  if (!item) return;
  ofdmOutputs.helpTitle.textContent = item.title;
  ofdmOutputs.helpText.textContent = item.text;
}

document.addEventListener("mouseover", (event) => {
  const node = event.target.closest("[data-help]");
  if (node) showHelp(node.dataset.help);
  const ofdmNode = event.target.closest("[data-ofdm-help]");
  if (ofdmNode) showOfdmHelp(ofdmNode.dataset.ofdmHelp);
});

document.addEventListener("focusin", (event) => {
  const node = event.target.closest("[data-help]");
  if (node) showHelp(node.dataset.help);
  const ofdmNode = event.target.closest("[data-ofdm-help]");
  if (ofdmNode) showOfdmHelp(ofdmNode.dataset.ofdmHelp);
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

ofdmCanvas.addEventListener("mousemove", () => showOfdmHelp("graph"));
ofdmCanvas.addEventListener("focus", () => showOfdmHelp("graph"));

window.addEventListener("resize", () => {
  if (activeLab === "cordic") renderAll();
  else renderOfdm();
});
simulate();
simulateOfdm();
requestAnimationFrame(tick);

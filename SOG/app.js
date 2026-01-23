// ========================================
// Text-to-Speech App
// Using Browser Web Speech API
// ========================================

// DOM Element References
const textInput = document.getElementById("text-input");
const voiceSelect = document.getElementById("voice-select");
const speedSlider = document.getElementById("speed-slider");
const pitchSlider = document.getElementById("pitch-slider");
const speedValue = document.getElementById("speed-value");
const pitchValue = document.getElementById("pitch-value");
const speakBtn = document.getElementById("speak-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const charCount = document.getElementById("char-count");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");
const highlightOutput = document.getElementById("highlight-output");

// Web Speech API
const synth = window.speechSynthesis;
let voices = [];
let spokenTextSnapshot = "";
let lastBoundaryIndex = -1;
let activeUtteranceToken = 0; // invalidates old callbacks on cancel/restart

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPlainPreview(text) {
  if (!highlightOutput) return;
  highlightOutput.textContent = text;
}

function guessWordRange(text, start) {
  const len = text.length;
  let s = Math.max(0, Math.min(start, len));

  while (s < len && /\s/.test(text[s])) s += 1; // skip whitespace
  let e = s;
  while (e < len && !/\s/.test(text[e])) e += 1;

  return { start: s, end: e };
}

function renderHighlightRange(text, start, end) {
  if (!highlightOutput) return;

  const len = text.length;
  const s = Math.max(0, Math.min(start, len));
  const e = Math.max(s, Math.min(end, len));

  const before = escapeHtml(text.slice(0, s));
  const mid = escapeHtml(text.slice(s, e));
  const after = escapeHtml(text.slice(e));

  if (!mid) {
    highlightOutput.textContent = text;
    return;
  }

  highlightOutput.innerHTML = `${before}<mark class="spoken-word">${mid}</mark>${after}`;

  const markEl = highlightOutput.querySelector("mark.spoken-word");
  if (markEl) markEl.scrollIntoView({ block: "nearest" });
}

function resetHighlightToCurrentText() {
  spokenTextSnapshot = "";
  lastBoundaryIndex = -1;
  renderPlainPreview(textInput.value);
}

// Get voices from the browser and populate the dropdown
function loadVoices() {
  voices = synth.getVoices();
  if (voices.length === 0) {
    // Voices not loaded yet, try again later
    return;
  }

  // Clear existing options
  const voiceSelect = document.getElementById("voice-select");
  voiceSelect.innerHTML = "";

  // Populate dropdown with voices
  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });

  console.log(`Loaded ${voices.length} voice.`);
}

// Show how many characters the user has typed
function updateCharCount() {
  const count = textInput.value.length;
  charCount.textContent = count;

  // Only live-sync the preview when not actively speaking/paused
  if (!synth.speaking && !synth.paused) {
    renderPlainPreview(textInput.value);
  }
}

// Update speed and pitch labels when sliders change
function updateSliderLabels() {
  speedValue.textContent = Number(speedSlider.value).toFixed(1);
  pitchValue.textContent = Number(pitchSlider.value).toFixed(1);
}

// The main speak() function that converts text to speech
function speak() {
  const text = textInput.value.trim();

  if (!text) {
    alert("Please enter some text to speak.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  // Set selected voice
  const selectedVoiceIndex = voiceSelect.value;
  if (selectedVoiceIndex !== "") {
    utterance.voice = voices[selectedVoiceIndex];
  }

  // Set speed and pitch
  utterance.rate = parseFloat(speedSlider.value);
  utterance.pitch = parseFloat(pitchSlider.value);
  utterance.volume = 1.0;

  const utteranceToken = ++activeUtteranceToken;
  spokenTextSnapshot = text;
  lastBoundaryIndex = -1;
  renderPlainPreview(spokenTextSnapshot);

  utterance.onboundary = (event) => {
    if (utteranceToken !== activeUtteranceToken) return;

    if (event.name && event.name !== "word") return;
    if (typeof event.charIndex !== "number") return;

    const idx = event.charIndex;
    if (idx === lastBoundaryIndex) return;
    lastBoundaryIndex = idx;

    let start = idx;
    let end = idx;
    
    if (typeof event.charLength === "number" && event.charLength > 0) {
      end = idx + event.charLength;
    } else {
      const range = guessWordRange(spokenTextSnapshot, idx);
      start = range.start;
      end = range.end;
    }

    renderHighlightRange(spokenTextSnapshot, start, end);
  };

  // Event handlers
  utterance.onstart = () => {
    status.classList.add("speaking");
    statusText.textContent = "Speaking...";
    speakBtn.disabled = true;
    stopBtn.disabled = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "⏸️ Pause";
    status.classList.remove("paused");

  };
  utterance.onend = () => {
    status.classList.remove("speaking");
    statusText.textContent = "Ready";
    speakBtn.disabled = false;
    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸️ Pause";
    status.classList.remove("paused");
    resetHighlightToCurrentText();
  };
  utterance.onerror = (event) => {
    console.error("Speech synthesis error:", event);
    statusText.textContent = "Error occurred.";
    speakBtn.disabled = false;
    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸️ Pause";
    status.classList.remove("paused");
    resetHighlightToCurrentText();
  };

  // Cancel any ongoing speech and start new
  if (synth.speaking) {
    synth.cancel();
  }

  synth.speak(utterance);
}

// Pause/resume the current utterance (useful for long texts)
function togglePause() {
  if (!synth.speaking) return;

  if (synth.paused) {
    synth.resume();
    status.classList.remove("paused");
    statusText.textContent = "Speaking...";
    pauseBtn.textContent = "⏸️ Pause";
  } else {
    synth.pause();
    status.classList.add("paused");
    statusText.textContent = "Paused";
    pauseBtn.textContent = "▶️ Resume";
  }
}

// Stop speaking and cancel any ongoing speech
function stop() {
  synth.cancel();
  activeUtteranceToken += 1; // invalidate any pending boundary/end callbacks
  resetHighlightToCurrentText();
  status.classList.remove("speaking");
  statusText.textContent = "Stopped";
  speakBtn.disabled = false;
  stopBtn.disabled = true;
  pauseBtn.disabled = true;
  pauseBtn.textContent = "⏸️ Pause";
  status.classList.remove("paused");

}

// Initialize the app
// Set up all event listeners when DOM is ready
function init() {
  loadVoices();
  synth.addEventListener("voiceschanged", loadVoices);
  textInput.addEventListener("input", updateCharCount);

  speakBtn.addEventListener("click", speak);
  stopBtn.addEventListener("click", stop);

  updateCharCount();
  stopBtn.disabled = true;

  pauseBtn.addEventListener("click", togglePause);
  pauseBtn.disabled = true;
  pauseBtn.textContent = "⏸️ Pause";

  speedSlider.addEventListener("input", updateSliderLabels);
  pitchSlider.addEventListener("input", updateSliderLabels);
  updateSliderLabels();
  renderPlainPreview(textInput.value);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);

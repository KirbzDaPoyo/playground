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
const stopBtn = document.getElementById("stop-btn");
const charCount = document.getElementById("char-count");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");

// Web Speech API
const synth = window.speechSynthesis;
let voices = [];

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

  // Event handlers
  utterance.onstart = () => {
    status.classList.add("speaking");
    statusText.textContent = "Speaking...";
    speakBtn.disabled = true;
    stopBtn.disabled = false;
  };
  utterance.onend = () => {
    status.classList.remove("speaking");
    statusText.textContent = "Ready";
    speakBtn.disabled = false;
    stopBtn.disabled = true;
  };
  utterance.onerror = (event) => {
    console.error("Speech synthesis error:", event);
    statusText.textContent = "Error occurred.";
    speakBtn.disabled = false;
    stopBtn.disabled = true;
  };

  // Cancel any ongoing speech and start new
  if (synth.speaking) {
    synth.cancel();
  }

  synth.speak(utterance);
}

// Stop speaking and cancel any ongoing speech
function stop() {
  synth.cancel();
  status.classList.remove("speaking");
  statusText.textContent = "Stopped";
  speakBtn.disabled = false;
  stopBtn.disabled = true;
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
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);

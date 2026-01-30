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
const projectTitle = document.getElementById("project-title");
const projectTags = document.getElementById("project-tags");
const newProjectBtn = document.getElementById("new-project-btn");
const saveProjectBtn = document.getElementById("save-project-btn");
const deleteProjectBtn = document.getElementById("delete-project-btn");
const projectSelect = document.getElementById("project-select");
const projectSearch = document.getElementById("project-search");
const projectTagsPreview = document.getElementById("project-tags-preview");
const projectMeta = document.getElementById("project-meta");
const exportBtn = document.getElementById("export-btn");
const exportFormat = document.getElementById("export-format");
const exportStatus = document.getElementById("export-status");
const splitMode = document.getElementById("split-mode");
const maxChunkInput = document.getElementById("max-chunk");
const splitBtn = document.getElementById("split-btn");
const queuePrevBtn = document.getElementById("queue-prev");
const queueNextBtn = document.getElementById("queue-next");
const queuePlayBtn = document.getElementById("queue-play");
const queueStopBtn = document.getElementById("queue-stop");
const queueStatus = document.getElementById("queue-status");

// Web Speech API
const synth = window.speechSynthesis;
let voices = [];
let spokenTextSnapshot = "";
let lastBoundaryIndex = -1;
let activeUtteranceToken = 0; // invalidates old callbacks on cancel/restart

const PROJECTS_KEY = "tts_projects_v1";
let projects = [];
let activeProjectId = null;

let chunks = [];
let currentChunkIndex = 0;
let queueAutoAdvance = true;
let queueActive = false;

// persists last position even without saving a project
const QUEUE_STATE_KEY = "tts_queue_state_v1";

// If voices load later, we can apply the saved voice once available
let pendingVoiceMeta = null;

// ========================================
// Text Highlighting Utilities
// ========================================

// Utility to escape HTML special characters
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Render plain text preview without highlights
function renderPlainPreview(text) {
  if (!highlightOutput) return;
  highlightOutput.textContent = text;
}

// Guess word boundaries around a given index
function guessWordRange(text, start) {
  const len = text.length;
  let s = Math.max(0, Math.min(start, len));

  while (s < len && /\s/.test(text[s])) s += 1; // skip whitespace
  let e = s;
  while (e < len && !/\s/.test(text[e])) e += 1;

  return { start: s, end: e };
}

// Render highlighted text range
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

// Reset highlights to match current text input
function resetHighlightToCurrentText() {
  spokenTextSnapshot = "";
  lastBoundaryIndex = -1;
  renderPlainPreview(textInput.value);
}

// ========================================
// Project Management
// ========================================

// Load projects from localStorage
function loadProjectsFromStorage() {
  try {
    projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    if (!Array.isArray(projects)) projects = [];
  } catch {
    projects = [];
  }
}

// Save projects to localStorage
function saveProjectsToStorage() {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// Normalize tags input into an array
function normalizeTags(input) {
  return input
    .split(",")
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 20); // keep it sane
}

// Render tag chips in the UI
function renderTagChips(tags) {
  if (!projectTagsPreview) return;
  projectTagsPreview.innerHTML = "";
  tags.forEach(tag => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag;
    projectTagsPreview.appendChild(chip);
  });
}

// Format timestamp to readable string
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
}

// Get voice metadata from current selection
function getVoiceMetaFromSelection() {
  const idx = voiceSelect.value;
  const v = idx !== "" ? voices[idx] : null;
  return v ? { name: v.name, lang: v.lang } : null;
}

// Apply voice metadata to selection if available
function applyVoiceMeta(meta) {
  if (!meta || voices.length === 0) return false;

  const foundIndex = voices.findIndex(v => v.name === meta.name && v.lang === meta.lang);
  if (foundIndex >= 0) {
    voiceSelect.value = String(foundIndex);
    return true;
  }
  return false;
}

// Refresh the project selection dropdown based on filter
function refreshProjectSelect(filterText = "") {
  if (!projectSelect) return;

  const q = filterText.trim().toLowerCase();
  const filtered = q
    ? projects.filter(p => {
        const hay = `${p.title} ${(p.tags || []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
    : projects;

  projectSelect.innerHTML = "";

  if (filtered.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = q ? "No matches" : "No saved projects yet";
    projectSelect.appendChild(opt);
    return;
  }

  // newest first
  filtered
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      const tagSuffix = p.tags?.length ? ` [${p.tags.join(", ")}]` : "";
      opt.textContent = `${p.title || "Untitled"}${tagSuffix}`;
      projectSelect.appendChild(opt);
    });

  // keep current selection visible if possible
  if (activeProjectId && filtered.some(p => p.id === activeProjectId)) {
    projectSelect.value = activeProjectId;
  }
}

// Set the active project in the UI
function setActiveProjectUI(project) {
  if (!projectTitle || !projectTags) return;

  if (!project) {
    activeProjectId = null;
    projectTitle.value = "";
    projectTags.value = "";
    renderTagChips([]);
    if (projectMeta) projectMeta.textContent = "";
    if (deleteProjectBtn) deleteProjectBtn.disabled = true;
    if (projectSelect) projectSelect.value = "";
    return;
  }

  activeProjectId = project.id;
  projectTitle.value = project.title || "";
  projectTags.value = (project.tags || []).join(", ");
  renderTagChips(project.tags || []);

  if (projectMeta) {
    projectMeta.textContent =
      `Last saved: ${formatDate(project.updatedAt)} • ` +
      `Voice: ${project.voice?.name ? `${project.voice.name} (${project.voice.lang})` : "Default"} • ` +
      `Speed: ${Number(project.speed).toFixed(1)}x • Pitch: ${Number(project.pitch).toFixed(1)}`;
  }

  if (deleteProjectBtn) deleteProjectBtn.disabled = false;
}

// Create a new project (clears current)
function newProject() {
  setActiveProjectUI(null);
}

// Save the current project
function saveProject() {
  const title = (projectTitle?.value || "").trim() || "Untitled";
  const tags = normalizeTags(projectTags?.value || "");
  const now = Date.now();

  const payload = {
    id: activeProjectId || String(now),
    title,
    tags,
    text: textInput.value,
    speed: Number(speedSlider.value),
    pitch: Number(pitchSlider.value),
    voice: getVoiceMetaFromSelection(),
    updatedAt: now,
    createdAt: activeProjectId
      ? (projects.find(p => p.id === activeProjectId)?.createdAt || now)
      : now,
  };

  const idx = projects.findIndex(p => p.id === payload.id);
  if (idx >= 0) projects[idx] = payload;
  else projects.push(payload);

  saveProjectsToStorage();
  setActiveProjectUI(payload);
  refreshProjectSelect(projectSearch?.value || "");
}

// Load a project by its ID
function loadProjectById(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;

  // stop any speaking so we don't fight state
  if (synth.speaking) synth.cancel();

  textInput.value = p.text || "";
  speedSlider.value = String(p.speed ?? 1);
  pitchSlider.value = String(p.pitch ?? 1);
  updateSliderLabels?.();
  updateCharCount?.();

  // voice may not exist until voices load
  if (!applyVoiceMeta(p.voice)) {
    pendingVoiceMeta = p.voice;
  }

  setActiveProjectUI(p);
}

// Delete the active project
function deleteActiveProject() {
  if (!activeProjectId) return;

  projects = projects.filter(p => p.id !== activeProjectId);
  saveProjectsToStorage();

  activeProjectId = null;
  setActiveProjectUI(null);
  refreshProjectSelect(projectSearch?.value || "");
}

// ========================================
// Queue Management
// ========================================

// Save the current queue state to localStorage
function saveQueueState() {
  try {
    localStorage.setItem(
      QUEUE_STATE_KEY,
      JSON.stringify({
        currentChunkIndex,
        total: chunks.length,
      })
    );
  } catch {}
}

// Load the queue state from localStorage
function loadQueueState() {
  try {
    const s = JSON.parse(localStorage.getItem(QUEUE_STATE_KEY) || "{}");
    if (Number.isInteger(s.currentChunkIndex)) currentChunkIndex = s.currentChunkIndex;
  } catch {}
}

// Clamp integer value within min/max, with fallback
function clampInt(value, fallback, min = 50, max = 5000) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Split text into paragraphs
function splitByParagraphs(text) {
  return text
    .split(/\n\s*\n+/)          // blank-line separated paragraphs
    .map(t => t.trim())
    .filter(Boolean);
}

// Split text by punctuation marks
function splitByPunctuation(text) {
  // Split into sentence-ish chunks while keeping punctuation.
  // This is deliberately simple and robust.
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return (parts || [])
    .map(t => t.trim())
    .filter(Boolean);
}

// Enforce maximum chunk length by hard-wrapping
function enforceMaxChunkLength(list, maxLen) {
  const out = [];
  for (const item of list) {
    if (item.length <= maxLen) {
      out.push(item);
      continue;
    }
    // Hard-wrap long chunks by character count
    for (let i = 0; i < item.length; i += maxLen) {
      const piece = item.slice(i, i + maxLen).trim();
      if (piece) out.push(piece);
    }
  }
  return out;
}

// Build the queue from the current text input
function buildQueueFromText() {
  const text = textInput.value.trim();
  if (!text) {
    chunks = [];
    currentChunkIndex = 0;
    updateQueueUI();
    return;
  }

  const mode = splitMode?.value || "paragraph";
  const maxLen = clampInt(maxChunkInput?.value, 350, 80, 2000);

  let base = mode === "punctuation" ? splitByPunctuation(text) : splitByParagraphs(text);
  base = enforceMaxChunkLength(base, maxLen);

  chunks = base;
  currentChunkIndex = Math.min(currentChunkIndex, Math.max(0, chunks.length - 1));

  // restore last index (but don’t exceed)
  loadQueueState();
  currentChunkIndex = Math.min(currentChunkIndex, Math.max(0, chunks.length - 1));

  updateQueueUI();
}

// Update the queue UI elements based on current state
function updateQueueUI() {
  const total = chunks.length;
  const idx = currentChunkIndex;

  if (queueStatus) {
    if (total === 0) queueStatus.textContent = "No queue yet. Click Split to create chapters.";
    else queueStatus.textContent = `Chapter ${idx + 1} / ${total}`;
  }

  const canNav = total > 0;
  if (queuePrevBtn) queuePrevBtn.disabled = !canNav || idx <= 0;
  if (queueNextBtn) queueNextBtn.disabled = !canNav || idx >= total - 1;

  if (queuePlayBtn) queuePlayBtn.disabled = total === 0 || queueActive;
  if (queueStopBtn) queueStopBtn.disabled = !queueActive;
}

// Speak a given text chunk with highlighting
function speakText(text, { onEnd } = {}) {
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);

  const selectedVoiceIndex = voiceSelect.value;
  if (selectedVoiceIndex !== "") {
    utterance.voice = voices[selectedVoiceIndex];
  }

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

  utterance.onstart = () => {
    status.classList.add("speaking");
    statusText.textContent = queueActive ? "Playing queue..." : "Speaking...";
    speakBtn.disabled = true;
    stopBtn.disabled = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "⏸️ Pause";
    status.classList.remove("paused");
  };

  utterance.onend = () => {
    status.classList.remove("speaking");
    statusText.textContent = queueActive ? "Queue paused" : "Ready";
    speakBtn.disabled = false;
    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸️ Pause";
    status.classList.remove("paused");
    resetHighlightToCurrentText();
    if (typeof onEnd === "function") onEnd();
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
    // stop queue on error
    if (queueActive) stopQueue();
  };

  if (synth.speaking) synth.cancel();
  synth.speak(utterance);
}

// Play the queue from the current chunk
function playQueue() {
  if (chunks.length === 0) return;

  queueActive = true;
  updateQueueUI();

  const playCurrent = () => {
    if (!queueActive) return;

    const text = chunks[currentChunkIndex] || "";
    saveQueueState();
    updateQueueUI();

    speakText(text, {
      onEnd: () => {
        if (!queueActive) return;
        if (!queueAutoAdvance) return;

        if (currentChunkIndex < chunks.length - 1) {
          currentChunkIndex += 1;
          playCurrent();
        } else {
          // finished
          queueActive = false;
          updateQueueUI();
          if (queueStatus) queueStatus.textContent = `Finished ${chunks.length} / ${chunks.length}`;
        }
      },
    });
  };

  playCurrent();
}

// Stop the queue playback
function stopQueue() {
  queueActive = false;
  synth.cancel();
  activeUtteranceToken += 1;
  resetHighlightToCurrentText();
  updateQueueUI();
}

// Navigate to previous chunk
function prevChunk() {
  if (chunks.length === 0) return;
  currentChunkIndex = Math.max(0, currentChunkIndex - 1);
  saveQueueState();
  updateQueueUI();
  if (queueActive) playQueue();
}

// Navigate to next chunk
function nextChunk() {
  if (chunks.length === 0) return;
  currentChunkIndex = Math.min(chunks.length - 1, currentChunkIndex + 1);
  saveQueueState();
  updateQueueUI();
  if (queueActive) playQueue();
}

// ========================================
// Text-to-Speech Functionality
// ========================================

// Get voices from the browser and populate the dropdown
function loadVoices() {
  voices = synth.getVoices();
  if (voices.length === 0) {
    // Voices not loaded yet, try again later
    return;
  }

  // Clear existing options
  voiceSelect.innerHTML = "";

  // Populate dropdown with voices
  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });

  console.log(`Loaded ${voices.length} voice.`);

  // Apply any pending voice selection once voices become available
  if (pendingVoiceMeta) {
    if (applyVoiceMeta(pendingVoiceMeta)) pendingVoiceMeta = null;
  }
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
  if (queueActive) stopQueue();
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

// Export audio using ElevenLabs TTS API
async function exportAudio() {
  const text = textInput.value.trim();
  if (!text) {
    alert("Please enter some text to export.");
    return;
  }

  exportBtn.disabled = true;
  exportStatus.textContent = "Generating audio...";

  try {
    const payload = {
      text,
      output_format: exportFormat.value,
    };

    const resp = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err || `HTTP ${resp.status}`);
    }

    const blob = await resp.blob();
    const isWav = exportFormat.value.startsWith("wav") || exportFormat.value === "wav";
    const filename = `tts-${Date.now()}.${isWav ? "wav" : "mp3"}`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);

    exportStatus.textContent = `Downloaded: ${filename}`;
  } catch (e) {
    console.error(e);
    exportStatus.textContent = "Export failed. Check Flask console output and your ElevenLabs key.";
  } finally {
    exportBtn.disabled = false;
  }
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

  // Project library init
  loadProjectsFromStorage();
  refreshProjectSelect("");

  newProjectBtn.addEventListener("click", newProject);
  saveProjectBtn.addEventListener("click", saveProject);
  deleteProjectBtn.addEventListener("click", deleteActiveProject);

  projectSelect.addEventListener("change", () => {
    const id = projectSelect.value;
    if (id) loadProjectById(id);
  });

  projectSearch.addEventListener("input", () => {
    refreshProjectSelect(projectSearch.value);
  });

  projectTags.addEventListener("input", () => {
    renderTagChips(normalizeTags(projectTags.value));
  });

  // Queue + Chapters
  if (splitBtn) splitBtn.addEventListener("click", buildQueueFromText);
  if (queuePlayBtn) queuePlayBtn.addEventListener("click", playQueue);
  if (queueStopBtn) queueStopBtn.addEventListener("click", stopQueue);
  if (queuePrevBtn) queuePrevBtn.addEventListener("click", prevChunk);
  if (queueNextBtn) queueNextBtn.addEventListener("click", nextChunk);

  updateQueueUI();

  // Export audio button
  if (exportBtn) exportBtn.addEventListener("click", exportAudio);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);

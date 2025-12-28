# Text-to-Speech App - Starter Files

Build a text-to-speech app using the browser's built-in Web Speech API. No backend required!

## What You'll Build

A web app that converts text to speech with:

- Voice selection from available system voices
- Speed and pitch controls
- Character counter
- Play/Stop functionality
- Status indicator

Start with the provided starter files in [starter/](./starter/) and implement the missing functionality in `app.js`.

## Files Included

- **index.html** - Complete UI structure (ready to use)
- **style.css** - Complete styling with dark theme (ready to use)
- **app.js** - Starter code with TODOs for you to implement

## Getting Started

1. Open `index.html` in your browser
2. Open `app.js` in your code editor
3. Follow the TODO comments to implement each function
4. Refresh the browser to test your changes

## What to Implement

The `app.js` file has TODO comments guiding you through:

### Step 3: Load Available Voices

Implement `loadVoices()` to:

- Get voices from `synth.getVoices()`
- Populate the dropdown with voice options
- Handle async voice loading with `voiceschanged` event

### Step 4: Character Counter

Implement `updateCharCount()` to:

- Count characters in the text input
- Update the display

### Step 5: Speech Synthesis

Implement `speak()` to:

- Create a `SpeechSynthesisUtterance`
- Configure voice, rate, and pitch
- Handle start/end/error events
- Update UI state

### Initialize

Implement `init()` to:

- Set up all event listeners
- Initialize displays

## Testing

1. Enter text in the textarea
2. Select a voice from the dropdown
3. Adjust speed and pitch sliders
4. Click "Speak" to hear the text
5. Click "Stop" to cancel speech

## Key Concepts

- **Web Speech API** - Browser's built-in speech synthesis
- **SpeechSynthesisUtterance** - Object representing text to speak
- **Events** - onstart, onend, onerror for UI updates
- **Async loading** - Voices load asynchronously in Chrome

## Resources

- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechSynthesis (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [SpeechSynthesisUtterance (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance)

## Need Help?

Check the [completed](./completed/) directory for the full working implementation.

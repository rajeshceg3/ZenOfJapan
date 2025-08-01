// --- Mock HTMLAudioElement ---
class MockAudioElement {
    // Static properties for controlling play() promise rejection
    static shouldPlayPromiseReject = false;
    static rejectionError = null;

    static setPlayPromiseRejection(shouldReject, error = new Error("Mock play error")) {
        this.shouldPlayPromiseReject = shouldReject;
        this.rejectionError = error;
        if (shouldReject) {
            console.log(`MockAudioElement: Play promise will now REJECT with error: ${error.message}`);
        } else {
            console.log(`MockAudioElement: Play promise will now RESOLVE.`);
        }
    }

    constructor() {
        this.src = '';
        this.volume = 1;
        this.currentTime = 0;
        this.duration = NaN; // Typically NaN until metadata loaded
        this.paused = true;
        this.loop = false;
        this.ended = false;
        this.readyState = 0; // HAVE_NOTHING

        this.eventListeners = {}; // Store event listeners

        // Mock DOM element properties (basic)
        this.style = {}; // For icon display checks if needed directly on audio element (unlikely)

        console.log('MockAudioElement created');
    }

    // --- Properties ---
    // Getters and setters can be added if more complex behavior is needed

    // --- Methods ---
    play() {
        if (this.constructor.shouldPlayPromiseReject) {
            console.warn(`MockAudioElement: play() is configured to REJECT promise.`);
            this.paused = true; // Usually, if play fails, it remains paused or becomes paused.
            // Dispatch an error event *before* rejecting the promise, as real elements might.
            // Note: AudioManager's play().catch() handles isPlaying and _updateButtonState.
            const errorEvent = new Event('error');
            // You could attach the rejectionError to the event if needed: errorEvent.error = this.constructor.rejectionError;
            this.dispatchEvent(errorEvent);
            return Promise.reject(this.constructor.rejectionError);
        }

        if (!this.src) {
            console.error("MockAudioElement: src not set, play() failed (returning rejected promise).");
            // AudioManager's play() method has a check for this.audioElement.play() promise.
            // If src is empty, the browser's <audio> element play() call itself might not immediately throw an error
            // but might fire an 'error' event and the promise might not resolve or reject immediately.
            // For this mock, to make testing AudioManager's play() clearer when src is empty:
            // We will let AudioManager's logic handle setting src if it's empty.
            // If play() is called on an element with no src, it's often a no-op or an error event.
            // Let's simulate an error event and a rejected promise, similar to a real element.
            const errorEvent = new Event('error');
            this.dispatchEvent(errorEvent);
            return Promise.reject(new Error("No source set on MockAudioElement"));
        }

        this.paused = false;
        this.readyState = 4; // HAVE_ENOUGH_DATA
        console.log('MockAudioElement: play() called, src:', this.src);
        this.dispatchEvent(new Event('play'));
        this.dispatchEvent(new Event('playing'));
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
        console.log('MockAudioElement: pause() called');
        this.dispatchEvent(new Event('pause'));
    }

    load() {
        console.log('MockAudioElement: load() called for src:', this.src);
        // Simulate metadata loading
        if (this.src) {
            // A short delay to simulate network request for metadata
            setTimeout(() => {
                this.duration = 200; // Mock duration
                this.readyState = 4; // HAVE_ENOUGH_DATA
                this.dispatchEvent(new Event('loadedmetadata'));
                console.log('MockAudioElement: loadedmetadata event dispatched');
            }, 50);
        } else {
            console.warn('MockAudioElement: load() called without src.');
        }
    }

    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
        console.log(`MockAudioElement: addEventListener for '${event}'`);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
            console.log(`MockAudioElement: removeEventListener for '${event}'`);
        }
    }

    dispatchEvent(event) { // event should be an object like { type: 'play' } or new Event('play')
        const eventType = typeof event === 'string' ? event : event.type;
        console.log(`MockAudioElement: dispatchEvent for '${eventType}'`);
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(callback => {
                try {
                    callback.call(this, event); // `this` refers to the MockAudioElement instance
                } catch (e) {
                    console.error(`Error in event listener for ${eventType}:`, e);
                }
            });
        }
        // Handle on-event properties like onended, onplay, onpause
        const onEventCallback = this[`on${eventType}`];
        if (typeof onEventCallback === 'function') {
            try {
                onEventCallback.call(this, event);
            } catch (e) {
                console.error(`Error in on${eventType} handler:`, e);
            }
        }


        // Specific logic for 'ended' event
        if (eventType === 'ended') {
            this.paused = true; // Audio typically pauses when it ends
            this.ended = true;
        }
    }

    // --- Helper to reset state for tests ---
    static resetGlobalMock() {
        // This function would be more useful if we were creating a new mock for each test
        // For now, we'll just log. A more robust solution might involve a factory.
        this.setPlayPromiseRejection(false); // Reset play promise rejection state
        console.log('MockAudioElement: Static resetGlobalMock called (play promise rejection reset).');
    }

    // --- Simulate track ending ---
    _simulateTrackEnd() {
        this.currentTime = this.duration;
        this.ended = true;
        this.paused = true;
        this.dispatchEvent(new Event('ended'));
        console.log('MockAudioElement: _simulateTrackEnd() called');
    }

    // --- Simulate an error ---
    _simulateError(errorDetails = {}) {
        console.error('MockAudioElement: _simulateError() called', errorDetails);
        // In a real Audio element, the error event has a target with an error object
        const errorEvent = new Event('error');
        // errorEvent.target = { error: { code: 4, message: "MEDIA_ERR_SRC_NOT_SUPPORTED" } };
        this.dispatchEvent(errorEvent);
    }
}

// --- Global Audio Override ---
// Ensure this runs before AudioManager is instantiated or used in tests.
// In test-runner.html, this script is loaded after audio.js,
// so AudioManager might have already cached the original Audio constructor if it was called globally.
// For robust testing, AudioManager should ideally be instantiated *within* a test,
// after the mock is set up. For now, we assume AudioManager is instantiated in tests
// or that its instantiation in `DOMContentLoaded` in `audio.js` will pick this up if tests run after DOMContentLoaded.

// To make this more robust, we'd typically do this in a setup block for each test suite/test.
// However, given the current structure (scripts in HTML), this is a simpler approach.
if (typeof window !== 'undefined') {
    window.Audio = MockAudioElement;
    console.log('Global window.Audio overridden with MockAudioElement');
} else if (typeof global !== 'undefined') { // For Node.js like environment (not primary for this setup)
    global.Audio = MockAudioElement;
    console.log('Global global.Audio overridden with MockAudioElement');
}


// --- Mock DOM Elements for UI testing ---
// These are simplified mocks. More complex interactions might need more detailed mocks.
let mockPlayPauseButton;
let mockVolumeSlider;
// Define mock icons in a scope accessible to both setupMockDOM and resetAudioManagerForTest
let mockPlayIcon;
let mockPauseIcon;

function setupMockDOM() {
    // Create persistent mock icon objects
    mockPlayIcon = { style: { display: 'inline' } }; // Initial state
    mockPauseIcon = { style: { display: 'none' } };  // Initial state

    mockPlayPauseButton = {
        _mockPlayIcon: mockPlayIcon, // Store for reset logic if needed, or access via global scope
        _mockPauseIcon: mockPauseIcon,
        classList: {
            _classes: new Set(), // Internal state for classes
            add: function(className) {
                console.log(`mockPlayPauseButton.classList.add('${className}')`);
                this._classes.add(className);
            },
            remove: function(className) {
                console.log(`mockPlayPauseButton.classList.remove('${className}')`);
                this._classes.delete(className);
            },
            contains: function(className) {
                // console.log(`mockPlayPauseButton.classList.contains('${className}')`);
                return this._classes.has(className);
            }
        },
        setAttribute: (attr, value) => {
            console.log(`mockPlayPauseButton.setAttribute('${attr}', '${value}')`);
            mockPlayPauseButton[attr] = value; // Store attribute for later retrieval if needed
        },
        getAttribute: (attr) => { // Added for completeness
            // console.log(`mockPlayPauseButton.getAttribute('${attr}')`);
            return mockPlayPauseButton[attr];
        },
        querySelector: (selector) => {
            // console.log(`mockPlayPauseButton.querySelector('${selector}')`);
            if (selector === '.icon-play') return mockPlayIcon;
            if (selector === '.icon-pause') return mockPauseIcon;
            return null;
        },
        // _isMockPlaying is used by AudioManager's _updateButtonState via classList.add/remove 'playing'
        // We can infer playing state from classList.contains('playing')
        // Simulate internal state for classList.contains (now handled by classList._classes)
        // _isMockPlaying: false, // No longer needed directly here if classList is robust

        // Mock addEventListener for the button itself
        eventListeners: {},
        addEventListener: function(event, callback) {
            if (!this.eventListeners[event]) {
                this.eventListeners[event] = [];
            }
            this.eventListeners[event].push(callback);
            console.log(`mockPlayPauseButton: addEventListener for '${event}'`);
        },
        dispatchEvent: function(event) { // event should be an object like { type: 'click' } or new Event('click')
            const eventType = typeof event === 'string' ? event : event.type;
            console.log(`mockPlayPauseButton: dispatchEvent for '${eventType}'`);
            if (this.eventListeners[eventType]) {
                this.eventListeners[eventType].forEach(callback => callback.call(this, event));
            }
        }
    };

    mockVolumeSlider = {
        value: 0.5, // Default volume
        addEventListener: (event, callback) => console.log(`mockVolumeSlider.addEventListener('${event}', ...) called`),
        // No dispatchEvent needed for slider for now, unless we test user interaction with it
    };

    // Override document.getElementById
    const originalGetElementById = document.getElementById;
    document.getElementById = (id) => {
        console.log(`document.getElementById('${id}') called`);
        if (id === 'playPauseBtn') {
            return mockPlayPauseButton;
        }
        if (id === 'volumeSlider') {
            return mockVolumeSlider;
        }
        // Fallback to original for other elements (e.g., test-results div)
        return originalGetElementById.call(document, id);
    };
    console.log('Mock DOM elements set up and document.getElementById overridden.');
}

// Call setupMockDOM immediately to ensure it's ready before any AudioManager instantiation.
// This relies on the script execution order in test-runner.html.
if (typeof document !== 'undefined') {
    setupMockDOM();
} else {
    console.warn('`document` is not defined. Mock DOM setup for UI elements will not work. This is expected in Node.js environment without JSDOM.');
    // Define placeholder document and getElementById for Node.js if running tests there directly (not the primary method here)
    global.document = {
        getElementById: (id) => {
            console.log(`(Node) document.getElementById('${id}') called`);
            if (id === 'playPauseBtn') return mockPlayPauseButton; // You'd need to define these mocks for Node too
            if (id === 'volumeSlider') return mockVolumeSlider;
            return null;
        }
    };
}


// --- Test Suite Structure ---
console.log('Starting AudioManager tests...');

// Helper function to reset AudioManager and its mock audio element for each test section
function resetAudioManagerForTest() {
    // Reset static mock states
    MockAudioElement.setPlayPromiseRejection(false); // Ensure play() promises resolve by default

    // Create a new instance of the mock audio element before each AudioManager instantiation
    // This is important because AudioManager internally creates `new Audio()`
    // The global override `window.Audio = MockAudioElement` ensures it gets our mock.
    // We don't need to do `new MockAudioElement()` here explicitly for `window.Audio`
    // as `AudioManager` will call `new window.Audio()`.

    // Reset DOM element states if necessary
    if (mockPlayPauseButton) {
        // Reset icons' display styles
        if (mockPlayIcon && mockPlayIcon.style) {
            mockPlayIcon.style.display = 'inline';
        }
        if (mockPauseIcon && mockPauseIcon.style) {
            mockPauseIcon.style.display = 'none';
        }

        // Reset class list for the button
        if (mockPlayPauseButton.classList && typeof mockPlayPauseButton.classList.remove === 'function') {
             // mockPlayPauseButton.classList.remove('playing'); //This is already done by audioManager init
        }
        if (mockPlayPauseButton.classList && mockPlayPauseButton.classList._classes) {
            mockPlayPauseButton.classList._classes.clear(); // Clear all classes
        }


        // Reset attributes like aria-label
        if (typeof mockPlayPauseButton.setAttribute === 'function') {
            // AudioManager's init sets this, so not strictly needed to reset here if init is always called
            // mockPlayPauseButton.setAttribute('aria-label', 'Play Music');
        }
        // mockPlayPauseButton._isMockPlaying = false; // Not needed if relying on classList state
    }
    if (mockVolumeSlider) {
        mockVolumeSlider.value = 0.5; // Default AudioManager volume
    }

    // Instantiate AudioManager. It will use the globally mocked Audio and mocked document.getElementById
    // It's important that audio.js is loaded *before* this test script in test-runner.html
    // so that AudioManager class is defined.
    const audioManager = new AudioManager('playPauseBtn', 'volumeSlider');
    // The `init()` method is usually called by DOMContentLoaded listener in audio.js.
    // For testing, we might need to call it manually if DOMContentLoaded isn't fired in the test env,
    // or if we want to control when init happens.
    // However, our mock setup for getElementById should make the original init work.
    // For now, let's assume the DOMContentLoaded listener in audio.js handles init().
    // If tests fail due to elements not being ready, call audioManager.init() here.

    // We need access to the internal mock audio element created by AudioManager
    // This is a bit tricky as it's internal. For deeper testing, AudioManager might need
    // a way to expose its audio element, or we rely on observing side effects.
    // For now, we assume that `audioManager.audioElement` will be our `MockAudioElement` instance.
    // Let's add a check or a way to get it.
    // One way: The AudioManager could have a method getAudioElement() or we could modify the mock
    // to register instances.
    // For now, we'll create tests that don't need to directly manipulate the *specific instance*
    // of MockAudioElement from *outside* the AudioManager, but rather observe AudioManager's behavior.

    console.log('AudioManager instance potentially created/re-initialized for test section.');
    return audioManager;
}

// --- Add missing DOM elements needed for new tests ---
// This is a simplified way to ensure these elements exist for tests.
// In a Jest environment, you'd use `document.body.innerHTML` in a `beforeEach`.
// Here, we modify the mock `getElementById` and ensure these are available.

const originalGetElementById = document.getElementById;
document.getElementById = (id) => {
    // console.log(`document.getElementById called for: ${id}`);
    if (id === 'playPauseBtn') {
        return mockPlayPauseButton; // From existing setupMockDOM
    }
    if (id === 'volumeSlider') {
        return mockVolumeSlider; // From existing setupMockDOM
    }
    if (id === 'trackInfo') {
        if (!document.body.querySelector('#trackInfo')) {
            const trackInfoDiv = document.createElement('div');
            trackInfoDiv.id = 'trackInfo';
            document.body.appendChild(trackInfoDiv);
            // console.log('Created #trackInfo div');
        }
        return document.body.querySelector('#trackInfo');
    }
    if (id === 'prevBtn') {
        if (!document.body.querySelector('#prevBtn')) {
            const prevButton = document.createElement('button');
            prevButton.id = 'prevBtn';
            document.body.appendChild(prevButton);
            // console.log('Created #prevBtn button');
        }
        return document.body.querySelector('#prevBtn');
    }
    return originalGetElementById.call(document, id);
};


// == Initialization Tests ==
console.log('--- Initialization Tests ---');
(function() {
    const audioManager = resetAudioManagerForTest(); // This will call new AudioManager(...)
    // audioManager.init(); // Call init explicitly if DOMContentLoaded doesn't run or is unreliable in test env

    assertTrue(audioManager instanceof AudioManager, "AudioManager should be an instance of AudioManager");
    assertTrue(audioManager.audioElement instanceof MockAudioElement, "AudioManager.audioElement should be an instance of MockAudioElement");
    assertEquals(0, audioManager.currentTrackIndex, "Initial track index should be 0");
    assertEquals("assets/audio/zen-garden.mp3", audioManager.audioElement.src, "Initial audio src should be the first playlist item");
    assertEquals(0.5, audioManager.audioElement.volume, "Initial volume should be 0.5");
    assertTrue(audioManager.audioElement.paused, "Audio should be initially paused");

    // Test that event listeners are attached by init()
    // This requires the mock audioElement to have been created and init() called.
    // The DOMContentLoaded in audio.js should call init.
    // If not, we need to call audioManager.init() here.
    // Let's assume for a moment audioManager.init() has been called.
    // We need to verify that the specific instance of MockAudioElement used by audioManager has listeners.
    // This is tricky. A better way would be for MockAudioElement to have a static way to get the last instance,
    // or for AudioManager to expose its element.

    // For now, let's test the button state if init() was called.
    // The initial state is 'paused', so play icon should be visible.
    // This depends on the mockPlayPauseButton and its querySelector working.
    if (mockPlayPauseButton && mockPlayPauseButton.querySelector) {
        const playIcon = mockPlayPauseButton.querySelector('.icon-play');
        const pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
        if (playIcon && pauseIcon) { // Ensure querySelector returned them
             // After init, _updateButtonState is called.
             // It sets play icon to inline, pause icon to none.
            assertEquals('inline', playIcon.style.display, "Play icon should be visible initially");
            assertEquals('none', pauseIcon.style.display, "Pause icon should be hidden initially");
        } else {
            console.error("Could not find play/pause icons in mock button for init test.");
        }
    } else {
        console.error("mockPlayPauseButton or its querySelector is not set up for init test.");
    }

    // Verify Event Listener Attachment
    const expectedEvents = ['ended', 'error', 'loadedmetadata', 'play', 'pause'];
    assertTrue(!!audioManager.audioElement.eventListeners, "audioElement.eventListeners object should exist");

    expectedEvents.forEach(eventName => {
        assertTrue(!!audioManager.audioElement.eventListeners[eventName], `Event listener for '${eventName}' should exist`);
        assertTrue(audioManager.audioElement.eventListeners[eventName].length > 0, `Event listener array for '${eventName}' should not be empty`);
    });

    console.log('Initialization tests complete.');
})();

// == Playback Control Tests ==
console.log('--- Playback Control Tests ---');
(function() {
    const audioManager = resetAudioManagerForTest();
    // audioManager.init(); // Ensure initialized

    // Test play() - successful
    console.log("Test: play() successful");
    audioManager.play();
    assertFalse(audioManager.audioElement.paused, "Audio should not be paused after successful play()");
    assertTrue(audioManager.isPlaying, "AudioManager.isPlaying should be true after successful play()");
    if (mockPlayPauseButton && mockPlayPauseButton.querySelector) {
        const playIcon = mockPlayPauseButton.querySelector('.icon-play');
        const pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
        if (playIcon && pauseIcon) {
            assertEquals('none', playIcon.style.display, "Play icon should be hidden after successful play()");
            assertEquals('inline', pauseIcon.style.display, "Pause icon should be visible after successful play()");
        }
    }

    // Test pause()
    console.log("Test: pause()");
    audioManager.pause(); // Pauses the current track
    assertTrue(audioManager.audioElement.paused, "Audio should be paused after pause()");
    assertFalse(audioManager.isPlaying, "AudioManager.isPlaying should be false after pause()");
    if (mockPlayPauseButton && mockPlayPauseButton.querySelector) {
        const playIcon = mockPlayPauseButton.querySelector('.icon-play');
        const pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
        if (playIcon && pauseIcon) {
            assertEquals('inline', playIcon.style.display, "Play icon should be visible after pause()");
            assertEquals('none', pauseIcon.style.display, "Pause icon should be hidden after pause()");
        }
    }

    // Test play() promise rejection
    console.log("Test: play() promise rejection");
    MockAudioElement.setPlayPromiseRejection(true, new Error("Simulated Play Failure"));
    // audioManager.audioElement.constructor.setPlayPromiseRejection(true, new Error("Simulated Play Failure")); // Alternative way to call static method

    audioManager.play(); // Attempt to play, expecting promise rejection
    // Note: AudioManager's play().then().catch() should handle isPlaying and _updateButtonState.
    // We assume synchronous update for these tests for simplicity, as async testing in this environment is complex.
    assertFalse(audioManager.isPlaying, "AudioManager.isPlaying should be false after play() promise rejection");
    assertTrue(audioManager.audioElement.paused, "Audio element should be paused after play() promise rejection");
    if (mockPlayPauseButton && mockPlayPauseButton.querySelector) {
        const playIcon = mockPlayPauseButton.querySelector('.icon-play');
        if (playIcon) {
            assertEquals('inline', playIcon.style.display, "Play icon should be visible after play() promise rejection");
        }
    }
    MockAudioElement.setPlayPromiseRejection(false); // Reset for subsequent tests

    // Test play() when audioElement.src is initially empty
    console.log("Test: play() when src is initially empty");
    const freshAudioManager = resetAudioManagerForTest(); // Get a new manager
    freshAudioManager.audioElement.src = ''; // Manually clear src
    // freshAudioManager.audioElement.currentSrc = ''; // currentSrc is read-only, not directly settable for mock. Src is enough.

    freshAudioManager.play();
    const expectedSrc = freshAudioManager.playlist[freshAudioManager.currentTrackIndex].src;
    assertEquals(expectedSrc, freshAudioManager.audioElement.src, "AudioElement.src should be set from playlist if initially empty on play()");
    assertFalse(freshAudioManager.audioElement.paused, "Audio should play if src was initially empty but then set");
    assertTrue(freshAudioManager.isPlaying, "AudioManager.isPlaying should be true if src was initially empty but then set and played");


    // Test togglePlayPause() - refined
    console.log("Test: togglePlayPause() refined");
    const toggleManager = resetAudioManagerForTest();
    toggleManager.togglePlayPause(); // Should play
    assertFalse(toggleManager.audioElement.paused, "Audio should not be paused after first togglePlayPause()");
    assertTrue(toggleManager.isPlaying, "isPlaying should be TRUE after first toggle (play)");

    toggleManager.togglePlayPause(); // Should pause
    assertTrue(toggleManager.audioElement.paused, "Audio should be paused after second togglePlayPause()");
    assertFalse(toggleManager.isPlaying, "isPlaying should be FALSE after second toggle (pause)");

    // Test setVolume()
    console.log("Test: setVolume()");
    audioManager.setVolume(0.75);
    assertEquals(0.75, audioManager.audioElement.volume, "Volume should be 0.75 after setVolume(0.75)");
    audioManager.setVolume(1.5); // Invalid volume
    assertEquals(0.75, audioManager.audioElement.volume, "Volume should remain 0.75 after setVolume(1.5) (invalid)");
    audioManager.setVolume(-0.5); // Invalid volume
    assertEquals(0.75, audioManager.audioElement.volume, "Volume should remain 0.75 after setVolume(-0.5) (invalid)");

    console.log('Playback control tests complete.');
})();

// == Track Navigation Tests ==
console.log('--- Track Navigation Tests ---');
(function() {
    const audioManager = resetAudioManagerForTest();
    // audioManager.init();

    const initialTrackSrc = audioManager.playlist[0].src;
    const secondTrackSrc = audioManager.playlist[1].src;

    // Test nextTrack()
    audioManager.nextTrack();
    assertEquals(1, audioManager.currentTrackIndex, "Track index should be 1 after nextTrack()");
    assertEquals(secondTrackSrc, audioManager.audioElement.src, "Audio src should be the second track after nextTrack()");
    assertTrue(audioManager.audioElement.paused, "Audio should be paused after nextTrack() if it was paused before");

    // Test nextTrack() when playing
    audioManager.play(); // Start playing the second track
    assertFalse(audioManager.audioElement.paused, "Audio should be playing before nextTrack() while playing");
    audioManager.nextTrack(); // Go to third track
    assertEquals(2, audioManager.currentTrackIndex, "Track index should be 2 after nextTrack() while playing");
    assertFalse(audioManager.audioElement.paused, "Audio should continue playing on nextTrack() if it was playing before");

    // Test nextTrack() looping back to the first track
    audioManager.nextTrack(); // Should loop back to the first track (index 0)
    assertEquals(0, audioManager.currentTrackIndex, "Track index should loop back to 0");
    assertEquals(initialTrackSrc, audioManager.audioElement.src, "Audio src should be the first track after looping");

    // Test _handleTrackEnd() (simulates track finishing while playing)
    console.log("Test: _handleTrackEnd() while playing");
    audioManager.currentTrackIndex = 0; // Reset to first track
    audioManager.audioElement.src = audioManager.playlist[0].src;
    audioManager.play(); // Ensure playing
    assertTrue(audioManager.isPlaying, "_handleTrackEnd playing test: isPlaying should be true before track end");
    if (audioManager.audioElement && typeof audioManager.audioElement._simulateTrackEnd === 'function') {
        audioManager.audioElement._simulateTrackEnd(); // This will dispatch 'ended'
        assertEquals(1, audioManager.currentTrackIndex, "_handleTrackEnd playing test: Track index should advance");
        assertFalse(audioManager.audioElement.paused, "_handleTrackEnd playing test: Audio should auto-play next track");
        assertTrue(audioManager.isPlaying, "_handleTrackEnd playing test: isPlaying should remain true for next track");
    } else {
        console.error("_handleTrackEnd playing test: Cannot simulate track end: audioManager.audioElement._simulateTrackEnd is not available.");
    }

    // Test _handleTrackEnd() when AudioManager is paused
    console.log("Test: _handleTrackEnd() while paused");
    const pausedManager = resetAudioManagerForTest();
    pausedManager.currentTrackIndex = 0;
    pausedManager.audioElement.src = pausedManager.playlist[0].src;
    pausedManager.pause(); // Ensure paused
    pausedManager.isPlaying = false; // Explicitly set for clarity
    assertTrue(pausedManager.audioElement.paused, "_handleTrackEnd paused test: Audio should be paused initially");
    assertFalse(pausedManager.isPlaying, "_handleTrackEnd paused test: isPlaying should be false initially");

    if (pausedManager.audioElement && typeof pausedManager.audioElement._simulateTrackEnd === 'function') {
        pausedManager.audioElement._simulateTrackEnd(); // Simulate track ending

        assertEquals(1, pausedManager.currentTrackIndex, "_handleTrackEnd paused test: Track index should advance");
        assertFalse(pausedManager.isPlaying, "_handleTrackEnd paused test: isPlaying should remain false");
        assertTrue(pausedManager.audioElement.paused, "_handleTrackEnd paused test: New track should be loaded but paused");
        // Check that the new track's src is loaded
        assertEquals(pausedManager.playlist[1].src, pausedManager.audioElement.src, "_handleTrackEnd paused test: Correct new track src should be loaded");
    } else {
        console.error("_handleTrackEnd paused test: Cannot simulate track end: audioManager.audioElement._simulateTrackEnd is not available.");
    }

    console.log('Track navigation tests complete.');
})();

// == UI Update Tests ==
// These tests primarily check if _updateButtonState changes the appearance
// of the mock play/pause button correctly.
console.log('--- UI Update Tests ---');
(function() {
    const audioManager = resetAudioManagerForTest();
    // audioManager.init(); // init calls _updateButtonState

    // Initial state (paused)
    // Assuming init was called by DOMContentLoaded or resetAudioManagerForTest and it calls _updateButtonState
    let playIcon = mockPlayPauseButton.querySelector('.icon-play');
    let pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
    assertEquals('inline', playIcon.style.display, "UI Test: Play icon should be inline when paused (initial)");
    assertEquals('none', pauseIcon.style.display, "UI Test: Pause icon should be none when paused (initial)");

    // After play()
    audioManager.play(); // play() calls _updateButtonState via 'play' event
    // Need to re-query selectors if their style objects are replaced (unlikely with current mock)
    playIcon = mockPlayPauseButton.querySelector('.icon-play');
    pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
    assertEquals('none', playIcon.style.display, "UI Test: Play icon should be none when playing");
    assertEquals('inline', pauseIcon.style.display, "UI Test: Pause icon should be inline when playing");
    assertTrue(mockPlayPauseButton.classList.contains('playing'), "UI Test: Button should have 'playing' class when playing");
    assertEquals('Pause Music', mockPlayPauseButton.getAttribute('aria-label'), "UI Test: Aria-label should be 'Pause Music'");


    // After pause()
    audioManager.pause(); // pause() calls _updateButtonState via 'pause' event
    playIcon = mockPlayPauseButton.querySelector('.icon-play');
    pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
    assertEquals('inline', playIcon.style.display, "UI Test: Play icon should be inline when paused again");
    assertEquals('none', pauseIcon.style.display, "UI Test: Pause icon should be none when paused again");
    assertFalse(mockPlayPauseButton.classList.contains('playing'), "UI Test: Button should not have 'playing' class when paused");
    assertEquals('Play Music', mockPlayPauseButton.getAttribute('aria-label'), "UI Test: Aria-label should be 'Play Music'");


    console.log('UI Update tests complete.');
})();


// == Error Handling Tests ==
console.log('--- Error Handling Tests ---');

(function() {
    console.log("Test: 'error' event dispatched while playing");
    const audioManager = resetAudioManagerForTest();
    audioManager.play(); // Start playing
    assertTrue(audioManager.isPlaying, "Error test (playing): isPlaying should be true before error");
    assertFalse(audioManager.audioElement.paused, "Error test (playing): audioElement should not be paused before error");

    if (audioManager.audioElement && typeof audioManager.audioElement.dispatchEvent === 'function') {
        audioManager.audioElement.dispatchEvent(new Event('error')); // Dispatch error event

        // CRITICAL CHECK: AudioManager's 'error' event listener should set isPlaying to false.
        assertFalse(audioManager.isPlaying, "Error test (playing): isPlaying should be false after 'error' event");
        assertTrue(audioManager.audioElement.paused, "Error test (playing): audioElement should be paused after 'error' event by mock's dispatchEvent logic for error, or by AudioManager's handler");

        // Check UI update
        const playIcon = mockPlayPauseButton.querySelector('.icon-play');
        assertEquals('inline', playIcon.style.display, "Error test (playing): Play icon should be visible after 'error' event");
        const pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
        assertEquals('none', pauseIcon.style.display, "Error test (playing): Pause icon should be hidden after 'error' event");
        assertFalse(mockPlayPauseButton.classList.contains('playing'), "Error test (playing): Button should not have 'playing' class");
    } else {
        console.error("Error test (playing): Cannot dispatch 'error' event or audioElement not available.");
    }
})();

(function() {
    console.log("Test: 'error' event dispatched while paused");
    const audioManager = resetAudioManagerForTest();
    // Ensure it's paused (default state after resetAudioManagerForTest)
    assertFalse(audioManager.isPlaying, "Error test (paused): isPlaying should be false initially");
    assertTrue(audioManager.audioElement.paused, "Error test (paused): audioElement should be paused initially");

    if (audioManager.audioElement && typeof audioManager.audioElement.dispatchEvent === 'function') {
        audioManager.audioElement.dispatchEvent(new Event('error')); // Dispatch error event

        assertFalse(audioManager.isPlaying, "Error test (paused): isPlaying should remain false after 'error' event");
        assertTrue(audioManager.audioElement.paused, "Error test (paused): audioElement should remain paused");

        // Check UI update (should still reflect paused state)
        const playIcon = mockPlayPauseButton.querySelector('.icon-play');
        assertEquals('inline', playIcon.style.display, "Error test (paused): Play icon should remain visible");
        const pauseIcon = mockPlayPauseButton.querySelector('.icon-pause');
        assertEquals('none', pauseIcon.style.display, "Error test (paused): Pause icon should remain hidden");
        assertFalse(mockPlayPauseButton.classList.contains('playing'), "Error test (paused): Button should still not have 'playing' class");
    } else {
        console.error("Error test (paused): Cannot dispatch 'error' event or audioElement not available.");
    }
})();

(function() {
    console.log("Test: audioManager.play() with bad src (leading to error event from mock or promise rejection)");
    const audioManager = resetAudioManagerForTest();

    // Spy on console.error to check for AudioManager's specific error message
    let capturedConsoleError = "";
    const originalConsoleError = console.error;
    console.error = (message) => {
        capturedConsoleError += message + "\n"; // Concatenate messages
        originalConsoleError(message); // Call original console.error
    };

    // Set a source that will cause MockAudioElement's play() to reject or internal error event
    // Option 1: Use the promise rejection mechanism (tested in Playback Control)
    // MockAudioElement.setPlayPromiseRejection(true, new Error("Simulated bad source error"));
    // Option 2: Rely on MockAudioElement's src='' check in play()
    audioManager.audioElement.src = ''; // This will cause MockAudioElement.play() to reject and dispatch 'error'

    audioManager.play(); // Attempt to play

    // Assertions:
    // isPlaying should be false (handled by play()'s .catch() or the 'error' event handler)
    assertFalse(audioManager.isPlaying, "Play bad src: isPlaying should be false");
    // audioElement should be paused
    assertTrue(audioManager.audioElement.paused, "Play bad src: audioElement should be paused");
    // UI should reflect a non-playing state
    const playIcon = mockPlayPauseButton.querySelector('.icon-play');
    if (playIcon) { // Check if querySelector found it
        assertEquals('inline', playIcon.style.display, "Play bad src: Play icon should be visible");
    }
    // Check if AudioManager logged an error (e.g., "Error playing audio:")
    // This depends on the exact error message in AudioManager.js
    // assertTrue(capturedConsoleError.includes("Error playing audio:"), "Play bad src: AudioManager should log an error message");
    // Or, more generally, check that some error was captured by our spy:
    assertTrue(capturedConsoleError.length > 0, "Play bad src: console.error should have been called");


    console.error = originalConsoleError; // Restore original console.error
    MockAudioElement.setPlayPromiseRejection(false); // Clean up static mock state if changed
    console.log('Error Handling tests complete (specific section for bad src play).');
})();


console.log('AudioManager tests complete.');
// Ensure all console messages are flushed to the HTML view if using the redirection
// (The redirection in test-runner.html should handle this)

// Example of how to use assertion functions (already used above)
// assertTrue(1 === 1, "Example: 1 should be equal to 1");
// assertFalse(1 === 0, "Example: 1 should not be equal to 0");
// assertEquals("hello", "hello", "Example: Strings should be equal");


// == prevTrack Method Tests ==
console.log('--- prevTrack Method Tests ---');
(function() {
    let audioManager;
    let playSpy;

    // Setup before each test in this suite
    const beforeEach = () => {
        audioManager = resetAudioManagerForTest();
        // Ensure DOM elements are there if resetAudioManagerForTest doesn't handle them all for prevBtn
        if (!document.getElementById('prevBtn')) {
             const prevButton = document.createElement('button');
             prevButton.id = 'prevBtn';
             document.body.appendChild(prevButton);
        }
        // Spy on the play method of the audio element instance
        playSpy = {
            called: false,
            callCount: 0,
            fn: audioManager.audioElement.play, // Original function
            mock: function() { // Mock implementation
                this.called = true;
                this.callCount++;
                // console.log('Mocked play called on audio element');
                return this.fn.apply(audioManager.audioElement, arguments); // Call original
            }.bind(this) // Bind this for 'this.called'
        };
        // Replace the original play method with the mock
        audioManager.audioElement.play = playSpy.mock;
    };

    // Test case 1: Changes to the previous track
    (function() {
        beforeEach();
        console.log("Test: prevTrack() changes to the previous track");
        audioManager.currentTrackIndex = 1; // Start at the second track
        audioManager.audioElement.src = audioManager.playlist[1].src; // Sync src
        audioManager.prevTrack();
        assertEquals(0, audioManager.currentTrackIndex, "prevTrack() should change currentTrackIndex to 0");
        assertEquals(audioManager.playlist[0].src, audioManager.audioElement.src, "prevTrack() should change audioElement src to the first track");
    })();

    // Test case 2: Wraps around from the first to the last track
    (function() {
        beforeEach();
        console.log("Test: prevTrack() wraps around to the last track");
        audioManager.currentTrackIndex = 0; // Start at the first track
        audioManager.audioElement.src = audioManager.playlist[0].src; // Sync src
        audioManager.prevTrack();
        const lastTrackIndex = audioManager.playlist.length - 1;
        assertEquals(lastTrackIndex, audioManager.currentTrackIndex, "prevTrack() should wrap around to the last track index");
        assertEquals(audioManager.playlist[lastTrackIndex].src, audioManager.audioElement.src, "prevTrack() should change audioElement src to the last track");
    })();

    // Test case 3: Continues playing if music was playing
    (function() {
        beforeEach();
        console.log("Test: prevTrack() continues playing if music was playing");
        audioManager.currentTrackIndex = 1;
        audioManager.audioElement.src = audioManager.playlist[1].src;
        audioManager.isPlaying = true; // Simulate music was playing
        // audioManager.audioElement.play = jest.fn(); // Using jest.fn if in Jest env

        audioManager.prevTrack();
        assertTrue(playSpy.called, "prevTrack() should call play() on audioElement if isPlaying was true");
        assertEquals(1, playSpy.callCount, "play() should be called once");
        assertTrue(audioManager.isPlaying, "isPlaying should remain true"); // prevTrack calls play which sets isPlaying to true
    })();

    // Test case 4: Remains paused if music was paused
    (function() {
        beforeEach();
        console.log("Test: prevTrack() remains paused if music was paused");
        audioManager.currentTrackIndex = 1;
        audioManager.audioElement.src = audioManager.playlist[1].src;
        audioManager.isPlaying = false; // Simulate music was paused
        // audioManager.audioElement.play = jest.fn();

        audioManager.prevTrack();
        assertFalse(playSpy.called, "prevTrack() should not call play() on audioElement if isPlaying was false");
        assertFalse(audioManager.isPlaying, "isPlaying should remain false");
        assertEquals(audioManager.playlist[0].src, audioManager.audioElement.src, "prevTrack() should still update the src even if paused");
    })();

    console.log('prevTrack method tests complete.');
})();


// == Track Information Display Tests ==
console.log('--- Track Information Display Tests ---');
(function() {
    let audioManager;
    let trackInfoDiv;

    // Setup before each test in this suite
    const beforeEach = () => {
        // Ensure trackInfo div is in the document body for each test
        // This is a bit manual for a non-Jest environment
        let existingDiv = document.getElementById('trackInfo');
        if (existingDiv) {
            existingDiv.remove();
        }
        trackInfoDiv = document.createElement('div');
        trackInfoDiv.id = 'trackInfo';
        document.body.appendChild(trackInfoDiv);

        audioManager = resetAudioManagerForTest(); // This will call new AudioManager(...)
                                               // and its init() should call _updateTrackInfo
        // Note: resetAudioManagerForTest calls init(), which calls _updateTrackInfo.
        // So, trackInfoDiv should be populated after this line.
    };

    // Test case 1: Displays correct track title after init()
    (function() {
        beforeEach(); // This calls audioManager.init() via resetAudioManagerForTest()
        console.log("Test: Track info displays correct title after init()");
        const expectedTitle = audioManager.playlist[0].title;
        assertEquals(expectedTitle, trackInfoDiv.textContent, "Track info should display the first track's title after init");
    })();

    // Test case 2: Updates track title after nextTrack()
    (function() {
        beforeEach();
        console.log("Test: Track info updates after nextTrack()");
        audioManager.nextTrack();
        const expectedTitle = audioManager.playlist[1].title;
        assertEquals(expectedTitle, trackInfoDiv.textContent, "Track info should update to the second track's title after nextTrack");
    })();

    // Test case 3: Updates track title after prevTrack()
    (function() {
        beforeEach();
        console.log("Test: Track info updates after prevTrack()");
        audioManager.nextTrack(); // Go to track 1 first
        audioManager.prevTrack(); // Go back to track 0
        const expectedTitle = audioManager.playlist[0].title;
        assertEquals(expectedTitle, trackInfoDiv.textContent, "Track info should update to the first track's title after prevTrack");
    })();

    // Test case 4: Handles empty playlist gracefully
    (function() {
        beforeEach();
        console.log("Test: Track info displays default message for empty playlist");
        audioManager.playlist = [];
        audioManager.currentTrackIndex = 0; // Reset index
        audioManager.init(); // Re-initialize with empty playlist
        assertEquals("No track loaded", trackInfoDiv.textContent, "Track info should display 'No track loaded' for empty playlist after init");

        // Verify that nextTrack() and prevTrack() do not throw errors with an empty playlist
        try {
            audioManager.nextTrack(); // Should not throw
            audioManager.prevTrack(); // Should not throw
            assertTrue(true, "nextTrack() and prevTrack() should not throw an error on an empty playlist.");
        } catch (e) {
            assertTrue(false, `nextTrack() or prevTrack() threw an unexpected error on an empty playlist: ${e.message}`);
        }

        // Also test that the UI text remains unchanged
        assertEquals("No track loaded", trackInfoDiv.textContent, "Track info should remain 'No track loaded' after calls on empty playlist");

    })();


    console.log('Track Information Display tests complete.');
})();

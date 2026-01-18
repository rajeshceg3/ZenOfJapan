class AudioManager {
  constructor(playPauseButtonId, volumeSliderId) { // Accept button ID and volume slider ID
    this.audioElement = new Audio();
    this.currentTrackIndex = 0;
    this.playlist = [
      { title: "Zen Garden", src: "assets/audio/zen-garden.mp3", duration: 180 },
      { title: "Bamboo Flute", src: "assets/audio/bamboo-flute.mp3", duration: 150 },
      { title: "Temple Chants", src: "assets/audio/temple-chants.mp3", duration: 200 },
    ];
    this.isPlaying = false;
    this.playPauseButton = document.getElementById(playPauseButtonId); // Get button
    this.volumeSlider = document.getElementById(volumeSliderId); // Get volume slider
    this.seekSlider = document.getElementById('seekSlider');
    this.currentTimeDisplay = document.getElementById('currentTime');
    this.totalDurationDisplay = document.getElementById('totalDuration');
    this.trackIcon = document.querySelector('.track-icon'); // Get track icon

    this._handleTrackEnd = this._handleTrackEnd.bind(this);
    this._updateButtonState = this._updateButtonState.bind(this);
    this._updateProgress = this._updateProgress.bind(this);
    this.seek = this.seek.bind(this);
    this.prevTrack = this.prevTrack.bind(this); // Bind prevTrack
    this.nextTrack = this.nextTrack.bind(this); // Bind nextTrack
    this._updateTrackInfo = this._updateTrackInfo.bind(this); // Bind _updateTrackInfo

    this.isDragging = false; // Track dragging state
  }

  init() {
    if (!this.playlist || this.playlist.length === 0) {
      console.error("Playlist is empty. Cannot initialize audio.");
      return;
    }

    this.loadState(); // Load saved preferences

    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.volume = typeof this.savedVolume !== 'undefined' ? this.savedVolume : 0.5;

    this.audioElement.addEventListener('ended', this._handleTrackEnd);
    this.audioElement.addEventListener('error', (e) => {
      console.error("Error with audio element:", e);
      this._handleError("Audio Unavailable");
      this._updateButtonState(); // Reflect error in button state
    });
    this.audioElement.addEventListener('loadedmetadata', () => {
      // console.log("Track metadata loaded:", this.playlist[this.currentTrackIndex].title);
      if (this.totalDurationDisplay) {
        this.totalDurationDisplay.textContent = this.formatTime(this.audioElement.duration);
      }
      if (this.seekSlider) {
        this.seekSlider.max = this.audioElement.duration;
      }
    });
    this.audioElement.addEventListener('timeupdate', this._updateProgress);
    this.audioElement.addEventListener('play', this._updateButtonState);
    this.audioElement.addEventListener('pause', this._updateButtonState);
    this.audioElement.addEventListener('waiting', () => this._setLoadingState(true));
    this.audioElement.addEventListener('canplay', () => this._setLoadingState(false));
    this.audioElement.addEventListener('playing', () => this._setLoadingState(false));

    if (this.playPauseButton) {
        this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
    }

    if (this.volumeSlider) {
      this.volumeSlider.value = this.audioElement.volume; // Set initial slider value
      this._updateSliderVisual(this.volumeSlider, this.audioElement.volume, 1); // Initial visual fill
      this.volumeSlider.addEventListener('input', () => this.setVolume(this.volumeSlider.value));
    }

    if (this.seekSlider) {
      this.seekSlider.addEventListener('mousedown', () => { this.isDragging = true; });
      this.seekSlider.addEventListener('touchstart', () => { this.isDragging = true; }, { passive: true });

      this.seekSlider.addEventListener('input', (e) => {
        const time = parseFloat(e.target.value);
        if (this.currentTimeDisplay) {
            this.currentTimeDisplay.textContent = this.formatTime(time);
        }
        this._updateSliderVisual(this.seekSlider, time, this.audioElement.duration || 100);
      });

      this.seekSlider.addEventListener('change', (e) => {
        this.isDragging = false;
        this.seek(parseFloat(e.target.value));
      });

      this.seekSlider.addEventListener('mouseup', () => { this.isDragging = false; });
      this.seekSlider.addEventListener('touchend', () => { this.isDragging = false; });
    }

    this._updateButtonState(); // Initial button state
    this._updateTrackInfo(); // Update track info on init
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (!this.audioElement.src || this.audioElement.currentSrc === "") {
        // If src is not set, or if it's an empty string (can happen on initial load or after error)
        this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    }

    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
        this._clearError();
        // console.log("Playing:", this.playlist[this.currentTrackIndex].title);
        // this._updateButtonState(); // Handled by 'play' event
      })
      .catch(error => {
        console.error("Error playing audio:", error);
        this.isPlaying = false;
        this._handleError("Playback Error");
        this._updateButtonState(); // Ensure button reflects that playback failed
      });
    }
  }

  pause() {
    this.audioElement.pause();
    this.isPlaying = false;
    // console.log("Paused:", this.playlist[this.currentTrackIndex].title);
    // this._updateButtonState(); // Handled by 'pause' event
  }

  setVolume(level) {
    if (level >= 0 && level <= 1) {
      this.audioElement.volume = level;
      this._updateSliderVisual(this.volumeSlider, level, 1); // Update the visual fill
      this.saveState();
      // console.log("Volume set to:", level);
    } else {
      console.warn("Volume level must be between 0 and 1.");
    }
  }

  seek(time) {
    if (isFinite(time)) {
      this.audioElement.currentTime = time;
    }
  }

  _updateProgress() {
    // Only update slider position if user is NOT dragging it
    if (this.seekSlider && !this.isDragging) {
        this.seekSlider.value = this.audioElement.currentTime;
        this._updateSliderVisual(this.seekSlider, this.audioElement.currentTime, this.audioElement.duration || 100);
    }
    // Always update text display regardless of dragging (or maybe not?
    // If dragging, input event handles text. If not dragging, this handles it.
    // So if !isDragging, update text.
    // Actually, input event updates text while dragging.
    // So here we update only if not dragging to avoid conflict/flicker?
    // Let's stick to updating only when not dragging, as the input event covers the dragging case.
    if (this.currentTimeDisplay && !this.isDragging) {
        this.currentTimeDisplay.textContent = this.formatTime(this.audioElement.currentTime);
    }
  }

  _updateSliderVisual(slider, value, max) {
    if (slider) {
      // Calculate percentage for CSS linear-gradient
      let percentage = (value / max) * 100;
      if (isNaN(percentage) || !isFinite(percentage)) {
          percentage = 0;
      }
      // Use the CSS variable for the unfilled track portion to ensure sync with styles.css
      slider.style.background = `linear-gradient(to right, var(--c-teal-500) 0%, var(--c-teal-500) ${percentage}%, var(--slider-track-bg) ${percentage}%, var(--slider-track-bg) 100%)`;
    }
  }

  formatTime(seconds) {
    if (!isFinite(seconds)) {return "0:00";}
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  nextTrack() {
    if (this.playlist.length === 0) {
      console.warn("Cannot navigate to next track: playlist is empty.");
      return;
    }
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.load(); // Important to load the new source
    if (this.isPlaying) {
        this.play();
    }
    this.saveState();
    this._updateButtonState(); // Update button if needed (e.g. if it displays track info)
    this._updateTrackInfo(); // Update track info on nextTrack
  }

  prevTrack() {
    if (this.playlist.length === 0) {
      console.warn("Cannot navigate to previous track: playlist is empty.");
      return;
    }
    this.currentTrackIndex--;
    if (this.currentTrackIndex < 0) {
      this.currentTrackIndex = this.playlist.length - 1;
    }
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.load();
    if (this.isPlaying) {
      this.play();
    }
    this.saveState();
    this._updateButtonState(); // Update button if needed
    this._updateTrackInfo(); // Update track info on prevTrack
  }

  _handleTrackEnd() {
    this.nextTrack();
  }

  _updateButtonState() {
    if (!this.playPauseButton) {return;}
    const iconPlay = this.playPauseButton.querySelector('.icon-play');
    const iconPause = this.playPauseButton.querySelector('.icon-pause');
    const iconLoading = this.playPauseButton.querySelector('.icon-loading');

    // If waiting, the loading state handles visibility.
    if (!iconLoading.classList.contains('hidden')) {
        if(iconPlay) {iconPlay.classList.add('hidden');}
        if(iconPause) {iconPause.classList.add('hidden');}
        return;
    }

    if (this.isPlaying) {
      this.playPauseButton.classList.add('playing');
      this.playPauseButton.setAttribute('aria-label', 'Pause Music');
      if(iconPlay) {iconPlay.classList.add('hidden');}
      if(iconPause) {iconPause.classList.remove('hidden');}
      if(this.trackIcon) {this.trackIcon.classList.add('playing');}
    } else {
      this.playPauseButton.classList.remove('playing');
      this.playPauseButton.setAttribute('aria-label', 'Play Music');
      if(iconPlay) {iconPlay.classList.remove('hidden');}
      if(iconPause) {iconPause.classList.add('hidden');}
      if(this.trackIcon) {this.trackIcon.classList.remove('playing');}
    }
  }

  _setLoadingState(isLoading) {
      if (!this.playPauseButton) {return;}
      const iconLoading = this.playPauseButton.querySelector('.icon-loading');
      if (!iconLoading) {return;}

      if (isLoading) {
          iconLoading.classList.remove('hidden');
      } else {
          iconLoading.classList.add('hidden');
      }
      this._updateButtonState();
  }

  _updateTrackInfo() {
    const trackInfoDiv = document.getElementById('trackInfo');
    if (trackInfoDiv) {
      // Add fade-out class to trigger animation
      trackInfoDiv.classList.add('fade-out');

      // Wait for the transition to finish (e.g., 300ms matches CSS) before updating text
      setTimeout(() => {
        if (this.playlist.length > 0 && this.playlist[this.currentTrackIndex]) {
          trackInfoDiv.textContent = this.playlist[this.currentTrackIndex].title;
        } else {
          trackInfoDiv.textContent = 'No track loaded';
        }
        // Remove class to fade back in
        trackInfoDiv.classList.remove('fade-out');
        this._clearError(); // Clear any previous errors on track change
      }, 300);
    }
  }

  _handleError(message) {
    const statusEl = document.querySelector('.track-status');
    if (statusEl) {
      statusEl.textContent = message || "Error";
      statusEl.classList.add('error');
    }
  }

  _clearError() {
    const statusEl = document.querySelector('.track-status');
    if (statusEl) {
      statusEl.textContent = "Now Playing";
      statusEl.classList.remove('error');
    }
  }

  saveState() {
    const state = {
      volume: this.audioElement.volume,
      trackIndex: this.currentTrackIndex
    };
    try {
      localStorage.setItem('audioPlayerState', JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save state to localStorage:", e);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('audioPlayerState');
      if (saved) {
        const state = JSON.parse(saved);
        if (typeof state.volume === 'number' && state.volume >= 0 && state.volume <= 1) {
          this.savedVolume = state.volume;
        }
        if (typeof state.trackIndex === 'number' && state.trackIndex >= 0 && state.trackIndex < this.playlist.length) {
          this.currentTrackIndex = state.trackIndex;
        }
      }
    } catch (e) {
      console.warn("Could not load state from localStorage:", e);
    }
  }
}

// Modify the instantiation at the end of the file:
// DOMContentLoaded ensures the button exists before audioManager tries to access it.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const audioManager = new AudioManager('playPauseBtn', 'volumeSlider');
    audioManager.init();

  // Add event listener for the previous button
  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => audioManager.prevTrack());
  }

  // Add event listener for the next button
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => audioManager.nextTrack());
  }

  // Keyboard accessibility
  document.addEventListener('keydown', (event) => {
    // Only handle global keys if not focused on an input (though we have none except volume)
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {return;}

    if (event.code === 'Space') {
      event.preventDefault(); // Prevent scrolling
      audioManager.togglePlayPause();
    } else if (event.code === 'ArrowRight') {
      audioManager.nextTrack();
    } else if (event.code === 'ArrowLeft') {
      audioManager.prevTrack();
    }
  });
  });
}

// Export the AudioManager class for Node.js environments (e.g., testing)
// Check if module and module.exports are defined to maintain browser compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}

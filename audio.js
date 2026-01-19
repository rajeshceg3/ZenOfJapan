// Utility Class for User Feedback
class ToastManager {
  static show(message, type = 'info') {
    // Check if toast container exists, if not create it (lazy initialization)
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 3000);
  }
}

class AudioManager {
  constructor(playPauseButtonId, volumeSliderId) {
    this.audioElement = new Audio();
    this.currentTrackIndex = 0;
    this.playlist = [
      { title: "Zen Garden", src: "assets/audio/zen-garden.mp3", duration: 180 },
      { title: "Bamboo Flute", src: "assets/audio/bamboo-flute.mp3", duration: 150 },
      { title: "Temple Chants", src: "assets/audio/temple-chants.mp3", duration: 200 },
    ];
    this.isPlaying = false;
    this.userVolume = 0.5; // Track user preference separately from current fading volume

    // UI Elements
    this.playPauseButton = document.getElementById(playPauseButtonId);
    this.volumeSlider = document.getElementById(volumeSliderId);
    this.seekSlider = document.getElementById('seekSlider');
    this.currentTimeDisplay = document.getElementById('currentTime');
    this.totalDurationDisplay = document.getElementById('totalDuration');
    this.trackIcon = document.querySelector('.track-icon');

    // Bindings
    this._handleTrackEnd = this._handleTrackEnd.bind(this);
    this._updateButtonState = this._updateButtonState.bind(this);
    this._updateProgress = this._updateProgress.bind(this);
    this.seek = this.seek.bind(this);
    this.prevTrack = this.prevTrack.bind(this);
    this.nextTrack = this.nextTrack.bind(this);
    this._updateTrackInfo = this._updateTrackInfo.bind(this);

    this.isDragging = false;
    this.isFading = false;
  }

  init() {
    if (!this.playlist || this.playlist.length === 0) {
      console.error("Playlist is empty. Cannot initialize audio.");
      return;
    }

    this.loadState();

    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.volume = this.userVolume;

    // Event Listeners
    this.audioElement.addEventListener('ended', this._handleTrackEnd);
    this.audioElement.addEventListener('error', (e) => {
      console.error("Error with audio element:", e);
      this._handleError("Audio Unavailable");
      this._updateButtonState();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
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
      this.volumeSlider.value = this.userVolume;
      this._updateSliderVisual(this.volumeSlider, this.userVolume, 1);
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

    this._updateButtonState();
    this._updateTrackInfo();
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  // Refactored Play with Retry Logic and Fade In
  async play(withFade = true) {
    if (!this.audioElement.src || this.audioElement.currentSrc === "") {
        this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    }

    try {
      if (withFade) {
          this.audioElement.volume = 0; // Start at 0 for fade in
      } else {
          this.audioElement.volume = this.userVolume;
      }

      await this._safePlayPromise();

      this.isPlaying = true;
      this._clearError();

      if (withFade) {
          await this._fadeIn(this.userVolume);
      }
    } catch (error) {
      console.error("Playback failed after retries:", error);
      this.isPlaying = false;
      this._handleError("Playback Failed");
      ToastManager.show("Playback failed. Please check your connection.", "error");
      this._updateButtonState();
    }
  }

  // Internal Retry Logic
  async _safePlayPromise(retries = 3) {
      for (let i = 0; i < retries; i++) {
          try {
              await this.audioElement.play();
              return; // Success
          } catch (e) {
              if (i === retries - 1) {throw e;} // Fail on last try
              // Exponential backoff: 500ms, 1000ms, 1500ms...
              await new Promise(r => setTimeout(r, 500 * (i + 1)));
          }
      }
  }

  pause() {
    this.audioElement.pause();
    this.isPlaying = false;
  }

  // Crossfade Utilities
  _fadeOut(duration = 500) {
      if (this.isFading) {return Promise.resolve();}
      this.isFading = true;
      return new Promise(resolve => {
          const startVol = this.audioElement.volume;
          const step = startVol / (duration / 50);
          const fadeInterval = setInterval(() => {
              if (this.audioElement.volume - step > 0.01) {
                  this.audioElement.volume -= step;
              } else {
                  this.audioElement.volume = 0;
                  clearInterval(fadeInterval);
                  this.isFading = false;
                  resolve();
              }
          }, 50);
      });
  }

  _fadeIn(targetVol, duration = 500) {
      if (this.isFading) {return Promise.resolve();}
      this.isFading = true;
      this.audioElement.volume = 0;
      return new Promise(resolve => {
          const step = targetVol / (duration / 50);
          const fadeInterval = setInterval(() => {
              if (this.audioElement.volume + step < targetVol) {
                  this.audioElement.volume += step;
              } else {
                  this.audioElement.volume = targetVol;
                  clearInterval(fadeInterval);
                  this.isFading = false;
                  resolve();
              }
          }, 50);
      });
  }

  setVolume(level) {
    if (level >= 0 && level <= 1) {
      this.userVolume = parseFloat(level); // Store user preference
      // Only update element volume if not currently fading to avoid conflict
      if (!this.isFading) {
          this.audioElement.volume = this.userVolume;
      }
      this._updateSliderVisual(this.volumeSlider, level, 1);
      this.saveState();
    }
  }

  seek(time) {
    if (isFinite(time)) {
      this.audioElement.currentTime = time;
    }
  }

  _updateProgress() {
    if (this.seekSlider && !this.isDragging) {
        this.seekSlider.value = this.audioElement.currentTime;
        this._updateSliderVisual(this.seekSlider, this.audioElement.currentTime, this.audioElement.duration || 100);
    }
    if (this.currentTimeDisplay && !this.isDragging) {
        this.currentTimeDisplay.textContent = this.formatTime(this.audioElement.currentTime);
    }
  }

  _updateSliderVisual(slider, value, max) {
    if (slider) {
      let percentage = (value / max) * 100;
      if (isNaN(percentage) || !isFinite(percentage)) {percentage = 0;}
      slider.style.background = `linear-gradient(to right, var(--c-teal-500) 0%, var(--c-teal-500) ${percentage}%, var(--slider-track-bg) ${percentage}%, var(--slider-track-bg) 100%)`;
    }
  }

  formatTime(seconds) {
    if (!isFinite(seconds)) {return "0:00";}
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  async nextTrack() {
    if (this.playlist.length === 0) {return;}

    if (this.isPlaying) {
        await this._fadeOut(300); // Quick fade out
    }

    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this._switchTrack();
  }

  async prevTrack() {
    if (this.playlist.length === 0) {return;}

    if (this.isPlaying) {
        await this._fadeOut(300);
    }

    this.currentTrackIndex--;
    if (this.currentTrackIndex < 0) {
      this.currentTrackIndex = this.playlist.length - 1;
    }
    this._switchTrack();
  }

  _switchTrack() {
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.load();
    this.saveState();
    this._updateButtonState();
    this._updateTrackInfo();

    if (this.isPlaying) {
        this.play(true); // Play with fade-in
    }
  }

  _handleTrackEnd() {
    this.nextTrack();
  }

  _updateButtonState() {
    if (!this.playPauseButton) {return;}
    const iconPlay = this.playPauseButton.querySelector('.icon-play');
    const iconPause = this.playPauseButton.querySelector('.icon-pause');
    const iconLoading = this.playPauseButton.querySelector('.icon-loading');

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
      trackInfoDiv.classList.add('fade-out');
      setTimeout(() => {
        if (this.playlist.length > 0) {
          trackInfoDiv.textContent = this.playlist[this.currentTrackIndex].title;
        } else {
          trackInfoDiv.textContent = 'No track loaded';
        }
        trackInfoDiv.classList.remove('fade-out');
        this._clearError();
      }, 300);
    }
  }

  _handleError(message) {
    const statusEl = document.querySelector('.track-status');
    if (statusEl) {
      statusEl.textContent = message || "Error";
      statusEl.classList.add('error');
    }
    // Also show toast
    ToastManager.show(message || "An error occurred", "error");
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
      volume: this.userVolume, // Save user preference, not necessarily current volume (if fading)
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
          this.userVolume = state.volume;
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

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const audioManager = new AudioManager('playPauseBtn', 'volumeSlider');
    audioManager.init();

  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {prevBtn.addEventListener('click', () => audioManager.prevTrack());}

  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {nextBtn.addEventListener('click', () => audioManager.nextTrack());}

  const openHelpBtn = document.getElementById('openHelpBtn');
  if (openHelpBtn) {
      openHelpBtn.addEventListener('click', () => {
          const modal = document.getElementById('helpModal');
          if (modal) {modal.classList.remove('hidden');}
      });
  }

  const closeHelpBtn = document.querySelector('.close-modal');
  if (closeHelpBtn) {
      closeHelpBtn.addEventListener('click', () => {
          const modal = document.getElementById('helpModal');
          if (modal) modal.classList.add('hidden');
      });
  }

  document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {return;}

    if (event.code === 'Space') {
      event.preventDefault();
      audioManager.togglePlayPause();
    } else if (event.code === 'ArrowRight') {
      audioManager.nextTrack();
    } else if (event.code === 'ArrowLeft') {
      audioManager.prevTrack();
    }
    // New: Toggle Help Modal with '?' (Shift + /)
    else if (event.key === '?') {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.classList.toggle('hidden');
        }
    }
    // Escape to close help modal
    else if (event.code === 'Escape') {
        const modal = document.getElementById('helpModal');
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    }
  });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}

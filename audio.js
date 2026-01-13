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
    this.isMuted = false;
    this.previousVolume = 0.5;

    this.playPauseButton = document.getElementById(playPauseButtonId);
    this.volumeSlider = document.getElementById(volumeSliderId);
    this.trackIcon = document.querySelector('.track-icon');

    // Progress elements
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.currentTimeEl = document.getElementById('currentTime');
    this.durationEl = document.getElementById('duration');

    // Mute button
    this.muteButton = document.querySelector('.volume-btn');

    this._handleTrackEnd = this._handleTrackEnd.bind(this);
    this._updateButtonState = this._updateButtonState.bind(this);
    this._updateProgress = this._updateProgress.bind(this);
    this._setProgress = this._setProgress.bind(this);
    this.prevTrack = this.prevTrack.bind(this);
    this.nextTrack = this.nextTrack.bind(this);
    this._updateTrackInfo = this._updateTrackInfo.bind(this);
    this.toggleMute = this.toggleMute.bind(this);
  }

  init() {
    if (!this.playlist || this.playlist.length === 0) {
      console.error("Playlist is empty. Cannot initialize audio.");
      return;
    }
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.volume = 0.5;

    // Events
    this.audioElement.addEventListener('ended', this._handleTrackEnd);
    this.audioElement.addEventListener('error', (e) => {
      console.error("Error with audio element:", e);
      this._updateButtonState();
    });
    this.audioElement.addEventListener('loadedmetadata', () => {
        if(this.durationEl) {
            this.durationEl.textContent = this._formatTime(this.audioElement.duration || 0);
        }
    });
    this.audioElement.addEventListener('play', this._updateButtonState);
    this.audioElement.addEventListener('pause', this._updateButtonState);
    this.audioElement.addEventListener('timeupdate', this._updateProgress);

    if (this.playPauseButton) {
        this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
    }

    if (this.volumeSlider) {
      this.volumeSlider.value = this.audioElement.volume;
      this.volumeSlider.addEventListener('input', () => this.setVolume(this.volumeSlider.value));
    }

    if (this.progressContainer) {
        this.progressContainer.addEventListener('click', this._setProgress);
    }

    if (this.muteButton) {
        this.muteButton.addEventListener('click', this.toggleMute);
    }

    this._updateButtonState();
    this._updateTrackInfo();
    console.log("AudioManager initialized.");
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
        this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    }

    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
      })
      .catch(error => {
        console.error("Error playing audio:", error);
        this.isPlaying = false;
        this._updateButtonState();
      });
    }
  }

  pause() {
    this.audioElement.pause();
    this.isPlaying = false;
  }

  setVolume(level) {
    if (level >= 0 && level <= 1) {
      this.audioElement.volume = level;
      if (level > 0 && this.isMuted) {
          this.isMuted = false; // Unmute if slider is moved
          this._updateMuteUI();
      } else if (level == 0 && !this.isMuted) {
          this.isMuted = true;
          this._updateMuteUI();
      }
    }
  }

  toggleMute() {
    if (this.isMuted) {
        // Unmute
        this.audioElement.volume = this.previousVolume || 0.5;
        this.isMuted = false;
        if (this.volumeSlider) this.volumeSlider.value = this.audioElement.volume;
    } else {
        // Mute
        this.previousVolume = this.audioElement.volume;
        this.audioElement.volume = 0;
        this.isMuted = true;
        if (this.volumeSlider) this.volumeSlider.value = 0;
    }
    this._updateMuteUI();
  }

  _updateMuteUI() {
      if (!this.muteButton) return;
      if (this.isMuted) {
          this.muteButton.setAttribute('aria-label', 'Unmute');
          this.muteButton.style.opacity = '0.5';
          // Ideally swap icon to muted, but opacity works for now as quick feedback
      } else {
          this.muteButton.setAttribute('aria-label', 'Mute');
          this.muteButton.style.opacity = '1';
      }
  }

  nextTrack() {
    if (this.playlist.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this._changeTrack();
  }

  prevTrack() {
    if (this.playlist.length === 0) return;
    this.currentTrackIndex--;
    if (this.currentTrackIndex < 0) {
      this.currentTrackIndex = this.playlist.length - 1;
    }
    this._changeTrack();
  }

  _changeTrack() {
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.load();
    if (this.isPlaying) {
        this.play();
    }
    this._updateButtonState();
    this._updateTrackInfo();
  }

  _handleTrackEnd() {
    this.nextTrack();
  }

  _updateProgress(e) {
    // Fixed: Use e.target instead of deprecated e.srcElement
    const { duration, currentTime } = e.target;
    if (isNaN(duration)) return;

    const progressPercent = (currentTime / duration) * 100;

    if (this.progressFill) {
        this.progressFill.style.width = `${progressPercent}%`;
    }

    if (this.currentTimeEl) {
        this.currentTimeEl.textContent = this._formatTime(currentTime);
    }

    if (this.progressContainer) {
        this.progressContainer.setAttribute('aria-valuenow', Math.round(progressPercent));
    }
  }

  _setProgress(e) {
    const width = this.progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = this.audioElement.duration;

    if (isNaN(duration)) return;

    this.audioElement.currentTime = (clickX / width) * duration;
  }

  _formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  }

  _updateButtonState() {
    if (!this.playPauseButton) return;
    const iconPlay = this.playPauseButton.querySelector('.icon-play');
    const iconPause = this.playPauseButton.querySelector('.icon-pause');

    if (this.isPlaying) {
      this.playPauseButton.classList.add('playing');
      this.playPauseButton.setAttribute('aria-label', 'Pause Music');
      if(iconPlay) iconPlay.style.display = 'none';
      if(iconPause) iconPause.style.display = 'block';
      if(this.trackIcon) this.trackIcon.classList.add('playing');
    } else {
      this.playPauseButton.classList.remove('playing');
      this.playPauseButton.setAttribute('aria-label', 'Play Music');
      if(iconPlay) iconPlay.style.display = 'block';
      if(iconPause) iconPause.style.display = 'none';
      if(this.trackIcon) this.trackIcon.classList.remove('playing');
    }
  }

  _updateTrackInfo() {
    const trackInfoDiv = document.getElementById('trackInfo');
    if (trackInfoDiv) {
      trackInfoDiv.classList.add('fade-out');
      setTimeout(() => {
        if (this.playlist.length > 0 && this.playlist[this.currentTrackIndex]) {
          trackInfoDiv.textContent = this.playlist[this.currentTrackIndex].title;
        } else {
          trackInfoDiv.textContent = 'No track loaded';
        }
        trackInfoDiv.classList.remove('fade-out');
      }, 300);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const audioManager = new AudioManager('playPauseBtn', 'volumeSlider');
  audioManager.init();

  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => audioManager.prevTrack());
  }

  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => audioManager.nextTrack());
  }

  document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

    if (event.code === 'Space') {
      event.preventDefault();
      audioManager.togglePlayPause();
    } else if (event.code === 'ArrowRight') {
      audioManager.nextTrack();
    } else if (event.code === 'ArrowLeft') {
      audioManager.prevTrack();
    }
  });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}

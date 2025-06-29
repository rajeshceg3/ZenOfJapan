class AudioManager {
  constructor(playPauseButtonId, volumeSliderId) { // Accept button ID and volume slider ID
    this.audioElement = new Audio();
    this.currentTrackIndex = 0;
    this.playlist = [
      { title: "Zen Garden", src: "assets/audio/zen-garden.mp3", duration: 180 },
      { title: "Bamboo Flute", src: "assets/audio/bamboo-flute.mp3", duration: 150 },
      { title: "Temple Chants", src: "assets/audio/temple-chants.mp3", duration: 200 },
      { title: "Sakuya3", src: "assets/audio/sakuya3.mp3", duration: 201 },
      { title: "Ronin", src: "assets/audio/ronin.mp3", duration: 145 },
    ];
    this.isPlaying = false;
    this.playPauseButton = document.getElementById(playPauseButtonId); // Get button
    this.volumeSlider = document.getElementById(volumeSliderId); // Get volume slider

    this._handleTrackEnd = this._handleTrackEnd.bind(this);
    this._updateButtonState = this._updateButtonState.bind(this);
    this.prevTrack = this.prevTrack.bind(this); // Bind prevTrack
    this._updateTrackInfo = this._updateTrackInfo.bind(this); // Bind _updateTrackInfo
  }

  init() {
    if (!this.playlist || this.playlist.length === 0) {
      console.error("Playlist is empty. Cannot initialize audio.");
      return;
    }
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.volume = 0.5;

    this.audioElement.addEventListener('ended', this._handleTrackEnd);
    this.audioElement.addEventListener('error', (e) => {
      console.error("Error with audio element:", e);
      this._updateButtonState(); // Reflect error in button state
    });
    this.audioElement.addEventListener('loadedmetadata', () => {
      // console.log("Track metadata loaded:", this.playlist[this.currentTrackIndex].title);
    });
    this.audioElement.addEventListener('play', this._updateButtonState);
    this.audioElement.addEventListener('pause', this._updateButtonState);

    if (this.playPauseButton) {
        this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
    }

    if (this.volumeSlider) {
      this.volumeSlider.value = this.audioElement.volume; // Set initial slider value
      this.volumeSlider.addEventListener('input', () => this.setVolume(this.volumeSlider.value));
    }

    this._updateButtonState(); // Initial button state
    console.log("AudioManager initialized. Current track:", this.playlist[this.currentTrackIndex].title);
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
        // console.log("Playing:", this.playlist[this.currentTrackIndex].title);
        // this._updateButtonState(); // Handled by 'play' event
      })
      .catch(error => {
        console.error("Error playing audio:", error);
        this.isPlaying = false;
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
      console.log("Volume set to:", level);
    } else {
      console.warn("Volume level must be between 0 and 1.");
    }
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.load(); // Important to load the new source
    if (this.isPlaying) {
        this.play();
    }
    console.log("Next track:", this.playlist[this.currentTrackIndex].title);
    this._updateButtonState(); // Update button if needed (e.g. if it displays track info)
    this._updateTrackInfo(); // Update track info on nextTrack
  }

  prevTrack() {
    this.currentTrackIndex--;
    if (this.currentTrackIndex < 0) {
      this.currentTrackIndex = this.playlist.length - 1;
    }
    this.audioElement.src = this.playlist[this.currentTrackIndex].src;
    this.audioElement.load();
    if (this.isPlaying) {
      this.play();
    }
    console.log("Previous track:", this.playlist[this.currentTrackIndex].title);
    this._updateButtonState(); // Update button if needed
    this._updateTrackInfo(); // Update track info on prevTrack
  }

  _handleTrackEnd() {
    console.log("Track ended:", this.playlist[this.currentTrackIndex].title);
    this.nextTrack();
  }

  _updateButtonState() {
    if (!this.playPauseButton) return;
    const iconPlay = this.playPauseButton.querySelector('.icon-play');
    const iconPause = this.playPauseButton.querySelector('.icon-pause');

    if (this.isPlaying) {
      this.playPauseButton.classList.add('playing');
      this.playPauseButton.setAttribute('aria-label', 'Pause Music');
      if(iconPlay) iconPlay.style.display = 'none';
      if(iconPause) iconPause.style.display = 'inline';
    } else {
      this.playPauseButton.classList.remove('playing');
      this.playPauseButton.setAttribute('aria-label', 'Play Music');
      if(iconPlay) iconPlay.style.display = 'inline';
      if(iconPause) iconPause.style.display = 'none';
    }
  }

  _updateTrackInfo() {
    const trackInfoDiv = document.getElementById('trackInfo');
    if (trackInfoDiv && this.playlist.length > 0 && this.playlist[this.currentTrackIndex]) {
      trackInfoDiv.textContent = this.playlist[this.currentTrackIndex].title;
    } else if (trackInfoDiv) {
      trackInfoDiv.textContent = 'No track loaded'; // Default message
    }
  }
}

// Modify the instantiation at the end of the file:
// DOMContentLoaded ensures the button exists before audioManager tries to access it.
document.addEventListener('DOMContentLoaded', () => {
  const audioManager = new AudioManager('playPauseBtn', 'volumeSlider');
  audioManager.init();

  // Add event listener for the previous button
  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => audioManager.prevTrack());
  }

  // Keyboard accessibility for play/pause button
  const playPauseBtn = document.getElementById('playPauseBtn');
  if(playPauseBtn) {
      playPauseBtn.addEventListener('keydown', (event) => {
          if (event.code === 'Space' || event.code === 'Enter') {
              event.preventDefault(); // Prevent scrolling if space is pressed
              audioManager.togglePlayPause();
          }
      });
  }
});

// Export the AudioManager class for Node.js environments (e.g., testing)
// Check if module and module.exports are defined to maintain browser compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}

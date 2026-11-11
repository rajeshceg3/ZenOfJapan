# Japanese Relaxation Oasis

A simple web application for enjoying calming Japanese-themed music for relaxation and finding your peace.

## Features

- Plays a selection of Japanese-inspired relaxation music.
- Includes "Sakuya3" and "Ronin" tracks.
- Play/Pause control for managing audio playback.
- Automatic playback of the next track in the playlist.
- Volume control slider to adjust audio levels.
- Keyboard accessibility for play/pause and volume controls.

## Synthesized place ambience

The player now synthesizes garden water, wind in bamboo, and a temple courtyard with a sparse distant bell. No recordings, music, voice, chants or word-based sound are used. Sound starts only after Play ambience. Mute closes the AudioContext; switching places while muted stays silent. Hiding the page also closes the context and requires a fresh opt-in. The former empty MP3 player and its tests remain under `legacy/audio-player/` for reference.

Verification: `npm test` checks finite samples, signal bounds, opt-in and context cleanup. `npm run build` builds the deployable site. `verification/browser-check.cjs` checks the actual controls and lifecycle at 390px.

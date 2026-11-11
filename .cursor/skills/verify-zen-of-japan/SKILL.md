# Verify ZenOfJapan
Zen of Japan - Find Your Peace: ambient soundscape experience (webpack, web audio DSP).
## Launch
npm install, then npm run build and serve the repo root (index.html).
## Doctor
`python3 .cursor/skills/verify-zen-of-japan/verify.py`
## Drive
Runs the repo's ambience test, builds with webpack, serves the site, and renders it in headless Chromium asserting the boot marker and zero JS console errors.
## Evidence
`.cursor/skills/verify-zen-of-japan/evidence.json`
## Cleanup
Static/streamlit server terminated after the render.
## Known boundaries
Render smoke only; scene quality and e2e suites not exercised here.

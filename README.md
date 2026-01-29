# Fever Dream Game Prototype

This repository contains a lightweight, vanilla Canvas prototype that serves as the base for a game project. The structure keeps source, public, and asset files organized while you iterate on gameplay and audiovisual content.

## Project Structure

```
public/           # Browser entry point
src/              # Game source (Canvas rendering + styling)
assets/
  audio/
    low_energy/   # Drop low-energy background tracks here
    high_energy/  # Drop high-energy background tracks here
```

## Running the Prototype

Because this is a plain HTML/JS setup, you only need a static file server.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/public/` in your browser.

### Option 2: Node (http-server)

```bash
npx http-server -p 8000
```

Open `http://localhost:8000/public/` in your browser.

## Next Steps

- Replace the placeholder Canvas animation in `src/main.js` with your gameplay loop.
- Add audio files to the `assets/audio/low_energy` and `assets/audio/high_energy` folders and wire them into the runtime.
- Swap in a framework like Phaser or PixiJS when you need more engine features.

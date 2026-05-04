# Demo Lite Sample Bank

This folder defines a lightweight sample bank manifest for the sample preset layer MVP.

The referenced `samples/*.wav` files are intentionally not included yet. When a sample file is missing or cannot be decoded, the app creates a generated fallback `AudioBuffer` at runtime from the zone metadata.

This keeps the GitHub Pages demo working without bundled third-party SoundFont content or copyrighted commercial keyboard samples.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: '/synthesizer/',
    build: {
        emptyOutDir: false,
    },
    plugins: [react()],
});

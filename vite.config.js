import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    base: '/dist/',
    server: {
        port: 63716,
    }
})
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // './' makes every file link relative to the page. That lets the site work from a
  // sub-folder, which is where GitHub Pages puts it (…github.io/designlab/).
  // (The site uses #-style links, so there are no other paths to worry about.)
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})

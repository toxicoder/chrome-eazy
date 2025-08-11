import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidebar: 'sidebar.html',
        // If you had a popup or options page, you would add them here
        // popup: 'popup.html',
      },
      output: {
        // Keeps the asset filenames clean
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/css/i.test(extType)) {
            return `assets/[name].css`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});

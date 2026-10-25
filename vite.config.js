import { defineConfig, loadEnv } from 'vite';

// Relative base so the same build works inside the app (Capacitor) and on any
// web host, including a GitHub Pages sub-folder.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const publicUrl = env.VITE_PUBLIC_URL || '';

  return {
    base: './',
    build: { outDir: 'dist', emptyOutDir: true },
    server: { host: true },
    plugins: [
      {
        name: 'apilalo-public-url',
        configResolved() {
          if (!publicUrl) {
            console.warn('\n[apilalo] VITE_PUBLIC_URL no está definido: los enlaces de reto no tendrán dirección.\n');
          } else if (publicUrl.includes('claude.ai')) {
            console.warn('\n[apilalo] Los enlaces de reto apuntan a la versión temporal en claude.ai. Cambia VITE_PUBLIC_URL en .env cuando publiques tu versión web.\n');
          }
        },
        // og:image must be an absolute URL for WhatsApp link previews.
        transformIndexHtml(html) {
          let ogImage = '';
          try {
            const base = publicUrl.endsWith('/') ? publicUrl : publicUrl + '/';
            ogImage = new URL('og-image.png', base).href;
          } catch { /* no public URL: leave it empty */ }
          return html.replace('__OG_IMAGE__', ogImage);
        }
      }
    ]
  };
});

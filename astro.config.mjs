import { defineConfig } from 'astro/config';

// Sitio estático: ideal para la primera publicación en Vercel.
// No requiere adaptador adicional mientras no incorporemos funciones de servidor.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
});

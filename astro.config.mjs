import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Sitio estático para Vercel. Antes de compilar se importa la bóveda Obsidian.
// remark-math + rehype-katex habilitan expresiones matemáticas LaTeX en Markdown.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});

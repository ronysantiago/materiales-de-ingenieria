import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Astro 7 utiliza Sätteri como procesador Markdown predeterminado.
// Este portal usa plugins del ecosistema remark/rehype (remark-math y
// rehype-katex), por lo que seleccionamos explícitamente el procesador Unified.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});

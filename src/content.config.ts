import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const temas = defineCollection({
  loader: glob({ base: './src/content/temas', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    number: z.number().int().min(1).max(10),
    description: z.string(),
    relatedTopics: z.array(z.string()).default([]),
    relatedLabs: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    status: z.enum(['programa', 'en-desarrollo', 'revisado']).default('programa'),
  }),
});

const laboratorios = defineCollection({
  loader: glob({ base: './src/content/laboratorios', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    number: z.number().int().min(1).max(7),
    description: z.string(),
    relatedTopics: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    status: z.enum(['programa', 'en-desarrollo', 'revisado']).default('programa'),
  }),
});

// Colección generada automáticamente desde /boveda por scripts/sync-obsidian.mjs.
// Los metadatos originales se conservan dentro de sourceMetadata.
const boveda = defineCollection({
  loader: glob({ base: './src/content/boveda', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    sourcePath: z.string(),
    routeSlug: z.string(),
    vaultFolder: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),
    sourceMetadata: z.record(z.string(), z.unknown()).default({}),
  }).passthrough(),
});

export const collections = { temas, laboratorios, boveda };

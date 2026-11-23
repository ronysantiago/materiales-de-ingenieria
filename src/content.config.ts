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

export const collections = { temas, laboratorios };

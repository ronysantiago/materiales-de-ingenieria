import { readdir, readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const themesDir = new URL('../src/content/temas/', import.meta.url);
const labsDir = new URL('../src/content/laboratorios/', import.meta.url);

async function markdownFiles(directory) {
  const names = await readdir(directory);
  return names.filter((name) => name.endsWith('.md'));
}

const themes = await markdownFiles(themesDir);
const labs = await markdownFiles(labsDir);
const themeIds = new Set(themes.map((name) => basename(name, '.md')));
const labIds = new Set(labs.map((name) => basename(name, '.md')));
const allIds = new Set([...themeIds, ...labIds]);
const errors = [];

if (themes.length !== 10) errors.push(`Se esperaban 10 temas y se encontraron ${themes.length}.`);
if (labs.length !== 7) errors.push(`Se esperaban 7 prácticas y se encontraron ${labs.length}.`);

for (const name of [...themes, ...labs]) {
  const isTheme = themeIds.has(basename(name, '.md'));
  const directory = isTheme ? themesDir : labsDir;
  const source = await readFile(new URL(name, directory), 'utf8');
  const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatter) {
    errors.push(`${name}: falta encabezado YAML.`);
    continue;
  }
  for (const [, relatedId] of frontmatter[1].matchAll(/^\s+-\s+([a-z0-9-]+)\s*$/gm)) {
    if (!allIds.has(relatedId)) errors.push(`${name}: relación inexistente ${relatedId}.`);
  }
  for (const [, type, slug] of source.matchAll(/\]\\?\(\/(temas|laboratorios)\/([^/)]+)\/\)/g)) {
    const valid = type === 'temas' ? themeIds.has(slug) : labIds.has(slug);
    if (!valid) errors.push(`${name}: enlace sin destino /${type}/${slug}/.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validación correcta: ${themes.length} temas, ${labs.length} prácticas y relaciones sin destinos inexistentes.`);

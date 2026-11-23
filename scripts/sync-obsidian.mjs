import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VAULT = path.join(ROOT, 'boveda');
const GENERATED = path.join(ROOT, 'src', 'content', 'boveda');
const PUBLIC_ASSETS = path.join(ROOT, 'public', 'vault-assets');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const MANIFEST_FILE = path.join(DATA_DIR, 'obsidian-manifest.json');
const GRAPH_FILE = path.join(DATA_DIR, 'obsidian-graph.json');

const IGNORED_DIRS = new Set(['.obsidian', '.git', '.trash', 'node_modules', '.astro', 'dist']);
const IGNORED_FILES = new Set(['.ds_store', '.gitkeep', 'thumbs.db', 'desktop.ini']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.tif', '.tiff']);
const NOTE_EXTENSIONS = new Set(['.md', '.markdown']);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '/')
    .replace(/\.md$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}

function normalizeAssetKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}

function slugSegment(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'nota';
}

function slugFromPath(relativePath) {
  return relativePath
    .replace(/\.(md|markdown)$/i, '')
    .split('/')
    .map(slugSegment)
    .join('/');
}

function encodePath(relativePath) {
  return relativePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function asString(value, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.flatMap((item) => asStringArray(item)).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((part) => part.trim()).filter(Boolean);
  return [];
}

function safeMetadata(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return value.map(safeMetadata);
  if (typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) result[key] = safeMetadata(item);
    }
    return result;
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  return String(value);
}

function parseFrontmatter(raw, sourcePath, warnings) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { metadata: {}, body: raw };

  try {
    const parsed = parseYaml(match[1]) ?? {};
    const metadata = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    return { metadata, body: raw.slice(match[0].length) };
  } catch (error) {
    warnings.push(`Frontmatter YAML no interpretable en ${sourcePath}: ${error.message}`);
    const preserved = `> **Nota de importación:** los metadatos YAML originales de esta nota no pudieron interpretarse automáticamente.\n\n\`\`\`yaml\n${match[1]}\n\`\`\`\n\n`;
    return { metadata: {}, body: preserved + raw.slice(match[0].length) };
  }
}

async function walk(directory, relative = '') {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const result = [];
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(directory, entry.name);
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await walk(absolute, rel));
    else if (entry.isFile() && !IGNORED_FILES.has(entry.name.toLowerCase())) result.push({ absolute, relative: rel });
  }
  return result;
}

function noteCategory(sourcePath) {
  const first = sourcePath.split('/')[0];
  return first || 'Raíz de la bóveda';
}

function noteSummary(body, metadata) {
  const explicit = asString(metadata.description || metadata.descripcion || metadata.summary || metadata.resumen);
  if (explicit) return explicit;
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?(\[\[.*?\]\])/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^\s{0,3}#+\s+/gm, '')
    .replace(/[>*_`~#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 240 ? `${plain.slice(0, 237)}…` : plain;
}

function headingAnchor(value) {
  return slugSegment(value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, ''));
}

function extractTargetParts(specification) {
  const [targetPart, ...aliasParts] = specification.split('|');
  const alias = aliasParts.join('|').trim();
  const [target, heading] = targetPart.trim().split('#', 2);
  return { target: target.trim(), heading: heading?.trim() || '', alias };
}

function buildLookup(records) {
  const lookup = new Map();
  const add = (key, record) => {
    const normalized = normalizeKey(key);
    if (normalized && !lookup.has(normalized)) lookup.set(normalized, record);
  };
  for (const record of records) {
    const withoutExt = record.sourcePath.replace(/\.(md|markdown)$/i, '');
    add(withoutExt, record);
    add(record.sourcePath, record);
    add(path.posix.basename(withoutExt), record);
    add(record.title, record);
    for (const alias of record.aliases) add(alias, record);
  }
  return lookup;
}

function resolveNote(target, currentRecord, lookup) {
  const clean = target.replace(/^\//, '').replace(/^\.\//, '');
  if (!clean || clean === '.') return currentRecord;
  const currentFolder = path.posix.dirname(currentRecord.sourcePath);
  const candidates = [
    clean,
    clean.endsWith('.md') ? clean : `${clean}.md`,
    path.posix.join(currentFolder === '.' ? '' : currentFolder, clean),
    path.posix.join(currentFolder === '.' ? '' : currentFolder, clean.endsWith('.md') ? clean : `${clean}.md`),
  ];
  for (const candidate of candidates) {
    const found = lookup.get(normalizeKey(candidate));
    if (found) return found;
  }
  return lookup.get(normalizeKey(clean)) || null;
}

function resolveAsset(target, currentRecord, assetLookup) {
  const clean = target.replace(/^\//, '').replace(/^\.\//, '');
  const currentFolder = path.posix.dirname(currentRecord.sourcePath);
  const candidates = [
    clean,
    path.posix.join(currentFolder === '.' ? '' : currentFolder, clean),
    path.posix.basename(clean),
  ];
  for (const candidate of candidates) {
    const found = assetLookup.get(normalizeAssetKey(candidate));
    if (found) return found;
  }
  return null;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function assetMarkdown(asset, label, embed) {
  const href = `/vault-assets/${encodePath(asset.sourcePath)}`;
  const extension = path.extname(asset.sourcePath).toLowerCase();
  const sizeToken = /^\d{2,4}(?:[xX]\d{2,4})?$/.test(String(label || '').trim());
  const title = !label || sizeToken ? path.posix.basename(asset.sourcePath) : label;
  if (embed && IMAGE_EXTENSIONS.has(extension)) return `![${title}](${href})`;
  if (embed && extension === '.pdf') return `\n<div class=\"vault-pdf-embed\"><iframe src=\"${href}\" title=\"${escapeHtml(title)}\" loading=\"lazy\"></iframe><p><a href=\"${href}\" target=\"_blank\" rel=\"noopener\">Abrir o descargar PDF: ${escapeHtml(title)}</a></p></div>\n`;
  if (embed && ['.mp4', '.webm', '.mov'].includes(extension)) return `<video class=\"vault-video-embed\" controls preload=\"metadata\" src=\"${href}\"></video>`;
  return `[${title}](${href})`;
}

function transformWikiLinks(body, record, lookup, assetLookup, edges, warnings) {
  return body.replace(/(!?)\[\[([^\]]+)\]\]/g, (_full, embedMarker, specification) => {
    const { target, heading, alias } = extractTargetParts(specification);
    const isEmbed = embedMarker === '!';
    const asset = resolveAsset(target, record, assetLookup);
    if (asset) return assetMarkdown(asset, alias || path.posix.basename(asset.sourcePath), isEmbed);

    const destination = resolveNote(target, record, lookup);
    if (destination) {
      edges.push({ from: record.routeSlug, to: destination.routeSlug });
      const label = alias || destination.title;
      const href = `/boveda/${destination.routeSlug}/${heading ? `#${headingAnchor(heading)}` : ''}`;
      return isEmbed ? `[↗ Nota relacionada: ${label}](${href})` : `[${label}](${href})`;
    }

    warnings.push(`Enlace interno no resuelto en ${record.sourcePath}: [[${specification}]]`);
    return alias || target;
  });
}


function transformOutsideCode(body, transform) {
  // Evita modificar ejemplos de código, fórmulas literales y bloques Mermaid.
  const protectedPattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\n]*?`+)/g;
  return body.split(protectedPattern).map((part, index) => (index % 2 === 1 ? part : transform(part))).join('');
}

function transformCallouts(body) {
  const labels = {
    note: 'Nota', info: 'Información', todo: 'Pendiente', tip: 'Consejo', hint: 'Pista',
    important: 'Importante', warning: 'Advertencia', caution: 'Precaución', danger: 'Peligro',
    error: 'Error', failure: 'Fallo', bug: 'Error de software', example: 'Ejemplo',
    quote: 'Cita', abstract: 'Resumen', summary: 'Resumen', success: 'Correcto', check: 'Verificación',
    question: 'Pregunta', help: 'Ayuda', faq: 'Preguntas frecuentes', cite: 'Referencia',
  };
  return body.replace(/^>\s*\[!([A-Za-z]+)\]([+-])?\s*(.*)$/gm, (_match, type, _fold, title) => {
    const label = labels[String(type).toLowerCase()] || String(type).toUpperCase();
    return `> **${label}${title ? ` · ${title}` : ''}**`;
  });
}

function transformMarkdownLinks(body, record, lookup, assetLookup, edges) {
  return body.replace(/(!?)\[([^\]]*)\]\(([^)]+)\)/g, (full, imageMarker, label, rawHref) => {
    const href = rawHref.trim();
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(href)) return full;
    const cleanHref = href.replace(/^<|>$/g, '').split(/\s+['"]/)[0];
    const asset = resolveAsset(cleanHref, record, assetLookup);
    if (asset) {
      const url = `/vault-assets/${encodePath(asset.sourcePath)}`;
      return imageMarker ? `![${label}](${url})` : `[${label || path.posix.basename(asset.sourcePath)}](${url})`;
    }
    const note = resolveNote(cleanHref, record, lookup);
    if (note) {
      edges.push({ from: record.routeSlug, to: note.routeSlug });
      return `[${label || note.title}](/boveda/${note.routeSlug}/)`;
    }
    return full;
  });
}

function collectMetadataRelations(metadata) {
  const keys = new Set(['relaciones', 'relacionados', 'related', 'relatednotes', 'relatedtopics', 'relatedlabs', 'links', 'enlaces', 'conceptosrelacionados']);
  const values = [];
  function visit(value, key = '') {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, key);
    } else if (typeof value === 'string' && keys.has(key.toLowerCase())) {
      values.push(value);
    } else if (value && typeof value === 'object') {
      for (const [childKey, childValue] of Object.entries(value)) visit(childValue, childKey);
    }
  }
  visit(metadata);
  return values;
}

function layoutGraph(nodes, edges) {
  const grouped = new Map();
  for (const node of nodes) {
    if (!grouped.has(node.folder)) grouped.set(node.folder, []);
    grouped.get(node.folder).push(node);
  }
  const groups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
  const centerX = 1050;
  const centerY = 760;
  const radiusX = 700;
  const radiusY = 520;
  groups.forEach(([folder, items], groupIndex) => {
    const clusterAngle = (2 * Math.PI * groupIndex) / Math.max(groups.length, 1) - Math.PI / 2;
    const clusterX = centerX + Math.cos(clusterAngle) * radiusX;
    const clusterY = centerY + Math.sin(clusterAngle) * radiusY;
    const count = items.length;
    items.forEach((node, itemIndex) => {
      const angle = (2 * Math.PI * itemIndex) / Math.max(count, 1) + groupIndex * 0.37;
      const ring = 55 + Math.sqrt(itemIndex + 1) * Math.min(24, 220 / Math.sqrt(Math.max(count, 1)));
      node.x = clusterX + Math.cos(angle) * ring;
      node.y = clusterY + Math.sin(angle) * ring;
    });
  });
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
  }
  for (const node of nodes) node.degree = degree.get(node.id) || 0;
}

async function main() {
  await fs.rm(GENERATED, { recursive: true, force: true });
  await fs.rm(PUBLIC_ASSETS, { recursive: true, force: true });
  await fs.mkdir(GENERATED, { recursive: true });
  await fs.mkdir(PUBLIC_ASSETS, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  const files = await walk(VAULT);
  const markdownFiles = files.filter((file) => NOTE_EXTENSIONS.has(path.extname(file.relative).toLowerCase()));
  const attachmentFiles = files.filter((file) => !NOTE_EXTENSIONS.has(path.extname(file.relative).toLowerCase()));
  const warnings = [];

  const assets = [];
  for (const file of attachmentFiles) {
    const sourcePath = toPosix(file.relative);
    const destination = path.join(PUBLIC_ASSETS, ...sourcePath.split('/'));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(file.absolute, destination);
    const fileInfo = await fs.stat(file.absolute);
    assets.push({
      sourcePath,
      url: `/vault-assets/${encodePath(sourcePath)}`,
      folder: path.posix.dirname(sourcePath) === '.' ? 'Raíz de la bóveda' : path.posix.dirname(sourcePath),
      extension: path.extname(sourcePath).toLowerCase(),
      size: fileInfo.size,
    });
  }

  const assetLookup = new Map();
  for (const asset of assets) {
    const keys = [asset.sourcePath, path.posix.basename(asset.sourcePath)];
    for (const key of keys) if (!assetLookup.has(normalizeAssetKey(key))) assetLookup.set(normalizeAssetKey(key), asset);
  }

  const records = [];
  for (const file of markdownFiles) {
    const sourcePath = toPosix(file.relative);
    const raw = await fs.readFile(file.absolute, 'utf8');
    const { metadata, body } = parseFrontmatter(raw, sourcePath, warnings);
    const basename = path.posix.basename(sourcePath).replace(/\.(md|markdown)$/i, '');
    const title = asString(metadata.title || metadata.titulo || metadata.name || metadata.nombre, basename);
    const routeSlug = slugFromPath(sourcePath);
    const sourceFolder = path.posix.dirname(sourcePath);
    const vaultFolder = sourceFolder === '.' ? 'Raíz de la bóveda' : sourceFolder;
    const category = noteCategory(sourcePath);
    const aliases = asStringArray(metadata.aliases || metadata.alias);
    const tags = asStringArray(metadata.tags || metadata.etiquetas);
    records.push({
      absolute: file.absolute,
      sourcePath,
      title,
      routeSlug,
      vaultFolder,
      category,
      folder: category,
      aliases,
      tags,
      metadata: safeMetadata(metadata),
      body,
      summary: noteSummary(body, metadata),
    });
  }

  const lookup = buildLookup(records);
  const graphEdges = [];
  const manifestNotes = [];
  const graphNodes = [];

  for (const record of records) {
    for (const relation of collectMetadataRelations(record.metadata)) {
      const target = relation.match(/\[\[([^\]]+)\]\]/)?.[1] || relation;
      const { target: relationTarget } = extractTargetParts(target);
      const destination = resolveNote(relationTarget, record, lookup);
      if (destination) graphEdges.push({ from: record.routeSlug, to: destination.routeSlug });
    }
    let body = record.body.replace(/%%[\s\S]*?%%/g, '');
    body = transformOutsideCode(body, (segment) => transformWikiLinks(segment, record, lookup, assetLookup, graphEdges, warnings));
    body = transformOutsideCode(body, (segment) => transformMarkdownLinks(segment, record, lookup, assetLookup, graphEdges));
    body = transformOutsideCode(body, transformCallouts);
    body = transformOutsideCode(body, (segment) => segment.replace(/==([^=\n]+)==/g, '<mark>$1</mark>'));

    const sourceMetadata = record.metadata && typeof record.metadata === 'object' ? record.metadata : {};
    const generatedData = {
      title: record.title,
      sourcePath: record.sourcePath,
      routeSlug: record.routeSlug,
      vaultFolder: record.vaultFolder,
      category: record.category,
      tags: record.tags,
      summary: record.summary,
      sourceMetadata,
    };
    const generatedFile = path.join(GENERATED, ...record.routeSlug.split('/')) + '.md';
    await fs.mkdir(path.dirname(generatedFile), { recursive: true });
    await fs.writeFile(generatedFile, `---\n${stringifyYaml(generatedData)}---\n\n${body.trim()}\n`, 'utf8');

    manifestNotes.push({
      id: record.routeSlug,
      title: record.title,
      sourcePath: record.sourcePath,
      route: `/boveda/${record.routeSlug}/`,
      folder: record.vaultFolder,
      category: record.category,
      tags: record.tags,
      summary: record.summary,
    });
    graphNodes.push({
      id: record.routeSlug,
      label: record.title.length > 36 ? `${record.title.slice(0, 33)}…` : record.title,
      title: record.title,
      category: record.category,
      folder: record.category,
      href: `/boveda/${record.routeSlug}/`,
      sourcePath: record.sourcePath,
      tags: record.tags,
      x: 0,
      y: 0,
      degree: 0,
    });
  }

  // Conserva las aristas dirigidas para calcular backlinks con precisión.
  const directedSet = new Set();
  const directedEdges = [];
  for (const edge of graphEdges) {
    if (edge.from === edge.to) continue;
    const key = `${edge.from}::${edge.to}`;
    if (directedSet.has(key)) continue;
    directedSet.add(key);
    directedEdges.push({ from: edge.from, to: edge.to });
  }

  // El grafo se dibuja como red no dirigida: una sola línea por pareja de notas.
  const visualSet = new Set();
  const visualEdges = [];
  for (const edge of directedEdges) {
    const key = [edge.from, edge.to].sort().join('::');
    if (visualSet.has(key)) continue;
    visualSet.add(key);
    visualEdges.push({ from: edge.from, to: edge.to });
  }
  layoutGraph(graphNodes, visualEdges);

  const backlinks = new Map(manifestNotes.map((note) => [note.id, []]));
  const outlinks = new Map(manifestNotes.map((note) => [note.id, []]));
  for (const edge of directedEdges) {
    backlinks.get(edge.to)?.push(edge.from);
    outlinks.get(edge.from)?.push(edge.to);
  }
  for (const note of manifestNotes) {
    note.backlinks = backlinks.get(note.id) || [];
    note.outlinks = outlinks.get(note.id) || [];
  }

  const folders = [...new Set(manifestNotes.map((note) => note.folder))].sort((a, b) => a.localeCompare(b, 'es'));
  const manifest = { count: manifestNotes.length, attachmentCount: assets.length, folders, notes: manifestNotes, attachments: assets };
  const graph = { count: graphNodes.length, edgeCount: visualEdges.length, nodes: graphNodes, edges: visualEdges };
  await fs.writeFile(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(GRAPH_FILE, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');

  console.log('--- Sincronización de bóveda Obsidian ---');
  console.log(`Carpeta de origen: ${VAULT}`);
  console.log(`Notas Markdown procesadas: ${manifestNotes.length}`);
  console.log(`Archivos adjuntos copiados: ${assets.length}`);
  console.log(`Conexiones detectadas: ${visualEdges.length}`);
  if (!markdownFiles.length) console.log('No se encontraron notas. Sube la bóveda dentro de la carpeta raíz /boveda.');
  if (warnings.length) {
    console.warn(`Avisos: ${warnings.length}`);
    for (const warning of warnings.slice(0, 20)) console.warn(`- ${warning}`);
    if (warnings.length > 20) console.warn(`- … y ${warnings.length - 20} avisos adicionales.`);
  }
  console.log('Sincronización terminada.');
}

main().catch((error) => {
  console.error('No se pudo sincronizar la bóveda de Obsidian.');
  console.error(error);
  process.exitCode = 1;
});

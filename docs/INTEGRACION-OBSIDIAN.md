# Integración de Obsidian con el portal

## Ubicación esperada

La bóveda se carga completa dentro de la carpeta `boveda/`, situada en la raíz del repositorio. Debe conservar los nombres de las carpetas originales:

```text
boveda/
├── .obsidian/
├── 00 - INICIO/
├── 01 - PROGRAMA/
├── 02 - CONTENIDO TEORICO/
├── 03 - LABORATORIOS/
├── 04 - CONCEPTOS TRANSVERSALES/
├── 05 - BIBLIOTECA/
├── 06 - RECURSOS/
├── 07 - EJERCICIOS/
├── 08 - GLOSARIO/
├── 90 - PLANTILLAS/
└── 99 - ARCHIVO/
```

## Flujo automático

```text
boveda/ (fuente original)
        │
        ▼
scripts/sync-obsidian.mjs
        │
        ├── src/content/boveda/          Markdown preparado para Astro
        ├── public/vault-assets/         Imágenes, PDF y otros adjuntos
        ├── src/data/obsidian-manifest.json
        └── src/data/obsidian-graph.json
                    │
                    ▼
              Astro / Vercel
                    │
        ├── /boveda/                     Explorador de notas
        ├── /boveda/ruta-de-nota/        Página de cada nota
        └── /grafo/                      Grafo de wikilinks
```

## Alcance del importador

- Recorre recursivamente todas las carpetas y procesa archivos Markdown.
- Copia adjuntos conservando las rutas relativas.
- Omite carpetas técnicas `.obsidian`, `.git`, `.trash`, `node_modules`, `.astro` y `dist` durante el procesamiento.
- Lee YAML frontmatter mediante el paquete `yaml`; los metadatos normalizados se guardan junto con `sourceMetadata`.
- Cuando un frontmatter no se puede interpretar, conserva el bloque en la nota como una advertencia de importación y continúa.
- Resuelve wikilinks por ruta, nombre, título o alias.
- Calcula enlaces entrantes y salientes para alimentar el grafo.
- Los nombres de rutas web se convierten a slugs; la ruta de origen queda preservada en el manifiesto.
- Los bloques de código cercados y el código en línea se preservan sin reescribir sus ejemplos de wikilinks.

## Rutas web

- `/boveda/`: explora por carpetas.
- `/boveda/<slug>/`: abre la nota.
- `/grafo/`: explora el grafo global.

## Publicación y privacidad

Esta configuración publica todas las notas Markdown y todos los adjuntos detectados en `boveda/`. No requiere una propiedad `publicar`. Antes de subir una bóveda a un repositorio público se debe revisar que no contenga credenciales, información privada, datos personales ni documentos con derechos reservados. Aunque `.obsidian/` no se procesa para el portal, cualquier archivo que se incluya en un repositorio público puede consultarse directamente desde GitHub.

## Recomendaciones de enlaces

- Evita títulos duplicados en diferentes carpetas cuando sea posible.
- Si existen duplicados, utiliza wikilinks con ruta completa, por ejemplo `[[02 - CONTENIDO TEORICO/Tema 03 - Materiales ferrosos]]`.
- Los enlaces que no puedan resolverse se muestran como texto y se informan como advertencias durante `npm run sync:obsidian`.
- El grafo se construye a partir de los wikilinks detectados; las notas sin enlaces permanecen visibles como nodos aislados.

## Recursos con representación especial

- Imágenes, PDF y vídeo pueden incrustarse usando `![[archivo.ext]]`.
- Otros adjuntos (por ejemplo, hojas de cálculo, documentos, presentaciones, CSV, audio y modelos) se copian y aparecen como enlaces descargables en el índice de recursos.
- Los archivos Canvas (`.canvas`) se conservan como recursos descargables; su edición visual nativa de Obsidian no se reproduce todavía como tablero interactivo en la web. El grafo global del portal se genera desde wikilinks de las notas.
- Las expresiones matemáticas en LaTeX se procesan con KaTeX; los bloques Mermaid se representan en el navegador.

# Materiales de Ingeniería — Portal académico ULA

**Versión del proyecto: 0.3.0**

Portal académico desarrollado con **Astro 7**, preparado para GitHub y Vercel. El contenido de la bóveda Obsidian se importa durante cada ejecución de desarrollo y cada compilación de producción. La versión 0.2.1 configura explícitamente el procesador Unified para mantener compatibilidad con `remark-math` y `rehype-katex`.

**Universidad:** Universidad de Los Andes  
**Asignatura:** Materiales de Ingeniería  
**Docente:** Ing. Ramón Tolosa

## 1. Qué incluye esta versión

- Portada renovada con identidad de la Universidad de Los Andes y el docente destacado al inicio.
- Tetraedro de los materiales: procesamiento, estructura, propiedades y desempeño.
- Diez temas y siete prácticas del programa oficial.
- Explorador web de la bóveda de Obsidian.
- Páginas individuales para notas Markdown.
- Conversión de enlaces `[[Nota]]` y alias `[[Nota|texto]]` a enlaces web.
- Copia y publicación de adjuntos; imágenes, PDF y vídeo incrustados cuando corresponda; índice de archivos descargables.
- Renderizado de expresiones LaTeX mediante KaTeX y diagramas Mermaid en las notas.
- Reconocimiento de callouts básicos, resaltados y enlaces Markdown relativos.
- Grafo global interactivo basado en enlaces encontrados en las notas.
- Buscador que incluye temas, prácticas y notas de Obsidian.
- Sincronización automática antes de `astro dev` y `astro build`.

## 2. Alcance académico

Se respetan los diez temas y las siete prácticas proporcionadas para Materiales de Ingeniería. No se incorporan como unidades independientes estructura cristalina ni defectos cristalinos. Se conserva exclusivamente el contenido **«Estructuras de cerámicos cristalinos»** dentro del Tema 5, porque está incluido en el programa oficial.

## 3. Estructura de carpetas

```text
materiales-de-ingenieria/
├── boveda/                     # Aquí se carga la bóveda de Obsidian
│   ├── .obsidian/              # Opcional: configuración original
│   ├── 00 - INICIO/
│   ├── 01 - PROGRAMA/
│   ├── 02 - CONTENIDO TEORICO/
│   ├── 03 - LABORATORIOS/
│   ├── 04 - CONCEPTOS TRANSVERSALES/
│   ├── 05 - BIBLIOTECA/
│   ├── 06 - RECURSOS/
│   ├── 07 - EJERCICIOS/
│   ├── 08 - GLOSARIO/
│   ├── 90 - PLANTILLAS/
│   └── 99 - ARCHIVO/
├── scripts/
│   └── sync-obsidian.mjs       # Importador de notas y adjuntos
├── src/
│   ├── content/temas/          # Diez fichas del programa
│   ├── content/laboratorios/   # Siete fichas del programa
│   ├── content/boveda/         # Se genera automáticamente
│   ├── components/             # Componentes visuales
│   ├── data/                   # Índice y grafo generados
│   ├── pages/                  # Rutas del portal
│   └── styles/                 # Estilos
└── public/vault-assets/        # Adjuntos exportados automáticamente
```

## 4. Cómo cargar la bóveda desde GitHub (sin Git local)

1. Descomprime este proyecto y súbelo a la raíz del repositorio `ronysantiago/materiales-de-ingenieria`, reemplazando los archivos del MVP anterior.
2. En tu bóveda local, selecciona sus carpetas académicas y la carpeta `.obsidian` si deseas conservar también su copia en el repositorio.
3. En GitHub abre **Add file → Upload files**.
4. Arrastra las carpetas de la bóveda dentro de la carpeta `boveda/` que acompaña este proyecto. Deben quedar rutas como `boveda/00 - INICIO/...` y `boveda/02 - CONTENIDO TEORICO/...`.
5. Conserva los nombres originales de las carpetas. Si GitHub limita la cantidad de archivos por carga, repite la operación por grupos de carpetas.
6. Confirma los cambios con un commit. Vercel iniciará un nuevo despliegue.

Si vas a cargar muchos archivos, realiza la carga por carpetas y en varios commits. La interfaz web de GitHub tiene límites por operación y por tamaño de archivo; para recursos binarios individuales muy grandes será necesario usar Git LFS o un almacenamiento externo.

**No subas la bóveda directamente a la raíz del repositorio:** el importador espera que esté dentro de `boveda/`.

## 5. Qué procesa el importador

El script `scripts/sync-obsidian.mjs` se ejecuta automáticamente antes de iniciar Astro en desarrollo y antes de la compilación de producción.

- Procesa notas `.md` y `.markdown` en todas las carpetas de la bóveda, incluidas `90 - PLANTILLAS` y `99 - ARCHIVO`.
- Conserva el título, la ruta original, la carpeta, etiquetas y metadatos originales legibles.
- Resuelve enlaces internos por ruta, título o alias.
- Calcula backlinks y conexiones entre notas.
- Copia adjuntos a `public/vault-assets/` y conserva su estructura de carpetas.
- Convierte imágenes incrustadas a imágenes web y archivos PDF incrustados a un visor PDF.
- Genera `src/data/obsidian-manifest.json` y `src/data/obsidian-graph.json`.

La carpeta técnica `.obsidian/`, `.git/`, `.trash/`, `node_modules/` y archivos temporales se excluyen del procesamiento web. Los archivos de `.obsidian/` pueden seguir presentes en el repositorio si los cargas, pero no se muestran como notas del portal.

### Importante sobre publicación

El portal estático publica las notas Markdown y adjuntos que encuentre en `boveda/`; no exige `publicar: true`. Como el repositorio o el sitio pueden ser públicos, revisa que la bóveda no contenga contraseñas, datos personales, notas privadas, material con restricciones de derechos de autor ni documentos que no deban difundirse. La carpeta `.obsidian/` tampoco es contenido académico necesario para el portal y se recomienda excluirla del repositorio público.

### Diagnóstico: Vercel indica «Notas Markdown procesadas: 0»

Ese mensaje significa que, en el commit y la rama que Vercel clonó, no encontró archivos `.md` o `.markdown` dentro de `boveda/`. No basta con que las carpetas existan: GitHub debe contener archivos dentro de ellas. Comprueba que en la pestaña **Code** del repositorio puedas abrir, por ejemplo, `boveda/00 - INICIO/Inicio.md`. La ruta debe comenzar directamente por `boveda/`, no por `boveda/NombreDeTuBoveda/` (aunque el importador también recorre subcarpetas, la estructura directa facilita la organización). Si solo ves archivos `.gitkeep`, todavía no se han cargado las notas. Realiza el commit en la rama conectada a Vercel (`main`) y vuelve a desplegar.

El importador ahora muestra los primeros elementos visibles de `boveda/` en el registro cuando no encuentra notas. Si la carpeta no contiene Markdown pero sí otros adjuntos, el log indicará por separado el número de adjuntos copiados.

## 6. Enlaces y contenido de Obsidian

| Elemento de Obsidian | Resultado web |
|---|---|
| `[[Nota]]` | Enlace a la nota correspondiente |
| `[[Nota\|Texto visible]]` | Enlace con alias |
| `[[Nota#Sección]]` | Enlace a nota y ancla de sección |
| `![[imagen.png]]` | Imagen incrustada |
| `![[archivo.pdf]]` | Visor PDF y enlace para abrir/descargar |
| `![[video.mp4]]` | Reproductor de vídeo |
| `==texto==` | Texto resaltado |
| `#etiqueta` en propiedades | Etiqueta visible y buscable |

Los enlaces a notas que no existan o que no puedan resolverse se muestran como texto y se informan como avisos en el registro de compilación. Los bloques de código se preservan sin transformar sus ejemplos de wikilinks. Los archivos Canvas (`.canvas`) se conservan como recursos descargables, pero todavía no se representan como tableros editables en la web. Si dos notas tienen el mismo nombre, utiliza la ruta completa dentro del wikilink para evitar ambigüedad.

## 7. Ejecutar localmente (opcional)

Requisitos: Node.js 24 LTS recomendado; Astro 7 requiere Node.js 22.23.4 o superior.

```bash
npm install
npm run sync:obsidian
npm run dev
```

Compilación de producción:

```bash
npm run build
npm run preview
```

No se requiere Git para probar localmente, pero sí es útil para sincronizar cambios y mantener historial. También puedes subir archivos desde la interfaz web de GitHub. La dependencia `@astrojs/markdown-remark` mantiene disponible el procesador Unified que necesita la configuración de LaTeX.

## 8. Despliegue en Vercel

- Framework preset: Astro.
- Install command: `npm install`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Root directory: `./`.
- Environment variables: ninguna requerida para este MVP.
- Node.js: 24.x.

El script `prebuild` sincroniza `boveda/` antes de ejecutar Astro, por lo que cada commit que incluya cambios en la bóveda reconstruirá el índice, páginas y grafo.

## 9. Dónde editar

- Portada: `src/pages/index.astro`.
- Cabecera, navegación y pie: `src/layouts/BaseLayout.astro`.
- Colores, tipografía y diseño: `src/styles/global.css`.
- Tetraedro: `src/components/MaterialsTetrahedron.astro`.
- Explorador de notas: `src/pages/boveda/`.
- Grafo: `src/pages/grafo/`, `src/components/VaultGraph.astro` y `src/scripts/vault-graph.js`.
- Importación: `scripts/sync-obsidian.mjs`.

No edites manualmente `src/content/boveda/`, `public/vault-assets/` ni los JSON de `src/data/`: se regeneran desde la carpeta raíz `boveda/`.

## 10. Laboratorio de Diagramas de Fase

La ruta `/herramientas/diagramas-de-fase/` contiene el primer prototipo interactivo para sistemas ternarios genéricos A–B–C. Incluye:

- Prisma ternario 3D con rotación por arrastre y zoom con rueda.
- Superficies solvus esquemáticas para delimitar campos de soluciones sólidas terminales en los modelos parcial y muy limitado.
- Interruptores para mostrar u ocultar las superficies liquidus, solidus y solvus.
- Superficies esquemáticas liquidus y solidus.
- Plano horizontal de corte isotérmico, paralelo a la base del prisma.
- Sección triangular 2D sincronizada; permite seleccionar una composición con clic.
- Modelos genéricos de solubilidad sólida completa, parcial y muy limitada.
- Control de composición global con `X_A + X_B + X_C = 1`.
- Recorridos de calentamiento y enfriamiento, con pausa y velocidad didáctica.
- Estimación ilustrativa de fracción sólida entre liquidus y solidus.
- Sección microestructural 2D esquemática con granos ilustrativos, fases sólidas y líquido residual; no es un volumen 3D ni una micrografía predicha.

**Límite científico del prototipo:** las superficies, campos de fase y fracciones se generan mediante reglas matemáticas cualitativas para enseñar la lectura geométrica. No proceden de una base CALPHAD, no corresponden a una aleación real y no deben utilizarse para seleccionar temperaturas de proceso. La microestructura es una sección 2D tipo Voronoi ilustrativa; no es un volumen microestructural 3D ni una simulación de nucleación, difusión o crecimiento real. El comportamiento de solubilidad con la temperatura también se ha simplificado.

La implementación inicial utiliza Canvas 2D con proyección 3D propia para el prisma, sus superficies y el plano de corte; no añade bibliotecas externas. La vista microestructural es una sección 2D esquemática. Esto reduce dependencias y permite desplegar el laboratorio en el mismo sitio estático de Astro. Los módulos de cálculo termodinámico y simulación microestructural se incorporarán en etapas posteriores.

### Cómo probar el laboratorio

1. Abre `Laboratorio` en la navegación o visita `/herramientas/diagramas-de-fase/`.
2. Cambia entre solubilidad completa, parcial y muy limitada.
3. Arrastra la vista 3D para rotarla; utiliza la rueda para acercarla.
4. Mueve el control de temperatura: el plano horizontal representa una sección isotérmica.
5. Haz clic sobre el corte 2D para cambiar la composición global.
6. Selecciona `Enfriar` o `Calentar` y pulsa el botón de recorrido.
7. Observa el estado de fases, las temperaturas liquidus/solidus, la fracción sólida y el mosaico microestructural.

### Validación del modelo interactivo

```bash
npm run validate:ternary
```

### Archivos principales del laboratorio

- `src/pages/herramientas/diagramas-de-fase/index.astro`: interfaz.
- `src/scripts/ternary-model.js`: reglas y funciones matemáticas del modelo genérico.
- `src/scripts/ternary-lab.js`: controles, proyección 3D, corte isotérmico y microestructura esquemática.
- `src/styles/ternary-lab.css`: estilos del laboratorio.
- `scripts/validar-modelo-ternario.mjs`: comprobaciones automatizadas.

La página inicial también contiene un acceso al laboratorio. La navegación global utiliza la etiqueta corta `Laboratorio`.

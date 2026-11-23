# Materiales de Ingeniería — Portal académico

MVP de un portal académico construido con **Astro**, preparado para publicarse desde GitHub en **Vercel**.

**Asignatura:** Materiales de Ingeniería  
**Docente:** Ing. Ramón Tolosa  
**Alcance:** los diez temas teóricos y las siete prácticas del programa suministrado.

## 1. Qué incluye

- Página principal e identidad visual inicial.
- Página del programa académico.
- Diez fichas de temas teóricos.
- Siete fichas de prácticas de laboratorio.
- Mapa SVG navegable de relaciones entre temas y prácticas.
- Buscador local de temas y laboratorios.
- Navegación adaptable a móviles.
- Colecciones de contenido Markdown con validación de metadatos mediante Astro.
- Guía para integrar progresivamente la bóveda de Obsidian.

## 2. Alcance académico

El contenido respeta el programa que se recibió para la asignatura. No se crean unidades adicionales fuera de los diez temas oficiales. En el Tema 5 se conserva únicamente el subapartado **«Estructuras de cerámicos cristalinos»**, porque aparece expresamente en el programa oficial suministrado.

Las fichas de laboratorio contienen el alcance oficial y campos de trabajo por completar. No se inventan temperaturas, tiempos, equipos, composiciones, procedimientos ni resultados experimentales: se incorporarán cuando se disponga de las guías de cátedra y de los datos de cada práctica.

## 3. Requisitos

- Node.js **22.23.4 o superior** (se recomienda Node.js 24 LTS).
- npm (incluido con Node.js).
- Git (para trabajar localmente y sincronizar con GitHub).
- Un editor como Visual Studio Code.

## 4. Ejecutar localmente

Desde la raíz del repositorio:

```bash
npm install
npm run dev
```

Abre la dirección local que muestre Astro en la terminal (habitualmente `http://localhost:4321`).

Para generar la versión de producción:

```bash
npm run build
```

Para revisar localmente la versión construida:

```bash
npm run preview
```

La salida estática se genera en `dist/`.

## 5. Subir este ZIP a un repositorio GitHub existente

1. Descarga y descomprime este ZIP.
2. Copia **el contenido** de la carpeta descomprimida directamente en la raíz de tu repositorio local o en la interfaz web de GitHub.
3. Si el repositorio ya tiene una carpeta `.git`, **no la borres ni la reemplaces**.
4. Si GitHub pregunta si debe reemplazar archivos que ya existen, revisa primero esos archivos.
5. Confirma el cambio con un commit, por ejemplo: `Crear MVP del portal Materiales de Ingeniería`.

No subas `node_modules/` ni `dist/`; están excluidos mediante `.gitignore`.

## 6. Publicar en Vercel

1. Entra en Vercel y selecciona **Add New → Project**.
2. Importa el repositorio de GitHub.
3. Vercel debe detectar Astro automáticamente.
4. Comprueba estos valores si solicita configuración manual:

| Parámetro | Valor |
|---|---|
| Framework Preset | Astro |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Root Directory | `./` |

5. Selecciona **Deploy**.

Este proyecto utiliza salida estática de Astro y no requiere adaptador de Vercel en esta etapa. Cada nuevo commit en la rama de producción podrá activar un nuevo despliegue.

## 7. Dónde editar los contenidos

Los documentos fuente están en:

```text
src/content/
├── temas/
│   ├── 01-generalidades-de-los-materiales.md
│   ├── ...
│   └── 10-seleccion-de-materiales.md
└── laboratorios/
    ├── 01-puntos-criticos-de-los-aceros.md
    ├── ...
    └── 07-materiales-polimericos-y-compuestos.md
```

Cada documento es Markdown con propiedades YAML al inicio. `src/content.config.ts` define y valida la estructura de esas propiedades.

Para crear una nueva nota de tema o práctica, conserva el esquema de la colección correspondiente y utiliza un nombre de archivo único. El número y el título deben coincidir con el programa de la asignatura.

## 8. Relación con Obsidian

La bóveda local sigue siendo la fuente de trabajo académico. Este MVP **no incluye ni reemplaza tu bóveda**. Las fichas Markdown dentro de `src/content/` constituyen una primera representación web del programa.

La sincronización controlada de Obsidian se desarrollará en una etapa posterior. La regla prevista es publicar solo las notas autorizadas explícitamente, nunca copiar toda la bóveda de forma indiscriminada.

Consulta `docs/INTEGRACION-OBSIDIAN.md` antes de incorporar archivos de la bóveda al repositorio.

## 9. Estructura del proyecto

```text
src/
├── components/       # Tarjetas, encabezados y mapa de conexiones
├── content/          # Markdown de temas y prácticas
├── layouts/          # Estructura compartida de páginas
├── pages/            # Rutas del portal
└── styles/           # Estilos globales
public/               # Recursos estáticos
```

## 10. Estado del MVP

La versión está diseñada para validar la estructura web, las rutas, el programa académico, la búsqueda y el mapa de conexiones. La integración bidireccional con Obsidian, el visor PDF avanzado, los modelos 3D, los simuladores y los gemelos digitales quedan para etapas posteriores.

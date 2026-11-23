# Integración controlada con Obsidian

## Principio

Obsidian se mantiene como bóveda de trabajo. El portal solo debe recibir contenido que se haya autorizado para publicación.

## Regla de publicación

Las notas destinadas al portal deberán incluir una propiedad YAML explícita:

```yaml
---
tipo: tema
publicar: true
titulo: Nombre de la nota
---
```

La ausencia de `publicar: true` significa que la nota no se publica.

## Separación recomendada

- Mantener la bóveda completa fuera del directorio público del portal.
- Copiar o sincronizar únicamente notas autorizadas.
- Revisar los enlaces internos antes de publicar.
- Revisar los archivos adjuntos por separado y excluir material con derechos restringidos o información privada.
- Mantener los archivos de clase, anotaciones personales y borradores privados fuera del sitio.

## Mapeo futuro de contenido

| Propiedad / recurso en Obsidian | Uso previsto en el portal |
|---|---|
| `tipo: tema` | Colección de temas |
| `tipo: laboratorio` | Colección de laboratorios |
| `publicar: true` | Autoriza exportación |
| `titulo` | Título de página |
| `tags` | Categorías y filtros |
| `[[Nota]]` | Enlace interno transformado a ruta web |
| Imagen adjunta autorizada | Recurso público optimizado |
| PDF autorizado | Documento descargable o visor |

## Estado actual

El MVP mantiene colecciones Markdown propias dentro de `src/content/`. La sincronización automática desde la bóveda no está activada todavía, para evitar publicar accidentalmente archivos privados. Se implementará después de acordar la ubicación local de la bóveda y probar el mapeo de enlaces, propiedades y adjuntos.

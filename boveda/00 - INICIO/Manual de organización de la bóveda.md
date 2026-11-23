---
tipo: manual
codigo: "MAN-01"
area: "sistema"
estado: pendiente
fuentes: []
relaciones: []
---

# Manual de organización de la bóveda

## 1. Principio de arquitectura

La bóveda se organiza en tres niveles complementarios:

1. **Programa:** reproduce la estructura oficial de los diez temas y siete prácticas.
2. **Desarrollo temático:** cada tema tiene una nota índice y notas específicas para sus subtemas.
3. **Conocimiento transversal:** los principios que se reutilizan en varios temas tienen una única nota de referencia.

## 2. Regla contra la duplicación

No mantener dos explicaciones principales del mismo concepto. En una nota de tema se explica cómo se aplica el concepto a esa familia de materiales; la teoría general permanece en la nota transversal correspondiente.

Ejemplo: la nota sobre temple del acero desarrolla la ruta de tratamiento para los aceros y enlaza [[04 - CONCEPTOS TRANSVERSALES/11 - Tratamientos térmicos|Tratamientos térmicos]]. No debe replicar toda la teoría general de tratamientos térmicos.

## 3. Convención de nombres

- Temas: `T01`, `T02`, ..., `T10`.
- Prácticas: `P01`, `P02`, ..., `P07`.
- Conceptos transversales: `CT01`, `CT02`, ...
- Subtemas: `Txx.nn` en la propiedad `codigo`.
- Archivos: prefijo numérico solo para ordenar; el título debe seguir siendo legible.

Activar la actualización automática de enlaces internos antes de renombrar notas.

## 4. Propiedades normalizadas| Propiedad| Uso| Valores recomendados||---|---|---|| `tipo`| Naturaleza de la nota| inicio, programa, tema, subtema, concepto, practica, fuente, recurso, ejercicio, glosario|| `codigo`| Identificador estable| T01, T01.01, P01, CT01|| `tema`| Tema o temas asociados| T01; en notas transversales, transversal|| `area`| Bloque de organización| teoria, laboratorio, fundamentos, bibliografia, recurso|| `estado`| Avance editorial| pendiente, en_desarrollo, revisado, validado|| `fuentes`| Referencias que sustentan la nota| enlaces a notas bibliográficas|| `relaciones`| Enlaces conceptuales principales| enlaces internos a notas|

Usar exactamente los mismos nombres y valores de propiedades.

## 5. Cómo crear una conexión útil

Crear un enlace cuando exista una relación académica real: prerrequisito conceptual, aplicación, mecanismo común, variable compartida, método experimental o comparación de propiedades. No enlazar notas solo para aumentar artificialmente el grafo.

Cada nota desarrollada debería enlazar al tema padre, entre dos y cinco conceptos relacionados cuando proceda, y las prácticas, ejercicios o fuentes pertinentes.

## 6. Fuentes y rigor académico

- Registrar autor, título, edición, editorial o revista, año y páginas consultadas.
- Para artículos: DOI o URL estable.
- Para normas: organismo, código, edición y año.
- Diferenciar información de la fuente, interpretación propia y datos experimentales.
- No inventar normas, valores de propiedades ni diagramas. Registrar unidades, condiciones y composición cuando se comparen propiedades.

## 7. Estados editoriales

- `pendiente`: estructura preparada, contenido no desarrollado.
- `en_desarrollo`: contenido en elaboración.
- `revisado`: contraste técnico y bibliográfico realizado.
- `validado`: contenido listo para utilizar, sujeto a revisión periódica.

## 8. Adjuntos

Configurar en Obsidian **Settings → Files & Links → Default location for new attachments** como `In the folder specified below` y seleccionar `06 - RECURSOS/07 - Adjuntos`.

## 9. Qué no hacer

- No crear una nota nueva para cada frase o dato aislado.
- No duplicar el mismo contenido en la nota del tema, el laboratorio y el glosario.
- No guardar el mismo PDF varias veces.
- No instalar plugins innecesarios antes de estabilizar la estructura.
- No marcar una nota como validada solo porque tenga texto.

---
tipo: mapa
codigo: "MAP-02"
area: "navegacion"
estado: pendiente
fuentes: []
relaciones: []
---

# Mapa de conexiones de la asignatura

El diagrama muestra relaciones principales entre los bloques. Es una vista conceptual, no una secuencia rígida de prerrequisitos.

```mermaid
graph TD
  T1["T01 · Generalidades"] --> E["Estructura–propiedades–procesamiento"]
  E --> T3["T03 · Materiales ferrosos"]
  E --> T4["T04 · No ferrosos"]
  E --> T5["T05 · Cerámicos"]
  E --> T6["T06 · Polímeros"]
  E --> T7["T07 · Compuestos"]
  E --> T8["T08 · Semiconductores"]
  T2["T02 · Transformaciones"] --> D["Difusión y transformaciones de fase"]
  D --> T3
  D --> T4
  D --> HT["Tratamientos térmicos"]
  HT --> P1["P01 · Puntos críticos"]
  HT --> P2["P02 · Recocido y normalizado"]
  HT --> P3["P03 · Temple y revenido"]
  HT --> P4["P04 · Aceros inoxidables"]
  HT --> P5["P05 · Aluminio"]
  T5 --> P6["P06 · Cerámicos"]
  T6 --> P7["P07 · Polímeros y compuestos"]
  T7 --> P7
  T3 --> T9["T09 · Corrosión"]
  T9 --> T10["T10 · Selección"]
  T3 --> T10
  T4 --> T10
  T5 --> T10
  T6 --> T10
  T7 --> T10
  T8 --> T10
```

## Cómo leerlo

- **Tema 01** introduce el marco estructura–propiedades–procesamiento que reaparece en toda la asignatura.
- **Tema 02** explica la evolución de fases y microestructuras, con conexión directa con los tratamientos térmicos.
- **Temas 03 y 04** aplican estos principios a aleaciones ferrosas y no ferrosas.
- **Temas 05, 06, 07 y 08** amplían el estudio a cerámicos, polímeros, compuestos y semiconductores.
- **Tema 09** analiza la degradación y **Tema 10** integra los criterios de selección.

Para profundizar, abrir el grafo local desde la nota de cada tema.

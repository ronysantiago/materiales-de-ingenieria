# Laboratorio de Diagramas de Fase

**Versión del prototipo:** 0.3.0

## Propósito

Construir un entorno visual para estudiar la geometría de sistemas ternarios A–B–C antes de incorporar datos de elementos o aleaciones reales. La primera versión permite reconocer el prisma de composición-temperatura, explorar superficies liquidus, solidus y solvus, y recorrer la temperatura en ambos sentidos.

## Coordenadas

La base es un triángulo de composición en coordenadas baricéntricas:

\[X_A + X_B + X_C = 1, \qquad X_i \ge 0.\]

La coordenada vertical representa la temperatura. Un corte isotérmico se define por:

\[T=T_0,\]

por tanto, es paralelo al plano basal de composición.

## Modelos genéricos incluidos

1. **Solubilidad sólida completa:** un único campo sólido α; se ilustran los campos L, L + α y α.
2. **Solubilidad sólida parcial:** soluciones terminales α, β y γ con zonas genéricas de coexistencia.
3. **Solubilidad sólida muy limitada:** campos terminales más estrechos y regiones multifásicas amplias.

Los campos de solvus se representan mediante superficies didácticas que delimitan regiones terminales. Estos modelos son esquemas geométricos y pedagógicos. No se derivan de una regla universal para sistemas ternarios ni de diagramas binarios extrapolados. Las fronteras se definen mediante funciones ilustrativas.

## Calentamiento y enfriamiento

Para una composición global fija, el prototipo define temperaturas de liquidus y solidus esquemáticas. Entre ambas interpola una fracción sólida:

\[f_s=\operatorname{clamp}\left(\frac{T_L-T}{T_L-T_S},0,1\right).\]

Al enfriar, la fracción sólida aumenta; al calentar, disminuye. Esta interpolación no constituye una regla de la palanca general para sistemas ternarios y no calcula fracciones de fase de equilibrio. Se usa únicamente para animar el recorrido conceptual.

## Microestructura

El mosaico de celdas tipo Voronoi es ilustrativo. Su objetivo es ayudar a distinguir regiones sólidas y líquido residual durante el recorrido de temperatura. No modela difusión, nucleación, anisotropía cristalográfica, segregación, coarsening ni crecimiento dendrítico cuantitativo. Las ramificaciones son ornamentales.

## Interpretación responsable

- No asignar composiciones ni temperaturas a materiales reales usando esta primera versión.
- No interpretar la velocidad del control como una velocidad experimental de enfriamiento.
- No interpretar el mosaico como micrografía predicha.
- No inferir topologías invariantes de equilibrio solo por elegir "completa", "parcial" o "muy limitada".

## Evolución prevista

1. Sustituir funciones esquemáticas por superficies de datos termodinámicos.
2. Calcular secciones isotérmicas y composiciones de fases con una base CALPHAD validada.
3. Calcular fracciones de fase de equilibrio y trayectorias de solidificación.
4. Incorporar modelos Scheil o de solidificación fuera de equilibrio con hipótesis declaradas.
5. Sustituir el mosaico ilustrativo por campos de fase o resultados microestructurales calculados.

# Presentación · NVIDIA DLSS (2018–2026)

Presentación web (SPA de diapositivas) sobre la evolución de **DLSS**, desde los
prototipos NGX de 2018 hasta **DLSS 5** y el renderizado neuronal guiado en 3D.

Pensada para una exposición de ~60 minutos repartida entre 4 integrantes
(~15 min c/u). **El reparto y los tiempos NO aparecen en la web**: están en
[`GUION-Y-REPARTO.txt`](./GUION-Y-REPARTO.txt).

## Cómo verla

Es HTML/CSS/JS puro (módulos ES, sin dependencias ni build). Para abrirla en
local necesitas servirla por HTTP (los módulos ES no cargan con `file://`):

```bash
# desde esta carpeta
python3 -m http.server 8000
# luego abre http://localhost:8000/
```

## Controles

- **← → / espacio / rueda del mouse**: navegar entre diapositivas.
- **F**: pantalla completa.
- **M**: abrir/cerrar el índice.
- **Táctil**: deslizar a izquierda/derecha.
- El hash de la URL (`#12`) guarda la diapositiva actual.

## Estructura

```
presentationnDLSS/
├── index.html              # cascarón y contenedores
├── css/style.css           # estilo propio (tema oscuro teal/magenta)
├── js/
│   ├── slides.js           # TODO el contenido como datos (editable)
│   └── app.js              # motor: navegación, índice, fondo animado
├── GUION-Y-REPARTO.txt      # guión y tiempos por integrante (no se publica en la web)
└── README.md
```

Para editar el contenido, toca solo `js/slides.js`: cada diapositiva es un
objeto con `type`, `title` y `html`.

## Despliegue en Vercel

El repositorio ya publica cada carpeta como una ruta (ver `index.html` y
`vercel.json` en la raíz). Esta presentación queda en:

```
https://<tu-dominio>.vercel.app/presentationnDLSS/
```

No requiere configuración adicional: son archivos estáticos.

## Contenido (capítulos)

1. **Orígenes y era espacial** (2018–2019): Turing, NGX, DLSS 1.0, el caso "1.9".
2. **Revolución temporal** (2020–2023): DLSS 2.0/DLAA, Frame Generation (3.0), Ray Reconstruction (3.5).
3. **Era Transformer y competencia** (2025–2026): DLSS 4.0/4.5, Multi Frame Generation, FP8, FSR y XeSS.
4. **DLSS 5 y debates** (2026): renderizado neuronal guiado en 3D, maduración del año, los cuatro debates críticos, conclusión.

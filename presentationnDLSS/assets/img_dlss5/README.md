# Imágenes de la Parte 4 (DLSS 5)

Coloca aquí las imágenes que buscarás en internet. Los slides ya las referencian
por nombre; si el archivo no existe, se muestra un marcador (placeholder) en su lugar.

Nombres esperados por los slides (`js/slides.js`, Capítulo 4):

| Archivo                          | Diapositiva / uso                                              |
|----------------------------------|----------------------------------------------------------------|
| `portada-wireframe-render.jpg`   | Portada cap. 4 — fondo tenue: mitad wireframe / mitad render   |
| `sintesis-antes-despues.jpg`     | "Qué sintetiza" — comparativa antes/después con 4 hotspots     |
| `arte-original.jpg`              | Debate 4 — cuadro 1: escena original del estudio               |
| `arte-iluminado.jpg`             | Debate 4 — cuadro 3: iluminación IA respetando el estilo       |
| `qr.png`                         | Gracias — QR opcional al repo/diapositivas                     |

Miniaturas opcionales para la línea de tiempo (diapo "maduración 2026"):
logo GTC (mar), portada NBA 2K27 (sep), collage Hogwarts Legacy / Where Winds Meet (nov).

## Cómo activar una imagen

Para la comparativa con hotspots y los cuadros del tríptico, el marcador usa la clase `ph`.
Reemplaza el `<div class="imgframe ph" ...>` por una etiqueta con la imagen, p. ej.:

```html
<div class="imgframe" style="min-height:360px;">
  <img src="assets/img_dlss5/sintesis-antes-despues.jpg" alt="Comparativa render base vs DLSS 5">
  <span class="hotspot" style="left:30%;top:28%;">1</span>
  ...
</div>
```

Ajusta las coordenadas `left`/`top` de cada `.hotspot` para que apunten al detalle correcto
de tu imagen. La imagen de fondo de la portada usa `onerror` para ocultarse sola si falta.

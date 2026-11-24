# Maison Illimani — Perfumería de autor

Catálogo web progresivo (PWA) listo para entregar a un cliente. Proyecto de **Diseño Web II (SIS-0141) · UPDS Sede La Paz**.

## Qué incluye
- Catálogo con **20 ítems** cargados desde `data/products.json` (Fetch API + `loading="lazy"`), búsqueda, orden, pestañas por categoría, favoritos y filtro dinámico de 3 capas.
- Carrito con cantidades, presentaciones, costo de entrega y **pedido por WhatsApp** (o cola local si aún no hay número).
- **Carrusel de portada**, guía olfativa y selector de formato (ml) con precio por tamaño.
- Modo **claro/oscuro**, PWA instalable y **modo offline** (manifest + Service Worker + indicador de red).
- Seguridad: texto con `textContent`; HTML dinámico siempre con **DOMPurify** (`vendor/purify.min.js`).

## Cómo personalizarlo para el cliente (sin tocar código)
1. **`data/site.json`**: nombre, eslogan, dirección, horarios, redes y **`whatsapp`** (solo números con código de país, ej. `59171234567`).
2. **`data/products.json`**: productos/servicios. Campos: `nombre`, `categoria`, `precio`, `variantes` (opcional), `stock`, `imagen`, `descripcion` (admite `<b>` y `<em>`).
3. **`assets/images/`**: reemplaza los `.svg` ilustrativos por fotos reales (`.webp` recomendado, proporción 4:5) y cambia la ruta en el JSON.
4. Colores y tipografías: variables al inicio de `styles.css` (`--acento`, `--fondo`…).

> Los precios, horarios, equipo y textos incluidos son **datos de ejemplo**: deben ser validados con el cliente. Las ilustraciones son diseño propio (no son fotos de producto).

## Cómo ejecutarlo
No abrir con doble clic (`file://`): Fetch y Service Worker requieren servidor.
```bash
python -m http.server 8000     # luego abrir http://localhost:8000/
```
Publicación: sube la carpeta a GitHub Pages (HTTPS) manteniendo la estructura.

## Checklist de entrega (Guía unificada C3-A2)
1. **Prueba offline real**: DevTools → Network → *Offline* y recargar: debe cargar sin errores gracias a `sw.js`.
2. **Auditoría CLS/BEM**: imágenes con `width/height` + `aspect-ratio`; CSS en BEM de una clase, **sin `!important`**.
3. **XSS**: escribe `<script>alert('XSS')</script>` en cualquier formulario: debe verse como texto.

## Estructura
```
index.html · styles.css · script.js · sw.js · manifest.json
data/ (site.json, products.json) · assets/images/ · icons/ · vendor/ (jQuery 3.6.0, DOMPurify)
```

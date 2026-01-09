# Instrucciones del proyecto

## Estructura base
- `src/components/`: componentes modulares.
  - Cada componente vive en su propia carpeta con:
    - `NombreComponente.jsx`
    - `NombreComponente.css`
- `src/pages/`: paginas de la aplicacion al mismo nivel que `components/`.
- `src-tauri/`: archivos de la app de escritorio (Tauri).
- `docs/`: documentacion del proyecto.

## Notas
- Si un componente tiene assets propios, ubicalos dentro de su carpeta.
- Evita mezclar estilos globales con estilos de componentes.

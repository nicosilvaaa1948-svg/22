# BLUNNO — Sistema de Pedidos y Distribución (sin Firebase)

Proyecto estático con **HTML, CSS y JavaScript puro**, preparado para abrirse localmente o publicarse en GitHub Pages. No usa Firebase, base de datos remota, npm ni dependencias externas.

> **Importante:** esta versión sirve como prototipo funcional para probar el flujo de trabajo. Los datos se guardan en `localStorage` del navegador actual. No se sincronizan entre computadoras, celulares o navegadores. El login y los roles se validan en JavaScript del lado del cliente, por lo que **no son seguridad real** y no deben usarse para guardar información privada o sensible ni como solución multiusuario de producción.

## Archivos

- `index.html`: estructura de la web.
- `styles.css`: diseño responsive de BLUNNO.
- `app.js`: lógica del sistema, catálogo, pedidos, perfiles de demostración, búsquedas y exportaciones.
- `plantilla-catalogo.csv`: plantilla para carga masiva de artículos.
- `.nojekyll`: permite publicación simple en GitHub Pages.

## Funciones incluidas

- Acceso de demostración como administrador (Local 14) o una de las 13 sucursales.
- Catálogo agrupado por proveedor.
- Alta, edición y desactivación de proveedores y artículos.
- Presentaciones configurables: Unidad, Pack, Caja, Cajón, Pallet u otro nombre definido por el administrador, con equivalencia por presentación.
- Búsquedas con sugerencias, filtros y resultados por coincidencia.
- Creación de pedidos por proveedor, selección de artículos, cantidades y revisión previa.
- Historial separado por sucursal y bandeja de administración.
- Estados: Nuevo, En preparación, Preparado, Despachado, Entregado y Cancelado.
- Editor administrativo de pedidos con registro de actividad.
- Lista consolidada de preparación por proveedor y producto.
- Exportación de pedidos y preparación en CSV compatible con Excel.
- Comprobante imprimible; desde el diálogo de impresión se puede elegir “Guardar como PDF”.
- Copia de seguridad en JSON y restauración de copia.
- Importación masiva de catálogo desde CSV.
- Conservación de los datos históricos de nombre, presentación y equivalencia al crear un pedido.

## Cómo probarlo en tu computadora

1. Descargá y descomprimí el ZIP.
2. Abrí `index.html` con Chrome, Edge o Firefox. No requiere instalación ni conexión a Internet.
3. Usá las credenciales de demostración que figuran abajo.
4. Creá pedidos de prueba, modificá las equivalencias y probá las exportaciones.

### Accesos de demostración

**Administrador:**

- Usuario: `admin`
- Contraseña: `blunno14`

**Sucursales:**

- Usuario: `local01`, contraseña: `blunno01`
- Usuario: `local02`, contraseña: `blunno02`
- …
- Usuario: `local13`, contraseña: `blunno13`

Estos accesos no son seguros; son únicamente para probar la interfaz y el flujo.

## Publicar en GitHub Pages

1. En GitHub, creá un repositorio nuevo. Si vas a mostrarlo públicamente, recordá que cualquiera podrá descargar el código y ver cómo funciona el login de demostración.
2. Descomprimí el ZIP y subí a la raíz del repositorio los archivos `index.html`, `styles.css`, `app.js`, `README.md`, `plantilla-catalogo.csv` y `.nojekyll`.
3. Entrá a **Settings → Pages**.
4. En **Build and deployment**, elegí **Deploy from a branch**.
5. Seleccioná la rama `main` y la carpeta `/ (root)`, y guardá.
6. Cuando GitHub Pages publique el sitio, abrí la URL que te muestre esa pantalla.

No hay que ejecutar `npm install`, no hace falta compilar ni configurar variables de entorno para esta versión.

## Cómo se guardan los datos ahora

Los proveedores, artículos, sucursales, pedidos y actividad se guardan en el almacenamiento local del navegador (`localStorage`). Esto permite cerrar y volver a abrir el sitio en el mismo navegador y mantener los datos. Borrar los datos del sitio o cambiar de navegador puede eliminarlos o hacer que no estén disponibles.

Usá **Exportar copia** desde el menú lateral de administrador con frecuencia. La copia `.json` incluye todos los datos de demostración y cualquier cambio que hayas hecho en ese navegador. **No es una copia remota**.

## Carga de muchos productos

Desde **Proveedores y artículos → Importar CSV**, se puede importar un archivo CSV separado por `;`, con encabezados `proveedor;articulo;categoria;presentaciones;observaciones;estado`. Para separar presentaciones dentro de una celda, usá `|`, por ejemplo `Unidad=1|Pack=9|Caja=36`. También está la plantilla `plantilla-catalogo.csv`.

Si ya existe un artículo con el mismo nombre dentro del mismo proveedor, la importación actualiza ese artículo. Si no existe el proveedor, lo crea. Revisá el resultado luego de importar; se recomienda guardar una copia de seguridad antes de hacerlo.

## Límite importante antes de usarlo en los 14 locales

GitHub Pages solo publica archivos estáticos. Como esta versión no tiene servidor ni Firebase:

- Los pedidos creados desde una PC **no aparecen automáticamente** en otra PC.
- Las sucursales no comparten un historial remoto.
- Los permisos y contraseñas del cliente pueden ser examinados o modificados por alguien con conocimientos técnicos.

Para que los 13 locales y el Local 14 trabajen a la vez con una única bandeja de pedidos y permisos reales, más adelante va a hacer falta conectar un backend seguro (Firebase u otra alternativa). No se incluyó ninguna conexión ni credencial externa en este proyecto porque esta entrega es expresamente **sin Firebase**.

## Recomendaciones de uso

- Los nombres y cantidades de los productos iniciales son **datos de ejemplo**. Corregí las equivalencias con el proveedor antes de usar el catálogo.
- Los artículos se desactivan en lugar de borrarse si querés preservar el historial.
- Cuando cambia la equivalencia de un pack o caja, la modificación se utiliza para pedidos nuevos. Cada pedido guarda su propia instantánea de equivalencias.
- Los archivos CSV se abren con Excel. Para PDF, usá **Imprimir / PDF → Guardar como PDF** en el diálogo del navegador.
- Probá primero con pedidos ficticios, revisá los PDF/CSV y descargá una copia de seguridad.

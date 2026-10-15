# Inventario TI · CETA

Aplicación web (React + Vite + Supabase) para llevar el inventario de equipos de TI de la universidad con las mismas 32 columnas de la plantilla `Inventario_temporal.xlsx`, y exportarlo a Excel con exactamente ese formato.

## Qué hace

- **Equipos**: lista con búsqueda instantánea (nombre, serie, MAC con o sin separadores, IP, encargado, TeamViewer, OC…), filtros por unidad, edificio, tipo, categoría, estado y datos pendientes, orden por columna y una vista con las 32 columnas y las mismas bandas de color del Excel.
- **Ficha de cada equipo** con todos los datos por sección, aviso de campos obligatorios pendientes y su historial completo.
- **Agregar y editar** con validación: serie en mayúsculas y sin espacios, MAC en formato `XX-XX-XX-XX-XX-XX` (acepta `aa:bb:…`, `aabb.ccdd…`, o `N/A`), IPv4, campos numéricos, serie y nombre únicos. Solo el número de serie es indispensable; lo demás se puede ir llenando.
- **Trasladar** (unidad, encargado, edificio, oficina…) y **cambiar estado**, siempre con motivo.
- **Historial de cambios**: cada alta, edición, traslado, cambio de estado, importación y eliminación queda con quién, cuándo, el motivo y el valor anterior → nuevo de cada campo. Lo escribe la base de datos con triggers, así que no se puede saltar.
- **Importar** el Excel actual (o cualquiera con la plantilla): reconoce las columnas por título, crea los equipos nuevos y actualiza los existentes por número de serie, y avisa de filas sin serie, series repetidas y formatos dudosos antes de importar.
- **Exportar a Excel** todo o solo lo filtrado, con las hojas Inventario, Listas y Campos, encabezados por sección con sus colores, notas en cada encabezado, listas desplegables, paneles inmovilizados en C3 y autofiltro.
- **Varios usuarios a la vez**: la lista se actualiza sola cuando otra persona guarda, y si dos personas editan el mismo equipo, la segunda recibe un aviso en lugar de pisar los cambios.
- **Roles**: Pendiente, Consulta, Editor y Administrador. La clave de Windows solo la ven editores y administradores (está en una tabla aparte protegida por RLS) y en el historial nunca se guarda su valor.
- **Catálogos** editables (unidades con su tipo de área, edificios, estados…) y detección de valores en uso que no están en el catálogo.

## Probarlo ya (modo demostración)

Sin configurar nada, la app arranca con datos de ejemplo guardados en el navegador:

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

## Ponerlo en marcha con Supabase

1. **Cree un proyecto** en https://supabase.com (el plan gratuito sirve para empezar).
2. **Cree la base de datos**: en el proyecto, *SQL Editor → New query*, pegue todo `supabase/schema.sql` y pulse *Run*. Se puede volver a ejecutar sin perder datos.
3. **Conecte la app**: copie `.env.example` como `.env` y llene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (*Project Settings → API*).
4. `npm run dev` y **cree su cuenta** en la pantalla de inicio. **El primer usuario queda como administrador**; los siguientes quedan como *Pendiente* hasta que usted les asigne un rol en *Usuarios*.
5. **Importe el Excel actual** en *Importar*.
6. En *Catálogos → Unidades*, agregue las 59 unidades con su tipo de área (la pantalla muestra las que ya vienen en el Excel para agregarlas con un clic).

### Publicarlo en GitHub Pages

El proyecto ya trae `.github/workflows/deploy.yml`, que compila y publica la app cada vez que se sube un cambio a `main`.

1. Cree un repositorio en GitHub (por ejemplo `inventario-ti`) y suba el proyecto:
   ```bash
   git init
   git add .
   git commit -m "Inventario TI"
   git branch -M main
   git remote add origin https://github.com/SU_USUARIO/inventario-ti.git
   git push -u origin main
   ```
   El archivo `.env` no se sube (está en `.gitignore`).
2. En el repositorio, *Settings → Secrets and variables → Actions → New repository secret*, cree:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. *Settings → Pages → Build and deployment → Source*: elija **GitHub Actions**.
4. En *Actions*, vuelva a ejecutar el flujo «Publicar en GitHub Pages» (o suba cualquier cambio). Al terminar, la app queda en `https://SU_USUARIO.github.io/inventario-ti/`.
5. En Supabase, *Authentication → URL Configuration*: ponga esa dirección en *Site URL* y agréguela en *Redirect URLs*, para que los correos de confirmación lleven a la app publicada.

La llave `anon` de Supabase queda visible en el código publicado; es normal y está pensada para eso. Lo que protege los datos son los roles y las políticas RLS de `schema.sql`: sin una cuenta aprobada no se ve nada.

### Otro hosting

`npm run build` genera la carpeta `dist/`, que funciona en cualquier hosting estático (Vercel, Netlify o un servidor web interno) porque las rutas usan `#` y no necesitan configuración del servidor.

### Recomendaciones

- Cualquiera que cree una cuenta queda como *Pendiente* y no ve nada hasta que un administrador lo apruebe. Si prefieren entrar con las cuentas institucionales, Supabase permite activar el inicio de sesión con Microsoft (*Authentication → Providers → Azure*).
- El plan gratuito de Supabase pausa el proyecto tras una semana sin uso y hace respaldos limitados; para uso diario conviene el plan Pro o exportar el Excel periódicamente.
- La lista carga todos los equipos en el navegador para buscar al instante; funciona bien hasta unos 10 000 equipos.

## Reglas que conviene conocer

- **Campos obligatorios**: son los marcados «Sí» en la hoja Campos. Máscara, puerta de enlace, DNS y TeamViewer solo aplican (y solo se piden) en equipos Mini PC.
- **N/A**: en MAC, IP y campos numéricos se puede escribir `N/A`, `No tiene` o `-` cuando el equipo no tiene ese dato (p. ej. sin segundo puerto LAN). Cuenta como campo lleno.
- **Eliminar** solo lo puede hacer un administrador y conserva el historial. Para equipos que dejan de usarse es mejor el estado *De baja*.
- **Importar** no borra datos por defecto: si una celda viene vacía y el equipo ya existe, se conserva lo que hay en el sistema.

## Estructura

```
supabase/schema.sql        Tablas, triggers de historial, funciones RPC y seguridad (RLS)
src/config/campos.js       Las 32 columnas de la plantilla: única fuente para formulario, tabla, importación y exportación
src/lib/excel.js           Exportar con el formato exacto e importar
src/lib/normalizar.js      Normalización y validación (serie, MAC, IP…)
src/api/supabaseApi.js     Acceso a Supabase
src/api/demoApi.js         Modo demostración con las mismas reglas
src/pages/                 Equipos, ficha, formulario, historial, importar, catálogos, usuarios
```

Si la plantilla del Excel cambia (una columna nueva, otro orden), se ajusta `src/config/campos.js` y, si es una columna nueva, se agrega también en `supabase/schema.sql`.

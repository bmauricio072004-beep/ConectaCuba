# ConectaCuba

Código de la aplicación de empleo ConectaCuba, basado en la versión 17. Conserva la interfaz arena/petróleo y el logo original. La web informativa vive en `/` y la app en `/app/`.

## Prueba en línea

La configuración de Vercel incluida publica un **entorno de revisión con datos ficticios**. Todavía no conecta usuarios, CV, fotografías ni ofertas reales. El selector Persona / Negocio permite recorrer ambos lados de una postulación y guardar los cambios del simulador dentro de la pestaña, si el navegador permite sessionStorage. No se envían correos ni archivos ni se crean cuentas.

Con Node.js 22 o posterior, sin dependencias externas:

```sh
npm run build
python3 -m http.server 8000 --bind 127.0.0.1 --directory preview-site
```

Abre `http://localhost:8000/` para la web y `http://localhost:8000/app/?role=person&catalog=1#empleos` para la app de prueba. No abras la aplicación de producción mediante `file://`.

En Vercel, importa este repositorio y conserva el directorio raíz del proyecto. `vercel.json` declara `node scripts/build-hosted-preview.cjs` como build y `preview-site` como salida; no requiere variables de entorno para esta revisión. La configuración evita indexación y caché de la revisión. Para acceso privado, configúralo en el proveedor: el archivo no implementa control de acceso del alojamiento.

`preview-site/` es una salida generada, distinta de `dist/`. El build limpia solo `preview-site/`, conserva la web informativa y genera la app de revisión autónoma sin instalar un service worker. No modifica los activos de producción.

## Código y backend real

El frontend original es HTML, CSS y JavaScript, sin framework ni dependencias npm. `auth.js`, `opportunities.js` y `hiring.js` contienen los flujos originales. `scripts/build-preview.cjs` y el fixture son herramientas de revisión, no un backend de producción.

Para preparar los activos de la aplicación real localmente:

```sh
node scripts/bootstrap-local.cjs
node scripts/verify-release.cjs
```

El primer comando crea `auth-config.js` con URL y clave vacías **solo si el archivo no existe**, y prepara `dist/`. Si ya existe, conserva su configuración. La aplicación real seguirá sin registro, acceso ni datos hasta conectar un backend de desarrollo autorizado. Usa `auth-config.example.js` como referencia; nunca incluyas claves de servicio, contraseñas ni `.env` en Git. La configuración local está ignorada.

No hay datos de producción ni cuentas reales en el repositorio. El material SQL conserva el esquema y migraciones históricos; no es un bootstrap de base de datos validado. Lee `supabase/LEEME_MIGRACIONES.txt`. La suite `supabase/verify_core_workflows.sql` necesita actualizar las expectativas de automoderación antes de ejecutarse y conservar su `ROLLBACK`. No se ha ejecutado esa suite sobre un servicio real para esta entrega.

## Verificación

```sh
npm test
```

Ejecuta las comprobaciones del simulador, rutas, contratación, ciclo de sesión y ofertas sin acceder a servicios reales. No equivale a inspección visual ni a una prueba de entrega de correo. `npm run verify:release` requiere preparar `dist/` previamente y comprueba paridad de activos y exclusión de fixtures.

Consulta `DEVELOPMENT.md`, `PENDIENTES.txt` y `MARCA_Y_DISENO.txt` para los flujos y límites de la base v17. Las menciones a Hostinger en esos documentos describen opciones de la exportación histórica; la revisión actual está preparada para Vercel. Cualquier sustitución del backend sigue pendiente de diseño y validación.

## Revisión v18

Consulta PLAN_DE_TRABAJO.md para lo entregado y lo pendiente, y docs/CONTACTOS_Y_SELECCION.md para los contratos del backend real. La revisión añade contacto laboral, invitaciones, próximos pasos, novedades, borradores y reportes con datos ficticios. No cambia las cuentas ni los datos reales de Supabase.

La revisión v19 mejora compartir/WhatsApp en listados y fichas, añade vista previa de vacantes y filtros de postulaciones. Consulta docs/PRUEBA_V19.md para el recorrido. El acceso protegido de Vercel no se ha desactivado.

La v20 revisa registro/contactos para reutilizar datos, añade conversaciones por postulación y suaviza el diseño móvil. Ver docs/PRUEBA_V20.md. El registro de la beta es una simulación sobre perfiles ficticios; la autenticación y el backend reales siguen pendientes de conexión y validación.

## Revisión v21

Nuevo inicio Explorar, solicitudes y conversación de servicios, navegación Explorar/Empleo/Actividad/Perfil y contacto integrado en los datos del perfil/negocio. Es una prueba con perfiles ficticios y sin pagos ni mapas reales. Ver docs/PRUEBA_V21.md y docs/CONEXIONES_Y_DIRECTORIO.md. La nueva apariencia es clara y sobria; conserva el logo original.

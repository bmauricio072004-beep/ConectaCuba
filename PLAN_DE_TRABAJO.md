# ConectaCuba — trabajo priorizado

Objetivo: completar el ciclo de empleo antes de ampliar el producto. Conservar el diseño arena/petróleo y el logo original. Referencia de revisión solicitada: 06:00 America/Edmonton (Medicine Hat).

## Implementado en la revisión v18

- WhatsApp laboral de persona separado del correo de acceso y del contacto privado de recuperación. Teléfonos cubanos de ocho cifras y prefijos internacionales; validación de formato, no verificación de titularidad.
- Contacto del negocio con responsable, horario, teléfono alternativo y visibilidad pública o solo para personas invitadas/seleccionadas.
- Invitación a entrevista o selección con mensaje, fecha/hora de Cuba e indicaciones. Sin envío automático de WhatsApp.
- Historial de estados y próximos pasos dentro de la postulación. «Seleccionada» no equivale a contrato.
- Novedades por cuenta dentro de Cuenta, sin añadir otra pestaña principal.
- Borradores por cuenta/formulario en la pestaña, recuperación explícita y exclusión de contraseñas, archivos y consentimiento.
- Aviso de falta de conexión; no hay cola de escrituras ni sincronización offline completa.
- Compartir enlace de oferta mediante menú del dispositivo o copia.
- Reporte de oferta y revisión desde administración en el simulador.
- Ayuda y privacidad: qué se comparte, límites de la retirada, precauciones y borradores.
- Validación adicional de salario y crédito de autoría original.

Los flujos nuevos de visibilidad restringida, invitaciones y reportes están integrados con el simulador de revisión. No se han aplicado esquemas ni funciones a Supabase real. El frontend protege su activación con capacidades declaradas por la configuración; esa capacidad no reemplaza permisos del servidor.

## Antes de una beta con personas reales

1. Implementar y comprobar los contratos de backend descritos en docs/CONTACTOS_Y_SELECCION.md, con pruebas negativas por cuenta y negocio.
2. Validar registro, confirmación, recuperación, cierre de sesión y entrega real de correos.
3. Resolver la suite SQL histórica y la edición de reseña propia del administrador, conservando la excepción autorizada.
4. Persistir notificaciones/historial en servidor y resolver accesos simultáneos. Las novedades actuales son locales a esta pestaña.
5. Conectar reportes a moderación real, establecer responsables y plazos; eliminación de cuenta y política de conservación.
6. Revisar textos de privacidad/publicación para los mercados atendidos.
7. Probar Android real, teclado, accesibilidad, red lenta y consumo de datos desde Cuba.
8. Medir errores y conversión sin capturar CV, contactos ni contenido privado en analítica.

## Después del piloto

- Google primero: configurar proveedor OAuth, redirecciones y vinculación de cuenta existente sin duplicar CV. Facebook según demanda real. No añadir botones inactivos.
- Favoritos sincronizados entre dispositivos.
- Vencimiento de vacantes, requisitos estructurados y mejoras de búsqueda basadas en uso.
- Previsualización pública para compartir ofertas en redes.
- Verificación de negocios y prevención de abuso con límites del servidor.

## Más adelante

Mapas, directorio de servicios, estadísticas salariales con suficientes datos, planes comerciales, pagos, tiendas e IA. Revisar el plan de Vercel antes del uso comercial; no activar compras o mejoras de pago automáticamente.

## Validación de esta entrega

Pasaron las diez comprobaciones de código, publicación, paquete hospedado, flujos de cuenta, contactos/selección, borradores, contratación, sesiones y ofertas. La verificación local usa un sistema de archivos en memoria por la restricción de solo lectura del entorno; no se modificó la copia local de producción. La nueva fuente se guarda en GitHub mediante sus herramientas conectadas. La inspección visual en navegador real sigue pendiente. Vercel puede exigir autorización adicional del espacio para leer logs: no confundir el estado READY con una inspección visual o una validación del backend real.

## Mejora adicional v19

- Compartir ofertas desde el listado y desde las vacantes abiertas del negocio.
- Botón público de WhatsApp únicamente cuando el directorio saneado devuelve un contacto público; no se agregan teléfonos de candidatos a los listados resumidos.
- WhatsApp contextual del candidato dentro de su ficha autorizada, con mensaje preparado sin incluir CV.
- En la beta, los enlaces de WhatsApp muestran un diálogo de demostración en lugar de intentar enviar mensajes a números ficticios.
- Vista previa de una vacante antes de publicarla/guardar cambios, sin reemplazar el formulario ni perder el borrador.
- Filtros por estado en Postulaciones y mensajes de vacío específicos.

Las instrucciones de revisión se encuentran en docs/PRUEBA_V19.md.

Se agregaron indicadores de novedades a las pestañas actuales. Se consultan datos resumidos, con caché de treinta segundos por cuenta; se actualizan al abrir la pantalla y al leer una postulación. No son notificaciones push ni seguimiento en tiempo real. Las postulaciones que la persona acaba de enviar se consideran vistas para no avisarle de su propia acción.

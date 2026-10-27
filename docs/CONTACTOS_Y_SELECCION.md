# Contrato de backend para contactos y selección

Este documento especifica lo que falta implementar en el backend real. No es una migración ejecutada ni una certificación de permisos. El simulador implementa el contrato para evaluar la interfaz.

## Contactos

Separar el correo de autenticación de los canales laborales. El contacto privado de recuperación no se usa para rellenar automáticamente una postulación. La persona revisa el WhatsApp y da consentimiento para cada envío. La edición de su contacto no reescribe las instantáneas ya enviadas.

La preferencia del negocio contiene whatsapp, phone opcional, contact_person, contact_hours y visibility (public/invited). El número privado nunca debe copiarse a business_directory ni a respuestas públicas ni a snapshots de ofertas. El propietario puede leerlo; otras personas solo cuando la visibilidad es pública o poseen una postulación activa del negocio en estado contacted/accepted. Cualquier decisión debe tomarse con auth.uid() y la titularidad comprobada en servidor, no con el rol declarado por el cliente.

RPC cc_business_contact(business_id, application_id): devolver shared=false sin whatsapp, phone, contact_person ni contact_hours cuando no exista autorización. No basta con ocultar campos en HTML. Comprobar que application_id pertenezca al solicitante y al negocio. Restringir además el acceso público a negocios aprobados. La retirada o el rechazo revocan el acceso privado dentro de la app; no pueden borrar copias externas.

RPC cc_save_business_contact: solo propietario real, validar teléfonos y longitudes. La actualización de visibilidad no debe alterar el estado de aprobación ni cerrar vacantes por sí sola. Cambios de identidad/evidencia del negocio conservan el flujo de revisión ya acordado. Auditar cambios sin registrar números en logs públicos.

## Invitaciones y selección

RPC cc_application_next_step(application_id, job_id, status, employer_message, meeting_at, meeting_place): solo el propietario real de la vacante y de la postulación. status limitado a contacted/accepted; mensaje de 10 a 2000 caracteres; meeting_place máximo 300; fecha futura en ISO UTC. Mostrar siempre la hora con America/Havana. Validar y rechazar horas inexistentes por cambio horario; definir política para horas repetidas. No enviar mensajes externos desde la operación.

Guardar la transición y su historial de forma atómica. Rechazar postulaciones retiradas, IDs de otra vacante, cambios de titularidad y actualizaciones de CV/contacto por el negocio. Resolver concurrencia con versionado/updated_at y transacciones. Seleccionada es una decisión del proceso, no un contrato.

La respuesta de detalles del candidato al empleador debe eliminar CV, mensaje y contacto si se retiró. Las listas de candidatos continúan usando únicamente campos resumidos. Ni la nueva RPC ni las vistas deben permitir leer datos de otro negocio.

## Reportes

RPC cc_report_job: usuario autenticado real, oferta existente, motivo permitido y detalle de 15 a 2000 caracteres. Impedir duplicados pendientes y limitar frecuencia en servidor. No publicar identidad ni evidencia del autor.

RPC cc_reports_moderation: administración real según tabla/función de autorización, nunca user_metadata. Listar hasta 100, con paginación para uso real; marcar revisado no elimina ofertas. Registrar autor de la moderación y resultado. Establecer flujo de investigación, respuesta y retención antes de lanzar.

## Capacidades y pruebas necesarias

La configuración del cliente habilita employmentWorkflow solo después de que el servidor soporte todas las operaciones y supere las pruebas de permisos. La clave de capacidad no es una autorización: todas las operaciones deben volver a comprobar el actor en servidor.

Probar como invitado, persona propietaria, otra persona, negocio propietario, otro negocio y administrador; contacto público/restringido; estados previos/posteriores a invitación, rechazo y retirada; solicitud con application_id ajeno; XSS; teléfonos malformados; fechas invierno/verano; cambios simultáneos; reportes duplicados y límites. Revisar RLS, GRANT y funciones invoker/definer con el skill Supabase antes de aplicar cambios. Conservar tabla pedidos ajena. No ejecutar la suite SQL histórica sin conciliar las expectativas de automoderación.

## Registro y conversaciones (v20)

Pedir el WhatsApp laboral una vez al registrar persona o negocio. El contacto de recuperación privado no debe reutilizarse como contacto laboral. La metadata de Auth puede transportar ese dato de perfil, pero nunca decide permisos ni roles administrativos. Al primer acceso de una persona se inicializa cv_contact solo si falta; no sobrescribir cambios posteriores. Para negocios, cc_business_contact debe devolver los datos existentes del registro y las preferencias guardadas, con visibilidad privada por defecto; persistir contact_hours/contact_visibility en la configuración laboral. No pedir el número nuevamente para invitar o enviar mensajes.

RPC cc_application_messages(application_id, job_id): comprobar identidad real y pertenencia de ambos identificadores. Solo participantes de la postulación. Devolver como máximo los últimos 50 mensajes en orden cronológico; añadir paginación antes del uso real. No incluir CV ni números en los mensajes automáticamente. Al retirar, bloquear lectura al negocio; la persona conserva su historial privado en modo de solo lectura. Después de no selección, conservar lectura a participantes pero bloquear nuevos envíos.

RPC cc_send_application_message: solo participantes de un proceso abierto, texto de 1 a 2000 caracteres, escape en presentación, límite de frecuencia y clave de idempotencia para evitar duplicados por reintento. Insertar mensaje y actualizar updated_at/last_message_at/last_message_sender_role de la postulación en una transacción. Derivar sender_id y sender_role del actor real. Nunca aceptar identidad o destinatario suministrados por el cliente como autoridad. Las invitaciones/selecciones deben crear su mensaje con fecha e indicaciones en la misma transacción del cambio de estado.

La revisión implementa estas operaciones en su simulador. No se han creado ni aplicado tablas o funciones nuevas en el backend real.

La v20 envía client_key estable al reintentar el mismo mensaje. El simulador comprueba (postulación, actor, client_key) y devuelve el envío existente sin insertar otro ni crear otra novedad. El backend real debe imponer también una restricción única y resolver la carrera en una transacción; una comprobación previa en JavaScript no basta.

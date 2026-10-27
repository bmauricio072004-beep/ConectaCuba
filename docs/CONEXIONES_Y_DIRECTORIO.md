# Contratos pendientes para el directorio y las conexiones

La v21 implementa un simulador para evaluar la visión de ConectaCuba. Este documento no es una migración ejecutada.

cc_explore_directory: publicar solo perfiles aprobados y autorizados para aparecer. Separar identidad privada/CV de presentación pública. Solo nombre público, tipo, actividad, servicios, provincia/municipio públicos y contacto expresamente público. No copiar recuperación, dirección privada ni CV. Para mapas futuros, recoger coordenadas públicas con consentimiento y precisión escogida; no inferir domicilios privados.

cc_create_connection: actor autenticado real, perfil público disponible, destinatario derivado del registro y distinto del solicitante, texto de 15–2000 caracteres y consentimiento explícito al compartir el contacto. Reutilizar el contacto guardado. Una solicitud no constituye compra ni contrato. Evitar duplicados abiertos y limitar frecuencia en servidor.

cc_connection_requests: listar solo solicitudes del actor como solicitante o destinatario. Los listados no incluyen texto privado ni teléfono. El detalle valida titularidad y, tras la retirada, elimina contacto, contenido y conversación del destinatario; el solicitante conserva su registro. No aceptar requester_id/provider_id suministrados por el cliente como autoridad.

cc_update_connection: solo solicitante puede retirar; solo destinatario puede responder y marcar disponibilidad. Validar estados/longitudes, registrar transición y actualizar fecha de forma atómica. Rechazar cambios en solicitudes cerradas.

cc_connection_message: conversación entre participantes, texto de 1–2000 caracteres, límite de frecuencia, idempotencia por solicitud/actor/client_key y transacción para actualizar novedades. No permitir mensajes tras retirada o rechazo. Evitar duplicación y carreras mediante restricción única en base de datos, no solo prevalidación.

Las reglas de administración y de publicación deben derivarse de autorización real del servidor. Los controles de rol de la demo no son un sistema de autenticación real. Mantener los datos de empleo separados de perfiles públicos y solicitudes de servicios, con cuentas que puedan asumir varios roles en el futuro sin duplicarse.

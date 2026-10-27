# Revisión v20: flujos y diseño

## Datos una vez

1. En la barra superior, elegir Persona o Negocio y pulsar Ver registro. Es una simulación sin correo ni contraseña: no crea cuentas reales.
2. Comprobar que WhatsApp se pide una vez. Como negocio, registrar responsable, horario y visibilidad.
3. Guardar el registro de prueba. En Cuenta → Mi contacto laboral debe verse el número ya guardado; Editar es opcional.
4. Al registrar un negocio queda pendiente. Como Administración de prueba, revisar y aprobar el negocio; las vacantes se reabren manualmente, como antes.
5. Como Persona, postularse a una oferta nueva: el WhatsApp ya aparece y solo se pide autorizar compartirlo. Cambiarlo para esa postulación es opcional.
6. Volver a una oferta a la que ya se postuló: el botón abre directamente Mi postulación y evita otro intento de envío.

## Mensajes dentro del proceso

1. Negocio → Vacantes → postulante → conversación. Enviar un mensaje de prueba.
2. Persona → Mensajes y novedades → abrir el mensaje. Responder desde la misma postulación.
3. Comprobar etiquetas de remitente, hora de Cuba y actualización de indicadores. Actualizar recarga la conversación; no hay push ni mensajería en tiempo real.
4. Preparar una invitación o selección: el mensaje y sus indicaciones quedan dentro de la conversación.
5. Tras retirar una postulación, el negocio ya no accede a CV, contacto ni conversación. La persona conserva el historial en solo lectura. Después de no selección, no se pueden enviar mensajes nuevos.
6. Un fallo de envío debe conservar el borrador; un envío confirmado no debe ofrecer recuperar el mensaje ya enviado.

## Diseño

Revisar superficies redondeadas, botones tipo píldora, navegación móvil flotante y burbujas por remitente. Se mantienen el logo y los colores arena/petróleo. Probar en 320/360/390 px, con teclado abierto y fuente ampliada. La revisión visual en dispositivos reales está pendiente; los tests no sustituyen esa inspección.

La beta usa datos ficticios y persistencia en la pestaña. No envía WhatsApp ni correo ni conecta cuentas reales. No introducir datos personales.

Las conversaciones largas tienen un área de lectura propia y se abren en los mensajes más recientes. El campo de respuesta queda debajo. Los reintentos con el mismo identificador no deben insertar el mismo mensaje dos veces.

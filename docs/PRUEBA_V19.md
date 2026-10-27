# Revisión v19: compartir y conversar

Esta versión conserva las mejoras v18 y añade accesos más directos. Sigue usando datos ficticios y no envía mensajes reales.

1. Como Persona, compartir una oferta desde su fila o desde su detalle. El menú del dispositivo permite elegir destino; si no está disponible, se copia el enlace. El enlace de la beta puede exigir acceso de Vercel y sus datos locales no se sincronizan con otra persona.
2. Como Negocio, compartir una vacante abierta desde Vacantes o desde el detalle. Las vacantes cerradas no muestran el botón para compartir como oferta pública.
3. En Cuenta → Mi contacto laboral del Negocio, elegir contacto público. Como Persona, volver al listado: las publicaciones deben ofrecer WhatsApp del negocio. Restringirlo y comprobar que ya no aparece ese acceso público.
4. Abrir WhatsApp: la beta debe mostrar el mensaje preparado en un diálogo, con número ficticio, sin abrir una conversación real. Puede copiarse solo el texto.
5. Como Negocio, abrir una persona postulada: usar Abrir WhatsApp de la persona. El mensaje menciona el negocio y la vacante, sin incluir CV ni datos privados adicionales. Tras la retirada, desaparece el acceso al contacto.
6. Crear o editar una vacante y usar Vista previa. Revisar título, ubicación, salario, modalidad, jornada y descripción antes de publicar/guardar. Volver a editar debe conservar lo escrito.
7. Como Persona, filtrar Postulaciones por estado. Consultar el vacío de un filtro y volver a Todas; el filtro no elimina postulaciones.

Ver también docs/PRUEBA_V18.md. La revisión visual en un dispositivo real sigue pendiente; las pruebas automatizadas comprueban lógica, privacidad del simulador y empaquetado.

8. Revisar los indicadores de novedades en Postulaciones o Vacantes: al abrir el detalle deben disminuir. Al cambiar de cuenta/rol no deben conservar los avisos privados del anterior. La consulta no es instantánea ni envía notificaciones fuera de la app.

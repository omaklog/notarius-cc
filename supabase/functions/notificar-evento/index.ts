// Stub — la lógica real (envío de notificaciones por correo/WhatsApp/SMS ante
// eventos del sistema) pertenece al spec del módulo de Notificaciones, que
// todavía no existe. Este feature (01-infra-supabase) solo prueba que el
// runtime de Edge Functions sirve funciones correctamente.

Deno.serve(() => {
  return new Response(
    JSON.stringify({
      status: 'not_implemented',
      message:
        'notificar-evento: pendiente de implementación (spec futuro: Notificaciones).',
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})

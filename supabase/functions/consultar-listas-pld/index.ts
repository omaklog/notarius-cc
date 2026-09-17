// Stub — la lógica real (cotejo de listas de Cumplimiento PLD/UIF: Personas
// Bloqueadas, OFAC SDN, Lista Consolidada ONU, SAT 69-B, etc.) pertenece al
// spec del módulo de Cumplimiento PLD, que todavía no existe. Este feature
// (01-infra-supabase) solo prueba que el runtime de Edge Functions sirve
// funciones correctamente.

Deno.serve(() => {
  return new Response(
    JSON.stringify({
      status: 'not_implemented',
      message:
        'consultar-listas-pld: pendiente de implementación (spec futuro: Cumplimiento PLD/UIF).',
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})

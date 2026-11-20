// Enlace de "Publicar en la web" del Sheet "Tablero de arranque (datos)" (termina en /pub).
// Si se vacía, la app usa data.json.
// form: buzón de notas (formulario de Google "Notas del tablero", solo escritura; las respuestas caen en una hoja de Drive).
window.TABLERO = {
  pub: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5xVAsd4HAYStceZuKqvriEndfEoAGlHrW4Jf1CJLEXSZxeZT6MEbsTKr0f9yzwycT970PyiZkL3Bk/pub',
  gids: { tareas: 0, calendario: 101, pendientes: 102, plan: 103, compras: 104 },
  // supabase: tu cuenta (llave PUBLICA, la misma de Temple; los datos los protege la regla por usuario). Si se vacía, la app usa el Sheet publicado como antes.
  supabase: { url: 'https://tkuiwssnwljjxgcixhtr.supabase.co', key: 'sb_publishable_OGOh4KwojGkr4r2zUI6pGQ_hgSfFFgo' },
  form: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLScpFnWPUb2jnx41xgkeUL9Y64kvlO9OwqIjyVcGwEd0UyBTLA/formResponse',
    entry: 'entry.637774046'
  }
};

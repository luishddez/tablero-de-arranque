# Cómo Claude procesa la entrevista de Hungry (modo manual)

Proyecto Supabase `tkuiwssnwljjxgcixhtr`, tabla `docs (user_id, path, data jsonb)`.

## 1. Buscar solicitudes pendientes (al empezar cada sesión)
```sql
select user_id, path, data->>'ronda' as ronda, data->>'estado' as estado
from docs where path like 'comida/solicitudes/%' and data->>'estado' = 'pendiente';
```
Leer `data` completo: `entrevista` (secciones y preguntas con respuesta; `respuesta` puede traer «con mis palabras: …»),
`gustos` (si/no), `suplementos`, `calculo_basico`, y en rondas 2+ `respuestas_a_claude`.
Una ronda 2+ debe leerse junto con la ronda anterior (`comida/solicitudes/r1`, `comida/respuestas/r1`).

## 2. Decidir
- **Falta información o hay dudas** → responder con estado `preguntas` (máximo ~8 preguntas, claras, con opciones cuando se pueda; siempre se pueden contestar abiertas).
- **Hay suficiente** → responder con estado `propuesta` y escribir el régimen en `comida/plan_propuesto/*`.
- Las alergias son prohibición absoluta; lo que Luis descartó en gustos (`no`) no se propone.
- Catálogo de alimentos: `hungry/alimentos.js` (ids y valores por 100 g, USDA SR Legacy). Los platillos base están en `hungry/platillos.js`.

## 3. Escribir la respuesta (solo en estas rutas; Luis lo autorizó el 2026-11-23)
`comida/respuestas/<mismo id que la solicitud>` (r1, r2…), con `user_id` de la solicitud:
```json
{ "id": "r1", "ronda": 1, "estado": "preguntas|propuesta", "ts": 1700000000000,
  "resumen": "texto corto: qué entendí / qué me falta",
  "preguntas": [ { "id": "c1", "t": "texto", "tipo": "unica|multi|numero|hora|texto", "op": ["…"] } ],
  "necesidades": ["viñeta 1", "viñeta 2"],
  "razon": "por qué esta propuesta (texto, admite saltos de línea)" }
```
Para `propuesta`, además escribir cada comida en `comida/plan_propuesto/<id>` (borrar primero las anteriores):
```json
{ "id": "desayuno", "orden": 1, "comida": "Desayuno", "hora": "8:40", "dias": "todos|gym",
  "kcal": 550, "proteina_g": 40, "minutos": 10,
  "que_lleva": "A. … · B. …", "minimo": "versión chica", "nota": "aviso opcional",
  "opciones": [ { "id": "platillo-id", "n": "Nombre", "i": [["avena", 40], ["leche-entera", 244]] } ] }
```
`opciones[].i` usa ids del catálogo: con eso Hungry crea la alacena y la lista de compras.
Hungry lee las respuestas solo; Luis acepta con «Usar este régimen» (nada se activa sin su sí).

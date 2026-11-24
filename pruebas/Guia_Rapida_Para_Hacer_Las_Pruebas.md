# Guía rápida para ejecutar las pruebas finales

**Esta guía es complementaria a [Bitacora_Clase_11_Pruebas.md](Bitacora_Clase_11_Pruebas.md).**

## Antes de probar (5 preparaciones)

1. Instala/importa `workflows/Workflow_Final.json` y anota la versión de n8n.
2. En Baserow de **pruebas**, crea las 3 tablas según el README y una sola habitación `101 / Doble / Activa=true`.
3. Cambia los ID de tabla en los seis nodos HTTP, asigna credenciales Baserow y Header Auth y selecciona modelo Gemini en los dos nodos correspondientes.
4. Prueba primero `Webhook - Reserva` con Test URL y *Listen for test event*; si vas a automatizar varias llamadas, usa solo el webhook de producción **en una instancia de pruebas** y luego desactiva el workflow.
5. Toma captura de n8n **y** Baserow antes y después; elimina toda credencial/PII antes de subir.

## Secuencia mínima para avanzar

| Orden | Caso | Qué compruebas | Qué evidencia guardar |
| --- | --- | --- | --- |
| 1 | R01 | Reserva exitosa | Respuesta 200 + fila nueva en Baserow |
| 2 | R02 | Repetición | 409 + no aparece segunda fila |
| 3 | R03 | Habitación ocupada | 409 + no aparece fila conflictiva |
| 4 | R04 | Validación | 400 + lista de errores |
| 5 | I01 | Gemini interpreta una petición | 200 + salida estructurada en n8n |
| 6 | I04 | Comentario vacío | 400 y no se llama a Gemini |
| 7 | C01 | Chat comprueba ocupación con herramienta | Ejecución del Code Tool y respuesta coherente |
| 8 | C05 | Memoria separada por sesión | Dos sesiones y contexto sin filtración |
| 9 | R06 | Falla técnica Baserow | 503 y estado del incidente/ejecución |
| 10 | R10 | Timeout y repetición | Estado real de Baserow y limitación de duplicados |

**Después** ejecuta los demás casos que cubren situaciones especiales (R05, R07–R09, I02–I03, I05–I06, C02–C04, C06–C07, E01–E02). Por la guía del curso, no hay un número fijo de pruebas; las escogidas deben cubrir todas las rutas importantes.

## Comando rápido con PowerShell (ejemplo R01)

```powershell
$url = 'http://localhost:5678/webhook-test/reserva-hotel'
$apiKey = Read-Host 'Clave del webhook de pruebas'  # No pegarla en GitHub
$body = @{nombre='Ana Prueba'; email='ana.prueba@example.com'; fecha_entrada='2026-12-10'; fecha_salida='2026-12-12'; tipo_habitacion='Doble'; huespedes=2} | ConvertTo-Json -Compress
$body | curl.exe -i -X POST $url -H "X-Hotel-Api-Key: $apiKey" -H 'Content-Type: application/json' --data-binary '@-'
```

**Importante:** en Test URL pulsa *Listen for test event* antes de cada solicitud. Si el PowerShell mostrado inserta secretos en el historial, bórralo del historial local; no compartas capturas del terminal con claves.

## Qué hacer si no pasa una prueba

- Guarda **estado observado** (NO CUMPLE o NO FUE POSIBLE VERIFICAR) con captura y detalles del fallo.
- Corrige la copia en n8n, vuelve a probar el mismo caso y conserva ambos registros.
- Exporta otra vez el JSON que sí probaste; actualiza README y documentación para que describan esa versión.
- Nunca declares `CUMPLE` solo por el color verde de un nodo: revisa la fila en Baserow o la ausencia de escritura, según corresponda.

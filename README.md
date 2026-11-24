# Hotel Express — proyecto final de automatización con n8n

**Curso:** Automatización Inteligente con n8n · EAM · 2026-II  
**Proyecto:** Hotel Express — Workflow Final Unificado  
**Equipo e integrantes:** Ana Sofía Ricardo Aguilar; Juan Martín García Plazas; Luis Fernando Velásquez Monsalve; Mariana Valencia Henao  
**Versión de n8n:** no verificada en una instancia de ejecución; anotar la versión real en la bitácora tras la importación.  
**Estado de la entrega:** errores de estructura y manejo de respuestas corregidos; **faltan importación y pruebas integrales reales** en la instancia del grupo.

## Entregables de la guía

La presentación ya está incorporada y la bitácora contiene las evidencias históricas y el plan de aceptación. **Todavía se deben completar los resultados observados y evidencias de pruebas reales del JSON final antes de dar por terminada la entrega.**

| Entregable | Enlace | Estado en esta carpeta |
| --- | --- | --- |
| Workflow final | [Workflow_Final.json](workflows/Workflow_Final.json) | Incluido; importación y ejecución reales pendientes de comprobar. |
| Documentación del proyecto | [Documentacion_Proyecto_Final.md](documentacion/Documentacion_Proyecto_Final.md) | Incluida y revisada. |
| Presentación | [Presentacion_Proyecto_Final.pdf](presentacion/Presentacion_Proyecto_Final.pdf) | Incluida en la carpeta; revisar su contenido antes de entrega. |
| Bitácora de pruebas de clase 11 | [Bitacora_Clase_11_Pruebas.md](pruebas/Bitacora_Clase_11_Pruebas.md) | **Bitácora de pruebas disponible como protocolo; ejecución integral del JSON final pendiente.** |

**Diagramas:** [proceso manual](documentacion/diagramas/Proceso_Manual.png) · [proceso automatizado](documentacion/diagramas/Proceso_Automatizado.png).  
**Evidencias:** [dos capturas históricas](pruebas/evidencias/README.md) (solo versiones anteriores); faltan capturas de ejecución del JSON final. Para comenzar, sigue la [guía rápida de pruebas](pruebas/Guia_Rapida_Para_Hacer_Las_Pruebas.md) y consulta el [reporte estático](pruebas/Resultado_Revision_Estatica.md) y las [pruebas locales](pruebas/Resultado_Pruebas_Locales.md).

## Problema, objetivo y alcance

El registro manual de solicitudes de alojamiento puede implicar consultas dispersas, comprobaciones repetidas de ocupación y respuestas tardías o inconsistentes. El objetivo es demostrar un proceso automatizado que centraliza la verificación y creación de reservas, clasifica comentarios con IA y permite consultar disponibilidad en un chat interno.

**Alcance implementado en el JSON:** contiene **un workflow con tres entradas independientes**:

1. `POST /reserva-hotel`: valida el JSON, comprueba disponibilidad en Baserow y crea una reserva confirmada cuando encuentra una habitación elegible. Genera respuestas HTTP para validación, conflictos y errores.
2. `POST /clasificar-necesidad`: usa una cadena LLM de Google Gemini con esquema de salida para clasificar comentarios en `consulta_comercial`, `peticion_especial` u `otro`.
3. Chat interno de n8n: recupera información de Baserow, valida el contexto y la entrega a un agente con Gemini, memoria de sesión y herramienta local `consultar_disponibilidad` de solo lectura. **La integración completa del Code Tool debe probarse en la instancia del grupo** (ver documentación).

No hay interfaz de recepción pública de chat, sistema de pagos, correo de confirmación, integración implementada de Google Forms ni notificación a un operador. El formulario y Apps Script son **opciones externas no incluidas en el JSON**.

## Requisitos

- n8n Cloud o autohospedado con los nodos estándar y de IA usados en el export. **Verificar y consignar la versión concreta** en esta sección y en la bitácora. No se conoce desde el JSON una versión mínima probada.
- Una cuenta de **Baserow** con permisos para crear tres tablas y un token de base de datos con lectura de habitaciones, lectura y creación de reservas, y creación de incidentes. [API de Baserow](https://baserow.io/user-docs/database-api).
- Acceso a **Google Gemini API**, una clave propia en Google AI Studio y modelos compatibles elegidos en los dos nodos Gemini. [Credenciales Gemini en n8n](https://docs.n8n.io/integrations/builtin/credentials/googleai/).
- Dos credenciales n8n de **Header Auth** para proteger los webhooks, que pueden usar la misma cabecera/valor.
- Para probar mediante la consola: Windows PowerShell y `curl.exe` (habitualmente disponible en Windows reciente), o Postman.

No es necesario contratar un servidor público permanente. Se pueden probar los webhooks con las URL de prueba de n8n.

## Preparación de Baserow

Crea tablas nuevas de prueba con **estos nombres de columnas y tipos**. El JSON usa `user_field_names=true`, por lo que los nombres importan.

| Tabla | Columnas |
| --- | --- |
| **Habitaciones** | `Numero` (texto), `Tipo` (texto), `Activa` (booleano). |
| **Reservas** | `Cliente` (texto), `Email` (correo o texto), `Entrada` (fecha sin hora), `Salida` (fecha sin hora), `Noches` (entero), `Huespedes` (entero), `Habitacion` (texto), `Estado` (texto). |
| **Incidentes** | `Fecha` (fecha y hora), `Proyecto`, `Workflow`, `Ejecucion_ID`, `Ejecucion_URL`, `Nodo`, `Solicitud_Ref`, `Mensaje`, `Estado` (texto). |

En una base de pruebas, crea una habitación `Numero=101`, `Tipo=Doble`, `Activa=true` y deja inicialmente vacías las tablas `Reservas` e `Incidentes`. Los campos `Tipo`, `Habitacion` y `Estado` deben ser texto en la configuración propuesta: el código compara literalmente `Tipo` y usa `Confirmada` como estado de reserva activa.

**Actualizar los ID de tablas en seis nodos HTTP** (ver [tabla de identificadores en Baserow](https://baserow.io/user-docs/database-and-table-id)):

| Tabla | ID presente en la copia recibida | Nodos a modificar |
| --- | --- | --- |
| Habitaciones | `1227774` | `Consultar habitaciones`, `Chat - Consultar habitaciones` |
| Reservas | `1227779` | `Consultar reservas`, `Crear reserva`, `Chat - Consultar reservas` |
| Incidentes | `1284431` | `Guardar incidente en Baserow` |

Estos ID son **identificadores de recursos del export**, no credenciales. **Sustituirlos por los ID de las nuevas tablas** antes de ejecutar. Para Baserow en la nube, la URL es `https://api.baserow.io/api/database/rows/table/ID/`; en una instalación propia se debe modificar también el dominio.

## Importación y credenciales paso a paso

1. En n8n, crea un flujo vacío, ve a **⋯ → Import from File** e importa [workflows/Workflow_Final.json](workflows/Workflow_Final.json). Confirma que aparecen **44 nodos**, incluidos 4 comentarios visuales, y tres disparadores. [Importación de workflows](https://docs.n8n.io/workflows/export-import/).
2. Ajusta las URL de los nodos HTTP de acuerdo con la tabla anterior. Confirma que los nombres y tipos de campo en Baserow coinciden.
3. Crea una credencial **Header Auth de Baserow** con `Name: Authorization` y `Value: Token TU_TOKEN_BASEROW` (hay un espacio después de `Token`), y selecciónala en los **seis** nodos HTTP.
4. Crea una credencial **Header Auth para webhooks** con `Name: X-Hotel-Api-Key` y `Value: UN_SECRETO_PROPIO`, y selecciónala en `Webhook - Reserva` y `Webhook - Entrada Comentario`. No publiques el secreto.
5. Crea una credencial **Google Gemini API** y selecciónala en `Gemini - Clasificador` y `Gemini - Agente de hotel`. Escoge **en cada nodo** un modelo accesible desde tu cuenta; el export no fija uno concreto.
6. Guarda el flujo inicialmente **inactivo**. Revisa las advertencias de los nodos, ajusta cualquier cambio que requiera la versión de n8n y haz primero las pruebas con datos ficticios.
7. Comprueba el nodo **`consultar_disponibilidad`** (versión `toolCode` 1.3): el nombre real del nodo ya coincide con el solicitado por el agente. Debe leer `Chat - Contexto seguro` y devolver `ok:true` con disponibilidad real. Si el entorno de n8n no permite acceder al contexto o Baserow tiene datos inválidos, la herramienta devuelve `ok:false` y el agente **no debe inventar disponibilidad**. Este punto requiere prueba en la versión instalada.

## Pruebas reproducibles desde PowerShell

**Condición inicial:** tablas de pruebas vacías salvo por la habitación activa `101 / Doble`; credenciales asignadas; escucha de la URL de prueba iniciada en el webhook correspondiente. Los resultados siguientes son **esperados, no resultados verificados de una ejecución**.

### Caso R01: crear una reserva

Abre `Webhook - Reserva` y pulsa **Listen for test event**. Cambia la URL si la instancia no está en `localhost`.

```powershell
$reservaUrl = 'http://localhost:5678/webhook-test/reserva-hotel'
$hotelApiKey = 'SECRETO_DE_PRUEBA_PROPIO'
$reserva = @{
    nombre = 'Ana Prueba'
    email = 'ana@example.com'
    fecha_entrada = '2026-12-10'
    fecha_salida = '2026-12-12'
    tipo_habitacion = 'Doble'
    huespedes = 2
} | ConvertTo-Json -Compress

$reserva | curl.exe -i -X POST $reservaUrl `
    -H "X-Hotel-Api-Key: $hotelApiKey" `
    -H 'Content-Type: application/json' --data-binary '@-'
```

**Resultado esperado:** HTTP `200` con `ok: true`, `reserva_id` y `habitacion: "101"`. En la tabla **Reservas** debe aparecer una fila con `Estado=Confirmada`, `Noches=2`, fechas y correo ficticio. Comprueba el destino en Baserow, no solamente los nodos verdes.

### Otros casos de reservas

| ID | Acción | Resultado esperado y destino a comprobar |
| --- | --- | --- |
| R02 | Repite R01 con el mismo correo y fechas | `409`, `RESERVA_DUPLICADA`; **no** debe aparecer una segunda fila. |
| R03 | Repite las fechas con `otro@example.com` y solo la habitación 101 | `409`, `SIN_DISPONIBILIDAD`; no se crea reserva. |
| R04 | Envía `huespedes=0` o fecha de salida anterior | `400`, `DATOS_INCOMPLETOS` y errores; Baserow sin cambios. |
| R05 | Usa entrada igual a la salida de una reserva anterior | Puede asignarse esa habitación si no hay otro solapamiento. |
| R06 | Interrumpe lectura o escritura de Baserow usando recursos **de prueba** | `503`, `SERVICIO_NO_DISPONIBLE`; revisar `Incidentes` y las ejecuciones de n8n, pues el incidente también puede fallar. |
| R07 | Simula una respuesta HTTP 2xx a `Crear reserva` sin `id` (solo en entorno de prueba) | `503`, no `200`; verificar si existió escritura parcial y el intento de incidente. |

Para cada envío con **Test URL**, reactiva **Listen for test event**. No publiques las claves ni los datos reales en las capturas.

### Caso I01: clasificar un comentario

Abre `Webhook - Entrada Comentario` e inicia la escucha.

```powershell
$clasificarUrl = 'http://localhost:5678/webhook-test/clasificar-necesidad'
$comentario = @{ comentario = 'Necesito una cuna para mi habitacion.' } |
    ConvertTo-Json -Compress

$comentario | curl.exe -i -X POST $clasificarUrl `
    -H "X-Hotel-Api-Key: $hotelApiKey" `
    -H 'Content-Type: application/json' --data-binary '@-'
```

**Esperado:** `200`, `estado: PROCESADO_IA`, `resultado.categoria: peticion_especial`; revisar también `resumen` y `requiere_revision`. Un mensaje ambiguo o malicioso debe someterse a revisión (`REVISION_HUMANA`). Una falla del proveedor o una respuesta del modelo mal estructurada genera `503 / IA_NO_DISPONIBLE`. Un comentario vacío/no textual o de más de 2000 caracteres genera `400 / COMENTARIO_INVALIDO` **sin llamar a Gemini**.

### Caso C01: chat interno

En el editor de n8n, abre **Open chat** y escribe: `¿Hay una habitación Doble del 2026-12-10 al 2026-12-12?`. Con R01 previamente creada y una sola habitación, la consulta **debería** indicar que no hay disponibilidad. Después prueba `2026-12-12` a `2026-12-14`, que no se superpone.

**Corrección aplicada:** el nombre del Code Tool ahora es `consultar_disponibilidad`, la herramienta maneja contexto ausente con `ok:false` y el agente tiene prohibido afirmar cupo cuando falla la consulta. **C01 continúa pendiente de ejecución real**; comprueba la llamada, su resultado y la respuesta del chat. En versiones de n8n donde el Code Tool no admita la expresión de acceso a `Chat - Contexto seguro`, deberá ajustarse el diseño en esa instancia antes de entregar.

## Producción, seguimiento y detención

Cuando funcionen las pruebas, activa o publica el workflow según la interfaz de tu versión de n8n y usa las **Production URL** con su cabecera. Los dos webhooks aceptan `POST`. Consulta la vista **Executions** para verificar el procesamiento y los errores. No se incluyó ninguna ejecución programada; para detener peticiones de producción, **desactiva/despublica el flujo** o cambia las credenciales del webhook. [Webhooks de n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).

## Limitaciones, seguridad y estado final

- El control de duplicados compara correo, fechas y habitación; **no** hay clave de idempotencia ni reserva atómica ante dos solicitudes simultáneas. **No habilitar reservas concurrentes o un piloto real** sin garantizar una restricción transaccional en el sistema de reservas.
- Se vuelve a validar localmente `Tipo` y `Activa` en la respuesta de Baserow antes de elegir habitación; se rechazan registros confirmados con fechas mal formadas. No se valida la capacidad máxima de la habitación ni se impiden fechas pasadas válidas.
- Gemini puede devolver interpretaciones incorrectas; la clasificación tiene parser estructurado, pero no una revisión humana automática ni una cola de trabajo.
- El chat es de **solo lectura** y usa la herramienta corregida `consultar_disponibilidad`; falta certificar su acceso al contexto en la instalación real. La clasificación y la reserva funcionan por rutas separadas y no dependen del chat.
- Después de crear una reserva, `Validar creación en Baserow` exige un `id` válido y comprueba habitación/estado cuando estén presentes. Ante respuesta incompleta devuelve 503 y registra intento de incidente; **una respuesta perdida puede corresponder a una escritura ya completada**. Antes de reintentar, revisar Baserow.
- Los comentarios vacíos o excesivamente largos producen `400`; la salida estructurada inválida de Gemini produce `503`, no una clasificación ficticia válida.
- La revisión estática y la batería local de código JavaScript no demuestran el consumo efectivo de Gemini ni la creación de registros reales. Faltan pruebas con credenciales propias y capturas vinculadas a la bitácora.
- Antes de subir archivos, revisar JSON, capturas, URLs, campos fijados, historial Git y exportaciones de credenciales para no exponer secretos ni información personal.

La [bitácora](pruebas/Bitacora_Clase_11_Pruebas.md) conserva pruebas anteriores y enumera casos para ejecutar sobre este JSON. **Los resultados observados finales**, responsables, versión real de n8n, evidencias y cierre de pendientes siguen sin completarse y deben ser registrados por los integrantes. Ver [documentación del funcionamiento](documentacion/Documentacion_Proyecto_Final.md) y [diagramas](documentacion/diagramas/Proceso_Automatizado.png).


## Información de trazabilidad para el corte final

- **Repositorio público:** https://github.com/Luisfervm700/n8n-final-Ricardo_Velasquez_Garcia_Valencia-HotelExpress
- **Integrantes:** Ana Sofía Ricardo Aguilar; Juan Martín García Plazas; Luis Fernando Velásquez Monsalve; Mariana Valencia Henao.
- **Aportes individuales:** no constan con detalle verificable en los documentos recibidos; cada integrante debe indicar su contribución real antes de la entrega.
- **n8n y modelo Gemini concretos:** no se deducen del JSON exportado; anotar los utilizados durante la ejecución real.
- **Nuevas comprobaciones reproducibles:** `python pruebas/validar_workflow_estatico.py` y `node pruebas/probar_logica_local.js` (requieren Python 3 y Node.js). Estas pruebas no sustituyen los casos finales en n8n.
- **Limitación operativa prioritaria:** si falla un POST o se pierde su respuesta, comprobar Baserow antes de reintentar. El diseño no garantiza exclusión mutua entre dos ejecuciones simultáneas.

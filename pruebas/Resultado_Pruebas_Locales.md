# Pruebas locales aisladas de JavaScript — Hotel Express

Fecha: 2026-11-23. Comando: `node pruebas/probar_logica_local.js`.

Estas comprobaciones ejecutan el código extraído del JSON mediante objetos ficticios y mocks de n8n. **No llaman a Baserow, Gemini ni a una instancia n8n.** Un resultado aprobado no equivale a una reserva persistida ni a un chat funcional.

```text
OK V01 acepta entrada valida
OK V02 normaliza correo
OK V03 calcula dos noches
OK V04 rechaza nombre vacío
OK V05 rechaza correo inválido
OK V06 rechaza fecha imposible
OK V07 rechaza fechas invertidas
OK V08 rechaza huéspedes no enteros
OK D01 obtiene habitación libre
OK D02 excluye habitación ocupada
OK D03 detecta duplicado
OK D04 niega si solo ocupada
OK D05 fecha contigua permitida
OK D06 descarta tipo distinto aunque GET lo devuelva
OK D07 descarta inactivas aunque GET las devuelva
OK D08 error ante números duplicados
OK D09 error ante reserva confirmada corrupta
OK D10 elige primer número natural
OK T01 invalida query JSON incorrecto
OK T02 invalida fechas invertidas
OK T03 disponibilidad con contexto limpio
OK T04 protege contra contexto inaccesible
OK I01 invalida comentario vacío
OK I02 impide confirmar escritura sin ID
RESULTADO 24 APROBADAS / 0 FALLIDAS; verificación aislada SIN n8n, API ni red
```

**Pendiente:** completar todos los casos de aceptación final de la bitácora con fecha, responsable, versión de n8n, entrada exacta, resultado observado, estado de Baserow y capturas.

#!/usr/bin/env python3
"""Validación estática reproducible del workflow. NO ejecuta n8n, Baserow ni Gemini."""
import json,sys,re,hashlib,subprocess,tempfile,pathlib
p=pathlib.Path(__file__).resolve().parents[1]/'workflows'/'Workflow_Final.json'
w=json.loads(p.read_text(encoding='utf-8'))
nodes=w.get('nodes',[]); by={n.get('name'):n for n in nodes}; errs=[]
if len(nodes)!=44:errs.append('Cantidad de nodos distinta de 44')
if len(by)!=len(nodes):errs.append('Nombres de nodos repetidos')
if len({n['id'] for n in nodes})!=len(nodes):errs.append('IDs de nodos repetidos')
for source,ports in w.get('connections',{}).items():
 if source not in by: errs.append('Origen de conexión inexistente: '+source)
 for conns in ports.values():
  for group in conns:
   for c in group:
    if c['node'] not in by:errs.append('Destino inexistente: '+c['node'])
if any(n.get('type')=='n8n-nodes-base.executeWorkflow' for n in nodes):errs.append('Dependencia a subworkflow externo')
for name in ('Webhook - Reserva','Webhook - Entrada Comentario','When chat message received','consultar_disponibilidad','Validar creación en Baserow','Validar comentario','Responder 400 - comentario'):
 if name not in by:errs.append('Falta nodo esencial: '+name)
if any(n.get('credentials') for n in nodes):errs.append('Hay asociaciones de credenciales en el export; revisar antes de publicar')
if 'Authorization: Token ' in p.read_text(encoding='utf-8'):errs.append('Posible token literal: revisar')
# Comprueba solo sintaxis, no comportamiento.
jsnodes=[n for n in nodes if isinstance(n.get('parameters',{}).get('jsCode'),str)]
if subprocess.run(['node','--version'],capture_output=True).returncode!=0:
 print('ADVERTENCIA: Node.js no está disponible; se omite comprobación de sintaxis JS')
else:
 for n in jsnodes:
  with tempfile.NamedTemporaryFile(mode='w',suffix='.js',delete=False,encoding='utf-8') as tf:
   tf.write(n['parameters']['jsCode']);tmp=tf.name
  try:
   r=subprocess.run(['node','--check',tmp],capture_output=True,text=True)
   if r.returncode:errs.append('Sintaxis JS inválida: '+n['name']+': '+r.stderr[:120])
  finally:pathlib.Path(tmp).unlink(missing_ok=True)
print('Archivo:',p)
print('SHA256:',hashlib.sha256(p.read_bytes()).hexdigest())
print('Nodos:',len(nodes),'JS:',len(jsnodes),'Conexiones:',sum(len(g) for v in w.get('connections',{}).values() for gg in v.values() for g in gg))
if errs:
 for e in errs:print('FALLO:',e)
 sys.exit(1)
print('APROBADO: estructura y sintaxis verificables. NO constituye prueba de ejecución en n8n.')

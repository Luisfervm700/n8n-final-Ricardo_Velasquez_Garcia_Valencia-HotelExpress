#!/usr/bin/env python3
"""Validación ESTÁTICA reproducible; no ejecuta ni certifica n8n, Baserow o Gemini."""
from pathlib import Path
import json, sys, re, subprocess, tempfile, hashlib
p=Path(__file__).resolve().parents[1]/'workflows'/'Workflow_Final.json'
raw=p.read_text(encoding='utf8');w=json.loads(raw);ns=w.get('nodes',[])
by={n.get('name'):n for n in ns};errs=[]
if len(ns)!=44:errs.append('Número inesperado de nodos (44 esperado)')
if len(by)!=len(ns) or len({n.get('id') for n in ns})!=len(ns):errs.append('Nombres o IDs duplicados')
for n in ns:
 if not n.get('type') or not n.get('typeVersion'):errs.append('Nodo sin tipo/version: '+str(n.get('name')))
 if n.get('credentials'):errs.append('Credencial asociada en export: '+n['name'])
 if n.get('type')=='n8n-nodes-base.executeWorkflow':errs.append('Dependencia Execute Workflow externa')
for src,ports in w.get('connections',{}).items():
 if src not in by:errs.append('Origen faltante: '+src)
 for grupos in ports.values():
  for conexiones in grupos:
   for c in conexiones:
    if c.get('node') not in by:errs.append('Destino faltante: '+str(c.get('node')))
for name in ('Webhook - Reserva','Webhook - Entrada Comentario','When chat message received','consultar_disponibilidad','Validar creación en Baserow','Validar comentario','Responder 400 - comentario'):
 if name not in by:errs.append('Nodo requerido ausente: '+name)
if by.get('consultar_disponibilidad',{}).get('type')!='@n8n/n8n-nodes-langchain.toolCode':errs.append('No hay herramienta Code Tool')
if re.search(r'(?i)(?:authorization\s*[:=]\s*token\s+[a-z0-9]{12,}|sk-[a-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})',raw):errs.append('POSIBLE SECRETO en JSON: inspeccionar')
if subprocess.run(['node','--version'],capture_output=True).returncode:
 errs.append('Node.js no disponible: no se puede aprobar la sintaxis JavaScript')
else:
 for n in ns:
  code=n.get('parameters',{}).get('jsCode')
  if not isinstance(code,str):continue
  f=tempfile.NamedTemporaryFile(suffix='.js',mode='w',encoding='utf8',delete=False)
  try:
   f.write('(async()=>{\n'+code+'\n})()');f.close()
   check=subprocess.run(['node','--check',f.name],capture_output=True,text=True)
   if check.returncode:errs.append('Error JS '+n['name']+': '+check.stderr[:120])
  finally:Path(f.name).unlink(missing_ok=True)
print('Archivo: workflows/Workflow_Final.json')
print('SHA256: '+hashlib.sha256(p.read_bytes()).hexdigest())
print('Nodos: '+str(len(ns))+'; scripts JS: '+str(sum(isinstance(n.get('parameters',{}).get('jsCode'),str) for n in ns)))
if errs:
 for e in errs:print('NO CUMPLE: '+e)
 sys.exit(1)
print('APROBADO (solo estructura y sintaxis). NO equivale a ejecución integral.')


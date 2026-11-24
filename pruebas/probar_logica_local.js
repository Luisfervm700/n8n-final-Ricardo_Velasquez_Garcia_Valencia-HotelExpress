#!/usr/bin/env node
// Ejecuta fragmentos Code/Tool con entradas FICTICIAS; no hace peticiones a n8n, Gemini ni Baserow.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const workflow=JSON.parse(fs.readFileSync(path.join(__dirname,'../workflows/Workflow_Final.json'),'utf8'));
const get=name=>workflow.nodes.find(n=>n.name===name).parameters.jsCode;
let passed=0,failed=0;
async function run(name,context={}){
 const c={Date,JSON,Number,String,Array,Object,RegExp,Set,Error,Math,console,...context};
 const result=vm.runInNewContext('(async()=>{\n'+get(name)+'\n})()',c,{timeout:2500});
 return JSON.parse(JSON.stringify(await result));
}
async function test(label,fn){try{await fn();passed++;console.log('OK',label)}catch(e){failed++;console.error('FALLA',label,e.message)}}
const valid=(x)=>run('Validar y normalizar',{$json:x});
const input={nombre:' Ana Prueba ',email:' ANA@EXAMPLE.COM ',fecha_entrada:'2026-12-10',fecha_salida:'2026-12-12',tipo_habitacion:'Doble',huespedes:2};
function available(rooms=[],bookings=[],changes={}){
 const s={Cliente:'Ana Prueba',Email:'ana@example.com',Entrada:'2026-12-10',Salida:'2026-12-12',Tipo:'Doble',...changes};
 const dataset={'Validar y normalizar':[{json:s}], 'Consultar habitaciones':[{json:{results:rooms,next:null}}], 'Consultar reservas':[{json:{results:bookings,next:null}}]};
 return run('Determinar disponibilidad',{$:(name)=>({first:()=>dataset[name][0],all:()=>dataset[name]})});
}
const room=(Numero,Tipo='Doble',Activa=true)=>({Numero,Tipo,Activa});
const booking=(Habitacion,Entrada='2026-12-10',Salida='2026-12-12',Email='otro@example.com',Estado='Confirmada')=>({id:39,Habitacion,Entrada,Salida,Email,Estado});
const makeTool=(query,rooms=[],bookings=[])=>run('consultar_disponibilidad',{query,$:()=>({first:()=>({json:{habitaciones:rooms,reservas:bookings}})})});
(async()=>{
 await test('V01 acepta entrada valida',async()=>assert.strictEqual((await valid(input)).json.valido,true));
 await test('V02 normaliza correo',async()=>assert.strictEqual((await valid(input)).json.Email,'ana@example.com'));
 await test('V03 calcula dos noches',async()=>assert.strictEqual((await valid(input)).json.Noches,2));
 await test('V04 rechaza nombre vacío',async()=>assert.strictEqual((await valid({...input,nombre:' '})).json.valido,false));
 await test('V05 rechaza correo inválido',async()=>assert.strictEqual((await valid({...input,email:'x'})).json.valido,false));
 await test('V06 rechaza fecha imposible',async()=>assert.strictEqual((await valid({...input,fecha_entrada:'2026-02-30'})).json.valido,false));
 await test('V07 rechaza fechas invertidas',async()=>assert.strictEqual((await valid({...input,fecha_salida:'2026-12-09'})).json.valido,false));
 await test('V08 rechaza huéspedes no enteros',async()=>assert.strictEqual((await valid({...input,huespedes:1.5})).json.valido,false));
 await test('D01 obtiene habitación libre',async()=>assert.strictEqual((await available([room('101')]))[0].json.habitacion,'101'));
 await test('D02 excluye habitación ocupada',async()=>assert.strictEqual((await available([room('101'),room('201')],[booking('101')]))[0].json.habitacion,'201'));
 await test('D03 detecta duplicado',async()=>assert.strictEqual((await available([room('101')],[booking('101','2026-12-10','2026-12-12','ana@example.com')]))[0].json.motivo,'RESERVA_DUPLICADA'));
 await test('D04 niega si solo ocupada',async()=>assert.strictEqual((await available([room('101')],[booking('101')]))[0].json.disponible,false));
 await test('D05 fecha contigua permitida',async()=>assert.strictEqual((await available([room('101')],[booking('101','2026-12-08','2026-12-10')]))[0].json.disponible,true));
 await test('D06 descarta tipo distinto aunque GET lo devuelva',async()=>assert.strictEqual((await available([room('101','Sencilla')]))[0].json.disponible,false));
 await test('D07 descarta inactivas aunque GET las devuelva',async()=>assert.strictEqual((await available([room('101','Doble',false)]))[0].json.disponible,false));
 await test('D08 error ante números duplicados',async()=>assert.ok((await available([room('101'),room('101')]))[0].json.error_tecnico));
 await test('D09 error ante reserva confirmada corrupta',async()=>assert.ok((await available([room('101')],[booking('101','2026-02-31')]))[0].json.error_tecnico));
 await test('D10 elige primer número natural',async()=>assert.strictEqual((await available([room('10'),room('2')]))[0].json.habitacion,'2'));
 await test('T01 invalida query JSON incorrecto',async()=>assert.strictEqual(JSON.parse(await makeTool('no json')).ok,false));
 await test('T02 invalida fechas invertidas',async()=>assert.strictEqual(JSON.parse(await makeTool(JSON.stringify({tipo:'Doble',fecha_entrada:'2026-12-12',fecha_salida:'2026-12-10'}))).ok,false));
 await test('T03 disponibilidad con contexto limpio',async()=>assert.strictEqual(JSON.parse(await makeTool(JSON.stringify({tipo:'Doble',fecha_entrada:'2026-12-10',fecha_salida:'2026-12-12'}),[room('101')])).disponible,true));
 await test('T04 protege contra contexto inaccesible',async()=>assert.strictEqual(JSON.parse(await run('consultar_disponibilidad',{query:JSON.stringify({tipo:'Doble',fecha_entrada:'2026-12-10',fecha_salida:'2026-12-12'}),$:()=>{throw Error('no context')}})).ok,false));
 await test('I01 invalida comentario vacío',async()=>assert.strictEqual((await run('Validar comentario',{$input:{first:()=>({json:{body:{comentario:'  '}}})}}))[0].json.valido,false));
 await test('I02 impide confirmar escritura sin ID',async()=>{try{await run('Validar creación en Baserow',{$input:{first:()=>({json:{Estado:'Confirmada'}})},$:()=>({first:()=>({json:{habitacion:'101'}})})});assert.fail('should throw')}catch(e){assert.ok(/ESCRITURA_SIN_ID/.test(e.message))}});
 console.log(`RESULTADO ${passed} APROBADAS / ${failed} FALLIDAS; verificación aislada SIN n8n, API ni red`);
 process.exit(failed?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

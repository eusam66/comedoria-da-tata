// Exercita a rota real com fronteiras Auth/DB controladas; não acessa rede.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {NextResponse}=require('next/server');
function compile(file,dependencies={}){
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,Date,require:name=>{assert.ok(name in dependencies,'Dependência não isolada: '+name);return dependencies[name];}});
 return exports;
}
const hours=compile('src/lib/storeHours.ts');
function setup({authError,readError,writeError}={}){
 let value={mode:'open',expiresAt:'2026-08-15T18:00:00Z',updated_at:'2026-08-15T12:00:00Z',custom:{preserve:true}};
 const writes=[];let reads=0;
 const query={select:()=>query,eq:()=>query,maybeSingle:async()=>{reads++;return {data:{value},error:readError};},
 upsert:async row=>{writes.push(JSON.parse(JSON.stringify(row)));if(!writeError)value=row.value;return {error:writeError};}};
 const {PUT}=compile('src/app/api/admin/order-operations/route.ts',{
  'next/server':{NextResponse},
  '@/lib/adminAuthSafe':{requireAdmin:async()=>{if(authError)throw new Error(authError);}},
  '@/lib/supabaseAdmin':{default:{from:table=>{assert.equal(table,'restaurant_settings');return query;}}},
  '@/lib/storeSettings':{getCurrentStoreStatus:async()=>hours.calculateStoreStatus({orderOverride:value},new Date('2026-08-17T18:00:00Z'))},
 });
 return {PUT,writes,reads:()=>reads,value:()=>value};
}
const request=body=>new Request('http://localhost/api/admin/order-operations',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('manual open accepts no time after 15h and persists null while preserving metadata',async()=>{
 const db=setup();const response=await db.PUT(request({mode:'open'}));
 assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);
 const result=await response.json();assert.equal(result.isOpen,true);assert.equal(result.expiresAt,null);
 assert.deepEqual(db.writes,[{key:'order_operations',value:{mode:'open',expiresAt:null,updated_at:'2026-08-15T12:00:00Z',custom:{preserve:true}}}]);
});
test('old clients cannot accidentally reintroduce an expiration via until or expiresAt',async()=>{
 const db=setup();assert.equal((await db.PUT(request({mode:'open',until:'15:00',expiresAt:'2099-01-01T00:00:00Z'}))).status,200);
 assert.equal(db.value().expiresAt,null);
});
test('closing and returning to standard mode clear old expiration and retain other fields',async()=>{
 for(const mode of ['closed','automatic']){
  const db=setup();assert.equal((await db.PUT(request({mode}))).status,200);
  assert.equal(db.value().mode,mode);assert.equal(db.value().expiresAt,null);assert.equal(db.value().custom.preserve,true);
 }
});
test('authentication and authorization failures never read or write the setting',async()=>{
 for(const [authError,status] of [['Unauthorized',401],['Forbidden',403]]){
  const db=setup({authError});assert.equal((await db.PUT(request({mode:'open'}))).status,status);
  assert.equal(db.reads(),0);assert.equal(db.writes.length,0);
 }
});
test('invalid mode never changes persisted operation',async()=>{
 const db=setup();assert.equal((await db.PUT(request({mode:'other'}))).status,400);assert.equal(db.writes.length,0);
});
test('failed read does not overwrite an existing configuration',async()=>{
 const db=setup({readError:new Error('read failed')});assert.equal((await db.PUT(request({mode:'open'}))).status,500);assert.equal(db.writes.length,0);
});
test('failed persistence is reported as failure without claiming the store opened',async()=>{
 const db=setup({writeError:new Error('write failed')});const response=await db.PUT(request({mode:'open'}));
 assert.equal(response.status,500);assert.equal((await response.json()).error,'Não foi possível atualizar o funcionamento.');
 assert.equal(db.value().expiresAt,'2026-08-15T18:00:00Z');
});

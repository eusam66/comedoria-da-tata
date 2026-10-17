// Integração local com Supabase de homologação; não registra pedidos nem altera estoque.
// NODE_PATH deve incluir o Playwright disponibilizado no Cloud. Secrets somente no ambiente.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const REF='nkywpsftihxcuvdxeexn',TARGET=`https://${REF}.supabase.co`,BASE='http://127.0.0.1:3003';
const result={project:REF,status:'pending',checks:[],validOrderPosts:0};
const check=name=>{result.checks.push(name);console.log('PASS: '+name);};
async function remote(path,init={}){
 assert.ok(path.startsWith('/')&&!path.startsWith('//'));
 const response=await fetch(TARGET+path,{...init,redirect:'error',signal:AbortSignal.timeout(25000),headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'}});
 assert.ok(response.ok,'Falha na API de homologação: '+response.status);
 return response.status===204?null:response.json();
}
async function main(){
 assert.equal(process.env.NEXT_PUBLIC_APP_ENV,'homologacao');
 for(const name of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL'])assert.equal(process.env[name]?.replace(/\/$/,''),TARGET);
 const claims=JSON.parse(Buffer.from(process.env.SUPABASE_SERVICE_ROLE_KEY.split('.')[1],'base64url').toString());
 assert.equal(claims.ref,REF);assert.equal(claims.role,'service_role');assert.ok(process.env.HOMOLOGACAO_ADMIN_PASSWORD);
 const marker=await remote('/rest/v1/restaurant_settings?key=eq.environment&select=value');assert.equal(marker[0].value.project_ref,REF);
 const initial=await remote('/rest/v1/restaurant_settings?key=in.(storefront,order_operations)&select=key,value');
 const previous=Object.fromEntries(initial.map(row=>[row.key,row.value]));assert.ok(previous.storefront&&previous.order_operations);
 const inventory=await remote('/rest/v1/dishes?select=id,stock&order=id');
 const drinks=await remote('/rest/v1/beverages?select=id,stock&order=id');
 const orders=await remote('/rest/v1/orders?select=id&order=id');
 const history=await remote('/rest/v1/order_history?select=id&order=id');
 const auditTime=previous.order_operations.updated_at??'2026-10-17T12:00:00Z';
 let changed=false,browser;
 const child=spawn(process.execPath,['--use-env-proxy','--use-system-ca','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3003'],{env:process.env,stdio:['ignore','pipe','pipe']});
 async function context(viewport={width:1440,height:1000}){
  const c=await browser.newContext({viewport,serviceWorkers:'allow'});
  await c.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==BASE)return route.abort();
   if(url.pathname==='/api/orders'&&request.method()==='POST'&&request.postData()!=='{}'){
    result.validOrderPosts++;return route.abort();
   }
   return route.continue();
  });
  return c;
 }
 async function call(page,path,method='GET',body){
  return page.evaluate(async({path,method,body})=>{
   const response=await fetch(path,{method,cache:'no-store',headers:{'Content-Type':'application/json',...(path==='/api/orders'?{'Idempotency-Key':crypto.randomUUID()}: {})},body:body===undefined?undefined:JSON.stringify(body)});
   return {status:response.status,json:await response.json(),cache:response.headers.get('Cache-Control')};
  },{path,method,body});
 }
 async function login(page){
  await page.goto(BASE+'/admin/login');
  await page.getByLabel('Email do administrador').fill('admin-homologacao@example.invalid');
  await page.getByLabel('Senha do administrador').fill(process.env.HOMOLOGACAO_ADMIN_PASSWORD);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.waitForURL(BASE+'/admin');
  await page.getByText('HORÁRIO PADRÃO',{exact:true}).waitFor();
 }
 async function action(page,name){
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/order-operations'&&r.request().method()==='PUT');
  await page.getByRole('button',{name,exact:true}).click();
  const r=await response;assert.equal(r.status(),200);return r.json();
 }
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Servidor de teste não iniciou')),15000);
   child.once('exit',()=>{clearTimeout(timer);reject(new Error('Servidor encerrou; porta ocupada ou build ausente'));});
   child.once('error',()=>{clearTimeout(timer);reject(new Error('Servidor indisponível'));});
   child.stdout.on('data',chunk=>{if(chunk.toString().includes('Ready in')){clearTimeout(timer);resolve();}});
   child.stderr.on('data',()=>{});
  });
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const adminContext=await context();const admin=await adminContext.newPage();
  await admin.goto(BASE+'/admin/login');
  const denied=await call(admin,'/api/admin/order-operations','PUT',{mode:'open'});assert.equal(denied.status,401);
  assert.deepEqual((await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value'))[0].value,previous.order_operations);
  check('sem sessão: 401 sem alteração de configuração');
  const closedWeek=Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day=>[day,{enabled:false,open:'11:00',close:'15:00'}]));
  changed=true;
  await remote('/rest/v1/restaurant_settings?key=eq.storefront',{method:'PATCH',body:JSON.stringify({value:{...previous.storefront,openingHours:closedWeek}})});
  await remote('/rest/v1/restaurant_settings?key=eq.order_operations',{method:'PATCH',body:JSON.stringify({value:{...previous.order_operations,mode:'automatic',expiresAt:null,updated_at:auditTime,test_marker:'HOMOLOGACAO-'+randomUUID()}})});
  await login(admin);
  assert.equal(await admin.locator('input[type=time]').count(),0);
  const opened=await action(admin,'Abrir pedidos agora');assert.equal(opened.mode,'open');assert.equal(opened.expiresAt,null);assert.equal(opened.isOpen,true);
  await admin.getByText('ABERTO MANUALMENTE',{exact:true}).waitFor();
  await admin.getByText('Abertura manual sem expiração. Continuará ativa até nova ação.',{exact:true}).waitFor();
  const persisted=(await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value'))[0].value;
  assert.equal(persisted.mode,'open');assert.equal(persisted.expiresAt,null);assert.equal(persisted.updated_at,auditTime);assert.ok(persisted.test_marker);
  const blockedNew=await call(admin,'/api/orders','POST',{});assert.equal(blockedNew.status,400);assert.equal(blockedNew.json.code,'DELIVERY_ZONE_REQUIRED');
  await admin.reload();await admin.getByText('ABERTO MANUALMENTE',{exact:true}).waitFor();
  check('abertura real sem horário, em grade fechada: persistência, metadados e updated_at preservados; reload mantém estado; API supera bloqueio de horário');
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
   await admin.setViewportSize(viewport);await admin.screenshot({path:`artifacts/manual-opening-admin-${viewport.width}.png`,fullPage:true});
  }
  const publicContext=await context({width:390,height:844});const shop=await publicContext.newPage();
  await shop.goto(BASE);await shop.locator('.header-status').getByText('ABERTO MANUALMENTE',{exact:true}).waitFor();
  const catalog=await call(shop,'/api/menu');const dish=catalog.json.find(x=>x.name.startsWith('HOMOLOGAÇÃO Prato')&&x.stock>0);assert.ok(dish);
  const card=shop.locator('article').filter({hasText:dish.name});await card.locator('.add-button').click();await shop.locator('.header-cart').click();
  await shop.getByRole('button',{name:'Continuar para entrega',exact:true}).click();
  await shop.getByRole('radio',{name:'Retirada',exact:true}).check();
  assert.equal(await shop.getByRole('button',{name:'Registrar pedido',exact:true}).isEnabled(),true);
  await shop.screenshot({path:'artifacts/manual-opening-checkout-open-390.png'});
  await action(admin,'Fechar agora');await admin.getByText('FECHADO MANUALMENTE',{exact:true}).waitFor();
  await shop.getByRole('button',{name:'Pedidos encerrados',exact:true}).waitFor({timeout:15000});
  assert.equal(await shop.getByRole('button',{name:'Pedidos encerrados',exact:true}).isDisabled(),true);
  const closedApi=await call(admin,'/api/orders','POST',{});assert.equal(closedApi.status,409);assert.equal(closedApi.json.store.mode,'closed');
  await admin.reload();await admin.getByText('FECHADO MANUALMENTE',{exact:true}).waitFor();
  check('fechamento persistente atualiza checkout aberto por polling, impede pedidos e permanece após reload');

  for(const status of [401,500]){
   const before=(await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value'))[0].value;
   const handler=route=>route.request().method()==='PUT'?route.fulfill({status,contentType:'application/json',body:JSON.stringify({error:status===401?'Sua sessão expirou. Entre novamente.':'Não foi possível atualizar o funcionamento.'})}):route.continue();
   await admin.route('**/api/admin/order-operations',handler);
   await admin.getByRole('button',{name:'Abrir pedidos agora',exact:true}).click();
   await admin.getByText(status===401?'Sua sessão expirou. Entre novamente.':'Não foi possível atualizar o funcionamento.',{exact:true}).waitFor();
   await admin.unroute('**/api/admin/order-operations',handler);
   assert.deepEqual((await remote('/rest/v1/restaurant_settings?key=eq.order_operations&select=value'))[0].value,before);
   await admin.getByText('FECHADO MANUALMENTE',{exact:true}).waitFor();
  }
  check('falhas 401/500 simuladas na interface não exibem falso sucesso nem abrem a loja');
  const standard=await action(admin,'Horário padrão');assert.equal(standard.mode,'automatic');assert.equal(standard.expiresAt,null);assert.equal(standard.isOpen,false);
  await admin.getByText('HORÁRIO PADRÃO',{exact:true}).waitFor();
  await admin.reload();await admin.getByText('HORÁRIO PADRÃO',{exact:true}).waitFor();
  await action(admin,'Abrir pedidos agora');await admin.getByText('ABERTO MANUALMENTE',{exact:true}).waitFor();
  await publicContext.close();await adminContext.close();await browser.close();
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const fresh=await context();const freshPage=await fresh.newPage();await freshPage.goto(BASE);
  await freshPage.locator('.header-status').getByText('ABERTO MANUALMENTE',{exact:true}).waitFor();
  const freshStatus=await call(freshPage,'/api/store-status');assert.equal(freshStatus.json.isOpen,true);assert.equal(freshStatus.json.expiresAt,null);assert.match(freshStatus.cache,/no-store/);
  await freshPage.goto(BASE+'/dishes/'+dish.slug);await freshPage.getByText('ABERTO MANUALMENTE',{exact:true}).waitFor();
  check('horário padrão retoma grade cadastrada; nova abertura permanece em outro processo Chromium sem armazenamento anterior, inclusive página de prato');
  await freshPage.goto(BASE);
  await freshPage.evaluate(()=>navigator.serviceWorker.ready);
  await fresh.setOffline(true);
  const unavailable=await freshPage.evaluate(()=>fetch('/api/store-status').then(()=>false,()=>true));assert.equal(unavailable,true);
  check('PWA não devolve status aberto de cache quando a API fica offline');
  await fresh.close();
  assert.equal(result.validOrderPosts,0);
  result.status='passed';
 }finally{
  if(browser)await browser.close();child.kill('SIGTERM');
  if(changed){
   for(const key of ['storefront','order_operations'])await remote('/rest/v1/restaurant_settings?key=eq.'+key,{method:'PATCH',body:JSON.stringify({value:previous[key]})});
   const restored=await remote('/rest/v1/restaurant_settings?key=in.(storefront,order_operations)&select=key,value');
   assert.deepEqual(Object.fromEntries(restored.map(x=>[x.key,x.value])),previous);
  }
  assert.deepEqual(await remote('/rest/v1/dishes?select=id,stock&order=id'),inventory);
  assert.deepEqual(await remote('/rest/v1/beverages?select=id,stock&order=id'),drinks);
  assert.deepEqual(await remote('/rest/v1/orders?select=id&order=id'),orders);
  assert.deepEqual(await remote('/rest/v1/order_history?select=id&order=id'),history);
  result.cleanup='settings restored; inventory, orders and history unchanged';
 }
}
main().catch(error=>{
 result.status='failed';let message=String(error?.message||'Erro desconhecido');
 for(const key of ['SUPABASE_SERVICE_ROLE_KEY','HOMOLOGACAO_ADMIN_PASSWORD','NEXT_PUBLIC_SUPABASE_ANON_KEY'])if(process.env[key])message=message.split(process.env[key]).join('[REDACTED]');
 result.failure=message;process.exitCode=1;
}).finally(()=>{fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/manual-opening-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));});

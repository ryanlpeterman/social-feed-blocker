const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,ctx){const source=fs.readFileSync(path.join(__dirname,'../src',file),'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);return ctx.exports;}
test('snooze has one expiry callback across settings changes and clears on enable',()=>{
 const timers=new Map();let next=0,subscriber,status={type:'disabled-temporarily',until:Date.now()+120000};
 const ctx={exports:{},require:n=>n.includes('is-enabled')?{enabledStatus:()=>status,siteEnabledStatus:()=>status,matchesBlockablePath:()=>true,matchesConfiguredSite:()=>true}:{POLL_INTERVAL_MS:500},document:{querySelector:()=>({dataset:{}}),location:{pathname:'/'}},window:{addEventListener(){},scrollTo(){}},setTimeout:(fn,ms)=>{timers.set(++next,ms);return next;},clearTimeout:id=>timers.delete(id),Date};
 load('lib/route-change.ts',ctx).setupRouteChange({getState:()=>({settings:{}}),subscribe:fn=>subscriber=fn});
 for(let i=0;i<100;i++)subscriber();
 assert.equal([...timers.values()].filter(ms=>ms===60000).length,1);
 status={type:'enabled'};subscriber();
 assert.equal([...timers.values()].filter(ms=>ms===60000).length,0);
});
test('close uses the requesting tab even when another window becomes active',async()=>{
 let activation,connection,onMessage;const closed=[],focused=[];
 const browser={tabs:{onActivated:{addListener:fn=>activation=fn},query:async()=>[{id:22,windowId:1}],update:async id=>focused.push(id),remove:async id=>closed.push(id)},runtime:{onConnect:{addListener:fn=>connection=fn}}};
 const ctx={exports:{},require:n=>n.includes('redux-effects')?{Effect:{all:(...effects)=>effects}}:n.includes('webextension')?{getBrowser:()=>browser}:n.includes('messaging')?{MessageType:{CLOSE_ACTIVE_TAB:'close'}}:n.endsWith('sites/effects')?{}:{},Map};
 const effects=load('background/store/effects.ts',ctx).rootEffect;
 effects[0]({getState:()=>({ready:false})});
 activation({tabId:10,windowId:1});activation({tabId:11,windowId:1});activation({tabId:99,windowId:2});
 connection({sender:{tab:{id:11,windowId:1}},onDisconnect:{addListener(){}},onMessage:{addListener:fn=>onMessage=fn}});
 onMessage({t:'close'});await new Promise(r=>setImmediate(r));
 assert.deepEqual(closed,[11]);assert.deepEqual(focused,[]);
});

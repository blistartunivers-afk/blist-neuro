import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8').replace("import { Brain } from './brain.js';",'');
function harness() {
 const messages=[],timers=new Map();let id=0,instance;
 class Brain {
  constructor(){instance=this;this.t=0;this.N=1;this.N_exc=1;this.calls=[];}
  step(opts={}){this.calls.push(opts.stimOverride?.durationRemaining); if(opts.stimOverride)opts.stimOverride.durationRemaining--;return {t:++this.t,rate:1,spikes:new Uint16Array([0])};}
  injectStimulus(exc,inh,durationRemaining){return {exc,inh,durationRemaining};}
  getState(){return {S:[1],v:[2]};}
  getRateHistory(){return [];}
  _resetState(){this.t=0;}
 }
 const context=vm.createContext({Brain,Uint16Array,console,performance:{now:()=>100},self:{postMessage:(msg,transfer=[])=>{messages.push(structuredClone(msg,{transfer}));}},setTimeout:(fn)=>{timers.set(++id,fn);return id;},clearTimeout:(id)=>timers.delete(id)});
 vm.runInContext(source,context);
 return {messages,timers,send:(type,payload)=>context.self.onmessage({data:{type,payload}}),get brain(){return instance;}};
}
test('state serialization does not transfer undefined buffers',async()=>{const h=harness();await h.send('init');await h.send('getState');assert.equal(h.messages.at(-1).type,'state');});
test('stimulus persists; batch includes all spikes; pause cancels pending batch',async()=>{const h=harness();await h.send('init');await h.send('injectStimulus',{exc:5,inh:2,duration:3});await h.send('start');assert.deepEqual(h.brain.calls.slice(0,4),[3,2,1,undefined]);assert.equal(h.messages.at(-1).payload.spikes.length,50);assert.equal(h.timers.size,1);await h.send('pause');assert.equal(h.timers.size,0);await h.send('start');assert.equal(h.timers.size,1);});
test('brain reset clears kicks and timestamps do not wrap',async()=>{const code=readFileSync(new URL('../src/brain.js',import.meta.url),'utf8');const {Brain}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));const b=new Brain({N_exc:2,N_inh:1});b.I_kick.fill(5);b._resetState();assert.equal(b.I_kick[0],0);b.spikeBuffer=[70000,1];assert.equal(b.getSpikeBuffer()[0],70000);});

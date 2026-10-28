import test from "node:test";
import assert from "node:assert/strict";
import {decisionSensitivity,repairOptions} from "../lib/group-insights";
import type {GroupInput,Row} from "../lib/group";
const input:GroupInput={participants:[{id:"p1",seed:"cities",vetoes:[]},{id:"p2",seed:"country",vetoes:["arrival"]}],strategy:"balanced",mode:"qloo",maxMinutes:100};
const row=(id:string,p1:number,p2:number,blocked:string[]=[]):Row=>({id,title:id,minutes:100,blocked,ranks:{p1,p2},floor:Math.min(p1,p2),mean:(p1+p2)/2});
test("counterfactuals change rankings but never remove participant vetoes",()=>{const result=decisionSensitivity(input,[row("paterson",1,0),row("columbus",0.5,0.5),row("arrival",1,1,["p2 veto"])]);assert.equal(result.full,"columbus");assert.equal(result.participants.find(p=>p.id==="p2")?.withoutTaste,"paterson");assert.ok(result.participants.every(p=>p.withoutTaste!=="arrival"));});
test("missing evidence remains unknown and is disclosed by counterfactual",()=>{const r=row("paterson",1,1);r.ranks.p2=null;r.floor=null;const x=decisionSensitivity(input,[r]);assert.equal(x.full,null);assert.equal(x.participants.find(p=>p.id==="p2")?.withoutTaste,"paterson");});
test("repair options retain veto ownership and precise time deficit",()=>{const r=repairOptions(input).find(r=>r.id==="arrival")!;assert.equal(r.extraMinutes,16);assert.deepEqual(r.vetoOwners,["p2"]);assert.deepEqual(input.participants[1].vetoes,["arrival"]);});

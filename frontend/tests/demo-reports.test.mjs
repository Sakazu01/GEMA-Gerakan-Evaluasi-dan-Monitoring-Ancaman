import test from "node:test";
import assert from "node:assert/strict";
import {isWarningZoneReport, severityMap, mapStyle, neutralSeverity, awarenessRadius} from "../src/lib/demo-reports.ts";

const now=Date.UTC(2026,9,3,12);
const report={id:"test",status:"active",severity:"tinggi",is_demo:false,verification_status:"confirmed",expires_at:new Date(now+60000).toISOString()};

test("radius informasi sesuai kontrak baru dan override pengelola",()=>{
  assert.deepEqual(Object.fromEntries(Object.entries(severityMap).map(([key,value])=>[key,value.warningRadiusM])),{rendah:500,sedang:1000,tinggi:3000,kritis:10000});
  assert.equal(awarenessRadius({...report,awareness_radius_m:750}),750);
  assert.equal(isWarningZoneReport({...report,severity:null,awareness_radius_m:750},now),true);
});
test("lingkaran tidak mengesankan kepastian untuk unconfirmed, held, demo, atau expired",()=>{
  assert.equal(isWarningZoneReport(report,now),true);
  for(const change of [{verification_status:"unconfirmed"},{verification_status:"under_review"},{status:"held"},{is_demo:true},{expires_at:new Date(now).toISOString()},{severity:null}]){
    assert.equal(isWarningZoneReport({...report,...change},now),false);
  }
  assert.deepEqual(mapStyle({...report,verification_status:"unconfirmed",severity:"kritis"}),neutralSeverity);
});

import test from "node:test";
import assert from "node:assert/strict";
import {noticeFingerprint,dismissNotice,readNoticeDismissals} from "../../src/lib/notice-state.ts";

test("count tidak menghasilkan notice baru; keputusan dan waktu pengamatan menghasilkan notice baru",()=>{
  const report={id:"test",status:"active",verification_status:"unconfirmed",observed_at:"2026-10-03T12:00:00Z",expires_at:"2026-10-04T00:00:00Z"};
  assert.equal(noticeFingerprint({...report,version:3,observation_counts:{seen_direct:20}}),noticeFingerprint(report));
  assert.notEqual(noticeFingerprint({...report,verification_status:"confirmed"}),noticeFingerprint(report));
  assert.notEqual(noticeFingerprint({...report,status:"closed",closure_reason:"refuted"}),noticeFingerprint(report));
});
test("dismissal tersimpan selama 30 menit dan dibersihkan setelah kedaluwarsa",()=>{
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const original=Date.now;let now=100000;Date.now=()=>now;
  try{assert.equal(dismissNotice("test").test,now+30*60000);assert.ok(readNoticeDismissals().test);now+=31*60000;assert.deepEqual(readNoticeDismissals(),{});}
  finally{Date.now=original;delete globalThis.localStorage;}
});

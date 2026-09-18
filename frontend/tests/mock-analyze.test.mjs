import test from "node:test";
import assert from "node:assert/strict";
import { mockAnalyze } from "../src/lib/mock-analyze.ts";

test("AI mock mengikuti kontrak analisis dan membedakan skenario darurat", () => {
  const high = mockAnalyze("flood_high");
  const low = mockAnalyze("flood_low");
  const critical = mockAnalyze("flood_critical");
  const invalid = mockAnalyze("invalid");
  const uncertain = mockAnalyze("uncertain");

  assert.equal(high.validity, "relevant");
  assert.equal(low.validity, "relevant");
  assert.equal(critical.validity, "relevant");
  if (high.validity !== "relevant" || low.validity !== "relevant" || critical.validity !== "relevant") return;
  assert.equal(high.type, "flood");
  assert.equal(high.severity, "tinggi");
  assert.equal(low.severity, "rendah");
  assert.equal(critical.severity, "kritis");
  assert.match(high.draft_id, /^[0-9a-f-]{36}$/);
  assert.ok(high.summary.length <= 240 && high.reason.length <= 120);
  assert.deepEqual(Object.keys(invalid).sort(), ["reason", "validity"]);
  assert.deepEqual(Object.keys(uncertain).sort(), ["reason", "validity"]);
});

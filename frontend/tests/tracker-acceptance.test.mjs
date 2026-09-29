import test from "node:test";
import assert from "node:assert/strict";
import { hasNewAcceptance } from "../src/lib/tracker-acceptance.ts";

const pending = { id: "report-1", responder_status: "PENDING" };
const accepted = { id: "report-1", responder_status: "ACCEPTED" };

test("popup hanya untuk perubahan PENDING menjadi ACCEPTED", () => {
  assert.equal(hasNewAcceptance(null, [accepted]), false);
  assert.equal(hasNewAcceptance(new Map([["report-1", "PENDING"]]), [accepted]), true);
  assert.equal(hasNewAcceptance(new Map([["report-1", "ACCEPTED"]]), [accepted]), false);
  assert.equal(hasNewAcceptance(new Map([["report-2", "PENDING"]]), [accepted]), false);
  assert.equal(hasNewAcceptance(new Map([["report-1", "PENDING"]]), [pending]), false);
});

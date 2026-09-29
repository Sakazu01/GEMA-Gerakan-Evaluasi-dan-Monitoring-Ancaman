import test from "node:test";
import assert from "node:assert/strict";
import {
  demoReports, isWarningZoneReport, nearestWarningZone, severityMap,
} from "../src/lib/demo-reports.ts";

test("radius per severity dan laporan terdekat mengikuti PRD v2.3", () => {
  const now = new Date().toISOString();
  const origin = demoReports[0];
  const here = { lat: origin.public_lat, lng: origin.public_lng, label: "Tes" };
  const high = { ...origin, published_at: now };
  const medium = { ...demoReports[1], public_lat: here.lat + 0.002, public_lng: here.lng, published_at: now };
  const critical = { ...demoReports.find((report) => report.severity === "kritis"),
    public_lat: here.lat + 0.01, public_lng: here.lng, published_at: now };
  const low = { ...demoReports[3], published_at: now };
  const old = { ...high, id: "old", published_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() };
  const hidden = { ...high, id: "hidden", status: "disputed_hidden" };

  assert.deepEqual(Object.fromEntries(Object.entries(severityMap).map(([key, value]) =>
    [key, value.warningRadiusM])), { rendah: 0, sedang: 1000, tinggi: 3000, kritis: 10000 });
  assert.equal(isWarningZoneReport(low), false);
  assert.equal(isWarningZoneReport(medium), true);
  assert.equal(isWarningZoneReport(critical), true);
  assert.equal(isWarningZoneReport(old), false);
  assert.equal(isWarningZoneReport(hidden), false);

  assert.equal(nearestWarningZone([high, critical, medium], { ...here, lat: here.lat + 0.002 })?.report.id, medium.id);
  assert.equal(nearestWarningZone([high, critical], { ...here, lat: here.lat + 0.045 })?.report.id, critical.id);
  assert.equal(nearestWarningZone([high], { ...here, lat: here.lat + 0.026 })?.report.id, high.id);
  assert.equal(nearestWarningZone([high], { ...here, lat: here.lat + 0.03 }), null);
  assert.equal(nearestWarningZone([critical], { ...here, lat: here.lat + 0.08 })?.report.id, critical.id);
  assert.equal(nearestWarningZone([critical], { ...here, lat: here.lat + 0.105 }), null);
  assert.equal(nearestWarningZone([medium], { ...here, lat: here.lat + 0.008 })?.report.id, medium.id);
  assert.equal(nearestWarningZone([medium], { ...here, lat: here.lat + 0.012 }), null);
});

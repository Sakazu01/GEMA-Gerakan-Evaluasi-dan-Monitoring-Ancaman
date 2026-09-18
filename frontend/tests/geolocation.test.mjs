import test from "node:test";
import assert from "node:assert/strict";
import { requestDeviceLocation } from "../src/lib/geolocation.ts";

test("koordinat dan akurasi perangkat diteruskan tanpa diganti lokasi demo", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(success) {
          success({ coords: { latitude: -7.25, longitude: 112.75, accuracy: 250 } });
        },
      },
    },
  });

  try {
    let location;
    let message;
    requestDeviceLocation(
      (value) => { location = value; },
      (value) => { message = value; },
    );
    assert.deepEqual(location, {
      lat: -7.25,
      lng: 112.75,
      label: "Lokasi perangkat (perkiraan)",
      source: "device",
      accuracy_m: 250,
    });
    assert.match(message, /250 m/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else delete globalThis.navigator;
  }
});

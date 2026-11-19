import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applySharedDays, sharedDaysFromIds } from "../src/dayShare.ts";
import { customByName, saveCustomExercise } from "../src/customExercises.ts";
import { saveDays } from "../src/days.ts";
import { EXERCISE_CATALOGUE } from "../src/exercises.ts";
import {
  BAD_CODE_MESSAGE,
  NEWER_VERSION_MESSAGE,
  SHARE_MUSCLE_BITS,
  SHARE_VERSION,
  ShareError,
  decodeShareCode,
  encodeShareCode,
  type SharedDay,
} from "../src/shareCodec.ts";
import { saveDayWorkouts } from "../src/trackerStore.ts";

const memory = new Map<string, string>();

function installStorage() {
  memory.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
  });
}

function pushU8(out: number[], value: number) {
  out.push(value & 0xff);
}

function pushU24(out: number[], value: number) {
  pushU8(out, value);
  pushU8(out, value >> 8);
  pushU8(out, value >> 16);
}

function pushStr(out: number[], value: string) {
  const encoded = new TextEncoder().encode(value);
  pushU8(out, encoded.length);
  for (const byte of encoded) pushU8(out, byte);
}

function mask(names: readonly string[], cardio: boolean): number {
  let bits = 0;
  for (const name of names) {
    const index = SHARE_MUSCLE_BITS.indexOf(name as (typeof SHARE_MUSCLE_BITS)[number]);
    if (index >= 0) bits |= 1 << index;
  }
  if (cardio) bits |= 1 << SHARE_MUSCLE_BITS.length;
  return bits;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate-raw");
  const done = new Response(stream.readable).arrayBuffer();
  const writer = stream.writable.getWriter();
  await writer.write(data as Uint8Array<ArrayBuffer>);
  await writer.close();
  return new Uint8Array(await done);
}

async function legacyCode(version: number, secondary: readonly string[] | null, overlapCardio = true): Promise<string> {
  const out: number[] = [];
  pushU8(out, version);
  pushU8(out, 1);
  pushStr(out, "Push");
  pushU8(out, 0x10);
  pushU8(out, 0x84);
  pushU8(out, 0xfe);
  pushU8(out, 1);
  pushU8(out, 0x80 | 4);
  pushStr(out, "Landmine Press");
  pushU24(out, mask(["chest", "shoulders"], overlapCardio));
  if (secondary) pushU24(out, mask(secondary, false));
  const compressed = await deflateRaw(Uint8Array.from(out));
  return `${version}.${bytesToBase64Url(compressed)}`;
}

describe("share codes", { concurrency: false }, () => {
  test("round-trips custom main and secondary muscles", async () => {
    const catalogue = EXERCISE_CATALOGUE[0];
    const days: SharedDay[] = [
      {
        name: "Push",
        color: "#1084fe",
        exercises: [
          { name: catalogue.name, sets: 3, catalogueIndex: 0, custom: null },
          {
            name: "Landmine Press",
            sets: 4,
            catalogueIndex: null,
            custom: {
              muscles: ["shoulders", "chest"],
              secondary: ["triceps", "chest", "abdominals"],
              cardio: true,
            },
          },
        ],
      },
    ];
    const code = await encodeShareCode(days);
    assert.equal(code.startsWith(`${SHARE_VERSION}.`), true);
    assert.equal(SHARE_VERSION, 2);
    const decoded = await decodeShareCode(code);
    assert.equal(decoded[0].color, "#1084FE");
    assert.deepEqual(decoded[0].exercises[0], {
      name: catalogue.name,
      sets: 3,
      catalogueIndex: 0,
      custom: null,
    });
    assert.deepEqual(decoded[0].exercises[1], {
      name: "Landmine Press",
      sets: 4,
      catalogueIndex: null,
      custom: {
        muscles: ["chest", "shoulders"],
        secondary: ["abdominals", "triceps"],
        cardio: true,
      },
    });
  });

  test("version 1 codes import every muscle as main", async () => {
    const decoded = await decodeShareCode(await legacyCode(1, null));
    assert.deepEqual(decoded[0].exercises[0].custom, {
      muscles: ["chest", "shoulders"],
      secondary: [],
      cardio: true,
    });
  });

  test("a muscle set in both version 2 masks stays main", async () => {
    const decoded = await decodeShareCode(await legacyCode(2, ["chest", "triceps"]));
    assert.deepEqual(decoded[0].exercises[0].custom, {
      muscles: ["chest", "shoulders"],
      secondary: ["triceps"],
      cardio: true,
    });
  });

  test("a newer version is refused and a mismatched prefix is rejected", async () => {
    await assert.rejects(decodeShareCode("3.aaaa"), (error: unknown) => {
      assert.ok(error instanceof ShareError);
      assert.equal(error.message, NEWER_VERSION_MESSAGE);
      return true;
    });
    const current = await encodeShareCode([
      {
        name: "Push",
        color: "#1084FE",
        exercises: [
          {
            name: "Landmine Press",
            sets: 3,
            catalogueIndex: null,
            custom: { muscles: ["chest"], secondary: [], cardio: false },
          },
        ],
      },
    ]);
    await assert.rejects(decodeShareCode(current.replace(/^2\./, "1.")), (error: unknown) => {
      assert.ok(error instanceof ShareError);
      assert.equal(error.message, BAD_CODE_MESSAGE);
      return true;
    });
  });

  test("import keeps secondary muscles on the saved custom exercise", async () => {
    installStorage();
    saveDays([{ id: "d1", name: "Arms", color: "#00AFC4" }]);
    saveCustomExercise({
      name: "Landmine Press",
      muscles: ["shoulders", "chest"],
      secondary: ["triceps"],
      cardio: true,
    });
    saveDayWorkouts("d1", [{ id: "c1", name: "Landmine Press", options: [], sets: 5 }]);
    const code = await encodeShareCode(sharedDaysFromIds(["d1"]));
    memory.delete("workout-tracker-custom-exercises");
    applySharedDays(await decodeShareCode(code), ["add"]);
    assert.deepEqual(customByName("Landmine Press"), {
      name: "Landmine Press",
      muscles: ["chest", "shoulders"],
      secondary: ["triceps"],
      cardio: true,
    });

    const old = await decodeShareCode(await legacyCode(1, null));
    memory.delete("workout-tracker-custom-exercises");
    applySharedDays(old, ["new"]);
    assert.deepEqual(customByName("Landmine Press")?.secondary, []);
    assert.deepEqual(customByName("Landmine Press")?.muscles, ["chest", "shoulders"]);
  });
});

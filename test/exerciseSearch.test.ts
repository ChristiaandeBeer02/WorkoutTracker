import assert from "node:assert/strict";
import test from "node:test";
import { searchByName, searchKey, termsOf } from "../src/exerciseSearch.ts";

function names(query: string, customNames: readonly string[] = []): string[] {
  return searchByName(query, { customNames });
}

test("normalisation ignores case, diacritics, and separators", () => {
  assert.deepEqual(termsOf("Pull-Up"), ["pull", "up"]);
  assert.deepEqual(termsOf("T-Bar"), ["t", "bar"]);
  assert.deepEqual(termsOf("Farmer's Walk"), ["farmer", "s", "walk"]);
  assert.deepEqual(termsOf("3/4 Sit-Up"), ["3", "4", "sit", "up"]);
  assert.deepEqual(termsOf("Pushups (Close and Wide Hand Positions)"), [
    "pushups",
    "close",
    "and",
    "wide",
    "hand",
    "positions",
  ]);
  assert.deepEqual(termsOf("Élévation Latérale"), ["elevation", "laterale"]);
  assert.deepEqual(termsOf("Dumb bell"), ["dumb", "bell"]);
  assert.deepEqual(termsOf("dumbbell"), ["dumbbell"]);
  assert.notEqual(searchKey("Dumb bell"), searchKey("dumbbell"));
});

test("space-insensitive names match squashed queries", () => {
  const dumbbell = names("dumb bell");
  assert.equal(dumbbell.includes("Dumbbell Bench Press"), true);
  assert.equal("Dumbbell Bench Press".toLowerCase().includes("dumb bell"), false);
  assert.equal(dumbbell.includes("Calf Raise On A Dumbbell"), true);
  assert.ok(dumbbell.indexOf("Dumbbell Bench Press") < dumbbell.indexOf("Alternate Incline Dumbbell Curl"));

  const pull = names("pull up");
  assert.equal(pull.includes("Scapular Pull-Up"), true);
  assert.equal(pull.includes("Band Assisted Pull-Up"), true);
  assert.equal(pull.includes("Pullups"), true);
  assert.equal(pull.includes("V-Bar Pullup"), true);
  assert.equal(pull.includes("Wide-Grip Rear Pull-Up"), true);

  const tbar = names("t bar");
  assert.equal(tbar.includes("T-Bar Row with Handle"), true);
  assert.equal(tbar.includes("Lying T-Bar Row"), true);
  assert.equal(tbar.includes("Front Barbell Squat"), false);
  assert.equal(tbar.includes("Upright Barbell Row"), false);
});

test("words match in any order and while a prefix is still being typed", () => {
  const rows = names("row dumbbell", ["Dumbbell Bent-Over Row"]);
  assert.equal(rows.includes("Dumbbell Bent-Over Row"), true);
  assert.equal(rows.includes("Bent Over Two-Dumbbell Row"), true);
  assert.equal(rows.includes("One-Arm Dumbbell Row"), true);

  const typed = names("dumb");
  assert.equal(typed.includes("Dumbbell Bench Press"), true);
  assert.ok(typed.indexOf("Dumbbell Bench Press") < typed.indexOf("Calf Raise On A Dumbbell"));

  const partial = names("barbell cu");
  assert.equal(partial[0], "Barbell Curl");
});

test("typos match when the word is long enough and miss when it is short", () => {
  assert.equal(names("dumbel").some((name) => /dumbbell/i.test(name)), true);
  assert.equal(names("barbel").some((name) => /barbell/i.test(name)), true);
  assert.equal(names("pulldwon").some((name) => /pulldown/i.test(name)), true);

  const short = names("leg", ["Log Press", "Lag Press", "Leg Press Fake"]);
  assert.equal(short.includes("Leg Press Fake"), true);
  assert.equal(short.includes("Log Press"), false);
  assert.equal(short.includes("Lag Press"), false);

  assert.equal(names("zzx", ["zzzz unique move"]).includes("zzzz unique move"), false);
  assert.equal(names("zzzx", ["zzzz unique move"]).includes("zzzz unique move"), true);
  assert.equal(names("adm", ["Abdominal Crunch"]).includes("Abdominal Crunch"), false);
});

test("exact matches rank ahead of starts-with, all-word, then fuzzy hits", () => {
  const hits = names("barbell curl", ["Barbel Curl Typo"]);
  const exact = hits.indexOf("Barbell Curl");
  const starts = hits.indexOf("Barbell Curls Lying Against An Incline");
  const allWords = hits.indexOf("Close-Grip Standing Barbell Curl");
  const fuzzy = hits.indexOf("Barbel Curl Typo");
  assert.ok(exact >= 0, "exact catalogue name");
  assert.ok(starts > exact, "starts-with follows exact");
  assert.ok(allWords > starts, "all-word matches follow starts-with");
  assert.ok(fuzzy > allWords, "fuzzy near misses are last");

  const rows = names("row", ["Row", "Rowing Machine"]);
  assert.equal(rows[0], "Row");
  const rowing = rows.indexOf("Rowing, Stationary");
  const machine = rows.indexOf("Rowing Machine");
  const bent = rows.indexOf("Bent Over Barbell Row");
  assert.ok(rowing > 0 && machine > 0);
  assert.ok(bent > rowing && bent > machine);
});

test("punctuation and diacritics match, and shorthand is not a synonym", () => {
  assert.equal(names("farmers walk").includes("Farmer's Walk"), true);
  assert.equal(names("34 sit").includes("3/4 Sit-Up"), true);
  assert.equal(names("3/4").includes("3/4 Sit-Up"), true);
  assert.equal(names("pushups close").includes("Pushups (Close and Wide Hand Positions)"), true);
  assert.equal(names("elevation laterale", ["Élévation Latérale"]).includes("Élévation Latérale"), true);
  assert.equal(names("childs pose").includes("Child's Pose"), true);
  assert.equal(
    names("db bench").includes("Dumbbell Bench Press"),
    false,
  );
  assert.equal(names("ohp").some((name) => /overhead press/i.test(name)), false);
});

test("custom exercises are indexed and dropped again when the list changes", () => {
  assert.equal(names("sled drag", ["Sled Drag"]).includes("Sled Drag"), true);
  assert.equal(names("sled drag").includes("Sled Drag"), false);
  assert.equal(names("dumbbell").includes("Dumbbell Bench Press"), true);
  assert.equal(names("sled drag", ["Sled Drag", "Sled Drag Hold"]).includes("Sled Drag Hold"), true);
});

test("one letter prefixes a word, and stays exact inside a longer query", () => {
  const letter = names("d");
  assert.equal(letter.includes("Dumbbell Bench Press"), true);
  assert.equal(letter.includes("Decline Dumbbell Bench Press"), true);
  assert.equal(letter[0]?.toLowerCase().startsWith("d"), true);
  assert.ok(letter.indexOf("Dumbbell Bench Press") < letter.indexOf("Calf Raise On A Dumbbell"));
  assert.equal(names("t bar").includes("Front Barbell Squat To A Bench"), false);
});

test("a universe limits results to those names", () => {
  const hits = searchByName("pull up", {
    customNames: ["My Pull Up"],
    universe: ["Pullups", "My Pull Up", "Dumbbell Bench Press"],
  });
  assert.deepEqual(hits, ["Pullups", "My Pull Up"]);
});

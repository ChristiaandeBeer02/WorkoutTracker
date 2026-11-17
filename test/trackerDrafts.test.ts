import assert from "node:assert/strict";
import test from "node:test";
import {
  bookIsEmpty,
  emptyDraftBook,
  forgetAllDrafts,
  forgetDraftDay,
  loadDraftBook,
  parseDraftBook,
  saveDraftBook,
  serializeDraftBook,
  visibleSetRows,
  withUpdatedCount,
  withUpdatedSet,
  withoutCard,
  withoutDay,
} from "../src/trackerDrafts.ts";

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

test("missing or broken storage reads as no draft", () => {
  assert.deepEqual(parseDraftBook(null), emptyDraftBook());
  assert.deepEqual(parseDraftBook("not json"), emptyDraftBook());
  assert.deepEqual(parseDraftBook("[]"), emptyDraftBook());
  const dirty = parseDraftBook(
    JSON.stringify({
      sets: { legs: { squat: [{ weight: 100, reps: null }, "nope", { weight: "80", reps: "5" }] } },
      counts: { legs: { squat: 0, press: 4.5, curl: 3 } },
    }),
  );
  assert.deepEqual(dirty.sets.legs.squat, [
    { weight: "", reps: "" },
    { weight: "", reps: "" },
    { weight: "80", reps: "5" },
  ]);
  assert.deepEqual(dirty.counts.legs, { curl: 3 });
});

test("typed sets stay on that day and card only", () => {
  let book = emptyDraftBook();
  book = withUpdatedSet(book, "legs", "squat", 0, 3, "weight", "100");
  book = withUpdatedSet(book, "legs", "squat", 0, 3, "reps", "8");
  book = withUpdatedSet(book, "legs", "squat", 1, 3, "weight", "90");
  book = withUpdatedSet(book, "push", "bench", 0, 3, "reps", "6");
  assert.deepEqual(book.sets.legs.squat[0], { weight: "100", reps: "8" });
  assert.deepEqual(book.sets.legs.squat[1], { weight: "90", reps: "" });
  assert.equal(book.sets.push.bench[0].reps, "6");
  assert.equal(book.sets.legs.bench, undefined);
});

test("a longer set count keeps earlier rows", () => {
  let book = withUpdatedSet(emptyDraftBook(), "legs", "squat", 0, 3, "weight", "100");
  book = withUpdatedCount(book, "legs", "squat", 4);
  book = withUpdatedSet(book, "legs", "squat", 3, 4, "reps", "12");
  assert.deepEqual(visibleSetRows(book.sets.legs.squat, book.counts.legs.squat), [
    { weight: "100", reps: "" },
    { weight: "", reps: "" },
    { weight: "", reps: "" },
    { weight: "", reps: "12" },
  ]);
});

test("removing a card or submitting a day leaves the rest", () => {
  let book = withUpdatedSet(emptyDraftBook(), "legs", "squat", 0, 3, "weight", "100");
  book = withUpdatedSet(book, "legs", "curl", 0, 3, "reps", "10");
  book = withUpdatedCount(book, "legs", "squat", 4);
  book = withUpdatedSet(book, "push", "bench", 0, 3, "weight", "60");
  book = withoutCard(book, "legs", "squat");
  assert.equal(book.sets.legs.squat, undefined);
  assert.equal(book.counts.legs, undefined);
  assert.equal(book.sets.legs.curl[0].reps, "10");
  book = withoutDay(book, "legs");
  assert.equal(book.sets.legs, undefined);
  assert.equal(book.sets.push.bench[0].weight, "60");
});

test("storage round trip restores a draft and forgets it on submit or reset", () => {
  installStorage();
  const book = withUpdatedSet(emptyDraftBook(), "pull", "row", 1, 3, "weight", "70");
  saveDraftBook(book);
  assert.deepEqual(loadDraftBook().sets.pull.row[1], { weight: "70", reps: "" });
  forgetDraftDay("pull");
  assert.equal(bookIsEmpty(loadDraftBook()), true);
  saveDraftBook(withUpdatedSet(emptyDraftBook(), "legs", "squat", 0, 3, "reps", "5"));
  forgetAllDrafts();
  assert.equal(loadDraftBook().sets.legs, undefined);
  assert.equal(serializeDraftBook(book).includes("row"), true);
});

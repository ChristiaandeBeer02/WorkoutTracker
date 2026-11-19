import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { customByName, saveCustomExercise } from "../src/customExercises.ts";
import { musclesForDay, musclesForExercise, paintCustom, paintDays } from "../src/muscles.ts";
import { saveDays } from "../src/days.ts";
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

describe("custom exercise muscles", { concurrency: false }, () => {
  test("stored entries without secondary keep their main muscles", () => {
    installStorage();
    memory.set(
      "workout-tracker-custom-exercises",
      JSON.stringify({
        "landmine press": { name: "Landmine Press", muscles: ["triceps", "chest", "chest"], cardio: true },
      }),
    );
    assert.deepEqual(customByName("Landmine Press"), {
      name: "Landmine Press",
      muscles: ["chest", "triceps"],
      secondary: [],
      cardio: true,
    });
  });

  test("a muscle in both lists stays main, in catalogue order", () => {
    installStorage();
    assert.equal(
      saveCustomExercise({
        name: "Landmine Press",
        muscles: ["biceps", "not-a-muscle", "chest"],
        secondary: ["chest", "triceps", "biceps", "forearms"],
        cardio: false,
      }),
      true,
    );
    assert.deepEqual(customByName("Landmine Press"), {
      name: "Landmine Press",
      muscles: ["biceps", "chest", "not-a-muscle"],
      secondary: ["forearms", "triceps"],
      cardio: false,
    });
  });

  test("custom main and secondary paint and feed the day figure", () => {
    installStorage();
    const exercise = {
      name: "Landmine Press",
      muscles: ["chest"],
      secondary: ["triceps", "chest"],
      cardio: false,
    };
    const worked = musclesForExercise(exercise);
    assert.deepEqual(worked.names, ["chest"]);
    assert.deepEqual(worked.secondaryNames, ["triceps"]);
    assert.equal(worked.primary.includes("CHEST"), true);
    assert.equal(worked.secondary.includes("TRICEPS"), true);
    assert.equal(worked.secondary.includes("CHEST"), false);

    const paint = paintCustom(exercise.muscles, exercise.secondary, "#E5484D");
    assert.equal(paint.CHEST?.opacity, 1);
    assert.equal(paint.TRICEPS?.opacity, 0.45);
    assert.equal(paint.CHICEPS, undefined);

    saveCustomExercise(exercise);
    const day = { id: "day-1", name: "Custom", color: "#E5484D" };
    saveDays([day]);
    saveDayWorkouts(day.id, [{ id: "c1", name: "Landmine Press", options: [], sets: 3 }]);
    const muscles = musclesForDay(day);
    assert.deepEqual(muscles.names, ["chest"]);
    assert.deepEqual(muscles.secondaryNames, ["triceps"]);
    const shaded = paintDays([day]);
    assert.equal(shaded.CHEST?.opacity, 1);
    assert.equal(shaded.TRICEPS?.opacity, 0.45);
    assert.equal(shaded.CHEST?.color, "#E5484D");
    assert.equal(shaded.TRICEPS?.color, "#E5484D");
  });
});

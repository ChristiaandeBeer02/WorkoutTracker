import { EXERCISE_CATALOGUE, normaliseExerciseName } from "./exercises";

/**
 * Share-code version. Codes from a higher version are refused.
 * Version 1 codes still import: every custom muscle is main, and secondary is empty.
 * Bump this if the catalogue order or the binary layout changes.
 * Appending exercises to the catalogue does not need a bump.
 */
export const SHARE_VERSION = 2;

const PREFIX = `${SHARE_VERSION}.`;

export const NEWER_VERSION_MESSAGE = "This share code is from a newer version of the app.";
export const BAD_CODE_MESSAGE = "That code doesn't look like a workout share.";
export const TOO_BIG_MESSAGE = "That plan is too big to share.";
export const NAME_TOO_LONG_MESSAGE = "One of the names is too long to share.";

/** Bit order is fixed. Heart & lungs is the next bit on the main mask. Version 2 adds a second mask for secondary muscles. */
export const SHARE_MUSCLE_BITS = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower back",
  "middle back",
  "neck",
  "quadriceps",
  "shoulders",
  "traps",
  "triceps",
] as const;

const HEART_BIT = SHARE_MUSCLE_BITS.length;
const MAX_DAYS = 40;
const MAX_EXERCISES = 80;
const MAX_NAME_BYTES = 180;

const CATALOGUE_INDEX = new Map<string, number>();
EXERCISE_CATALOGUE.forEach((exercise, index) => {
  CATALOGUE_INDEX.set(normaliseExerciseName(exercise.name), index);
});

export interface SharedCustom {
  muscles: string[];
  secondary: string[];
  cardio: boolean;
}

export interface SharedExercise {
  name: string;
  sets: number;
  catalogueIndex: number | null;
  custom: SharedCustom | null;
}

export interface SharedDay {
  name: string;
  color: string;
  exercises: SharedExercise[];
}

export class ShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareError";
  }
}

export function catalogueIndex(name: string): number | null {
  const index = CATALOGUE_INDEX.get(normaliseExerciseName(name));
  return index == null ? null : index;
}

export function shareUrl(code: string): string {
  return `https://christiaandebeer02.github.io/WorkoutTracker/#import=${code}`;
}

export const QR_LINK_LIMIT = 1000;

/** Pull a raw share code out of a pasted code or a full share link. */
export function extractShareCode(input: string): string {
  const trimmed = input.trim();
  const marked = /#import=([^&\s]+)/.exec(trimmed) ?? /[?&]import=([^&\s]+)/.exec(trimmed);
  if (!marked) return trimmed;
  try {
    return decodeURIComponent(marked[1]);
  } catch {
    return marked[1];
  }
}

export function previewLine(day: SharedDay): string {
  const count = day.exercises.length;
  const exercises = `${count} ${count === 1 ? "exercise" : "exercises"}`;
  const custom = day.exercises.filter((exercise) => exercise.catalogueIndex == null).length;
  if (custom === 0) return `${day.name}, ${exercises}`;
  return `${day.name}, ${exercises}, ${custom} ${custom === 1 ? "custom" : "customs"}`;
}

export async function encodeShareCode(days: SharedDay[]): Promise<string> {
  if (days.length === 0) throw new ShareError(BAD_CODE_MESSAGE);
  const raw = packDays(days);
  const compressed = await deflateRaw(raw);
  return PREFIX + bytesToBase64Url(compressed);
}

export async function decodeShareCode(input: string): Promise<SharedDay[]> {
  const code = extractShareCode(input);
  if (!code) throw new ShareError(BAD_CODE_MESSAGE);
  const split = /^(\d+)\.(.+)$/.exec(code);
  if (!split) throw new ShareError(BAD_CODE_MESSAGE);
  const version = Number(split[1]);
  if (!Number.isInteger(version) || version < 1) throw new ShareError(BAD_CODE_MESSAGE);
  if (version > SHARE_VERSION) throw new ShareError(NEWER_VERSION_MESSAGE);
  let inflated: Uint8Array;
  try {
    inflated = await inflateRaw(base64UrlToBytes(split[2]));
  } catch (error) {
    if (error instanceof ShareError) throw error;
    throw new ShareError(BAD_CODE_MESSAGE);
  }
  return unpackDays(inflated, version);
}

function packDays(days: SharedDay[]): Uint8Array {
  if (days.length > MAX_DAYS) throw new ShareError(TOO_BIG_MESSAGE);
  const out = new ByteWriter();
  out.u8(SHARE_VERSION);
  out.u8(days.length);
  for (const day of days) {
    const name = cleanName(day.name);
    if (!name) throw new ShareError(BAD_CODE_MESSAGE);
    out.str(name);
    const [red, green, blue] = colorBytes(day.color);
    out.u8(red);
    out.u8(green);
    out.u8(blue);
    if (day.exercises.length > MAX_EXERCISES) throw new ShareError(TOO_BIG_MESSAGE);
    out.u8(day.exercises.length);
    for (const exercise of day.exercises) {
      const sets = clampSets(exercise.sets);
      if (exercise.catalogueIndex != null) {
        const index = exercise.catalogueIndex;
        if (!Number.isInteger(index) || index < 0 || index >= EXERCISE_CATALOGUE.length) {
          throw new ShareError(BAD_CODE_MESSAGE);
        }
        out.u8(sets);
        out.u16(index);
        continue;
      }
      const customName = cleanName(exercise.name);
      if (!customName) throw new ShareError(BAD_CODE_MESSAGE);
      const split = splitSharedMuscles(exercise.custom);
      out.u8(0x80 | sets);
      out.str(customName);
      out.u24(muscleMask(split.muscles, split.cardio));
      out.u24(muscleMask(split.secondary, false));
    }
  }
  return out.bytes();
}

function unpackDays(data: Uint8Array, prefixVersion: number): SharedDay[] {
  const reader = new ByteReader(data);
  const version = reader.u8();
  if (version !== prefixVersion || version < 1) throw new ShareError(BAD_CODE_MESSAGE);
  if (version > SHARE_VERSION) throw new ShareError(NEWER_VERSION_MESSAGE);
  const count = reader.u8();
  if (count < 1 || count > MAX_DAYS) throw new ShareError(BAD_CODE_MESSAGE);
  const days: SharedDay[] = [];
  for (let i = 0; i < count; i += 1) {
    const name = cleanName(reader.str());
    if (!name) throw new ShareError(BAD_CODE_MESSAGE);
    const color = colorHex(reader.u8(), reader.u8(), reader.u8());
    const exerciseCount = reader.u8();
    if (exerciseCount > MAX_EXERCISES) throw new ShareError(BAD_CODE_MESSAGE);
    const exercises: SharedExercise[] = [];
    for (let n = 0; n < exerciseCount; n += 1) {
      const header = reader.u8();
      const sets = header & 0x7f;
      if (sets < 1 || sets > 99) throw new ShareError(BAD_CODE_MESSAGE);
      if ((header & 0x80) === 0) {
        const index = reader.u16();
        if (index >= EXERCISE_CATALOGUE.length) throw new ShareError(NEWER_VERSION_MESSAGE);
        exercises.push({
          name: EXERCISE_CATALOGUE[index].name,
          sets,
          catalogueIndex: index,
          custom: null,
        });
        continue;
      }
      const customName = cleanName(reader.str());
      if (!customName) throw new ShareError(BAD_CODE_MESSAGE);
      const main = musclesFromMask(reader.u24());
      let secondary: string[] = [];
      if (version >= 2) {
        const extra = musclesFromMask(reader.u24());
        const taken = new Set(main.muscles);
        secondary = extra.muscles.filter((name) => !taken.has(name));
      }
      exercises.push({
        name: customName,
        sets,
        catalogueIndex: null,
        custom: { muscles: main.muscles, secondary, cardio: main.cardio },
      });
    }
    days.push({ name, color, exercises });
  }
  reader.finish();
  return days;
}

function splitSharedMuscles(custom: SharedCustom | null): { muscles: string[]; secondary: string[]; cardio: boolean } {
  const muscles = custom?.muscles ?? [];
  const taken = new Set(muscles.map((name) => normaliseExerciseName(name)));
  const secondary = (custom?.secondary ?? []).filter((name) => !taken.has(normaliseExerciseName(name)));
  return { muscles, secondary, cardio: custom?.cardio === true };
}

function muscleMask(names: readonly string[], cardio: boolean): number {
  let mask = 0;
  for (const name of names) {
    const index = SHARE_MUSCLE_BITS.indexOf(normaliseExerciseName(name) as (typeof SHARE_MUSCLE_BITS)[number]);
    if (index >= 0) mask |= 1 << index;
  }
  if (cardio) mask |= 1 << HEART_BIT;
  return mask;
}

function musclesFromMask(mask: number): { muscles: string[]; cardio: boolean } {
  const muscles: string[] = [];
  SHARE_MUSCLE_BITS.forEach((name, index) => {
    if ((mask & (1 << index)) !== 0) muscles.push(name);
  });
  return { muscles, cardio: (mask & (1 << HEART_BIT)) !== 0 };
}

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function clampSets(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(99, Math.round(value)));
}

function colorBytes(hex: string): [number, number, number] {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  const value = match ? match[1] : "888888";
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function colorHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

class ByteWriter {
  private data: number[] = [];

  u8(value: number) {
    this.data.push(value & 0xff);
  }

  u16(value: number) {
    this.u8(value);
    this.u8(value >> 8);
  }

  u24(value: number) {
    this.u8(value);
    this.u8(value >> 8);
    this.u8(value >> 16);
  }

  str(value: string) {
    const encoded = new TextEncoder().encode(value);
    if (encoded.length > MAX_NAME_BYTES) throw new ShareError(NAME_TOO_LONG_MESSAGE);
    this.u8(encoded.length);
    for (const byte of encoded) this.u8(byte);
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.data);
  }
}

class ByteReader {
  private offset = 0;
  private data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  u8(): number {
    if (this.offset >= this.data.length) throw new ShareError(BAD_CODE_MESSAGE);
    const value = this.data[this.offset];
    this.offset += 1;
    return value;
  }

  u16(): number {
    const low = this.u8();
    const high = this.u8();
    return low | (high << 8);
  }

  u24(): number {
    const low = this.u8();
    const mid = this.u8();
    const high = this.u8();
    return low | (mid << 8) | (high << 16);
  }

  str(): string {
    const length = this.u8();
    if (this.offset + length > this.data.length) throw new ShareError(BAD_CODE_MESSAGE);
    const slice = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(slice);
    } catch {
      throw new ShareError(BAD_CODE_MESSAGE);
    }
  }

  finish() {
    if (this.offset !== this.data.length) throw new ShareError(BAD_CODE_MESSAGE);
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new ShareError(BAD_CODE_MESSAGE);
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new ShareError(BAD_CODE_MESSAGE);
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  return pipeStream(data, new CompressionStream("deflate-raw"));
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  return pipeStream(data, new DecompressionStream("deflate-raw"));
}

async function pipeStream(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const done = new Response(stream.readable).arrayBuffer();
  const writer = stream.writable.getWriter();
  await writer.write(data as Uint8Array<ArrayBuffer>);
  await writer.close();
  return new Uint8Array(await done);
}

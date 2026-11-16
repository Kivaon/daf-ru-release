import assert from "node:assert/strict";
import test from "node:test";
import { boundaryFlags, clean, fetchSideSnapshot, flagsContinue, flagsOf, isSideSnapshot, snapshotFromTexts, snapshotPath } from "../app/sefariaSnapshot.ts";

// условие, которое раньше проверялось по текстам Davidson целиком
const sentenceEnds = (value: string) => /[.!?׃։][\s"'׳״’”)]*$/.test(clean(value));
const beginsLowercase = (value: string) => /^[^A-Za-z]*[a-z]/.test(clean(value));
const original = (leftHe: string[], leftEn: string[], rightHe: string[], rightEn: string[]) => {
  const lh = leftHe.at(-1) || "", rh = rightHe[0] || "", le = leftEn.at(-1) || "", re = rightEn[0] || "";
  return Boolean(lh && rh && le && re && !sentenceEnds(lh) && !sentenceEnds(le) && beginsLowercase(re));
};

test("признаки границы дают то же решение, что проверка по текстам Davidson", () => {
  const he = [["א ב", "ג ד."], ["א ב ג"], [""], []];
  const en = [["It is said", "and then it ends."], ["and so it continues"], ["x"], ["Begins upper"]];
  const left = [["א", "ב ג"], ["א", "ב"], ["ג"], []];
  const leftEn = [["x", "the sentence goes on"], ["x", "It stops."], ["y"], []];
  for (const [lh, le] of left.map((h, i) => [h, leftEn[i]] as const)) for (const [rh, re] of he.map((h, i) => [h, en[i]] as const)) {
    assert.equal(flagsContinue(boundaryFlags(lh, le), boundaryFlags(rh, re)), original(lh, le, rh, re), JSON.stringify([lh, le, rh, re]));
  }
});

test("снимок хранит очищенный текст с исходными номерами реплик и признаки границы", () => {
  const snapshot = snapshotFromTexts(["<b>מתני׳</b> א&nbsp;ב", "", "ג"], ["x"], ["lower case start"]);
  assert.deepEqual(snapshot.segs, ["מתני׳ א ב", "", "ג"]);
  assert.equal(isSideSnapshot(snapshot), true);
  assert.deepEqual(flagsOf(snapshot), { firstOk: true, firstLower: true, lastOk: true, lastOpen: true });
});

test("isSideSnapshot отвергает чужой формат", () => {
  assert.equal(isSideSnapshot(null), false);
  assert.equal(isSideSnapshot({ v: 2, segs: [], f: [0, 0, 0, 0] }), false);
  assert.equal(isSideSnapshot({ v: 1, segs: [1], f: [0, 0, 0, 0] }), false);
  assert.equal(isSideSnapshot({ v: 1, segs: ["א"], f: [0, 2, 0, 0] }), false);
});

test("fetchSideSnapshot: файл отдаётся, а при ошибках возвращается null", async () => {
  const good = snapshotFromTexts(["א"], [], []);
  const reply = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body }) as Response) as typeof fetch;
  assert.deepEqual(await fetchSideSnapshot("Bava Kamma", "2a", reply(good)), good);
  assert.equal(await fetchSideSnapshot("Berakhot", "2a", reply(good, false)), null);
  assert.equal(await fetchSideSnapshot("Berakhot", "2a", reply({ v: 9 })), null);
  assert.equal(await fetchSideSnapshot("Berakhot", "2a", (async () => { throw new Error("network"); }) as typeof fetch), null);
  assert.equal(snapshotPath("Bava Kamma", "10b"), "/text/Bava_Kamma/10b.json");
});

import { createElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createVideoScrubber, useScrubbedVideo } from "./useScrubbedVideo";

let now, frames, nextId, motion, touch, scrubbers;
beforeEach(() => {
  now = 0; frames = new Map(); nextId = 0; touch = true; scrubbers = [];
  motion = new EventTarget(); motion.matches = false;
  vi.stubGlobal("matchMedia", q => q.includes("reduced-motion") ? motion : { matches: touch });
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", cb => { frames.set(++nextId, cb); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", id => frames.delete(id));
});
afterEach(() => {
  cleanup();
  scrubbers.forEach(s => s.destroy());
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function frame(time) {
  now = time;
  const callbacks = [...frames.values()]; frames.clear();
  act(() => callbacks.forEach(cb => cb(now)));
}
function media(duration = 120) {
  const video = new EventTarget();
  let current = 0;
  video.writes = [];
  Object.defineProperty(video, "currentTime", {
    get: () => current,
    set: value => { current = value; video.writes.push(value); },
  });
  video.duration = duration;
  video.play = vi.fn(); video.pause = vi.fn(); video.load = vi.fn();
  return video;
}
function start(video = media()) {
  const scrubber = createVideoScrubber(video); scrubbers.push(scrubber);
  scrubber.attach(); video.dispatchEvent(new Event("canplay")); video.writes.length = 0;
  return { video, scrubber };
}
function decoded(video) { video.dispatchEvent(new Event("seeked")); }

it("settles a long touch jump without further scroll events and stops scheduling", () => {
  const { video, scrubber } = start(media(600));
  scrubber.update(1);
  frame(100);
  expect(video.currentTime).toBeGreaterThan(0);
  expect(video.currentTime).toBeLessThan(600);
  decoded(video); frame(350); decoded(video);
  expect(video.currentTime).toBe(600);
  expect(frames.size).toBe(0);
  const writes = video.writes.length;
  frame(120000);
  expect(video.writes).toHaveLength(writes);
});

it("uses elapsed time rather than frame count", () => {
  function sample(times) {
    now = 0;
    const { video, scrubber } = start(); scrubber.update(1);
    times.forEach(t => { frame(t); decoded(video); });
    const result = video.currentTime; scrubber.destroy(); return result;
  }
  expect(sample([100])).toBe(sample([20, 40, 60, 80, 100]));
});

it("does not extend settling for repeated targets and follows a reversed target", () => {
  const { video, scrubber } = start(); scrubber.update(1);
  frame(100); decoded(video);
  scrubber.update(1);
  frame(350); decoded(video);
  expect(video.currentTime).toBe(120); expect(frames.size).toBe(0);
  scrubber.update(0);
  frame(450); decoded(video);
  expect(video.currentTime).toBeLessThan(120); expect(video.currentTime).toBeGreaterThan(0);
  frame(700); decoded(video);
  expect(video.currentTime).toBe(0); expect(frames.size).toBe(0);
});

it("coalesces slow-decoder seeks to the latest target with no decoding backlog", () => {
  const { video, scrubber } = start(); scrubber.update(1);
  frame(50); frame(100);
  scrubber.update(0.25);
  frame(200); frame(450);
  expect(video.writes).toHaveLength(1);
  expect(frames.size).toBe(0);
  decoded(video);
  expect(video.writes).toHaveLength(2);
  expect(video.currentTime).toBe(30);
  decoded(video);
  expect(video.writes).toHaveLength(2);
});

it("cancels animation and pending seeks on destroy, including late play resolution", async () => {
  const video = media(); let resolve;
  video.play.mockReturnValue(new Promise(r => { resolve = r; }));
  const { scrubber } = start(video); scrubber.update(1);
  frame(50); frame(100);
  scrubber.destroy(); const writes = video.writes.length;
  decoded(video); scrubber.update(0); frame(1000);
  resolve(); await Promise.resolve();
  expect(video.writes).toHaveLength(writes); expect(frames.size).toBe(0);
});

it("honors initial reduced motion and cancels settling when the preference changes", () => {
  motion.matches = true;
  const first = start(); first.scrubber.update(1); frame(100);
  expect(first.video.play).not.toHaveBeenCalled(); expect(first.video.writes).toEqual([]);
  motion.matches = false;
  const { video, scrubber } = start(); scrubber.update(1);
  frame(150); frame(200);
  motion.matches = true; motion.dispatchEvent(new Event("change"));
  const writes = video.writes.length;
  decoded(video); frame(1000); scrubber.update(0);
  expect(video.writes).toHaveLength(writes); expect(frames.size).toBe(0);
});

it("keeps desktop seeks immediate and skips duplicate frames", () => {
  touch = false;
  const { video, scrubber } = start(media(10));
  scrubber.update(0.5); decoded(video); scrubber.update(0.50001);
  expect(video.writes).toEqual([5]); expect(frames.size).toBe(0);
});

function mountVideo() {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(120);
  vi.stubGlobal("innerWidth", 1200); vi.stubGlobal("innerHeight", 800); vi.stubGlobal("scrollY", 600);
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
  function Harness() { return createElement("video", { ref: useScrubbedVideo() }); }
  const view = render(createElement(Harness));
  const video = view.container.querySelector("video");
  video.dispatchEvent(new Event("canplay"));
  frame(0); frame(350); decoded(video);
  return { view, video };
}

it("recalculates on desktop height-only resize without another scroll", () => {
  touch = false;
  const { video, view } = mountVideo(); expect(video.currentTime).toBe(60);
  vi.stubGlobal("innerHeight", 400); window.dispatchEvent(new Event("resize")); frame(400);
  expect(video.currentTime).toBe(45);
  window.dispatchEvent(new Event("resize")); view.unmount();
  expect(frames.size).toBe(0);
});

it("ignores touch toolbar height changes but recalculates after rotation", () => {
  const { video } = mountVideo(); expect(video.currentTime).toBe(60);
  vi.stubGlobal("innerHeight", 400); window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new Event("scroll")); frame(400); frame(750); decoded(video);
  expect(video.currentTime).toBe(60);
  vi.stubGlobal("innerWidth", 800); window.dispatchEvent(new Event("resize"));
  frame(800); frame(1150); decoded(video);
  expect(video.currentTime).toBe(45); expect(frames.size).toBe(0);
});

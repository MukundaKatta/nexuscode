import { describe, it, expect } from "vitest";
import { Nexuscode } from "../src/core.js";
describe("Nexuscode", () => {
  it("init", () => { expect(new Nexuscode().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Nexuscode(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Nexuscode(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});

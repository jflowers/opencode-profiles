import { describe, it, expect, vi, afterEach } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { readMarker, writeMarker } from "../lib/marker.js";
import { createTempDir } from "./test-helpers.js";

// ── readMarker ───────────────────────────────────────────────────────

describe("readMarker", () => {
  let testDir: string;

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("should return the profile name from an existing marker file", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "anthropic");

    const result = await readMarker(markerPath);

    expect(result).toBe("anthropic");
  });

  it("should trim whitespace from the marker content", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "  openai  \n");

    const result = await readMarker(markerPath);

    expect(result).toBe("openai");
  });

  it("should return null when marker file does not exist", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");

    const result = await readMarker(markerPath);

    expect(result).toBeNull();
  });

  it("should return null when marker file is empty or whitespace-only", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "   \n  ");

    const result = await readMarker(markerPath);

    expect(result).toBeNull();
  });

  it("should return null when marker contains path traversal (../)", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "../etc/passwd");

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await readMarker(markerPath);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Profile plugin:"),
    );

    consoleSpy.mockRestore();
  });

  it("should return null when marker contains a forward slash", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "evil/profile");

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await readMarker(markerPath);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Profile plugin:"),
    );

    consoleSpy.mockRestore();
  });

  it("should return null when marker contains dots (not in allowlist)", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "my.profile");

    const result = await readMarker(markerPath);

    expect(result).toBeNull();
  });

  it("should return the name when marker contains hyphens and underscores", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "my-profile_v2");

    const result = await readMarker(markerPath);

    expect(result).toBe("my-profile_v2");
  });

  it("should return null when marker contains null bytes", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "safe\0evil");

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await readMarker(markerPath);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Profile plugin:"),
    );

    consoleSpy.mockRestore();
  });
});

// ── writeMarker ──────────────────────────────────────────────────────

describe("writeMarker", () => {
  let testDir: string;

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("should write a profile name to a new marker file", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");

    await writeMarker(markerPath, "anthropic");

    const content = await readMarker(markerPath);
    expect(content).toBe("anthropic");
  });

  it("should overwrite an existing marker file", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");
    await writeFile(markerPath, "anthropic");

    await writeMarker(markerPath, "openai");

    const content = await readMarker(markerPath);
    expect(content).toBe("openai");
  });

  it("should reject an invalid profile name", async () => {
    testDir = await createTempDir();
    const markerPath = join(testDir, ".current-profile");

    await expect(writeMarker(markerPath, "../malicious")).rejects.toThrow();

    await expect(writeMarker(markerPath, "spaces not allowed")).rejects.toThrow();
  });
});

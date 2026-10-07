import { describe, it, expect, afterEach } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { discoverProfiles, loadProfile, tryLoadProfile } from "../lib/profiles.js";
import { createTempDir } from "./test-helpers.js";

// ── discoverProfiles ─────────────────────────────────────────────────

describe("discoverProfiles", () => {
  let testDir: string;

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("should return profile options for .jsonc files in the directory", async () => {
    testDir = await createTempDir();
    await writeFile(join(testDir, "anthropic.jsonc"), '{"model":"anthropic/claude-opus-4-6"}');
    await writeFile(join(testDir, "openai.jsonc"), '{"model":"openai/gpt-4o"}');
    // Non-jsonc file should be ignored
    await writeFile(join(testDir, "readme.md"), "# Profiles");

    const result = await discoverProfiles(testDir);

    expect(result).toHaveLength(2);
    expect(result.map((o) => o.name).sort()).toEqual(["anthropic", "openai"]);
    for (const option of result) {
      expect(option.path).toBe(join(testDir, `${option.name}.jsonc`));
      expect(option.isCurrent).toBe(false);
    }
  });

  it("should return empty array when directory has no .jsonc files", async () => {
    testDir = await createTempDir();
    await writeFile(join(testDir, "readme.md"), "# Profiles");

    const result = await discoverProfiles(testDir);

    expect(result).toEqual([]);
  });

  it("should return empty array when directory is empty", async () => {
    testDir = await createTempDir();

    const result = await discoverProfiles(testDir);

    expect(result).toEqual([]);
  });

  it("should return empty array when directory does not exist", async () => {
    const result = await discoverProfiles("/nonexistent/path/12345");

    expect(result).toEqual([]);
  });
});

// ── loadProfile ──────────────────────────────────────────────────────

describe("loadProfile", () => {
  let testDir: string;

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("should parse a valid JSONC profile file", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    const content = JSON.stringify({
      model: "anthropic/claude-opus-4-6",
      small_model: "anthropic/claude-haiku-4-5",
    });
    await writeFile(profilePath, content);

    const result = await loadProfile(profilePath);

    expect(result.model).toBe("anthropic/claude-opus-4-6");
    expect(result.small_model).toBe("anthropic/claude-haiku-4-5");
  });

  it("should parse a JSONC file with // line comments", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    const content = `{
  // This is a comment
  "model": "anthropic/claude-opus-4-6",
  // Another comment
  "small_model": "anthropic/claude-haiku-4-5"
}`;
    await writeFile(profilePath, content);

    const result = await loadProfile(profilePath);

    expect(result.model).toBe("anthropic/claude-opus-4-6");
    expect(result.small_model).toBe("anthropic/claude-haiku-4-5");
  });

  it("should parse a JSONC file with /* block comments */", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    const content = `{
  /* Block comment */
  "model": "anthropic/claude-opus-4-6",
  "small_model": /* inline */ "anthropic/claude-haiku-4-5"
}`;
    await writeFile(profilePath, content);

    const result = await loadProfile(profilePath);

    expect(result.model).toBe("anthropic/claude-opus-4-6");
    expect(result.small_model).toBe("anthropic/claude-haiku-4-5");
  });

  it("should parse a profile with agent and provider", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    const content = JSON.stringify({
      model: "anthropic/claude-opus-4-6",
      agent: {
        build: { model: "anthropic/claude-haiku-4-5" },
        plan: { model: "anthropic/claude-sonnet-4-6" },
      },
      provider: {
        anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
      },
    });
    await writeFile(profilePath, content);

    const result = await loadProfile(profilePath);

    expect(result.model).toBe("anthropic/claude-opus-4-6");
    expect(result.agent).toEqual({
      build: { model: "anthropic/claude-haiku-4-5" },
      plan: { model: "anthropic/claude-sonnet-4-6" },
    });
    expect(result.provider).toBeDefined();
  });

  it("should parse an empty profile object", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    await writeFile(profilePath, "{}");

    const result = await loadProfile(profilePath);

    expect(result.model).toBeUndefined();
    expect(result.small_model).toBeUndefined();
    expect(result.agent).toBeUndefined();
    expect(result.provider).toBeUndefined();
  });

  it("should throw when file does not exist", async () => {
    await expect(loadProfile("/nonexistent/profile.jsonc")).rejects.toThrow(
      "Profile plugin: Failed to read profile file",
    );
  });

  it("should throw on invalid JSON", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    await writeFile(profilePath, "{ invalid json }");

    await expect(loadProfile(profilePath)).rejects.toThrow(
      "Profile plugin: Failed to parse JSONC",
    );
  });

  it("should throw on invalid schema (wrong types)", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    await writeFile(profilePath, '{"model": 123}');

    await expect(loadProfile(profilePath)).rejects.toThrow(
      "Profile plugin: Invalid profile schema",
    );
  });
});

// ── tryLoadProfile ───────────────────────────────────────────────────

describe("tryLoadProfile", () => {
  let testDir: string;

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("should return ProfileFile on valid file", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    await writeFile(profilePath, JSON.stringify({ model: "anthropic/claude-opus-4-6" }));

    const result = await tryLoadProfile(profilePath);

    expect(result).not.toBeNull();
    expect(result!.model).toBe("anthropic/claude-opus-4-6");
  });

  it("should return null on invalid JSON", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    await writeFile(profilePath, "{ invalid json }");

    const result = await tryLoadProfile(profilePath);

    expect(result).toBeNull();
  });

  it("should return null on invalid schema (wrong types)", async () => {
    testDir = await createTempDir();
    const profilePath = join(testDir, "test.jsonc");
    await writeFile(profilePath, '{"model": 123}');

    const result = await tryLoadProfile(profilePath);

    expect(result).toBeNull();
  });

  it("should return null when file does not exist", async () => {
    const result = await tryLoadProfile("/nonexistent/profile.jsonc");

    expect(result).toBeNull();
  });
});

// ── discoverProfiles with malformed files ────────────────────────────

describe("discoverProfiles with malformed files", () => {
  let testDir: string;

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("should skip invalid JSON profiles and return only valid ones", async () => {
    testDir = await createTempDir();
    await writeFile(join(testDir, "valid.jsonc"), JSON.stringify({ model: "openai/gpt-4o" }));
    await writeFile(join(testDir, "broken.jsonc"), "{ not valid json }");

    const result = await discoverProfiles(testDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("valid");
  });

  it("should skip profiles with wrong schema and return only valid ones", async () => {
    testDir = await createTempDir();
    await writeFile(join(testDir, "valid.jsonc"), JSON.stringify({ model: "openai/gpt-4o" }));
    await writeFile(join(testDir, "bad-schema.jsonc"), '{"model": 123}');

    const result = await discoverProfiles(testDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("valid");
  });

  it("should return only valid profiles when mixed with invalid ones", async () => {
    testDir = await createTempDir();
    await writeFile(join(testDir, "first.jsonc"), JSON.stringify({ model: "openai/gpt-4o" }));
    await writeFile(join(testDir, "broken.jsonc"), "{ not valid }");
    await writeFile(join(testDir, "bad-schema.jsonc"), '{"model": 123}');
    await writeFile(join(testDir, "second.jsonc"), JSON.stringify({ model: "anthropic/claude-opus-4-6" }));

    const result = await discoverProfiles(testDir);

    expect(result).toHaveLength(2);
    const names = result.map((o) => o.name).sort();
    expect(names).toEqual(["first", "second"]);
  });

  it("should return empty array when all profiles are invalid", async () => {
    testDir = await createTempDir();
    await writeFile(join(testDir, "broken.jsonc"), "{ not valid }");
    await writeFile(join(testDir, "bad-schema.jsonc"), '{"model": 123}');

    const result = await discoverProfiles(testDir);

    expect(result).toEqual([]);
  });
});
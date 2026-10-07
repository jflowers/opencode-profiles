import { describe, it, expect } from "vitest";
import { ProfileFileSchema, ProfileOptionSchema } from "../lib/schemas.js";

// ── ProfileFileSchema ────────────────────────────────────────────────

describe("ProfileFileSchema", () => {
  it("should accept a full valid profile", () => {
    const input = {
      model: "anthropic/claude-opus-4-6",
      small_model: "anthropic/claude-haiku-4-5",
      agent: {
        build: { model: "anthropic/claude-haiku-4-5" },
        plan: { model: "anthropic/claude-sonnet-4-6" },
      },
      provider: {
        anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
      },
    };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept a profile with only model", () => {
    const input = { model: "openai/gpt-4o" };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept a profile with only small_model", () => {
    const input = { small_model: "openai/gpt-4o-mini" };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept a profile with only agent", () => {
    const input = {
      agent: {
        general: { model: "anthropic/claude-sonnet-4-6" },
      },
    };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept a profile with only provider", () => {
    const input = {
      provider: {
        openai: { options: { apiKey: "{env:OPENAI_API_KEY}" } },
      },
    };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept an empty object (all fields optional)", () => {
    const input = {};
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject a profile with wrong model type (number)", () => {
    const input = { model: 123 };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject a profile with wrong agent type (array)", () => {
    const input = { agent: [{ name: "build", model: "x" }] };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject unknown fields due to .strict()", () => {
    const input = {
      model: "anthropic/claude-opus-4-6",
      extraField: "should be rejected",
    };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept agent entry without model (model is optional)", () => {
    const input = {
      agent: {
        build: {},
      },
    };
    const result = ProfileFileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ── ProfileOptionSchema ──────────────────────────────────────────────

describe("ProfileOptionSchema", () => {
  it("should accept a valid profile option", () => {
    const input = {
      name: "anthropic",
      path: "/home/user/.config/opencode/profiles/anthropic.jsonc",
      isCurrent: true,
    };
    const result = ProfileOptionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept a dormant profile option", () => {
    const input = {
      name: "openai",
      path: "/home/user/.config/opencode/profiles/openai.jsonc",
      isCurrent: false,
    };
    const result = ProfileOptionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject a profile option missing name", () => {
    const input = {
      path: "/some/path.jsonc",
      isCurrent: false,
    };
    const result = ProfileOptionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject a profile option with wrong isCurrent type", () => {
    const input = {
      name: "test",
      path: "/some/path.jsonc",
      isCurrent: "yes",
    };
    const result = ProfileOptionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

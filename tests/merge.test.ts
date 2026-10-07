import { describe, it, expect } from "vitest";
import { mergeConfig, type OpenCodeConfig } from "../lib/merge.js";
import type { ProfileFile } from "../lib/schemas.js";

// ── mergeConfig ──────────────────────────────────────────────────────

describe("mergeConfig", () => {
  it("should override model when profile has model", () => {
    const base: OpenCodeConfig = { model: "openai/gpt-4o" };
    const profile: ProfileFile = { model: "anthropic/claude-opus-4-6" };

    const result = mergeConfig(base, profile);

    expect(result.model).toBe("anthropic/claude-opus-4-6");
  });

  it("should override small_model when profile has small_model", () => {
    const base: OpenCodeConfig = { small_model: "openai/gpt-4o-mini" };
    const profile: ProfileFile = { small_model: "anthropic/claude-haiku-4-5" };

    const result = mergeConfig(base, profile);

    expect(result.small_model).toBe("anthropic/claude-haiku-4-5");
  });

  it("should not override model when profile does not have model", () => {
    const base: OpenCodeConfig = { model: "openai/gpt-4o" };
    const profile: ProfileFile = { small_model: "anthropic/claude-haiku-4-5" };

    const result = mergeConfig(base, profile);

    expect(result.model).toBe("openai/gpt-4o");
    expect(result.small_model).toBe("anthropic/claude-haiku-4-5");
  });

  it("should shallow-merge agent entries", () => {
    const base: OpenCodeConfig = {
      agent: {
        build: { model: "openai/gpt-4o-mini" },
        plan: { model: "openai/gpt-4o" },
      },
    };
    const profile: ProfileFile = {
      agent: {
        build: { model: "anthropic/claude-haiku-4-5" },
        explore: { model: "anthropic/claude-sonnet-4-6" },
      },
    };

    const result = mergeConfig(base, profile);

    // Overridden agent
    expect(result.agent?.build?.model).toBe("anthropic/claude-haiku-4-5");
    // Preserved agent (not in profile)
    expect(result.agent?.plan?.model).toBe("openai/gpt-4o");
    // New agent from profile
    expect(result.agent?.explore?.model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("should shallow-merge provider entries", () => {
    const base: OpenCodeConfig = {
      provider: {
        openai: { options: { apiKey: "{env:OPENAI_API_KEY}" } },
      },
    };
    const profile: ProfileFile = {
      provider: {
        anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
      },
    };
    const result = mergeConfig(base, profile);

    expect(result.provider).toEqual({
      openai: { options: { apiKey: "{env:OPENAI_API_KEY}" } },
      anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
    });
  });

  it("should override existing provider with profile provider", () => {
    const base: OpenCodeConfig = {
      provider: {
        anthropic: { options: { apiKey: "{env:OLD_KEY}" } },
      },
    };
    const profile: ProfileFile = {
      provider: {
        anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
      },
    };

    const result = mergeConfig(base, profile);

    expect(result.provider).toEqual({
      anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
    });
  });

  it("should be a no-op for an empty profile", () => {
    const base: OpenCodeConfig = {
      model: "openai/gpt-4o",
      small_model: "openai/gpt-4o-mini",
      agent: {
        build: { model: "openai/gpt-4o-mini" },
      },
    };
    const profile: ProfileFile = {};

    const result = mergeConfig(base, profile);

    expect(result).toEqual(base);
  });

  it("should not mutate the original base config", () => {
    const base: OpenCodeConfig = { model: "openai/gpt-4o" };
    const profile: ProfileFile = { model: "anthropic/claude-opus-4-6" };

    mergeConfig(base, profile);

    // Original should be unchanged
    expect(base.model).toBe("openai/gpt-4o");
  });

  it("should preserve extra fields from base config", () => {
    const base: OpenCodeConfig = {
      model: "openai/gpt-4o",
      plugins: { somePlugin: true },
      experimental: { featureX: true },
    };
    const profile: ProfileFile = { model: "anthropic/claude-opus-4-6" };

    const result = mergeConfig(base, profile);

    expect(result.model).toBe("anthropic/claude-opus-4-6");
    expect(result.plugins).toEqual({ somePlugin: true });
    expect(result.experimental).toEqual({ featureX: true });
  });

  it("should handle base config with no agent field", () => {
    const base: OpenCodeConfig = { model: "openai/gpt-4o" };
    const profile: ProfileFile = {
      agent: {
        build: { model: "anthropic/claude-haiku-4-5" },
      },
    };

    const result = mergeConfig(base, profile);

    expect(result.agent).toEqual({
      build: { model: "anthropic/claude-haiku-4-5" },
    });
  });

  it("should handle base config with no provider field", () => {
    const base: OpenCodeConfig = { model: "openai/gpt-4o" };
    const profile: ProfileFile = {
      provider: {
        anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
      },
    };

    const result = mergeConfig(base, profile);

    expect(result.provider).toEqual({
      anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
    });
  });

  it("should apply full profile merge (model + agent + provider)", () => {
    const base: OpenCodeConfig = {
      model: "openai/gpt-4o",
      small_model: "openai/gpt-4o-mini",
      agent: {
        build: { model: "openai/gpt-4o-mini" },
        plan: { model: "openai/gpt-4o" },
      },
      provider: {
        openai: { options: { apiKey: "{env:OPENAI_API_KEY}" } },
      },
    };
    const profile: ProfileFile = {
      model: "anthropic/claude-opus-4-6",
      small_model: "anthropic/claude-haiku-4-5",
      agent: {
        build: { model: "anthropic/claude-haiku-4-5" },
        plan: { model: "anthropic/claude-sonnet-4-6" },
        explore: { model: "anthropic/claude-sonnet-4-6" },
        general: { model: "anthropic/claude-opus-4-6" },
      },
      provider: {
        anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
      },
    };

    const result = mergeConfig(base, profile);

    expect(result.model).toBe("anthropic/claude-opus-4-6");
    expect(result.small_model).toBe("anthropic/claude-haiku-4-5");
    expect(result.agent).toEqual({
      build: { model: "anthropic/claude-haiku-4-5" },
      plan: { model: "anthropic/claude-sonnet-4-6" },
      explore: { model: "anthropic/claude-sonnet-4-6" },
      general: { model: "anthropic/claude-opus-4-6" },
    });
    expect(result.provider).toEqual({
      openai: { options: { apiKey: "{env:OPENAI_API_KEY}" } },
      anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
    });
  });

  describe("prototype pollution filter", () => {
    it("should reject __proto__ keys", () => {
      const base = {};
      const profile: ProfileFile = {
        name: "test",
        version: "1",
        model: {},
        small_model: {},
        agent: { __proto__: { model: "evil" } },
        provider: {},
      };

      const result = mergeConfig(base, profile);
      expect(result.agent).not.toHaveProperty("__proto__");
      expect(Object.keys(result.agent ?? {}).length).toBe(0);
    });

    it("should reject constructor keys", () => {
      const base = {};
      const profile: ProfileFile = {
        name: "test",
        version: "1",
        model: {},
        small_model: {},
        agent: { constructor: { model: "evil" } },
        provider: {},
      };

      const result = mergeConfig(base, profile);
      expect(result.agent).not.toHaveProperty("constructor");
      expect(Object.keys(result.agent ?? {}).length).toBe(0);
    });

    it("should reject prototype keys", () => {
      const base = {};
      const profile: ProfileFile = {
        name: "test",
        version: "1",
        model: {},
        small_model: {},
        agent: { prototype: { model: "evil" } },
        provider: {},
      };

      const result = mergeConfig(base, profile);
      expect(result.agent).not.toHaveProperty("prototype");
      expect(Object.keys(result.agent ?? {}).length).toBe(0);
    });

    it("should reject __proto__ keys inside provider options", () => {
      const base = {};
      const profile: ProfileFile = {
        name: "test",
        version: "1",
        model: {},
        small_model: {},
        agent: {},
        provider: {
          openai: { options: { __proto__: "evil", apiKey: "{env:OPENAI_API_KEY}" } },
        },
      };

      const result = mergeConfig(base, profile);
      const prov = result.provider as Record<string, unknown>;
      const opts = (prov.openai as Record<string, unknown>).options as Record<string, unknown>;
      expect(opts).not.toHaveProperty("__proto__");
      expect(opts).toHaveProperty("apiKey");
      expect(Object.keys(opts).length).toBe(1);
    });
  });
});
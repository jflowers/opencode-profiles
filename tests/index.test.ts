import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

// Mock the library modules so we can control their return values.
vi.mock("../lib/marker.js", () => ({
  readMarker: vi.fn(),
  resolveProfilePath: vi.fn(),
}));

vi.mock("../lib/profiles.js", () => ({
  loadProfile: vi.fn(),
}));

vi.mock("../lib/merge.js", async () => {
  const actual = await vi.importActual<typeof import("../lib/merge.js")>(
    "../lib/merge.js",
  );
  return {
    ...actual,
    mergeConfig: vi.fn(),
  };
});

import { readMarker, resolveProfilePath } from "../lib/marker.js";
import { loadProfile } from "../lib/profiles.js";
import { mergeConfig, type OpenCodeConfig } from "../lib/merge.js";

const readMarkerMock = vi.mocked(readMarker);
const resolveProfilePathMock = vi.mocked(resolveProfilePath);
const loadProfileMock = vi.mocked(loadProfile);
const mergeConfigMock = vi.mocked(mergeConfig);

// We import the plugin dynamically after mocks are set up so that
// the module-level constants (PROFILES_DIR, MARKER_PATH) resolve
// with the mocks already in place.
import profileSwitcher from "../index.js";

// ── Helpers ──────────────────────────────────────────────────────────

async function invokeConfigHook(
  config?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const inputConfig = { ...(config ?? { model: "openai/gpt-4o" }) };
  const plugin = await profileSwitcher({} as Parameters<typeof profileSwitcher>[0]);
  await plugin.config(inputConfig);
  return inputConfig;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("profile-switcher server plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("config hook", () => {
    it("should mutate config with profile values when marker is present and profile is valid", async () => {
      const profile = {
        model: "anthropic/claude-opus-4-6",
        small_model: "anthropic/claude-haiku-4-5",
      };

      readMarkerMock.mockResolvedValue("anthropic");
      resolveProfilePathMock.mockResolvedValue("/fake/path/anthropic.jsonc");
      loadProfileMock.mockResolvedValue(profile);
      // mergeConfig returns a new object with merged values.
      mergeConfigMock.mockImplementation(
        (base: OpenCodeConfig) =>
          ({ ...base, ...profile }) as OpenCodeConfig,
      );

      const config = await invokeConfigHook();

      expect(readMarkerMock).toHaveBeenCalledOnce();
      expect(resolveProfilePathMock).toHaveBeenCalledOnce();
      expect(loadProfileMock).toHaveBeenCalledOnce();
      expect(mergeConfigMock).toHaveBeenCalledOnce();
      expect(config.model).toBe("anthropic/claude-opus-4-6");
      expect(config.small_model).toBe("anthropic/claude-haiku-4-5");
    });

    it("should leave config unchanged when marker is missing", async () => {
      readMarkerMock.mockResolvedValue(null);

      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.model).toBe("openai/gpt-4o");
      expect(resolveProfilePathMock).not.toHaveBeenCalled();
      expect(loadProfileMock).not.toHaveBeenCalled();
      expect(mergeConfigMock).not.toHaveBeenCalled();
    });

    it("should leave config unchanged when marker is present but profile path resolution fails", async () => {
      readMarkerMock.mockResolvedValue("missing-profile");
      resolveProfilePathMock.mockRejectedValue(
        new Error("Profile plugin: Profile \"missing-profile\" not found"),
      );

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.model).toBe("openai/gpt-4o");
      expect(resolveProfilePathMock).toHaveBeenCalledOnce();
      expect(loadProfileMock).not.toHaveBeenCalled();
      expect(mergeConfigMock).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Profile plugin:"),
      );

      consoleSpy.mockRestore();
    });

    it("should leave config unchanged when marker is present but profile load fails", async () => {
      readMarkerMock.mockResolvedValue("bad-profile");
      resolveProfilePathMock.mockResolvedValue("/fake/path/bad-profile.jsonc");
      loadProfileMock.mockRejectedValue(
        new Error("Profile plugin: Invalid profile schema"),
      );

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.model).toBe("openai/gpt-4o");
      expect(resolveProfilePathMock).toHaveBeenCalledOnce();
      expect(loadProfileMock).toHaveBeenCalledOnce();
      expect(mergeConfigMock).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Profile plugin:"),
      );

      consoleSpy.mockRestore();
    });

    it("should apply model override from profile", async () => {
      const profile = { model: "anthropic/claude-opus-4-6" };

      readMarkerMock.mockResolvedValue("anthropic");
      resolveProfilePathMock.mockResolvedValue("/fake/path/anthropic.jsonc");
      loadProfileMock.mockResolvedValue(profile);
      mergeConfigMock.mockImplementation(
        (base: OpenCodeConfig) =>
          ({ ...base, ...profile }) as OpenCodeConfig,
      );

      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.model).toBe("anthropic/claude-opus-4-6");
    });

    it("should apply agent override from profile", async () => {
      const profile = {
        agent: {
          build: { model: "anthropic/claude-haiku-4-5" },
        },
      };

      readMarkerMock.mockResolvedValue("anthropic");
      resolveProfilePathMock.mockResolvedValue("/fake/path/anthropic.jsonc");
      loadProfileMock.mockResolvedValue(profile);
      mergeConfigMock.mockImplementation(
        (base: OpenCodeConfig) => ({
          ...base,
          agent: {
            ...(base.agent ?? {}),
            ...Object.fromEntries(
              Object.entries(profile.agent ?? {}).map(
                ([name, entry]) => [name, { ...entry }],
              ),
            ),
          },
        }) as unknown as OpenCodeConfig,
      );

      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.agent).toEqual({
        build: { model: "anthropic/claude-haiku-4-5" },
      });
    });

    it("should apply provider override from profile", async () => {
      const profile = {
        provider: {
          anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
        },
      };

      readMarkerMock.mockResolvedValue("anthropic");
      resolveProfilePathMock.mockResolvedValue("/fake/path/anthropic.jsonc");
      loadProfileMock.mockResolvedValue(profile);
      mergeConfigMock.mockImplementation(
        (base: OpenCodeConfig) => ({
          ...base,
          provider: {
            ...((base.provider as Record<string, unknown>) ?? {}),
            ...profile.provider,
          },
        }) as unknown as OpenCodeConfig,
      );

      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.provider).toEqual({
        anthropic: { options: { apiKey: "{env:ANTHROPIC_API_KEY}" } },
      });
    });

    it("should leave config unchanged when marker contains invalid characters", async () => {
      // readMarker returns null for invalid content (validated by allowlist in marker.ts).
      // The config hook must handle null gracefully — no crash, no profile load.
      readMarkerMock.mockResolvedValue(null);

      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.model).toBe("openai/gpt-4o");
      expect(resolveProfilePathMock).not.toHaveBeenCalled();
      expect(loadProfileMock).not.toHaveBeenCalled();
      expect(mergeConfigMock).not.toHaveBeenCalled();
    });

    it("should log error but not crash on profile load failure", async () => {
      readMarkerMock.mockResolvedValue("bad-profile");
      resolveProfilePathMock.mockResolvedValue("/fake/path/bad-profile.jsonc");
      loadProfileMock.mockRejectedValue(
        new Error("Profile plugin: Invalid profile schema"),
      );

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Should not throw.
      const config = await invokeConfigHook({ model: "openai/gpt-4o" });

      expect(config.model).toBe("openai/gpt-4o");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Profile plugin:"),
      );

      consoleSpy.mockRestore();
    });
  });
});

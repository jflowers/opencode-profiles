import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TuiPluginApi } from "@opencode-ai/plugin";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("./lib/profiles.js", () => ({
  discoverProfiles: vi.fn(),
}));

vi.mock("./lib/marker.js", () => ({
  readMarker: vi.fn(),
  writeMarker: vi.fn(),
}));

import { access } from "node:fs/promises";
import { discoverProfiles } from "./lib/profiles.js";
import { readMarker, writeMarker } from "./lib/marker.js";

const discoverProfilesMock = vi.mocked(discoverProfiles);
const readMarkerMock = vi.mocked(readMarker);
const writeMarkerMock = vi.mocked(writeMarker);
const accessMock = vi.mocked(access);

// We need to import the TUI plugin after mocks.
// The plugin module calls homedir() at module level, so we also mock os.
vi.mock("node:os", () => ({
  homedir: () => "/home/testuser",
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access: vi.fn(),
  };
});

import profileSwitcherTui from "./tui.tsx";

// ── Helpers ──────────────────────────────────────────────────────────

interface CapturedCommand {
  title: string;
  value: string;
  description?: string;
  category?: string;
  slash?: { name: string; aliases?: string[] };
  onSelect?: () => void;
}

function createMockApi(): {
  api: TuiPluginApi;
  commands: CapturedCommand[];
  toasts: Array<{
    variant: string;
    title: string;
    message: string;
    duration: number;
  }>;
  dialogElements: Array<Record<string, unknown>>;
} {
  const commands: CapturedCommand[] = [];
  const toasts: Array<{
    variant: string;
    title: string;
    message: string;
    duration: number;
  }> = [];
  const dialogElements: Array<Record<string, unknown>> = [];
  let dialogOnClose: (() => void) | undefined;

  const api = {
    command: {
      register: vi.fn(
        (cb: () => CapturedCommand[]) => {
          commands.push(...cb());
          return () => {};
        },
      ),
      trigger: vi.fn(),
      show: vi.fn(),
    },
    ui: {
      Dialog: vi.fn(),
      DialogAlert: vi.fn(),
      DialogConfirm: vi.fn(),
      DialogPrompt: vi.fn(),
      DialogSelect: vi.fn(
        (props: Record<string, unknown>) => {
          dialogElements.push(props);
          return {} as unknown;
        },
      ) as unknown as typeof vi.fn,
      Slot: vi.fn(),
      Prompt: vi.fn(),
      toast: vi.fn(
        (input: {
          variant: string;
          title: string;
          message: string;
          duration: number;
        }) => {
          toasts.push(input);
        },
      ),
      dialog: {
        replace: vi.fn(
          (render: () => unknown, onClose?: () => void) => {
            dialogOnClose = onClose;
            // Render the dialog immediately so we capture the props.
            render();
          },
        ),
        clear: vi.fn(() => {
          dialogOnClose?.();
          dialogOnClose = undefined;
        }),
        setSize: vi.fn(),
        size: "medium" as const,
        depth: 1,
        open: true,
      },
    },
    app: { version: "1.0.0" },
    state: {
      ready: true,
      config: {},
      provider: [],
      path: {
        state: "",
        config: "/home/testuser/.config/opencode/opencode.json",
        worktree: "",
        directory: "",
      },
      vcs: undefined,
      session: {
        count: () => 0,
        diff: () => [],
        todo: () => [],
        messages: () => [],
        status: () => undefined,
        permission: () => [],
        question: () => [],
      },
      part: () => [],
      lsp: () => [],
      mcp: () => [],
    },
    client: {
      config: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as TuiPluginApi["client"],
  } as unknown as TuiPluginApi;

  return { api, commands, toasts, dialogElements };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("profile-switcher TUI plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("command registration", () => {
    it("should register a /profile slash command", async () => {
      const { api, commands } = createMockApi();

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      expect(api.command.register).toHaveBeenCalledOnce();
      expect(commands.length).toBe(1);
      expect(commands[0].title).toBe("Switch Profile");
      expect(commands[0].value).toBe("/profile");
      expect(commands[0].slash?.name).toBe("profile");
      expect(commands[0].onSelect).toBeDefined();
    });
  });

  describe("profile dialog", () => {
    it("should display profiles in DialogSelect when command is triggered", async () => {
      const { api, commands, dialogElements } = createMockApi();

      const profiles = [
        { name: "anthropic", path: "/home/testuser/.config/opencode/profiles/anthropic.jsonc", isCurrent: false },
        { name: "openai", path: "/home/testuser/.config/opencode/profiles/openai.jsonc", isCurrent: false },
      ];
      discoverProfilesMock.mockResolvedValue(profiles);
      readMarkerMock.mockResolvedValue("anthropic");

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      // Trigger the command's onSelect.
      const onSelect = commands[0].onSelect;
      expect(onSelect).toBeDefined();
      onSelect!();

      // Wait for async operations to settle.
      await vi.waitFor(() => {
        expect(api.ui.dialog.replace).toHaveBeenCalled();
      });

      // Check that DialogSelect received the correct options.
      expect(dialogElements.length).toBeGreaterThan(0);
      const dialogProps = dialogElements[dialogElements.length - 1] as Record<string, unknown>;
      expect(dialogProps.title).toBe("Select Profile");

      const options = dialogProps.options as Array<{ title: string; value: { name: string } }>;
      expect(options.length).toBe(2);
      expect(options[0].title).toBe("anthropic");
      expect(options[1].title).toBe("openai");

      // Check that the active profile is marked.
      const current = dialogProps.current as { name: string; isCurrent: boolean };
      expect(current.name).toBe("anthropic");
      expect(current.isCurrent).toBe(true);
    });

    it("should show warning toast when no profiles are found", async () => {
      const { api, commands, toasts } = createMockApi();

      discoverProfilesMock.mockResolvedValue([]);
      readMarkerMock.mockResolvedValue(null);
      accessMock.mockResolvedValue(undefined);

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      commands[0].onSelect!();
      await vi.waitFor(() => {
        expect(toasts.length).toBeGreaterThan(0);
      });

      expect(toasts[0].variant).toBe("warning");
      expect(toasts[0].title).toBe("No Profiles Found");
    });

    it("should write marker and show success toast on profile selection", async () => {
      const { api, commands, dialogElements, toasts } = createMockApi();

      const profiles = [
        { name: "anthropic", path: "/home/testuser/.config/opencode/profiles/anthropic.jsonc", isCurrent: false },
        { name: "openai", path: "/home/testuser/.config/opencode/profiles/openai.jsonc", isCurrent: false },
      ];
      discoverProfilesMock.mockResolvedValue(profiles);
      readMarkerMock.mockResolvedValue("openai");
      writeMarkerMock.mockResolvedValue(undefined);

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      commands[0].onSelect!();
      await vi.waitFor(() => {
        expect(dialogElements.length).toBeGreaterThan(0);
      });

      // Simulate selecting the "anthropic" profile.
      const dialogProps = dialogElements[dialogElements.length - 1] as Record<string, unknown>;
      const onSelectCb = dialogProps.onSelect as (option: { value: { name: string; isCurrent: boolean } }) => void;

      // Reset dialog elements and toasts for the selection.
      dialogElements.length = 0;
      toasts.length = 0;

      onSelectCb({ value: { name: "anthropic", isCurrent: false } });

      // Wait for async marker write to complete.
      await vi.waitFor(() => {
        expect(writeMarkerMock).toHaveBeenCalledWith(
          expect.stringContaining(".current-profile"),
          "anthropic",
        );
      });

      await vi.waitFor(() => {
        expect(toasts.length).toBeGreaterThan(0);
      });

      expect(toasts[0].variant).toBe("success");
      expect(toasts[0].title).toBe("Profile Switched");
      expect(toasts[0].message).toContain("anthropic");

      await vi.waitFor(() => {
        expect(api.client.config.update).toHaveBeenCalledWith({});
      });
    });

    it("should do nothing when selecting the already-active profile", async () => {
      const { api, commands, dialogElements } = createMockApi();

      const profiles = [
        { name: "anthropic", path: "/home/testuser/.config/opencode/profiles/anthropic.jsonc", isCurrent: false },
      ];
      discoverProfilesMock.mockResolvedValue(profiles);
      readMarkerMock.mockResolvedValue("anthropic");

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      commands[0].onSelect!();
      await vi.waitFor(() => {
        expect(dialogElements.length).toBeGreaterThan(0);
      });

      const dialogProps = dialogElements[dialogElements.length - 1] as Record<string, unknown>;
      const onSelectCb = dialogProps.onSelect as (option: { value: { name: string; isCurrent: boolean } }) => void;

      // Selecting the already-active profile should clear the dialog without writing marker.
      onSelectCb({ value: { name: "anthropic", isCurrent: true } });

      expect(api.ui.dialog.clear).toHaveBeenCalled();
      expect(writeMarkerMock).not.toHaveBeenCalled();
    });

    it("should handle marker write failures gracefully", async () => {
      const { api, commands, dialogElements, toasts } = createMockApi();

      const profiles = [
        { name: "anthropic", path: "/home/testuser/.config/opencode/profiles/anthropic.jsonc", isCurrent: false },
      ];
      discoverProfilesMock.mockResolvedValue(profiles);
      readMarkerMock.mockResolvedValue("openai");
      writeMarkerMock.mockRejectedValue(new Error("Permission denied"));

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      commands[0].onSelect!();
      await vi.waitFor(() => {
        expect(dialogElements.length).toBeGreaterThan(0);
      });

      const dialogProps = dialogElements[dialogElements.length - 1] as Record<string, unknown>;
      const onSelectCb = dialogProps.onSelect as (option: { value: { name: string; isCurrent: boolean } }) => void;

      onSelectCb({ value: { name: "anthropic", isCurrent: false } });

      await vi.waitFor(() => {
        expect(toasts.length).toBeGreaterThan(0);
      });

      // Should show error toast, not crash.
      const errorToast = toasts.find((t) => t.variant === "error");
      expect(errorToast).toBeDefined();
      expect(errorToast!.title).toBe("Profile Switch Failed");
    });

    it("should show directory-missing toast when profiles directory does not exist", async () => {
      const { api, commands, toasts } = createMockApi();

      discoverProfilesMock.mockResolvedValue([]);
      readMarkerMock.mockResolvedValue(null);
      accessMock.mockRejectedValue(new Error("ENOENT"));

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      commands[0].onSelect!();
      await vi.waitFor(() => {
        expect(toasts.length).toBeGreaterThan(0);
      });

      expect(toasts[0].variant).toBe("warning");
      expect(toasts[0].title).toBe("Profiles Directory Missing");
      expect(toasts[0].message).toContain("does not exist");
    });

    it("should show no-profiles toast when directory exists but is empty", async () => {
      const { api, commands, toasts } = createMockApi();

      discoverProfilesMock.mockResolvedValue([]);
      readMarkerMock.mockResolvedValue(null);
      accessMock.mockResolvedValue(undefined);

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      commands[0].onSelect!();
      await vi.waitFor(() => {
        expect(toasts.length).toBeGreaterThan(0);
      });

      expect(toasts[0].variant).toBe("warning");
      expect(toasts[0].title).toBe("No Profiles Found");
    });

    it("should handle discoverProfiles errors gracefully", async () => {
      const { api, commands, toasts } = createMockApi();

      discoverProfilesMock.mockRejectedValue(new Error("Permission denied"));

      await profileSwitcherTui.tui(api, undefined, {
        id: "test",
        source: "file",
        spec: "test",
        target: "test",
        first_time: 0,
        last_time: 0,
        time_changed: 0,
        load_count: 0,
        fingerprint: "test",
        state: "first",
      });

      commands[0].onSelect!();
      await vi.waitFor(() => {
        expect(toasts.length).toBeGreaterThan(0);
      });

      expect(toasts[0].variant).toBe("error");
      expect(toasts[0].title).toBe("Profile Discovery Failed");
      expect(toasts[0].message).toContain("Permission denied");
    });
  });
});

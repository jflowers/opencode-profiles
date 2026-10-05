# OpenCode Profile Switcher Plugin

## Overview

This plugin enables seamless switching between configuration profiles using the `/profile` command. It reads `.jsonc` profile files from `~/.config/opencode/profiles/` and applies them to your current session with a smooth instance restart.

## Installation

1. Create the profile directory:
```bash
mkdir -p ~/.config/opencode/profiles
```

2. Create two plugin files in `~/.config/opencode/plugins/`:

### Server Plugin (`profile-config.ts`)
```ts
import type { Plugin } from "@opencode-ai/plugin";
import { readJson } from "@opencode-ai/core/fs";
import { join } from "path";

const PROFILE_MARKER = "~/.config/opencode/.current-profile";
const PROFILES_DIR = "~/.config/opencode/profiles";

export default (async ({ directory }) => {
  return {
    config: (cfg) => {
      try {
        const marker = Bun.file(PROFILE_MARKER).textSync().trim();
        const profilePath = join(PROFILES_DIR, `${marker}.jsonc`);
        const profile = readJson(profilePath);

        // Merge profile into config
        if (profile.model) cfg.model = profile.model;
        if (profile.small_model) cfg.small_model = profile.small_model;
        
        Object.keys(profile.agent || {}).forEach((agentName) => {
          if (!cfg.agent) cfg.agent = {};
          if (!cfg.agent[agentName]) cfg.agent[agentName] = {};
          if (profile.agent[agentName].model) {
            cfg.agent[agentName].model = profile.agent[agentName].model;
          }
        });
      } catch (e) {
        console.error("Profile plugin: Failed to load profile", e);
      }
    },
  };
}) satisfies Plugin;
```

### TUI Plugin (`profile-tui.tsx`)
```tsx
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui";
import { glob } from "@opencode-ai/core/fs";
import { join } from "path";

const PROFILES_DIR = "~/.config/opencode/profiles";
const PROFILE_MARKER = "~/.config/opencode/.current-profile";

export const tui: TuiPlugin = async (api) => {
  // Load available profiles
  const profiles = (await glob(join(PROFILES_DIR, "*.jsonc")))
    .map(f => ({
      name: f.split("/").pop()!.replace(/\.jsonc$/, ""),
      path: f
    }));

  // Get current profile
  let currentProfile = "";
  try {
    currentProfile = Bun.file(PROFILE_MARKER).textSync().trim();
  } catch {}

  // Register /profile command
  api.keymap.registerLayer({
    commands: [{
      name: "profile.switch",
      title: "Switch profile",
      category: "Config",
      slashName: "profile",
      run: () => {
        const DialogSelect = api.ui.DialogSelect;
        api.ui.dialog.replace(() => (
          <DialogSelect
            title="Select Profile"
            options={profiles.map(p => ({
              title: p.name,
              value: p.name,
              description: `Applies ${p.name} configuration`,
              current: p.name === currentProfile
            }))}
            onSelect={async (item) => {
              api.ui.dialog.clear();
              
              // Save selection
              await Bun.write(PROFILE_MARKER, item.value);
              
              // Trigger config update
              try {
                await api.client.config.update({});
                api.ui.toast.success(`Profile switched to ${item.value}`);
              } catch (e) {
                api.ui.toast.error("Failed to apply profile");
              }
            }}
          />
        ));
      },
    }],
  });
};
```

## Profile Format

Each profile file (e.g., `~/.config/opencode/profiles/anthropic.jsonc`) follows the same structure as `opencode.jsonc`:

```jsonc
{
  "model": "google-vertex-anthropic/claude-opus-4-6@default",
  "small_model": "google-vertex-anthropic/claude-haiku-4-5@20251001",
  "agent": {
    "build": { "model": "anthropic/claude-haiku-4-5" },
    "plan": { "model": "anthropic/claude-sonnet-4-6" },
    "explore": { "model": "anthropic/claude-sonnet-4-6" },
    "general": { "model": "anthropic/claude-opus-4-6" }
  },
  // Other config fields like provider settings
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

## Usage

1. Create your profile files in `~/.config/opencode/profiles/`
2. Type `/profile` in OpenCode
3. Select a profile from the menu
4. The instance will restart automatically with the new configuration

> **Note**: The brief restart (1-2 seconds) is required for configuration changes to take effect, but the TUI remains connected throughout.
import { access } from "node:fs/promises";

import type { TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin";

import {
  discoverProfiles,
} from "./lib/profiles.js";
import { readMarker, writeMarker } from "./lib/marker.js";
import type { ProfileOption } from "./lib/schemas.js";
import { PROFILES_DIR, MARKER_PATH } from "./lib/paths.js";
import { getErrorMessage } from "./lib/errors.js";

// ── TUI plugin ───────────────────────────────────────────────────────

/**
 * Profile Switcher TUI plugin.
 *
 * Registers a `/profile` slash command that presents a dialog to
 * switch between discovered configuration profiles. The active profile
 * is indicated via a `.current-profile` marker file.
 *
 * @param api - TUI plugin API surface.
 */
async function tui(api: TuiPluginApi): Promise<void> {
  // Register the /profile slash command.
  api.command.register(() => [
    {
      title: "Switch Profile",
      value: "/profile",
      description: "Switch to a different configuration profile",
      category: "Configuration",
      slash: { name: "profile" },
      onSelect: () => {
        void (async () => {
          // Discover available profiles and determine which is active.
          let profiles: ProfileOption[];
          try {
            profiles = await discoverProfiles(PROFILES_DIR);
          } catch (error: unknown) {
            api.ui.toast({
              variant: "error",
              title: "Profile Discovery Failed",
              message: `Could not discover profiles: ${getErrorMessage(error)}`,
              duration: 5000,
            });
            return;
          }
          const activeName = await readMarker(MARKER_PATH);

          // Mark the active profile in the option list.
          const options: ProfileOption[] = profiles.map((p) => ({
            ...p,
            isCurrent: p.name === activeName,
          }));

          const activeProfile = options.find((p) => p.isCurrent);

          // If no profiles found, show a toast and skip the dialog.
          if (options.length === 0) {
            const dirExists = await access(PROFILES_DIR).then(() => true).catch(() => false);

            if (!dirExists) {
              api.ui.toast({
                variant: "warning",
                title: "Profiles Directory Missing",
                message: `Profiles directory does not exist. Create ${PROFILES_DIR} and add .jsonc profile files.`,
                duration: 5000,
              });
            } else {
              api.ui.toast({
                variant: "warning",
                title: "No Profiles Found",
                message: `No .jsonc files found in ${PROFILES_DIR}. Create a profile file to get started.`,
                duration: 5000,
              });
            }
            return;
          }

          // Open the profile selection dialog.
          api.ui.dialog.replace(() =>
            api.ui.DialogSelect<ProfileOption>({
              title: "Select Profile",
              options: options.map((opt) => ({
                title: opt.name,
                value: opt,
                description: opt.path,
              })),
              current: activeProfile,
              onSelect: (selected) => {
                const chosen = selected.value;

                // If the selected profile is already active, do nothing.
                if (chosen.isCurrent) {
                  api.ui.dialog.clear();
                  return;
                }

                void (async () => {
                  try {
                    // Persist the selection to the marker file.
                    await writeMarker(MARKER_PATH, chosen.name);

                    // Trigger config reload for immediate effect.
                    try {
                      await api.client.config.update({});
                    } catch {
                      // Config update unavailable — profile will take effect on next restart.
                    }

                    // Notify the user.
                    api.ui.toast({
                      variant: "success",
                      title: "Profile Switched",
                      message: `Switched to "${chosen.name}". Configuration will reload.`,
                      duration: 5000,
                    });

                    // Close the dialog.
                    api.ui.dialog.clear();
                  } catch (error: unknown) {
                    api.ui.toast({
                      variant: "error",
                      title: "Profile Switch Failed",
                      message: `Could not switch profile: ${getErrorMessage(error)}`,
                      duration: 5000,
                    });
                  }
                })();
              },
            }),
          );
        })();
      },
    },
  ]);
}

// ── Module export ────────────────────────────────────────────────────

const plugin: TuiPluginModule = { tui };
export default plugin;

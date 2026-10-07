import { homedir } from "node:os";
import { join } from "node:path";

/** Absolute path to the directory containing .jsonc profile files. */
export const PROFILES_DIR = join(homedir(), ".config", "opencode", "profiles");
/** Absolute path to the file storing the currently active profile name. */
export const MARKER_PATH = join(homedir(), ".config", "opencode", ".current-profile");

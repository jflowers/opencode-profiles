import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

export async function createTempDir(): Promise<string> {
  const dir = join(tmpdir(), `profile-test-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

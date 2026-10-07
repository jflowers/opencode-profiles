import { z } from "zod";

const AgentEntrySchema = z.object({
  model: z.string().optional(),
}).strict();

const ProviderEntrySchema = z.strictObject({
  options: z.record(
    z.string(),
    z.string().regex(/^\{env:[A-Z_][A-Z0-9_]*\}$/, "Provider option values must use {env:VAR_NAME} references"),
  ).optional(),
});

export const ProfileFileSchema = z.object({
  model: z.string().optional(),
  small_model: z.string().optional(),
  agent: z.record(z.string(), AgentEntrySchema).optional(),
  provider: z.record(z.string(), ProviderEntrySchema).optional(),
}).strict();

export type ProfileFile = z.infer<typeof ProfileFileSchema>;

export const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export const ProfileOptionSchema = z.object({
  name: z.string().min(1).regex(PROFILE_NAME_PATTERN),
  path: z.string().min(1),
  isCurrent: z.boolean(),
});

export type ProfileOption = z.infer<typeof ProfileOptionSchema>;


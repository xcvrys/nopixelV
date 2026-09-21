import { REPOSITORY_PIPES_BASE } from "./definitions";
import type { PipeDefinition } from "./types";

export const REPOSITORY_PIPES: PipeDefinition[] = REPOSITORY_PIPES_BASE;

const PIPES_BY_ID: Record<string, PipeDefinition> = Object.fromEntries(
  REPOSITORY_PIPES.map((pipe) => [pipe.id, pipe]),
);

export function getPipe(id: string): PipeDefinition | undefined {
  return PIPES_BY_ID[id];
}

export type { PipeDefinition, PipeGeometry, PipeLength, Port, ResourceType } from "./types";

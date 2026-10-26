/**
 * Shot registry. A shot is a self-contained, reusable scene component with a
 * typed props schema and a default duration. Episodes compose shots; they never
 * create new animation code ad hoc.
 */
import type { ZodType } from 'zod';
import type { ShotComponent } from './theme';
import type { ShotCategory } from '../shots/catalog';

export type ShotDefinition<TProps> = {
  id: string;
  label: string;
  category: ShotCategory;
  description: string;
  /** Frames at 30fps; the composition scales this by fps at render time. */
  defaultDurationInFrames: number;
  schema: ZodType<TProps>;
  component: ShotComponent<TProps>;
  /** Props guidance shown in docs and read by the script skill. */
  hints?: string;
};

const registry = new Map<string, ShotDefinition<Record<string, unknown>>>();

export function registerShot<TProps>(definition: ShotDefinition<TProps>): ShotDefinition<TProps> {
  if (registry.has(definition.id)) {
    throw new Error(`Shot "${definition.id}" registered twice`);
  }
  registry.set(definition.id, definition as unknown as ShotDefinition<Record<string, unknown>>);
  return definition;
}

export function getShot(id: string): ShotDefinition<Record<string, unknown>> | undefined {
  return registry.get(id);
}

export function listShots(): ShotDefinition<Record<string, unknown>>[] {
  return [...registry.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id),
  );
}

export function listShotIds(): string[] {
  return [...registry.keys()].sort();
}

/**
 * Transition registry. Episodes name a transition; this maps it to a
 * presentation. The set is deliberately small — a studio should have a
 * signature set of cuts, not a menu of thirty.
 */
import * as fadeP from '@remotion/transitions/fade';
import * as wipeP from '@remotion/transitions/wipe';
import * as slideP from '@remotion/transitions/slide';
import * as flipP from '@remotion/transitions/flip';
import * as clockP from '@remotion/transitions/clock-wipe';
import type { TransitionPresentation } from '@remotion/transitions';

// The presentation generics are structural; a single widened alias keeps the
// registry readable without leaking five different prop shapes outward.
type AnyPresentation = TransitionPresentation<Record<string, unknown>>;

const asAny = (value: unknown): AnyPresentation => value as AnyPresentation;

export function getPresentation(
  type: string,
  opts: { direction?: string; wipe?: string; width: number; height: number },
): AnyPresentation {
  switch (type) {
    case 'wipe':
      return asAny(wipeP.wipe({ direction: (opts.direction as 'from-left') ?? 'from-left' }));
    case 'slide':
      return asAny(slideP.slide({ direction: (opts.direction as 'from-right') ?? 'from-right' }));
    case 'flip':
      return asAny(flipP.flip({ direction: (opts.direction as 'from-bottom') ?? 'from-bottom', perspective: 1600 }));
    case 'clock-wipe':
      return asAny(clockP.clockWipe({ width: opts.width, height: opts.height }));
    case 'fade':
    default:
      return asAny(fadeP.fade({ shouldFadeOutExitingScene: true }));
  }
}

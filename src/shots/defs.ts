/**
 * Pairs each catalog entry with its React implementation and registers it.
 * Importing this module has the side effect of filling the registry.
 */
import { registerShot } from '../engine/registry';
import { SHOT_CATALOG } from './catalog';
import {
  BarChart,
  Counter,
  VsMeter,
} from './data-shots';
import {
  FootageFill,
  FootageFrame,
  FootageStrip,
} from './footage-shots';
import {
  BigStatement,
  CompareSplit,
  GridMap,
  ProcessFlow,
  TimelineBar,
} from './layout-shots';
import { BrandOpen, BrandSting, MascotShot, SubscribeCta } from './brand-shots';
import {
  EndCard,
  ListStack,
  QuoteBeat,
  StatSlam,
  TitleCard,
  WordCycle,
} from './type-shots';

const COMPONENTS: Record<string, React.FC<{ props: never; ctx: never }>> = {
  'title-card': TitleCard as never,
  'list-stack': ListStack as never,
  'stat-slam': StatSlam as never,
  'quote-beat': QuoteBeat as never,
  'word-cycle': WordCycle as never,
  'end-card': EndCard as never,
  'footage-fill': FootageFill as never,
  'footage-frame': FootageFrame as never,
  'footage-strip': FootageStrip as never,
  'compare-split': CompareSplit as never,
  'process-flow': ProcessFlow as never,
  'grid-map': GridMap as never,
  'timeline-bar': TimelineBar as never,
  'big-statement': BigStatement as never,
  'bar-chart': BarChart as never,
  counter: Counter as never,
  'vs-meter': VsMeter as never,
  'brand-open': BrandOpen as never,
  'brand-sting': BrandSting as never,
  'subscribe-cta': SubscribeCta as never,
  mascot: MascotShot as never,
};

for (const meta of SHOT_CATALOG) {
  const component = COMPONENTS[meta.id];
  if (!component) {
    throw new Error(`Shot "${meta.id}" is in the catalog but has no implementation in defs.ts`);
  }
  registerShot({
    ...meta,
    component: component as never,
  });
}

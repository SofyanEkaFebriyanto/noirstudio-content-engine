/**
 * Character sheet: all 20 Noir poses on one still.
 *
 *   npm run mascot:sheet      → out/mascot-sheet.png
 *
 * Labels are the sheet's own type, set beside the artwork. The mascot itself
 * never contains text. Pass `theme` to review the character on another theme.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Mascot } from './components/Mascot';
import { typeShotContext } from './engine/gallery-context';
import { MASCOT_POSE_LIST } from './mascot/poses';

export const MASCOT_SHEET = { width: 2400, height: 1600, columns: 5, rows: 4 } as const;

export const MascotSheet: React.FC<{ theme?: string }> = ({ theme = 'noir' }) => {
  const ctx = typeShotContext({ format: 'wide', theme, durationInFrames: 1 });
  const { colors, fonts } = ctx.theme;
  const cellW = MASCOT_SHEET.width / MASCOT_SHEET.columns;
  const cellH = MASCOT_SHEET.height / MASCOT_SHEET.rows;

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      {MASCOT_POSE_LIST.map((entry, i) => (
        <div
          key={entry.name}
          style={{
            position: 'absolute',
            left: (i % MASCOT_SHEET.columns) * cellW,
            top: Math.floor(i / MASCOT_SHEET.columns) * cellH,
            width: cellW,
            height: cellH,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mascot ctx={ctx} pose={entry.name} size={cellH * 0.8} />
          <div
            style={{
              marginTop: cellH * 0.015,
              fontFamily: fonts.mono,
              fontSize: 22,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: colors.textMuted,
            }}
          >
            {String(i + 1).padStart(2, '0')} · {entry.name}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

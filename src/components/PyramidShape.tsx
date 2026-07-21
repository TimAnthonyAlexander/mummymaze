import { Box, Stack, Tooltip } from '@mui/material';
import { Check, Lock } from 'lucide-react';
import type { Pyramid } from '../levels/pyramids';
import { displayName } from '../levels/pyramids';

export type TileState = 'locked' | 'available' | 'current' | 'completed';

interface PyramidShapeProps {
  pyramid: Pyramid;
  currentId?: string;
  unlocked: ReadonlySet<string>;
  completed: ReadonlySet<string>;
  /** Click an unlocked tile to play it. Locked tiles are inert. */
  onSelect: (id: string) => void;
  /** Edge length of a single square tile, in px. */
  tileSize?: number;
  /** Gap between tiles, in px. */
  gap?: number;
}

function tileStateOf(
  id: string,
  currentId: string | undefined,
  unlocked: ReadonlySet<string>,
  completed: ReadonlySet<string>,
): TileState {
  if (!unlocked.has(id)) return 'locked';
  if (id === currentId) return 'current';
  if (completed.has(id)) return 'completed';
  return 'available';
}

/** Visual treatment per state — solid desert palette, no gradients. */
function tileSx(state: TileState) {
  switch (state) {
    case 'completed':
      return {
        bgcolor: 'rgba(58,160,106,0.22)',
        border: '1px solid rgba(58,160,106,0.7)',
        color: 'success.main',
      };
    case 'current':
      return {
        bgcolor: 'rgba(201,154,30,0.28)',
        border: '2px solid #c99a1e',
        color: 'warning.light',
        boxShadow: '0 0 0 2px rgba(201,154,30,0.25)',
      };
    case 'available':
      return {
        bgcolor: 'background.paper',
        border: '1px solid rgba(201,154,30,0.45)',
        color: 'text.primary',
      };
    default: // locked
      return {
        bgcolor: 'rgba(120,110,80,0.10)',
        border: '1px solid rgba(150,140,110,0.25)',
        color: 'text.disabled',
      };
  }
}

/**
 * Renders a pyramid as tile rows with the apex at the TOP (rows drawn
 * apex→base by reversing the base→apex data). Each tile shows its 1-based number
 * within the pyramid plus a state glyph; unlocked tiles are clickable.
 */
export function PyramidShape({
  pyramid,
  currentId,
  unlocked,
  completed,
  onSelect,
  tileSize = 44,
  gap = 8,
}: PyramidShapeProps) {
  const rowsTopDown = [...pyramid.rows].reverse(); // apex first
  const flatBaseToApex = pyramid.rows.flat();
  const numberOf = (id: string) => flatBaseToApex.indexOf(id) + 1;
  const glyphSize = Math.round(tileSize * 0.34);

  return (
    <Stack sx={{ gap: `${gap}px`, alignItems: 'center' }}>
      {rowsTopDown.map((row, rowIdx) => (
        <Stack
          key={`row-${rowIdx}`}
          direction="row"
          sx={{ gap: `${gap}px`, justifyContent: 'center' }}
        >
          {row.map((id) => {
            const state = tileStateOf(id, currentId, unlocked, completed);
            const locked = state === 'locked';
            return (
              <Tooltip
                key={id}
                title={locked ? 'Locked' : `${numberOf(id)}. ${displayName(id)}`}
                disableInteractive
              >
                <Box
                  component="button"
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && onSelect(id)}
                  aria-label={`${numberOf(id)}. ${displayName(id)}${locked ? ' (locked)' : ''}`}
                  sx={{
                    width: tileSize,
                    height: tileSize,
                    p: 0,
                    borderRadius: `${Math.max(6, Math.round(tileSize * 0.18))}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: `${Math.round(tileSize * 0.04)}px`,
                    cursor: locked ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: `${Math.round(tileSize * 0.34)}px`,
                    lineHeight: 1,
                    transition: 'transform 120ms ease, box-shadow 120ms ease',
                    '&:hover': locked
                      ? {}
                      : { transform: 'translateY(-2px)', filter: 'brightness(1.08)' },
                    ...tileSx(state),
                  }}
                >
                  {locked ? (
                    <Lock size={glyphSize} />
                  ) : (
                    <>
                      <span>{numberOf(id)}</span>
                      {state === 'completed' && <Check size={Math.round(glyphSize * 0.8)} />}
                    </>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Stack>
      ))}
    </Stack>
  );
}

'use client';

import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Swords } from 'lucide-react';
import {
  buildDamageFormula,
  formatVersatile,
  formatDetailField,
} from '@/components/character-sheet/types';
import type { FoundryItem } from '@/components/character-sheet/types';
import type { TabMutation } from '@/components/character-sheet/tabs/types';

interface ItemDetailSheetProps {
  item: FoundryItem | null;
  onClose: () => void;
  attuneMutation: TabMutation;
  doRoll: (label: string, formula: string) => Promise<void>;
  rolling: string | null;
}

export function ItemDetailSheet({
  item,
  onClose,
  attuneMutation,
  doRoll,
  rolling,
}: ItemDetailSheetProps) {
  const detailImage = item?.img
    ? `/api/relay/download?path=${encodeURIComponent(item.img)}&source=data`
    : null;

  return (
    <Sheet
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        {item && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                {detailImage && (
                  <Image
                    src={detailImage}
                    alt={item.name || ''}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <SheetTitle className="text-base">{item.name}</SheetTitle>
                  <SheetDescription>
                    {item.type === 'spell' ? (
                      <>
                        {(item.system?.level as number) === 0
                          ? 'Cantrip'
                          : `Level ${String(item.system?.level)}`}
                        {item.system?.school && ` ${String(item.system.school)}`}
                      </>
                    ) : (
                      <>
                        {item.type?.charAt(0)?.toUpperCase()}
                        {item.type?.slice(1)}
                        {(item.system as Record<string, unknown> | undefined)?.equipped &&
                          ' • Equipped'}
                      </>
                    )}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <Separator className="my-3" />

            {item.type === 'weapon' &&
              (item.system?.damage as Record<string, unknown>)?.base && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Damage
                  </div>
                  <div className="text-sm space-y-0.5">
                    <p className="flex justify-between">
                      <span>{buildDamageFormula(item) || '—'}</span>
                      <span className="text-muted-foreground">
                        {(
                          (
                            (item.system?.damage as Record<string, unknown>)
                              ?.base as Record<string, unknown>
                          )?.types as string[]
                        )?.join(', ') || ''}
                      </span>
                    </p>
                    {!!(item.system?.damage as Record<string, unknown>)?.versatile && (
                      <p className="text-muted-foreground text-xs">
                        Versatile:{' '}
                        {formatVersatile(
                          (item.system?.damage as Record<string, unknown>)?.versatile,
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}

            {item.type === 'equipment' && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Armor
                </div>
                <div className="text-sm space-y-0.5">
                  <p>
                    AC{' '}
                    {String((item.system?.armor as Record<string, unknown>)?.value || '?')}
                  </p>
                  {!!(item.system?.type as Record<string, unknown>)?.value && (
                    <p>
                      Type: {String((item.system?.type as Record<string, unknown>).value)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {item.type === 'spell' && item.system && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Details
                </div>
                <div className="text-sm space-y-1">
                  {item.system.level !== undefined && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Level</span>
                      <span>
                        {(item.system.level as number) === 0
                          ? 'Cantrip'
                          : String(item.system.level)}
                      </span>
                    </p>
                  )}
                  {item.system.school && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">School</span>
                      <span>{String(item.system.school)}</span>
                    </p>
                  )}
                  {(item.system.components as Record<string, unknown> | string) && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Components</span>
                      <span>
                        {formatDetailField(
                          (item.system.components as Record<string, unknown>)?.value ||
                            item.system.components,
                        )}
                      </span>
                    </p>
                  )}
                  {(item.system.castingTime as Record<string, unknown> | string) && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Casting Time</span>
                      <span>{formatDetailField(item.system.castingTime)}</span>
                    </p>
                  )}
                  {(item.system.range as Record<string, unknown> | string) && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Range</span>
                      <span>{formatDetailField(item.system.range)}</span>
                    </p>
                  )}
                  {(item.system.duration as Record<string, unknown> | string) && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{formatDetailField(item.system.duration)}</span>
                    </p>
                  )}
                  {(item.system.target as Record<string, unknown> | string) && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Target</span>
                      <span>{formatDetailField(item.system.target)}</span>
                    </p>
                  )}
                  {!!(
                    (item.system.damage as Record<string, unknown>)?.parts as
                      | unknown[][]
                      | undefined
                  )?.[0]?.[0] && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Damage</span>
                      <span>
                        {String(
                          (((item.system.damage as Record<string, unknown>)
                            ?.parts as unknown[][]) || [])?.[0]?.[0] ?? '',
                        )}
                      </span>
                    </p>
                  )}
                  {!!(item.system.save as Record<string, unknown>)?.ability && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Save</span>
                      <span>
                        {String(
                          (item.system.save as Record<string, unknown>).ability,
                        ).toUpperCase()}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {(item.system?.quantity as number) ? (
              <div className="mb-3 text-sm">
                <span className="text-muted-foreground">Quantity: </span>
                <span>{String(item.system?.quantity)}</span>
              </div>
            ) : null}

            {/* Attunement */}
            {(item.system?.attunement as Record<string, unknown>) && (
              <div className="mb-3">
                {(() => {
                  const att = item.system?.attunement as Record<string, unknown>;
                  const isAttunementItem =
                    typeof att === 'object'
                      ? att.required || att.value !== undefined
                      : Number(att) > 0;
                  const isAttuned = typeof att === 'object' ? !!att.value : Number(att) >= 2;
                  if (!isAttunementItem) return null;
                  return (
                    <Button
                      size="sm"
                      variant={isAttuned ? 'default' : 'outline'}
                      className="w-full"
                      disabled={attuneMutation.isPending}
                      onClick={() =>
                        attuneMutation.mutate({
                          itemName: item.name || '',
                          attuned: !isAttuned,
                        })
                      }
                    >
                      {isAttuned
                        ? 'Attuned (click to unattune)'
                        : 'Not Attuned (click to attune)'}
                    </Button>
                  );
                })()}
              </div>
            )}

            <Separator className="my-3" />
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Description
              </div>
              {(item.system?.description as Record<string, unknown>)?.value ? (
                <div
                  className="text-sm prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: (item.system?.description as Record<string, unknown>)
                      .value as string,
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">No description available.</p>
              )}
            </div>

            {item.type === 'weapon' && buildDamageFormula(item) && (
              <div className="mt-4">
                <Button
                  className="w-full"
                  size="sm"
                  disabled={rolling === `weapon-${item.name}`}
                  onClick={() =>
                    doRoll(`${item.name} damage`, buildDamageFormula(item))
                  }
                >
                  <Swords className="h-4 w-4 mr-1.5" />
                  {rolling === `weapon-${item.name}` ? 'Rolling...' : 'Roll Damage'}
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

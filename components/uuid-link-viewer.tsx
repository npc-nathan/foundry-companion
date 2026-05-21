'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { rewriteRelayContent } from '@/lib/relay-html';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2, FileText, Swords, ScrollText, Dice5 } from 'lucide-react';

const ACTOR_TYPES = ['npc', 'character', 'vehicle', 'group', 'loot', 'housing', 'robot', 'ship'];

// EntryData type reserved for future use

export default function UuidLinkViewer() {
  const [uuid, setUuid] = useState<string | null>(null);
  const open = uuid !== null;

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__openUuidViewer = (u: string) => setUuid(u);
    return () => {
      delete (window as unknown as Record<string, unknown>).__openUuidViewer;
    };
  }, []);

  const { data: rawEntry, isLoading } = useQuery({
    queryKey: ['uuid-viewer', uuid],
    queryFn: () => (uuid ? relay.getCompendiumEntry(uuid) : null),
    enabled: !!uuid,
  });

  const entryData = (rawEntry as { data?: Record<string, unknown> } | undefined)?.data;
  const entryType = String(entryData?.type || '');
  const entryName = String(entryData?.name || '');
  const entryImg = entryData?.img as string | undefined;
  const isActor = ACTOR_TYPES.includes(entryType.toLowerCase());

  function onClose() {
    setUuid(null);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{open && entryName ? entryName : 'Loading...'}</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="p-8 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading referenced entry...</span>
          </div>
        )}

        {!isLoading && entryData && (
          <div className="mt-4 space-y-4">
            {isActor ? (
              <ActorEntry uuid={uuid!} entryData={entryData} entryName={entryName} entryImg={entryImg} />
            ) : entryType.toLowerCase() === 'journalentry' ? (
              <JournalEntry
                entryName={entryName}
                entryImg={entryImg}
                pages={entryData.pages as Array<{ name?: string; text?: { content?: string } }> | undefined}
              />
            ) : entryType.toLowerCase() === 'rolltable' ? (
              <RollTableEntry
                entryName={entryName}
                entryImg={entryImg}
                entryData={entryData}
              />
            ) : (
              <ItemEntry
                entryData={entryData}
                entryName={entryName}
                entryType={entryType}
                entryImg={entryImg}
              />
            )}
          </div>
        )}

        {!isLoading && !entryData && uuid && (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Could not load this entry.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Actor rendering — embedded CharacterSheet */
function ActorEntry({ entryName }: { uuid: string; entryData: Record<string, unknown>; entryName: string; entryImg?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Swords className="h-4 w-4" />
        <span>Actor</span>
      </div>
      <p className="text-sm text-muted-foreground">{entryName}</p>
      {/* CharacterSheet is heavy — only render if directly opened */}
    </div>
  );
}

/** Journal entry rendering — title + pages */
function JournalEntry({
  entryName,
  entryImg,
  pages,
}: {
  entryName: string;
  entryImg?: string;
  pages?: Array<{ name?: string; text?: { content?: string } }>;
}) {
  const detailImage = entryImg
    ? `/api/relay/download?path=${encodeURIComponent(entryImg)}&source=data`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>Journal Entry</span>
      </div>

      {detailImage && (
        <div className="relative w-full h-40 rounded overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detailImage}
            alt={entryName}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {pages && pages.length > 0 ? (
        pages.map((page, i) => (
          <div key={i} className="space-y-2">
            {page.name && (
              <h3 className="text-base font-semibold">{page.name}</h3>
            )}
            {page.text?.content && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: rewriteRelayContent(page.text.content),
                }}
              />
            )}
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground italic">No content</p>
      )}
    </div>
  );
}

/** Roll table rendering — title + results */
function RollTableEntry({
  entryName,
  entryImg,
  entryData,
}: {
  entryName: string;
  entryImg?: string;
  entryData: Record<string, unknown>;
}) {
  const detailImage = entryImg
    ? `/api/relay/download?path=${encodeURIComponent(entryImg)}&source=data`
    : null;
  const results = entryData.results as Array<{ text?: string }> | undefined;
  const description = entryData.description as string | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Dice5 className="h-4 w-4" />
        <span>Roll Table</span>
      </div>

      {detailImage && (
        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detailImage}
            alt={entryName}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {description && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: rewriteRelayContent(description) }}
        />
      )}

      {results && results.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Results</h4>
          <ul className="text-sm space-y-1">
            {results.map((r, i) => (
              <li key={i} className="text-muted-foreground">• {r.text || 'Unnamed'}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Item rendering — icon + name + type + properties + description */
function ItemEntry({
  entryData,
  entryName,
  entryType,
  entryImg,
}: {
  entryData: Record<string, unknown>;
  entryName: string;
  entryType: string;
  entryImg?: string;
}) {
  const sys = entryData.system as Record<string, unknown> | undefined;
  const description = sys?.description as Record<string, unknown> | undefined;
  const descriptionValue = description?.value as string | undefined;
  const detailImage = entryImg
    ? `/api/relay/download?path=${encodeURIComponent(entryImg)}&source=data`
    : null;

  const typeLabel = entryType.charAt(0).toUpperCase() + entryType.slice(1);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        {detailImage && (
          <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detailImage}
              alt={entryName}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold">{entryName}</h3>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ScrollText className="h-3 w-3" />
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Properties grid */}
      {sys && <ItemProperties sys={sys} itemType={entryType.toLowerCase()} />}

      {/* Description */}
      {descriptionValue && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Description</h4>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: rewriteRelayContent(descriptionValue),
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Inline item properties extracted from system data */
function ItemProperties({ sys, itemType }: { sys: Record<string, unknown>; itemType: string }) {
  const weightObj = sys.weight as Record<string, unknown> | undefined;
  const priceObj = sys.price as Record<string, unknown> | undefined;
  const dmgObj = sys.damage as Record<string, unknown> | undefined;
  const rangeObj = sys.range as Record<string, unknown> | undefined;

  const properties: { label: string; value: string }[] = [];

  if (weightObj?.value !== undefined) {
    properties.push({
      label: 'Weight',
      value: `${String(weightObj.value)} ${String(weightObj.units || 'lb')}`,
    });
  }

  if (priceObj?.value !== undefined) {
    properties.push({
      label: 'Price',
      value: `${String(priceObj.value)} ${String(priceObj.denomination || 'gp')}`,
    });
  }

  // Spell-specific
  if (itemType === 'spell') {
    const level = (sys.level as number) ?? 0;
    const school = ((sys.school as Record<string, unknown> | undefined)?.value as string) || '';
    const duration = sys.duration as Record<string, unknown> | undefined;
    const spellRange = sys.range as Record<string, unknown> | undefined;
    const activation = sys.activation as Record<string, unknown> | undefined;
    const components = sys.components as Record<string, unknown> | undefined;

    properties.push({
      label: 'Level',
      value: level === 0 ? 'Cantrip' : String(level),
    });

    if (school) {
      properties.push({
        label: 'School',
        value: school.charAt(0).toUpperCase() + school.slice(1),
      });
    }

    if (activation?.type) {
      properties.push({
        label: 'Casting Time',
        value: `${String(activation.value || '')} ${String(activation.type)}`,
      });
    }

    if (spellRange?.value !== undefined) {
      properties.push({
        label: 'Range',
        value: `${String(spellRange.value)} ${String(spellRange.units || '')}`,
      });
    }

    if (duration?.value !== undefined) {
      properties.push({
        label: 'Duration',
        value: `${String(duration.value)} ${String(duration.units || '')}`,
      });
    }

    if (components) {
      const compStr = ['vocal', 'somatic', 'material']
        .filter((c) => (components as Record<string, unknown>)[c])
        .map((c) => c.charAt(0).toUpperCase())
        .join(', ');
      const mat = (components as Record<string, unknown>).material as string | undefined;
      properties.push({
        label: 'Components',
        value: mat ? `${compStr} (${mat})` : compStr,
      });
    }
  }

  // Weapon damage
  if (dmgObj?.base) {
    const base = dmgObj.base as Record<string, unknown>;
    const types = (base.types as string[] | undefined)?.join(', ') || '';
    properties.push({
      label: 'Damage',
      value: `${String(base.number || '')}d${String(base.denomination || '')}${base.bonus ? ` + ${base.bonus}` : ''}${types ? ` ${types}` : ''}`,
    });
  }

  // Weapon range
  if (rangeObj?.value !== undefined) {
    properties.push({
      label: 'Range',
      value: `${String(rangeObj.value)} ${String(rangeObj.units || 'ft')}`,
    });
  }

  if (properties.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      {properties.map((p) => (
        <div key={p.label} className="bg-muted rounded p-2 text-center">
          <span className="block text-muted-foreground">{p.label}</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

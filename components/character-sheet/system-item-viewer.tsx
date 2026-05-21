'use client';

import React from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { rewriteRelayContent } from '@/lib/relay-html';
import CharacterSheet from '@/components/CharacterSheet';
import { Loader2 } from 'lucide-react';

const ACTOR_TYPES = ['npc', 'character', 'vehicle', 'group', 'loot', 'housing', 'robot', 'ship'];

/**
 * Fetches a compendium entry by UUID and renders it inline:
 * - Actor → CharacterSheet
 * - Item → compact item preview (icon, name, type, properties, description)
 * - Other → null (text content shows through)
 */
export default function SystemItemViewer({ systemItemUuid }: { systemItemUuid: string }) {
  const { data: rawEntry, isLoading } = useQuery({
    queryKey: ['compendium-entry-ref', systemItemUuid],
    queryFn: () => relay.getCompendiumEntry(systemItemUuid),
    enabled: !!systemItemUuid,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading referenced entry...</span>
      </div>
    );
  }

  const entryData = (rawEntry as { data?: Record<string, unknown> } | undefined)?.data;
  if (!entryData) return null;

  const entryType = String(entryData.type || '');
  const entryName = String(entryData.name || '');
  const entryImg = entryData.img as string | undefined;
  const isActor = ACTOR_TYPES.includes(entryType.toLowerCase());

  // ── Actor → full character sheet ──
  if (isActor) {
    return (
      <div className="p-4 border-b">
        <CharacterSheet uuid={systemItemUuid} readOnly />
      </div>
    );
  }

  // ── Item → compact inline preview ──
  const sys = entryData.system as Record<string, unknown> | undefined;
  const description = sys?.description as Record<string, unknown> | undefined;
  const descriptionValue = description?.value as string | undefined;
  const detailImage = entryImg
    ? `/api/relay/download?path=${encodeURIComponent(entryImg)}&source=data`
    : null;

  // Format item type for display
  const typeLabel = entryType.charAt(0).toUpperCase() + entryType.slice(1);

  return (
    <div className="border rounded-lg mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-muted/30">
        {detailImage && (
          <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-background">
            <Image
              src={detailImage}
              alt={entryName}
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        )}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-tight">{entryName}</h4>
          <span className="text-xs text-muted-foreground">{typeLabel}</span>
        </div>
      </div>

      {/* Properties grid (optional — based on item type) */}
      {sys && (
        <ItemProperties sys={sys} itemType={entryType.toLowerCase()} />
      )}

      {/* Description */}
      {descriptionValue && (
        <div className="p-3 border-t">
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
    <div className="grid grid-cols-3 gap-2 p-3 border-t text-xs">
      {properties.map((p) => (
        <div key={p.label} className="bg-muted rounded p-2 text-center">
          <span className="block text-muted-foreground">{p.label}</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

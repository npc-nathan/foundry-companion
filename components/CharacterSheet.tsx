'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { relay } from '@/lib/relay';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { Crosshair } from 'lucide-react';
import { toast } from 'sonner';

import { useActorData } from '@/components/character-sheet/use-actor-data';
import { useActorMutations } from '@/components/character-sheet/use-actor-mutations';
import type { FoundryItem, FoundryEffect } from '@/components/character-sheet/types';
import { AttributesTab } from '@/components/character-sheet/tabs/attributes-tab';
import { CombatTab } from '@/components/character-sheet/tabs/combat-tab';
import { InventoryTab } from '@/components/character-sheet/tabs/inventory-tab';
import { SpellsTab } from '@/components/character-sheet/tabs/spells-tab';
import { FeaturesTab } from '@/components/character-sheet/tabs/features-tab';
import { EffectsTab } from '@/components/character-sheet/tabs/effects-tab';
import { ItemDetailSheet } from '@/components/character-sheet/item-detail-sheet';
import type { SheetTabProps } from '@/components/character-sheet/tabs/types';

/* ── Inner component ─────────────────────────────────────────────────────── */

function CharacterSheetInner({
  actorData,
  effectsData,
  uuid,
  readOnly,
}: {
  actorData: { data?: Record<string, unknown> };
  effectsData: { data?: FoundryEffect[] };
  uuid: string;
  readOnly?: boolean;
}) {
  const [detailItem, setDetailItem] = useState<FoundryItem | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const [, setLastRollResult] = useState<{ label: string; total: number } | null>(null);

  const data = useActorData(actorData, effectsData);
  const mutations = useActorMutations(uuid);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailItem(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const doRoll = useCallback(
    async (label: string, formula: string) => {
      setRolling(label);
      try {
        await mutations.doRoll(label, formula);
        setLastRollResult({ label, total: 0 });
      } catch (e) {
        toast.error(`Roll failed: ${String(e)}`);
      } finally {
        setRolling(null);
      }
    },
    [mutations],
  );

  const { identity } = data;

  const tabProps: SheetTabProps = {
    data,
    readOnly,
    mutations: { ...mutations, doRoll },
    rolling,
    setRolling,
    setDetailItem,
    uuid,
  };

  return (
    <div className="space-y-4">
      {/* Character Identity — always visible above tabs */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold overflow-hidden">
          {identity.img && !identity.img.includes('mystery-man') ? (
            <Image
              src={`/api/relay/download?path=${encodeURIComponent(identity.img)}&source=data`}
              alt={identity.name}
              width={56}
              height={56}
              unoptimized
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            identity.name.charAt(0).toUpperCase() || '?'
          )}
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold">{identity.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {identity.race && (
              <Badge variant="secondary" className="text-xs">
                {identity.race}
              </Badge>
            )}
            {identity.class && (
              <Badge variant="secondary" className="text-xs">
                {identity.class} {identity.level}
              </Badge>
            )}
            {!identity.class && identity.background && (
              <Badge variant="secondary" className="text-xs">
                {identity.background}
              </Badge>
            )}
            {identity.alignment && (
              <Badge variant="outline" className="text-xs">
                {identity.alignment}
              </Badge>
            )}
            {identity.size && (
              <Badge variant="outline" className="text-xs">
                {identity.size.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="attributes">
        <Tabs.List>
          <Tabs.Tab value="attributes">Attributes</Tabs.Tab>
          <Tabs.Tab value="combat">Combat</Tabs.Tab>
          <Tabs.Tab value="inventory">Inventory</Tabs.Tab>
          <Tabs.Tab value="spells">Spells</Tabs.Tab>
          <Tabs.Tab value="features">Features</Tabs.Tab>
          <Tabs.Tab value="effects">Effects</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="attributes">
          <AttributesTab {...tabProps} />
        </Tabs.Panel>

        <Tabs.Panel value="combat">
          <CombatTab {...tabProps} />
        </Tabs.Panel>

        <Tabs.Panel value="inventory">
          <InventoryTab {...tabProps} />
        </Tabs.Panel>

        <Tabs.Panel value="spells">
          <SpellsTab {...tabProps} />
        </Tabs.Panel>

        <Tabs.Panel value="features">
          <FeaturesTab {...tabProps} />
        </Tabs.Panel>

        <Tabs.Panel value="effects">
          <EffectsTab effects={data.effects} itemEffects={data.itemEffects} />
        </Tabs.Panel>
      </Tabs.Root>

      {/* Detail Sheet — controlled from any tab */}
      <ItemDetailSheet
        item={detailItem}
        onClose={() => setDetailItem(null)}
        attuneMutation={mutations.attuneMutation}
        doRoll={doRoll}
        rolling={rolling}
        readOnly={readOnly}
      />
    </div>
  );
}

/* ── Outer component (data fetching shell) ───────────────────────────────── */

export default function CharacterSheet({ uuid, isLoading, readOnly }: { uuid: string; isLoading?: boolean; readOnly?: boolean }) {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['actor', uuid],
    queryFn: () => relay.get(uuid),
    enabled: !!uuid,
  });

  const { data: effectsData } = useQuery({
    queryKey: ['effects', uuid],
    queryFn: () => relay.getActorEffects(uuid),
    enabled: !!uuid,
  });

  const isLoading_ = isLoading || loading;

  if (!uuid) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Crosshair className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-lg">Select a character to view their sheet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading_) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading character data...</p>
      </div>
    );
  }

  const dataRecord = data as { data?: { name?: string } } | undefined;
  if (!dataRecord?.data?.name) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No character data found for this actor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CharacterSheetInner
      actorData={data as { data?: Record<string, unknown> }}
      effectsData={effectsData as { data?: FoundryEffect[] }}
      uuid={uuid}
      readOnly={readOnly}
    />
  );
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { relay } from '@/lib/relay';
import { ABILITY_NAMES, SKILL_LABELS } from './types';

export function useActorMutations(uuid: string) {
  const queryClient = useQueryClient();

  const damageMutation = useMutation({
    mutationFn: (amount: number) => relay.decrease(uuid, 'system.attributes.hp.value', amount),
    onSuccess: (_data: unknown, amount: number) => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success(`Applied ${amount} damage`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const healMutation = useMutation({
    mutationFn: (amount: number) => relay.increase(uuid, 'system.attributes.hp.value', amount),
    onSuccess: (_data: unknown, amount: number) => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success(`Healed for ${amount}`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const shortRestMutation = useMutation({
    mutationFn: () => relay.dndShortRest({ actorUuid: uuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Short rest completed!');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const longRestMutation = useMutation({
    mutationFn: () => relay.dndLongRest({ actorUuid: uuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Long rest completed!');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const deathSaveMutation = useMutation({
    mutationFn: () => relay.dndDeathSave({ actorUuid: uuid, createChatMessage: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const equipMutation = useMutation({
    mutationFn: (params: { itemUuid?: string; itemName?: string; equipped: boolean }) =>
      relay.dndEquipItem({ actorUuid: uuid, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Equipment updated');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const attuneMutation = useMutation({
    mutationFn: (params: { itemName: string; attuned: boolean }) =>
      relay.dndAttuneItem({ actorUuid: uuid, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Attunement updated');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const prepareSpellMutation = useMutation({
    mutationFn: (params: { spellName: string; prepared: boolean }) =>
      relay.dndPrepareSpell({ actorUuid: uuid, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actor', uuid] });
      toast.success('Spell preparation updated');
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const abilityCheckMutation = useMutation({
    mutationFn: (ability: string) =>
      relay.dndAbilityCheck({ actorUuid: uuid, ability, createChatMessage: true }),
    onSuccess: (_data: unknown, ability: string) => {
      const d = _data as { data?: { total?: number } } | undefined;
      const total = d?.data?.total ?? '?';
      const label = ABILITY_NAMES[ability] || ability.toUpperCase();
      toast.success(`${label} Check: ${total}`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const skillCheckMutation = useMutation({
    mutationFn: (skill: string) =>
      relay.dndSkillCheck({ actorUuid: uuid, skill, createChatMessage: true }),
    onSuccess: (_data: unknown, skill: string) => {
      const d = _data as { data?: { total?: number } } | undefined;
      const total = d?.data?.total ?? '?';
      const label = SKILL_LABELS[skill] || skill;
      toast.success(`${label}: ${total}`);
    },
    onError: (err: Error) => toast.error(String(err)),
  });

  const doRoll = async (label: string, formula: string) => {
    try {
      const result = await relay.roll({ formula, createChatMessage: true });
      const r = result as
        | { data?: { roll?: { total?: number } }; roll?: { total?: number } }
        | undefined;
      const total = r?.data?.roll?.total ?? r?.roll?.total ?? '?';
      toast.success(`${label}: ${total}`);
    } catch (e) {
      toast.error(`Roll failed: ${String(e)}`);
    }
  };

  return {
    damageMutation,
    healMutation,
    shortRestMutation,
    longRestMutation,
    deathSaveMutation,
    equipMutation,
    attuneMutation,
    prepareSpellMutation,
    abilityCheckMutation,
    skillCheckMutation,
    doRoll,
  };
}

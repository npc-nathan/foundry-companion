import type { ActorData, FoundryItem } from '@/components/character-sheet/types';

// Mutations have different variable types (number, void, object, string)
// so we use a structural type that captures what the tabs actually call.
export interface TabMutation {
  isPending: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: (...args: any[]) => void;
}

export interface SheetTabProps {
  data: ActorData;
  mutations: {
    damageMutation: TabMutation;
    healMutation: TabMutation;
    shortRestMutation: TabMutation;
    longRestMutation: TabMutation;
    deathSaveMutation: TabMutation;
    equipMutation: TabMutation;
    attuneMutation: TabMutation;
    prepareSpellMutation: TabMutation;
    abilityCheckMutation: TabMutation;
    skillCheckMutation: TabMutation;
    doRoll: (label: string, formula: string) => Promise<void>;
  };
  rolling: string | null;
  setRolling: (v: string | null) => void;
  setDetailItem: (item: FoundryItem | null) => void;
  uuid: string;
}

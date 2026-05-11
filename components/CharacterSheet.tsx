'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { relay } from '@/lib/relay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Heart, Shield, Swords, Zap, Footprints, Backpack, BookOpen, Sparkles,
  Sword, Crosshair, ScrollText,
} from 'lucide-react'

function getMod(val: number): number {
  return Math.floor((val - 10) / 2)
}

function hpColor(pct: number): string {
  if (pct > 50) return 'bg-green-500'
  if (pct > 20) return 'bg-yellow-500'
  return 'bg-red-500'
}

function buildDamageFormula(item: any): string {
  const base = item?.system?.damage?.base
  if (!base) return ''
  const num = base.number || 1
  const denom = base.denomination || 4
  const bonus = base.bonus ? `+${base.bonus}` : ''
  return `${num}d${denom}${bonus}`
}

function formatVersatile(versatile: any): string {
  if (!versatile) return ''
  if (typeof versatile === 'string') return `(${versatile})`
  const num = versatile.number || 1
  const denom = versatile.denomination || 0
  const bonus = versatile.bonus ? `+${versatile.bonus}` : ''
  return denom > 0 ? `(${num}d${denom}${bonus})` : ''
}

function formatDetailField(v: any): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    const value = v.value ?? v.number ?? ''
    const units = v.units ?? ''
    return `${value}${units ? ` ${units}` : ''}`
  }
  return '—'
}

function itemIcon(type: string) {
  switch (type) {
    case 'weapon': return <Sword className="h-4 w-4" />
    case 'armor': return <Shield className="h-4 w-4" />
    case 'equipment': return <Backpack className="h-4 w-4" />
    case 'consumable': return <Zap className="h-4 w-4" />
    case 'tool': return <Swords className="h-4 w-4" />
    case 'loot': return <ScrollText className="h-4 w-4" />
    case 'feat': return <Sparkles className="h-4 w-4" />
    case 'container':
    case 'backpack': return <Backpack className="h-4 w-4" />
    default: return <Swords className="h-4 w-4" />
  }
}

function itemGroupLabel(type: string): string {
  switch (type) {
    case 'equipment': return 'Adventuring Gear'
    case 'tool': return 'Tools'
    case 'loot': return 'Loot & Treasure'
    case 'feat': return 'Features & Feats'
    case 'container':
    case 'backpack': return 'Containers'
    default: return 'Other Items'
  }
}

function itemSubtitle(item: any): string {
  const parts: string[] = []
  if (item.type === 'weapon') {
    const dmg = buildDamageFormula(item)
    if (dmg) parts.push(dmg)
    const props = item?.system?.properties || []
    const names = props.map((p: any) => typeof p === 'string' ? p : p?.name || '').filter(Boolean)
    if (names.length) parts.push(names.join(', '))
    return parts.join(' • ')
  }
  if (item.type === 'equipment' && item?.system?.armor?.value) {
    return `AC ${item.system.armor.value}${item?.system?.type?.value ? ` • ${item.system.type.value}` : ''}`
  }
  if (item?.system?.quantity) return `x${item.system.quantity}`
  return ''
}

const ABILITY_NAMES: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

const SKILL_LABELS: Record<string, string> = {
  acr: 'Acrobatics', ani: 'Animal Handling', arc: 'Arcana', ath: 'Athletics',
  dec: 'Deception', his: 'History', ins: 'Insight', int: 'Intimidation',
  inv: 'Investigation', med: 'Medicine', nat: 'Nature', 
  prc: 'Perception', prf: 'Performance', rel: 'Religion', slt: 'Sleight of Hand',
  ste: 'Stealth', sur: 'Survival',
}

const SKILL_ABILITIES: Record<string, string> = {
  acr: 'dex', ani: 'wis', arc: 'int', ath: 'str', dec: 'cha', his: 'int',
  ins: 'wis', int: 'cha', inv: 'int', med: 'wis', nat: 'int', per: 'cha',
  prc: 'wis', prf: 'cha', rel: 'int', slt: 'dex', ste: 'dex', sur: 'wis',
}

function CharacterSheetInner({ actorData, effectsData, uuid }: {
  actorData: any
  effectsData: any
  uuid: string
}) {
  const queryClient = useQueryClient()
  const [damage, setDamage] = useState('')
  const [heal, setHeal] = useState('')
  const [detailItem, setDetailItem] = useState<any>(null)
  const [rolling, setRolling] = useState<string | null>(null)
  const [lastRollResult, setLastRollResult] = useState<{ label: string; total: number } | null>(null)

  const actor: any = actorData?.data || {}
  const system: any = actor?.system || {}
  const hp: any = system?.attributes?.hp || {}
  const abilities: any = system?.abilities || {}
  const details: any = system?.details || {}
  const ac = system?.attributes?.ac || {}
  const init = system?.attributes?.init || {}
  const movement: any = system?.attributes?.movement || {}
  const items: any[] = actor?.items || []
  const spells: any = system?.spells || {}
  const skills: any = system?.skills || {}
  const resources: any = system?.resources || {}
  const traits: any = system?.traits || {}
  const currency: any = system?.currency || {}

  const hpValue = typeof hp.value === 'number' ? hp.value : 0
  const hpMax = typeof hp.max === 'number' ? hp.max : 1
  const hpTemp = typeof hp.temp === 'number' ? hp.temp : 0
  const pct = Math.round((hpValue / hpMax) * 100)
  const profBonus = Math.min(6, Math.ceil((details?.level || 0) / 4) + 1)

  const acValue = (() => {
    if (typeof ac.value === 'number') return ac.value
    if (typeof ac.flat === 'number') return ac.flat
    const dexMod = getMod(abilities?.dex?.value ?? 10)
    const equippedArmor = (items || []).filter(
      (i: any) => {
        const rawVal = i.system?.armor?.value
        const baseAC = rawVal != null ? Number(rawVal) : NaN
        const armorTypeVal = i.system?.type?.value
        return (
          i.type === 'equipment' && armorTypeVal && armorTypeVal !== 'shield' &&
          i.system?.equipped !== false && !isNaN(baseAC) && baseAC > 0
        )
      }
    ).sort((a: any, b: any) => (Number(b.system?.armor?.value) ?? 0) - (Number(a.system?.armor?.value) ?? 0))
    if (equippedArmor.length > 0) {
      const best = equippedArmor[0]
      const baseAC = Number(best.system.armor.value) || 0
      const armorType = best.system?.type?.value
      let dexCap: number | null = null
      if (armorType === 'heavy') dexCap = 0
      else if (armorType === 'medium') dexCap = Math.min(2, best.system.armor.dex ?? 2)
      const dexContrib = dexCap !== null ? Math.min(dexMod, dexCap) : dexMod
      let total = baseAC + dexContrib
      const hasShield = items.some((i: any) => i.system?.type?.value === 'shield' && i.system?.equipped !== false)
      if (hasShield) total += 2
      return total
    }
    if (ac.calc === 'natural' || ac.calc === 'default') return 10 + dexMod
    if (typeof ac.armor?.value === 'number') return ac.armor.value + dexMod
    return 10 + dexMod
  })()

  const initBonus = (() => {
    const raw = init.bonus
    if (raw !== undefined && raw !== null && raw !== '') return Number(raw)
    if (init.total !== undefined && init.total !== null && init.total !== '') return Number(init.total)
    if (init.mod !== undefined && init.mod !== null && init.mod !== '') return Number(init.mod)
    return getMod(abilities?.dex?.value ?? 10)
  })()

  // Filter items
  const weapons = items.filter((i: any) => i?.type === 'weapon')
  const armor = items.filter(
    (i: any) => i?.type === 'equipment' && (i?.system?.armor?.value || ['heavy', 'medium', 'light', 'shield'].includes(i?.system?.type?.value))
  )
  const consumables = items.filter((i: any) => i?.type === 'consumable')
  const spellItems = items.filter((i: any) => i?.type === 'spell')
  const otherItems = items.filter(
    (i: any) => !weapons.includes(i) && !armor.includes(i) && !consumables.includes(i) && !spellItems.includes(i)
  )

  // Group other items by type
  const featItems = otherItems.filter((i: any) => i?.type === 'feat')
  const toolItems = otherItems.filter((i: any) => i?.type === 'tool')
  const lootItems = otherItems.filter((i: any) => i?.type === 'loot')
  const containerItems = otherItems.filter((i: any) => i?.type === 'container' || i?.type === 'backpack')
  const gearItems = otherItems.filter((i: any) => i?.type === 'equipment' && !armor.includes(i))
  const miscItems = otherItems.filter(
    (i: any) => !featItems.includes(i) && !toolItems.includes(i) && !lootItems.includes(i) && !containerItems.includes(i) && !gearItems.includes(i)
  )

  const itemSections = [
    { label: 'Adventuring Gear', items: gearItems, icon: <Backpack className="h-4 w-4 text-amber-400" /> },
    { label: 'Tools', items: toolItems, icon: <Swords className="h-4 w-4 text-cyan-400" /> },
    { label: 'Loot & Treasure', items: lootItems, icon: <ScrollText className="h-4 w-4 text-green-400" /> },
    { label: 'Features & Feats', items: featItems, icon: <Sparkles className="h-4 w-4 text-emerald-400" /> },
    { label: 'Containers', items: containerItems, icon: <Backpack className="h-4 w-4 text-orange-400" /> },
    { label: 'Other Items', items: miscItems, icon: <Swords className="h-4 w-4 text-muted-foreground" /> },
  ].filter(s => s.items.length > 0)

  const spellSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => ({
    level: lvl,
    current: (spells as any)?.[`spell${lvl}`]?.value ?? 0,
    max: (spells as any)?.[`spell${lvl}`]?.max ?? (spells as any)?.[`spell${lvl}`]?.value ?? 0,
  }))

  // Mutations
  const damageMutation = useMutation({
    mutationFn: (amount: number) => relay.decrease(uuid, 'system.attributes.hp.value', amount),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }); setDamage(''); toast.success(`Applied ${damage} damage`) },
    onError: (err) => toast.error(String(err)),
  })

  const healMutation = useMutation({
    mutationFn: (amount: number) => relay.increase(uuid, 'system.attributes.hp.value', amount),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }); setHeal(''); toast.success(`Healed for ${heal}`) },
    onError: (err) => toast.error(String(err)),
  })

  const shortRestMutation = useMutation({
    mutationFn: () => relay.dndShortRest({ actorUuid: uuid }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }); toast.success('Short rest completed!') },
    onError: (err) => toast.error(String(err)),
  })

  const longRestMutation = useMutation({
    mutationFn: () => relay.dndLongRest({ actorUuid: uuid }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }); toast.success('Long rest completed!') },
    onError: (err) => toast.error(String(err)),
  })

  const deathSaveMutation = useMutation({
    mutationFn: () => relay.dndDeathSave({ actorUuid: uuid, createChatMessage: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }) },
    onError: (err) => toast.error(String(err)),
  })

  const equipMutation = useMutation({
    mutationFn: (params: { itemUuid?: string; itemName?: string; equipped: boolean }) =>
      relay.dndEquipItem({ actorUuid: uuid, ...params }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }); toast.success('Equipment updated') },
    onError: (err) => toast.error(String(err)),
  })

  const attuneMutation = useMutation({
    mutationFn: (params: { itemName: string; attuned: boolean }) =>
      relay.dndAttuneItem({ actorUuid: uuid, ...params }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }); toast.success('Attunement updated') },
    onError: (err) => toast.error(String(err)),
  })

  const prepareSpellMutation = useMutation({
    mutationFn: (params: { spellName: string; prepared: boolean }) =>
      relay.dndPrepareSpell({ actorUuid: uuid, ...params }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actor', uuid] }); toast.success('Spell preparation updated') },
    onError: (err) => toast.error(String(err)),
  })

  const abilityCheckMutation = useMutation({
    mutationFn: (ability: string) =>
      relay.dndAbilityCheck({ actorUuid: uuid, ability, createChatMessage: true }),
    onSuccess: (data: any, ability) => {
      const total = data?.data?.total ?? '?'
      const label = ABILITY_NAMES[ability] || ability.toUpperCase()
      setLastRollResult({ label: `${label} Check`, total: typeof total === 'number' ? total : 0 })
      toast.success(`${label} Check: ${total}`)
    },
    onError: (err) => toast.error(String(err)),
  })

  const skillCheckMutation = useMutation({
    mutationFn: (skill: string) =>
      relay.dndSkillCheck({ actorUuid: uuid, skill, createChatMessage: true }),
    onSuccess: (data: any, skill) => {
      const total = data?.data?.total ?? '?'
      const label = SKILL_LABELS[skill] || skill
      setLastRollResult({ label, total: typeof total === 'number' ? total : 0 })
      toast.success(`${label}: ${total}`)
    },
    onError: (err) => toast.error(String(err)),
  })

  const doRoll = useCallback(async (label: string, formula: string) => {
    setRolling(label)
    try {
      const result = await relay.roll({ formula, createChatMessage: true })
      const total = (result as any)?.data?.roll?.total ?? (result as any)?.roll?.total ?? '?'
      setLastRollResult({ label, total: typeof total === 'number' ? total : 0 })
      toast.success(`${label}: ${total}`)
    } catch (e) {
      toast.error(`Roll failed: ${String(e)}`)
    } finally {
      setRolling(null)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailItem(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const detailImage = detailItem?.img
    ? `/api/relay/download?path=${encodeURIComponent(detailItem.img)}&source=data`
    : null

  return (
    <div className="space-y-6">
      {/* Character Identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold overflow-hidden">
          {actor?.img && !actor.img.includes('mystery-man') ? (
            <img
              src={`/api/relay/download?path=${encodeURIComponent(actor.img)}&source=data`}
              alt={actor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            actor.name?.charAt(0)?.toUpperCase() || '?'
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{actor.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {details.race && (
              <Badge variant="secondary" className="text-xs">{details.race}</Badge>
            )}
            {details.class && (
              <Badge variant="secondary" className="text-xs">
                {details.class} {details.level || ''}
              </Badge>
            )}
            {!details.class && details.background && (
              <Badge variant="secondary" className="text-xs">{details.background}</Badge>
            )}
            {details.alignment && (
              <Badge variant="outline" className="text-xs">{details.alignment}</Badge>
            )}
            {traits.size && (
              <Badge variant="outline" className="text-xs">{traits.size.toUpperCase()}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* HP + Combat Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* HP */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400" /> Hit Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {hpValue} / {hpMax}
              {hpTemp > 0 && <span className="text-sm text-blue-400 ml-2">+{hpTemp} temp</span>}
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${hpColor(pct)} transition-all duration-300 rounded-full`} style={{ width: `${Math.max(pct, 0)}%` }} />
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 flex gap-1">
                <Button size="sm" variant="outline" className="px-2" disabled={damageMutation.isPending} onClick={() => damageMutation.mutate(5)}>-5</Button>
                <Button size="sm" variant="outline" className="px-2" disabled={damageMutation.isPending} onClick={() => damageMutation.mutate(1)}>-1</Button>
                <input type="number" placeholder="DMG" value={damage} onChange={(e) => setDamage(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border bg-background text-sm w-12 min-w-0" />
                <Button size="sm" variant="destructive" disabled={!damage || damageMutation.isPending}
                  onClick={() => damageMutation.mutate(Number(damage))}>Damage</Button>
              </div>
              <div className="flex-1 flex gap-1">
                <Button size="sm" variant="outline" className="px-2" disabled={healMutation.isPending} onClick={() => healMutation.mutate(1)}>+1</Button>
                <Button size="sm" variant="outline" className="px-2" disabled={healMutation.isPending} onClick={() => healMutation.mutate(5)}>+5</Button>
                <input type="number" placeholder="HEAL" value={heal} onChange={(e) => setHeal(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border bg-background text-sm w-12 min-w-0" />
                <Button size="sm" variant="default" disabled={!heal || healMutation.isPending}
                  onClick={() => healMutation.mutate(Number(heal))}>Heal</Button>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="secondary" className="flex-1" disabled={shortRestMutation.isPending}
                onClick={() => shortRestMutation.mutate()}>{shortRestMutation.isPending ? 'Resting...' : 'Short Rest'}</Button>
              <Button size="sm" variant="secondary" className="flex-1" disabled={longRestMutation.isPending}
                onClick={() => longRestMutation.mutate()}>{longRestMutation.isPending ? 'Resting...' : 'Long Rest'}</Button>
            </div>
            {hpValue <= 0 && (
              <Button size="sm" variant="destructive" className="w-full mt-2" disabled={deathSaveMutation.isPending}
                onClick={() => deathSaveMutation.mutate()}>{deathSaveMutation.isPending ? 'Rolling...' : '🛡️ Death Saving Throw'}</Button>
            )}
          </CardContent>
        </Card>

        {/* Combat Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-blue-400" /> Combat Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Armor Class</span>
              <span className="text-xl font-bold">{acValue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Footprints className="h-3.5 w-3.5" /> Speed</span>
              <span className="text-xl font-bold">{movement?.walk ?? '?'}<span className="text-xs text-muted-foreground ml-1">ft</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Initiative</span>
              <span className="text-lg font-semibold">{typeof initBonus === 'number' ? `${initBonus >= 0 ? '+' : ''}${initBonus}` : initBonus}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Prof. Bonus</span>
              <span className="text-lg font-semibold">+{profBonus}</span>
            </div>
            {details?.xp?.value !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">XP</span>
                <span className="text-sm font-mono">{(details.xp.value as number)?.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ability Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> Ability Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((ab) => {
              const val = abilities?.[ab]?.value || 10
              const mod = getMod(val)
              const proficient = abilities?.[ab]?.proficient
              const isRolling = rolling === `ability-${ab}`
              return (
                <button
                  key={ab} type="button"
                  disabled={isRolling || abilityCheckMutation.isPending}
                  onClick={() => abilityCheckMutation.mutate(ab)}
                  className="text-center p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-colors disabled:opacity-50"
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{ABILITY_NAMES[ab]}</div>
                  <div className="text-2xl font-bold mt-1">{val}</div>
                  <div className="text-sm text-muted-foreground">{mod >= 0 ? `+${mod}` : mod}</div>
                  {proficient ? <Badge variant="outline" className="text-[9px] px-1 mt-1 h-4">PRO</Badge> : null}
                  {isRolling && <div className="text-[9px] text-primary mt-0.5">Rolling...</div>}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-400" /> Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {Object.entries(SKILL_LABELS).map(([key, label]) => {
              const skill = skills?.[key] || {}
              const prof = skill?.value ?? 0
              const abil = SKILL_ABILITIES[key] || 'dex'
              const abilMod = getMod(abilities?.[abil]?.value || 10)
              const total = prof > 0 ? abilMod + profBonus * prof : abilMod
              const isRolling = rolling === `skill-${key}`
              return (
                <button
                  key={key} type="button"
                  disabled={isRolling || skillCheckMutation.isPending}
                  onClick={() => skillCheckMutation.mutate(key)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-muted/60 hover:border hover:border-primary/20 transition-colors disabled:opacity-50 ${prof > 0 ? 'bg-muted/40 font-medium' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    {prof > 0 && <span className="text-[10px] text-primary">●</span>}
                    {label}
                    {isRolling && <span className="text-[9px] text-primary ml-1">roll...</span>}
                  </span>
                  <span className={`font-mono text-xs ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {total >= 0 ? `+${total}` : total}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Saving Throws */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-blue-400" /> Saving Throws</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((ab) => {
              const abil = abilities?.[ab] || {}
              const abilMod = getMod(abil?.value ?? 10)
              const proficient = !!abil?.proficient?.[0] || !!abil?.proficient || !!abil?.save?.proficient
              const saveVal = abil?.save?.value
              const bonus = typeof saveVal === 'number' ? saveVal : (proficient ? abilMod + profBonus : abilMod)
              const label = ABILITY_NAMES[ab] || ab.toUpperCase()
              const isRolling = rolling === `save-${ab}`
              return (
                <button
                  key={ab} type="button"
                  disabled={isRolling}
                  onClick={() => {
                    setRolling(`save-${ab}`)
                    relay.dndAbilitySave({ actorUuid: uuid, ability: ab, createChatMessage: true })
                      .then((r: any) => {
                        const total = r?.data?.total ?? r?.data?.saveTotal ?? '?'
                        setLastRollResult({ label: `${label} Save`, total })
                        toast.success(`${label} Save: ${total}`)
                      })
                      .catch((e: any) => toast.error(`Save failed: ${String(e)}`))
                      .finally(() => setRolling(null))
                  }}
                  className={`text-center p-3 rounded-lg border cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-colors disabled:opacity-50 ${proficient ? 'bg-muted/40 border-primary/20' : 'bg-muted/50 border-transparent'}`}
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</div>
                  <div className={`text-lg font-bold mt-0.5 ${bonus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{bonus >= 0 ? `+${bonus}` : bonus}</div>
                  {proficient && <div className="text-[9px] text-primary mt-0.5">● PROF</div>}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Weapons */}
          {weapons.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sword className="h-4 w-4 text-orange-400" /> Weapons ({weapons.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weapons.map((item: any) => {
                  const formula = buildDamageFormula(item)
                  const isRolling = rolling === `weapon-${item.name}`
                  const needsAttune = item?.system?.attunement?.required || item?.system?.attunement?.value !== undefined
                  return (
                    <div key={item._id || item.name} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <button type="button" className="font-medium text-sm hover:text-primary transition-colors cursor-pointer text-left"
                          onClick={() => setDetailItem(item)}>{item.name}</button>
                        <div className="text-xs text-muted-foreground">
                          {formula && (
                            <button type="button" disabled={isRolling}
                              onClick={() => doRoll(`${item.name} damage`, formula)}
                              className="hover:text-primary transition-colors cursor-pointer disabled:opacity-50">{formula}</button>
                          )}
                          {formatVersatile(item?.system?.damage?.versatile) && <span className="ml-1">{formatVersatile(item?.system?.damage?.versatile)}</span>}
                          {item?.system?.properties?.length
                            ? ` • ${item.system.properties.map((p: any) => typeof p === 'string' ? p : p?.name || '').filter(Boolean).join(', ')}`
                            : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {needsAttune && (
                          <Button size="sm" variant={item?.system?.attunement?.value ? 'default' : 'outline'} className="text-[10px] h-7 px-1.5"
                            disabled={attuneMutation.isPending}
                            onClick={() => attuneMutation.mutate({ itemName: item.name, attuned: !item.system?.attunement?.value })}>
                            {item?.system?.attunement?.value ? 'AT' : '--'}
                          </Button>
                        )}
                        <Badge variant="outline" className="text-[10px]">{item?.system?.actionType || 'other'}</Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Armor */}
          {armor.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" /> Armor ({armor.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {armor.map((item: any) => (
                  <div key={item._id || item.name} className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="cursor-pointer min-w-0 flex-1" onClick={() => setDetailItem(item)}>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        AC {item?.system?.armor?.value || '?'}
                        {item?.system?.type?.value && ` • ${item.system.type.value}`}
                      </div>
                    </div>
                    <Button size="sm" variant={item?.system?.equipped ? 'default' : 'outline'} className="text-[10px] h-7 px-2 ml-2"
                      disabled={equipMutation.isPending}
                      onClick={() => equipMutation.mutate({ itemUuid: item._id || item.uuid, itemName: item.name, equipped: !item.system?.equipped })}>
                      {item?.system?.equipped ? 'Equipped' : 'Carried'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Consumables */}
      {consumables.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Consumables
              <span className="text-xs text-muted-foreground font-normal">({consumables.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {consumables.map((item: any) => (
                <div key={item._id || item.name} className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailItem(item)}>
                  {itemIcon(item.type)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{itemSubtitle(item)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped Items */}
      {itemSections.map((section) => (
        <Card key={section.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {section.icon}
              {section.label}
              <span className="text-xs text-muted-foreground font-normal">({section.items.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {section.items.map((item: any) => (
                <div key={item._id || item.name} className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailItem(item)}>
                  {itemIcon(item.type)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{itemSubtitle(item)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Currency */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'PP', value: currency?.pp, color: 'text-indigo-300' },
              { label: 'GP', value: currency?.gp, color: 'text-yellow-400' },
              { label: 'EP', value: currency?.ep, color: 'text-cyan-300' },
              { label: 'SP', value: currency?.sp, color: 'text-gray-300' },
              { label: 'CP', value: currency?.cp, color: 'text-amber-600' },
            ].map((c) => {
              const val = c.value && typeof c.value === 'object'
                ? (c.value.number ?? 0)
                : (c.value ?? 0)
              return (
                <div key={c.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted/40">
                  <span className={`text-sm font-bold ${c.color}`}>{val}</span>
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Spell Slots */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-400" /> Spell Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {spellSlots.map((s) => (
              <div key={s.level} className={`text-center p-3 rounded-lg ${s.max > 0 ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-muted/20'}`}>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Lvl {s.level}</div>
                <div className={`text-lg font-bold mt-0.5 ${s.max > 0 ? '' : 'text-muted-foreground/40'}`}>{s.current}/{s.max}</div>
              </div>
            ))}
          </div>
          {(spells as any)?.pact?.value > 0 && (
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs">
                Pact Magic: {(spells as any).pact.value} slot{(spells as any).pact.value !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spells */}
      {spellItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" /> Spells ({spellItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {spellItems.map((spell: any) => {
                const lvl = spell?.system?.level ?? 0
                const isRolling = rolling === `spell-${spell.name}`
                const spellMod = abilities?.[spell?.system?.ability || 'int']?.value || 10
                const spellAttackMod = getMod(spellMod) + profBonus
                const isPrepared = spell?.system?.preparation?.prepared ?? true
                const canPrepare = spell?.system?.preparation?.mode === 'prepared' || spell?.system?.preparation?.prepared !== undefined
                return (
                  <div key={spell._id || spell.name} className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailItem(spell)}>
                    {canPrepare ? (
                      <button type="button" disabled={prepareSpellMutation.isPending}
                        onClick={(e) => { e.stopPropagation(); prepareSpellMutation.mutate({ spellName: spell.name, prepared: !isPrepared }) }}
                        className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isPrepared ? 'bg-indigo-500 border-indigo-500' : 'border-muted-foreground/40 hover:border-indigo-400'}`}
                        title={isPrepared ? 'Prepared (click to unprepare)' : 'Not prepared (click to prepare)'}>
                        {isPrepared && <span className="text-[8px] text-white">✓</span>}
                      </button>
                    ) : (
                      <BookOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{spell.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>{lvl === 0 ? 'Cantrip' : `Lvl ${lvl}`}</span>
                        {spell?.system?.school && <span>• {spell.system.school}</span>}
                        {lvl > 0 && (
                          <button type="button" disabled={isRolling}
                            onClick={(e) => { e.stopPropagation(); doRoll(`${spell.name} attack`, `1d20${spellAttackMod >= 0 ? '+' : ''}${spellAttackMod}`) }}
                            className="text-[10px] text-primary hover:underline disabled:opacity-50">
                            {isRolling ? '...' : `+${spellAttackMod} hit`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features & Traits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Features & Traits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {details?.biography?.value && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Biography</h4>
                <div className="text-sm prose-sm prose-invert max-w-none [&_p]:mb-1" dangerouslySetInnerHTML={{ __html: details.biography.value }} />
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Damage Resistances</h4>
              <p className="text-sm">{traits?.dr?.value?.length ? traits.dr.value.join(', ') : 'None'}{traits?.dr?.custom && ` (${traits.dr.custom})`}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Condition Immunities</h4>
              <p className="text-sm">{traits?.ci?.value?.length ? traits.ci.value.join(', ') : 'None'}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Languages</h4>
              <p className="text-sm">{traits?.languages?.value?.length ? traits.languages.value.join(', ') : 'None'}{traits?.languages?.custom && ` (${traits.languages.custom})`}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Senses</h4>
              <p className="text-sm">
                {system?.attributes?.senses?.darkvision > 0 && `Darkvision ${system.attributes.senses.darkvision}ft`}
                {system?.attributes?.senses?.blindsight > 0 && `, Blindsight ${system.attributes.senses.blindsight}ft`}
                {system?.attributes?.senses?.truesight > 0 && `, Truesight ${system.attributes.senses.truesight}ft`}
                {!system?.attributes?.senses?.darkvision && !system?.attributes?.senses?.blindsight && !system?.attributes?.senses?.truesight && 'Normal'}
              </p>
            </div>
            {resources?.primary?.max > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{resources.primary.label || 'Resource'}</h4>
                <p className="text-sm">{resources.primary.value}/{resources.primary.max}{resources.primary.sr && ' (Short Rest)'}{resources.primary.lr && ' (Long Rest)'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Effects */}
      {effectsData?.data && Array.isArray(effectsData.data) && effectsData.data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" /> Active Effects ({effectsData.data.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {effectsData.data.map((effect: any) => (
                <Badge key={effect._id || effect.name} variant="secondary" className="text-xs flex items-center gap-1"
                  title={effect?.changes?.length > 0 ? (effect.changes as any[]).map((c: any) => `${c.key}: ${c.value}`).join(', ') : undefined}>
                  {effect?.statuses?.length > 0 && effect?.icon && <img src={effect.icon} alt="" className="w-3.5 h-3.5" />}
                  {effect.label || effect.name || 'Unknown'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null) }}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  {detailImage && <img src={detailImage} alt={detailItem.name} className="w-10 h-10 rounded object-cover" />}
                  <div className="min-w-0">
                    <SheetTitle className="text-base">{detailItem.name}</SheetTitle>
                    <SheetDescription>
                      {detailItem.type === 'spell' ? (
                        <>{detailItem.system?.level === 0 ? 'Cantrip' : `Level ${detailItem.system?.level}`}{detailItem.system?.school && ` ${detailItem.system.school}`}</>
                      ) : (
                        <>{detailItem.type?.charAt(0).toUpperCase() + detailItem.type?.slice(1)}{detailItem.system?.equipped && ' • Equipped'}</>
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <Separator className="my-3" />

              {detailItem.type === 'weapon' && detailItem.system?.damage?.base && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Damage</div>
                  <div className="text-sm space-y-0.5">
                    <p className="flex justify-between">
                      <span>{buildDamageFormula(detailItem) || '—'}</span>
                      <span className="text-muted-foreground">{detailItem.system.damage.base.types?.join(', ') || ''}</span>
                    </p>
                    {detailItem.system.damage.versatile && (
                      <p className="text-muted-foreground text-xs">Versatile: {formatVersatile(detailItem.system.damage.versatile)}</p>
                    )}
                  </div>
                </div>
              )}

              {detailItem.type === 'equipment' && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Armor</div>
                  <div className="text-sm space-y-0.5">
                    <p>AC {detailItem.system?.armor?.value || '?'}</p>
                    {detailItem.system?.type?.value && <p>Type: {detailItem.system.type.value}</p>}
                  </div>
                </div>
              )}

              {detailItem.type === 'spell' && detailItem.system && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Details</div>
                  <div className="text-sm space-y-1">
                    {detailItem.system.level !== undefined && (
                      <p className="flex justify-between"><span className="text-muted-foreground">Level</span><span>{detailItem.system.level === 0 ? 'Cantrip' : detailItem.system.level}</span></p>
                    )}
                    {detailItem.system.school && <p className="flex justify-between"><span className="text-muted-foreground">School</span><span>{detailItem.system.school}</span></p>}
                    {detailItem.system.components && <p className="flex justify-between"><span className="text-muted-foreground">Components</span><span>{formatDetailField(detailItem.system.components?.value || detailItem.system.components)}</span></p>}
                    {detailItem.system.castingTime && <p className="flex justify-between"><span className="text-muted-foreground">Casting Time</span><span>{formatDetailField(detailItem.system.castingTime)}</span></p>}
                    {detailItem.system.range && <p className="flex justify-between"><span className="text-muted-foreground">Range</span><span>{formatDetailField(detailItem.system.range)}</span></p>}
                    {detailItem.system.duration && <p className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{formatDetailField(detailItem.system.duration)}</span></p>}
                    {detailItem.system.target && <p className="flex justify-between"><span className="text-muted-foreground">Target</span><span>{formatDetailField(detailItem.system.target)}</span></p>}
                    {detailItem.system.damage?.parts?.[0]?.[0] && <p className="flex justify-between"><span className="text-muted-foreground">Damage</span><span>{detailItem.system.damage.parts[0][0]}</span></p>}
                    {detailItem.system.save?.ability && <p className="flex justify-between"><span className="text-muted-foreground">Save</span><span>{detailItem.system.save.ability.toUpperCase()}</span></p>}
                  </div>
                </div>
              )}

              {detailItem.system?.quantity && (
                <div className="mb-3 text-sm">
                  <span className="text-muted-foreground">Quantity: </span>
                  <span>{detailItem.system.quantity}</span>
                </div>
              )}

              {/* Attunement */}
              {(detailItem as any)?.system?.attunement ? (
                <div className="mb-3">
                  {(() => {
                    const att = (detailItem as any).system.attunement
                    const isAttunementItem = typeof att === 'object' ? (att.required || att.value !== undefined) : att > 0
                    const isAttuned = typeof att === 'object' ? !!att.value : att >= 2
                    if (!isAttunementItem) return null
                    return (
                      <Button size="sm" variant={isAttuned ? 'default' : 'outline'} className="w-full"
                        disabled={attuneMutation.isPending}
                        onClick={() => attuneMutation.mutate({ itemName: detailItem.name, attuned: !isAttuned })}>
                        {isAttuned ? 'Attuned (click to unattune)' : 'Not Attuned (click to attune)'}
                      </Button>
                    )
                  })()}
                </div>
              ) : null}

              <Separator className="my-3" />
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</div>
                {detailItem.system?.description?.value ? (
                  <div className="text-sm prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: detailItem.system.description.value }} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description available.</p>
                )}
              </div>

              {detailItem.type === 'weapon' && buildDamageFormula(detailItem) && (
                <div className="mt-4">
                  <Button className="w-full" size="sm" disabled={rolling === `weapon-${detailItem.name}`}
                    onClick={() => doRoll(`${detailItem.name} damage`, buildDamageFormula(detailItem))}>
                    <Swords className="h-4 w-4 mr-1.5" />
                    {rolling === `weapon-${detailItem.name}` ? 'Rolling...' : 'Roll Damage'}
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function CharacterSheet({ uuid, isLoading }: { uuid: string; isLoading?: boolean }) {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['actor', uuid],
    queryFn: () => relay.get(uuid),
    enabled: !!uuid,
  })

  const { data: effectsData } = useQuery({
    queryKey: ['effects', uuid],
    queryFn: () => relay.getActorEffects(uuid),
    enabled: !!uuid,
  })

  const isLoading_ = isLoading || loading

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
    )
  }

  if (isLoading_) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading character data...</p>
      </div>
    )
  }

  if (!(data as any)?.data?.name) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No character data found for this actor.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <CharacterSheetInner actorData={data} effectsData={effectsData} uuid={uuid} />
}

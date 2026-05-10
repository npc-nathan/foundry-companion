"use client"

import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { relay } from "@/lib/relay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crosshair } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CharacterSheet from "@/components/CharacterSheet"

type ActorStub = { name: string; id: string; type?: string }

function extractActors(data: any): ActorStub[] {
  const list: ActorStub[] = []
  const folders: Record<string, any> = data?.data?.folders || {}
  const entities: any[] = data?.data?.entities?.actors || []
  for (const e of entities) list.push({ name: e.name, id: e.id, type: e.type })
  for (const f of Object.values(folders)) {
    if ((f as any)?.entities) {
      for (const e of (f as any).entities)
        list.push({ name: e.name, id: e.id, type: e.type })
    }
  }
  return list
}

export default function PlayerCharacterPage() {
  const [selectedId, setSelectedId] = useState<string>("")

  const { data: structure } = useQuery({
    queryKey: ["structure", "Actor"],
    queryFn: () => relay.structure("Actor"),
  })

  const actors = extractActors(structure)
  const characterActors = actors.filter(
    (a) => a.type === "character" || a.type === "pc"
  )
  const selectable = characterActors.length > 0 ? characterActors : actors
  const uuid = selectedId ? `Actor.${selectedId}` : ""

  const handleSelect = useCallback((val: string) => {
    setSelectedId(val)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header & Actor Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Character Sheet</h1>
          <p className="text-sm text-muted-foreground">
            View character stats, inventory, and spells
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedId} onValueChange={(v) => v && handleSelect(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a character..." />
            </SelectTrigger>
            <SelectContent>
              {selectable.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CharacterSheet uuid={uuid} />
    </div>
  )
}

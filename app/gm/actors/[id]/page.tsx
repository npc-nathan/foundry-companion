'use client'

import { use } from 'react'
import CharacterSheet from '@/components/CharacterSheet'

export default function ActorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const uuid = `Actor.${id}`

  return (
    <div className="space-y-6">
      <CharacterSheet uuid={uuid} />
    </div>
  )
}

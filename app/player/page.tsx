"use client"

import { useStore } from "@/lib/store"
import { relay } from "@/lib/relay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Swords, Shield, Activity } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

export default function PlayerDashboard() {
  const config = useStore((s) => s.config)

  const { data: structure } = useQuery({
    queryKey: ['structure', 'Scene'],
    queryFn: () => relay.structure('Scene', 'true'),
    refetchInterval: 30000,
  })

  const scenes: Array<{ name: string; active: boolean }> = (structure as any)?.data?.entities?.scenes || []
  const activeScene = scenes.find((s) => s.active)
  const sceneCount = scenes.length

  const stats = [
    {
      title: "Active Scene",
      value: activeScene?.name || "None",
      description: "Current location",
      icon: Shield,
    },
    {
      title: "Total Scenes",
      value: String(sceneCount),
      description: "Scenes available",
      icon: Swords,
    },
    {
      title: "Status",
      value: "Connected",
      description: config.relayUrl,
      icon: Activity,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Player Dashboard</h1>
        <p className="text-muted-foreground">Your Foundry session overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Scene and character activity will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

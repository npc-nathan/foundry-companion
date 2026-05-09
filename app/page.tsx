"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Activity } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { config, status } = useStore()

  useEffect(() => {
    if (status.connected) {
      router.replace(config.role === "player" ? "/player" : "/gm")
    } else {
      router.replace(`/${config.role || "gm"}`)
    }
  }, [status.connected, config.role, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}

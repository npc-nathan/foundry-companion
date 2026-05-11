"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Map,
  PictureInPicture2,
  Users,
  Swords,
  MessageSquare,
  Dice5,
  Code2,
  BookOpen,
  LogOut,
  Sun,
  Moon,
} from "lucide-react"
import { sseManager } from "@/lib/sse"

const gmNavItems = [
  { label: "Dashboard", href: "/gm", icon: LayoutDashboard },
  { label: "Canvas", href: "/gm/canvas", icon: PictureInPicture2 },
  { label: "Scenes", href: "/gm/scenes", icon: Map },
  { label: "Actors", href: "/gm/actors", icon: Users },
  { label: "Combat", href: "/gm/combat", icon: Swords },
  { label: "Chat", href: "/gm/chat", icon: MessageSquare },
  { label: "Dice", href: "/gm/dice", icon: Dice5 },
  { label: "Macros", href: "/gm/macros", icon: Code2 },
  { label: "Journals", href: "/gm/journals", icon: BookOpen },
]

const playerNavItems = [
  { label: "Dashboard", href: "/player", icon: LayoutDashboard },
  { label: "Character", href: "/player/character", icon: Users },
  { label: "Chat", href: "/player/chat", icon: MessageSquare },
  { label: "Dice", href: "/player/dice", icon: Dice5 },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { config, reset } = useStore()
  const navItems = config.role === "gm" ? gmNavItems : playerNavItems
  const handleDisconnect = () => {
    sseManager.disconnectAll()
    reset()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="font-semibold">
          Foundry Companion
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t p-4 space-y-1">
        <div className="mb-3 text-xs text-muted-foreground truncate">
          {config.clientName}
        </div>
        <ThemeToggle />
        <button
          onClick={handleDisconnect}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </button>
      </div>
    </div>
  )
}



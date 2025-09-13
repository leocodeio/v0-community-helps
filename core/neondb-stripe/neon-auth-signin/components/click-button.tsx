"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MousePointer, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ClickButtonProps {
  remaining: number
  isPro: boolean
}

export function ClickButton({ remaining, isPro }: ClickButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [localRemaining, setLocalRemaining] = useState(remaining)
  const router = useRouter()

  const handleClick = async () => {
    if (localRemaining <= 0) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/click", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setLocalRemaining(data.remaining)
        router.refresh() // Refresh server components
      } else if (response.status === 429) {
        // Rate limit exceeded
        setLocalRemaining(0)
        router.refresh()
      }
    } catch (error) {
      console.error("Click error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={localRemaining <= 0 || isLoading}
      className="w-full max-w-xs"
      variant={localRemaining <= 0 ? "secondary" : "default"}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MousePointer className="h-4 w-4 mr-2" />}
      {localRemaining <= 0 ? "No clicks remaining" : `Use Click (${localRemaining} left)`}
    </Button>
  )
}

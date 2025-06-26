"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface RealTimeStatusIndicatorProps {
  className?: string
}

export default function RealTimeStatusIndicator({ className }: RealTimeStatusIndicatorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    // Test connection with a simple subscription
    const testChannel = supabase
      .channel("connection-test")
      .on("presence", { event: "sync" }, () => {
        setIsConnected(true)
        setLastUpdate(new Date())
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          setLastUpdate(new Date())
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsConnected(false)
        }
      })

    // Cleanup
    return () => {
      testChannel.unsubscribe()
    }
  }, [])

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge
        variant={isConnected ? "default" : "destructive"}
        className={`flex items-center space-x-1 ${
          isConnected ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"
        }`}
      >
        {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        <span className="text-xs">{isConnected ? "Live" : "Offline"}</span>
      </Badge>
      {lastUpdate && <span className="text-xs text-gray-500">Updated {lastUpdate.toLocaleTimeString()}</span>}
    </div>
  )
}

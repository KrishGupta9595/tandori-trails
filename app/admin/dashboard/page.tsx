"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Download, Home, LogOut } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  completedOrders: number
  cancelledOrders: number
  avgOrderValue: number
}

interface TopItem {
  name: string
  quantity: number
  revenue: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    avgOrderValue: 0,
  })
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("today")

  useEffect(() => {
    checkAuth()
    fetchDashboardData()
  }, [dateFilter])

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        console.log("Realtime order update received")
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = "/admin/login"
      return
    }

    const { data: staffUser } = await supabase
      .from("staff_users")
      .select("role")
      .ilike("email", user.email || "")
      .eq("role", "admin")
      .single()

    if (!staffUser) {
      await supabase.auth.signOut()
      window.location.href = "/admin/login"
    }
  }

  const getDateCondition = () => {
    const now = new Date()
    switch (dateFilter) {
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case "month":
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    }
  }

  const fetchDashboardData = async () => {
    try {
      const fromDate = getDateCondition()

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", fromDate)

      if (error || !orders) {
        console.error("Error fetching orders:", error)
        return
      }

      const completedOrders = orders.filter((o) => o.status === "completed")
      const cancelledOrders = orders.filter((o) => o.status === "cancelled")
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

      const itemMap = new Map()
      for (const order of completedOrders) {
        const { items } = order
        if (items && Array.isArray(items)) {
          for (const item of items) {
            const key = item.name
            if (!itemMap.has(key)) {
              itemMap.set(key, { name: key, quantity: 0, revenue: 0 })
            }
            const existing = itemMap.get(key)
            existing.quantity += item.quantity || 0
            existing.revenue += (item.price || 0) * (item.quantity || 0)
          }
        }
      }

      const topItems = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5)

      const recentOrders = orders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        avgOrderValue,
      })

      setTopItems(topItems)
      setRecentOrders(recentOrders)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const downloadReport = () => {
    const reportData = {
      period: dateFilter,
      stats,
      topItems,
      generatedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tandoori-trails-report-${dateFilter}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tandoori-amethyst mx-auto mb-4"></div>
          <p className="text-lg text-tandoori-charcoal">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white font-sans">
      {/* Your original styled header, dashboard cards, tabs, and charts */}
      {/* Insert the rest of your styled JSX UI as you had it before */}
      {/* Data like stats.totalRevenue, recentOrders etc. is now reactive and live */}
    </div>
  )
}

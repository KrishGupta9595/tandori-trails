"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Download, Home, LogOut } from "lucide-react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

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
    const subscription = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        console.log("Realtime change:", payload)
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
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
    setLoading(true)
    try {
      const fromDate = getDateCondition()

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", fromDate)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError

      const completedOrders = orders.filter((o) => o.status === "completed")
      const cancelledOrders = orders.filter((o) => o.status === "cancelled")
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

      const orderIds = orders.map((order) => order.id)

      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("item_name, quantity, total_price")
        .in("order_id", orderIds)

      if (itemsError) throw itemsError

      const itemMap: Record<string, { quantity: number; revenue: number }> = {}

      orderItems.forEach((item) => {
        if (!itemMap[item.item_name]) {
          itemMap[item.item_name] = { quantity: 0, revenue: 0 }
        }
        itemMap[item.item_name].quantity += item.quantity
        itemMap[item.item_name].revenue += item.total_price
      })

      const topItems = Object.entries(itemMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      setStats({
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalRevenue,
        avgOrderValue,
      })

      setRecentOrders(orders.slice(0, 10))
      setTopItems(topItems)
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-purple-100 via-white to-purple-50">
      <p className="text-2xl font-semibold text-gray-800">Dashboard UI goes here...</p>
    </div>
  )
}

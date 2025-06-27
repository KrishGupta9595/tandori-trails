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
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-4">Welcome! Here's your real-time dashboard overview.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{stats.totalOrders}</p>
            <p className="text-sm text-muted-foreground">{stats.completedOrders} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">₹{stats.totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">₹{stats.avgOrderValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cancelled Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{stats.cancelledOrders}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Top Items</h2>
        {topItems.length === 0 ? (
          <p>No top items found.</p>
        ) : (
          <ul className="space-y-2">
            {topItems.map((item) => (
              <li key={item.name} className="border p-3 rounded shadow">
                <div className="flex justify-between">
                  <span>{item.name}</span>
                  <span>
                    {item.quantity} sold • ₹{item.revenue.toFixed(2)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p>No recent orders available.</p>
        ) : (
          <ul className="space-y-2">
            {recentOrders.map((order) => (
              <li key={order.id} className="border p-3 rounded shadow">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">Order #{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name} • {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{order.total_amount.toFixed(2)}</p>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button onClick={downloadReport} className="mt-4">
        <Download className="mr-2 h-4 w-4" /> Export Report
      </Button>
    </div>
  )
}

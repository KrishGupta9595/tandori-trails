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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
    // Check authentication
    checkAuth()
    fetchDashboardData()
  }, [dateFilter])

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = "/admin/login"
      return
    }

    // Verify admin staff role (case-insensitive)
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

  const fetchDashboardData = async () => {
    try {
      const dateCondition = getDateCondition()

      // Fetch orders with date filter
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            quantity,
            price,
            menu_items (
              name
            )
          )
        `)
        .gte("created_at", dateCondition)

      if (orders) {
        // Calculate stats
        const totalOrders = orders.length
        const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0)
        const completedOrders = orders.filter((order) => order.status === "completed").length
        const cancelledOrders = orders.filter((order) => order.status === "cancelled").length
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        setStats({
          totalOrders,
          totalRevenue,
          completedOrders,
          cancelledOrders,
          avgOrderValue,
        })

        // Calculate top items
        const itemStats: { [key: string]: { quantity: number; revenue: number } } = {}

        orders.forEach((order) => {
          order.order_items.forEach((item: any) => {
            const itemName = item.menu_items.name
            if (!itemStats[itemName]) {
              itemStats[itemName] = { quantity: 0, revenue: 0 }
            }
            itemStats[itemName].quantity += item.quantity
            itemStats[itemName].revenue += item.price * item.quantity
          })
        })

        const topItemsArray = Object.entries(itemStats)
          .map(([name, stats]) => ({
            name,
            quantity: stats.quantity,
            revenue: stats.revenue,
          }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)

        setTopItems(topItemsArray)
        setRecentOrders(orders.slice(0, 10))
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDateCondition = () => {
    const now = new Date()
    switch (dateFilter) {
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return weekAgo.toISOString()
      case "month":
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return monthAgo.toISOString()
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
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
      {/* Header */}
      <div className="bg-gradient-to-r from-tandoori-amethyst via-tandoori-amethyst-dark to-tandoori-amethyst-light text-white py-6 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
              <p className="opacity-90">Tandoori Trails Analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={downloadReport}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href="/">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-tandoori-charcoal">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-tandoori-amethyst" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tandoori-charcoal">{stats.totalOrders}</div>
              <p className="text-xs text-tandoori-charcoal-light">
                {stats.completedOrders} completed, {stats.cancelledOrders} cancelled
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-tandoori-charcoal">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-tandoori-amethyst" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tandoori-charcoal">₹{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-tandoori-charcoal-light">From {stats.completedOrders} completed orders</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-tandoori-charcoal">Average Order</CardTitle>
              <TrendingUp className="h-4 w-4 text-tandoori-amethyst" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tandoori-charcoal">₹{stats.avgOrderValue.toFixed(2)}</div>
              <p className="text-xs text-tandoori-charcoal-light">Per order value</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-tandoori-charcoal">Success Rate</CardTitle>
              <Users className="h-4 w-4 text-tandoori-amethyst" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-tandoori-charcoal">
                {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-tandoori-charcoal-light">Orders completed successfully</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-tandoori-white shadow-lg">
            <TabsTrigger value="overview" className="text-lg font-semibold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="top-items" className="text-lg font-semibold">
              Top Items
            </TabsTrigger>
            <TabsTrigger value="recent-orders" className="text-lg font-semibold">
              Recent Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-tandoori-charcoal">Business Overview</CardTitle>
                <CardDescription className="text-tandoori-charcoal-light">
                  Key metrics for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border border-tandoori-lavender rounded-lg">
                    <span className="font-medium text-tandoori-charcoal">Total Orders Processed</span>
                    <Badge
                      variant="secondary"
                      className="text-lg px-3 py-1 bg-tandoori-lavender text-tandoori-charcoal"
                    >
                      {stats.totalOrders}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 border border-tandoori-lavender rounded-lg">
                    <span className="font-medium text-tandoori-charcoal">Revenue Generated</span>
                    <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
                      ₹{stats.totalRevenue.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 border border-tandoori-lavender rounded-lg">
                    <span className="font-medium text-tandoori-charcoal">Average Order Value</span>
                    <Badge
                      variant="outline"
                      className="text-lg px-3 py-1 border-tandoori-amethyst text-tandoori-amethyst"
                    >
                      ₹{stats.avgOrderValue.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-items" className="space-y-6">
            <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-tandoori-charcoal">Top Selling Items</CardTitle>
                <CardDescription className="text-tandoori-charcoal-light">
                  Most popular menu items by quantity sold
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topItems.length === 0 ? (
                  <p className="text-tandoori-charcoal-light text-center py-8">
                    No data available for the selected period
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topItems.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-4 border border-tandoori-lavender rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant="outline"
                            className="w-8 h-8 rounded-full flex items-center justify-center border-tandoori-amethyst text-tandoori-amethyst"
                          >
                            {index + 1}
                          </Badge>
                          <div>
                            <h4 className="font-semibold text-tandoori-charcoal">{item.name}</h4>
                            <p className="text-sm text-tandoori-charcoal-light">{item.quantity} units sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-tandoori-amethyst">₹{item.revenue.toFixed(2)}</p>
                          <p className="text-sm text-tandoori-charcoal-light">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent-orders" className="space-y-6">
            <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-tandoori-charcoal">Recent Orders</CardTitle>
                <CardDescription className="text-tandoori-charcoal-light">Latest orders from customers</CardDescription>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-tandoori-charcoal-light text-center py-8">
                    No orders found for the selected period
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border border-tandoori-lavender rounded-lg"
                      >
                        <div>
                          <h4 className="font-semibold text-tandoori-charcoal">
                            Order #{order.order_number} - Table {order.table_number}
                          </h4>
                          <p className="text-sm text-tandoori-charcoal-light">
                            {order.customer_name} • {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-tandoori-amethyst">₹{order.total_amount.toFixed(2)}</p>
                          <Badge
                            className={
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : order.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, ChefHat, Utensils, RefreshCw } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"

// Add the toast component import
import OrderStatusToast from "@/components/order-status-toast"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Order {
  id: string
  order_number: number
  table_number: number
  customer_name: string
  status: string
  total_amount: number
  created_at: string
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  menu_items: {
    name: string
    description: string
  }
}

export default function OrderStatusPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Add state for previous status to track changes
  const [previousStatus, setPreviousStatus] = useState<string>("")

  // Update the order state management to track status changes
  useEffect(() => {
    if (!orderId) {
      window.location.href = "/"
      return
    }

    fetchOrderData()

    // Set up comprehensive real-time subscription for order updates
    const orderSubscription = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log("Order status update received:", payload)
          // Update the order state immediately with the new data
          setOrder((prev) => {
            if (prev) {
              setPreviousStatus(prev.status) // Track previous status for toast
              return {
                ...prev,
                status: payload.new.status,
                updated_at: payload.new.updated_at,
              }
            }
            return prev
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all changes
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log("Order items update received:", payload)
          // Refresh full order data when items change
          fetchOrderData()
        },
      )
      .subscribe((status) => {
        console.log("Order status subscription status:", status)
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to order updates")
        }
      })

    // Cleanup subscription on unmount
    return () => {
      console.log("Cleaning up order status subscription")
      orderSubscription.unsubscribe()
    }
  }, [orderId])

  // Add a visual indicator when order status changes
  useEffect(() => {
    if (order?.status) {
      // Show a brief notification when status changes
      const statusMessages = {
        pending: "Order received by kitchen",
        preparing: "Your order is being prepared",
        prepared: "Your order is ready!",
        completed: "Order completed",
      }

      // You could add a toast notification here
      console.log(statusMessages[order.status as keyof typeof statusMessages])
    }
  }, [order?.status])

  const fetchOrderData = async () => {
    try {
      const [orderResult, itemsResult] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase
          .from("order_items")
          .select(`
            *,
            menu_items (
              name,
              description
            )
          `)
          .eq("order_id", orderId),
      ])

      if (orderResult.data) setOrder(orderResult.data)
      if (itemsResult.data) setOrderItems(itemsResult.data)
    } catch (error) {
      console.error("Error fetching order data:", error)
    } finally {
      setLoading(false)
    }
  }

  const refreshOrderStatus = async () => {
    setRefreshing(true)
    await fetchOrderData()
    setRefreshing(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
      case "preparing":
        return <ChefHat className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
      case "prepared":
        return <Utensils className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
      case "completed":
        return <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
      default:
        return <Clock className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "preparing":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "prepared":
        return "bg-green-100 text-green-800 border-green-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Order Received"
      case "preparing":
        return "Being Prepared"
      case "prepared":
        return "Ready to Serve"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  if (!orderId) {
    return <div>Redirecting...</div>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tandoori-amethyst mx-auto mb-4"></div>
          <p className="text-lg text-tandoori-charcoal">Loading order status...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white flex items-center justify-center font-sans">
        <Card className="max-w-md mx-auto bg-tandoori-white">
          <CardContent className="text-center py-8">
            <p className="text-lg text-tandoori-charcoal mb-4">Order not found</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-tandoori-amethyst via-tandoori-amethyst-dark to-tandoori-amethyst-light text-white py-4 md:py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">Order Status</h1>
            <p className="text-lg md:text-xl opacity-90">Tandoori Trails</p>
          </div>
          <div className="flex justify-center md:justify-end">
            <Button
              onClick={refreshOrderStatus}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Order Details */}
          <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-tandoori-lavender to-tandoori-lavender-light rounded-t-lg">
              <CardTitle className="text-lg md:text-xl font-bold text-tandoori-charcoal">Order Details</CardTitle>
              <CardDescription className="text-tandoori-charcoal-light">Order #{order.order_number}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-tandoori-charcoal">Table Number:</span>
                <Badge
                  variant="outline"
                  className="text-base md:text-lg px-3 py-1 border-tandoori-amethyst text-tandoori-amethyst"
                >
                  {order.table_number}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-tandoori-charcoal">Customer:</span>
                <span className="font-semibold text-tandoori-charcoal">{order.customer_name}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-tandoori-charcoal">Order Time:</span>
                <span className="text-tandoori-charcoal-light">{new Date(order.created_at).toLocaleTimeString()}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-tandoori-charcoal">Total Amount:</span>
                <span className="font-bold text-lg text-tandoori-amethyst">₹{order.total_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center pt-4">
                <span className="font-medium text-tandoori-charcoal">Status:</span>
                <Badge className={`${getStatusColor(order.status)} border px-3 py-1 flex items-center space-x-2`}>
                  {getStatusIcon(order.status)}
                  <span className="font-semibold">{getStatusText(order.status)}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-t-lg">
              <CardTitle className="text-lg md:text-xl font-bold text-tandoori-charcoal">Order Items</CardTitle>
              <CardDescription className="text-tandoori-charcoal-light">
                {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start p-3 md:p-4 border border-tandoori-lavender rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-tandoori-charcoal">{item.menu_items.name}</h4>
                      <p className="text-sm text-tandoori-charcoal-light mt-1 line-clamp-2">
                        {item.menu_items.description}
                      </p>
                      <p className="text-sm text-tandoori-charcoal-light mt-2">
                        ₹{item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <Badge variant="secondary" className="mb-2 bg-tandoori-lavender text-tandoori-charcoal">
                        Qty: {item.quantity}
                      </Badge>
                      <p className="font-semibold text-tandoori-amethyst">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Timeline */}
        <Card className="mt-6 md:mt-8 shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-tandoori-lavender to-tandoori-lavender-light rounded-t-lg">
            <CardTitle className="text-lg md:text-xl font-bold text-tandoori-charcoal">Order Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-center overflow-x-auto">
              {["pending", "preparing", "prepared", "completed"].map((status, index) => (
                <div key={status} className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 ${
                      ["pending", "preparing", "prepared", "completed"].indexOf(order.status) >= index
                        ? "bg-tandoori-amethyst border-tandoori-amethyst text-white"
                        : "bg-gray-200 border-gray-300 text-gray-500"
                    }`}
                  >
                    {getStatusIcon(status)}
                  </div>
                  <p className="text-xs md:text-sm font-medium mt-2 text-center text-tandoori-charcoal px-1">
                    {getStatusText(status)}
                  </p>
                  {index < 3 && (
                    <div
                      className={`h-1 w-full mt-4 ${
                        ["pending", "preparing", "prepared", "completed"].indexOf(order.status) > index
                          ? "bg-tandoori-amethyst"
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 md:mt-8">
          <Link href={`/menu?table=${order.table_number}&skipForm=true`}>
            <Button className="w-full sm:w-auto bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light hover:from-tandoori-amethyst-dark hover:to-tandoori-amethyst">
              Place Another Order
            </Button>
          </Link>
        </div>
      </div>
      {order && (
        <OrderStatusToast status={order.status} previousStatus={previousStatus} customerName={order.customer_name} />
      )}
    </div>
  )
}

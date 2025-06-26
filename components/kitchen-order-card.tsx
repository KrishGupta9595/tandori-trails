"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle } from "lucide-react"

interface Order {
  id: string
  order_number: number
  table_number: number
  customer_name: string
  status: string
  total_amount: number
  created_at: string
  order_items: {
    quantity: number
    menu_items: {
      name: string
    }
  }[]
}

interface KitchenOrderCardProps {
  order: Order
  onStatusUpdate: (orderId: string, status: string) => Promise<void>
}

export default function KitchenOrderCard({ order, onStatusUpdate }: KitchenOrderCardProps) {
  const [updating, setUpdating] = useState(false)

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true)
    try {
      await onStatusUpdate(order.id, newStatus)
    } finally {
      setUpdating(false)
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
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTimeElapsed = () => {
    const now = new Date()
    const orderTime = new Date(order.created_at)
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes === 1) return "1 minute ago"
    return `${diffMinutes} minutes ago`
  }

  const getNextStatusButton = () => {
    switch (order.status) {
      case "pending":
        return (
          <Button
            onClick={() => handleStatusUpdate("prepared")}
            disabled={updating}
            className="bg-green-600 hover:bg-green-700 transition-all duration-200 w-full sm:w-auto"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {updating ? "Marking..." : "Mark Ready"}
          </Button>
        )
      case "preparing":
        return (
          <Button
            onClick={() => handleStatusUpdate("prepared")}
            disabled={updating}
            className="bg-green-600 hover:bg-green-700 transition-all duration-200 w-full sm:w-auto"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {updating ? "Marking..." : "Mark Ready"}
          </Button>
        )
      case "prepared":
        return (
          <Button
            onClick={() => handleStatusUpdate("completed")}
            disabled={updating}
            className="bg-tandoori-amethyst hover:bg-tandoori-amethyst-dark transition-all duration-200 w-full sm:w-auto"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {updating ? "Completing..." : "Complete Order"}
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <Card className="border border-tandoori-lavender rounded-lg hover:bg-tandoori-lavender-light transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge
                variant="outline"
                className="text-sm px-3 py-1 border-tandoori-amethyst text-tandoori-amethyst font-semibold"
              >
                Table {order.table_number}
              </Badge>
              <Badge className={`${getStatusColor(order.status)} border px-2 py-1 font-medium text-xs`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              <div className="flex items-center text-xs text-tandoori-charcoal-light">
                <Clock className="h-3 w-3 mr-1" />
                {getTimeElapsed()}
              </div>
            </div>

            <h4 className="font-semibold text-tandoori-charcoal mb-2 text-base lg:text-lg">
              Order #{order.order_number} - {order.customer_name}
            </h4>

            <p className="text-sm text-tandoori-charcoal-light mb-3">
              Ordered at {new Date(order.created_at).toLocaleTimeString()}
            </p>

            <div className="text-sm text-tandoori-charcoal-light mb-3">
              <strong>Items:</strong>{" "}
              {order.order_items.map((item) => `${item.menu_items.name} (${item.quantity})`).join(", ")}
            </div>

            <p className="font-bold text-tandoori-amethyst text-base lg:text-lg">
              Total: ₹{order.total_amount.toFixed(2)}
            </p>
          </div>

          <div className="lg:ml-4 flex flex-col space-y-2">{getNextStatusButton()}</div>
        </div>
      </CardContent>
    </Card>
  )
}

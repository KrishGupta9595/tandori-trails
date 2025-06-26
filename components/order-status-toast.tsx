"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Clock, ChefHat, Utensils } from "lucide-react"

interface OrderStatusToastProps {
  status: string
  previousStatus?: string
  customerName?: string
}

export default function OrderStatusToast({ status, previousStatus, customerName }: OrderStatusToastProps) {
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (status !== previousStatus && previousStatus) {
      const messages = {
        pending: "Order received by kitchen",
        preparing: "Your order is being prepared by our chefs",
        prepared: "Your order is ready for pickup!",
        completed: "Order completed. Thank you!",
      }

      setMessage(messages[status as keyof typeof messages] || "Order status updated")
      setShow(true)

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShow(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [status, previousStatus])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />
      case "preparing":
        return <ChefHat className="h-5 w-5 text-orange-600" />
      case "prepared":
        return <Utensils className="h-5 w-5 text-green-600" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getAlertStyle = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-200 bg-yellow-50"
      case "preparing":
        return "border-orange-200 bg-orange-50"
      case "prepared":
        return "border-green-200 bg-green-50"
      case "completed":
        return "border-green-200 bg-green-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  if (!show) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Alert className={`${getAlertStyle(status)} shadow-lg border-2 max-w-sm`}>
        <div className="flex items-center space-x-3">
          {getStatusIcon(status)}
          <div>
            <AlertDescription className="font-medium text-gray-800">{message}</AlertDescription>
            {customerName && <p className="text-sm text-gray-600 mt-1">Hi {customerName}!</p>}
          </div>
        </div>
      </Alert>
    </div>
  )
}

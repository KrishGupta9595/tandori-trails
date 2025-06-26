"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Minus, ShoppingCart, User, Phone, Eye, Search, X } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url?: string
}

interface Category {
  id: string
  name: string
  display_order: number
}

interface CartItem extends MenuItem {
  quantity: number
}

export default function MenuPage() {
  const searchParams = useSearchParams()
  const tableNumber = searchParams.get("table")
  const skipForm = searchParams.get("skipForm") === "true"

  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showCartPopup, setShowCartPopup] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  useEffect(() => {
    if (!tableNumber) {
      window.location.href = "/"
      return
    }

    // Check if we should skip the customer form (returning customer)
    if (skipForm) {
      // Get customer info from localStorage if available
      const savedCustomerName = localStorage.getItem("customerName")
      const savedCustomerPhone = localStorage.getItem("customerPhone")

      if (savedCustomerName && savedCustomerPhone) {
        setCustomerName(savedCustomerName)
        setCustomerPhone(savedCustomerPhone)
        setIsAuthenticated(true)
      } else {
        setShowCustomerForm(true)
      }
    } else {
      // Show customer form for new customers
      setShowCustomerForm(true)
    }

    fetchMenuData()

    // Set up real-time subscription for menu updates
    const subscription = supabase
      .channel("menu-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_items",
        },
        () => {
          fetchMenuData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => {
          fetchMenuData()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tableNumber, skipForm])

  const fetchMenuData = async () => {
    try {
      const [categoriesResult, menuItemsResult] = await Promise.all([
        supabase.from("categories").select("*").order("display_order"),
        supabase.from("menu_items").select("*").eq("is_available", true),
      ])

      if (categoriesResult.data) {
        setCategories(categoriesResult.data)
        // Set first category as active if none selected
        if (categoriesResult.data.length > 0 && activeCategory === "all") {
          setActiveCategory("all")
        }
      }
      if (menuItemsResult.data) setMenuItems(menuItemsResult.data)
    } catch (error) {
      console.error("Error fetching menu data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter menu items based on search query and active category
  const filteredMenuItems = useMemo(() => {
    let filtered = menuItems

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter((item) => item.category_id === activeCategory)
    }

    return filtered
  }, [menuItems, searchQuery, activeCategory])

  // Group filtered items by category for display
  const groupedItems = useMemo(() => {
    const grouped: { [key: string]: MenuItem[] } = {}

    if (activeCategory === "all") {
      // Show all categories with their items
      categories.forEach((category) => {
        const categoryItems = filteredMenuItems.filter((item) => item.category_id === category.id)
        if (categoryItems.length > 0) {
          grouped[category.id] = categoryItems
        }
      })
    } else {
      // Show only selected category
      const categoryItems = filteredMenuItems.filter((item) => item.category_id === activeCategory)
      if (categoryItems.length > 0) {
        grouped[activeCategory] = categoryItems
      }
    }

    return grouped
  }, [filteredMenuItems, categories, activeCategory])

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id)
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })

    // Show cart popup when item is added
    setShowCartPopup(true)
  }

  const updateQuantity = (itemId: string, change: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const newQuantity = item.quantity + change
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    })
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const handleCustomerSubmit = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Please fill in all fields")
      return
    }

    if (!/^\d{10}$/.test(customerPhone)) {
      alert("Please enter a valid 10-digit phone number")
      return
    }

    // Save customer info to localStorage for future orders
    localStorage.setItem("customerName", customerName)
    localStorage.setItem("customerPhone", customerPhone)

    setIsAuthenticated(true)
    setShowCustomerForm(false)
  }

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty")
      return
    }

    try {
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_number: Number.parseInt(tableNumber!),
          customer_name: customerName,
          customer_phone: customerPhone,
          total_amount: getTotalAmount(),
          status: "pending",
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) throw itemsError

      // Redirect to order status
      window.location.href = `/order-status?orderId=${orderData.id}`
    } catch (error) {
      console.error("Error placing order:", error)
      alert("Failed to place order. Please try again.")
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId)?.name || "Unknown"
  }

  if (!tableNumber) {
    return <div>Redirecting...</div>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tandoori-amethyst mx-auto mb-4"></div>
          <p className="text-lg text-tandoori-charcoal">Loading menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-tandoori-amethyst via-tandoori-amethyst-dark to-tandoori-amethyst-light text-white py-4 md:py-6 px-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Tandoori Trails</h1>
              <p className="opacity-90 text-sm md:text-base">Table {tableNumber}</p>
            </div>
            {isAuthenticated && (
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
                  {cart.length} items
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
                  ₹{getTotalAmount().toFixed(2)}
                </Badge>
                <Button
                  onClick={() => setShowCartPopup(true)}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs md:text-sm"
                >
                  <Eye className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">View </span>Cart
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isAuthenticated && (
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          {/* Search Bar */}
          <div className="mb-4 md:mb-6">
            <div className="relative max-w-md mx-auto md:mx-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tandoori-charcoal-light" />
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 md:h-12 border-2 border-tandoori-lavender focus:border-tandoori-amethyst rounded-xl"
              />
              {searchQuery && (
                <Button
                  onClick={clearSearch}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-tandoori-lavender"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Pill-shaped Category Buttons */}
          <div className="mb-6 md:mb-8">
            <div className="relative">
              <div className="flex overflow-x-auto scrollbar-hide space-x-3 pb-2 px-1">
                {/* All Items Button */}
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`flex-shrink-0 px-6 py-3 rounded-full font-medium text-sm md:text-base transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                    activeCategory === "all"
                      ? "bg-indigo-800 text-white shadow-lg font-semibold"
                      : "bg-gradient-to-r from-tandoori-amethyst via-tandoori-amethyst-dark to-tandoori-amethyst-light text-white hover:from-tandoori-amethyst-dark hover:via-tandoori-amethyst hover:to-tandoori-amethyst shadow-md"
                  }`}
                  style={{
                    backgroundColor: activeCategory === "all" ? "#4B0082" : undefined,
                  }}
                >
                  All Items
                </button>

                {/* Category Buttons */}
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex-shrink-0 px-6 py-3 rounded-full font-medium text-sm md:text-base transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                      activeCategory === category.id
                        ? "bg-indigo-800 text-white shadow-lg font-semibold"
                        : "bg-gradient-to-r from-tandoori-amethyst via-tandoori-amethyst-dark to-tandoori-amethyst-light text-white hover:from-tandoori-amethyst-dark hover:via-tandoori-amethyst hover:to-tandoori-amethyst shadow-md"
                    }`}
                    style={{
                      backgroundColor: activeCategory === category.id ? "#4B0082" : undefined,
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Gradient fade effect for scroll indication */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-tandoori-lavender-light to-transparent pointer-events-none"></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-4 md:gap-8">
            {/* Menu Section */}
            <div className="lg:col-span-3 space-y-4 md:space-y-6">
              {Object.keys(groupedItems).length === 0 ? (
                <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
                  <CardContent className="p-8 text-center">
                    <p className="text-tandoori-charcoal-light text-lg">
                      {searchQuery ? `No items found for "${searchQuery}"` : "No items available"}
                    </p>
                    {searchQuery && (
                      <Button onClick={clearSearch} variant="outline" className="mt-4 border-tandoori-lavender">
                        Clear Search
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                Object.entries(groupedItems).map(([categoryId, items]) => (
                  <Card key={categoryId} className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
                    <CardHeader className="bg-gradient-to-r from-tandoori-lavender to-tandoori-lavender-light rounded-t-lg">
                      <CardTitle className="text-lg md:text-xl lg:text-2xl font-bold text-tandoori-charcoal">
                        {getCategoryName(categoryId)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <div className="grid gap-3 md:gap-4">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-3 md:p-4 border border-tandoori-lavender rounded-lg hover:bg-tandoori-lavender-light transition-colors"
                          >
                            <div className="flex space-x-3 md:space-x-4 flex-1 mb-3 sm:mb-0">
                              {item.image_url && (
                                <img
                                  src={item.image_url || "/placeholder.svg"}
                                  alt={item.name}
                                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base md:text-lg text-tandoori-charcoal mb-1 truncate">
                                  {item.name}
                                </h3>
                                <p className="text-tandoori-charcoal-light text-xs md:text-sm mb-2 line-clamp-2">
                                  {item.description}
                                </p>
                                <p className="font-bold text-base md:text-lg text-tandoori-amethyst">
                                  ₹{item.price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => addToCart(item)}
                              size="sm"
                              className="w-full sm:w-auto sm:ml-4 bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light hover:from-tandoori-amethyst-dark hover:to-tandoori-amethyst rounded-lg"
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Cart Section - Desktop Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur sticky top-24">
                <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-t-lg">
                  <CardTitle className="flex items-center text-lg font-bold text-tandoori-charcoal">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Your Order
                  </CardTitle>
                  <CardDescription className="text-tandoori-charcoal-light text-sm">
                    Table {tableNumber} • {customerName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {cart.length === 0 ? (
                    <p className="text-tandoori-charcoal-light text-center py-8 text-sm">Your cart is empty</p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 border border-tandoori-lavender rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-tandoori-charcoal text-sm truncate">{item.name}</h4>
                            <p className="text-xs text-tandoori-charcoal-light">₹{item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="h-6 w-6 p-0 border-tandoori-lavender"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-medium w-6 text-center text-tandoori-charcoal text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="h-6 w-6 p-0 border-tandoori-lavender"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <Separator />

                      <div className="flex justify-between items-center font-bold">
                        <span className="text-tandoori-charcoal">Total:</span>
                        <span className="text-tandoori-amethyst">₹{getTotalAmount().toFixed(2)}</span>
                      </div>

                      <Button
                        onClick={placeOrder}
                        className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-semibold rounded-lg"
                      >
                        Place Order
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile Cart Button */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
              <Button
                onClick={() => setShowCartPopup(true)}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg rounded-xl font-semibold"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                View Cart ({cart.length}) • ₹{getTotalAmount().toFixed(2)}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Customer Information Dialog */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="sm:max-w-md bg-tandoori-white mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-tandoori-charcoal">Customer Information</DialogTitle>
            <DialogDescription className="text-tandoori-charcoal-light">
              Please provide your details to continue ordering
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center font-medium text-tandoori-charcoal">
                <User className="mr-2 h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="border-2 border-tandoori-lavender focus:border-tandoori-amethyst"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center font-medium text-tandoori-charcoal">
                <Phone className="mr-2 h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="Enter 10-digit phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="border-2 border-tandoori-lavender focus:border-tandoori-amethyst"
              />
            </div>
            <Button
              onClick={handleCustomerSubmit}
              className="w-full bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light hover:from-tandoori-amethyst-dark hover:to-tandoori-amethyst"
            >
              Continue to Menu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Popup Dialog */}
      <Dialog open={showCartPopup} onOpenChange={setShowCartPopup}>
        <DialogContent className="sm:max-w-md bg-tandoori-white mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl font-bold text-tandoori-charcoal">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Your Cart
            </DialogTitle>
            <DialogDescription className="text-tandoori-charcoal-light">
              {cart.length} item{cart.length !== 1 ? "s" : ""} • Table {tableNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {cart.length === 0 ? (
              <p className="text-tandoori-charcoal-light text-center py-8">Your cart is empty</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 border border-tandoori-lavender rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-tandoori-charcoal truncate">{item.name}</h4>
                      <p className="text-sm text-tandoori-charcoal-light">₹{item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-8 w-8 p-0 border-tandoori-lavender"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-medium w-8 text-center text-tandoori-charcoal">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-8 w-8 p-0 border-tandoori-lavender"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between items-center font-bold text-lg">
                  <span className="text-tandoori-charcoal">Total:</span>
                  <span className="text-tandoori-amethyst">₹{getTotalAmount().toFixed(2)}</span>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    onClick={() => setShowCartPopup(false)}
                    variant="outline"
                    className="flex-1 border-tandoori-lavender"
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    onClick={placeOrder}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    Place Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

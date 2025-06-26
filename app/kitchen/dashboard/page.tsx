"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChefHat, Plus, Edit, Trash2, Save, Home, LogOut, Menu } from "lucide-react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import dynamic from "next/dynamic"
// OLD (delete or comment out)
// import KitchenOrderCard from "@/components/kitchen-order-card"

// NEW
const KitchenOrderCard = dynamic(() => import("@/components/kitchen-order-card"), { ssr: false })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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

interface Category {
  id: string
  name: string
  display_order: number
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url: string | null
  is_available: boolean
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Form states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [newCategory, setNewCategory] = useState({ name: "", display_order: 0 })
  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    image_url: "",
    is_available: true,
  })

  useEffect(() => {
    // Check authentication
    checkAuth()
    fetchData()

    // Set up comprehensive real-time subscriptions
    const ordersSubscription = supabase
      .channel("kitchen-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Order change detected:", payload)
          fetchOrders() // Refresh orders when any change occurs
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        (payload) => {
          console.log("Order items change detected:", payload)
          fetchOrders() // Refresh orders when order items change
        },
      )
      .subscribe((status) => {
        console.log("Kitchen subscription status:", status)
      })

    return () => {
      console.log("Cleaning up kitchen subscriptions")
      ordersSubscription.unsubscribe()
    }
  }, [])

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = "/kitchen/login"
      return
    }

    // Verify kitchen staff role (case-insensitive)
    const { data: staffUser } = await supabase
      .from("staff_users")
      .select("role")
      .ilike("email", user.email || "")
      .eq("role", "kitchen")
      .single()

    if (!staffUser) {
      await supabase.auth.signOut()
      window.location.href = "/kitchen/login"
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const fetchData = async () => {
    await Promise.all([fetchOrders(), fetchCategories(), fetchMenuItems()])
    setLoading(false)
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          quantity,
          menu_items (
            name
          )
        )
      `)
      .in("status", ["pending", "preparing", "prepared"])
      .order("created_at", { ascending: true })

    if (data) setOrders(data)
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("display_order")

    if (data) setCategories(data)
  }

  const fetchMenuItems = async () => {
    const { data } = await supabase.from("menu_items").select("*").order("name")

    if (data) setMenuItems(data)
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) {
        console.error("Error updating order status:", error)
        alert("Failed to update order status. Please try again.")
      } else {
        console.log(`Order ${orderId} status updated to ${status}`)
        // The real-time subscription will automatically refresh the orders
      }
    } catch (error) {
      console.error("Error updating order status:", error)
      alert("Failed to update order status. Please try again.")
    }
  }

  // --- helpers now call our API routes ---

  const saveCategory = async () => {
    if (editingCategory) {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory),
      })
      if (res.ok) {
        setEditingCategory(null)
        fetchCategories()
      } else alert("Failed to update category")
    } else {
      if (!newCategory.name) return alert("Please enter a category name")
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      })
      if (res.ok) {
        setNewCategory({ name: "", display_order: 0 })
        fetchCategories()
      } else alert("Failed to create category")
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return
    const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      fetchCategories()
      fetchMenuItems()
    } else alert("Failed to delete category")
  }

  const saveMenuItem = async () => {
    if (editingMenuItem) {
      const res = await fetch("/api/menu-items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMenuItem),
      })
      if (res.ok) {
        setEditingMenuItem(null)
        fetchMenuItems()
      } else alert("Failed to update item")
    } else {
      if (!newMenuItem.name || !newMenuItem.category_id || newMenuItem.price <= 0) return alert("Fill required fields")
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMenuItem),
      })
      if (res.ok) {
        setNewMenuItem({
          name: "",
          description: "",
          price: 0,
          category_id: "",
          image_url: "",
          is_available: true,
        })
        fetchMenuItems()
      } else alert("Failed to create item")
    }
  }

  const deleteMenuItem = async (id: string) => {
    if (!confirm("Delete this menu item?")) return
    const res = await fetch(`/api/menu-items?id=${id}`, { method: "DELETE" })
    if (res.ok) fetchMenuItems()
    else alert("Failed to delete item")
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-tandoori-charcoal">Loading kitchen dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-4 md:py-6 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <ChefHat className="h-6 w-6 md:h-8 md:w-8" />
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Kitchen Dashboard</h1>
              <p className="opacity-90 text-sm md:text-base">Tandoori Trails</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Home className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LogOut className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              variant="outline"
              size="sm"
              className="md:hidden bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <Tabs defaultValue="orders" className="space-y-4 md:space-y-6">
          <TabsList
            className={`grid w-full grid-cols-3 bg-tandoori-white shadow-lg ${mobileMenuOpen ? "block" : "hidden md:grid"}`}
          >
            <TabsTrigger
              value="orders"
              className="text-sm md:text-lg font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="text-sm md:text-lg font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="menu"
              className="text-sm md:text-lg font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              Menu Items
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6">
              {["pending", "preparing", "prepared"].map((status) => {
                const statusOrders = orders.filter((order) => order.status === status)
                return (
                  <Card key={status} className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
                    <CardHeader className="bg-gradient-to-r from-tandoori-lavender to-tandoori-lavender-light rounded-t-lg">
                      <CardTitle className="text-lg md:text-xl font-bold text-tandoori-charcoal capitalize">
                        {status} Orders ({statusOrders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      {statusOrders.length === 0 ? (
                        <p className="text-tandoori-charcoal-light text-center py-8">No {status} orders</p>
                      ) : (
                        <div className="grid gap-4">
                          {statusOrders.map((order) => (
                            <KitchenOrderCard key={order.id} order={order} onStatusUpdate={updateOrderStatus} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4 md:space-y-6">
            <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
              <CardHeader className="bg-gradient-to-r from-tandoori-lavender to-tandoori-lavender-light rounded-t-lg">
                <CardTitle className="text-lg md:text-xl font-bold text-tandoori-charcoal">Manage Categories</CardTitle>
                <CardDescription className="text-tandoori-charcoal-light">
                  Add, edit, or delete menu categories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {/* Add New Category */}
                <div className="mb-6 p-4 border border-tandoori-lavender rounded-lg bg-tandoori-lavender-light">
                  <h3 className="font-semibold text-tandoori-charcoal mb-3">Add New Category</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="categoryName" className="text-tandoori-charcoal">
                        Category Name
                      </Label>
                      <Input
                        id="categoryName"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="e.g., Starters"
                        className="border-tandoori-lavender focus:border-tandoori-amethyst"
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayOrder" className="text-tandoori-charcoal">
                        Display Order
                      </Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        value={newCategory.display_order}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, display_order: Number.parseInt(e.target.value) })
                        }
                        placeholder="1"
                        className="border-tandoori-lavender focus:border-tandoori-amethyst"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={saveCategory}
                        className="w-full bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Existing Categories */}
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-tandoori-lavender rounded-lg space-y-4 md:space-y-0"
                    >
                      {editingCategory?.id === category.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="border-tandoori-lavender focus:border-tandoori-amethyst"
                          />
                          <Input
                            type="number"
                            value={editingCategory.display_order}
                            onChange={(e) =>
                              setEditingCategory({ ...editingCategory, display_order: Number.parseInt(e.target.value) })
                            }
                            className="border-tandoori-lavender focus:border-tandoori-amethyst"
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={saveCategory}
                              size="sm"
                              className="bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light flex-1"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setEditingCategory(null)}
                              variant="outline"
                              size="sm"
                              className="border-tandoori-lavender flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <h4 className="font-semibold text-tandoori-charcoal">{category.name}</h4>
                            <p className="text-sm text-tandoori-charcoal-light">Order: {category.display_order}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => setEditingCategory(category)}
                              variant="outline"
                              size="sm"
                              className="border-tandoori-lavender"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => deleteCategory(category.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 border-tandoori-lavender"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Items Tab */}
          <TabsContent value="menu" className="space-y-4 md:space-y-6">
            <Card className="shadow-lg border-0 bg-tandoori-white/95 backdrop-blur">
              <CardHeader className="bg-gradient-to-r from-tandoori-lavender to-tandoori-lavender-light rounded-t-lg">
                <CardTitle className="text-lg md:text-xl font-bold text-tandoori-charcoal">Manage Menu Items</CardTitle>
                <CardDescription className="text-tandoori-charcoal-light">
                  Add, edit, or delete menu items
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {/* Add New Menu Item */}
                <div className="mb-6 p-4 border border-tandoori-lavender rounded-lg bg-tandoori-lavender-light">
                  <h3 className="font-semibold text-tandoori-charcoal mb-3">Add New Menu Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="itemName" className="text-tandoori-charcoal">
                        Item Name
                      </Label>
                      <Input
                        id="itemName"
                        value={newMenuItem.name}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                        placeholder="e.g., Butter Chicken"
                        className="border-tandoori-lavender focus:border-tandoori-amethyst"
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemPrice" className="text-tandoori-charcoal">
                        Price (₹)
                      </Label>
                      <Input
                        id="itemPrice"
                        type="number"
                        step="0.01"
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, price: Number.parseFloat(e.target.value) })}
                        placeholder="350.00"
                        className="border-tandoori-lavender focus:border-tandoori-amethyst"
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemCategory" className="text-tandoori-charcoal">
                        Category
                      </Label>
                      <Select
                        value={newMenuItem.category_id}
                        onValueChange={(value) => setNewMenuItem({ ...newMenuItem, category_id: value })}
                      >
                        <SelectTrigger className="border-tandoori-lavender focus:border-tandoori-amethyst">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="itemImage" className="text-tandoori-charcoal">
                        Image URL
                      </Label>
                      <Input
                        id="itemImage"
                        value={newMenuItem.image_url}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="border-tandoori-lavender focus:border-tandoori-amethyst"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="itemDescription" className="text-tandoori-charcoal">
                        Description
                      </Label>
                      <Textarea
                        id="itemDescription"
                        value={newMenuItem.description}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                        placeholder="Delicious description of the dish..."
                        rows={3}
                        className="border-tandoori-lavender focus:border-tandoori-amethyst"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        onClick={saveMenuItem}
                        className="w-full bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Menu Item
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Existing Menu Items */}
                <div className="space-y-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col lg:flex-row lg:items-start justify-between p-4 border border-tandoori-lavender rounded-lg space-y-4 lg:space-y-0"
                    >
                      <div className="flex space-x-4 flex-1">
                        {item.image_url && (
                          <img
                            src={item.image_url || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-tandoori-charcoal">{item.name}</h4>
                          <p className="text-sm text-tandoori-charcoal-light mb-1 line-clamp-2">{item.description}</p>
                          <p className="font-bold text-tandoori-amethyst">₹{item.price.toFixed(2)}</p>
                          <Badge variant={item.is_available ? "default" : "secondary"} className="mt-1">
                            {item.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2 lg:ml-4">
                        <Button
                          onClick={() => setEditingMenuItem(item)}
                          variant="outline"
                          size="sm"
                          className="border-tandoori-lavender flex-1 lg:flex-none"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteMenuItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 border-tandoori-lavender flex-1 lg:flex-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Menu Item Dialog */}
      {editingMenuItem && (
        <Dialog open={!!editingMenuItem} onOpenChange={() => setEditingMenuItem(null)}>
          <DialogContent className="max-w-2xl bg-tandoori-white mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-tandoori-charcoal">Edit Menu Item</DialogTitle>
              <DialogDescription className="text-tandoori-charcoal-light">
                Update the menu item details
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="editItemName" className="text-tandoori-charcoal">
                  Item Name
                </Label>
                <Input
                  id="editItemName"
                  value={editingMenuItem.name}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, name: e.target.value })}
                  className="border-tandoori-lavender focus:border-tandoori-amethyst"
                />
              </div>
              <div>
                <Label htmlFor="editItemPrice" className="text-tandoori-charcoal">
                  Price (₹)
                </Label>
                <Input
                  id="editItemPrice"
                  type="number"
                  step="0.01"
                  value={editingMenuItem.price}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, price: Number.parseFloat(e.target.value) })}
                  className="border-tandoori-lavender focus:border-tandoori-amethyst"
                />
              </div>
              <div>
                <Label htmlFor="editItemCategory" className="text-tandoori-charcoal">
                  Category
                </Label>
                <Select
                  value={editingMenuItem.category_id}
                  onValueChange={(value) => setEditingMenuItem({ ...editingMenuItem, category_id: value })}
                >
                  <SelectTrigger className="border-tandoori-lavender focus:border-tandoori-amethyst">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editItemImage" className="text-tandoori-charcoal">
                  Image URL
                </Label>
                <Input
                  id="editItemImage"
                  value={editingMenuItem.image_url || ""}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, image_url: e.target.value })}
                  className="border-tandoori-lavender focus:border-tandoori-amethyst"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="editItemDescription" className="text-tandoori-charcoal">
                  Description
                </Label>
                <Textarea
                  id="editItemDescription"
                  value={editingMenuItem.description}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, description: e.target.value })}
                  rows={3}
                  className="border-tandoori-lavender focus:border-tandoori-amethyst"
                />
              </div>
              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editItemAvailable"
                  checked={editingMenuItem.is_available}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, is_available: e.target.checked })}
                />
                <Label htmlFor="editItemAvailable" className="text-tandoori-charcoal">
                  Available for ordering
                </Label>
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  onClick={saveMenuItem}
                  className="flex-1 bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button
                  onClick={() => setEditingMenuItem(null)}
                  variant="outline"
                  className="flex-1 border-tandoori-lavender"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

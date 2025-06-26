"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ChefHat, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [tableNumber, setTableNumber] = useState("")
  const [showStaffLogin, setShowStaffLogin] = useState(false)

  const handleViewMenu = () => {
    if (!tableNumber.trim()) {
      alert("Please enter your table number")
      return
    }

    if (!/^\d+$/.test(tableNumber)) {
      alert("Please enter a valid table number")
      return
    }

    // Redirect to menu with table number
    window.location.href = `/menu?table=${tableNumber}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-tandoori-amethyst via-tandoori-amethyst-dark to-tandoori-amethyst-light text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-wide">🍛 Tandoori Trails</h1>
          <p className="text-xl md:text-2xl opacity-90 font-medium">Authentic Indian Flavors & Spices</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {!showStaffLogin ? (
          <Card className="shadow-2xl border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-tandoori-charcoal mb-2">Welcome to Your Table</CardTitle>
              <CardDescription className="text-lg text-tandoori-charcoal-light">
                Enter your table number to start ordering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tableNumber" className="text-lg font-semibold text-tandoori-charcoal">
                  Table Number
                </Label>
                <Input
                  id="tableNumber"
                  type="text"
                  placeholder="Enter your table number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="h-14 text-lg border-2 border-tandoori-lavender focus:border-tandoori-amethyst rounded-xl"
                />
              </div>

              <Button
                onClick={handleViewMenu}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light hover:from-tandoori-amethyst-dark hover:to-tandoori-amethyst rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                View Menu 🍽️
              </Button>

              <div className="text-center pt-6">
                <button
                  onClick={() => setShowStaffLogin(true)}
                  className="text-tandoori-amethyst hover:text-tandoori-amethyst-dark font-medium underline transition-colors"
                >
                  Staff Access
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-0 bg-tandoori-white/95 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-tandoori-charcoal">Staff Access</CardTitle>
              <CardDescription className="text-tandoori-charcoal-light">Choose your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Link href="/kitchen/login">
                <Button className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg transition-all duration-300 rounded-full my-2">
                  <ChefHat className="mr-2 h-5 w-5" />
                  Kitchen Login
                </Button>
              </Link>

              <Link href="/admin/login">
                <Button className="w-full text-lg font-semibold bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light hover:from-tandoori-amethyst-dark hover:to-tandoori-amethyst shadow-lg transition-all duration-300 h-14 rounded-full">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Admin Login
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={() => setShowStaffLogin(false)}
                className="w-full h-12 border-2 border-tandoori-lavender hover:border-tandoori-amethyst mt-4 rounded-full"
              >
                Back to Customer Menu
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-tandoori-charcoal to-tandoori-charcoal-light text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <p className="text-lg font-medium mb-2">Experience the Rich Heritage of Indian Cuisine</p>
          <p className="opacity-80">Made with ❤️ for food lovers</p>
        </div>
      </div>
    </div>
  )
}

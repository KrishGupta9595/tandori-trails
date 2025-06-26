"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart3, Eye, EyeOff, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Normalize email to lowercase for consistency
      const normalizedEmail = email.toLowerCase().trim()

      // 1 – Attempt standard sign-in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInErr) {
        // Check if it’s the “invalid credentials” error
        const needsSignUp =
          signInErr.message?.toLowerCase().includes("invalid login credentials") || signInErr.status === 400

        if (needsSignUp) {
          // 2 – Create the account on the fly
          const { error: signUpErr } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
          })

          // if sign-up failed for any reason bail out
          if (signUpErr) throw signUpErr

          // 3 – Immediately sign-in after successful sign-up
          const { error: signInErr2 } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
          if (signInErr2) throw signInErr2
        } else {
          // Other auth related errors
          throw signInErr
        }
      }

      // 4 – Check staff role
      const { data: staffUser } = await supabase
        .from("staff_users")
        .select("role")
        .ilike("email", normalizedEmail)
        .eq("role", "admin")
        .single()

      if (!staffUser) {
        setError("Access denied. Admin staff only.")
        await supabase.auth.signOut()
        return
      }

      window.location.href = "/admin/dashboard"
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tandoori-lavender via-tandoori-lavender-light to-tandoori-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="border-tandoori-lavender hover:bg-tandoori-lavender-light">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="shadow-2xl border-0 bg-tandoori-white/95 backdrop-blur">
          <CardHeader className="text-center pb-8 bg-gradient-to-r from-tandoori-lavender to-tandoori-lavender-light rounded-t-lg">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-tandoori-amethyst rounded-full">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-tandoori-charcoal">Admin Login</CardTitle>
            <CardDescription className="text-tandoori-charcoal-light">
              Access the admin dashboard for analytics and management
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-tandoori-charcoal font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 border-2 border-tandoori-lavender focus:border-tandoori-amethyst rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-tandoori-charcoal font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 border-2 border-tandoori-lavender focus:border-tandoori-amethyst rounded-lg pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-tandoori-charcoal-light" />
                    ) : (
                      <Eye className="h-4 w-4 text-tandoori-charcoal-light" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-tandoori-amethyst to-tandoori-amethyst-light hover:from-tandoori-amethyst-dark hover:to-tandoori-amethyst rounded-lg shadow-lg transition-all duration-300"
              >
                {loading ? "Signing In..." : "Sign In to Admin"}
              </Button>
            </form>

            <div className="mt-8 p-4 bg-tandoori-lavender-light rounded-lg">
              <h4 className="font-semibold text-tandoori-charcoal mb-2">Demo Credentials:</h4>
              <p className="text-sm text-tandoori-charcoal-light">
                <strong>Email:</strong> admin@gmail.com
                <br />
                <strong>Password:</strong> admin2024
              </p>
              <p className="text-xs text-tandoori-charcoal-light mt-2 italic">
                * Email is case-insensitive (ADMIN@GMAIL.COM also works)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

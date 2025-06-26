"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface TestResult {
  name: string
  status: "success" | "error" | "warning"
  message: string
}

export default function SupabaseTest() {
  const [results, setResults] = useState<TestResult[]>([])
  const [testing, setTesting] = useState(false)

  const runTests = async () => {
    setTesting(true)
    const testResults: TestResult[] = []

    // Test 1: Connection
    try {
      const { data, error } = await supabase.from("categories").select("count")
      if (error) throw error
      testResults.push({
        name: "Database Connection",
        status: "success",
        message: "Successfully connected to Supabase",
      })
    } catch (error) {
      testResults.push({
        name: "Database Connection",
        status: "error",
        message: `Connection failed: ${error}`,
      })
    }

    // Test 2: Tables exist
    try {
      const tables = ["categories", "menu_items", "orders", "order_items", "staff_users"]
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*").limit(1)
        if (error) throw new Error(`Table ${table} not found`)
      }
      testResults.push({
        name: "Database Tables",
        status: "success",
        message: "All required tables exist",
      })
    } catch (error) {
      testResults.push({
        name: "Database Tables",
        status: "error",
        message: `Table check failed: ${error}`,
      })
    }

    // Test 3: Sample data
    try {
      const { data: categories } = await supabase.from("categories").select("*")
      const { data: menuItems } = await supabase.from("menu_items").select("*")

      if (!categories || categories.length === 0) {
        throw new Error("No categories found")
      }
      if (!menuItems || menuItems.length === 0) {
        throw new Error("No menu items found")
      }

      testResults.push({
        name: "Sample Data",
        status: "success",
        message: `Found ${categories.length} categories and ${menuItems.length} menu items`,
      })
    } catch (error) {
      testResults.push({
        name: "Sample Data",
        status: "warning",
        message: `Sample data issue: ${error}`,
      })
    }

    // Test 4: Authentication setup
    try {
      const { data: staffUsers } = await supabase.from("staff_users").select("*")

      if (!staffUsers || staffUsers.length === 0) {
        testResults.push({
          name: "Staff Users",
          status: "warning",
          message: "No staff users found. Create them manually in Supabase Auth.",
        })
      } else {
        testResults.push({
          name: "Staff Users",
          status: "success",
          message: `Found ${staffUsers.length} staff users`,
        })
      }
    } catch (error) {
      testResults.push({
        name: "Staff Users",
        status: "error",
        message: `Staff users check failed: ${error}`,
      })
    }

    // Test 5: Environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      testResults.push({
        name: "Environment Variables",
        status: "error",
        message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      })
    } else {
      testResults.push({
        name: "Environment Variables",
        status: "success",
        message: "Environment variables are configured",
      })
    }

    setResults(testResults)
    setTesting(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
        <CardDescription>Test your Supabase setup and database connection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={testing} className="w-full">
          {testing ? "Running Tests..." : "Run Connection Tests"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{result.name}</h4>
                    <Badge className={getStatusColor(result.status)}>{result.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• If all tests pass, your Supabase setup is complete!</li>
              <li>• For warnings, check the SUPABASE_SETUP.md guide</li>
              <li>• For errors, verify your environment variables and database setup</li>
              <li>• Create staff users in Supabase Auth dashboard if needed</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

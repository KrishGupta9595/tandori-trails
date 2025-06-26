import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from("menu_items").insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const body = await req.json() // { id, ...fields }
  const { id, ...update } = body
  const { error } = await supabase.from("menu_items").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const { error } = await supabase.from("menu_items").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

import { type NextRequest, NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { checkClickRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check and consume a click
    const result = await checkClickRateLimit(user.id)

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          remaining: result.remaining,
          reset: result.reset,
        },
        { status: 429 },
      )
    }

    return NextResponse.json({
      success: true,
      remaining: result.remaining,
      reset: result.reset,
    })
  } catch (error) {
    console.error("Click API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

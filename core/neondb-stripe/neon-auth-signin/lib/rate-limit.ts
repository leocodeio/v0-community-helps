import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "./redis"
import { getStripePlan } from "@/app/api/stripe/plans"

// Free plan rate limiter: 5 clicks per day
const freeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(5, "1 d", 5),
  analytics: true,
  prefix: "free_click_limit",
})

// Pro plan rate limiter: 50 clicks per day
const proRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(50, "1 d", 50),
  analytics: true,
  prefix: "pro_click_limit",
})

// Function to check and consume rate limit tokens based on user's plan
export async function checkClickRateLimit(userId: string) {
  const plan = await getStripePlan(userId)
  const rateLimit = plan.id === "PRO" ? proRateLimit : freeRateLimit
  return rateLimit.limit(userId)
}

// Function to get rate limit status without consuming tokens
export async function getRateLimitStatus(userId: string) {
  const plan = await getStripePlan(userId)
  const rateLimit = plan.id === "PRO" ? proRateLimit : freeRateLimit
  const result = await rateLimit.getRemaining(userId)

  return {
    remaining: result.remaining,
    reset: result.reset,
  }
}

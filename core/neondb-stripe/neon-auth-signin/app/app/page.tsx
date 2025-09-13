import { stackServerApp } from "@/stack"
import { getStripeCustomerId, getStripeCustomer } from "@/lib/stripe"
import { getStripePlan } from "@/app/api/stripe/plans"
import { getRateLimitStatus } from "@/lib/rate-limit"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClickButton } from "@/components/click-button"

export default async function AppPage() {
  const user = await stackServerApp.getUser({ or: "redirect" })

  const [customerId, plan, rateLimitStatus] = await Promise.all([
    getStripeCustomerId(user.id),
    getStripePlan(user.id),
    getRateLimitStatus(user.id),
  ])

  const subscription = customerId ? await getStripeCustomer(customerId) : null

  const clickLimit = plan.clickLimit
  const clicksUsed = clickLimit - rateLimitStatus.remaining
  const isPro = plan.id === "PRO"
  const isActive = subscription?.status === "active"
  const isOutOfClicks = rateLimitStatus.remaining === 0

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card className="w-full">
        <CardContent className="pt-6 space-y-6 text-center">
          <h1 className="text-2xl font-bold">{user.displayName || "Welcome"}</h1>

          <Badge variant={isPro && isActive ? "default" : "secondary"} className="text-sm">
            {isPro && isActive ? "Pro Plan" : "Free Plan"}
          </Badge>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              {clicksUsed} / {clickLimit}
            </p>
            <p className="text-sm text-muted-foreground">clicks used today</p>
          </div>

          {isOutOfClicks ? (
            !isPro ? (
              <Button size="lg" className="w-full">
                Upgrade to Pro
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No clicks remaining today</p>
            )
          ) : (
            <ClickButton remaining={rateLimitStatus.remaining} isPro={isPro && isActive} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

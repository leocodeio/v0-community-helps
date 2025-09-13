import { getStripeCustomerId, getStripeCustomer } from "@/lib/stripe"

// Add new plans here
const defaultPlans = [
  {
    id: "FREE",
    priceId: undefined,
    clickLimit: 5,
  },
  {
    id: "PRO",
    priceId: "price_1R3aDvLxBMFKq9DZn1vkvwwW",
    clickLimit: 50,
  },
]

export async function getPlans() {
  return defaultPlans
}

export async function getStripePlan(userId: string) {
  const plans = await getPlans()
  const freePlan = plans.find((plan) => plan.priceId === undefined) ?? plans[0]

  const customerId = await getStripeCustomerId(userId)
  if (!customerId) {
    return freePlan
  }

  const subData = await getStripeCustomer(customerId)
  if (!subData || subData.status !== "active") {
    // Inactive subscriptions happen after canceling, once the billing period ends
    return freePlan
  }

  return plans.find((plan) => plan.priceId === subData.priceId) ?? freePlan
}

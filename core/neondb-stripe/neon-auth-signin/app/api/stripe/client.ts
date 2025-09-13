"use server"
/**
 * This is the file you should edit to add Stripe features to your project.
 */
import { createStripeCustomer, getStripeCustomerId, stripe } from "@/lib/stripe"
import { redirect } from "next/navigation"
import { getPlans } from "./plans"
import { headers } from "next/headers"

export async function redirectToCheckout({
  userId,
  email,
  name,
}: {
  userId: string
  email: string
  name?: string | null
}) {
  const customerId = await getStripeCustomerId(userId)
  let stripeCustomerId = customerId

  if (!stripeCustomerId) {
    // Create a new customer if one doesn't exist
    const customer = await createStripeCustomer({
      userId,
      email,
      name,
    })
    stripeCustomerId = customer.id
  }

  const headersList = headers()
  const host = headersList.get("host")
  const protocol = headersList.get("x-forwarded-proto") || "https"
  const baseUrl = `${protocol}://${host}`

  const plans = await getPlans()
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: plans.find((plan) => plan.id === "PRO")?.priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${baseUrl}/api/stripe`,
    cancel_url: `${baseUrl}/api/stripe`,
    metadata: {
      userId,
    },
  })

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session")
  }

  redirect(checkoutSession.url)
}

export async function redirectToBillingPortal({
  userId,
}: {
  userId: string
}) {
  const customerId = await getStripeCustomerId(userId)
  if (!customerId) {
    throw new Error("Customer not found")
  }

  const headersList = headers()
  const host = headersList.get("host")
  const protocol = headersList.get("x-forwarded-proto") || "https"
  const baseUrl = `${protocol}://${host}`

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/app/settings`,
  })

  if (!portalSession.url) {
    throw new Error("Failed to create portal session")
  }

  redirect(portalSession.url)
}

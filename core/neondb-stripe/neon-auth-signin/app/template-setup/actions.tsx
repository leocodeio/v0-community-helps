"use server"

import Stripe from "stripe"
import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { neon } from "@neondatabase/serverless"

export async function getTableStatus() {
  try {
    // Check if DATABASE_URL is available first
    if (!process.env.DATABASE_URL) {
      console.log("DATABASE_URL not set, skipping table check")
      return {
        tables: {
          users_sync: false,
        },
      }
    }

    // Check only users_sync table
    const tables = ["users_sync"]
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          const result = await sql`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'neon_auth' AND table_name = ${table}
            ) as exists
          `
          return { table, exists: result[0]?.exists || false }
        } catch (error) {
          return { table, exists: false }
        }
      }),
    )

    return {
      tables: Object.fromEntries(results.map(({ table, exists }) => [table, exists])),
    }
  } catch (error) {
    console.error("Error checking table status:", error)
    return {
      tables: {
        users_sync: false,
      },
    }
  }
}

export async function checkMigrations() {
  try {
    // Check if DATABASE_URL is available first
    if (!process.env.DATABASE_URL) {
      console.log("DATABASE_URL not set, skipping migration check")
      return {
        tables: {
          users_sync: false,
        },
        columns: {
          users_sync_image: false,
        },
      }
    }

    // Check only users_sync table
    const tables = ["users_sync"]
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          const result = await sql`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'neon_auth' AND table_name = ${table}
            ) as exists
          `
          return { table, exists: result[0]?.exists || false }
        } catch (error) {
          return { table, exists: false }
        }
      }),
    )

    // Check if image column exists in users_sync table
    let imageColumnExists = false
    try {
      const imageColumnResult = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'neon_auth' 
          AND table_name = 'users_sync' 
          AND column_name = 'image'
        ) as exists
      `
      imageColumnExists = imageColumnResult[0]?.exists || false
    } catch (error) {
      imageColumnExists = false
    }

    return {
      tables: Object.fromEntries(results.map(({ table, exists }) => [table, exists])),
      columns: {
        users_sync_image: imageColumnExists,
      },
    }
  } catch (error) {
    return {
      tables: {
        users_sync: false,
      },
      columns: {
        users_sync_image: false,
      },
    }
  }
}

export async function runMigrations(formData: FormData): Promise<void> {
  try {
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set. Please configure your database first.")
      return
    }

    console.log("Setting up client...")

    // verify the connection is working
    await sql`SELECT 1`

    // Running migrations manually...

    // Add image column to neon_auth.users_sync table if it doesn't exist
    try {
      await sql`
        ALTER TABLE neon_auth.users_sync 
        ADD COLUMN IF NOT EXISTS image text
      `
      console.log("Image column added to users_sync table")
    } catch (error) {
      console.log("Image column may already exist or error adding:", error)
    }

    console.log("Migrations completed successfully")

    // Revalidate the page to show updated migration status
    revalidatePath("/dev-checklist")
  } catch (error) {
    console.error("Error running migrations:", error)
  }
}

export async function registerStripeWebhook() {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    const VERCEL_URL = process.env.VERCEL_URL

    if (!STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is required")
      return
    }

    if (!VERCEL_URL) {
      console.error("VERCEL_URL is required")
      return
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-04-30.basil",
    })

    // Define the events to listen for (same as in stripe.dev.ts)
    const events = [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "customer.subscription.paused",
      "customer.subscription.resumed",
      "customer.subscription.pending_update_applied",
      "customer.subscription.pending_update_expired",
      "customer.subscription.trial_will_end",
      "invoice.paid",
      "invoice.payment_failed",
      "invoice.payment_action_required",
      "invoice.upcoming",
      "invoice.marked_uncollectible",
      "invoice.payment_succeeded",
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
      "payment_intent.canceled",
    ] as Stripe.WebhookEndpointCreateParams.EnabledEvent[]

    // Construct the webhook URL with https:// prefix
    const webhookUrl = VERCEL_URL.startsWith("http") ? `${VERCEL_URL}/api/stripe` : `https://${VERCEL_URL}/api/stripe`

    console.log(`🔄 Registering Stripe webhook for ${webhookUrl}...`)

    // First, list existing webhooks to avoid duplicates
    const existingEndpoints = await stripe.webhookEndpoints.list()

    // Check if we already have a webhook for this URL
    const existingEndpoint = existingEndpoints.data.find((endpoint) => endpoint.url === webhookUrl)

    if (existingEndpoint) {
      console.log(`ℹ️ Webhook already exists for ${webhookUrl}`)
      console.log(`ℹ️ Webhook ID: ${existingEndpoint.id}`)
      console.log(`ℹ️ Updating webhook to ensure it has the correct event types...`)

      await stripe.webhookEndpoints.del(existingEndpoint.id)

      console.log(`✅ Webhook updated successfully!`)
    }

    // Create a new webhook endpoint
    const result = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: events,
      description: `Webhook for ${VERCEL_URL}`,
    })

    console.log(`✅ Webhook registered successfully!`)
    console.log(`ℹ️ Webhook ID: ${result.id}`)
    console.log(`ℹ️ Webhook Secret: ${result.secret}`)

    // Store the webhook ID and secret in the environment variables
    revalidatePath("/dev-checklist")

    return result
  } catch (error) {
    console.error("Error registering webhook:", error instanceof Error ? error.message : "Unknown error occurred")
  }
}

export async function resetDatabase(formData: FormData): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set.")
      return
    }

    console.log("Resetting database...")
    const connection = neon(process.env.DATABASE_URL)

    // Execute the commands in sequence
    await connection`DROP SCHEMA IF EXISTS public CASCADE;`
    await connection`CREATE SCHEMA public;`
    await connection`GRANT ALL ON SCHEMA public TO public;`

    revalidatePath("/dev-checklist")
  } catch (error) {
    console.error("Error resetting database:", error)
  }
}

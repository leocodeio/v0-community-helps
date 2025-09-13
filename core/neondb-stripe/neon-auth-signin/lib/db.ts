import { neon } from "@neondatabase/serverless"

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : (null as never)

export async function getUserFromNeonAuth(userId: string) {
  try {
    // Skip if database isn't configured
    if (!process.env.DATABASE_URL) {
      console.warn("Database not configured - skipping user fetch")
      return null
    }

    // Direct SQL query to neon_auth.users_sync table
    const users = await sql`
      SELECT * FROM neon_auth.users_sync 
      WHERE id = ${userId} AND deleted_at IS NULL
    `

    return users[0] || null
  } catch (error) {
    console.error("Error fetching user from NeonAuth:", error)
    return null
  }
}

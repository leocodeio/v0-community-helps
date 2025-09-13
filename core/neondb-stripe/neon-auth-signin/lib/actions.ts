"use server"
import { sql } from "@/lib/db"

export async function getUsers() {
  try {
    const result = await sql`
      SELECT * FROM neon_auth.users_sync 
      WHERE deleted_at IS NULL 
      ORDER BY name
    `
    return result
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return []
  }
}

export async function getUserById(userId: string) {
  console.log(userId)
  try {
    const result = await sql`
      SELECT * FROM neon_auth.users_sync 
      WHERE id = ${userId} AND deleted_at IS NULL
    `

    return result[0] || null
  } catch (error) {
    console.error("Failed to fetch user:", error)
    return null
  }
}

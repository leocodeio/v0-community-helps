import { stackServerApp } from "@/stack"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function ActivitySettingsPage() {
  const user = await stackServerApp.getUser({ or: "redirect" })

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" asChild size="sm">
          <Link href="/app/settings">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to settings</span>
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-semibold mb-4">Recent Activity</h1>

      <p className="text-muted-foreground">Activity tracking has been removed from this template.</p>
    </div>
  )
}

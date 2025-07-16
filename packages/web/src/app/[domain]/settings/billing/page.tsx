import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Billing | Settings",
    description: "Billing feature not available",
}

export default async function BillingPage() {
    // Billing feature removed
    notFound();
}

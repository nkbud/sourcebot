import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
    title: "Billing | Settings",
    description: "Billing functionality has been removed",
}

interface BillingPageProps {
    params: {
        domain: string
    }
}

export default async function BillingPage({
    params: { domain: _domain },
}: BillingPageProps) {
    // Billing functionality has been removed - return not found
    notFound();
}

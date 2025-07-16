import { redirect } from "next/navigation";

export default async function Upgrade({ params: { domain } }: { params: { domain: string } }) {
    // Billing feature removed - redirect to main page
    redirect(`/${domain}`);
}
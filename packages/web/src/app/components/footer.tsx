import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function Footer() {
    return (
        <footer className="w-full mt-auto py-4 flex flex-row justify-center items-center gap-4">
            <Link href="https://your-sourcebot-instance.com" className="text-gray-400 text-sm hover:underline">About</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link href="https://docs.your-sourcebot-instance.com" className="text-gray-400 text-sm hover:underline">Docs</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link href="https://your-sourcebot-instance.com" className="text-gray-400 text-sm hover:underline">Terms</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link href="https://your-sourcebot-instance.com" className="text-gray-400 text-sm hover:underline">Security</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link href="https://your-sourcebot-instance.com" target="_blank" className="text-gray-400 text-sm hover:underline">Contact Us</Link>
        </footer>
    )
}
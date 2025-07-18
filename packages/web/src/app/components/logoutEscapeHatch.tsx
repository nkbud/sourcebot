import { LogOutIcon } from "lucide-react";
import { redirect } from "next/navigation";

interface LogoutEscapeHatchProps {
    className?: string;
}

export const LogoutEscapeHatch = ({
    className,
}: LogoutEscapeHatchProps) => {
    return (
        <div className={className}>
            <form
                action={async () => {
                    "use server";
                    // OAuth2 Proxy handles logout - redirect to OAuth2 Proxy sign out endpoint
                    redirect("/oauth2/sign_out?rd=" + encodeURIComponent("/login"));
                }}
            >
                <button
                    type="submit"
                    className="flex flex-row items-center gap-2 text-sm text-muted-foreground cursor-pointer"
                >
                    <LogOutIcon className="w-4 h-4" />
                    Log out
                </button>
            </form>
        </div>
    );
}
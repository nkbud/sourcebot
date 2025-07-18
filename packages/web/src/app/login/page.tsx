import { auth } from "@/lib/auth-new";
import { redirect } from "next/navigation";
import { Footer } from "@/app/components/footer";
import { Card } from "@/components/ui/card";
import { SourcebotLogo } from "@/app/components/sourcebotLogo";
import { createLogger } from "@sourcebot/logger";

const logger = createLogger('login-page');

interface LoginProps {
    searchParams: {
        callbackUrl?: string;
        error?: string;
    }
}

export default async function Login({ searchParams }: LoginProps) {
    logger.info("Login page loaded with OAuth2 Proxy");
    
    const session = await auth();
    if (session) {
        logger.info("Session found in login page, redirecting to home");
        return redirect(searchParams.callbackUrl || "/");
    }

    return (
        <div className="flex flex-col min-h-screen bg-backgroundSecondary">
            <div className="flex-1 flex flex-col items-center p-4 sm:p-12 w-full">
                <div className="mb-6 flex flex-col items-center">
                    <SourcebotLogo className="h-12 sm:h-16 mb-3" />
                    <h2 className="text-lg font-medium text-center">
                        Sign in to your account
                    </h2>
                </div>
                
                <Card className="flex flex-col items-center border p-6 sm:p-12 rounded-lg gap-4 sm:gap-6 w-full sm:w-[500px] max-w-[500px] bg-background">
                    {searchParams.error && (
                        <div className="text-sm text-destructive text-center text-wrap border p-2 rounded-md border-destructive">
                            Authentication failed. Please try again.
                        </div>
                    )}
                    
                    <div className="text-center space-y-4">
                        <h3 className="text-base font-medium">Authentication Required</h3>
                        <p className="text-sm text-muted-foreground">
                            This application uses OAuth2 Proxy with Okta SSO for authentication.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            If you are seeing this page, OAuth2 Proxy is not properly configured or you need to sign in through your organization's Okta portal.
                        </p>
                        <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                            <strong>For administrators:</strong> Ensure OAuth2 Proxy is running and configured to intercept requests to this application.
                        </div>
                    </div>
                </Card>
            </div>
            <Footer />
        </div>
    )
}

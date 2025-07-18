import { Footer } from "@/app/components/footer";
import { Card } from "@/components/ui/card";
import { SourcebotLogo } from "@/app/components/sourcebotLogo";
import { auth } from "@/lib/auth-new";

export default async function Unauthorized() {
    const session = await auth();
    
    return (
        <div className="flex flex-col min-h-screen bg-backgroundSecondary">
            <div className="flex-1 flex flex-col items-center p-4 sm:p-12 w-full">
                <div className="mb-6 flex flex-col items-center">
                    <SourcebotLogo className="h-12 sm:h-16 mb-3" />
                    <h2 className="text-lg font-medium text-center">
                        Access Denied
                    </h2>
                </div>
                
                <Card className="flex flex-col items-center border p-6 sm:p-12 rounded-lg gap-4 sm:gap-6 w-full sm:w-[500px] max-w-[500px] bg-background">
                    <div className="text-center space-y-4">
                        <h3 className="text-base font-medium">Insufficient Permissions</h3>
                        <p className="text-sm text-muted-foreground">
                            You don't have the required permissions to access this resource.
                        </p>
                        {session && (
                            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                                <strong>Signed in as:</strong> {session.user.email}
                                {session.user.groups && (
                                    <div className="mt-1">
                                        <strong>Groups:</strong> {session.user.groups.join(', ')}
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                            Please contact your administrator to request access.
                        </p>
                    </div>
                </Card>
            </div>
            <Footer />
        </div>
    )
}
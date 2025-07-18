'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect } from "react";
import { dismissMobileUnsupportedSplashScreen } from "@/actions";

export const MobileUnsupportedSplashScreen = () => {

    useEffect(() => {
        // Telemetry event removed
    }, [captureEvent]);

    const onDismissed = useCallback(() => {
        dismissMobileUnsupportedSplashScreen();
        // Telemetry event removed
    }, [captureEvent]);

    return (
        <div className="flex flex-col items-center justify-center p-2 min-h-screen bg-backgroundSecondary">
            <Card className="flex flex-col items-center text-center mb-10 p-4 max-w-sm">
                <TriangleAlert className="w-10 h-10 mb-4 text-yellow-600/90 dark:text-yellow-300/90" />
                <div className="text-2xl font-semibold flex items-center mb-2">
                    Mobile is not supported.
                </div>
                <p className="text-sm text-muted-foreground mb-8">
                    Sourcebot on mobile is still a work in progress. Please use a desktop computer to get the best experience.
                </p>
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={onDismissed}
                    >
                        Continue anyway
                    </Button>
            </Card>
        </div>
    )
}
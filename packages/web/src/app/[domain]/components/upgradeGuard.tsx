'use client';

interface UpgradeGuardProps {
    children: React.ReactNode;
}

// Stub component - upgrade functionality removed (EE feature)
export const UpgradeGuard = ({ children }: UpgradeGuardProps) => {
    // No upgrade guard needed - just render children
    return <>{children}</>;
};
                />
            )
        } else {
            return children;
        }
    }, [domain, children, pathname]);

    return content;
}



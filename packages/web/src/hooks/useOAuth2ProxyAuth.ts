import { useEffect, useState } from 'react';
import { OAuth2ProxyUser } from '@/lib/oauth2-proxy-auth';

/**
 * Client-side hook for OAuth2 Proxy authentication
 * This provides authentication state for client components
 */
export function useOAuth2ProxyAuth() {
    const [user, setUser] = useState<OAuth2ProxyUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get user info from server endpoint
        fetch('/api/auth/user')
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                return null;
            })
            .then(userData => {
                setUser(userData);
                setLoading(false);
            })
            .catch(() => {
                setUser(null);
                setLoading(false);
            });
    }, []);

    return {
        user,
        loading,
        isAuthenticated: !!user
    };
}
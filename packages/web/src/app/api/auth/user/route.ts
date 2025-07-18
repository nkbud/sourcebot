import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/oauth2-proxy-auth';

export async function GET(request: NextRequest) {
    const user = getCurrentUser(request.headers);
    
    if (!user) {
        return NextResponse.json(null, { status: 401 });
    }
    
    return NextResponse.json(user);
}
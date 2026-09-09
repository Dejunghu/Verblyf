import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

// Nooit vooraf renderen: deze route werkt met sessies en cookies.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const { GET, POST } = toNextJsHandler(auth);

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Aplica a tudo exceto API, internos do Next e ficheiros com extensão.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

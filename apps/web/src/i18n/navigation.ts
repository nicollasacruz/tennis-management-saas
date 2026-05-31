import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Navegação ciente do locale (preserva o prefixo /en, /es; pt sem prefixo).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

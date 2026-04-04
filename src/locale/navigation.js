// @/locale/navigation.js

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Should only be used on public routes in the `[locale]` segment
export const { Link, usePathname } = createNavigation(routing);

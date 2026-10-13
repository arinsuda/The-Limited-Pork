import type { LucideIcon } from 'lucide-react';
import { UtensilsCrossed, FlaskConical, GitCompare, ClipboardCheck, Database, Users, Calculator } from 'lucide-react';

export interface NavItem {
  /** Route path. */
  to: string;
  /** i18n key for the full label (sidebar / drawer). */
  labelKey: string;
  /** Optional i18n key for a compact label (bottom tab bar / icon rail tooltip). Falls back to `labelKey`. */
  shortLabelKey?: string;
  icon: LucideIcon;
  /** Permission required to see the item; `null` = always visible. */
  permission: string | null;
  /** Exact-match active state (prevents `/trials` matching `/trials/compare`). */
  end?: boolean;
  /** Pinned to the mobile bottom tab bar. Remaining items go into the "More" sheet. */
  mobilePrimary?: boolean;
}

/**
 * Application navigation — the single source of truth consumed by the desktop sidebar,
 * the tablet icon rail, the mobile drawer and the mobile bottom tab bar.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/recipes',
    labelKey: 'nav.recipes',
    shortLabelKey: 'nav.recipes_short',
    icon: UtensilsCrossed,
    permission: 'recipes.read',
    mobilePrimary: true,
  },
  {
    to: '/trials',
    labelKey: 'nav.trials',
    shortLabelKey: 'nav.trials_short',
    icon: FlaskConical,
    permission: 'trials.read',
    end: true,
    mobilePrimary: true,
  },
  {
    to: '/trials/compare',
    labelKey: 'nav.trials_compare',
    shortLabelKey: 'nav.trials_compare_short',
    icon: GitCompare,
    permission: 'trials.read',
    mobilePrimary: true,
  },
  {
    to: '/checklist',
    labelKey: 'nav.checklist',
    shortLabelKey: 'nav.checklist_short',
    icon: ClipboardCheck,
    permission: null,
    mobilePrimary: true,
  },
  {
    to: '/costing',
    labelKey: 'nav.costing',
    shortLabelKey: 'nav.costing_short',
    icon: Calculator,
    permission: 'costing.read',
  },
  {
    to: '/masterdata',
    labelKey: 'nav.masterdata',
    shortLabelKey: 'nav.masterdata_short',
    icon: Database,
    permission: 'masterdata.read',
  },
  {
    to: '/users',
    labelKey: 'nav.users',
    shortLabelKey: 'nav.users_short',
    icon: Users,
    permission: 'users.read',
  },
];

/** Max tabs shown in the mobile bottom bar (excluding the "More" tab). */
export const MOBILE_BOTTOM_NAV_MAX = 4;

/** Default landing route after login / for unknown routes. */
export const DEFAULT_ROUTE = '/recipes';

/** Static asset paths for branding. */
export const BRAND = {
  logoSrc: '/logo_1.png',
} as const;

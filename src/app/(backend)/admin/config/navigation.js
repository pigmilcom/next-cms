// @/app/(backend)/admin/config/navigation.js

import {
    Blocks,
    Brain,
    CalendarDays,
    ClockFading,
    Code,
    Database,
    Frame,
    Gauge,
    Images,
    Megaphone,
    PieChart,
    Settings,
    Store,
    Trophy,
    Users,
    Wrench
} from 'lucide-react';
import { useTranslations } from 'next-intl';

const buildNavigation = (t) => ({
    Home: [
        {
            key: 'dashboard',
            title: t('home.dashboard'),
            url: '/admin',
            icon: Gauge
        },
        {
            key: 'analyticsReports',
            title: t('home.analyticsReports'),
            url: '/admin/analytics',
            icon: PieChart
        }
    ],
    Main: [
        {
            key: 'access',
            title: t('main.access'),
            url: '#',
            icon: Users,
            items: [
                {
                    key: 'users',
                    title: t('main.users'),
                    url: '/admin/access/users'
                },
                {
                    key: 'rolesPermissions',
                    title: t('main.rolesPermissions'),
                    url: '/admin/access/roles'
                }
            ]
        },
        {
            key: 'store',
            title: t('main.store'),
            url: '#',
            icon: Store,
            items: [
                {
                    key: 'orders',
                    title: t('main.orders'),
                    url: '/admin/store/orders'
                },
                {
                    key: 'catalog',
                    title: t('main.catalog'),
                    url: '/admin/store/catalog'
                },
                {
                    key: 'categories',
                    title: t('main.categories'),
                    url: '/admin/store/categories'
                },
                {
                    key: 'collections',
                    title: t('main.collections'),
                    url: '/admin/store/collections'
                },
                {
                    key: 'attributes',
                    title: t('main.attributes'),
                    url: '/admin/store/attributes'
                },
                {
                    key: 'customers',
                    title: t('main.customers'),
                    url: '/admin/store/customers'
                },
                {
                    key: 'coupons',
                    title: t('main.coupons'),
                    url: '/admin/store/coupons'
                },
                {
                    key: 'reviews',
                    title: t('main.reviews'),
                    url: '/admin/store/reviews'
                },
                {
                    key: 'testimonials',
                    title: t('main.testimonials'),
                    url: '/admin/store/testimonials'
                },
                {
                    key: 'storeSettings',
                    title: t('main.storeSettings'),
                    url: '/admin/store/settings'
                }
            ]
        },
        {
            key: 'media',
            title: t('main.media'),
            url: '/admin/media',
            icon: Images
        },
        {
            key: 'workspace',
            title: t('main.workspace'),
            url: '#',
            icon: CalendarDays,
            items: [
                {
                    key: 'agenda',
                    title: t('main.agenda'),
                    url: '/admin/workspace/agenda'
                },
                {
                    key: 'taskBoard',
                    title: t('main.taskBoard'),
                    url: '/admin/workspace/tasks'
                },
                {
                    key: 'schedule',
                    title: t('main.schedule'),
                    url: '/admin/workspace/schedule'
                }
            ]
        },
        {
            key: 'marketing',
            title: t('main.marketing'),
            url: '#',
            icon: Megaphone,
            items: [
                {
                    key: 'campaigns',
                    title: t('main.campaigns'),
                    url: '/admin/marketing/campaigns'
                },
                {
                    key: 'templates',
                    title: t('main.templates'),
                    url: '/admin/marketing/templates'
                },
                {
                    key: 'subscribers',
                    title: t('main.subscribers'),
                    url: '/admin/marketing/subscribers'
                }
            ]
        },
        {
            key: 'club',
            title: t('main.club'),
            url: '/admin/club',
            icon: Trophy
        },
        {
            key: 'supportTickets',
            title: t('main.supportTickets'),
            url: '/admin/tickets',
            icon: Megaphone
        }
    ],
    Developer: [
        {
            key: 'database',
            title: t('developer.database'),
            url: '/admin/developer/database',
            icon: Database
        },
        {
            key: 'blocks',
            title: t('developer.blocks'),
            url: '/admin/developer/blocks',
            icon: Blocks
        },
        {
            key: 'interface',
            title: t('developer.interface'),
            url: '/admin/developer/interface',
            icon: Frame
        },
        {
            key: 'aiAgent',
            title: t('developer.aiAgent'),
            url: '/admin/developer/ai',
            icon: Brain
        },
        {
            key: 'api',
            title: t('developer.api'),
            url: '#',
            icon: Code,
            items: [
                {
                    key: 'endpoints',
                    title: t('developer.endpoints'),
                    url: '/admin/developer/endpoints'
                },
                {
                    key: 'createApiKey',
                    title: t('developer.createApiKey'),
                    url: '/admin/developer/endpoints/new-key'
                }
            ]
        },
        {
            key: 'cronjobs',
            title: t('developer.cronjobs'),
            url: '/admin/developer/cronjobs',
            icon: ClockFading
        }
    ],
    System: [
        {
            key: 'settings',
            title: t('system.settings'),
            url: '/admin/system/settings',
            icon: Settings
        },
        {
            key: 'maintenance',
            title: t('system.maintenance'),
            url: '/admin/system/maintenance',
            icon: Wrench
        }
    ]
});

export const useAdminNavigation = () => {
    const t = useTranslations('Admin.Navigation');
    return buildNavigation(t);
};

export const findBreadcrumbPath = (pathname, nav = null) => {
    const navigation = nav || {
        Home: [],
        Main: [],
        Developer: [],
        System: []
    };
    const paths = [];

    // Special case: exact /admin route
    if (pathname === '/admin') {
        paths.push({
            title: 'Dashboard',
            url: '/admin'
        });
        paths.push({
            title: 'Overview',
            url: '/admin'
        });
        return paths;
    }

    // Search for matching routes across all sections
    for (const section in navigation) {
        const sectionItems = navigation[section];
        
        for (const item of sectionItems) {
            // Check main item (direct match)
            if (item.url === pathname) {
                // Determine section name for first breadcrumb
                let sectionTitle = section;
                if (section === 'Home') {
                    sectionTitle = 'Dashboard';
                } else if (section === 'Main') {
                    // For Main section items without subitems, use the item title itself
                    paths.push({
                        title: item.title,
                        url: item.url
                    });
                    return paths;
                }
                
                // Add section as first breadcrumb
                paths.push({
                    title: sectionTitle,
                    url: '/admin'
                });
                
                // Add item as second breadcrumb
                paths.push({
                    title: item.title,
                    url: item.url
                });
                return paths;
            }
            
            // Check subitems
            if (item.items) {
                for (const subItem of item.items) {
                    if (subItem.url === pathname) {
                        // Add parent item title as first breadcrumb
                        paths.push({
                            title: item.title,
                            url: item.url.includes('#') ? '/admin' : item.url
                        });
                        
                        // Add the matching subitem as second breadcrumb
                        paths.push({
                            title: subItem.title,
                            url: subItem.url
                        });
                        return paths;
                    }
                }
            }
        }
    }

    // Fallback: if no match found but it's an admin route
    if (paths.length === 0 && pathname.startsWith('/admin')) {
        paths.push({
            title: 'Dashboard',
            url: '/admin'
        });
    }

    return paths;
};

export const useAdminBreadcrumbPath = (pathname) => {
    const navigation = useAdminNavigation();
    return findBreadcrumbPath(pathname, navigation);
};

// @/app/(backend)/admin/tickets/page.jsx

import { getAllTickets, getTicketStats } from '@/lib/server/tickets.js';
import TicketsPageClient from './page.client.jsx';

const TicketsPage = async ({ searchParams }) => {
    // Await searchParams as it's now a Promise in newer Next.js versions
    const params = await searchParams;

    const { status = '', priority = '', type = '', page = '1', limit = '50', refresh } = params;
    
    // Determine cache duration - bypass cache if refresh is requested
    const cacheDuration = refresh ? '0' : '5M';

    // Fetch tickets with filters
    const ticketsResult = await getAllTickets({
        status: status || undefined,
        priority: priority || undefined,
        type: type || undefined,
        page: parseInt(page),
        limit: parseInt(limit),
        duration: cacheDuration // Dynamic cache duration
    });

    // Fetch ticket statistics
    const statsResult = await getTicketStats({
        duration: cacheDuration // Apply same cache strategy to stats
    });

    const tickets = ticketsResult?.success ? ticketsResult.data : [];
    const stats = statsResult?.success
        ? statsResult.data
        : {
              total: 0,
              open: 0,
              inProgress: 0,
              resolved: 0,
              closed: 0,
              byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
              byType: {},
              recentActivity: 0
          };

    return (
        <TicketsPageClient
            initialTickets={tickets}
            initialStats={stats}
            filters={{ status, priority, type, page: parseInt(page), limit: parseInt(limit) }}
        />
    );
};

export default TicketsPage;

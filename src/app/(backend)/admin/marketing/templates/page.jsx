// @/app/(backend)/admin/marketing/templates/page.jsx

import { getAllTemplates } from '@/lib/server/newsletter';
import { getMergedAvailableLanguages } from '@/lib/server/locale';
import TemplatesPageClient from './page.client';

export default async function TemplatesPage() {
    // Fetch templates and available languages server-side
    const [templatesResult, languagesResult] = await Promise.all([
        getAllTemplates(1, 100),
        getMergedAvailableLanguages()
    ]);

    const initialData = {
        templates: templatesResult.success ? templatesResult.data : [],
        availableLanguages: languagesResult.success ? languagesResult.data : ['en']
    };

    return <TemplatesPageClient initialData={initialData} />;
}

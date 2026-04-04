// @/app/(backend)/admin/marketing/templates/page.jsx

import { getAllTemplates } from '@/lib/server/newsletter';
import { getAllAvailableLanguages } from '@/lib/server/locale';
import TemplatesPageClient from './page.client';

export default async function TemplatesPage() {
    // Fetch templates and available languages server-side
    const [templatesResult, languagesResult] = await Promise.all([
        getAllTemplates(1, 100),
        getAllAvailableLanguages()
    ]);

    // Merge frontend and backend languages, remove duplicates
    const availableLanguages = (() => {
        if (languagesResult.success && languagesResult.data) {
            const frontendLangs = languagesResult.data.frontend || [];
            const backendLangs = languagesResult.data.backend || [];
            const merged = [...new Set([...frontendLangs, ...backendLangs])];
            return merged.length > 0 ? merged : ['en'];
        }
        return ['en'];
    })();

    const initialData = {
        templates: templatesResult.success ? templatesResult.data : [],
        availableLanguages
    };

    return <TemplatesPageClient initialData={initialData} />;
}

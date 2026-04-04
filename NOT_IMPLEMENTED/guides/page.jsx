// @/app/(frontend)/guides/page.jsx

import GuidesPageClient from './page.client';

export const metadata = {
    title: 'Recursos & Guias sobre CBD - CBD Barato',
    description: 'Guias gratuitos, calculadoras, ferramentas e recursos educativos sobre CBD. Aprenda tudo sobre canabidiol.'
};

const GuidesPage = async () => {
    return <GuidesPageClient />;
};

export default GuidesPage;
// @/app/(frontend)/research/page.jsx

import ResearchPageClient from './page.client';

export const metadata = {
    title: 'Investigação & Estudos sobre CBD - CBD Barato',
    description: 'Estudos científicos, investigação e dados sobre os benefícios do CBD. Base de conhecimento sobre canabidiol baseada em ciência.'
};

const ResearchPage = async () => {
    return <ResearchPageClient />;
};

export default ResearchPage;

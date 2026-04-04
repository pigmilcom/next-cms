// @/app/(frontend)/press/page.jsx

import PressPageClient from './page.client';

export const metadata = {
    title: 'Imprensa & Media - CBD Barato',
    description: 'Media kit, comunicados de imprensa e recursos para jornalistas sobre CBD Barato. Contactos de imprensa e materiais para download.'
};

const PressPage = async () => {
    return <PressPageClient />;
};

export default PressPage;

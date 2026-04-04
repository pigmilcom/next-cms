// @/app/(frontend)/faq/page.jsx

import FaqPageClient from './page.client';

export const metadata = {
    title: 'Perguntas Frequentes - CBD Barato | FAQ sobre CBD',
    description: 'Encontre respostas para as perguntas mais frequentes sobre CBD, produtos, envios, pagamentos e muito mais. Tire todas as suas dúvidas.'
};

const FaqPage = async () => {
    return <FaqPageClient />;
};

export default FaqPage;

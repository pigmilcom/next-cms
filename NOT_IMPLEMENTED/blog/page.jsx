// @/app/(frontend)/blog/page.jsx

import BlogPageClient from './page.client';
import { 
    getCatalog,
    getCategories 
} from '@/lib/server/store';

export const metadata = {
    title: 'Blog - CBD Barato | Notícias, Guias e Artigos sobre CBD',
    description: 'Fique a par das últimas notícias, guias educativos e artigos sobre CBD. Aprenda tudo sobre canabidiol, benefícios, uso e produtos.'
};

const BlogPage = async () => {
    // Fetch blog posts (using catalog as blog posts structure)
    // In production, you might have a separate collection for blog posts
    const blogPosts = await getCatalog({ 
        page: 1, 
        limit: 12,
        categoryId: 'blog', // Filter by blog category if exists
        activeOnly: true,
        options: {
            next: { revalidate: 300 } // Cache for 5 minutes
        }
    });

    // Fetch categories for blog filtering
    const categories = await getCategories({
        page: 1,
        limit: 20,
        options: {
            next: { revalidate: 600 } // Cache for 10 minutes
        }
    });

    return (
        <BlogPageClient 
            initialPosts={blogPosts?.items || []}
            totalPosts={blogPosts?.total || 0}
            categories={categories?.items || []}
        />
    );
};

export default BlogPage;

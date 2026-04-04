/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    generateRobotsTxt: true,
    generateIndexSitemap: false,
    // Exclude admin, API, and auth routes from sitemap
    exclude: [
        '/admin/*',
        '/api/*',
        '/server-sitemap.xml'
    ],
    // Include all frontend pages explicitly
    additionalPaths: async (config) => {
        const result = [];
        
        // Main pages
        result.push(
            { loc: '/', changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString() },
            { loc: '/account', changefreq: 'weekly', priority: 0.9, lastmod: new Date().toISOString() }, 
        ); 
        
        return result;
    },
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/']
            }
        ]
    }
};
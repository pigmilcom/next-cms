// @/components/common/ScrollToTop.jsx

'use client';

import { useEffect } from 'react';

export default function ScrollToTop() {
    useEffect(() => {
        // Force immediate scroll to top
        const scrollToTop = () => {
            document.documentElement.scrollIntoView({ behavior: 'smooth' });
        };
        // Execute immediately
        scrollToTop();
        return;
    }, []);

    return null;
}

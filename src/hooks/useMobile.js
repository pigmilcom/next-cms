import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState(undefined);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        // Function to check if current window size is mobile
        const checkIsMobile = () => {
            return window.innerWidth < MOBILE_BREAKPOINT;
        };

        // Set initial state
        setIsMobile(checkIsMobile());

        // Create media query listener
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => {
            setIsMobile(checkIsMobile());
        };

        // Add listener for media query changes
        mql.addEventListener('change', onChange);

        // Cleanup listener on unmount
        return () => mql.removeEventListener('change', onChange);
    }, []);

    return !!isMobile;
}

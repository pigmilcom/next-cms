'use client';

import { useEffect, useRef, useState } from 'react';

// useAsyncData: simple hook to fetch data with loading and error state
export default function useAsyncData(fetcher, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await fetcher();
                if (!mounted.current) return;
                setData(res);
            } catch (err) {
                if (!mounted.current) return;
                setError(err);
            } finally {
                if (!mounted.current) return;
                setLoading(false);
            }
        })();

        return () => {
            mounted.current = false;
        };
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    return { data, loading, error, setData, setLoading };
}

// context/SafeCartProvider.jsx
'use client';

import { useEffect, useState } from 'react';
import { CartProvider } from 'react-use-cart';

export default function SafeCartProvider({ children }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null; // avoid SSR mismatch
    return <CartProvider>{children}</CartProvider>;
}

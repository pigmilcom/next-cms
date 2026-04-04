// @/app/(frontend)/layout.jsx (Frontend Route Group Layout)
import { LayoutProvider } from '@/app/(frontend)/context/LayoutProvider'; 

export default async function FrontendLayout({ children }) { 

    return <LayoutProvider>{children}</LayoutProvider>;
}

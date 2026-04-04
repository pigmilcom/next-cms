// @/app/auth/login/page.jsx

import { auth } from '@/auth';
import LoginPageClient from './page.client';

const LoginPage = async () => {
    // Get user session
    const session = await auth();
    const user = session?.user || null;

    return <LoginPageClient user={user} />;
};

export default LoginPage;

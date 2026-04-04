// @/app/auth/register/page.jsx

import { auth } from '@/auth';
import RegisterPageClient from './page.client';

const RegisterPage = async () => {
    // Get user session
    const session = await auth();
    const user = session?.user || null;

    return <RegisterPageClient user={user} />;
};

export default RegisterPage;

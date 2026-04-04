// @/app/auth/forgot/page.jsx

import { auth } from '@/auth';
import ForgotPasswordPageClient from './page.client';

const ForgotPasswordPage = async () => {
    // Get user session
    const session = await auth();
    const user = session?.user || null;

    return <ForgotPasswordPageClient user={user} />;
};

export default ForgotPasswordPage;

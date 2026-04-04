// @/app/auth/reset/page.jsx

import { auth } from '@/auth';
import ResetPasswordPageClient from './page.client';

const ResetPasswordPage = async () => {
    // Get user session
    const session = await auth();
    const user = session?.user || null;

    return <ResetPasswordPageClient user={user} />;
};

export default ResetPasswordPage;

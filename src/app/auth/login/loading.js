// @/app/auth/login/loading.js
import { Skeleton } from '@/components/ui/skeleton';

// Login form skeleton
const LoginFormSkeleton = () => (
    <div className="flex flex-col gap-6">
        <div className="border rounded-lg shadow-sm">
            <div className="p-6">
                <div className="flex flex-col gap-6">
                    {/* Email field */}
                    <div className="grid gap-3">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-10 w-full" />
                    </div>

                    {/* Password field */}
                    <div className="grid gap-3">
                        <div className="flex items-center">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-32 ml-auto" />
                        </div>
                        <Skeleton className="h-10 w-full" />
                    </div>

                    {/* Turnstile placeholder (optional) */}
                    <div className="flex justify-center">
                        <Skeleton className="h-16 w-72" />
                    </div>

                    {/* Submit button */}
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>

                {/* Sign up link */}
                <div className="mt-4 text-center">
                    <Skeleton className="h-4 w-64 mx-auto" />
                </div>
            </div>
        </div>
    </div>
);

// Main loading component
export default function LoginLoading() {
    return (
        <div className="auth-section">
            {/* Page title */}
            <Skeleton className="h-12 w-64 mb-3" />

            {/* Description */}
            <Skeleton className="h-6 w-80 mb-6" />

            {/* Login form */}
            <LoginFormSkeleton />

            {/* Back to home link */}
            <div className="mt-6 text-center">
                <Skeleton className="h-4 w-32 mx-auto" />
            </div>
        </div>
    );
}

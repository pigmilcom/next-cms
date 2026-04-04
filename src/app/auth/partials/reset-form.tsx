// @/app/auth/partials/reset-form.tsx

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { IoMdEye, IoMdEyeOff } from 'react-icons/io';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ResetFormProps extends React.ComponentProps<'div'> {
    initialEmail?: string;
    initialCode?: string;
    initialToken?: string;
    siteSettings?: any;
    storeSettings?: any;
}

export function ResetForm({
    className,
    initialEmail = '',
    initialCode = '',
    initialToken = '',
    siteSettings,
    storeSettings,
    ...props
}: ResetFormProps) {
    const t = useTranslations('Auth');
    const router = useRouter();
    const [email, _setEmail] = useState(initialEmail);
    const [code, _setCode] = useState(initialCode);
    const [token, _setToken] = useState(initialToken);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!email || !code || !token) {
            toast.error(t('invalidResetLink'));
            router.push('/auth/forgot');
        }
    }, [email, code, token, router, t]);

    const showPassword = () => setShowPwd((prev) => !prev);

    const passwordValid = (pwd: string) => {
        return (
            pwd.length >= 8 &&
            pwd.length <= 32 &&
            /[a-z]/.test(pwd) &&
            /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
        );
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Client-side validation
        if (newPassword !== confirmPassword) {
            toast.error(t('passwordsDontMatch'));
            setLoading(false);
            return;
        }

        if (!passwordValid(newPassword)) {
            toast.error(t('passwordRequirements'));
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/auth/handler/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    newPassword,
                    confirmPassword,
                    code,
                    token // Pass the encrypted code as token
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(t(data.error));

                // If token is expired/invalid, redirect to forgot password
                if (data.error.includes('expired') || data.error.includes('Invalid')) {
                    setTimeout(() => {
                        router.push('/auth/forgot');
                    }, 2000);
                }
                setLoading(false);
                return;
            }

            toast.success(t(data.message));
            // Navigate to login page with email pre-filled
            router.push(`/auth/login?email=${encodeURIComponent(email)}`);
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error(t('errorUpdatingPassword'));
        }

        setLoading(false);
    };

    if (!email || !token) {
        return null;
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardContent>
                    <form onSubmit={handlePasswordReset} className="flex flex-col gap-6">
                        <div className="grid gap-3">
                            <Label htmlFor="newPassword">{t('newPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPwd ? 'text' : 'password'}
                                    disabled={loading}
                                    placeholder={t('enterYourPassword')}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    tabIndex={-1}
                                    type="button"
                                    onClick={showPassword}
                                    className="-translate-y-1/2 absolute top-1/2 right-2 text-gray-500 hover:text-gray-700">
                                    {showPwd ? <IoMdEyeOff size={22} /> : <IoMdEye size={22} />}
                                </button>
                            </div>

                            {/* Password Requirements */}
                            <ul className="ml-6 list-disc space-y-1 text-gray-500 text-sm">
                                <li
                                    className={
                                        newPassword.length >= 8 && newPassword.length <= 32
                                            ? 'text-green-600'
                                            : 'text-red-500'
                                    }>
                                    8–32 characters
                                </li>
                                <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-red-500'}>
                                    Includes lowercase letter
                                </li>
                                <li
                                    className={
                                        /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)
                                            ? 'text-green-600'
                                            : 'text-red-500'
                                    }>
                                    Includes uppercase, number, or symbol
                                </li>
                            </ul>
                        </div>

                        <div className="grid gap-3">
                            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPwd ? 'text' : 'password'}
                                    disabled={loading}
                                    placeholder={t('confirmPassword')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    tabIndex={-1}
                                    type="button"
                                    onClick={showPassword}
                                    className="-translate-y-1/2 absolute top-1/2 right-2 text-gray-500 hover:text-gray-700">
                                    {showPwd ? <IoMdEyeOff size={22} /> : <IoMdEye size={22} />}
                                </button>
                            </div>

                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-red-500 text-sm">{t('passwordsDontMatch')}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !passwordValid(newPassword) || newPassword !== confirmPassword}
                            className="w-full">
                            {loading ? t('resetting') : t('updatePassword')}
                        </Button>

                        <div className="text-center text-sm">
                            {t('rememberPassword')}{' '}
                            <Link href="/auth/login" className="text-brand hover:underline">
                                {t('signIn')}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

// @/app/auth/partials/register-form.tsx

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/context/providers';
import { useEffect, useState } from 'react';
import { IoMdEye, IoMdEyeOff } from 'react-icons/io';
import Turnstile from 'react-turnstile';
import { toast } from 'sonner';
import { authCallback } from '@/app/auth/callback';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Fingerprint from '@/utils/fingerprint';

export function RegisterForm({
    className,
    siteSettings,
    storeSettings,
    ...props
}: React.ComponentProps<'div'> & {
    siteSettings?: any;
    storeSettings?: any;
}) {
    const t = useTranslations('Auth');
    const router = useRouter();
    const { theme, resolvedTheme } = useTheme();
    const searchParams = useSearchParams();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTurnstileVerified, setIsTurnstileVerified] = useState(false);
    const [turnstileKey, setTurnstileKey] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);

    const showPassword = () => setShowPwd((prev) => !prev);

    // Handle mounting state for theme (prevents hydration mismatch)
    useEffect(() => setMounted(true), []);

    // Capture referral code from URL params
    useEffect(() => {
        const refParam = searchParams?.get('ref');
        if (refParam) {
            setReferralCode(refParam);
        }
    }, [searchParams]);

    useEffect(() => {
        // Get Turnstile key from siteSettings passed as props
        if (siteSettings) {
            const isEnabled = siteSettings?.turnstileEnabled === true;
            const siteKey = siteSettings?.turnstileSiteKey || null;

            // Only set the key if Turnstile is enabled
            if (isEnabled && siteKey) {
                setTurnstileKey(siteKey);
            } else {
                setTurnstileKey(null);
            }
        }
    }, [siteSettings]);

    const _passwordValid = (pwd: string) => {
        return (
            pwd.length >= 8 &&
            pwd.length <= 32 &&
            /[a-z]/.test(pwd) &&
            /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
        );
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (turnstileKey && !isTurnstileVerified) {
            toast.error(t('completeVerification'));
            return;
        }
        if (!confirmPassword || password !== confirmPassword) {
            toast.error(t('passwordsDontMatch'));
            return;
        }
        setLoading(true);

        try {
            const browserUnique = await Fingerprint();
            const passwordHash = btoa(password);

            // Use centralized auth callback
            const result = await authCallback({
                name,
                email,
                password: passwordHash,
                client: browserUnique,
                action: 'register',
                referralCode
            });

            if (result?.error || !result?.success) {
                const errorMessage = result?.error ? t(result.error) : t('registrationFailed');
                toast.error(errorMessage);
                setLoading(false);
                return;
            }

            // Registration successful - redirect to login (prefill the email)
            if (result.success && result.action === 'register') {
                toast.success(t('registrationSuccessful') + ' ' + t('pleaseLogin'));
                const redirectUrl = `/auth/login?email=${encodeURIComponent(email)}`;
                try {
                    router.push(redirectUrl);
                } catch (err) {
                    // In case router.push doesn't work as expected
                    window.location.href = redirectUrl;
                }
                return;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('registrationFailed');
            toast.error(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardContent>
                    <form onSubmit={handleRegister}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-3">
                                <Label htmlFor="name">{t('name')}</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    name="name"
                                    disabled={loading}
                                    placeholder={t('enterYourName')}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="email">{t('email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    disabled={loading}
                                    placeholder={t('enterYourEmail')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPwd ? 'text' : 'password'}
                                        disabled={loading}
                                        placeholder="Enter your Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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
                                            password.length >= 8 && password.length <= 32
                                                ? 'text-green-600'
                                                : 'text-green-900'
                                        }>
                                        8–32 characters
                                    </li>
                                    <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-green-900'}>
                                        Includes lowercase letter
                                    </li>
                                    <li
                                        className={
                                            /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
                                                ? 'text-green-600'
                                                : 'text-green-900'
                                        }>
                                        Includes uppercase, number, or symbol
                                    </li>
                                </ul>
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showPwd ? 'text' : 'password'}
                                        disabled={loading}
                                        placeholder="Confirm your Password"
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
                            </div>

                            {turnstileKey && mounted && (
                                <div className="flex justify-center">
                                    <Turnstile
                                        sitekey={turnstileKey}
                                        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                                        size="flexible"
                                        onVerify={() => setIsTurnstileVerified(true)}
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    disabled={loading || (!!turnstileKey && !isTurnstileVerified)}
                                    className="w-full">
                                    {loading ? t('registering') : t('createAccount')}
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            {t('alreadyHaveAccount')}{' '}
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

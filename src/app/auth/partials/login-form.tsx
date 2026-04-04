// @/app/auth/partials/login-form.tsx

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
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

export function LoginForm({
    className,
    initialEmail = '',
    callbackUrl,
    siteSettings,
    storeSettings,
    ...props
}: React.ComponentProps<'div'> & {
    initialEmail?: string;
    callbackUrl?: string | null;
    siteSettings?: any;
    storeSettings?: any;
}) {
    const t = useTranslations('Auth');
    const router = useRouter();
    const { theme, resolvedTheme } = useTheme();
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTurnstileVerified, setIsTurnstileVerified] = useState(false);
    const [turnstileKey, setTurnstileKey] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const showPassword = () => setShowPwd((prev) => !prev);

    // Handle mounting state for theme (prevents hydration mismatch)
    useEffect(() => setMounted(true), []);

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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (turnstileKey && !isTurnstileVerified) {
            toast.error(t('completeVerification'));
            return;
        }
        setLoading(true);

        const browserUnique = await Fingerprint();

        try {
            const passwordHash = btoa(password);

            // Use centralized auth callback
            const result = await authCallback({
                email,
                password: passwordHash,
                client: browserUnique,
                action: 'login'
            });

            if (result?.error || !result?.success) {
                const errorMessage = result?.error ? t(result.error) : t('loginFailed');
                toast.error(errorMessage);
                setLoading(false);
                return;
            }

            if (result.success && result.data && result.action === 'login') {
                const sign = await signIn('credentials', {
                    data: result.data,
                    client: browserUnique,
                    redirect: false
                });

                if (sign?.error) {
                    const errorMessage = sign.error || 'Login failed, please try again.';
                    toast.error(errorMessage);
                    setLoading(false);
                    return;
                }

                if (sign?.ok && !sign?.error) {
                    toast.success(t('loginSuccessful'));

                    // Small delay to ensure session is established
                    await new Promise((resolve) => setTimeout(resolve, 300));

                    // Redirect to callback URL or home page
                    const redirectUrl = callbackUrl || '/account';
                    router.push(redirectUrl);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('loginFailed');
            toast.error(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardContent>
                    <form onSubmit={handleLogin}>
                        <div className="flex flex-col gap-6">
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
                                <div className="flex items-center">
                                    <Label htmlFor="password">{t('password')}</Label>
                                    <Link
                                        tabIndex={-1}
                                        href="/auth/forgot"
                                        className="ml-auto inline-block text-brand text-sm hover:underline">
                                        {t('forgotPassword')}?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPwd ? 'text' : 'password'}
                                        disabled={loading}
                                        placeholder={t('enterYourPassword')}
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
                            </div>

                            {turnstileKey && mounted && (
                                <div className="w-full h-auto flex">
                                    <Turnstile
                                        className="w-full h-auto"
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
                                    {loading ? t('signingIn') : t('signIn')}
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            {t('dontHaveAccount')}{' '}
                            <Link href="/auth/register" className="text-brand hover:underline">
                                {t('signUp')}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

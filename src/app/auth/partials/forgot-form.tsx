// @/app/auth/partials/forgot-form.tsx

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/context/providers';
import { useEffect, useState } from 'react';
import Turnstile from 'react-turnstile';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function ForgotForm({
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
    const [email, setEmail] = useState('');
    const [step, setStep] = useState('email'); // 'email' | 'code'
    const [code, setCode] = useState('');
    const [encryptedCode, setEncryptedCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTurnstileVerified, setIsTurnstileVerified] = useState(false);
    const [turnstileKey, setTurnstileKey] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

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

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (turnstileKey && !isTurnstileVerified) {
            toast.error(t('completeVerification'));
            return;
        }
        setLoading(true);

        try {
            const response = await fetch('/auth/handler/forgot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.toLowerCase() })
            });

            const data = await response.json();

            if (!data.success) {
                toast.error(t(data.error));
                setLoading(false);
                return;
            }

            if (data.encryptedCode) {
                setEncryptedCode(data.encryptedCode);
                toast.success(t(data.message));
                setStep('code');
            } else {
                // Email doesn't exist in system, but don't reveal this for security
                toast.success(t(data.message));
            }
        } catch (error) {
            console.error('Send code error:', error);
            toast.error(t('errorSendingCode'));
        }

        setLoading(false);
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/auth/handler/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    encryptedCode: encryptedCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(t(data.error));
                setLoading(false);
                return;
            }

            // Navigate to reset password page with email and token
            router.push(
                `/auth/reset?email=${encodeURIComponent(email)}&code=${code}&token=${encodeURIComponent(encryptedCode)}`
            );
        } catch (error) {
            console.error('Verify code error:', error);
            toast.error(t('errorVerifyingCode'));
            setLoading(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardContent>
                    <AnimatePresence mode="wait">
                        {step === 'email' ? (
                            <motion.form
                                key="email"
                                onSubmit={handleSendCode}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col gap-6">
                                <div className="grid gap-3">
                                    <Label htmlFor="email">{t('email')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('enterYourEmail')}
                                        disabled={loading}
                                        required
                                    />
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

                                <Button
                                    type="submit"
                                    disabled={loading || (!!turnstileKey && !isTurnstileVerified)}
                                    className="w-full">
                                    {loading ? t('sendingCode') : t('sendResetCode')}
                                </Button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="code"
                                onSubmit={handleVerifyCode}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col gap-6">
                                <div className="grid gap-3">
                                    <Label htmlFor="code">{t('code')}</Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="••••••"
                                        className="text-center font-mono text-xl tracking-widest"
                                        disabled={loading}
                                        maxLength={6}
                                        required
                                    />
                                    <p className="text-gray-500 text-xs">
                                        {t('enterCodeReceived')}: {email}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
                                        {loading ? t('verifying') : t('verifyCode')}
                                    </Button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className="mt-4 text-center text-sm">
                        {t('rememberPassword')}{' '}
                        <Link
                            href="/auth/login"
                            className="text-brand hover:underline"
                            onClick={() => {
                                setCode('');
                                setEncryptedCode('');
                            }}>
                            {t('signIn')}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// @/app/(actions)/unsubscribe/page.client.jsx (Client Component)
'use client';

import { CheckCircle2, Loader2, Mail, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const UnsubscribePageClient = ({ subscriber, identifier, type, updatePreferencesAction }) => {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Initialize preferences from subscriber data
    const [preferences, setPreferences] = useState({
        emailNotifications: subscriber?.preferences?.emailNotifications ?? true,
        orderUpdates: subscriber?.preferences?.orderUpdates ?? true,
        marketingEmails: subscriber?.preferences?.marketingEmails ?? true,
        newsletter: subscriber?.preferences?.newsletter ?? true,
        smsNotifications: subscriber?.preferences?.smsNotifications ?? false
    });

    const [reason, setReason] = useState('');

    // Handle individual preference toggle
    const handlePreferenceChange = (key) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Handle select all / deselect all
    const handleSelectAll = (checked) => {
        setPreferences({
            emailNotifications: checked,
            orderUpdates: checked,
            marketingEmails: checked,
            newsletter: checked,
            smsNotifications: checked
        });
    };

    // Check if all preferences are selected
    const allSelected = Object.values(preferences).every((val) => val === true);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await updatePreferencesAction(identifier, preferences, reason);

            if (result?.success) {
                setIsSuccess(true);
            } else {
                alert(result?.error || 'Erro ao atualizar preferências');
            }
        } catch (error) {
            console.error('Error updating preferences:', error);
            alert('Ocorreu um erro ao atualizar as suas preferências');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle cancel button
    const handleCancel = () => {
        router.push('/');
    };

    // Success view
    if (isSuccess) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-8 w-8 text-lime-600" />
                        </div>
                        <CardTitle className="text-2xl text-brand">Preferências Atualizadas</CardTitle>
                        <CardDescription>
                            As suas preferências de comunicação foram atualizadas com sucesso.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="mb-6 text-sm text-muted-foreground">
                            Pode voltar a qualquer momento para fazer alterações.
                        </p>
                        <Button onClick={() => router.push('/')} className="bg-brand">
                            Voltar à Página Inicial
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Unsubscribe form view
    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        {type === 'phone' ? (
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        ) : (
                            <Mail className="h-5 w-5 text-muted-foreground" />
                        )}
                        <CardTitle className="text-2xl">Gerir Preferências de Comunicação</CardTitle>
                    </div>
                    <CardDescription>
                        {type === 'phone' ? (
                            <>
                                Número: <strong>{identifier}</strong>
                            </>
                        ) : (
                            <>
                                Email: <strong>{identifier}</strong>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Select All / Deselect All */}
                        <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                            <Checkbox id="select-all" checked={allSelected} onCheckedChange={handleSelectAll} />
                            <Label htmlFor="select-all" className="text-base font-semibold cursor-pointer">
                                {allSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
                            </Label>
                        </div>

                        <Separator />

                        {/* Individual Preferences */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Preferências de Email
                            </h3>

                            {/* Email Notifications */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="emailNotifications"
                                    checked={preferences.emailNotifications}
                                    onCheckedChange={() => handlePreferenceChange('emailNotifications')}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="emailNotifications" className="text-sm font-medium cursor-pointer">
                                        Notificações
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receber notificações importantes sobre a sua conta
                                    </p>
                                </div>
                            </div>

                            {/* Order Updates */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="orderUpdates"
                                    checked={preferences.orderUpdates}
                                    onCheckedChange={() => handlePreferenceChange('orderUpdates')}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="orderUpdates" className="text-sm font-medium cursor-pointer">
                                        Encomendas
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receber atualizações sobre o estado das suas encomendas
                                    </p>
                                </div>
                            </div>

                            {/* Marketing Emails */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="marketingEmails"
                                    checked={preferences.marketingEmails}
                                    onCheckedChange={() => handlePreferenceChange('marketingEmails')}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="marketingEmails" className="text-sm font-medium cursor-pointer">
                                        Marketing
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receber emails sobre promoções e ofertas especiais
                                    </p>
                                </div>
                            </div>

                            {/* Newsletter */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="newsletter"
                                    checked={preferences.newsletter}
                                    onCheckedChange={() => handlePreferenceChange('newsletter')}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="newsletter" className="text-sm font-medium cursor-pointer">
                                        Newsletter
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receber a nossa newsletter com novidades e dicas
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* SMS Notifications */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Preferências de SMS
                            </h3>

                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="smsNotifications"
                                    checked={preferences.smsNotifications}
                                    onCheckedChange={() => handlePreferenceChange('smsNotifications')}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="smsNotifications" className="text-sm font-medium cursor-pointer">
                                        Notificações por SMS
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receber notificações importantes por mensagem de texto
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Optional Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-sm font-medium">
                                Motivo (Opcional)
                            </Label>
                            <Textarea
                                id="reason"
                                placeholder="Diga-nos porque está a alterar as suas preferências..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                O seu feedback ajuda-nos a melhorar os nossos serviços
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button type="submit" disabled={isSubmitting} className="flex-1">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />A Atualizar...
                                    </>
                                ) : (
                                    'Atualizar Preferências'
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="flex-1">
                                Cancelar
                            </Button>
                        </div>

                        {/* Info Message */}
                        <div className="border rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>Nota:</strong> Se desmarcar todas as opções, será completamente removido da
                                nossa lista de comunicações. Pode voltar a subscrever a qualquer momento.
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default UnsubscribePageClient;

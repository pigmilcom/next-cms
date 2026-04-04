// @/components/common/TicketDialog.jsx
'use client';

import { useTheme } from '@/context/providers';
import { useEffect, useState } from 'react';
import Turnstile from 'react-turnstile';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createTicket } from '@/lib/server/tickets';

/**
 * TicketDialog Component
 * Reusable ticket creation dialog for support requests
 *
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onOpenChange - Callback when dialog open state changes
 * @param {object} user - User object with id, email, name
 * @param {object} siteSettings - Site settings object for Turnstile configuration
 * @param {object} relatedOrder - Optional order object to associate with ticket
 * @param {string} defaultSubject - Default subject for the ticket
 * @param {string} defaultType - Default type for the ticket
 * @param {function} onSuccess - Optional callback when ticket is created successfully
 */
const TicketDialog = ({
    open = false,
    onOpenChange,
    user,
    siteSettings,
    relatedOrder = null,
    defaultSubject = '',
    defaultType = 'support',
    onSuccess = null
}) => {
    const { theme, resolvedTheme } = useTheme();
    const [ticketForm, setTicketForm] = useState({
        contactName: user?.name || user?.displayName || '',
        contactEmail: user?.email || '',
        subject: defaultSubject,
        description: '',
        type: defaultType
    });
    const [submittingTicket, setSubmittingTicket] = useState(false);
    const [isTurnstileVerified, setIsTurnstileVerified] = useState(false);
    const [turnstileKey, setTurnstileKey] = useState(null);
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

    // Update form when defaults change or user data changes
    useEffect(() => {
        setTicketForm({
            contactName: user?.name || user?.displayName || '',
            contactEmail: user?.email || '',
            subject: defaultSubject,
            description: '',
            type: defaultType
        });
    }, [defaultSubject, defaultType, user]);

    // Handle ticket form submission
    const handleSubmitTicket = async (e) => {
        e.preventDefault();

        // Turnstile validation (same as login-form.tsx)
        if (turnstileKey && !isTurnstileVerified) {
            toast.error('Por favor, complete a verificação de segurança');
            return;
        }

        // Validation
        if (
            !ticketForm.contactName.trim() ||
            !ticketForm.contactEmail.trim() ||
            !ticketForm.subject.trim() ||
            !ticketForm.description.trim() ||
            !ticketForm.type
        ) {
            toast.error('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ticketForm.contactEmail.trim())) {
            toast.error('Por favor, insira um email válido');
            return;
        }

        try {
            setSubmittingTicket(true);

            const ticketData = {
                userId: user?.id,
                userEmail: ticketForm.contactEmail.trim(),
                userName: ticketForm.contactName.trim(),
                subject: ticketForm.subject.trim(),
                description: ticketForm.description.trim(),
                type: ticketForm.type,
                orderData: relatedOrder
                    ? {
                          id: relatedOrder.id,
                          orderNumber: relatedOrder.orderNumber || relatedOrder.id,
                          status: relatedOrder.status,
                          paymentStatus: relatedOrder.paymentStatus,
                          total: relatedOrder.total,
                          createdAt: relatedOrder.createdAt
                      }
                    : null
            };

            const result = await createTicket(ticketData);

            if (result.success) {
                toast.success('Ticket criado com sucesso! Nossa equipe entrará em contato em breve.');

                // Reset form
                setTicketForm({
                    contactName: user?.name || user?.displayName || '',
                    contactEmail: user?.email || '',
                    subject: defaultSubject,
                    description: '',
                    type: defaultType
                });

                // Close dialog
                onOpenChange(false);

                // Call success callback if provided
                if (onSuccess) {
                    onSuccess(result);
                }
            } else {
                toast.error(result.error || 'Falha ao criar ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            toast.error('Erro ao criar ticket');
        } finally {
            setSubmittingTicket(false);
        }
    };

    const handleCancel = () => {
        // Reset form
        setTicketForm({
            contactName: user?.name || user?.displayName || '',
            contactEmail: user?.email || '',
            subject: defaultSubject,
            description: '',
            type: defaultType
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reportar um Problema</DialogTitle>
                    <DialogDescription>
                        Conta-nos o que se passa {relatedOrder ? 'com a tua encomenda' : ''}. Vamos dar uma olhadela e
                        responder rapidinho.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                    {relatedOrder && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Encomenda Relacionada:</p>
                            <p className="text-sm text-muted-foreground">
                                #{relatedOrder.orderNumber || relatedOrder.id} -{' '}
                                {Number(relatedOrder.total || 0).toFixed(2)}€
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="contact-name">Nome de Contacto *</Label>
                            <Input
                                id="contact-name"
                                value={ticketForm.contactName}
                                onChange={(e) => setTicketForm({ ...ticketForm, contactName: e.target.value })}
                                placeholder="O seu nome"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="contact-email">Email de Contacto *</Label>
                            <Input
                                id="contact-email"
                                type="email"
                                value={ticketForm.contactEmail}
                                onChange={(e) => setTicketForm({ ...ticketForm, contactEmail: e.target.value })}
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="ticket-subject">Assunto *</Label>
                        <Input
                            id="ticket-subject"
                            value={ticketForm.subject}
                            onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                            placeholder="Resume o problema"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="ticket-type">Tipo de Problema *</Label>
                        <Select
                            value={ticketForm.type}
                            onValueChange={(value) => setTicketForm({ ...ticketForm, type: value })}
                            required>
                            <SelectTrigger>
                                <SelectValue placeholder="Escolhe o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="payments">Pagamentos</SelectItem>
                                <SelectItem value="orders">Encomendas</SelectItem>
                                <SelectItem value="support">Suporte & Assistência</SelectItem>
                                <SelectItem value="bug">Bug Técnico</SelectItem>
                                <SelectItem value="other">Outros problemas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="ticket-description">Descrição *</Label>
                        <Textarea
                            id="ticket-description"
                            value={ticketForm.description}
                            onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                            placeholder="Conta-nos tudo sobre o problema que tás..."
                            rows={4}
                            required
                        />
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

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={submittingTicket}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submittingTicket || (!!turnstileKey && !isTurnstileVerified)}>
                            {submittingTicket ? 'A criar ticket...' : 'Criar o Ticket'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TicketDialog;

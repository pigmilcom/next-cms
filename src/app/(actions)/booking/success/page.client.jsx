// @/app/(frontend)/booking/success/page.client.jsx

'use client';

import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle, Download, Home, Share2, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const formatDateTime = (dateTime) => {
    if (!dateTime) return 'Non defini';

    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) return 'Non defini';

    return date.toLocaleString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency || 'EUR'
    }).format(Number(amount || 0));
};

const normalizePaymentStatus = (bookingDetails, paymentMethod) => {
    if (!bookingDetails) return 'pending';

    // Stripe redirects to this page only after successful confirmation.
    if (paymentMethod === 'stripe') return 'paid';

    return bookingDetails.paymentStatus || 'pending';
};

const normalizeBookingStatus = (bookingDetails, paymentStatus) => {
    if (!bookingDetails) return 'pending';

    if (paymentStatus === 'paid') return 'confirmed';

    return bookingDetails.status || 'pending';
};

const BookingSuccessPageClient = ({ initialBookingDetails, initialError, bookingId, paymentMethod }) => {
    const router = useRouter();

    const [bookingDetails, setBookingDetails] = useState(initialBookingDetails);
    const [error, setError] = useState(initialError);

    useEffect(() => {
        setBookingDetails(initialBookingDetails);
        setError(initialError);
    }, [initialBookingDetails, initialError]);

    const paymentStatus = useMemo(
        () => normalizePaymentStatus(bookingDetails, paymentMethod),
        [bookingDetails, paymentMethod]
    );

    const bookingStatus = useMemo(
        () => normalizeBookingStatus(bookingDetails, paymentStatus),
        [bookingDetails, paymentStatus]
    );

    const statusBadgeClass =
        bookingStatus === 'confirmed'
            ? 'bg-green-100 text-green-800 border-green-300'
            : 'bg-amber-100 text-amber-800 border-amber-300';

    const paymentBadgeClass =
        paymentStatus === 'paid'
            ? 'bg-green-100 text-green-800 border-green-300'
            : 'bg-slate-100 text-slate-700 border-slate-300';

    const handleDownloadReceipt = async () => {
        try {
            if (!bookingDetails) return;

            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            let y = 20;
            doc.setFontSize(18);
            doc.text('Recu de reservation', 20, y);

            y += 10;
            doc.setFontSize(11);
            doc.text(`Reference: ${bookingDetails.id || '-'}`, 20, y);
            y += 8;
            doc.text(`Date creation: ${formatDateTime(bookingDetails.createdAt)}`, 20, y);
            y += 8;
            doc.text(`Intervention: ${formatDateTime(bookingDetails.dateTime)}`, 20, y);
            y += 8;
            doc.text(`Statut reservation: ${bookingStatus}`, 20, y);
            y += 8;
            doc.text(`Statut paiement: ${paymentStatus}`, 20, y);
            y += 8;
            doc.text(`Montant: ${formatCurrency(bookingDetails.amount, bookingDetails.currency)}`, 20, y);

            y += 12;
            doc.text('Client', 20, y);
            y += 8;
            doc.text(`Nom: ${bookingDetails.name || '-'}`, 20, y);
            y += 8;
            doc.text(`Email: ${bookingDetails.email || '-'}`, 20, y);
            y += 8;
            doc.text(`Telephone: ${bookingDetails.phone || '-'}`, 20, y);
            y += 8;
            doc.text(`Adresse: ${bookingDetails.address || '-'}`, 20, y);
            y += 8;
            doc.text(`Appareil: ${bookingDetails.device || '-'}`, 20, y);

            if (bookingDetails.issue) {
                y += 10;
                doc.text('Probleme', 20, y);
                y += 8;
                doc.text(bookingDetails.issue, 20, y, { maxWidth: 170 });
            }

            doc.save(`booking-receipt-${bookingDetails.id || 'reservation'}.pdf`);
        } catch (downloadError) {
            console.error('Receipt download error:', downloadError);
            toast.error('Impossible de telecharger le recu.');
        }
    };

    const handleShare = async () => {
        try {
            const url = window.location.href;
            const text = `Reservation ${bookingDetails?.id || ''} - statut ${bookingStatus}`;

            if (navigator.share) {
                await navigator.share({ title: 'Reservation', text, url });
                return;
            }

            await navigator.clipboard.writeText(url);
            toast.success('Lien copie dans le presse-papiers');
        } catch (shareError) {
            console.error('Share error:', shareError);
        }
    };

    if (error || !bookingDetails || !bookingId) {
        return (
            <div className="container mx-auto px-4 py-10">
                <Card className="mx-auto max-w-2xl border-destructive/30 shadow-lg">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <AlertCircle className="h-9 w-9" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Réservation introuvable</h1>
                            <p className="text-muted-foreground text-base">
                                {error || "Nous n'avons pas pu charger les détails de votre réservation."}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                            <Button variant="outline" asChild size="lg">
                                <Link href="/booking">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la réservation
                                </Link>
                            </Button>
                            <Button asChild size="lg">
                                <Link href="/">
                                    <Home className="mr-2 h-4 w-4" /> Accueil
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center space-y-4"
                >
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                        <CheckCircle className="h-11 w-11" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold bg-linear-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent">
                            Réservation Confirmée !
                        </h1>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                            <span className="text-sm text-muted-foreground">Référence:</span>
                            <span className="text-sm font-bold text-green-700">{bookingDetails.id}</span>
                        </div>
                    </div>
                    <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                        Votre réservation a été enregistrée avec succès. Vous recevrez un email de confirmation sous peu.
                    </p>
                </motion.div>

                <Card className="border border-border bg-card shadow-lg overflow-hidden">
                    <CardContent className="space-y-6 p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground">Détails de la réservation</h2>
                            <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusBadgeClass}`}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Réservation: {bookingStatus === 'confirmed' ? 'Confirmée' : 'En attente'}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${paymentBadgeClass}`}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Paiement: {paymentStatus === 'paid' ? 'Payé' : 'En attente'}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 p-5 space-y-3 border border-blue-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-lg text-foreground">Informations de réservation</h3>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Référence:</span>
                                        <span className="text-sm font-semibold text-foreground">{bookingDetails.id}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Créé le:</span>
                                        <span className="text-sm text-foreground">{formatDateTime(bookingDetails.createdAt)}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Intervention:</span>
                                        <span className="text-sm font-semibold text-primary">{formatDateTime(bookingDetails.dateTime)}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Appareil:</span>
                                        <span className="text-sm text-foreground">{bookingDetails.device || '-'}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Option:</span>
                                        <span className="text-sm text-foreground">
                                            {bookingDetails.paymentOption === 'pay_now' ? 'Payer maintenant' : 'Payer plus tard'}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2 pt-2 border-t border-blue-200">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Montant:</span>
                                        <span className="text-base font-bold text-primary">
                                            {formatCurrency(bookingDetails.amount, bookingDetails.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-linear-to-br from-purple-50 to-pink-50 p-5 space-y-3 border border-purple-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-lg text-foreground">Informations client</h3>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Nom:</span>
                                        <span className="text-sm font-semibold text-foreground">{bookingDetails.name || '-'}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Email:</span>
                                        <span className="text-sm text-foreground break-all">{bookingDetails.email || '-'}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Téléphone:</span>
                                        <span className="text-sm text-foreground">{bookingDetails.phone || '-'}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground min-w-25">Adresse:</span>
                                        <span className="text-sm text-foreground">{bookingDetails.address || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {bookingDetails.issue ? (
                            <div className="rounded-xl bg-linear-to-br from-amber-50 to-orange-50 p-5 border border-amber-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
                                        <AlertCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-lg text-foreground">Problème décrit</h3>
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-10">{bookingDetails.issue}</p>
                            </div>
                        ) : null}

                        <div className="pt-4 border-t border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <Button onClick={handleDownloadReceipt} className="w-full" size="lg">
                                    <Download className="mr-2 h-4 w-4" /> Télécharger le reçu
                                </Button>
                                <Button variant="outline" onClick={handleShare} className="w-full" size="lg">
                                    <Share2 className="mr-2 h-4 w-4" /> Partager
                                </Button> 
                                <Button variant="outline" asChild className="w-full" size="lg">
                                    <Link href="/">
                                        <Home className="mr-2 h-4 w-4" /> Accueil
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BookingSuccessPageClient;

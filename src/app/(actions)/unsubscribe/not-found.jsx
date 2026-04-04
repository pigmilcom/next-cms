// @/app/(actions)/unsubscribe/not-found.jsx

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-2xl">
            <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-red-900">Link Inválido</CardTitle>
                    <CardDescription className="text-red-700">
                        O link de cancelamento de subscrição é inválido ou expirou.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="mb-6 text-sm text-red-600">
                        Se continuar a receber emails indesejados, por favor contacte o nosso suporte.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/">Voltar à Página Inicial</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

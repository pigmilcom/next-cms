// @/app/(frontend)/preview/not-found.jsx

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md border-red-200 bg-red-50/50">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-red-900">Campanha Não Encontrada</CardTitle>
                    <CardDescription className="text-red-700">
                        O link de pré-visualização é inválido ou a campanha não existe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="mb-6 text-sm text-red-600">
                        Verifique se o link está correto ou contacte o suporte se o problema persistir.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/">Voltar à Página Inicial</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

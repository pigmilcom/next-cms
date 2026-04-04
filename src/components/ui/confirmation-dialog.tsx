'use client';

import React, { useEffect, useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    requireConfirmText?: string; // if provided, user must type this text to enable confirm
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    requireConfirmText
}: ConfirmationDialogProps) {
    const [typed, setTyped] = useState('');
    const matchesRequired = requireConfirmText ? typed.trim().toLowerCase() === requireConfirmText.toLowerCase() : true;

    useEffect(() => {
        if (!open) {
            setTyped('');
        }
    }, [open]);

    const handleConfirm = () => {
        if (!matchesRequired) return;
        onConfirm();
    };
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>

                {requireConfirmText && (
                    <div className="mt-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Type "{requireConfirmText}" to confirm
                        </label>
                        <input
                            type="text"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            className="w-full rounded-md border px-3 py-2"
                            placeholder={`Type ${requireConfirmText} to confirm`}
                        />
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={!matchesRequired}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

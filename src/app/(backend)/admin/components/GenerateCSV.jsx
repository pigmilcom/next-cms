// @/app/(backend)/admin/components/GenerateCSV.jsx

'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

/**
 * Reusable CSV Export Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog open state handler
 * @param {string} props.title - Dialog title
 * @param {string} props.description - Dialog description
 * @param {Array} props.data - Data array to export
 * @param {Array} props.exportFields - Array of field configurations
 * @param {string} props.filename - Base filename for export (without extension)
 * @param {Function} props.formatRowData - Function to format each row data
 *
 * Example exportFields format:
 * [
 *   { key: 'orderId', label: 'Order ID', defaultChecked: true },
 *   { key: 'customerInfo', label: 'Customer Information', defaultChecked: true }
 * ]
 *
 * Example formatRowData function:
 * (item, selectedFields, fieldMapping) => {
 *   const rowData = { orderId: item.id, customerName: item.customer.name };
 *   return fieldMapping.map(field => rowData[field]);
 * }
 */
export default function GenerateCSV({
    open,
    onOpenChange,
    title = 'Export to CSV',
    description = 'Select the data fields you want to include in your CSV export',
    data = [],
    exportFields = [],
    filename = 'export',
    formatRowData
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState(() => {
        const initial = {};
        exportFields.forEach((field) => {
            initial[field.key] = field.defaultChecked ?? true;
        });
        return initial;
    });

    const handleGenerate = () => {
        setIsGenerating(true);

        try {
            const headers = [];
            const fieldMapping = [];

            // Build headers and field mapping based on selected options
            exportFields.forEach((field) => {
                if (selectedOptions[field.key]) {
                    if (field.headers && field.fields) {
                        // Multiple columns for this option
                        headers.push(...field.headers);
                        fieldMapping.push(...field.fields);
                    } else {
                        // Single column for this option
                        headers.push(field.label);
                        fieldMapping.push(field.key);
                    }
                }
            });

            // Format data based on formatRowData function or use default formatting
            const csvData = data.map((item) => {
                if (formatRowData) {
                    return formatRowData(item, selectedOptions, fieldMapping);
                }

                // Default formatting: map fieldMapping to item properties
                return fieldMapping.map((field) => {
                    const value = item[field];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    return `"${String(value).replace(/"/g, '""')}"`;
                });
            });

            const csv = [headers, ...csvData].map((row) => row.join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${new Date().toISOString()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success('CSV file downloaded successfully');
            onOpenChange(false);
        } catch (error) {
            console.error('Error generating CSV:', error);
            toast.error('Failed to generate CSV file');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOptionChange = (key, checked) => {
        setSelectedOptions((prev) => ({ ...prev, [key]: checked }));
    };

    const handleCancel = () => {
        onOpenChange(false);
        setIsGenerating(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-bold text-xl">{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    {exportFields.map((field) => (
                        <div key={field.key} className="flex items-center space-x-2">
                            <Checkbox
                                id={field.key}
                                checked={selectedOptions[field.key]}
                                onCheckedChange={(checked) => handleOptionChange(field.key, checked)}
                            />
                            <Label htmlFor={field.key} className="text-sm font-medium cursor-pointer">
                                {field.label}
                            </Label>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleCancel} disabled={isGenerating}>
                        Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Generate CSV
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

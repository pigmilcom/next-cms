import { generatePDF } from '@/utils/generatePDF';

export const printInvoicePdf = async (order, settings, locale, fallbackMessage = 'Failed to prepare invoice for printing.') => {
    let pdfUrl = null;
    let printFrame = null;

    const cleanup = () => {
        if (printFrame?.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
            printFrame = null;
        }

        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            pdfUrl = null;
        }
    };

    try {
        const pdfResult = await generatePDF(order, settings, locale, { action: 'blob-url' });

        pdfUrl = pdfResult?.url;
        if (!pdfUrl) {
            throw new Error(fallbackMessage);
        }

        printFrame = document.createElement('iframe');
        printFrame.setAttribute('title', pdfResult.fileName || 'invoice.pdf');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.style.opacity = '0';
        printFrame.src = pdfUrl;

        const printPromise = new Promise((resolve, reject) => {
            printFrame.onload = () => {
                const frameWindow = printFrame?.contentWindow;
                if (!frameWindow) {
                    reject(new Error(fallbackMessage));
                    return;
                }

                frameWindow.addEventListener(
                    'afterprint',
                    () => {
                        cleanup();
                        resolve(pdfResult);
                    },
                    { once: true }
                );

                setTimeout(() => {
                    try {
                        frameWindow.focus();
                        frameWindow.print();
                        setTimeout(() => {
                            cleanup();
                            resolve(pdfResult);
                        }, 1500);
                    } catch (error) {
                        reject(error);
                    }
                }, 350);
            };
        });

        document.body.appendChild(printFrame);
        return await printPromise;
    } catch (error) {
        cleanup();
        throw error;
    }
};
// Example: How to use the campaign preview feature

import { generatePreviewLink, getCampaign } from '@/lib/server/newsletter';

// ============================================================================
// EXAMPLE 1: Generate Preview Link for Campaign
// ============================================================================

const campaignId = 'CAMP_abc123';
const previewUrl = await generatePreviewLink(campaignId);
// Result: https://yoursite.com/preview?id=Q0FNUF9hYmMxMjM=

// ============================================================================
// EXAMPLE 2: Add Preview Link to Email Template
// ============================================================================

export const NewsletterTemplate = async ({ campaignId, content, companyName }) => {
    const previewUrl = await generatePreviewLink(campaignId);
    
    return (
        <Html>
            <Body>
                {/* Email content */}
                <div dangerouslySetInnerHTML={{ __html: content }} />
                
                {/* Preview link in header */}
                <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px' }}>
                    Problemas para visualizar este email?{' '}
                    <a href={previewUrl} style={{ color: '#3b82f6' }}>
                        Ver no navegador
                    </a>
                </div>
            </Body>
        </Html>
    );
};

// ============================================================================
// EXAMPLE 3: Admin Panel - Add Preview Button to Campaigns
// ============================================================================

'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePreviewLink } from '@/lib/server/newsletter';

const CampaignListItem = ({ campaign }) => {
    const handlePreview = async () => {
        const previewUrl = await generatePreviewLink(campaign.id);
        window.open(previewUrl, '_blank'); // Open in new tab
    };

    return (
        <div>
            <h3>{campaign.subject.pt || campaign.subject.en}</h3>
            <Button onClick={handlePreview} variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Pré-visualizar
            </Button>
        </div>
    );
};

// ============================================================================
// EXAMPLE 4: Fetch and Display Campaign Data
// ============================================================================

// Server Component
const PreviewServerComponent = async ({ searchParams }) => {
    const encodedId = searchParams?.id;
    const campaignId = Buffer.from(encodedId, 'base64').toString('utf-8');
    
    const result = await getCampaign(campaignId);
    
    if (!result.success) {
        return <div>Campaign not found</div>;
    }
    
    const campaign = result.data;
    
    return <PreviewClient campaign={campaign} />;
};

// ============================================================================
// EXAMPLE 5: Generate Preview Link with Custom Base URL
// ============================================================================

// For development or custom domains
const previewUrlDev = await generatePreviewLink(
    'CAMP_abc123',
    'http://localhost:3000'
);
// Result: http://localhost:3000/preview?id=Q0FNUF9hYmMxMjM=

const previewUrlProd = await generatePreviewLink(
    'CAMP_abc123',
    'https://yoursite.com'
);
// Result: https://yoursite.com/preview?id=Q0FNUF9hYmMxMjM=

// ============================================================================
// EXAMPLE 6: Manual Link Generation (for testing)
// ============================================================================

const campaignId = 'CAMP_test123';
const encodedId = Buffer.from(campaignId).toString('base64');
const manualUrl = `https://yoursite.com/preview?id=${encodedId}`;
console.log('Manual Preview URL:', manualUrl);
// Output: https://yoursite.com/preview?id=Q0FNUF90ZXN0MTIz

// ============================================================================
// EXAMPLE 7: Decode Campaign ID from URL
// ============================================================================

const encodedFromUrl = 'Q0FNUF90ZXN0MTIz';
const decodedId = Buffer.from(encodedFromUrl, 'base64').toString('utf-8');
console.log('Decoded Campaign ID:', decodedId);
// Output: CAMP_test123

// ============================================================================
// EXAMPLE 8: Share Preview Link via API
// ============================================================================

// API Route: /api/campaigns/[id]/share
export async function POST(request, { params }) {
    const campaignId = params.id;
    const { email } = await request.json();
    
    const previewUrl = await generatePreviewLink(campaignId);
    
    // Send preview link via email
    await sendEmail({
        to: email,
        subject: 'Campaign Preview',
        html: `
            <p>Here's the preview of your campaign:</p>
            <p><a href="${previewUrl}">View Campaign Preview</a></p>
        `
    });
    
    return Response.json({ success: true, previewUrl });
}

// ============================================================================
// EXAMPLE 9: Copy Preview Link to Clipboard (Client-side)
// ============================================================================

'use client';

const CopyPreviewButton = ({ campaignId }) => {
    const handleCopy = async () => {
        const previewUrl = await generatePreviewLink(campaignId);
        
        try {
            await navigator.clipboard.writeText(previewUrl);
            toast.success('Preview link copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    return (
        <Button onClick={handleCopy}>
            Copy Preview Link
        </Button>
    );
};

// ============================================================================
// EXAMPLE 10: QR Code for Preview Link
// ============================================================================

import QRCode from 'qrcode';

const generatePreviewQR = async (campaignId) => {
    const previewUrl = await generatePreviewLink(campaignId);
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(previewUrl);
    
    return qrCodeDataUrl; // Use in <img src={qrCodeDataUrl} />
};

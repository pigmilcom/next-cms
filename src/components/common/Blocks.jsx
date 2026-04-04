// @/components/common/Blocks.jsx

'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getAllBlocks } from '@/lib/server/admin';

// Helper function to extract YouTube video ID from URL
const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

// Helper function to detect if URL is a video
const isVideoUrl = (url) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
};

// Render different block types
const renderBlockContent = (block) => {
    if (!block || !block.isActive) {
        return null;
    }

    switch (block.type) {
        case 'text':
            return (
                <div className="text-block">
                    <div className="prose prose-sm max-w-none">{block.content}</div>
                </div>
            );

        case 'html':
            return (
                <div className="html-block">
                    {/* Custom CSS */}
                    {block.data?.css && <style dangerouslySetInnerHTML={{ __html: block.data.css }} />}

                    {/* HTML Content */}
                    <div dangerouslySetInnerHTML={{ __html: block.content }} />

                    {/* Custom JavaScript */}
                    {block.data?.js && (
                        <Script
                            id={`block-js-${block.id}`}
                            strategy="afterInteractive"
                            dangerouslySetInnerHTML={{ __html: block.data.js }}
                        />
                    )}
                </div>
            );

        case 'image':
            return (
                <div className="image-block">
                    {block.data?.imageUrl && (
                        <figure>
                            <img
                                src={block.data.imageUrl}
                                alt={block.data?.altText || block.name}
                                className="max-w-full h-auto"
                                loading="lazy"
                            />
                            {block.data?.caption && (
                                <figcaption className="mt-2 text-sm text-gray-600 text-center">
                                    {block.data.caption}
                                </figcaption>
                            )}
                        </figure>
                    )}
                </div>
            );

        case 'video':
            return (
                <div className="video-block">
                    {block.data?.videoUrl && (
                        <video
                            controls={block.data?.controls !== false}
                            autoPlay={block.data?.autoplay || false}
                            poster={block.data?.posterUrl}
                            className="w-full h-auto"
                            muted={block.data?.autoplay || false} // Mute if autoplay for browser policies
                        >
                            <source src={block.data.videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    )}
                </div>
            );

        case 'youtube': {
            const videoId = getYouTubeVideoId(block.data?.youtubeUrl || '');
            if (!videoId) {
                return (
                    <div className="youtube-block">
                        <div className="bg-gray-100 p-4 text-center text-gray-500">Invalid YouTube URL</div>
                    </div>
                );
            }

            const width = block.data?.width || '560';
            const height = block.data?.height || '315';
            const autoplay = block.data?.autoplay ? '&autoplay=1' : '';

            return (
                <div className="youtube-block">
                    <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}?rel=0${autoplay}`}
                            width={width}
                            height={height}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={block.name}
                        />
                    </div>
                </div>
            );
        }

        case 'form': {
            let formFields = [];
            try {
                formFields = JSON.parse(block.data?.fields || '[]');
            } catch (e) {
                console.error('Invalid form fields JSON:', e);
            }

            return (
                <div className="form-block">
                    <form action={block.data?.submitUrl || '/api/contact'} method="POST" className="space-y-4">
                        {block.data?.formTitle && (
                            <h3 className="text-lg font-semibold mb-4">{block.data.formTitle}</h3>
                        )}

                        {formFields.map((field, index) => (
                            <div key={index} className="form-field">
                                <label
                                    htmlFor={`${block.id}-${field.name}`}
                                    className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                {field.type === 'textarea' ? (
                                    <textarea
                                        id={`${block.id}-${field.name}`}
                                        name={field.name}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        rows={field.rows || 4}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        id={`${block.id}-${field.name}`}
                                        name={field.name}
                                        required={field.required}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                        {field.options?.map((option, optIndex) => (
                                            <option key={optIndex} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id={`${block.id}-${field.name}`}
                                        name={field.name}
                                        type={field.type || 'text'}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                )}
                            </div>
                        ))}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            Submit
                        </button>
                    </form>
                </div>
            );
        }

        case 'layout': {
            const layoutType = block.data?.layoutType || 'container';
            const columns = block.data?.columns || 3;
            const gap = block.data?.gap || '1rem';

            let layoutClasses = 'layout-block ';
            const layoutStyles = { gap };

            switch (layoutType) {
                case 'grid':
                    layoutClasses += 'grid';
                    layoutStyles.gridTemplateColumns = `repeat(${columns}, 1fr)`;
                    break;
                case 'flexbox':
                    layoutClasses += 'flex flex-wrap';
                    break;
                default:
                    layoutClasses += 'container mx-auto px-4';
            }

            return (
                <div className={layoutClasses} style={layoutStyles}>
                    <div dangerouslySetInnerHTML={{ __html: block.content }} />
                </div>
            );
        }

        default:
            return (
                <div className="unknown-block">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                        <p className="text-yellow-700">Unknown block type: {block.type}</p>
                    </div>
                </div>
            );
    }
};

/**
 * BlockEl Component - Universal block renderer
 * Automatically fetches and renders blocks by ID
 *
 * @param {string} id - The block ID to render
 * @param {string} className - Additional CSS classes
 * @param {React.Node} fallback - Fallback content if block not found
 * @param {Object} style - Inline styles
 */
export default function BlockEl({ id, className = '', fallback = null, style = {}, ...props }) {
    const [block, setBlock] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) {
            setError('Block ID is required');
            setLoading(false);
            return;
        }

        const fetchBlock = async () => {
            try {
                setLoading(true);
                setError(null);

                // Try to fetch from API first (for client-side)
                try {
                    const response = await fetch(`/api/blocks/${id}`);
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            setBlock(result.data);
                            return;
                        }
                    }
                } catch (apiError) {
                    console.log('API fetch failed, trying direct admin function...');
                }

                // Fallback to direct admin function
                const result = await getAllBlocks({ blockId: id });
                if (result.success) {
                    setBlock(result.data);
                } else {
                    setError(result.error || 'Block not found');
                }
            } catch (err) {
                console.error('Error fetching block:', err);
                setError('Failed to load block');
            } finally {
                setLoading(false);
            }
        };

        fetchBlock();
    }, [id]);

    if (loading) {
        return (
            <div className={`block-loading ${className}`.trim()} style={style} {...props}>
                <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
            </div>
        );
    }

    if (error || !block) {
        if (fallback) {
            return fallback;
        }

        return (
            <div className={`block-error ${className}`.trim()} style={style} {...props}>
                <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700 text-sm">
                    {error || 'Block not found'}
                </div>
            </div>
        );
    }

    if (!block.isActive) {
        return null; // Don't render inactive blocks
    }

    return (
        <div
            className={`block-wrapper block-${block.type} ${className}`.trim()}
            style={style}
            data-block-id={id}
            data-block-type={block.type}
            {...props}>
            {renderBlockContent(block)}
        </div>
    );
}

// Export additional utilities
export const BlockUtils = {
    getYouTubeVideoId,
    isVideoUrl,
    renderBlockContent
};

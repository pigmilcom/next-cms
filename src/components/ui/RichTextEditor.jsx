'use client';
import { html } from '@codemirror/lang-html';
import CodeExtension from '@tiptap/extension-code';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    CheckSquare,
    Code as CodeIcon,
    Columns,
    FileCode,
    Heading1,
    Heading2,
    Heading3,
    Highlighter,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Minus,
    Palette,
    Quote,
    Redo,
    Loader2,
    Rows,
    Sparkles,
    Strikethrough,
    Subscript as SubscriptIcon,
    Superscript as SuperscriptIcon,
    Table as TableIcon,
    TableProperties,
    Underline as UnderlineIcon,
    Undo
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/context/providers';
import parserHtml from 'prettier/parser-html';
import prettier from 'prettier/standalone';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LanguageSelector } from '@/components/ui/language-selector';
import { Textarea } from '@/components/ui/textarea';
import { executeAIModelAndWait, getAISettings, getAllAIModels } from '@/lib/server/ai';

// Dynamically import CodeMirror to avoid SSR issues
const CodeMirror = dynamic(() => import('@uiw/react-codemirror').then((mod) => mod.default), {
    ssr: false,
    loading: () => <div className="h-30 bg-muted animate-pulse" />
});

// Type-specific AI generation instructions
const typeInstructions = {
    email_template: `Generate a professional and attractive email campaign with proper HTML structure. Use ONLY these HTML elements: <h1>, <h2>, <h3>, <h4>, <h5>, <h6> for headings, <p> for paragraphs, <strong> for bold, <em> for italics, <u> for underline, <s> for strikethrough, <a href="..."> for links, <ul> and <ol> with <li> for lists, <blockquote> for quotes, <table>, <tr>, <th>, <td> for tables, <mark> for highlights, <sup> for superscript, <sub> for subscript. Use inline styles for colors like <span style="color: #3B82F6">text</span>. Make it visually appealing with proper spacing and formatting. Return ONLY the HTML code without any markdown or code blocks. Generate content for: `,
    sms_template: 'Create a short, concise and attractive SMS message (160 characters max) promoting: ',
    email_campaign: `Generate engaging email content for a marketing campaign with proper HTML structure. Use ONLY these HTML elements: <h1>, <h2>, <h3> for headings, <p> for paragraphs, <strong> for bold, <em> for italics, <u> for underline, <a href="..."> for links, <ul> and <ol> with <li> for lists, <blockquote> for quotes, <table>, <tr>, <th>, <td> for tables, <mark> for highlights. Use inline styles for colors like <span style="color: #3B82F6">text</span>. Make it attractive and well-formatted. Return ONLY the HTML code without any markdown or code blocks. Generate content about: `,
    sms_campaign: 'Create a promotional SMS flash message (under 160 characters) for: ',
    newsletter: `Generate a comprehensive HTML newsletter with proper structure. Use ONLY these HTML elements: <h1>, <h2>, <h3> for headings, <p> for paragraphs, <strong> for bold, <em> for italics, <u> for underline, <a href="..."> for links, <ul> and <ol> with <li> for lists, <blockquote> for quotes, <table>, <tr>, <th>, <td> for tables with proper headers, <mark> for highlights. Use inline styles for colors like <span style="color: #3B82F6">text</span>. Include sections with headings, organized content, and attractive formatting. Return ONLY the HTML code without any markdown or code blocks. Generate newsletter covering: `,
    catalog_description: `Generate a professional and attractive product or service description with proper HTML structure. Use ONLY these HTML elements: <h1>, <h2>, <h3>, <h4>, <h5>, <h6> for headings, <p> for paragraphs, <strong> for bold, <em> for italics, <u> for underline, <s> for strikethrough, <a href="..."> for links, <ul> and <ol> with <li> for lists, <blockquote> for quotes, <table>, <tr>, <th>, <td> for tables, <mark> for highlights, <sup> for superscript, <sub> for subscript. Use inline styles for colors like <span style="color: #3B82F6">text</span>. Make it visually appealing with proper spacing and formatting. Return ONLY the HTML code without any markdown or code blocks. Generate content for: `,
    product_description: `Write a compelling product description with proper HTML formatting. Use <h3> for the title, <p> for paragraphs, <strong> for bold emphasis, <em> for italics, <ul> with <li> for feature lists, <mark> for highlights. Use inline styles for colors like <span style="color: #22C55E">text</span>. Make it attractive and well-structured. Return ONLY the HTML code without any markdown or code blocks. Generate description for: `,
    announcement: `Create an HTML announcement message. Use <h2> for the title, <p> for paragraphs, <strong> for bold, <em> for italics, <mark> for important highlights, <blockquote> for special notices. Use inline styles for colors like <span style="color: #EF4444">text</span>. Make it eye-catching and clear. Return ONLY the HTML code without any markdown or code blocks. Generate announcement about: `
};

const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = 'Enter description...',
    className = '',
    style = {},
    type = null,
    customType = null,
    customInstructions = '',
    language = null,
    availableLanguages: availableLanguagesProp = null,
    customOnly = false
}) => {
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isDeveloperMode, setIsDeveloperMode] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const linkInputRef = useRef(null);
    const colorPickerRef = useRef(null);
    const isInternalUpdate = useRef(false);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { siteSettings } = useAdminSettings();

    // AI Generate states
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [generatePrompt, setGeneratePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiModels, setAiModels] = useState([]);
    const [selectedAIModel, setSelectedAIModel] = useState('');

    // Language support
    const [selectedLanguage, setSelectedLanguage] = useState('en');

    // Helper function to get language display name
    const getLanguageName = (code) => {
        const languageMap = {
            en: 'English',
            es: 'Español',
            fr: 'Français',
            pt: 'Português',
            de: 'Deutsch',
            it: 'Italiano',
            ru: 'Русский',
            zh: '中文',
            ja: '日本語',
            ko: '한국어',
            ar: 'العربية',
            hi: 'हिन्दी',
            tr: 'Türkçe',
            pl: 'Polski',
            nl: 'Nederlands',
            sv: 'Svenska',
            da: 'Dansk',
            no: 'Norsk',
            fi: 'Suomi',
            cs: 'Čeština',
            sk: 'Slovenčina',
            hu: 'Magyar',
            ro: 'Română',
            bg: 'Български',
            hr: 'Hrvatski',
            sr: 'Српски',
            sl: 'Slovenščina',
            et: 'Eesti',
            lv: 'Latviešu',
            lt: 'Lietuvių',
            mt: 'Malti',
            ga: 'Gaeilge',
            cy: 'Cymraeg',
            eu: 'Euskera',
            ca: 'Català',
            gl: 'Galego'
        };
        return languageMap[code] || code.toUpperCase();
    };

    // Helper function to get country flag emoji
    const getCountryFlag = (code) => {
        const flagMap = {
            en: '🇺🇸',
            es: '🇪🇸',
            fr: '🇫🇷',
            pt: '🇵🇹',
            de: '🇩🇪',
            it: '🇮🇹',
            ru: '🇷🇺',
            zh: '🇨🇳',
            ja: '🇯🇵',
            ko: '🇰🇷',
            ar: '🇸🇦',
            hi: '🇮🇳',
            tr: '🇹🇷',
            pl: '🇵🇱',
            nl: '🇳🇱',
            sv: '🇸🇪',
            da: '🇩🇰',
            no: '🇳🇴',
            fi: '🇫🇮',
            cs: '🇨🇿',
            sk: '🇸🇰',
            hu: '🇭🇺',
            ro: '🇷🇴',
            bg: '🇧🇬',
            hr: '🇭🇷',
            sr: '🇷🇸',
            sl: '🇸🇮',
            et: '🇪🇪',
            lv: '🇱🇻',
            lt: '🇱🇹',
            mt: '🇲🇹',
            ga: '🇮🇪',
            cy: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
            eu: '🏴󠁥󠁳󠁰󠁶󠁿',
            ca: '🏴󠁥󠁳󠁣󠁴󠁿',
            gl: '🏴󠁥󠁳󠁧󠁡󠁿'
        };
        return flagMap[code] || '🌐';
    };

    // Use provided availableLanguages prop or merge from site settings
    const availableLanguages = useMemo(() => {
        // If availableLanguages prop is provided, use it
        if (availableLanguagesProp && Array.isArray(availableLanguagesProp) && availableLanguagesProp.length > 0) {
            return availableLanguagesProp;
        }

        // Otherwise, merge and deduplicate languages from site settings
        const frontendLanguages = siteSettings?.languages || ['en'];
        const adminLanguages = siteSettings?.adminLanguages || ['en'];

        // Merge and deduplicate
        const allLanguages = [...new Set([...frontendLanguages, ...adminLanguages])];

        return allLanguages.map((lang) => ({
            code: lang,
            name: getLanguageName(lang),
            flag: getCountryFlag(lang)
        }));
    }, [siteSettings]);

    // Determine if language selector should be shown
    const showLanguageSelector = !language && availableLanguages.length > 1;

    // Handle theme mounting
    useEffect(() => setMounted(true), []);

    // Initialize language from prop or set default
    useEffect(() => {
        if (language) {
            // Use provided language prop
            setSelectedLanguage(language);
        } else if (availableLanguages.length > 0) {
            // If no language prop, set default based on available languages
            if (availableLanguages.length === 1) {
                // Only one language available, use it as default
                setSelectedLanguage(availableLanguages[0].code);
            } else {
                // Multiple languages available, default to 'en' if available, otherwise first one
                const defaultLang = availableLanguages.find((lang) => lang.code === 'en')
                    ? 'en'
                    : availableLanguages[0].code;
                setSelectedLanguage(defaultLang);
            }
        }
    }, [language, availableLanguages]);

    // Load AI settings and models on mount
    useEffect(() => {
        const loadAIConfig = async () => {
            try {
                const settingsResult = await getAISettings();
                if (settingsResult.success && settingsResult.data?.enabled) {
                    setAiEnabled(true);

                    // Load available text models
                    const modelsResult = await getAllAIModels({ enabledOnly: true });
                    if (modelsResult.success && modelsResult.data) {
                        // Filter for text models only
                        const textModels = modelsResult.data.filter(
                            (model) => model.modelType === 'text' || !model.modelType
                        );
                        setAiModels(textModels);
                        // Set first model as default
                        if (textModels.length > 0) {
                            setSelectedAIModel(textModels[0].id);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load AI configuration:', error);
            }
        };

        loadAIConfig();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (linkInputRef.current && !linkInputRef.current.contains(event.target)) {
                setShowLinkInput(false);
                setLinkUrl('');
            }
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
                setShowColorPicker(false);
            }
        };

        if (showLinkInput || showColorPicker) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showLinkInput, showColorPicker]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                code: false, // Disable StarterKit's code to avoid duplicate with CodeExtension
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false
                }
            }),
            TextStyle,
            Color,
            TextAlign.configure({
                types: ['heading', 'paragraph']
            }),
            Underline,
            CodeExtension,
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-md'
                }
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline'
                }
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse table-auto w-full'
                }
            }),
            TableRow,
            TableHeader,
            TableCell,
            TaskList,
            TaskItem.configure({
                nested: true
            }),
            Highlight.configure({
                multicolor: true
            }),
            Subscript,
            Superscript
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            if (!isInternalUpdate.current) {
                const html = editor.getHTML();
                onChange?.(html);
            }
            isInternalUpdate.current = false;
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[120px] p-4'
            }
        }
    });

    // Sync editor content when value prop changes externally
    useEffect(() => {
        if (editor && value !== undefined && value !== editor.getHTML()) {
            isInternalUpdate.current = true;
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    // Toggle between rich text and HTML mode
    const toggleDeveloperMode = async () => {
        if (!isDeveloperMode) {
            // Switching to HTML mode - get current HTML from editor
            const currentHtml = editor?.getHTML() || value;

            // Format HTML with Prettier for better readability
            try {
                const formatted = await prettier.format(currentHtml, {
                    parser: 'html',
                    plugins: [parserHtml],
                    printWidth: 80,
                    tabWidth: 2,
                    useTabs: false,
                    htmlWhitespaceSensitivity: 'css'
                });
                setHtmlContent(formatted);
            } catch (err) {
                // If formatting fails, use unformatted HTML
                console.warn('Failed to format HTML:', err);
                setHtmlContent(currentHtml);
            }
        } else {
            // Switching to rich text mode - update editor with HTML content
            if (editor && htmlContent) {
                isInternalUpdate.current = true;
                editor.commands.setContent(htmlContent);
            }
        }
        setIsDeveloperMode(!isDeveloperMode);
    };

    if (!editor) {
        return <div className="h-50 bg-muted animate-pulse rounded-md" />;
    }

    const ToolbarButton = ({ onClick, isActive = false, disabled = false, children, title }) => (
        <Button
            type="button"
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
            title={title}>
            {children}
        </Button>
    );

    const handleGenerate = async (promptOverride = '') => {
        const effectivePrompt =
            typeof promptOverride === 'string' && promptOverride.trim() ? promptOverride : generatePrompt;

        if (!effectivePrompt.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        if (!selectedAIModel) {
            toast.error('No AI model selected');
            return;
        }

        setIsGenerating(true);

        try {
            const instructionType = customType || type;
            const instructionParts = [];

            if (instructionType && typeInstructions[instructionType]) {
                instructionParts.push(typeInstructions[instructionType].trim());
            }

            if (customInstructions?.trim()) {
                instructionParts.push(customInstructions.trim());
            }

            instructionParts.push(
                'Return ONLY the final generated content. Do not add introductions, explanations, commentary, notes, or markdown code fences.'
            );

            const generationInstructions = instructionParts.join('\n\n');

            // Execute AI model and wait for completion
            const result = await executeAIModelAndWait(selectedAIModel, {
                instructions: generationInstructions,
                prompt: effectivePrompt,
                language: selectedLanguage || 'en',
                max_tokens: 2000,
                temperature: 0.7
            });

            if (result.success && result.data) {
                // Extract generated text from Replicate prediction response
                // Structure: { success: true, data: { id, status, output, ... } }
                let generatedText = '';

                // The output field contains the actual generated content
                const output = result.data.output;

                if (output !== undefined && output !== null) {
                    if (Array.isArray(output)) {
                        // Join array elements (common for text generation models)
                        generatedText = output.join('');
                    } else if (typeof output === 'string') {
                        // Direct string output
                        generatedText = output;
                    } else if (typeof output === 'object') {
                        // Some models return objects, try to stringify
                        generatedText = JSON.stringify(output);
                    }
                }

                // Fallback: check if result.data itself is a string (legacy format)
                if (!generatedText && typeof result.data === 'string') {
                    generatedText = result.data;
                }

                if (!generatedText || generatedText.trim() === '') {
                    toast.error('No content generated');
                    setIsGenerating(false);
                    return;
                }

                // Clean up the generated text (remove markdown code blocks if present)
                let cleanedText = generatedText.trim();

                // Remove markdown code blocks (```html or ``` wrappers)
                if (cleanedText.startsWith('```')) {
                    cleanedText = cleanedText
                        .replace(/^```(?:html)?\n?/, '')
                        .replace(/\n?```$/, '')
                        .trim();
                }

                // Detect if content is HTML or plain text
                const isHTML = /<[a-z][\s\S]*>/i.test(cleanedText);

                let finalContent;
                if (isHTML) {
                    // Content is already HTML, use it directly
                    finalContent = cleanedText;
                } else {
                    // Content is plain text, convert to HTML paragraphs
                    finalContent = cleanedText
                        .split('\n\n')
                        .filter((p) => p.trim())
                        .map((p) => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
                        .join('');
                }

                // Update editor content
                if (isDeveloperMode) {
                    // Update HTML content for CodeMirror
                    setHtmlContent(finalContent);
                    if (onChange) {
                        isInternalUpdate.current = true;
                        onChange(finalContent);
                    }
                } else {
                    // Update Tiptap editor
                    if (editor) {
                        editor.commands.setContent(finalContent);
                        if (onChange) {
                            isInternalUpdate.current = true;
                            onChange(finalContent);
                        }
                    }
                }

                toast.success('Content generated successfully');
                setShowGenerateDialog(false);
                setGeneratePrompt('');
            } else {
                toast.error(result.error || 'Failed to generate content');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            toast.error('Failed to generate content');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateButtonClick = async () => {
        if (isGenerating) {
            return;
        }

        if (customOnly && customInstructions?.trim()) {
            setGeneratePrompt(customInstructions);
            await handleGenerate(customInstructions);
            return;
        }

        setShowGenerateDialog(true);
    };

    const setLink = () => {
        if (linkUrl) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
            setLinkUrl('');
            setShowLinkInput(false);
        }
    };

    const addImage = () => {
        const url = window.prompt('Enter image URL:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const colorOptions = [
        '#000000',
        '#374151',
        '#6B7280',
        '#9CA3AF',
        '#EF4444',
        '#F97316',
        '#EAB308',
        '#22C55E',
        '#3B82F6',
        '#8B5CF6',
        '#EC4899',
        '#F43F5E'
    ];

    return (
        <>
            <style jsx global>{`
                /* TipTap Editor Content Isolation */
                .prose.tiptap-editor-content {
                    /* Reset and isolate from app styles */
                    all: revert-layer;
                    contain: layout style;
                    isolation: isolate;
                    
                    /* Base typography reset */
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    color: hsl(var(--foreground));
                    background-color: transparent;
                    
                    /* Reset margins, padding, and borders */
                    margin: 0;
                    padding: 1rem;
                    border: none;
                    outline: none;
                    box-sizing: border-box;
                    
                    /* Reset text properties */
                    text-align: left;
                    text-decoration: none;
                    text-transform: none;
                    letter-spacing: normal;
                    word-spacing: normal;
                    
                    /* Reset positioning and display */
                    position: static;
                    display: block;
                    float: none;
                    clear: none;
                    
                    /* Reset flexbox/grid properties */
                    flex: none;
                    align-items: stretch;
                    justify-content: flex-start;
                    
                    /* Ensure proper overflow handling */
                    overflow-x: hidden;
                    overflow-y: auto;
                }

                /* Reset all child elements within prose content */
                .prose.tiptap-editor-content * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                    border: 0;
                    font: inherit;
                    color: inherit;
                    vertical-align: baseline;
                }

                /* Restore semantic element styles within editor */
                .prose.tiptap-editor-content h1, 
                .prose.tiptap-editor-content h2, 
                .prose.tiptap-editor-content h3, 
                .prose.tiptap-editor-content h4, 
                .prose.tiptap-editor-content h5, 
                .prose.tiptap-editor-content h6 {
                    font-weight: 600;
                    line-height: 1.25;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                }

                .prose.tiptap-editor-content h1 { font-size: 1.875rem; }
                .prose.tiptap-editor-content h2 { font-size: 1.5rem; }
                .prose.tiptap-editor-content h3 { font-size: 1.25rem; }
                .prose.tiptap-editor-content h4 { font-size: 1.125rem; }
                .prose.tiptap-editor-content h5 { font-size: 1rem; }
                .prose.tiptap-editor-content h6 { font-size: 0.875rem; }

                .prose.tiptap-editor-content p {
                    margin-top: 0.75rem;
                    margin-bottom: 0.75rem;
                    line-height: 1.5;
                }

                .prose.tiptap-editor-content ul, 
                .prose.tiptap-editor-content ol {
                    margin: 0.75rem 0;
                    padding-left: 1.5rem;
                }

                .prose.tiptap-editor-content li {
                    margin: 0.25rem 0;
                    line-height: 1.5;
                }

                .prose.tiptap-editor-content ul {
                    list-style-type: disc;
                }

                .prose.tiptap-editor-content ol {
                    list-style-type: decimal;
                }

                .prose.tiptap-editor-content blockquote {
                    margin: 1rem 0;
                    padding-left: 1rem;
                    border-left: 4px solid hsl(var(--border));
                    font-style: italic;
                    color: hsl(var(--muted-foreground));
                }

                .prose.tiptap-editor-content code {
                    background-color: hsl(var(--muted));
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
                    font-size: 0.8em;
                }

                .prose.tiptap-editor-content strong {
                    font-weight: 600;
                }

                .prose.tiptap-editor-content em {
                    font-style: italic;
                }

                .prose.tiptap-editor-content u {
                    text-decoration: underline;
                }

                .prose.tiptap-editor-content s {
                    text-decoration: line-through;
                }

                .prose.tiptap-editor-content a {
                    color: hsl(var(--primary));
                    text-decoration: underline;
                }

                .prose.tiptap-editor-content a:hover {
                    text-decoration-style: wavy;
                }

                .prose.tiptap-editor-content hr {
                    margin: 1.5rem 0;
                    border: none;
                    border-top: 1px solid hsl(var(--border));
                }

                /* Table Styles */
                .prose.tiptap-editor-content .ProseMirror table,
                .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 1rem 0;
                    overflow: hidden;
                }

                .prose.tiptap-editor-content .ProseMirror table,
                .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 1rem 0;
                    overflow: hidden;
                }

                .prose.tiptap-editor-content .ProseMirror table td,
                .prose.tiptap-editor-content .ProseMirror table th,
                .ProseMirror table td,
                .ProseMirror table th {
                    min-width: 1em;
                    border: 2px solid hsl(var(--border));
                    padding: 0.5rem;
                    vertical-align: top;
                    box-sizing: border-box;
                    position: relative;
                }

                .prose.tiptap-editor-content .ProseMirror table th,
                .ProseMirror table th {
                    font-weight: bold;
                    text-align: left;
                    background-color: hsl(var(--muted));
                }

                .prose.tiptap-editor-content .ProseMirror table .selectedCell,
                .ProseMirror table .selectedCell {
                    background-color: hsl(var(--accent));
                }

                /* Task List Styles */
                .prose.tiptap-editor-content .ProseMirror ul[data-type="taskList"],
                .ProseMirror ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }

                .prose.tiptap-editor-content .ProseMirror ul[data-type="taskList"] li,
                .ProseMirror ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .prose.tiptap-editor-content .ProseMirror ul[data-type="taskList"] li > label,
                .ProseMirror ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-top: 0.25rem;
                    user-select: none;
                }

                .prose.tiptap-editor-content .ProseMirror ul[data-type="taskList"] li > div,
                .ProseMirror ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }

                .prose.tiptap-editor-content .ProseMirror ul[data-type="taskList"] input[type="checkbox"],
                .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
                    cursor: pointer;
                    width: 1rem;
                    height: 1rem;
                }

                /* Highlight Styles */
                .prose.tiptap-editor-content .ProseMirror mark,
                .ProseMirror mark {
                    background-color: #fef08a;
                    padding: 0.125rem 0;
                    border-radius: 0.125rem;
                }

                .dark .prose.tiptap-editor-content .ProseMirror mark,
                .dark .ProseMirror mark {
                    background-color: #854d0e;
                }

                /* Subscript and Superscript */
                .prose.tiptap-editor-content .ProseMirror sub,
                .ProseMirror sub {
                    vertical-align: sub;
                    font-size: smaller;
                }

                .prose.tiptap-editor-content .ProseMirror sup,
                .ProseMirror sup {
                    vertical-align: super;
                    font-size: smaller;
                }
            `}</style>
            <div
                className={`relative border border-border rounded-lg overflow-hidden bg-background ${className}`}
                style={{ ...style, zIndex: 'auto' }}>
                {/* Toolbar */}
                <div
                    className="relative flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30"
                    style={{ zIndex: 10 }}>
                    {/* Text Formatting */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            isActive={editor.isActive('bold')}
                            title="Bold">
                            <Bold className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            isActive={editor.isActive('italic')}
                            title="Italic">
                            <Italic className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            isActive={editor.isActive('underline')}
                            title="Underline">
                            <UnderlineIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            isActive={editor.isActive('strike')}
                            title="Strikethrough">
                            <Strikethrough className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            isActive={editor.isActive('code')}
                            title="Code">
                            <CodeIcon className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Headings */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            isActive={editor.isActive('heading', { level: 1 })}
                            title="Heading 1">
                            <Heading1 className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            isActive={editor.isActive('heading', { level: 2 })}
                            title="Heading 2">
                            <Heading2 className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            isActive={editor.isActive('heading', { level: 3 })}
                            title="Heading 3">
                            <Heading3 className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Text Alignment */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            isActive={editor.isActive({ textAlign: 'left' })}
                            title="Align Left">
                            <AlignLeft className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            isActive={editor.isActive({ textAlign: 'center' })}
                            title="Align Center">
                            <AlignCenter className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            isActive={editor.isActive({ textAlign: 'right' })}
                            title="Align Right">
                            <AlignRight className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                            isActive={editor.isActive({ textAlign: 'justify' })}
                            title="Justify">
                            <AlignJustify className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Lists */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            isActive={editor.isActive('bulletList')}
                            title="Bullet List">
                            <List className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            isActive={editor.isActive('orderedList')}
                            title="Ordered List">
                            <ListOrdered className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleTaskList().run()}
                            isActive={editor.isActive('taskList')}
                            title="Task List">
                            <CheckSquare className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Text Styling */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHighlight().run()}
                            isActive={editor.isActive('highlight')}
                            title="Highlight">
                            <Highlighter className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleSubscript().run()}
                            isActive={editor.isActive('subscript')}
                            title="Subscript">
                            <SubscriptIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleSuperscript().run()}
                            isActive={editor.isActive('superscript')}
                            title="Superscript">
                            <SuperscriptIcon className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Block Formatting */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            isActive={editor.isActive('blockquote')}
                            title="Blockquote">
                            <Quote className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            title="Horizontal Rule">
                            <Minus className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Table */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() =>
                                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                            }
                            isActive={editor.isActive('table')}
                            title="Insert Table">
                            <TableIcon className="h-4 w-4" />
                        </ToolbarButton>
                        {editor.isActive('table') && (
                            <>
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().addColumnBefore().run()}
                                    title="Add Column Before">
                                    <Columns className="h-4 w-4" />
                                </ToolbarButton>
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().addRowBefore().run()}
                                    title="Add Row Before">
                                    <Rows className="h-4 w-4" />
                                </ToolbarButton>
                                <ToolbarButton
                                    onClick={() => editor.chain().focus().deleteTable().run()}
                                    title="Delete Table">
                                    <TableProperties className="h-4 w-4" />
                                </ToolbarButton>
                            </>
                        )}
                    </div>

                    {/* Media & Links */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <div className="relative" ref={linkInputRef}>
                            <ToolbarButton
                                onClick={() => setShowLinkInput(!showLinkInput)}
                                isActive={editor.isActive('link')}
                                title="Add Link">
                                <LinkIcon className="h-4 w-4" />
                            </ToolbarButton>
                            {showLinkInput && (
                                <div className="absolute top-full left-0 mt-1 p-2 bg-popover border border-border rounded-md shadow-lg z-100 min-w-50">
                                    <div className="flex gap-1">
                                        <input
                                            type="url"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="Enter URL"
                                            className="flex-1 px-2 py-1 text-sm border border-border rounded"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    setLink();
                                                }
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setShowLinkInput(false);
                                                    setLinkUrl('');
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setShowLinkInput(false);
                                                    setLinkUrl('');
                                                }, 200);
                                            }}
                                            autoFocus
                                        />
                                        <Button size="sm" onClick={setLink} type="button">
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <ToolbarButton onClick={addImage} title="Add Image">
                            <ImageIcon className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <div className="relative" ref={colorPickerRef}>
                            <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
                                <Palette className="h-4 w-4" />
                            </ToolbarButton>
                            {showColorPicker && (
                                <div className="absolute top-full left-0 mt-1 p-2 bg-popover border border-border rounded-md shadow-lg z-100">
                                    <div className="grid grid-cols-4 gap-1">
                                        {colorOptions.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                    editor.chain().focus().setColor(color).run();
                                                    setShowColorPicker(false);
                                                }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            editor.chain().focus().unsetColor().run();
                                            setShowColorPicker(false);
                                        }}
                                        className="w-full mt-2 text-xs">
                                        Clear Color
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1 pr-2 border-r border-border">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo() || isDeveloperMode}
                            title="Undo">
                            <Undo className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo() || isDeveloperMode}
                            title="Redo">
                            <Redo className="h-4 w-4" />
                        </ToolbarButton>
                    </div>

                    {/* Developer Mode Toggle */}
                    <div className="flex items-center gap-1">
                        <ToolbarButton
                            onClick={toggleDeveloperMode}
                            isActive={isDeveloperMode}
                            title={isDeveloperMode ? 'Switch to Rich Text Editor' : 'Switch to HTML Editor'}>
                            <FileCode className="h-4 w-4" />
                        </ToolbarButton>

                        {/* AI Generate Button */}
                        {aiEnabled && aiModels.length > 0 && (
                            <ToolbarButton
                                onClick={handleGenerateButtonClick}
                                title="Generate with AI"
                                disabled={isGenerating}>
                                {isGenerating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                            </ToolbarButton>
                        )}
                    </div>
                </div>

                {/* Editor Content */}
                <div className="relative" style={{ zIndex: 1 }}>
                    {isDeveloperMode ? (
                        <div className="html-editor-wrapper">
                            {mounted && (
                                <CodeMirror
                                    value={htmlContent}
                                    height="330px"
                                    extensions={[html()]}
                                    theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                                    onChange={(value) => {
                                        setHtmlContent(value);
                                        onChange?.(value);
                                    }}
                                    basicSetup={{
                                        lineNumbers: true,
                                        highlightActiveLineGutter: true,
                                        highlightSpecialChars: true,
                                        foldGutter: true,
                                        drawSelection: true,
                                        dropCursor: true,
                                        allowMultipleSelections: true,
                                        indentOnInput: true,
                                        bracketMatching: true,
                                        closeBrackets: true,
                                        autocompletion: true,
                                        rectangularSelection: true,
                                        crosshairCursor: true,
                                        highlightActiveLine: true,
                                        highlightSelectionMatches: true,
                                        closeBracketsKeymap: true,
                                        searchKeymap: true,
                                        foldKeymap: true,
                                        completionKeymap: true,
                                        lintKeymap: true
                                    }}
                                    className="codemirror-html-editor"
                                    style={{ fontSize: '14px', minHeight: '330px', maxHeight: '330px' }}
                                />
                            )}
                        </div>
                    ) : (
                        <>
                            <EditorContent
                                editor={editor}
                                className="prose tiptap-editor-content max-w-none overflow-y-auto"
                                style={{ minHeight: '330px', maxHeight: '330px' }}
                            />
                            {!editor.getText() && (
                                <div
                                    className="absolute top-4 left-4 text-muted-foreground pointer-events-none"
                                    style={{ zIndex: 0 }}>
                                    {placeholder}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* AI Generate Dialog */}
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogContent className="sm:max-w-150">
                    <DialogHeader>
                        <DialogTitle>Generate Content with AI</DialogTitle>
                        <DialogDescription>
                            Describe what you want to generate and the AI will create content for you.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Model Selector */}
                        {aiModels.length > 1 && (
                            <div className="grid gap-2">
                                <Label htmlFor="ai-model">AI Model</Label>
                                <select
                                    id="ai-model"
                                    value={selectedAIModel}
                                    onChange={(e) => setSelectedAIModel(e.target.value)}
                                    disabled={isGenerating}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                    {aiModels.map((model) => (
                                        <option key={model.id} value={model.id}>
                                            {model.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Prompt Input */}
                        <div className="grid gap-2">
                            <Label htmlFor="prompt">What do you want to generate?</Label>
                            <Textarea
                                id="prompt"
                                value={generatePrompt}
                                onChange={(e) => setGeneratePrompt(e.target.value)}
                                placeholder="e.g., Write a product description for CBD oil that highlights its benefits..."
                                className="min-h-30"
                                disabled={isGenerating}
                            />
                        </div>

                        {/* Language Selector - only show if multiple languages available and no language prop set */}
                        {!language && availableLanguages.length > 1 && (
                            <div className="w-full sm:max-w-50 flex flex-col gap-2">
                                <Label htmlFor="ai-language">Language</Label>
                                <LanguageSelector
                                    languages={availableLanguages}
                                    value={selectedLanguage}
                                    onChange={(languageId) => setSelectedLanguage(languageId)}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowGenerateDialog(false);
                                setGeneratePrompt('');
                            }}
                            disabled={isGenerating}>
                            Cancel
                        </Button>
                        <Button onClick={handleGenerate} disabled={isGenerating || !generatePrompt.trim()}>
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default RichTextEditor;

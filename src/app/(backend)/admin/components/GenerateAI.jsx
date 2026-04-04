'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAdminSettings } from '../context/LayoutProvider';
import { getAISettings, getAllAIModels, executeAIModel } from '@/lib/server/ai';
import { formatAvailableLanguages } from '@/lib/i18n';

// Server actions to wrap AI functions
async function loadAISettingsAction() { 
    try {
        const result = await getAISettings();
        return result;
    } catch (error) {
        console.error('Error in loadAISettingsAction:', error);
        return {
            success: false,
            error: error.message || 'Failed to load AI settings',
            data: null
        };
    }
}

async function loadAIModelsAction(params = {}) { 
    try {
        const result = await getAllAIModels(params);
        return result;
    } catch (error) {
        console.error('Error in loadAIModelsAction:', error);
        return {
            success: false,
            error: error.message || 'Failed to load AI models',
            data: []
        };
    }
}

async function executeAIAction(modelId, params) { 
    try {
        const result = await executeAIModel(modelId, params);
        return result;
    } catch (error) {
        console.error('Error in executeAIAction:', error);
        return {
            success: false,
            error: error.message || 'Failed to execute AI model',
            data: null
        };
    }
}

// Default instructions for different types
const TYPE_INSTRUCTIONS = {
    default: '',
    code: `Generate clean, well-formatted HTML code. Use ONLY these HTML elements: <h1>, <h2>, <h3>, <h4>, <h5>, <h6> for headings, <p> for paragraphs, <strong> for bold, <em> for italics, <u> for underline, <s> for strikethrough, <a href="..."> for links, <ul> and <ol> with <li> for lists, <blockquote> for quotes, <table>, <tr>, <th>, <td> for tables, <mark> for highlights, <sup> for superscript, <sub> for subscript. Use inline styles for colors like <span style="color: #3B82F6">text</span>. Make it visually appealing with proper spacing and formatting. Return ONLY the HTML code without any markdown or code blocks.`
};

// Default placeholders for different types
const DEFAULT_PLACEHOLDERS = {
    default: 'Eg: Write a product description for organic oil..',
    code: 'Eg: Create a newsletter section about new products..'
};

const GenerateAI = ({
    instructions = '',
    lang = '',
    placeholder = '',
    model = '',
    allowCode = false,
    onGenerated,
    className = '',
    variant = 'outline',
    size = 'sm',
    title = 'Generate'
}) => {
    const { siteSettings } = useAdminSettings();
    
    // Dialog and generation states
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [generatePrompt, setGeneratePrompt] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // AI configuration states
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiModels, setAiModels] = useState([]);
    const [selectedAIModel, setSelectedAIModel] = useState('');

    // Merge and deduplicate languages from site settings
    const availableLanguages = useMemo(() => {
        const allLanguages = [
            ...(siteSettings?.languages || []),
            ...(siteSettings?.adminLanguages || [])
        ];
        return [...new Set(allLanguages)].filter(Boolean);
    }, [siteSettings]);

    // Format languages with display names and flags using i18n
    const formattedLanguages = useMemo(() => {
        return formatAvailableLanguages(availableLanguages);
    }, [availableLanguages]);

    // Helper function to get language display name using i18n
    const getLanguageName = (code) => {
        const language = formattedLanguages.find(lang => lang.code === code);
        return language?.name || code.toUpperCase();
    };

    // Helper function to get country flag emoji using i18n
    const getCountryFlag = (code) => {
        const language = formattedLanguages.find(lang => lang.code === code);
        return language?.flag || '🌐';
    };

    // Determine if language selector should be shown
    const showLanguageSelector = !lang && availableLanguages.length > 1;

    // Initialize language from prop or set default
    useEffect(() => {
        if (lang) {
            setSelectedLanguage(lang);
        } else if (availableLanguages.length === 1) {
            setSelectedLanguage(availableLanguages[0]);
        } else {
            const defaultLang = siteSettings?.language || siteSettings?.adminLanguage || 'en';
            setSelectedLanguage(defaultLang);
        }
    }, [lang, availableLanguages, siteSettings]);

    // Load AI settings and models on mount
    useEffect(() => {
        const loadAISettings = async () => {
            try {
                // Use server action instead of fetch
                const settingsResult = await loadAISettingsAction();
                
                if (!settingsResult.success) {
                    throw new Error(settingsResult.error || 'Failed to fetch AI settings');
                }
                
                const settings = settingsResult.data;
                setAiEnabled(settings?.enabled || false);

                if (settings?.enabled) {
                    // Use server action for models
                    const modelsResult = await loadAIModelsAction({ enabledOnly: true });
                    
                    if (modelsResult.success && modelsResult.data) {
                        const models = modelsResult.data;
                        setAiModels(models || []);
                        if (models?.length > 0) {
                            setSelectedAIModel(models[0].id);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading AI settings:', error);
                setAiEnabled(false);
                setAiModels([]);
            }
        };

        loadAISettings();
    }, []);

    // Build final instructions for AI
    const getFinalInstructions = () => {
        let finalInstructions = instructions || '';
        
        // Add type-specific instructions for code generation
        if (allowCode && TYPE_INSTRUCTIONS['code']) {
            finalInstructions = finalInstructions 
                ? `${finalInstructions}\n\n${TYPE_INSTRUCTIONS['code']}` 
                : TYPE_INSTRUCTIONS['code'];
        }
        
        // Add language specification if available
        if (selectedLanguage && selectedLanguage !== 'en') {
            const languageName = getLanguageName(selectedLanguage);
            finalInstructions += finalInstructions 
                ? `\n\nGenerate the content in ${languageName} language.`
                : `Generate the content in ${languageName} language.`;
        }
        
        return finalInstructions;
    };

    // Handle AI generation
    const handleGenerate = async () => {
        if (!generatePrompt.trim()) {
            toast.error('Please enter a prompt to generate content');
            return;
        }

        if (!selectedAIModel) {
            toast.error('No AI model selected');
            return;
        }

        setIsGenerating(true);

        try {
            // Build the final prompt with instructions and user input
            const finalInstructions = getFinalInstructions();
            const fullPrompt = finalInstructions 
                ? `${finalInstructions}\n\nUser Request: ${generatePrompt}`
                : generatePrompt;

            // Use server action instead of fetch
            const result = await executeAIAction(selectedAIModel, {
                prompt: fullPrompt,
                temperature: 0.7,
                max_tokens: 2000
            });

            if (!result.success) {
                throw new Error(result.error || 'AI generation failed');
            }

            // Extract content from AI response
            let generatedContent = '';
            if (result.data?.output) {
                generatedContent = Array.isArray(result.data.output) 
                    ? result.data.output.join('') 
                    : result.data.output;
            }

            if (!generatedContent) {
                throw new Error('No content generated');
            }

            // Success - close dialog and return content
            toast.success('Content generated successfully!');
            setShowGenerateDialog(false);
            setGeneratePrompt('');
            
            // Call the callback with generated content
            if (onGenerated) {
                onGenerated(generatedContent);
            }

        } catch (error) {
            console.error('AI Generation Error:', error);
            toast.error(error.message || 'Failed to generate content');
        } finally {
            setIsGenerating(false);
        }
    };

    // Don't render if AI is not enabled
    if (!aiEnabled) {
        return null;
    }

    return (
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant={variant}
                    size={size}
                    className={className}
                    disabled={!aiEnabled || aiModels.length === 0}
                >
                    <Sparkles className="w-4 h-4" />
                    {title}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        AI Content Generation
                    </DialogTitle>
                    <DialogDescription>
                        Use AI to generate content based on your prompt.
                        {instructions && (
                            <span className="block mt-1 text-sm text-muted-foreground">
                                Custom instructions will be applied automatically.
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Language Selector - Only show if needed */}
                    {showLanguageSelector && (
                        <div>
                            <Label htmlFor="language-select">Language</Label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger id="language-select">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {formattedLanguages.map((lang) => (
                                        <SelectItem key={lang.code} value={lang.code}>
                                            <span className="flex items-center gap-2">
                                                <span>{lang.flag}</span>
                                                <span>{lang.name}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* AI Model Selector */}
                    <div>
                        <Label htmlFor="model-select">AI Model</Label>
                        <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                            <SelectTrigger id="model-select" >
                                <SelectValue placeholder="Select AI model" />
                            </SelectTrigger>
                            <SelectContent>
                                {aiModels.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        <div className="relative w-full flex flex-col items-start">
                                            <div className="w-full inline-flex gap-2 items-center justify-start">
                                                <span>{model.name}</span>
                                                <span>
                                                    {model.modelType && 
                                                    <Badge size="sm" className="text-[0.65rem] uppercase font-semibold">
                                                        {model.modelType}
                                                    </Badge>
                                                    }
                                                </span>
                                            </div>
                                            {model.description && (
                                                <span className="text-xs text-muted-foreground">
                                                    {model.description}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Prompt Input */}
                    <div>
                        <Label htmlFor="prompt-input">Prompt</Label>
                        <Textarea
                            id="prompt-input"
                            value={generatePrompt}
                            onChange={(e) => setGeneratePrompt(e.target.value)}
                            placeholder={placeholder || DEFAULT_PLACEHOLDERS[allowCode ? 'code' : 'default'] || DEFAULT_PLACEHOLDERS.default}
                            rows={4}
                            className="mt-1"
                        />
                    </div>

                    {/* Generation Info */}
                    <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                                <p>
                                    <strong>Type:</strong> {allowCode ? 'Code' : 'Text Content'}
                                </p>
                                {selectedLanguage && selectedLanguage !== 'en' && (
                                    <p>
                                        <strong>Language:</strong> {getLanguageName(selectedLanguage)}
                                    </p>
                                )}
                                {instructions && (
                                    <p className="mt-1">
                                        <strong>Custom Instructions:</strong> Applied automatically
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowGenerateDialog(false)}
                            disabled={isGenerating}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || !generatePrompt.trim() || !selectedAIModel}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GenerateAI;
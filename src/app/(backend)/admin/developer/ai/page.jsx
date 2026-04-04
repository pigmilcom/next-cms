// @/app/(backend)/admin/developer/ai/page.jsx

'use client';

import { ChevronDown, ChevronLeft, ChevronRight, Edit, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminHeader from '@/app/(backend)/admin/components/AdminHeader';
import AdminTable from '@/app/(backend)/admin/components/AdminTable';
import { useAdminSettings } from '@/app/(backend)/admin/context/LayoutProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    createAIModel,
    deleteAIModel,
    generateAIInstructions,
    getAISettings,
    getAllAIModels,
    updateAIModel,
    updateAISettings
} from '@/lib/server/ai';

export default function AIAgentPage() {
    const { siteSettings } = useAdminSettings();
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatingInstructions, setGeneratingInstructions] = useState(false);

    // Get AI enabled status and API key from siteSettings
    const aiEnabled = siteSettings?.aiEnabled || false;
    const replicateApiKey = siteSettings?.replicateApiKey || '';

    // Training configuration state
    const [systemPrompt, setSystemPrompt] = useState('');
    const [tone, setTone] = useState('');
    const [context, setContext] = useState('');
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [isTrainingOpen, setIsTrainingOpen] = useState(false);

    // Template carousel state
    const [currentTemplatePage, setCurrentTemplatePage] = useState(0);

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

    // Merge and deduplicate languages from site settings
    const availableLanguages = useMemo(() => {
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

    const [models, setModels] = useState([]);
    const [showDialog, setShowDialog] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [form, setForm] = useState({
        name: '',
        modelId: '',
        description: '',
        modelType: 'text',
        enabled: true,
        config: {
            prompt: '',
            temperature: 0.7,
            max_tokens: 500
        }
    });

    // Common Replicate model templates - most popular and cost-effective models
    const modelTemplates = [
        // Text Generation Models - Cost-Effective Options
        {
            name: 'GPT-4.1 Nano',
            modelId: 'openai/gpt-4.1-nano',
            description: 'Fastest, most cost-effective GPT-4.1 model from OpenAI',
            modelType: 'text',
            config: { prompt: '', temperature: 0.7, max_tokens: 1000, top_p: 1 }
        },
        {
            name: 'Meta Llama 3.1 8B Instruct',
            modelId: 'meta/meta-llama-3.1-8b-instruct',
            description: 'Cost-effective Llama model with strong performance',
            modelType: 'text',
            config: { prompt: '', temperature: 0.7, max_tokens: 2048, top_p: 0.9, top_k: 50 }
        },
        {
            name: 'Mistral 7B Instruct v0.2',
            modelId: 'mistralai/mistral-7b-instruct-v0.2',
            description: 'Efficient 7B parameter model for general tasks',
            modelType: 'text',
            config: { prompt: '', temperature: 0.7, max_tokens: 1024, top_p: 1, top_k: 50 }
        },
        {
            name: 'Phi-3 Medium',
            modelId: 'microsoft/phi-3-medium-128k-instruct',
            description: "Microsoft's efficient model with 128K context",
            modelType: 'text',
            config: { prompt: '', temperature: 0.7, max_tokens: 1024, top_p: 0.95 }
        },
        {
            name: 'Gemma 2 9B',
            modelId: 'google-deepmind/gemma-2-9b-it',
            description: "Google's lightweight but powerful model",
            modelType: 'text',
            config: { prompt: '', temperature: 0.7, max_tokens: 1024, top_p: 1, top_k: 40 }
        },
        // Image Generation Models - Popular & Cost-Effective
        {
            name: 'Stable Diffusion XL',
            modelId: 'stability-ai/sdxl',
            description: 'Industry-standard high-quality image generation',
            modelType: 'image',
            config: { prompt: '', width: 1024, height: 1024, num_inference_steps: 25, guidance_scale: 7.5 }
        },
        {
            name: 'Flux Schnell',
            modelId: 'black-forest-labs/flux-schnell',
            description: 'Fast and cost-effective image generation',
            modelType: 'image',
            config: { prompt: '', width: 1024, height: 1024, num_inference_steps: 4, go_fast: true }
        },
        {
            name: 'Stable Diffusion 3',
            modelId: 'stability-ai/stable-diffusion-3',
            description: 'Latest SD3 with improved text rendering',
            modelType: 'image',
            config: { prompt: '', aspect_ratio: '1:1', num_inference_steps: 28, guidance_scale: 7 }
        },
        {
            name: 'Juggernaut XL v9',
            modelId: 'lucataco/juggernaut-xl-v9',
            description: 'Popular community model for realistic images',
            modelType: 'image',
            config: { prompt: '', width: 1024, height: 1024, num_inference_steps: 30, guidance_scale: 8 }
        },
        {
            name: 'RealVisXL V4.0',
            modelId: 'lucataco/realvisxl-v4.0',
            description: 'Photorealistic portraits and scenes',
            modelType: 'image',
            config: { prompt: '', width: 1024, height: 1024, num_inference_steps: 25, guidance_scale: 7 }
        },
        // Audio Models - Essential Tools
        {
            name: 'Whisper Large V3',
            modelId: 'openai/whisper-large-v3',
            description: 'Best-in-class speech recognition (multilingual)',
            modelType: 'audio',
            config: { audio: '', language: 'en', task: 'transcribe', temperature: 0 }
        },
        {
            name: 'Whisper V3 Turbo',
            modelId: 'openai/whisper-large-v3-turbo',
            description: 'Faster, cost-effective speech recognition',
            modelType: 'audio',
            config: { audio: '', language: 'en', task: 'transcribe', temperature: 0 }
        },
        {
            name: 'MusicGen',
            modelId: 'meta/musicgen',
            description: 'Generate music from text descriptions',
            modelType: 'audio',
            config: { prompt: '', duration: 8, temperature: 1, top_k: 250, top_p: 0, model_version: 'stereo-large' }
        },
        {
            name: 'Bark',
            modelId: 'suno-ai/bark',
            description: 'Realistic text-to-speech with emotions',
            modelType: 'audio',
            config: { prompt: '', text_temp: 0.7, waveform_temp: 0.7 }
        },
        // Video Generation Models - Cost-Effective Options
        {
            name: 'Stable Video Diffusion',
            modelId: 'stability-ai/stable-video-diffusion',
            description: 'Image-to-video generation (industry standard)',
            modelType: 'video',
            config: { image: '', num_frames: 14, fps: 6, motion_bucket_id: 127, cond_aug: 0.02 }
        },
        {
            name: 'AnimateDiff Lightning',
            modelId: 'lucataco/animate-diff-lightning-4-step',
            description: 'Ultra-fast video generation (4 steps)',
            modelType: 'video',
            config: { prompt: '', num_frames: 16, fps: 8, num_inference_steps: 4 }
        },
        {
            name: 'Zeroscope V2 XL',
            modelId: 'anotherjesse/zeroscope-v2-xl',
            description: 'Cost-effective text-to-video generation',
            modelType: 'video',
            config: { prompt: '', num_frames: 24, fps: 8, num_inference_steps: 50 }
        },
        {
            name: 'Text2Video-Zero',
            modelId: 'cjwbw/text2video-zero',
            description: 'Zero-shot text-to-video generation',
            modelType: 'video',
            config: { prompt: '', video_length: 8, fps: 4, num_inference_steps: 50 }
        },
        // Mixed/Multi-Modal Models - Vision Understanding
        {
            name: 'LLaVA v1.6 34B',
            modelId: 'yorickvp/llava-v1.6-34b',
            description: 'Powerful open-source vision-language model',
            modelType: 'mixed',
            config: { image: '', prompt: '', temperature: 0.2, max_tokens: 1024, top_p: 1 }
        },
        {
            name: 'Moondream2',
            modelId: 'lucataco/moondream2',
            description: 'Ultra-efficient vision model (1.8B params)',
            modelType: 'mixed',
            config: { image: '', prompt: '', max_tokens: 512 }
        },
        {
            name: 'BLIP-2',
            modelId: 'salesforce/blip-2',
            description: 'Efficient image captioning and Q&A',
            modelType: 'mixed',
            config: { image: '', prompt: '', temperature: 1, max_length: 50 }
        },
        {
            name: 'CogVLM',
            modelId: 'lucataco/cogvlm',
            description: 'Visual language model for detailed analysis',
            modelType: 'mixed',
            config: { image: '', prompt: '', temperature: 0.8, max_tokens: 512, top_p: 0.9 }
        }
    ];

    const loadSettings = async () => {
        setSettingsLoading(true);
        try {
            const result = await getAISettings();
            if (result.success && result.data) {
                setSystemPrompt(result.data.systemPrompt || '');
                setTone(result.data.tone || '');
                setContext(result.data.context || '');
                setAdditionalInstructions(result.data.additionalInstructions || '');
            }
        } catch (err) {
            console.error('Error loading AI settings:', err);
            toast.error('Failed to load AI settings');
        } finally {
            setSettingsLoading(false);
        }
    };

    const saveSettings = async () => {
        setSettingsLoading(true);
        try {
            const result = await updateAISettings({
                systemPrompt,
                tone,
                context,
                additionalInstructions
            });

            if (result.success) {
                toast.success('Settings saved successfully');
                if (aiEnabled) loadModels();
            } else {
                toast.error(result.error || 'Failed to save settings');
            }
        } catch (err) {
            console.error('Error saving settings:', err);
            toast.error('Failed to save settings');
        } finally {
            setSettingsLoading(false);
        }
    };

    const loadModels = async () => {
        setModelsLoading(true);
        setModels([]); // Reset to empty array at start
        try {
            const result = await getAllAIModels();
            if (result && result.success && Array.isArray(result.data)) {
                setModels(result.data);
            } else if (result && result.success) {
                setModels([]);
            } else {
                console.error('Error loading models:', result?.error || 'Unknown error');
                setModels([]);
                toast.error(result?.error || 'Failed to load models');
            }
        } catch (err) {
            console.error('Error loading models:', err);
            setModels([]);
            toast.error('Failed to load models');
        } finally {
            setModelsLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
        loadModels();
    }, []);

    const openCreateDialog = () => {
        setEditingModel(null);
        setForm({
            name: '',
            modelId: '',
            description: '',
            modelType: 'text',
            enabled: true,
            config: {
                prompt: '',
                temperature: 0.7,
                max_tokens: 500
            }
        });
        setShowDialog(true);
    };

    const openEditDialog = (model) => {
        setEditingModel(model);
        setForm({
            name: model.name || '',
            modelId: model.modelId || '',
            description: model.description || '',
            modelType: model.modelType || 'text',
            enabled: !!model.enabled,
            config: model.config || {}
        });
        setShowDialog(true);
    };

    const applyTemplate = (template) => {
        setForm((prev) => ({
            ...prev,
            name: template.name,
            modelId: template.modelId,
            description: template.description,
            modelType: template.modelType || 'text',
            config: template.config
        }));
    };

    const submitModel = async () => {
        if (!form.name || !form.modelId) {
            return toast.error('Name and model ID are required');
        }

        setIsSubmitting(true);
        try {
            let result;
            if (editingModel) {
                const modelId = editingModel.id || editingModel.key || editingModel._id;
                result = await updateAIModel(modelId, form);
            } else {
                result = await createAIModel(form);
            }

            if (result.success) {
                toast.success(editingModel ? 'Model updated' : 'Model created');
                setShowDialog(false);
                loadModels();
            } else {
                toast.error(result.error || 'Failed to save model');
            }
        } catch (err) {
            console.error('Error saving model:', err);
            toast.error('Failed to save model');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteModel = async (model) => {
        if (!confirm(`Are you sure you want to delete "${model.name}"?`)) {
            return;
        }

        try {
            const modelId = model.id || model.key || model._id;
            const result = await deleteAIModel(modelId);

            if (result.success) {
                toast.success('Model deleted');
                loadModels();
            } else {
                toast.error(result.error || 'Failed to delete model');
            }
        } catch (err) {
            console.error('Error deleting model:', err);
            toast.error('Failed to delete model');
        }
    };

    const handleAutoGenerateInstructions = async () => {
        setGeneratingInstructions(true);
        try {
            const result = await generateAIInstructions();

            if (result.success) {
                const data = result.data;
                setSystemPrompt(data.systemPrompt || '');
                setTone(data.tone || '');
                setContext(data.context || '');
                setAdditionalInstructions(data.additionalInstructions || '');
                toast.success('AI instructions generated successfully from your site settings!');
            } else {
                toast.error(result.error || 'Failed to generate instructions');
            }
        } catch (error) {
            console.error('Error generating instructions:', error);
            toast.error('Failed to generate instructions');
        } finally {
            setGeneratingInstructions(false);
        }
    };

    return (
        <div className="space-y-6">
            <AdminHeader title="AI Agent" description="Manage AI models and training configuration">
                <Button onClick={() => setShowDialog(true)} disabled={!aiEnabled || !replicateApiKey}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Model
                </Button>
            </AdminHeader>

            {/* Show message if AI is disabled */}
            {(!aiEnabled || !replicateApiKey) && (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground mb-4">
                                AI Agent is disabled or not configured. Please enable it and add your Replicate API key in{' '}
                                <a href="/admin/system/settings" className="text-primary hover:underline">
                                    System Settings → AI
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* AI Training Configuration Card */}
            {aiEnabled && replicateApiKey && (
                <Card>
                    <CardHeader>
                        <CardTitle>AI Training Configuration</CardTitle>
                        <CardDescription>
                            Configure global instructions that will be automatically included with every AI model request
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Collapsible open={isTrainingOpen} onOpenChange={setIsTrainingOpen}>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" className="w-full justify-between mb-4">
                                    <span>{isTrainingOpen ? 'Hide' : 'Show'} Training Configuration</span>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${
                                            isTrainingOpen ? 'transform rotate-180' : ''
                                        }`}
                                    />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4">
                                <div>
                                    <Label>System Instructions</Label>
                                    <Textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        placeholder="e.g., You are a helpful AI assistant for an e-commerce platform..."
                                        className="min-h-25"
                                        disabled={settingsLoading}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Main instructions that define the AI's role and behavior
                                    </p>
                                </div>

                                <div>
                                    <Label>Tone</Label>
                                    <Input
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value)}
                                        placeholder="e.g., Professional, friendly, casual, formal..."
                                        disabled={settingsLoading}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Desired tone for AI responses
                                    </p>
                                </div>

                                <div>
                                    <Label>Business Context</Label>
                                    <Textarea
                                        value={context}
                                        onChange={(e) => setContext(e.target.value)}
                                        placeholder="e.g., Company name, industry, products, target audience..."
                                        className="min-h-25"
                                        disabled={settingsLoading}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Business information and context for the AI to understand
                                    </p>
                                </div>

                                <div>
                                    <Label>Additional Instructions</Label>
                                    <Textarea
                                        value={additionalInstructions}
                                        onChange={(e) => setAdditionalInstructions(e.target.value)}
                                        placeholder="e.g., Brand guidelines, restrictions, special requirements..."
                                        className="min-h-25"
                                        disabled={settingsLoading}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Any other custom instructions or guidelines
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button onClick={saveSettings} disabled={settingsLoading || generatingInstructions}>
                                        {settingsLoading ? 'Saving...' : 'Save Training Configuration'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleAutoGenerateInstructions}
                                        disabled={settingsLoading || generatingInstructions}>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        {generatingInstructions ? 'Generating...' : 'Auto-Generate'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSystemPrompt('');
                                            setTone('');
                                            setContext('');
                                            setAdditionalInstructions('');
                                        }}
                                        disabled={settingsLoading || generatingInstructions}>
                                        Clear All
                                    </Button>
                                </div>

                                <div className="border-l-4 border-blue-500 pl-4 mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Note:</strong> These training instructions will be automatically
                                        prepended to every AI model request. This ensures consistent behavior
                                        across all AI interactions.
                                    </p>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </CardContent>
                </Card>
            )}

            {/* Models Section */}
            {!aiEnabled || !replicateApiKey ? null : (
                <Card>
                    <CardHeader>
                        <CardTitle>AI Models ({(models && models.length) || 0})</CardTitle>
                        <CardDescription>
                            Manage your Replicate AI models. Each model can be called from anywhere in your code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AdminTable
                            data={models || []}
                            loading={modelsLoading}
                            columns={[
                                {
                                    key: 'name',
                                    label: 'Name',
                                    sortable: true,
                                    render: (model) => (
                                        <div>
                                            <div className="font-medium">{model.name}</div>
                                            {model.description && (
                                                <div className="text-sm text-muted-foreground">{model.description}</div>
                                            )}
                                        </div>
                                    )
                                },
                                {
                                    key: 'modelId',
                                    label: 'Replicate Model ID',
                                    sortable: true,
                                    render: (model) => (
                                        <code className="text-sm bg-muted px-2 py-1 rounded">{model.modelId}</code>
                                    )
                                },
                                {
                                    key: 'enabled',
                                    label: 'Status',
                                    sortable: true,
                                    render: (model) => (
                                        <Badge variant={model.enabled ? 'default' : 'secondary'}>
                                            {model.enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    )
                                },
                                {
                                    key: 'createdAt',
                                    label: 'Created',
                                    sortable: true,
                                    render: (model) => (
                                        <span className="text-muted-foreground">
                                            {new Date(model.createdAt).toLocaleDateString()}
                                        </span>
                                    )
                                }
                            ]}
                            getRowActions={(model) => [
                                {
                                    label: 'Edit',
                                    icon: <Edit className="mr-2 h-4 w-4" />,
                                    onClick: () => openEditDialog(model)
                                },
                                {
                                    label: 'Delete',
                                    icon: <Trash2 className="mr-2 h-4 w-4" />,
                                    onClick: () => deleteModel(model),
                                    className: 'text-destructive focus:text-destructive'
                                }
                            ]}
                            searchPlaceholder="Search models by name or ID..."
                            emptyMessage="No AI models configured. Add your first model to get started."
                            enablePagination={(models && models.length > 10) || false}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Model Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingModel ? 'Edit AI Model' : 'Add AI Model'}</DialogTitle>
                        <DialogDescription>
                            Configure a Replicate model with default parameters. You can override these when calling the
                            model.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6">
                        {/* Model Templates Carousel */}
                        {!editingModel &&
                            (() => {
                                const itemsPerPage = 4;
                                const totalPages = Math.ceil(modelTemplates.length / itemsPerPage);
                                const startIndex = currentTemplatePage * itemsPerPage;
                                const endIndex = startIndex + itemsPerPage;
                                const currentTemplates = modelTemplates.slice(startIndex, endIndex);
                                const formatModelType = (type) => type.charAt(0).toUpperCase() + type.slice(1);

                                return (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <Label className="text-base font-medium">Quick Templates</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Choose a template to get started quickly ({modelTemplates.length}{' '}
                                                    models available)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            {/* Navigation Buttons */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        setCurrentTemplatePage((prev) => Math.max(0, prev - 1))
                                                    }
                                                    disabled={currentTemplatePage === 0}
                                                    className="h-8 w-8 rounded-full shadow-md">
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        setCurrentTemplatePage((prev) =>
                                                            Math.min(totalPages - 1, prev + 1)
                                                        )
                                                    }
                                                    disabled={currentTemplatePage === totalPages - 1}
                                                    className="h-8 w-8 rounded-full shadow-md">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Templates Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {currentTemplates.map((template) => (
                                                    <Button
                                                        key={template.modelId}
                                                        variant="outline"
                                                        className="h-auto p-3 text-left justify-start items-start whitespace-break-spaces relative"
                                                        onClick={() => applyTemplate(template)}>
                                                        <div className="w-full">
                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                <div className="font-medium text-sm flex-1">
                                                                    {template.name}
                                                                </div>
                                                                <Badge variant="secondary" className="text-xs shrink-0">
                                                                    {formatModelType(template.modelType)}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground line-clamp-2">
                                                                {template.description}
                                                            </div>
                                                        </div>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Page Indicators */}
                                        <div className="flex items-center justify-center gap-2 mt-3">
                                            {Array.from({ length: totalPages }).map((_, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => setCurrentTemplatePage(index)}
                                                    className={`h-2 rounded-full transition-all ${
                                                        index === currentTemplatePage
                                                            ? 'w-6 bg-primary'
                                                            : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                                    }`}
                                                    aria-label={`Go to page ${index + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                        {/* Basic Information */}
                        <div className="grid gap-4">
                            <div>
                                <Label>Model Name *</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., My Image Generator"
                                />
                            </div>

                            <div>
                                <Label>Replicate Model ID *</Label>
                                <Input
                                    value={form.modelId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, modelId: e.target.value }))}
                                    placeholder="e.g., stability-ai/stable-diffusion-xl"
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    Find models at{' '}
                                    <a
                                        href="https://replicate.com/explore"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:no-underline">
                                        replicate.com/explore
                                    </a>
                                </p>
                            </div>

                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="What does this model do?"
                                />
                            </div>

                            <div>
                                <Label>Model Output Type</Label>
                                <Select
                                    value={form.modelType}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, modelType: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select output type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="audio">Audio</SelectItem>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="mixed">Mixed (Various outputs)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Select the type of output this model generates
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.enabled}
                                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
                                />
                                <Label>Enabled</Label>
                            </div>
                        </div>

                        {/* Default Configuration */}
                        <div>
                            <Label className="text-base font-medium">Default Configuration (JSON)</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                Set default parameters for this model. Users can override these when calling the model.
                            </p>
                            <Textarea
                                value={JSON.stringify(form.config, null, 2)}
                                onChange={(e) => {
                                    try {
                                        const config = JSON.parse(e.target.value);
                                        setForm((prev) => ({ ...prev, config }));
                                    } catch (err) {
                                        // Invalid JSON - don't update state but allow typing
                                    }
                                }}
                                placeholder={`{
  "prompt": "",
  "temperature": 0.7,
  "max_tokens": 500
}`}
                                className="font-mono text-sm min-h-30"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitModel} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : editingModel ? 'Update Model' : 'Create Model'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Usage Documentation */}
            <Card>
                <CardHeader>
                    <CardTitle>How to Use AI Models in Your Code</CardTitle>
                    <CardDescription>
                        Examples of how to call AI models from your frontend and backend code
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">1. From Server-Side Code (Recommended)</h4>
                        <div className="bg-muted p-4 rounded-md">
                            <pre className="text-sm overflow-x-auto">
                                <code>{`import { executeAIModel } from '@/lib/server/ai';

// Execute a model with custom parameters
const result = await executeAIModel('model_id', {
  prompt: 'Generate a beautiful sunset image',
  width: 1024,
  height: 768
});

if (result.success) {
  console.log('AI response:', result.data);
} else {
  console.error('Error:', result.error);
}`}</code>
                            </pre>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">2. From API Route or Server Action</h4>
                        <div className="bg-muted p-4 rounded-md">
                            <pre className="text-sm overflow-x-auto">
                                <code>{`// /app/api/my-ai-endpoint/route.js
import { executeAIModel } from '@/lib/server/ai';

export async function POST(req) {
  const { prompt } = await req.json();
  
  const result = await executeAIModel('your_model_id', {
    prompt: prompt,
    temperature: 0.8
  });
  
  return Response.json(result);
}`}</code>
                            </pre>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-2">3. Direct Model Execution with Replicate</h4>
                        <div className="bg-muted p-4 rounded-md">
                            <pre className="text-sm overflow-x-auto">
                                <code>{`import { useAIModel } from '@/lib/server/ai';

// Use a model directly with Replicate
const result = await useAIModel(
  'model_id',
  'Generate an image of a sunset',
  { width: 1024, height: 768 }
);

if (result.success) {
  console.log('Output:', result.data);
}`}</code>
                            </pre>
                        </div>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> Model execution happens asynchronously through Replicate. The
                            response includes a prediction ID that you can use to check status and get results.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

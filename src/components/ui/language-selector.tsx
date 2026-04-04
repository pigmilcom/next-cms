// @/components/ui/language-selector.tsx

'use client';
import { CheckIcon, ChevronDown, Languages, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { CircleFlag } from 'react-circle-flags';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/providers';
import { formatAvailableLanguages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
    languages?: Array<{ id: string; name: string; flag?: string; code?: string; countryCode?: string }>;
    onChange?: (languageId: string) => void;
    value?: string;
    slim?: boolean;
}

export function LanguageSelector({ languages, onChange, value, slim = false }: LanguageSelectorProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();
    const settingsContext = useSettings() as {
        siteSettings?: {
            languages?: string[];
            adminLanguages?: string[];
        } | null;
    };
    const siteSettings = settingsContext?.siteSettings;

    // Use language context if no languages prop is provided (admin mode)
    const { currentLanguage, availableLanguages, setCurrentLanguage, isLoading } = useLanguage();

    const routeSettingsLanguages = useMemo(() => {
        const isAdminRoute = pathname?.startsWith('/admin');
        const configured = isAdminRoute ? siteSettings?.adminLanguages : siteSettings?.languages;

        if (!Array.isArray(configured) || configured.length === 0) {
            return [];
        }

        return formatAvailableLanguages(configured);
    }, [pathname, siteSettings?.languages, siteSettings?.adminLanguages]);

    // Use provided languages or context languages
    const languageList =
        languages || (routeSettingsLanguages.length > 0 ? routeSettingsLanguages : availableLanguages);

    // Use the form value if provided, otherwise use context or current locale
    const selectedLanguageId = value || currentLanguage || currentLocale;
    const currentLanguageData = languageList.find((lang) => (lang.id || lang.code) === selectedLanguageId);

    const handleSelect = useCallback(
        (locale: string) => {
            setOpen(false);
            if (onChange) {
                // If onChange is provided (form mode), call it
                onChange(locale);
            } else {
                // Use context to change language (admin mode)
                setCurrentLanguage(locale);
            }
        },
        [onChange, setCurrentLanguage]
    );

    const triggerClasses = cn(
        'dark:bg-input/30 hover:bg-input/30 dark:hover:bg-input/50 flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        slim === true && 'w-16',
        isLoading && 'opacity-50 cursor-wait'
    );

    // Show loading state
    if (isLoading && !languages) {
        return (
            <div className={triggerClasses}>
                <Loader2 size={16} className="animate-spin" />
                {!slim && <span className="text-sm">Loading...</span>}
                <ChevronDown size={16} className="opacity-50" />
            </div>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={triggerClasses} disabled={isLoading}>
                <Languages size={16} />
                {!slim && (
                    <span className="text-sm ms-1">
                        {currentLanguageData ? currentLanguageData.name : 'Select language'}
                    </span>
                )}
                <ChevronDown size={16} />
            </PopoverTrigger>
            <PopoverContent
                collisionPadding={10}
                side="bottom"
                className="z-250 min-w-[--radix-popper-anchor-width] max-w-50 p-0">
                <Command>
                    <CommandList>
                        {/* <CommandInput placeholder="Search language..." /> */}
                        <CommandEmpty>No language found.</CommandEmpty>
                        <CommandGroup>
                            {languageList && languageList.length > 0 ? (
                                languageList.map((language) => {
                                    const languageId = language.id || language.code;
                                    if (!languageId) return null; // Skip languages without id or code
                                    return (
                                        <CommandItem
                                            key={languageId}
                                            className="flex items-center gap-2"
                                            onSelect={() => handleSelect(languageId)}>
                                            <div className="flex grow items-center gap-2">
                                                {language.countryCode ? (
                                                    <span className="inline-flex h-5 w-5 items-center justify-center">
                                                        <CircleFlag
                                                            countryCode={language.countryCode == 'BR' ? 'pt' : language.countryCode.toLowerCase()}
                                                            height={18}
                                                        />
                                                    </span>
                                                ) : (
                                                    language.flag && <span className="text-base">{language.flag}</span>
                                                )}
                                                <span>{language.name}</span>
                                            </div>
                                            <CheckIcon
                                                className={cn(
                                                    'ml-auto h-4 w-4',
                                                    languageId === selectedLanguageId ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                        </CommandItem>
                                    );
                                })
                            ) : (
                                <CommandItem disabled>
                                    <span className="text-muted-foreground">No languages available</span>
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// @/components/common/GooglePlacesInput.jsx

'use client';

import { Loader } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/context/providers';

// Global variables to track script loading state
let isGoogleMapsLoading = false;
let googleMapsLoadPromise = null;

const GooglePlacesInput = ({
    legacy = false,
    autoFocus = false,
    value,
    onChange,
    onPlaceSelected, // NEW: Callback for when a place is selected with full details
    onError,
    hasError,
    placeholder = 'Start typing your address...',
    styles = {},
    apiKey,
    countryRestriction = null // NEW: Country restriction for search results
}) => {
    const { siteSettings } = useSettings();
    const containerRef = useRef(null);
    const placeAutocompleteRef = useRef(null);
    const isLoadedRef = useRef(false);
    const addressInputRef = useRef(null);
    const [_isGoogleMapsEnabled, setIsGoogleMapsEnabled] = useState(false);
    const [_googleMapsApiKey, setGoogleMapsApiKey] = useState(apiKey || '');

    // Detect if device is mobile
    const isMobile = () => {
        if (typeof window === 'undefined') return false;
        return (
            window.innerWidth <= 768 &&
            /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        );
    };

    // Determine if legacy mode should be used
    const shouldUseLegacy = () => {
        if (legacy === 'mobile') {
            return isMobile();
        }
        return Boolean(legacy);
    };

    // Default styles using shadcn/ui design tokens
    const defaultStyles = {
        width: '100%',
        borderRadius: '8px', // rounded-lg equivalent
        height: '2.3rem', // h-10 equivalent
        padding: '0.5rem 0.75rem', // px-3 py-2 equivalent
        fontSize: '0.875rem', // text-sm equivalent, but use 16px on mobile to prevent zoom
        lineHeight: '1.25rem',
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        outline: 'none',
        fontFamily: 'inherit',
        ...styles // Override defaults with provided styles
    };

    // Prevent mobile zoom by managing viewport meta tag
    const preventMobileZoom = () => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute(
                'content',
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
            );
        }
    };

    const restoreMobileZoom = () => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
    };

    const initGooglePlaces = async () => {
        try {
            if (shouldUseLegacy()) {
                // Legacy implementation with google.maps.places.Autocomplete
                initLegacyAutocomplete();
            } else {
                // New implementation with PlaceAutocompleteElement
                await initNewAutocomplete();
            }
        } catch (error) {
            console.error('Error initializing Google Places:', error);
            createFallbackInput();
        }
    };

    const initLegacyAutocomplete = () => {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.error('Google Maps API not loaded');
            createFallbackInput();
            return;
        }

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.value = value || '';
        input.autofocus = Boolean(autoFocus);

        Object.assign(input.style, {
            ...defaultStyles,
            borderColor: hasError && 'hsl(var(--destructive))',
            fontSize: isMobile() ? '16px' : '0.875rem' // Prevent zoom on mobile
        });

        // Add mobile-specific attributes to prevent zoom
        input.setAttribute('autocomplete', 'address-line1');
        input.setAttribute('autocapitalize', 'words');
        input.setAttribute('autocorrect', 'on');

        // Store references
        addressInputRef.current = input;

        // Clear and append to container
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(input);
        }

        if (!autoFocus && document.activeElement === input) {
            input.blur();
        }

        // Initialize autocomplete with more detailed fields
        const autocompleteOptions = {
            fields: ['formatted_address', 'geometry', 'address_components', 'place_id', 'name']
        };

        // Add country restriction if provided
        if (countryRestriction) {
            autocompleteOptions.componentRestrictions = { country: countryRestriction.toLowerCase() };
        }

        const autocomplete = new window.google.maps.places.Autocomplete(input, autocompleteOptions);

        placeAutocompleteRef.current = autocomplete;

        // Handle place selection
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();

            if (place?.formatted_address) {
                input.value = place.formatted_address;

                // Call the regular onChange callback
                if (onChange) {
                    onChange(place.formatted_address);
                }

                // Call the new onPlaceSelected callback with full details
                if (onPlaceSelected) {
                    onPlaceSelected(place);
                }
            }
        });

        // Handle manual input changes
        input.addEventListener('input', (e) => {
            const inputValue = e.target.value;
            if (onChange) {
                onChange(inputValue);
            }
        });

        // Handle focus and blur events
        input.addEventListener('focus', () => {
            input.style.borderColor = 'hsl(var(--ring))';
            input.style.boxShadow = '0 0 0 2px hsl(var(--ring) / 0.2)';
            input.style.outline = 'none';
            preventMobileZoom();
        });

        input.addEventListener('blur', () => {
            input.style.borderColor = hasError && 'hsl(var(--destructive))';
            input.style.boxShadow = 'none';
            setTimeout(restoreMobileZoom, 100);
        });
    };

    const initNewAutocomplete = async () => {
        // Request the places library
        await window.google.maps.importLibrary('places');

        // Create the new PlaceAutocompleteElement
        const autocompleteOptions = {};

        // Add country restriction if provided
        if (countryRestriction) {
            autocompleteOptions.includedRegionCodes = [countryRestriction.toLowerCase()];
        }

        const placeAutocomplete = new window.google.maps.places.PlaceAutocompleteElement(autocompleteOptions);

        // Store reference for cleanup
        placeAutocompleteRef.current = placeAutocomplete;

        // Apply styles to the element
        Object.assign(placeAutocomplete.style, {
            ...defaultStyles,
            borderColor: hasError && 'hsl(var(--destructive))',
            fontSize: isMobile() ? '16px' : '0.875rem' // Prevent zoom on mobile
        });

        // Add mobile-specific attributes to prevent zoom
        placeAutocomplete.setAttribute('autocomplete', 'address-line1');
        placeAutocomplete.setAttribute('autocapitalize', 'words');
        placeAutocomplete.setAttribute('autocorrect', 'on');

        // Append the new element safely
        if (containerRef.current) {
            containerRef.current.innerHTML = ''; // Clear existing
            containerRef.current.appendChild(placeAutocomplete);
        }

        // Set initial value if provided
        if (value) {
            placeAutocomplete.value = value;
        }

        if (!autoFocus && typeof placeAutocomplete.blur === 'function') {
            placeAutocomplete.blur();
        }

        // Add the place selection listener
        placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
            try {
                const place = placePrediction.toPlace();

                // Fetch detailed fields including address components
                await place.fetchFields({
                    fields: ['formattedAddress', 'addressComponents', 'id', 'displayName']
                });

                const placeData = place.toJSON();
                const formattedAddress = placeData.formattedAddress;

                if (formattedAddress) {
                    // Update the visual value in the Google element
                    placeAutocomplete.value = formattedAddress;

                    // Call the regular onChange callback
                    if (onChange) {
                        onChange(formattedAddress);
                    }

                    // Call the new onPlaceSelected callback with full details
                    if (onPlaceSelected) {
                        // Convert modern format to legacy format for consistency
                        const legacyFormatPlace = {
                            formatted_address: placeData.formattedAddress,
                            place_id: placeData.id,
                            name: placeData.displayName,
                            address_components: placeData.addressComponents || []
                        };
                        onPlaceSelected(legacyFormatPlace);
                    }
                }
            } catch (error) {
                console.error('Error fetching place details:', error);
                if (onError) {
                    onError('Error fetching place details');
                }
            }
        });

        // Handle focus and blur events for styling and zoom prevention
        placeAutocomplete.addEventListener('focus', () => {
            placeAutocomplete.style.borderColor = 'hsl(var(--ring))';
            placeAutocomplete.style.boxShadow = '0 0 0 2px hsl(var(--ring) / 0.2)';
            placeAutocomplete.style.outline = 'none';
            preventMobileZoom();
        });

        placeAutocomplete.addEventListener('blur', () => {
            placeAutocomplete.style.borderColor = hasError && 'hsl(var(--destructive))';
            placeAutocomplete.style.boxShadow = 'none';
            setTimeout(restoreMobileZoom, 100);
        });

        // Handle manual input changes (when user types directly)
        placeAutocomplete.addEventListener('input', (e) => {
            const inputValue = e.target.value;
            if (onChange) {
                onChange(inputValue);
            }
        });
    };

    const createFallbackInput = () => {
        // Create fallback input
        const fallbackInput = document.createElement('input');
        fallbackInput.type = 'text';
        fallbackInput.placeholder = placeholder;
        fallbackInput.value = value || '';
        fallbackInput.autofocus = Boolean(autoFocus);

        Object.assign(fallbackInput.style, {
            ...defaultStyles,
            borderColor: hasError && 'hsl(var(--destructive))',
            fontSize: isMobile() ? '16px' : '0.875rem' // Prevent zoom on mobile
        });

        fallbackInput.classList.add('border');
        fallbackInput.classList.add('border');
        fallbackInput.classList.add('rounded');
        fallbackInput.classList.add('rounded-xl');

        // Add mobile-specific attributes to prevent zoom
        fallbackInput.setAttribute('autocomplete', 'address-line1');
        fallbackInput.setAttribute('autocapitalize', 'words');
        fallbackInput.setAttribute('autocorrect', 'on');

        fallbackInput.addEventListener('input', (e) => {
            if (onChange) {
                onChange(e.target.value);
            }
        });

        fallbackInput.addEventListener('focus', () => {
            fallbackInput.style.boxShadow = '0 0 0 2px hsl(var(--ring) / 0.2)';
            fallbackInput.style.outline = 'none';
            preventMobileZoom();
        });

        fallbackInput.addEventListener('blur', () => {
            fallbackInput.style.borderColor = hasError && 'hsl(var(--destructive))';
            fallbackInput.style.boxShadow = 'none';
            setTimeout(restoreMobileZoom, 100);
        });

        if (containerRef.current) {
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(fallbackInput);
        }

        if (!autoFocus && document.activeElement === fallbackInput) {
            fallbackInput.blur();
        }
    };

    // Legacy Google Maps Script
    const loadGoogleMapsScript = () => {
        // If already loaded, return resolved promise
        if (window.google?.maps?.places) {
            return Promise.resolve();
        }

        // If already loading, return existing promise
        if (isGoogleMapsLoading && googleMapsLoadPromise) {
            return googleMapsLoadPromise;
        }

        // Check if script already exists in DOM
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            return new Promise((resolve) => {
                if (window.google?.maps?.places) {
                    resolve();
                } else {
                    existingScript.onload = () => resolve();
                }
            });
        }

        // Create new script
        isGoogleMapsLoading = true;
        googleMapsLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${_googleMapsApiKey}&libraries=places`;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                isGoogleMapsLoading = false;
                resolve();
            };

            script.onerror = () => {
                isGoogleMapsLoading = false;
                reject(new Error('Failed to load Google Maps script'));
            };

            document.head.appendChild(script);
        });

        return googleMapsLoadPromise;
    };

    const loadGoogleMaps = async () => {
        // Check if Google Maps integration is enabled
        const googleMapsEnabled = siteSettings?.googleMapsEnabled && siteSettings?.googleMapsApiKey;
        const googleMapsApiKey = siteSettings?.googleMapsApiKey || apiKey;
        setIsGoogleMapsEnabled(googleMapsEnabled);
        setGoogleMapsApiKey(googleMapsApiKey);
        // If not enabled or no API key, use fallback
        if (!googleMapsEnabled || !googleMapsApiKey) {
            createFallbackInput();
            if (onError) {
                onError(googleMapsEnabled ? 'Google Maps API key not provided' : 'Google Maps integration not enabled');
            }
            return;
        }

        // Skip if already loaded and initialized
        if (isLoadedRef.current) {
            initGooglePlaces();
            return;
        }

        if (shouldUseLegacy()) {
            // Use legacy script loading
            loadGoogleMapsScript()
                .then(() => {
                    isLoadedRef.current = true;
                    initGooglePlaces();
                })
                .catch((err) => {
                    console.warn('Failed to load Google Maps:', err);
                    createFallbackInput();
                    if (onError) {
                        onError('Failed to load Google Maps');
                    }
                });
        } else {
            // Use modern loader
            const loader = new Loader({
                apiKey: _googleMapsApiKey,
                version: 'weekly',
                libraries: ['places']
            });

            loader
                .load()
                .then(() => {
                    isLoadedRef.current = true;
                    initGooglePlaces();
                })
                .catch((err) => {
                    console.warn('Failed to load Google Maps:', err);
                    createFallbackInput();
                    if (onError) {
                        onError('Failed to load Google Maps');
                    }
                });
        }
    };

    // Handle input change for legacy mode
    const _handleInputChange = (e) => {
        if (onChange) {
            onChange(e.target.value);
        }
    };

    useEffect(() => {
        const initMaps = async () => {
            await loadGoogleMaps();
        };
        initMaps();

        return () => {
            if (placeAutocompleteRef.current) {
                try {
                    if (shouldUseLegacy()) {
                        // Legacy cleanup
                        window.google.maps.event.clearInstanceListeners(placeAutocompleteRef.current);
                    } else {
                        // Modern cleanup
                        placeAutocompleteRef.current.remove();
                    }
                } catch (err) {
                    console.warn('Cleanup error:', err);
                }
            }
        };
    }, [apiKey, _googleMapsApiKey, legacy, countryRestriction]); // Dependencies include apiKey, legacy, and countryRestriction

    // Update error styling when hasError prop changes
    useEffect(() => {
        const updateErrorStyle = () => {
            if (shouldUseLegacy() && addressInputRef.current) {
                addressInputRef.current.style.borderColor = hasError && 'hsl(var(--destructive))';
            } else if (!shouldUseLegacy() && placeAutocompleteRef.current) {
                placeAutocompleteRef.current.style.borderColor = hasError && 'hsl(var(--destructive))';
            }
        };

        updateErrorStyle();
    }, [hasError, defaultStyles.borderColor, legacy]);

    // Update value when prop changes
    useEffect(() => {
        if (shouldUseLegacy() && addressInputRef.current && addressInputRef.current.value !== value) {
            addressInputRef.current.value = value || '';
        } else if (!shouldUseLegacy() && placeAutocompleteRef.current && placeAutocompleteRef.current.value !== value) {
            placeAutocompleteRef.current.value = value || '';
        }
    }, [value, legacy]);

    return (
        <div ref={containerRef} className="google-places-input-container relative">
            {/* Container will be populated by JavaScript */}
        </div>
    );
};

export default GooglePlacesInput;

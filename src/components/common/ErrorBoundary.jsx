// @/components/common/ErrorBoundary.jsx
'use client';

import { Component } from 'react';

/**
 * Custom React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs errors and displays a fallback UI instead of white screen
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details to console (or send to error tracking service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // Optional: Send error to error tracking service (e.g., Sentry)
        // if (typeof window !== 'undefined' && window.Sentry) {
        //     window.Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
        // }
    }

    resetError = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });

        // Reload the page to reset the app state
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            // Render fallback UI - pass error details to custom error component
            const { fallback: FallbackComponent } = this.props;

            if (FallbackComponent) {
                return (
                    <FallbackComponent
                        error={this.state.error}
                        errorInfo={this.state.errorInfo}
                        resetError={this.resetError}
                    />
                );
            }

            // Default fallback UI if no custom component provided
            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
                    <div className="max-w-2xl mx-auto text-center space-y-6">
                        <h1 className="text-6xl md:text-8xl font-bold bg-linear-to-br from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                            500
                        </h1>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Algo correu mal</h2>
                        <p className="text-muted-foreground">Ocorreu um erro inesperado. Por favor, tenta novamente.</p>
                        <button
                            onClick={this.resetError}
                            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors">
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        // No error, render children normally
        return this.props.children;
    }
}

export default ErrorBoundary;

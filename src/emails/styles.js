// emails/styles.js

// Color palette
export const colors = {
    primary: '#000000',
    primaryLight: '#FDBA74',
    background: '#ffffff',
    white: '#ffffff',
    gray900: '#1f2937',
    gray800: '#1f2937',
    gray700: '#374151',
    gray600: '#4b5563',
    gray500: '#6B7280',
    gray400: '#9ca3af',
    gray300: '#d1d5db',
    gray200: '#e5e7eb',
    gray100: '#f3f4f6',
    grayLight: '#F9FAFB',
    orange50: '#FFF7ED',
    orange400: '#f59e0b',
    orange600: '#ea580c',
    orange900: '#92400e',
    green50: '#ECFDF5',
    green100: '#d1fae5',
    green500: '#10b981',
    green600: '#059669',
    green900: '#065f46',
    red50: '#FEF2F2',
    red100: '#FCA5A5',
    red500: '#ef4444',
    red600: '#dc2626',
    red900: '#7f1d1d',
    yellow50: '#fef3c7',
    yellow500: '#f59e0b',
    yellow900: '#92400e',
    blue400: '#3b82f6',
    blue500: '#3b82f6',
    slate700: '#334155',
    slate800: '#1e293b'
};

// Typography
export const typography = {
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    sizes: {
        heading: '28px',
        subheading: '18px',
        body: '16px',
        small: '14px'
    },
    weights: {
        normal: '400',
        medium: '600',
        bold: 'bold'
    },
    lineHeights: {
        tight: '20px',
        normal: '24px',
        relaxed: '26px'
    }
};

// Spacing
export const spacing = {
    xs: '8px',
    sm: '16px',
    md: '20px',
    lg: '32px',
    xl: '48px',
    xxl: '64px'
};

// Email styles object
export const emailStyles = {
    // Layout
    main: {
        margin: '0',
        padding: '0',
        backgroundColor: colors.background,
        fontFamily: typography.fontFamily
    },

    container: {
        backgroundColor: colors.background,
        margin: '0 auto',
        padding: `${spacing.md} 0 ${spacing.xl}`,
        marginBottom: spacing.xxl,
        maxWidth: '580px'
    },

    // Logo section
    logoSection: {
        padding: `${spacing.lg} ${spacing.md}`,
        textAlign: 'center',
        backgroundColor: colors.white
    },

    logo: {
        margin: '0 auto',
        display: 'block',
        width: '100%',
        maxWidth: '98px',
        height: 'auto'
    },

    // Typography
    heading: {
        fontSize: typography.sizes.heading,
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        textAlign: 'center',
        margin: `0 0 30px`,
        padding: `0 ${spacing.md}`
    },

    paragraph: {
        fontSize: typography.sizes.body,
        lineHeight: typography.lineHeights.relaxed,
        color: colors.gray700,
        padding: `0 ${spacing.md}`,
        margin: `0 0 ${spacing.md}`
    },

    // Features section
    featuresSection: {
        maxWidth: '100%',
        backgroundColor: colors.orange50,
        borderRadius: '8px',
        margin: `24px 0`,
        padding: spacing.md,
        border: `1px solid ${colors.primaryLight}`
    },

    featuresTitle: {
        fontSize: typography.sizes.subheading,
        fontWeight: typography.weights.medium,
        color: colors.gray900,
        margin: `0 0 ${spacing.sm}`
    },

    featureText: {
        fontSize: typography.sizes.body,
        lineHeight: typography.lineHeights.normal,
        color: colors.gray700,
        margin: '0'
    },

    // Button
    buttonSection: {
        textAlign: 'center',
        margin: `${spacing.lg} 0`,
        padding: `0 ${spacing.md}`
    },

    button: {
        backgroundColor: colors.primary,
        borderRadius: '8px',
        color: colors.white,
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.medium,
        textDecoration: 'none',
        textAlign: 'center',
        display: 'inline-block',
        padding: `14px ${spacing.lg}`,
        border: 'none',
        cursor: 'pointer'
    },

    // Footer
    footer: {
        padding: `0 ${spacing.md}`,
        margin: `${spacing.lg} 0 0`,
        backgroundColor: colors.grayLight,
        textAlign: 'center',
        borderTop: `1px solid ${colors.gray200}`
    },

    footerText: {
        fontSize: typography.sizes.body,
        lineHeight: typography.lineHeights.normal,
        color: colors.gray700,
        margin: '0'
    },

    // Support section
    supportSection: {
        backgroundColor: colors.grayLight,
        padding: spacing.md,
        margin: `${spacing.lg} ${spacing.md} 0`,
        borderRadius: '8px',
        textAlign: 'center'
    },

    supportText: {
        fontSize: typography.sizes.small,
        lineHeight: typography.lineHeights.tight,
        color: colors.gray500,
        margin: '0'
    },

    link: {
        color: colors.primary,
        textDecoration: 'underline'
    },

    // Order confirmation specific styles
    dividerSection: {
        textAlign: 'center',
        margin: '20px 0',
        padding: `0 ${spacing.md}`
    },

    divider: {
        fontSize: typography.sizes.subheading,
        color: colors.gray500,
        letterSpacing: '2px',
        fontWeight: typography.weights.normal
    },

    orderDetailItem: {
        fontSize: typography.sizes.body,
        lineHeight: typography.lineHeights.normal,
        color: colors.gray700,
        margin: `0 0 12px`
    },

    productsSection: {
        marginTop: spacing.sm
    },

    productsSectionTitle: {
        fontSize: typography.sizes.body,
        color: colors.gray700,
        marginBottom: spacing.xs
    },

    shippingSection: {
        padding: `0 ${spacing.md}`,
        margin: `${spacing.md} 0`
    },

    questionSection: {
        padding: `0 ${spacing.md}`,
        margin: `${spacing.md} 0`
    },

    // Pricing section styles
    pricingSection: {
        marginTop: spacing.sm,
        paddingTop: spacing.xs,
        borderTop: '1px solid #e0e0e0'
    },

    // Enhanced styles from OrderConfirmationTemplate
    // Header
    header: {
        backgroundColor: colors.white,
        padding: '20px',
        textAlign: 'center',
        borderBottom: `1px solid ${colors.gray200}`
    },

    headerContent: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px'
    },

    orderBadge: {
        backgroundColor: colors.green500,
        color: colors.white,
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: typography.sizes.small,
        fontWeight: typography.weights.bold
    },

    orderBadgePending: {
        backgroundColor: colors.yellow500,
        color: colors.white,
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: typography.sizes.small,
        fontWeight: typography.weights.bold
    },

    orderBadgeText: {
        margin: '0',
        color: colors.white,
        fontSize: typography.sizes.small,
        fontWeight: typography.weights.bold
    },

    // Payment status alerts
    paymentStatusAlert: {
        backgroundColor: colors.yellow50,
        border: `1px solid ${colors.yellow500}`,
        borderRadius: '8px',
        padding: '15px',
        margin: '20px 0'
    },

    paymentStatusText: {
        fontSize: typography.sizes.small,
        color: colors.yellow900,
        fontWeight: '500',
        margin: '0',
        textAlign: 'center'
    },

    paymentStatusSuccess: {
        backgroundColor: colors.green100,
        border: `1px solid ${colors.green500}`,
        borderRadius: '8px',
        padding: '15px',
        margin: '20px 0'
    },

    paymentStatusSuccessText: {
        fontSize: typography.sizes.small,
        color: colors.green900,
        fontWeight: '500',
        margin: '0',
        textAlign: 'center'
    },

    // Typography variants
    mainHeading: {
        fontSize: '32px',
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        margin: '0 0 30px',
        textAlign: 'center'
    },

    greeting: {
        fontSize: typography.sizes.subheading,
        color: colors.gray700,
        margin: '0 0 20px',
        fontWeight: '500'
    },

    confirmationText: {
        fontSize: typography.sizes.body,
        color: colors.gray500,
        margin: '0 0 30px',
        lineHeight: '1.6'
    },

    // Card styles
    orderCard: {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        margin: '20px 0'
    },

    orderHeader: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },

    orderTitle: {
        fontSize: '20px',
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        margin: '0'
    },

    orderId: {
        fontSize: typography.sizes.body,
        color: colors.blue500,
        fontWeight: '600',
        margin: '0'
    },

    orderMeta: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    },

    metaLabel: {
        fontSize: '12px',
        color: colors.gray500,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: '0 0 5px'
    },

    metaValue: {
        fontSize: typography.sizes.small,
        color: colors.gray700,
        fontWeight: '600',
        margin: '0'
    },

    // Section styles
    sectionTitle: {
        fontSize: typography.sizes.subheading,
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        margin: '30px 0 15px',
        borderBottom: `2px solid ${colors.gray200}`,
        paddingBottom: '5px'
    },

    // Products
    productRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '15px 0',
        borderBottom: `1px solid ${colors.gray100}`
    },

    productInfo: {
        flex: '1'
    },

    productName: {
        fontSize: typography.sizes.body,
        fontWeight: '600',
        color: colors.gray900,
        margin: '0 0 5px'
    },

    productDetails: {
        fontSize: typography.sizes.small,
        color: colors.gray500,
        margin: '2px 0'
    },

    productPrice: {
        fontSize: typography.sizes.body,
        fontWeight: '600',
        color: colors.gray900,
        margin: '0'
    },

    // Totals section
    totalsSection: {
        backgroundColor: '#f8fafc',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0'
    },

    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '8px 0'
    },

    totalLabel: {
        fontSize: typography.sizes.small,
        color: colors.gray700,
        margin: '0'
    },

    totalValue: {
        fontSize: typography.sizes.small,
        fontWeight: '500',
        color: colors.gray900,
        margin: '0'
    },

    discountValue: {
        fontSize: typography.sizes.small,
        fontWeight: '500',
        color: colors.red600,
        margin: '0'
    },

    totalDivider: {
        borderColor: colors.gray300,
        margin: '15px 0'
    },

    finalTotalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: `2px solid ${colors.gray300}`
    },

    finalTotalLabel: {
        fontSize: typography.sizes.subheading,
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        margin: '0'
    },

    finalTotalValue: {
        fontSize: typography.sizes.subheading,
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        margin: '0'
    },

    // Address card
    addressCard: {
        backgroundColor: colors.grayLight,
        padding: '15px',
        borderRadius: '8px',
        border: `1px solid ${colors.gray200}`
    },

    addressName: {
        fontSize: typography.sizes.body,
        fontWeight: '600',
        color: colors.gray900,
        margin: '0 0 5px'
    },

    addressDetails: {
        fontSize: typography.sizes.small,
        color: colors.gray500,
        margin: '0',
        lineHeight: '1.5'
    },

    // Payment section
    paymentSection: {
        margin: '30px 0'
    },

    paymentMethod: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        fontSize: typography.sizes.small,
        color: colors.gray700,
        backgroundColor: colors.grayLight,
        padding: '10px 15px',
        borderRadius: '6px',
        border: `1px solid ${colors.gray200}`,
        margin: '10px 0'
    },

    bankDetailsCard: {
        backgroundColor: colors.yellow50,
        border: `1px solid ${colors.yellow500}`,
        borderRadius: '8px',
        padding: '15px',
        margin: '15px 0'
    },

    bankDetailsTitle: {
        fontSize: typography.sizes.small,
        fontWeight: typography.weights.bold,
        color: colors.yellow900,
        margin: '0 0 10px'
    },

    bankDetails: {
        display: 'grid',
        gap: '5px'
    },

    bankDetailRow: {
        display: 'flex',
        justifyContent: 'space-between'
    },

    bankDetailLabel: {
        fontSize: '12px',
        color: colors.yellow900,
        fontWeight: '500',
        margin: '0'
    },

    bankDetailValue: {
        fontSize: '12px',
        color: colors.yellow900,
        fontWeight: '600',
        margin: '0'
    },

    // Tracking section
    trackingSection: {
        margin: '30px 0'
    },

    trackingNumber: {
        fontSize: typography.sizes.body,
        color: colors.gray900,
        backgroundColor: colors.green50,
        padding: '12px',
        borderRadius: '6px',
        border: `1px solid ${colors.green500}`,
        fontWeight: '600',
        margin: '10px 0'
    },

    // Action buttons
    actionSection: {
        textAlign: 'center',
        margin: '40px 0'
    },

    primaryButton: {
        backgroundColor: colors.primary,
        color: colors.white,
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: typography.sizes.small,
        display: 'inline-block',
        margin: '0 10px 10px'
    },

    secondaryButton: {
        backgroundColor: colors.white,
        color: colors.primary,
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: typography.sizes.small,
        display: 'inline-block',
        border: '1px solid #929292ff',
        margin: '0 10px 10px'
    },

    // Footer enhanced
    footerEnhanced: {
        backgroundColor: colors.grayLight,
        padding: '30px 20px',
        textAlign: 'center',
        marginTop: '40px',
        borderTop: `1px solid ${colors.gray200}`
    },

    footerLink: {
        color: colors.blue500,
        textDecoration: 'none'
    },

    footerCompany: {
        fontSize: '12px',
        color: colors.gray400,
        margin: '20px 0 0',
        lineHeight: '1.4'
    },

    // Code/verification section
    codeSection: {
        textAlign: 'center',
        margin: '32px 0',
        padding: `0 ${spacing.md}`
    },

    codeText: {
        fontSize: '36px',
        fontWeight: typography.weights.bold,
        color: colors.green500,
        backgroundColor: colors.gray100,
        padding: '20px 40px',
        borderRadius: '8px',
        letterSpacing: '6px',
        fontFamily: 'Monaco, "Lucida Console", monospace',
        margin: '0'
    },

    // Security notice
    securityNotice: {
        backgroundColor: colors.gray100,
        padding: spacing.md,
        margin: `${spacing.lg} ${spacing.md} 0`,
        borderRadius: '8px',
        textAlign: 'center',
        border: `1px solid ${colors.gray200}`
    },

    securityText: {
        fontSize: '12px',
        lineHeight: typography.lineHeights.tight,
        color: colors.gray600,
        margin: '0'
    },

    // Message section (for notifications)
    messageSection: {
        backgroundColor: colors.blue400,
        padding: spacing.md,
        margin: `${spacing.md} ${spacing.md}`,
        borderRadius: '8px',
        border: `1px solid ${colors.blue500}`
    },

    messageText: {
        fontSize: typography.sizes.body,
        lineHeight: typography.lineHeights.normal,
        color: colors.white,
        margin: '0',
        textAlign: 'center',
        fontWeight: '500'
    },

    // Logo text for when no logo image
    logoText: {
        padding: `${spacing.lg} ${spacing.md}`,
        fontSize: typography.sizes.heading,
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        margin: '0 auto',
        textAlign: 'center'
    }
};

// Utility functions for creating custom styles
export const createButtonStyle = (backgroundColor = colors.primary, textColor = colors.white) => ({
    ...emailStyles.button,
    backgroundColor,
    color: textColor
});

export const createSectionStyle = (backgroundColor = colors.white, padding = spacing.md) => ({
    backgroundColor,
    padding,
    borderRadius: '8px',
    margin: `24px ${spacing.md}`
});

// Theme variations
export const themes = {
    orange: {
        primary: '#FF6B35',
        primaryLight: '#FDBA74',
        accent: '#FFF7ED'
    },
    blue: {
        primary: '#4F46E5',
        primaryLight: '#A5B4FC',
        accent: '#EEF2FF'
    },
    green: {
        primary: '#059669',
        primaryLight: '#86EFAC',
        accent: '#ECFDF5'
    },
    purple: {
        primary: '#7C3AED',
        primaryLight: '#C4B5FD',
        accent: '#F3F4F6'
    }
};

// Function to generate theme-based styles
export const createThemedStyles = (theme = 'orange') => {
    const selectedTheme = themes[theme];
    return {
        ...emailStyles,
        button: {
            ...emailStyles.button,
            backgroundColor: selectedTheme.primary
        },
        link: {
            ...emailStyles.link,
            color: selectedTheme.primary
        },
        featuresSection: {
            ...emailStyles.featuresSection,
            backgroundColor: selectedTheme.accent,
            border: `1px solid ${selectedTheme.primaryLight}`
        }
    };
};

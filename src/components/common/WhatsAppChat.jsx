// @/components/common/WhatsAppChat.jsx
'use client';

import { MessageCircle, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSettings } from '@/context/providers';

const WhatsAppChat = () => {
    const { siteSettings } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(sessionStorage.getItem('whatsapp_chat_interacted') === 'true');
    const [isFirstLoad, setIsFirstLoad] = useState(false);
    const logoImg = "/images/helpdesk_avatar.webp";

    // Check if user has previously interacted
    useEffect(() => {
        const interacted = sessionStorage.getItem('whatsapp_chat_interacted');
        if (interacted === 'true') {
            setHasInteracted(true);
        }
    }, []);

    // Clear sessionStorage on page unload/refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.removeItem('whatsapp_chat_interacted');
            sessionStorage.removeItem('whatsapp_chat_loaded');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Show the WhatsApp button after a short delay (better UX)
    useEffect(() => {
        const chatLoaded = sessionStorage.getItem('whatsapp_chat_loaded');

        if (chatLoaded === 'true') {
            setIsVisible(true);
            setIsFirstLoad(false);
            return;
        }

        // This is the first load
        setIsFirstLoad(true);

        const timer = setTimeout(() => {
            setIsVisible(true);
            sessionStorage.setItem('whatsapp_chat_loaded', 'true');
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // Show notification popup after 25 seconds (only if user hasn't interacted before)
    useEffect(() => {
        if (!isVisible || isOpen || hasInteracted) return;

        const notificationTimer = setTimeout(() => {
            setShowNotification(true);
        }, 25000);

        return () => clearTimeout(notificationTimer);
    }, [isVisible, isOpen, hasInteracted]);

    // Hide notification when bubble is opened or after 8 seconds
    useEffect(() => {
        if (isOpen) {
            setShowNotification(false);
            return;
        }

        if (showNotification) {
            const hideTimer = setTimeout(() => {
                setShowNotification(false);
            }, 15000);

            return () => clearTimeout(hideTimer);
        }
    }, [isOpen, showNotification]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        setShowNotification(false);
        if (!hasInteracted) {
            setHasInteracted(true);
            sessionStorage.setItem('whatsapp_chat_interacted', 'true');
        }
    };

    const handleNotificationClick = () => {
        setIsOpen(true);
        setShowNotification(false);
        if (!hasInteracted) {
            setHasInteracted(true);
            sessionStorage.setItem('whatsapp_chat_interacted', 'true');
        }
    };

    const handleWhatsAppClick = () => {
        // Replace with your WhatsApp number (include country code without + or spaces)
        // Example: 351912345678 for Portugal
        const phoneNumber = siteSettings?.sitePhone ? siteSettings.sitePhone.replace(/[\s+]/g, '') : '';
        const message = encodeURIComponent('Olá! Gostava de saber mais informações.');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        setIsOpen(false);
    };

    if (!isVisible) return null;

    return (
        <Container>
            {/* Notification Popup */}
            <NotificationPopup $show={showNotification && !isOpen} onClick={handleNotificationClick}>
                <NotificationContent>
                    <NotificationIcon>
                        <Image
                            src={logoImg}
                            alt="Support"
                            width={40}
                            height={40}
                            style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </NotificationIcon>
                    <NotificationText>Posso ajudar a escolher aquilo que procuras?</NotificationText>
                </NotificationContent>
                <NotificationClose
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowNotification(false);
                    }}>
                    <X size={14} />
                </NotificationClose>
            </NotificationPopup>

            {/* Chat Bubble */}
            <ChatBubble $isOpen={isOpen}>
                <CloseButton onClick={handleToggle}>
                    <X size={20} />
                </CloseButton>

                <ChatContent>
                    <ChatHeader className="bg-gradient-to-l from-[#30af4e] to-[#25a343] text-background">
                        <WhatsAppIcon>
                            <Image
                                src={logoImg}
                                alt="Support"
                                width={48}
                                height={48}
                                loading="lazy"
                                priority={false}
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        </WhatsAppIcon>
                        <HeaderText>
                            <HeaderTitle>Precisas de ajuda?</HeaderTitle>
                            <HeaderSubtitle>Estamos online!</HeaderSubtitle>
                        </HeaderText>
                    </ChatHeader>

                    <ChatBody>
                        <MessageBubble>
                            <MessageText>👋 Olá!</MessageText>
                            <MessageText>
                                Tem alguma dúvida sobre os nossos serviços? Estamos aqui para ajudar! ☀️
                            </MessageText>
                            <MessageTime>Online agora</MessageTime>
                        </MessageBubble>
                    </ChatBody>

                    <ChatFooter>
                        <StartChatButton className="bg-[#30af4e] text-background" onClick={handleWhatsAppClick}>
                            <MessageCircle size={20} strokeWidth={2.5} />
                            <span>Iniciar Conversa</span>
                        </StartChatButton>
                    </ChatFooter>
                </ChatContent>
            </ChatBubble>

            {/* Floating Button */}
            <FloatingButton
                onClick={handleToggle}
                $isOpen={isOpen}
                $isFirstLoad={isFirstLoad}
                $hideOnMobile={showNotification && !isOpen}
                aria-label="WhatsApp Chat">
                {isOpen ? <X size={28} strokeWidth={2.5} /> : <MessageCircle size={28} strokeWidth={2.5} />}
                <PulseRing $isOpen={isOpen} />
            </FloatingButton>
        </Container>
    );
};

// Styled Components
const Container = styled.div`
    position: fixed;
    bottom: 80px;
    right: 50px;
    z-index: 9999;

    @media (max-width: 768px) {
        bottom: 15px;
        right: 30px;
    }
`;

const FloatingButton = styled.button`
    position: relative;
    opacity: 0.98;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--background);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--foreground);
    box-shadow: 0 4px 12px rgba(41, 90, 13, 0.4);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${(props) => (props.$isOpen ? 'rotate(90deg)' : 'rotate(0deg)')};
    animation: ${(props) => (props.$isFirstLoad ? 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none')};

    @keyframes popIn {
        0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
        }
        50% {
            transform: scale(1.1) rotate(180deg);
        }
        100% {
            transform: scale(1) rotate(360deg);
            opacity: 1;
        }
    }

    &:hover {
        transform: ${(props) => (props.$isOpen ? 'rotate(90deg) scale(1.05)' : 'scale(1.05)')};
        box-shadow: 0 6px 16px rgba(37, 211, 102, 0.5);
    }

    &:active {
        transform: scale(0.95);
    }

    @media (max-width: 768px) {
        width: 56px;
        height: 56px;
        opacity: ${(props) => (props.$hideOnMobile ? '0' : '1')};
        visibility: ${(props) => (props.$hideOnMobile ? 'hidden' : 'visible')};
        pointer-events: ${(props) => (props.$hideOnMobile ? 'none' : 'auto')};
    }
`;

const PulseRing = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid #25D366;
    opacity: ${(props) => (props.$isOpen ? '0' : '1')};
    animation: ${(props) => (props.$isOpen ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite')};

    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.3);
            opacity: 0.5;
        }
        100% {
            transform: scale(1.6);
            opacity: 0;
        }
    }
`;

const ChatBubble = styled.div`
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 360px;
    max-width: calc(100vw - 32px);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    opacity: ${(props) => (props.$isOpen ? '1' : '0')};
    visibility: ${(props) => (props.$isOpen ? 'visible' : 'hidden')};
    transform: ${(props) => (props.$isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)')};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;

    @media (max-width: 768px) {
        width: calc(100vw - 30vw);
        bottom: 75px;
    }
`;

const CloseButton = styled.button`
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--muted);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--foreground);
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
        background: var(--accent);
        transform: rotate(90deg);
    }

    &:active {
        transform: rotate(90deg) scale(0.9);
    }
`;

const ChatContent = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

const ChatHeader = styled.div`
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 50px;
`;

const WhatsAppIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
`;

const HeaderText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const HeaderTitle = styled.h3`
    font-size: 16px;
    font-weight: 600;
    color: white;
    margin: 0;
`;

const HeaderSubtitle = styled.p`
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;

    &:before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
        animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;

const ChatBody = styled.div`
    padding: 20px;
    background: var(--background);
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const MessageBubble = styled.div`
    background: rgba(188, 188, 188, .45);
    padding: 14px 16px;
    border-radius: 12px;
    border-top-left-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: slideIn 0.4s ease-out;

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const MessageText = styled.p`
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-foreground);
    margin: 0;
`;

const MessageTime = styled.span`
    font-size: 11px;
    color: var(--muted-foreground);
    text-align: right;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
`;

const ChatFooter = styled.div`
    padding: 16px 20px;
    background: var(--card);
    border-top: 1px solid var(--border);
`;

const StartChatButton = styled.button`
    width: 100%;
    padding: 14px 20px;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s ease;

    &:hover {
        transform: translateY(-2px);
    }

    &:active {
        transform: translateY(0);
    }
`;

const NotificationPopup = styled.div`
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 280px;
    max-width: calc(100vw - 100px);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    opacity: ${(props) => (props.$show ? '1' : '0')};
    visibility: ${(props) => (props.$show ? 'visible' : 'hidden')};
    transform: ${(props) => (props.$show ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)')};
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: ${(props) => (props.$show ? 'bounceIn 0.6s ease-out' : 'none')};

    @keyframes bounceIn {
        0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
        }
        50% {
            transform: translateY(-5px) scale(1.02);
        }
        100% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    &:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }

    @media (max-width: 768px) {
        width: 250px;
        bottom: 0;
        right: 0;
        z-index: 10;
    }
`;

const NotificationContent = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    padding-right: 40px;
`;

const NotificationIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    border: 2px solid #25D366;
    box-shadow: 0 2px 8px rgba(37, 211, 102, 0.3);
    animation: pulse 2s ease-in-out infinite;

    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
`;

const NotificationText = styled.p`
    font-size: 14px;
    line-height: 1.4;
    color: var(--foreground);
    margin: 0;
    font-weight: 500;
`;

const NotificationClose = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted-foreground);
    transition: all 0.2s ease;
    opacity: 0.6;

    &:hover {
        background: var(--muted);
        opacity: 1;
        transform: rotate(90deg);
    }

    &:active {
        transform: rotate(90deg) scale(0.9);
    }
`;

export default WhatsAppChat;

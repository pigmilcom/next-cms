// @/app/(frontend)/booking/page.client.jsx (Booking Page Client Component)

'use client';

import { FaClock, FaFaceGrinStars, FaLocationDot } from 'react-icons/fa6';
import BookingForm from './BookingForm'; 

const companyData = {}; // Replace with actual company data

const PageClient = () => {
    return (
        <div className="relative container mx-auto px-4! py-8!">
            <section className="relative" aria-labelledby="booking-page-title">
                <div
                    className="w-full max-w-full h-105 overflow-hidden absolute top-0 left-0 right-0 -z-1 max-h-full opacity-10"
                    style={{
                        backgroundImage: 'url(/images/hero_bg.webp)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                >
                    <div className="absolute w-full h-full inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_430px] items-start">
                    <div className="space-y-6">
                        <div className="hero-card mb-0" role="region" aria-label="Introduction reservation">
                            <h1 id="booking-page-title" className="font-bold text-primary text-4xl">
                                Reserver Une Intervention
                            </h1>
                            <p className="text-muted font-semibold">
                                Choisissez votre appareil, votre date et votre heure. Nous confirmons rapidement votre
                                demande pour une intervention a domicile a {companyData?.serviceArea?.primary}.
                            </p> 

                            <div className="flex gap-1 nowrap items-center muted smaller mt-6">
                                <div className="online-dot" />
                                <div>
                                    Diagnostic d'entree : <strong>29EUR</strong> - Deduit si reparation
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 mt-6 mb-4 bg-accent/30 px-4 py-2 rounded-lg">
                                <p className="flex leading-relaxed text-sm text-accent-hover gap-2 items-center">
                                    <FaClock className="primary" />
                                    <span>Intervention sous 24h</span>
                                </p>
                                <p className="flex leading-relaxed text-sm text-accent-hover gap-2 items-center">
                                    <FaLocationDot className="primary" />
                                    <span>
                                        {companyData?.serviceArea?.primary} et {companyData?.serviceArea?.radius}km autour
                                    </span>
                                </p>
                                <p className="flex leading-relaxed text-sm text-accent-hover gap-2 items-center">
                                    <FaFaceGrinStars className="primary" />
                                    <span>Satisfaction garantie</span>
                                </p>
                            </div>
                        </div>
                        <div className="card-description max-w-full overflow-x-hidden! px-2">
                             <BookingForm /> 
                        </div>

                    </div>

                    <aside className="sticky top-10 mt-0 max-w-full">
                        <Features />
                        <MapViewer />
                    </aside>
                </div>
            </section>

            <ServicesCta />
            <Contact />
        </div>
    );
};

export default PageClient;

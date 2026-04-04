'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Select from 'react-select'
import Turnstile from "react-turnstile"
import {FaClock} from "react-icons/fa6" 
import {PhoneInput} from '@/components/ui/phone-input'
import { useAuth, useSettings } from '@/context/providers'
import { toast } from 'sonner'
import { createAppointment } from '@/lib/server/admin.js'
import { sendCustomerMessage } from '@/lib/server/email.js'
import { createStripePaymentIntent, createSumUpCheckoutAction } from '@/lib/server/gateways.js'
import { createOrder } from '@/lib/server/orders.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { FaCalendar, FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import GooglePlacesInput from '@/components/common/GooglePlacesInput'

let stripePromise = null

const companyData = {}; // Replace with actual company data or fetch from settings if needed

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}

function BookingStripePaymentStep({
  bookingId,
  bookingAmount,
  bookingCurrency,
  customerEmail,
  onBack,
  onPaymentSuccess
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const handleStripeSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      toast.error('Le module de paiement est en cours de chargement. Veuillez patienter.')
      return
    }

    try {
      setIsProcessingPayment(true)

      const { error: submitError } = await elements.submit()
      if (submitError) {
        throw new Error(submitError.message)
      }

      const stripeResult = await createStripePaymentIntent({
        amount: Math.round(bookingAmount * 100),
        currency: bookingCurrency.toLowerCase(),
        email: customerEmail,
        metadata: {
          booking_id: bookingId,
          source: 'booking_form'
        }
      })

      if (!stripeResult?.success || !stripeResult?.client_secret) {
        throw new Error(stripeResult?.error || 'Impossible de demarrer le paiement Stripe')
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: stripeResult.client_secret,
        redirect: 'if_required'
      })

      if (confirmError) {
        throw new Error(confirmError.message)
      }

      const paidStatuses = ['succeeded', 'processing', 'requires_capture']
      if (!paymentIntent || !paidStatuses.includes(paymentIntent.status)) {
        throw new Error('Le paiement n\'a pas ete confirme. Veuillez reessayer.')
      }

      await onPaymentSuccess()
    } catch (error) {
      console.error('Stripe payment error:', error)
      toast.error(error.message || 'Le paiement a echoue. Veuillez reessayer.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
        <p className="font-medium">Paiement de la reservation</p>
        <p className="text-muted-foreground">
          Montant a payer maintenant: {bookingAmount.toFixed(2)} {bookingCurrency === 'USD' ? '$' : '€'}
        </p>
      </div>

      <form onSubmit={handleStripeSubmit} className="space-y-4">
        <PaymentElement />

        <Button type="submit" className="w-full" disabled={isProcessingPayment || !stripe || !elements}>
          {isProcessingPayment ? 'Paiement en cours...' : `Payer ${bookingAmount.toFixed(2)} ${bookingCurrency === 'USD' ? '$' : '€'}`}
        </Button>

        <Button type="button" variant="outline" className="w-full" onClick={onBack} disabled={isProcessingPayment}>
          Retour
        </Button>
      </form>
    </div>
  )
}

function BookingSumUpPaymentStep({
  bookingId,
  bookingAmount,
  bookingCurrency,
  customerEmail,
  onBack,
  onPaymentSuccess
}) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [checkoutId, setCheckoutId] = useState(null)
  const [isSdkLoaded, setIsSdkLoaded] = useState(false)
  const [isWidgetMounted, setIsWidgetMounted] = useState(false)
  const [paymentError, setPaymentError] = useState(null)
  const sumupCardRef = useRef(null)

  // Load SumUp SDK script
  useEffect(() => {
    if (typeof window === 'undefined' || window.SumUpCard) {
      setIsSdkLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'
    script.async = true
    script.onload = () => { 
      setIsSdkLoaded(true)
    }
    script.onerror = () => {
      console.error('Failed to load SumUp SDK')
      setPaymentError('Impossible de charger le module de paiement SumUp')
    }

    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Create SumUp checkout (only once when component mounts)
  useEffect(() => {
    let isMounted = true

    const initializeSumUpCheckout = async () => {
      // Prevent duplicate checkout creation
      if (checkoutId) { 
        return
      }

      try {
        setIsProcessingPayment(true)

        const checkoutResult = await createSumUpCheckoutAction({
          orderId: bookingId,
          amount: bookingAmount,
          currency: bookingCurrency,
          description: `Reservation ${bookingId}`,
          customerEmail: customerEmail
        })

        if (!isMounted) return 

        if (!checkoutResult?.success) {
          // Handle duplicate checkout error gracefully
          if (checkoutResult?.error === 'DUPLICATE_CHECKOUT') {
            console.warn('Duplicate checkout detected. This booking may have an existing payment session.')
            setPaymentError(
              'Une session de paiement existe deja pour cette reservation. Veuillez rafraichir la page ou contacter le support.'
            )
            return
          }

          const errorMsg = checkoutResult?.error || 'Impossible de creer le paiement SumUp'
          console.error('SumUp checkout failed:', errorMsg)
          setPaymentError(errorMsg)
          return
        }

        if (!checkoutResult?.checkoutId) {
          setPaymentError('Identifiant de paiement SumUp manquant')
          return
        }

        setCheckoutId(checkoutResult.checkoutId)
      } catch (error) {
        if (!isMounted) return
        console.error('SumUp checkout initialization error:', error)
        setPaymentError(error.message || 'Le paiement a echoue. Veuillez reessayer.')
      } finally {
        if (isMounted) {
          setIsProcessingPayment(false)
        }
      }
    }

    initializeSumUpCheckout()

    return () => {
      isMounted = false
    }
  }, [bookingId, bookingAmount, bookingCurrency, customerEmail, checkoutId])

  // Mount SumUp card widget when SDK is loaded and checkout is created
  useEffect(() => {
    if (!isSdkLoaded || !checkoutId || isWidgetMounted || !window.SumUpCard) {
      return
    }

    try { 

      window.SumUpCard.mount({
        id: 'sumup-card',
        checkoutId: checkoutId,
        onResponse: async (type, body) => { 

          if (type === 'success') {
            toast.success('Paiement reussi!')
            await onPaymentSuccess()
          } else if (type === 'error') {
            const errorMsg = body?.message || 'Le paiement a echoue'
            console.error('SumUp payment error:', body)
            toast.error(errorMsg)
            setPaymentError(errorMsg)
          } else if (type === 'cancel') {
            toast.info('Paiement annule')
          }
        }
      })

      setIsWidgetMounted(true) 
    } catch (error) {
      console.error('Error mounting SumUp card widget:', error)
      setPaymentError('Erreur lors de l\'initialisation du formulaire de paiement')
    }
  }, [isSdkLoaded, checkoutId, isWidgetMounted, onPaymentSuccess])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
        <p className="font-medium">Paiement de la reservation</p>
        <p className="text-muted-foreground">
          Montant a payer maintenant: {bookingAmount.toFixed(2)} {bookingCurrency === 'USD' ? '$' : '€'}
        </p>
      </div>

      {isProcessingPayment ? (
        <div className="space-y-3 p-4 text-center">
          <p className="text-sm text-muted-foreground">Initialisation du paiement SumUp...</p>
        </div>
      ) : paymentError ? (
        <div className="space-y-3 p-4">
          <p className="text-sm text-red-500">Erreur: {paymentError}</p>
          <p className="text-xs text-muted-foreground">Verifiez la console pour plus de details ou contactez l'administrateur.</p>
          <Button type="button" variant="outline" className="w-full" onClick={onBack}>
            Retour au formulaire
          </Button>
        </div>
      ) : checkoutId ? (
        <div className="space-y-4">  
          {/* SumUp Card Widget Container */}
          <div 
            id="sumup-card" 
            ref={sumupCardRef}
            className="min-h-75 rounded-lg border border-border bg-background p-4"
          />

          <Button type="button" variant="outline" className="w-full" onClick={onBack}>
            Retour
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function BookingForm() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { siteSettings, storeSettings } = useSettings()
  
  const turnstileKey = siteSettings?.turnstileEnabled && siteSettings?.turnstileSiteKey ? siteSettings.turnstileSiteKey : null
  const googleMapsApiKey = siteSettings?.googleMapsEnabled && siteSettings?.googleMapsApiKey ? siteSettings.googleMapsApiKey : null 
  const formStepTopRef = useRef(null)
  const stripeStepTopRef = useRef(null)
  const successStepTopRef = useRef(null)
  const hasInitializedStepScrollRef = useRef(false)
  const hasSentPayLaterEmailRef = useRef(false)
  const hasCreatedOrderRef = useRef(false)
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false)
  const [countryIso] = useState(companyData?.address.countryIso || 'FR') // Default to France if not specified
  const [phone, setPhone] = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStripeReady, setIsStripeReady] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [paymentOption, setPaymentOption] = useState('')
  const [paymentGateway, setPaymentGateway] = useState('')
  const [bookingStep, setBookingStep] = useState('form')
  const [createdBooking, setCreatedBooking] = useState(null)
  const [stripeOptions, setStripeOptions] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    device: null,
    issue: ''
  })

  // Function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  const geocodeAddress = async ({ address, placeId }) => {
    if (typeof window === 'undefined' || !window.google?.maps?.Geocoder) {
      return null
    }

    const geocoder = new window.google.maps.Geocoder()

    return new Promise((resolve) => {
      const request = placeId ? { placeId } : { address }

      geocoder.geocode(request, (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          resolve(null)
          return
        }

        const location = results[0].geometry.location
        resolve({
          address: results[0].formatted_address || address || '',
          lat: location.lat(),
          lng: location.lng()
        })
      })
    })
  }

  // Function to validate if address is within service area
  const validateServiceArea = (placeToValidate = selectedPlace) => {
    if (!placeToValidate) {
      toast.error('Veuillez sélectionner une adresse valide depuis les suggestions.')
      return false
    }

    const companyLat = parseFloat(companyData?.address?.lat)
    const companyLng = parseFloat(companyData?.address?.lng)
    const userLat = placeToValidate.lat
    const userLng = placeToValidate.lng
    const maxRadius = parseFloat(companyData?.serviceArea?.radius)

    const distance = calculateDistance(companyLat, companyLng, userLat, userLng)

    if (distance > maxRadius) {
      toast.error(`Désolé, cette adresse se trouve à ${distance.toFixed(1)} km de notre zone de service. Nous intervenons uniquement dans un rayon de ${maxRadius} km autour de ${companyData?.serviceArea?.primary}.`)
      return false
    }

    return true
  }

  // Function to create booking using server actions
  const sendBookingData = async (submissionData) => {
    setIsLoading(true)

    try {
      // Prepare booking data
      const bookingData = {
        ...submissionData,
        userId: isAuthenticated ? user?.id : null,
        createdAt: new Date().toISOString(),
        status: paymentOption === 'pay_now' ? 'pending_payment' : 'pending',
        paymentOption,
        paymentStatus: paymentOption === 'pay_now' ? 'pending' : 'pay_later',
        source: 'web_form'
      }

      const result = await createAppointment(bookingData)

      if (!result?.success || !result?.data) {
        throw new Error(result?.error || result?.message || 'Échec de la réservation')
      }

      return result.data

    } catch (error) {
      console.error('Error saving booking:', error)
      toast.error(error?.message || 'Une erreur s\'est produite lors de l\'enregistrement de votre réservation. Veuillez réessayer.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const sendBookingEmails = async (booking) => {
    try {
      const interventionDate = selectedDate ? formatDate(selectedDate) : 'Non définie'
      const interventionTime = selectedTime || 'Non définie'
      const customerSubject = `Reservation confirmee - ${booking.id}`
      const adminSubject = `Nouvelle reservation - ${booking.id}`

      const sharedMessage = `
        <p><strong>Reference:</strong> ${booking.id}</p>
        <p><strong>Nom:</strong> ${formData.name}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Telephone:</strong> ${phone}</p>
        <p><strong>Adresse:</strong> ${formData.address}</p>
        <p><strong>Appareil:</strong> ${formData.device?.label || ''}</p>
        <p><strong>Date:</strong> ${interventionDate}</p>
        <p><strong>Heure:</strong> ${interventionTime}</p>
        <p><strong>Paiement:</strong> ${paymentOption === 'pay_now' ? 'Payer maintenant' : 'Payer plus tard'}</p>
        <p><strong>Probleme:</strong> ${formData.issue || 'Non specifie'}</p>
      `

      await sendCustomerMessage(
        formData.email,
        customerSubject,
        `<p>Merci ${formData.name}, votre reservation a bien ete enregistree.</p>${sharedMessage}`,
        formData.name,
        'fr'
      )

      const adminEmail = siteSettings?.siteEmail || companyData?.adminEmail || null
      if (adminEmail) {
        await sendCustomerMessage(
          adminEmail,
          adminSubject,
          `<p>Une nouvelle reservation vient d'etre soumise.</p>${sharedMessage}`,
          'Admin',
          'fr'
        )
      }
    } catch (emailError) {
      console.error('Booking email error:', emailError)
    }
  }

  const splitCustomerName = (fullName) => {
    const safeName = (fullName || '').trim()
    if (!safeName) {
      return { firstName: 'Client', lastName: 'Client' }
    }

    const parts = safeName.split(/\s+/)
    const firstName = parts[0] || 'Client'
    const lastName = parts.slice(1).join(' ') || firstName

    return { firstName, lastName }
  }

  const buildOrderPayloadFromBooking = (booking, paymentData) => {
    const { firstName, lastName } = splitCustomerName(formData.name)

    const subtotal = Number(bookingAmount)
    const vatEnabled = Boolean(storeSettings?.vatEnabled)
    const vatIncluded = Boolean(storeSettings?.vatIncludedInPrice)
    const vatPercentage = Number(storeSettings?.vatPercentage || 0)
    const vatAmount = vatEnabled && !vatIncluded ? Number(((subtotal * vatPercentage) / 100).toFixed(2)) : 0
    const finalTotal = vatIncluded ? subtotal : Number((subtotal + vatAmount).toFixed(2))

    return {
      customer: {
        firstName,
        lastName,
        email: formData.email,
        phone,
        streetAddress: formData.address || '',
        apartmentUnit: '',
        city: companyData?.address?.city || companyData?.serviceArea?.primary || '',
        state: companyData?.address?.state || '',
        zipCode: companyData?.address?.zip || companyData?.address?.postalCode || '',
        country: companyData?.address?.country || '',
        countryIso: countryIso || ''
      },
      items: [
        {
          id: `booking-service-${booking.id}`,
          name: `Intervention ${formData.device?.label || 'Service'}`,
          price: subtotal,
          quantity: 1,
          type: 'service'
        }
      ],
      subtotal,
      shippingCost: 0,
      discountAmount: 0,
      discountType: 'fixed',
      discountValue: 0,
      vatEnabled,
      vatPercentage,
      vatAmount,
      vatIncluded,
      finalTotal,
      currency: storeSettings?.currency || 'EUR',
      status: 'pending',
      paymentStatus: paymentData.paymentStatus,
      paymentMethod: paymentData.paymentMethod,
      deliveryNotes: `Booking ID: ${booking.id} | Date: ${formatDate(selectedDate)} | Time: ${selectedTime || 'Non defini'} | Device: ${formData.device?.label || ''}`,
      shippingNotes: formData.issue || '',
      isServiceAppointment: true,
      appointmentId: booking.id
    }
  }

  const createOrderFromBooking = async (booking, paymentData) => {
    if (!booking?.id || hasCreatedOrderRef.current) {
      return
    }

    const orderPayload = buildOrderPayloadFromBooking(booking, paymentData)

    const orderResult = await withTimeout(
      createOrder(orderPayload, {
        sendEmail: false,
        createNotification: false
      }),
      20000,
      'Order creation timeout after booking confirmation'
    )

    if (!orderResult?.success) {
      throw new Error(orderResult?.error || orderResult?.message || 'Order creation failed')
    }

    hasCreatedOrderRef.current = true
  }

  const deviceOptions = [
    { value: 'ordinateur-fixe', label: 'Ordinateur fixe' },
    { value: 'ordinateur-portable', label: 'Ordinateur portable' },
    { value: 'smartphone', label: 'Smartphone' },
    { value: 'tablette', label: 'Tablette' },
    { value: 'autre', label: 'Autre' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }))
  }

  const handleAddressChange = (addressValue) => {
    setFormData((prevState) => ({
      ...prevState,
      address: addressValue
    }))

    // Typed values are not guaranteed geocoded places.
    setSelectedPlace(null)
  }

  const handleAddressPlaceSelected = (place) => {
    const formattedAddress = place?.formatted_address || place?.formattedAddress || ''
    const placeId = place?.place_id || place?.id || null
    const latValue = place?.geometry?.location?.lat
    const lngValue = place?.geometry?.location?.lng

    const lat = typeof latValue === 'function' ? latValue() : latValue
    const lng = typeof lngValue === 'function' ? lngValue() : lngValue

    if (formattedAddress) {
      setFormData((prevState) => ({
        ...prevState,
        address: formattedAddress
      }))
    }

    if (typeof lat === 'number' && typeof lng === 'number') {
      setSelectedPlace({
        address: formattedAddress,
        lat,
        lng
      })
      return
    }

    // In non-legacy/fallback modes geometry may be absent; resolve with geocoder.
    void geocodeAddress({ address: formattedAddress, placeId }).then((resolvedPlace) => {
      setSelectedPlace(resolvedPlace)
    })
  }

  const handleDeviceChange = (selectedOption) => {
    setFormData(prevState => ({
      ...prevState,
      device: selectedOption
    }))
  }

  // Generate time slots based on company hours
  const generateTimeSlots = () => {
    if (!selectedDate) return []
    
    const day = selectedDate.getDay()
    let hours
    
    if (day === 6) {
      // Saturday
      hours = companyData?.hours?.saturday?.hours?.split('–')
    } else if (day === 0) {
      // Sunday - no slots
      return []
    } else {
      // Weekdays
      hours = companyData?.hours?.weekdays?.hours?.split('–')
    }
    
    const startHour = parseInt(hours[0]?.split(':')[0])
    const endHour = parseInt(hours[1]?.split(':')[0])
    
    const slots = []
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
    
    return slots
  }

  // Check if date is not Sunday
  const isDateDisabled = (date) => {
    return date.getDay() === 0 // Disable Sundays
  }

  // Generate calendar days for current month
  const generateCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty slots for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  // Format date for display
  const formatDate = (date) => {
    if (!date) return ''
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return date.toLocaleDateString('fr-FR', options)
  }

  // State for calendar navigation
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)

  const bookingAmount = 29
  const bookingCurrency = 'EUR'

  // Check which payment methods are available
  const isStripeAvailable = storeSettings?.paymentMethods?.stripe?.enabled && storeSettings?.paymentMethods?.stripe?.apiPuplicKey
  const isSumUpAvailable = storeSettings?.paymentMethods?.sumup?.enabled && storeSettings?.paymentMethods?.sumup?.merchantCode
  const bothPaymentMethodsAvailable = isStripeAvailable && isSumUpAvailable

  // Auto-select payment gateway if only one is available
  useEffect(() => {
    if (paymentOption === 'pay_now' && !bothPaymentMethodsAvailable) {
      if (isStripeAvailable && !isSumUpAvailable) {
        setPaymentGateway('stripe')
      } else if (isSumUpAvailable && !isStripeAvailable) {
        setPaymentGateway('sumup')
      }
    }
  }, [paymentOption, isStripeAvailable, isSumUpAvailable, bothPaymentMethodsAvailable])

  useEffect(() => {
    if (!storeSettings) return

    if (storeSettings.paymentMethods?.stripe?.enabled && storeSettings.paymentMethods?.stripe?.apiPuplicKey) {
      try {
        stripePromise = loadStripe(storeSettings.paymentMethods.stripe.apiPuplicKey)
        setIsStripeReady(true)
      } catch (error) {
        console.error('Failed to initialize Stripe:', error)
        setIsStripeReady(false)
      }
    } else {
      setIsStripeReady(false)
    }
  }, [storeSettings])

  useEffect(() => {
    if (!isStripeReady || !bookingAmount) {
      setStripeOptions(null)
      return
    }

    setStripeOptions({
      mode: 'payment',
      amount: Math.round(bookingAmount * 100),
      currency: bookingCurrency.toLowerCase(),
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#6772e5',
          colorBackground: '#fff',
          colorText: '#000',
          colorDanger: '#df1b41',
          fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
          borderRadius: '0.6rem'
        }
      },
      payment_method_types: ['card']
    })
  }, [isStripeReady, bookingAmount, bookingCurrency])

  useEffect(() => {
    // Skip initial render to avoid auto-scrolling on page load.
    if (!hasInitializedStepScrollRef.current) {
      hasInitializedStepScrollRef.current = true
      return
    }

    // Never auto-scroll when staying/returning to form step.
    if (bookingStep === 'form') {
      return
    }

    const stepRefMap = {
      form: formStepTopRef,
      stripe: stripeStepTopRef,
      success: successStepTopRef
    }

    const activeRef = stepRefMap[bookingStep]

    if (!activeRef?.current) return

    const animationFrame = requestAnimationFrame(() => {
      const top = activeRef.current.getBoundingClientRect().top + window.scrollY - 400
      window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth'
      })
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [bookingStep])

  useEffect(() => {
    if (bookingStep !== 'success' || paymentOption !== 'pay_later' || !createdBooking?.id) {
      return
    }

    if (hasSentPayLaterEmailRef.current) {
      return
    }

    hasSentPayLaterEmailRef.current = true

    void (async () => {
      try {
        await createOrderFromBooking(createdBooking, {
          paymentMethod: 'none',
          paymentStatus: 'pending',
          status: 'pending'
        })
      } catch (orderError) {
        console.error('Order creation after pay_later booking error:', orderError)
      }

      try {
        await withTimeout(
          sendBookingEmails(createdBooking),
          15000,
          'Email timeout after booking confirmation'
        )
      } catch (emailError) {
        console.error('Booking email background error:', emailError)
      }
    })()
  }, [bookingStep, paymentOption, createdBooking])

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  // Navigate to next month
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Check if a date is in the past
  const isPastDate = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Check if two dates are the same day
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isLoading) {
      return
    }

    if (!paymentOption) {
      toast.error('Veuillez selectionner une option de paiement')
      return
    }

    if (paymentOption === 'pay_now') {
      // Only require manual selection if both methods are available
      if (bothPaymentMethodsAvailable && !paymentGateway) {
        toast.error('Veuillez selectionner une methode de paiement')
        return
      }
      
      // If only one method available, it should be auto-selected
      if (!bothPaymentMethodsAvailable && !paymentGateway) {
        toast.error('Aucune methode de paiement disponible')
        return
      }
    }

    if (turnstileKey && !isTurnstileVerified) {
      toast.error('Veuillez vérifier le CAPTCHA')
      return
    }

    // Validate form data
    if (!formData.name || !formData.email || !phone || !formData.device || !selectedDate || !selectedTime) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Veuillez entrer une adresse email valide')
      return
    }

    // Resolve coordinates if Google Places returned an address without geometry.
    let placeForValidation = selectedPlace
    if (!placeForValidation && formData.address?.trim()) {
      placeForValidation = await geocodeAddress({ address: formData.address.trim() })
      if (placeForValidation) {
        setSelectedPlace(placeForValidation)
      }
    }

    // Validate address is within service area
    if (!validateServiceArea(placeForValidation)) {
      return
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(':')
    const dateTime = new Date(selectedDate)
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    // Prepare submission data
    const submissionData = {
      ...formData,
      phone: phone,
      device: formData.device.value,
      deviceLabel: formData.device.label,
      dateTime: dateTime.toISOString(),
      coordinates: placeForValidation
    }

    let booking = null

    try {
      booking = await withTimeout(
        sendBookingData(submissionData),
        20000,
        'La reservation prend trop de temps. Veuillez reessayer dans un instant.'
      )
    } catch (bookingError) {
      console.error('Booking submit error:', bookingError)
      toast.error(bookingError?.message || 'Impossible de terminer la reservation pour le moment.')
      return
    }

    if (!booking?.id) return

    setCreatedBooking(booking)
    hasCreatedOrderRef.current = false
    hasSentPayLaterEmailRef.current = false

    if (paymentOption === 'pay_now') {
      if (paymentGateway === 'stripe') {
        if (!isStripeReady || !stripeOptions) {
          toast.error('Le paiement Stripe est indisponible. Veuillez choisir une autre methode ou Paiement plus tard.')
          return
        }

        setBookingStep('stripe') 
        return
      }

      if (paymentGateway === 'sumup') {
        setBookingStep('sumup')
        return
      }

      // Fallback if no valid gateway selected
      toast.error('Methode de paiement invalide. Veuillez reessayer.')
      return
    }

    setBookingStep('success')
    toast.success('Reservation confirmee! Un email de confirmation vous a ete envoye.')
  }

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'var(--input)',  
      borderColor: 'var(--border)',
      borderWidth: '1px',
      borderRadius: '8px',
      opacity: isLoading ? 0.6 : 1,
      '&:hover': {
        border: '1px solid var(--accent)'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'var(--accent)' : 'white',
      color: state.isSelected ? 'white' : 'black',
      '&:hover': {
        backgroundColor: state.isSelected ? 'var(--accent)' : 'var(--accent-100)'
      }
    })
  }

  const timeSlots = generateTimeSlots()

  if (bookingStep === 'stripe' && createdBooking?.id) {
    return (
      <div className="booking-form-container">
        <div ref={stripeStepTopRef} />
        {stripeOptions && stripePromise && isStripeReady ? (
          <Elements stripe={stripePromise} options={stripeOptions}>
            <BookingStripePaymentStep
              bookingId={createdBooking.id}
              bookingAmount={bookingAmount}
              bookingCurrency={bookingCurrency}
              customerEmail={formData.email}
              onBack={() => setBookingStep('form')}
              onPaymentSuccess={async () => {
                try {
                  await createOrderFromBooking(createdBooking, {
                    paymentMethod: 'card',
                    paymentStatus: 'paid',
                    status: 'processing'
                  })
                } catch (orderError) {
                  console.error('Order creation after Stripe payment error:', orderError)
                }

                try {
                  await withTimeout(
                    sendBookingEmails(createdBooking),
                    15000,
                    'Email timeout after successful Stripe payment'
                  )
                } catch (emailError) {
                  console.error('Booking email after payment error:', emailError)
                }

                router.push(`/booking/success?id=${createdBooking.id}&payment_method=stripe`)
              }}
            />
          </Elements>
        ) : (
          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">Le paiement en ligne est indisponible actuellement.</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => setBookingStep('form')}>
              Retour au formulaire
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (bookingStep === 'sumup' && createdBooking?.id) {
    return (
      <div className="booking-form-container">
        <div ref={stripeStepTopRef} />
        <BookingSumUpPaymentStep
          bookingId={createdBooking.id}
          bookingAmount={bookingAmount}
          bookingCurrency={bookingCurrency}
          customerEmail={formData.email}
          onBack={() => setBookingStep('form')}
          onPaymentSuccess={async () => {
            try {
              await createOrderFromBooking(createdBooking, {
                paymentMethod: 'sumup',
                paymentStatus: 'paid',
                status: 'processing'
              })
            } catch (orderError) {
              console.error('Order creation after SumUp payment error:', orderError)
            }

            try {
              await withTimeout(
                sendBookingEmails(createdBooking),
                15000,
                'Email timeout after successful SumUp payment'
              )
            } catch (emailError) {
              console.error('Booking email after payment error:', emailError)
            }

            router.push(`/booking/success?id=${createdBooking.id}&payment_method=sumup`)
          }}
        />
      </div>
    )
  }

  if (bookingStep === 'success' && createdBooking?.id) {
    return (
      <div className="booking-form-container p-2">
        <div ref={successStepTopRef} />
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <h3 className="text-lg font-semibold">Reservation confirmee</h3>
          <p className="text-sm text-muted-foreground">
            Merci {formData.name}, votre demande a bien ete enregistree.
          </p>
          <p className="text-sm">
            Reference de reservation: <span className="font-semibold">{createdBooking.id}</span>
          </p>
          <Button type="button" className="w-full" onClick={() => router.push(`/booking/success?id=${createdBooking.id}`)}>
            Voir la confirmation
          </Button>
        </div>
      </div>
    )
  }

  return (
      <div className="booking-form-container"> 
        <div ref={formStepTopRef} /> 
        <form
            id="booking"
            className="booking-form"
            onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
                id="name"
                name="name"
                placeholder="Votre nom"
              autoFocus={false}
                required
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
                id="email"
                name="email"
                type="email"
                placeholder="Votre email"
              autoFocus={false}
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
            />
          </div>

        <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <PhoneInput
                defaultCountry={countryIso}
                value={phone}
                onChange={setPhone}
              autoFocus={false}
                className={`opacity-${isLoading ? 60 : 100}`}
                disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse complète</Label>
            <GooglePlacesInput
                legacy={true}
                value={formData.address}
                onChange={handleAddressChange}
                onPlaceSelected={handleAddressPlaceSelected}
                autoFocus={false}
                onError={(message) => {
                  console.warn('GooglePlacesInput error:', message)
                }}
                hasError={false}
                placeholder="Adresse complète"
                apiKey={googleMapsApiKey}
                countryRestriction={countryIso}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device">Type d'appareil</Label>
            <Select
                id="device"
                name="device"
                options={deviceOptions}  
                placeholder="Type d'appareil"
              autoFocus={false}
                value={formData.device}
                onChange={handleDeviceChange}
                styles={customStyles}
                required
                isDisabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date de l'intervention</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal h-9 ${!selectedDate ? 'text-muted-foreground' : ''}`}
                    disabled={isLoading}
                >
                  <FaCalendar className="mr-2 h-4 w-4" />
                  {selectedDate ? formatDate(selectedDate) : 'Sélectionnez une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousMonth}
                        disabled={currentYear === new Date().getFullYear() && currentMonth === new Date().getMonth()}
                    >
                      <FaChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold">
                      {new Date(currentYear, currentMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={goToNextMonth}
                    >
                      <FaChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                          {day}
                        </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays(currentYear, currentMonth).map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="p-2" />
                      }
                      const isDisabled = isPastDate(day) || isDateDisabled(day)
                      const isSelected = isSameDay(day, selectedDate)
                      return (
                          <Button
                              key={day.toISOString()}
                              type="button"
                              variant={isSelected ? 'default' : 'ghost'}
                              size="sm"
                              className={`h-9 w-9 p-0 font-normal ${
                                  isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                              } ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                              disabled={isDisabled}
                              onClick={() => {
                                setSelectedDate(day)
                                setSelectedTime('') // Reset time when date changes
                                setIsDatePickerOpen(false)
                              }}
                          >
                            {day.getDate()}
                          </Button>
                      )
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Heure de l'intervention</Label>
            <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal h-9 ${!selectedTime ? 'text-muted-foreground' : ''}`}
                    disabled={isLoading || !selectedDate}
                >
                  <FaClock className="mr-2 h-4 w-4" />
                  {selectedTime || 'Sélectionnez une heure'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                  {timeSlots.length > 0 ? (
                      timeSlots.map((slot) => (
                          <Button
                              key={slot}
                              type="button"
                              variant={selectedTime === slot ? 'default' : 'outline'}
                              size="sm"
                              className="h-9"
                              onClick={() => {
                                setSelectedTime(slot)
                                setIsTimePickerOpen(false)
                              }}
                          >
                            {slot}
                          </Button>
                      ))
                  ) : (
                      <div className="col-span-3 text-center text-sm text-muted-foreground p-4">
                        {selectedDate && isDateDisabled(selectedDate)
                            ? 'Aucun créneau disponible le dimanche'
                            : 'Sélectionnez d\'abord une date'}
                      </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue">Problème technique (optionnel)</Label>
            <Textarea
                id="issue"
                name="issue"
                className="bg-input border border-border"
                placeholder="Décrivez votre problème technique (optionnel)"
              autoFocus={false}
                rows={3}
                value={formData.issue}
                onChange={handleChange}
                disabled={isLoading}
            />
          </div>

          {turnstileKey && (
              <Turnstile
                  sitekey={turnstileKey}
                  theme="light"
                  size="flexible"
                  onVerify={() => setIsTurnstileVerified(true)}
              />
          )}

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold">Mode de paiement</Label>
              <span className="text-xs font-medium text-muted-foreground">Diagnostic: 29,00 EUR</span>
            </div>

            <div className="grid gap-2">
              <label
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  paymentOption === 'pay_now'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/40'
                }`}>
                <input
                  type="radio"
                  name="paymentOption"
                  value="pay_now"
                  checked={paymentOption === 'pay_now'}
                  onChange={(e) => setPaymentOption(e.target.value)}
                  disabled={isLoading}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">Payer maintenant</p>
                    <p className="text-xs text-muted-foreground">Passez au paiement en ligne apres validation du formulaire.</p>
                  </div>
                  <span className={`h-4 w-4 rounded-full border-2 ${paymentOption === 'pay_now' ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                </div>
              </label>

              {paymentOption === 'pay_now' && bothPaymentMethodsAvailable && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-primary/20 pl-3">
                  {bothPaymentMethodsAvailable && (
                    <p className="text-xs font-medium text-muted-foreground mb-2">Choisissez votre methode de paiement:</p>
                  )}
                  
                  {isStripeAvailable && bothPaymentMethodsAvailable && (
                    <label
                      className={`cursor-pointer rounded-lg border p-2 transition-colors block ${
                        paymentGateway === 'stripe'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/40'
                      }`}>
                      <input
                        type="radio"
                        name="paymentGateway"
                        value="stripe"
                        checked={paymentGateway === 'stripe'}
                        onChange={(e) => setPaymentGateway(e.target.value)}
                        disabled={isLoading}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm">Carte bancaire (Stripe)</span>
                        <span className={`h-3 w-3 rounded-full border-2 ${paymentGateway === 'stripe' ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                      </div>
                    </label>
                  )}

                  {isSumUpAvailable && bothPaymentMethodsAvailable && (
                    <label
                      className={`cursor-pointer rounded-lg border p-2 transition-colors block ${
                        paymentGateway === 'sumup'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/40'
                      }`}>
                      <input
                        type="radio"
                        name="paymentGateway"
                        value="sumup"
                        checked={paymentGateway === 'sumup'}
                        onChange={(e) => setPaymentGateway(e.target.value)}
                        disabled={isLoading}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm">Carte bancaire (SumUp)</span>
                        <span className={`h-3 w-3 rounded-full border-2 ${paymentGateway === 'sumup' ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                      </div>
                    </label>
                  )}
 
                </div>
              )}

              <label
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  paymentOption === 'pay_later'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/40'
                }`}>
                <input
                  type="radio"
                  name="paymentOption"
                  value="pay_later"
                  checked={paymentOption === 'pay_later'}
                  onChange={(e) => setPaymentOption(e.target.value)}
                  disabled={isLoading}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">Payer plus tard</p>
                    <p className="text-xs text-muted-foreground">Confirmez la reservation maintenant et reglez ulterieurement.</p>
                  </div>
                  <span className={`h-4 w-4 rounded-full border-2 ${paymentOption === 'pay_later' ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                </div>
              </label>
            </div>
          </div>

          <div className="booking-form-call-action">
            <Button 
                type="submit" 
                size="xl"
                className="w-full"
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.6 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
            >
              {isLoading
                ? "Réservation en cours..."
                : paymentOption === 'pay_now'
                  ? 'Continuer vers le paiement'
                  : 'Réserver mon intervention'}
            </Button>
          </div> 
          
        </form>
      </div>
  )
}

export default BookingForm

export const IGEL_SERVICES = [
    { id: 'attest', name: 'Ärztliches Attest', price: 15.00, description: 'Einfaches Attest für Schule oder Arbeit.' },
    { id: 'vit_c', name: 'Vitamin-C-Infusion', price: 45.00, description: 'Zur Stärkung des Immunsystems.' },
    { id: 'sport_check', name: 'Sport-Checkup', price: 85.00, description: 'Inkl. Belastungs-EKG und Beratung.' },
    { id: 'travel_med', name: 'Reisemedizinische Beratung', price: 30.00, description: 'Individuelle Impfberatung für Ihr Reiseziel.' }
];

export class PaymentService {
    /**
     * Simuliert die Erstellung eines Stripe/PayPal Checkout-Links
     */
    static async createCheckoutSession(serviceId: string, _email: string) {
        const service = IGEL_SERVICES.find(s => s.id === serviceId);
        if (!service) throw new Error('Service not found');

        console.log(`[Payment] Erstelle Checkout für ${service.name} (${service.price}€)`);

        // Simulation einer externen URL
        return {
            checkoutUrl: `https://checkout.stripe.com/pay/mock_${Math.random().toString(36).substring(7)}`,
            serviceName: service.name,
            price: service.price
        };
    }
}

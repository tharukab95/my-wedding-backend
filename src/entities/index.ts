// Export all entities for easy importing
export { User } from './user.entity';
export { MatrimonialAd } from './matrimonial-ad.entity';
export { AdPhoto } from './ad-photo.entity';
export { AdHoroscope } from './ad-horoscope.entity';
// PreferredProfession and PreferredHabit entities removed - now using LookingForPreferences
export { Match } from './match.entity';
export { Notification } from './notification.entity';
export { Message } from './message.entity';

// Legacy entities (keeping for backward compatibility)
export { InterestRequest } from './interest-request.entity';
export { ContactExchange } from './contact-exchange.entity';

// New optimized entities
export { LookingForPreferences } from './looking-for-preferences.entity';

// Payment entities
export { PricingPlan } from './pricing-plan.entity';
export { Payment } from './payment.entity';

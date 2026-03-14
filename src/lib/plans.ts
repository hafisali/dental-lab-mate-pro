export type PlanTier = "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  price: number; // monthly in USD
  yearlyPrice: number; // yearly total in USD
  maxUsers: number; // -1 = unlimited
  maxPatients: number;
  maxCasesPerMonth: number;
  maxStorageMB: number;
  features: string[];
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  popular?: boolean;
  description: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  TRIAL: {
    name: "Free Trial",
    tier: "TRIAL",
    price: 0,
    yearlyPrice: 0,
    maxUsers: 2,
    maxPatients: 50,
    maxCasesPerMonth: 20,
    maxStorageMB: 500,
    features: [
      "Dashboard & Analytics",
      "Case Management",
      "Patient Records",
      "Dentist Management",
      "Basic Billing",
      "2 Team Members",
      "Email Support",
    ],
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    description: "Try all features free for 14 days",
  },
  STARTER: {
    name: "Starter",
    tier: "STARTER",
    price: 29,
    yearlyPrice: 290,
    maxUsers: 5,
    maxPatients: 500,
    maxCasesPerMonth: 200,
    maxStorageMB: 5120,
    features: [
      "Everything in Trial",
      "Appointments Calendar",
      "Inventory Management",
      "Advanced Analytics",
      "Cash Flow Reports",
      "5 Team Members",
      "5 GB Storage",
      "Priority Email Support",
    ],
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY || "",
    stripePriceIdYearly: process.env.STRIPE_STARTER_YEARLY || "",
    description: "For small clinics getting started",
  },
  PROFESSIONAL: {
    name: "Professional",
    tier: "PROFESSIONAL",
    price: 79,
    yearlyPrice: 790,
    maxUsers: 20,
    maxPatients: 5000,
    maxCasesPerMonth: 2000,
    maxStorageMB: 51200,
    features: [
      "Everything in Starter",
      "Prescriptions",
      "Orthodontics Module",
      "Pharmacy Management",
      "Staff & Payroll",
      "WhatsApp Integration",
      "Medical Certificates",
      "20 Team Members",
      "50 GB Storage",
      "Phone & Chat Support",
    ],
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY || "",
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY || "",
    popular: true,
    description: "For growing clinics and labs",
  },
  ENTERPRISE: {
    name: "Enterprise",
    tier: "ENTERPRISE",
    price: 199,
    yearlyPrice: 1990,
    maxUsers: -1,
    maxPatients: -1,
    maxCasesPerMonth: -1,
    maxStorageMB: 512000,
    features: [
      "Everything in Professional",
      "Unlimited Team Members",
      "Unlimited Patients",
      "Unlimited Cases",
      "Multi-Branch Support",
      "Custom Branding",
      "API Access",
      "500 GB Storage",
      "Dedicated Account Manager",
      "Custom Integrations",
      "SLA Guarantee",
    ],
    stripePriceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY || "",
    stripePriceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY || "",
    description: "For large practices and chains",
  },
};

export function getPlanLimits(tier: PlanTier) {
  return PLANS[tier];
}

export function canAccessFeature(tier: PlanTier, feature: string): boolean {
  const gatedFeatures: Record<string, PlanTier[]> = {
    prescriptions: ["PROFESSIONAL", "ENTERPRISE"],
    orthodontics: ["PROFESSIONAL", "ENTERPRISE"],
    pharmacy: ["PROFESSIONAL", "ENTERPRISE"],
    staff: ["PROFESSIONAL", "ENTERPRISE"],
    whatsapp: ["PROFESSIONAL", "ENTERPRISE"],
    inventory: ["STARTER", "PROFESSIONAL", "ENTERPRISE"],
    analytics: ["STARTER", "PROFESSIONAL", "ENTERPRISE"],
    cashflow: ["STARTER", "PROFESSIONAL", "ENTERPRISE"],
    api: ["ENTERPRISE"],
    "multi-branch": ["ENTERPRISE"],
    "custom-branding": ["ENTERPRISE"],
  };

  const allowedTiers = gatedFeatures[feature];
  if (!allowedTiers) return true; // Feature not gated
  return allowedTiers.includes(tier);
}

export function isTrialExpired(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > new Date(trialEndsAt);
}

export function getDaysRemaining(endDate: Date | null): number {
  if (!endDate) return 0;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

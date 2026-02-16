"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  subscriptionServiceAccounts,
  subscriptions,
  transactions,
  wallet,
} from "@/db/schema";
import { requireSession } from "@/lib/require-session";

type PlanConfig = {
  code: string;
  planName: string;
  durationMonths: number;
  members: number;
  basePrice: number;
};

type ServiceConfig = {
  serviceName: string;
  plans: PlanConfig[];
};

const serviceCatalog: Record<string, ServiceConfig> = {
  netflix: {
    serviceName: "Netflix",
    plans: [
      { code: "mobile", planName: "Mobile", durationMonths: 1, members: 1, basePrice: 149 },
      { code: "standard", planName: "Standard", durationMonths: 1, members: 2, basePrice: 499 },
      { code: "premium", planName: "Premium", durationMonths: 1, members: 4, basePrice: 649 },
    ],
  },
  "amazon-prime": {
    serviceName: "Amazon Prime",
    plans: [
      { code: "monthly", planName: "Monthly", durationMonths: 1, members: 1, basePrice: 299 },
      { code: "quarterly", planName: "Quarterly", durationMonths: 3, members: 1, basePrice: 599 },
      { code: "yearly", planName: "Yearly", durationMonths: 12, members: 2, basePrice: 1499 },
    ],
  },
  "disney-plus": {
    serviceName: "Disney+",
    plans: [
      { code: "super", planName: "Super", durationMonths: 1, members: 1, basePrice: 199 },
      { code: "premium", planName: "Premium", durationMonths: 1, members: 4, basePrice: 299 },
      { code: "annual", planName: "Premium Annual", durationMonths: 12, members: 4, basePrice: 1499 },
    ],
  },
  "hbo-max": {
    serviceName: "HBO Max",
    plans: [
      { code: "basic", planName: "Basic", durationMonths: 1, members: 1, basePrice: 349 },
      { code: "standard", planName: "Standard", durationMonths: 1, members: 2, basePrice: 499 },
      { code: "ultimate", planName: "Ultimate", durationMonths: 1, members: 4, basePrice: 699 },
    ],
  },
  "apple-tv-plus": {
    serviceName: "Apple TV+",
    plans: [
      { code: "individual", planName: "Individual", durationMonths: 1, members: 1, basePrice: 99 },
      { code: "family", planName: "Family", durationMonths: 1, members: 5, basePrice: 199 },
      { code: "annual", planName: "Annual", durationMonths: 12, members: 5, basePrice: 899 },
    ],
  },
  spotify: {
    serviceName: "Spotify",
    plans: [
      { code: "mini", planName: "Mini", durationMonths: 1, members: 1, basePrice: 79 },
      { code: "individual", planName: "Individual", durationMonths: 1, members: 1, basePrice: 119 },
      { code: "family", planName: "Family", durationMonths: 1, members: 6, basePrice: 179 },
    ],
  },
  "apple-music": {
    serviceName: "Apple Music",
    plans: [
      { code: "individual", planName: "Individual", durationMonths: 1, members: 1, basePrice: 99 },
      { code: "family", planName: "Family", durationMonths: 1, members: 6, basePrice: 149 },
      { code: "annual", planName: "Annual", durationMonths: 12, members: 6, basePrice: 999 },
    ],
  },
  "youtube-music": {
    serviceName: "YouTube Music",
    plans: [
      { code: "individual", planName: "Individual", durationMonths: 1, members: 1, basePrice: 119 },
      { code: "family", planName: "Family", durationMonths: 1, members: 5, basePrice: 179 },
      { code: "annual", planName: "Annual", durationMonths: 12, members: 5, basePrice: 1299 },
    ],
  },
  gaana: {
    serviceName: "Gaana",
    plans: [
      { code: "plus", planName: "Plus", durationMonths: 1, members: 1, basePrice: 99 },
      { code: "quarterly", planName: "Quarterly", durationMonths: 3, members: 1, basePrice: 249 },
      { code: "annual", planName: "Annual", durationMonths: 12, members: 2, basePrice: 699 },
    ],
  },
  jiosaavn: {
    serviceName: "JioSaavn",
    plans: [
      { code: "pro", planName: "Pro", durationMonths: 1, members: 1, basePrice: 99 },
      { code: "quarterly", planName: "Quarterly", durationMonths: 3, members: 1, basePrice: 269 },
      { code: "annual", planName: "Annual", durationMonths: 12, members: 2, basePrice: 799 },
    ],
  },
  "google-one": {
    serviceName: "Google One",
    plans: [
      { code: "basic", planName: "Basic 100 GB", durationMonths: 1, members: 1, basePrice: 130 },
      { code: "standard", planName: "Standard 200 GB", durationMonths: 1, members: 2, basePrice: 210 },
      { code: "premium", planName: "Premium 2 TB", durationMonths: 1, members: 5, basePrice: 650 },
    ],
  },
  "microsoft-365": {
    serviceName: "Microsoft 365",
    plans: [
      { code: "personal", planName: "Personal", durationMonths: 1, members: 1, basePrice: 489 },
      { code: "family", planName: "Family", durationMonths: 1, members: 6, basePrice: 699 },
      { code: "annual", planName: "Family Annual", durationMonths: 12, members: 6, basePrice: 4899 },
    ],
  },
  "canva-pro": {
    serviceName: "Canva Pro",
    plans: [
      { code: "creator", planName: "Creator", durationMonths: 1, members: 1, basePrice: 499 },
      { code: "team", planName: "Team", durationMonths: 1, members: 3, basePrice: 899 },
      { code: "team-annual", planName: "Team Annual", durationMonths: 12, members: 5, basePrice: 4999 },
    ],
  },
  "notion-pro": {
    serviceName: "Notion Pro",
    plans: [
      { code: "plus", planName: "Plus", durationMonths: 1, members: 1, basePrice: 349 },
      { code: "business", planName: "Business", durationMonths: 1, members: 5, basePrice: 699 },
      { code: "business-annual", planName: "Business Annual", durationMonths: 12, members: 10, basePrice: 3499 },
    ],
  },
  "chatgpt-plus": {
    serviceName: "ChatGPT Plus (simulated)",
    plans: [
      { code: "solo", planName: "Solo", durationMonths: 1, members: 1, basePrice: 1999 },
      { code: "duo", planName: "Duo", durationMonths: 1, members: 2, basePrice: 3499 },
      { code: "team", planName: "Team", durationMonths: 1, members: 5, basePrice: 6999 },
    ],
  },
  "xbox-game-pass": {
    serviceName: "Xbox Game Pass",
    plans: [
      { code: "core", planName: "Core", durationMonths: 1, members: 1, basePrice: 349 },
      { code: "console", planName: "Console", durationMonths: 1, members: 1, basePrice: 549 },
      { code: "ultimate", planName: "Ultimate", durationMonths: 1, members: 2, basePrice: 999 },
    ],
  },
  "playstation-plus": {
    serviceName: "PlayStation Plus",
    plans: [
      { code: "essential", planName: "Essential", durationMonths: 1, members: 1, basePrice: 499 },
      { code: "extra", planName: "Extra", durationMonths: 1, members: 2, basePrice: 749 },
      { code: "deluxe", planName: "Deluxe", durationMonths: 1, members: 3, basePrice: 849 },
    ],
  },
  "steam-wallet": {
    serviceName: "Steam Wallet",
    plans: [
      { code: "starter", planName: "Starter Credits", durationMonths: 1, members: 1, basePrice: 500 },
      { code: "gamer", planName: "Gamer Credits", durationMonths: 1, members: 1, basePrice: 1500 },
      { code: "pro", planName: "Pro Credits", durationMonths: 1, members: 1, basePrice: 3000 },
    ],
  },
  "coursera-plus": {
    serviceName: "Coursera Plus",
    plans: [
      { code: "monthly", planName: "Monthly", durationMonths: 1, members: 1, basePrice: 3999 },
      { code: "quarterly", planName: "Quarterly", durationMonths: 3, members: 1, basePrice: 9999 },
      { code: "annual", planName: "Annual", durationMonths: 12, members: 1, basePrice: 27999 },
    ],
  },
  "udemy-pro": {
    serviceName: "Udemy Pro",
    plans: [
      { code: "monthly", planName: "Monthly", durationMonths: 1, members: 1, basePrice: 999 },
      { code: "quarterly", planName: "Quarterly", durationMonths: 3, members: 1, basePrice: 2499 },
      { code: "annual", planName: "Annual", durationMonths: 12, members: 1, basePrice: 8999 },
    ],
  },
  masterclass: {
    serviceName: "MasterClass",
    plans: [
      { code: "individual", planName: "Individual", durationMonths: 1, members: 1, basePrice: 999 },
      { code: "duo", planName: "Duo", durationMonths: 1, members: 2, basePrice: 1499 },
      { code: "family", planName: "Family", durationMonths: 1, members: 6, basePrice: 1999 },
    ],
  },
};

function getPlanForCheckout(serviceConfig: ServiceConfig, planCode: string) {
  const exact = serviceConfig.plans.find((plan) => plan.code === planCode);
  if (exact) return exact;

  const standardSeed =
    serviceConfig.plans.find((plan) => plan.code === "standard") ??
    serviceConfig.plans[0];
  if (!standardSeed) return null;

  if (planCode === "basic") {
    return {
      code: "basic",
      planName: "Basic",
      durationMonths: 1,
      members: 1,
      basePrice: Math.round(standardSeed.basePrice * 0.7),
    } satisfies PlanConfig;
  }

  if (planCode === "standard") {
    return {
      code: "standard",
      planName: "Standard",
      durationMonths: 1,
      members: 2,
      basePrice: standardSeed.basePrice,
    } satisfies PlanConfig;
  }

  if (planCode === "premium") {
    return {
      code: "premium",
      planName: "Premium",
      durationMonths: 1,
      members: 4,
      basePrice: Math.round(standardSeed.basePrice * 1.35),
    } satisfies PlanConfig;
  }

  return null;
}

function redirectToSubscriptions(params: Record<string, string | undefined>): never {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  redirect(`/subscriptions?${query.toString()}`);
}

function normalizeEmail(input: FormDataEntryValue | null) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
}

function readRequiredText(input: FormDataEntryValue | null) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readTermsAccepted(input: FormDataEntryValue | null) {
  return input === "on" || input === "true";
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonthsFromNow(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.max(1, months));
  return formatDate(date);
}

export async function loginServiceAccountAction(formData: FormData) {
  const session = await requireSession();

  const serviceKey = readRequiredText(formData.get("serviceKey"));
  const email = normalizeEmail(formData.get("email"));
  const password = readRequiredText(formData.get("password"));
  const termsAccepted = readTermsAccepted(formData.get("termsAccepted"));

  if (!serviceKey || !email || !password) {
    redirectToSubscriptions({
      step: "2",
      mode: "login",
      service: serviceKey ?? undefined,
      error: "Fill all required login fields",
    });
  }

  if (!termsAccepted) {
    redirectToSubscriptions({
      step: "2",
      mode: "login",
      service: serviceKey,
      error: "Accept terms and conditions to continue",
    });
  }

  const [account] = await db
    .select()
    .from(subscriptionServiceAccounts)
    .where(
      and(
        eq(subscriptionServiceAccounts.userId, session.user.id),
        eq(subscriptionServiceAccounts.serviceKey, serviceKey),
        eq(subscriptionServiceAccounts.email, email),
      ),
    )
    .limit(1);

  if (!account) {
    const serviceConfig = serviceCatalog[serviceKey];

    const [createdAccount] = await db
      .insert(subscriptionServiceAccounts)
      .values({
        userId: session.user.id,
        serviceKey,
        serviceName: serviceConfig?.serviceName ?? serviceKey,
        username: email.split("@")[0] ?? "user",
        email,
        passwordHash: hashPassword(password),
        passwordPlain: password,
        acceptedTerms: true,
      })
      .returning({
        id: subscriptionServiceAccounts.id,
      });

    redirectToSubscriptions({
      step: "3",
      service: serviceKey,
      account: createdAccount.id,
      success: "Logged in",
    });
  }

  if (!verifyPassword(password, account.passwordHash)) {
    await db
      .update(subscriptionServiceAccounts)
      .set({ passwordHash: hashPassword(password), passwordPlain: password })
      .where(eq(subscriptionServiceAccounts.id, account.id));
  } else {
    await db
      .update(subscriptionServiceAccounts)
      .set({ passwordPlain: password })
      .where(eq(subscriptionServiceAccounts.id, account.id));
  }

  redirectToSubscriptions({
    step: "3",
    service: serviceKey,
    account: account.id,
    success: "Logged in",
  });
}

export async function registerServiceAccountAction(formData: FormData) {
  const session = await requireSession();

  const serviceKey = readRequiredText(formData.get("serviceKey"));
  const serviceName = readRequiredText(formData.get("serviceName"));
  const username = readRequiredText(formData.get("username"));
  const email = normalizeEmail(formData.get("email"));
  const password = readRequiredText(formData.get("password"));
  const confirmPassword = readRequiredText(formData.get("confirmPassword"));
  const termsAccepted = readTermsAccepted(formData.get("termsAccepted"));

  if (!serviceKey || !serviceName || !username || !email || !password || !confirmPassword) {
    redirectToSubscriptions({
      step: "2",
      mode: "register",
      service: serviceKey ?? undefined,
      error: "Fill all required registration fields",
    });
  }

  if (password !== confirmPassword) {
    redirectToSubscriptions({
      step: "2",
      mode: "register",
      service: serviceKey,
      error: "Passwords do not match",
    });
  }

  if (!termsAccepted) {
    redirectToSubscriptions({
      step: "2",
      mode: "register",
      service: serviceKey,
      error: "Accept terms and conditions to continue",
    });
  }

  const [existingAccount] = await db
    .select({ id: subscriptionServiceAccounts.id })
    .from(subscriptionServiceAccounts)
    .where(
      and(
        eq(subscriptionServiceAccounts.userId, session.user.id),
        eq(subscriptionServiceAccounts.serviceKey, serviceKey),
        eq(subscriptionServiceAccounts.email, email),
      ),
    )
    .limit(1);

  if (existingAccount) {
    redirectToSubscriptions({
      step: "2",
      mode: "register",
      service: serviceKey,
      error: "Account already exists for this service and email",
    });
  }

  const [createdAccount] = await db
    .insert(subscriptionServiceAccounts)
    .values({
      userId: session.user.id,
      serviceKey,
      serviceName,
      username,
      email,
      passwordHash: hashPassword(password),
      passwordPlain: password,
      acceptedTerms: true,
    })
    .returning({ id: subscriptionServiceAccounts.id });

  redirectToSubscriptions({
    step: "3",
    service: serviceKey,
    account: createdAccount.id,
    trialEligible: "1",
    success: `Account created for ${serviceName}`,
  });
}

export async function checkoutSubscriptionAction(formData: FormData) {
  const session = await requireSession();

  const serviceKey = readRequiredText(formData.get("serviceKey"));
  const accountId = readRequiredText(formData.get("accountId"));
  const planCode = readRequiredText(formData.get("planCode"));
  const useFreeTrial = planCode === "free-trial";

  if (!serviceKey || !accountId || !planCode) {
    redirectToSubscriptions({ step: "1", error: "Missing checkout details" });
  }

  const serviceConfig = serviceCatalog[serviceKey];
  const selectedPlan = serviceConfig ? getPlanForCheckout(serviceConfig, planCode) : null;
  const recurringSeedPlan =
    serviceConfig?.plans.find((plan) => plan.code === "standard") ??
    serviceConfig?.plans[0] ??
    null;

  if (!serviceConfig || (!selectedPlan && !useFreeTrial) || !recurringSeedPlan) {
    redirectToSubscriptions({ step: "1", error: "Invalid service selection" });
  }

  const checkoutPlan = useFreeTrial
    ? {
        code: "free-trial",
        planName: "Free Trial",
        durationMonths: 1,
        members: recurringSeedPlan.members,
        basePrice: 0,
      }
    : selectedPlan!;

  const [account] = await db
    .select()
    .from(subscriptionServiceAccounts)
    .where(
      and(
        eq(subscriptionServiceAccounts.id, accountId),
        eq(subscriptionServiceAccounts.userId, session.user.id),
        eq(subscriptionServiceAccounts.serviceKey, serviceKey),
      ),
    )
    .limit(1);

  if (!account) {
    redirectToSubscriptions({ step: "2", service: serviceKey, mode: "login", error: "Please login first" });
  }

  const [userWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);

  if (!userWallet) {
    redirectToSubscriptions({
      step: "4",
      service: serviceKey,
      account: accountId,
      error: "Wallet not found",
    });
  }

  const basePrice = checkoutPlan.basePrice;
  const gstAmount = useFreeTrial ? 0 : round2(basePrice * 0.18);
  const totalPrice = useFreeTrial ? 0 : round2(basePrice + gstAmount);
  const walletBalance = Number.parseFloat(userWallet.balance);

  if (totalPrice > 0 && walletBalance < totalPrice) {
    redirectToSubscriptions({
      step: "4",
      service: serviceKey,
      account: accountId,
      plan: planCode,
      error: "Insufficient wallet balance",
    });
  }

  const monthlyCost = useFreeTrial
    ? round2(recurringSeedPlan.basePrice / Math.max(1, recurringSeedPlan.durationMonths))
    : round2(checkoutPlan.basePrice / Math.max(1, checkoutPlan.durationMonths));

  const [existingSubscription] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.serviceKey, serviceKey),
        eq(subscriptions.externalAccountEmail, account.email),
        eq(subscriptions.planName, checkoutPlan.planName),
        eq(subscriptions.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (existingSubscription) {
    redirectToSubscriptions({
      step: "3",
      service: serviceKey,
      account: accountId,
      trialEligible: "1",
      error: "Selected plan is already active for this account",
    });
  }

  if (totalPrice > 0) {
    const [debitedWallet] = await db
      .update(wallet)
      .set({ balance: sql`${wallet.balance} - ${totalPrice}` })
      .where(and(eq(wallet.id, userWallet.id), gte(wallet.balance, totalPrice.toFixed(2))))
      .returning({ id: wallet.id });

    if (!debitedWallet) {
      redirectToSubscriptions({
        step: "4",
      service: serviceKey,
      account: accountId,
      plan: planCode,
      trialEligible: useFreeTrial ? "1" : undefined,
      error: "Insufficient wallet balance",
    });
  }
  }

  const nextBillingDate = addMonthsFromNow(checkoutPlan.durationMonths);
  const [createdSubscription] = await db
    .insert(subscriptions)
    .values({
      userId: session.user.id,
      serviceName: serviceConfig.serviceName,
      serviceKey,
      planName: checkoutPlan.planName,
      planDurationMonths: checkoutPlan.durationMonths,
      planMembers: checkoutPlan.members,
      basePrice: basePrice.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      externalAccountEmail: account.email,
      externalAccountPassword: account.passwordPlain ?? null,
      freeTrialTaken: useFreeTrial,
      freeTrialEndsAt: useFreeTrial ? new Date(nextBillingDate) : null,
      pendingSince: null,
      monthlyCost: monthlyCost.toFixed(2),
      nextBillingDate,
      status: "ACTIVE",
    })
    .returning({ id: subscriptions.id });

  if (totalPrice > 0) {
    await db.insert(transactions).values({
      userId: session.user.id,
      walletId: userWallet.id,
      amount: totalPrice.toFixed(2),
      type: "DEBIT",
      referenceType: "SUBSCRIPTION_PURCHASE",
      referenceId: createdSubscription.id,
      description: `Purchased ${serviceConfig.serviceName} - ${checkoutPlan.planName}.`,
      status: "SUCCESSFUL",
    });
  }

  redirectToSubscriptions({
    step: "1",
    success: useFreeTrial
      ? `${serviceConfig.serviceName} free trial started`
      : `${serviceConfig.serviceName} subscription purchased successfully`,
  });
}

export async function cancelSubscriptionAction(formData: FormData) {
  const session = await requireSession();
  const subscriptionId = readRequiredText(formData.get("subscriptionId"));

  if (!subscriptionId) {
    redirectToSubscriptions({ step: "1", error: "Invalid subscription id" });
  }

  await db
    .update(subscriptions)
    .set({ status: "CANCELLED", pendingSince: null })
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.userId, session.user.id),
      ),
    );

  redirectToSubscriptions({ step: "1", success: "Subscription cancelled" });
}

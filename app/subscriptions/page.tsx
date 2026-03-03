import type React from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { IconType } from "react-icons";
import {
  FaCirclePlay,
  FaGraduationCap,
  FaHeadphones,
  FaMicrosoft,
  FaMusic,
  FaXbox,
} from "react-icons/fa6";
import {
  SiApplemusic,
  SiAppletv,
  SiCanva,
  SiCoursera,
  SiGoogle,
  SiHbo,
  SiNetflix,
  SiNotion,
  SiOpenai,
  SiPlaystation,
  SiPrimevideo,
  SiSpotify,
  SiSteam,
  SiUdemy,
  SiYoutubemusic,
} from "react-icons/si";
import {
  cancelSubscriptionAction,
  checkoutSubscriptionAction,
  loginServiceAccountAction,
  registerServiceAccountAction,
} from "@/app/subscriptions/actions";
import { CancelSubscriptionButton } from "@/app/subscriptions/cancel-button";
import { CheckoutPersist } from "@/app/subscriptions/checkout-persist";
import { CheckoutSubmitButton } from "@/app/subscriptions/checkout-submit-button";
import { PlanNextButton } from "@/app/subscriptions/plan-next-button";
import { PinGatedForm } from "@/app/wallet/pin-gated-form";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/db";
import { subscriptionServiceAccounts, subscriptions, transactions, wallet } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

type SubscriptionsPageProps = {
  searchParams?: Promise<{
    step?: string;
    service?: string;
    mode?: string;
    account?: string;
    plan?: string;
    trialEligible?: string;
    success?: string;
    error?: string;
  }>;
};

type PlanMeta = { code: string; name: string; durationMonths: number; members: number; basePrice: number };
type ServiceMeta = {
  key: string;
  name: string;
  category: string;
  icon: IconType;
  color: string;
  basePrice: number;
};

const services: ServiceMeta[] = [
  { key: "netflix", name: "Netflix", category: "Streaming", icon: SiNetflix, color: "#E50914", basePrice: 499 },
  { key: "amazon-prime", name: "Amazon Prime", category: "Streaming", icon: SiPrimevideo, color: "#00A8E1", basePrice: 299 },
  { key: "disney-plus", name: "Disney+", category: "Streaming", icon: FaCirclePlay, color: "#113CCF", basePrice: 199 },
  { key: "hbo-max", name: "HBO Max", category: "Streaming", icon: SiHbo, color: "#6C2CF7", basePrice: 349 },
  { key: "apple-tv-plus", name: "Apple TV+", category: "Streaming", icon: SiAppletv, color: "#111827", basePrice: 99 },
  { key: "spotify", name: "Spotify", category: "Music", icon: SiSpotify, color: "#1DB954", basePrice: 119 },
  { key: "apple-music", name: "Apple Music", category: "Music", icon: SiApplemusic, color: "#FA243C", basePrice: 99 },
  { key: "youtube-music", name: "YouTube Music", category: "Music", icon: SiYoutubemusic, color: "#FF0000", basePrice: 119 },
  { key: "gaana", name: "Gaana", category: "Music", icon: FaMusic, color: "#FF6A00", basePrice: 99 },
  { key: "jiosaavn", name: "JioSaavn", category: "Music", icon: FaHeadphones, color: "#2BC5B4", basePrice: 99 },
  { key: "google-one", name: "Google One", category: "Productivity", icon: SiGoogle, color: "#4285F4", basePrice: 130 },
  { key: "microsoft-365", name: "Microsoft 365", category: "Productivity", icon: FaMicrosoft, color: "#00A4EF", basePrice: 489 },
  { key: "canva-pro", name: "Canva Pro", category: "Productivity", icon: SiCanva, color: "#00C4CC", basePrice: 499 },
  { key: "notion-pro", name: "Notion Pro", category: "Productivity", icon: SiNotion, color: "#111111", basePrice: 349 },
  { key: "chatgpt-plus", name: "ChatGPT Plus (simulated)", category: "Productivity", icon: SiOpenai, color: "#10A37F", basePrice: 1999 },
  { key: "xbox-game-pass", name: "Xbox Game Pass", category: "Gaming", icon: FaXbox, color: "#107C10", basePrice: 349 },
  { key: "playstation-plus", name: "PlayStation Plus", category: "Gaming", icon: SiPlaystation, color: "#003087", basePrice: 499 },
  { key: "steam-wallet", name: "Steam Wallet", category: "Gaming", icon: SiSteam, color: "#1B2838", basePrice: 500 },
  { key: "coursera-plus", name: "Coursera Plus", category: "Learning", icon: SiCoursera, color: "#0056D2", basePrice: 3999 },
  { key: "udemy-pro", name: "Udemy Pro", category: "Learning", icon: SiUdemy, color: "#A435F0", basePrice: 999 },
  { key: "masterclass", name: "MasterClass", category: "Learning", icon: FaGraduationCap, color: "#B07A3F", basePrice: 999 },
];

const categoryOrder = ["Streaming", "Music", "Productivity", "Gaming", "Learning"];
const checkoutSteps = ["Choose Subscription", "Login", "Choose Plan", "Checkout"];

const buildPlans = (service: ServiceMeta): PlanMeta[] => [
  { code: "basic", name: "Basic", durationMonths: 1, members: 1, basePrice: Math.round(service.basePrice * 0.7) },
  { code: "standard", name: "Standard", durationMonths: 1, members: 2, basePrice: service.basePrice },
  { code: "premium", name: "Premium", durationMonths: 1, members: 4, basePrice: Math.round(service.basePrice * 1.35) },
];

const formatInr = (value: string | number) => {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "INR 0.00";
  return `INR ${num.toFixed(2)}`;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const addMonthsToDate = (dateInput: string | Date, months: number) => {
  const date = new Date(dateInput);
  date.setMonth(date.getMonth() + Math.max(1, months));
  return formatDate(date);
};

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const session = await requireSession();
  const query = (await searchParams) ?? {};
  const currentStep = Math.min(4, Math.max(1, Number.parseInt(query.step ?? "1", 10) || 1));
  const hasExplicitStep = query.step !== undefined;
  const mode = query.mode === "register" ? "register" : "login";
  const trialEligible = query.trialEligible === "1";

  const serviceLookup = new Map(services.map((service) => [service.key, service]));
  const selectedService = query.service ? serviceLookup.get(query.service) ?? null : null;

  const selectedAccount =
    selectedService && query.account
      ? (
          await db
            .select()
            .from(subscriptionServiceAccounts)
            .where(
              and(
                eq(subscriptionServiceAccounts.id, query.account),
                eq(subscriptionServiceAccounts.userId, session.user.id),
                eq(subscriptionServiceAccounts.serviceKey, selectedService.key),
              ),
            )
            .limit(1)
        )[0] ?? null
      : null;

  const activePlansForSelectedAccount =
    selectedService && selectedAccount
      ? await db
          .select({ planName: subscriptions.planName })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, session.user.id),
              eq(subscriptions.serviceKey, selectedService.key),
              eq(subscriptions.externalAccountEmail, selectedAccount.email),
              eq(subscriptions.status, "ACTIVE"),
            ),
          )
      : [];

  const activePlanNames = new Set(activePlansForSelectedAccount.map((x) => x.planName).filter(Boolean));
  const freeTrialPlan: PlanMeta = {
    code: "free-trial",
    name: "Free Trial",
    durationMonths: 1,
    members: 1,
    basePrice: 0,
  };
  const selectablePlans = selectedService
    ? [
        ...(trialEligible ? [freeTrialPlan] : []),
        ...buildPlans(selectedService),
      ].filter((plan) => !activePlanNames.has(plan.name))
    : [];
  const selectedPlan = query.plan ? selectablePlans.find((x) => x.code === query.plan) ?? null : null;
  const useFreeTrial = selectedPlan?.code === "free-trial";

  const [userWallet] = await db.select().from(wallet).where(eq(wallet.userId, session.user.id)).limit(1);

  const today = formatDate(new Date());
  const dueSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, session.user.id), eq(subscriptions.status, "ACTIVE"), lte(subscriptions.nextBillingDate, today)));

  if (userWallet && dueSubscriptions.length > 0) {
    for (const sub of dueSubscriptions) {
      const renewalAmount = Number.parseFloat(sub.monthlyCost);
      if (!Number.isFinite(renewalAmount) || renewalAmount <= 0) continue;
      const [debitedWallet] = await db
        .update(wallet)
        .set({ balance: sql`${wallet.balance} - ${renewalAmount}` })
        .where(and(eq(wallet.id, userWallet.id), gte(wallet.balance, renewalAmount.toFixed(2))))
        .returning({ id: wallet.id });

      if (debitedWallet) {
        await db
          .update(subscriptions)
          .set({ status: "ACTIVE", pendingSince: null, freeTrialTaken: false, nextBillingDate: addMonthsToDate(sub.nextBillingDate, 1) })
          .where(eq(subscriptions.id, sub.id));
        await db.insert(transactions).values({
          userId: session.user.id,
          walletId: userWallet.id,
          amount: renewalAmount.toFixed(2),
          type: "DEBIT",
          referenceType: "SUBSCRIPTION_RENEWAL",
          referenceId: sub.id,
          description: `Renewed ${sub.serviceName}.`,
          status: "SUCCESSFUL",
        });
      } else {
        await db.update(subscriptions).set({ status: "PENDING", pendingSince: new Date() }).where(eq(subscriptions.id, sub.id));
      }
    }
  }

  await db
    .update(subscriptions)
    .set({ status: "INACTIVE", pendingSince: null })
    .where(and(eq(subscriptions.userId, session.user.id), eq(subscriptions.status, "PENDING"), lte(subscriptions.pendingSince, sql`now() - interval '10 seconds'`)));

  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, session.user.id)).orderBy(desc(subscriptions.createdAt));

  const gstAmount = selectedPlan ? selectedPlan.basePrice * 0.18 : 0;
  const totalAmount = selectedPlan ? selectedPlan.basePrice + gstAmount : 0;
  const checkoutBase = useFreeTrial ? 0 : selectedPlan?.basePrice ?? 0;
  const checkoutGst = useFreeTrial ? 0 : gstAmount;
  const checkoutTotal = useFreeTrial ? 0 : totalAmount;

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 60)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar user={{ name: session.user.name ?? "User", email: session.user.email }} variant="inset" />
      <SidebarInset>
        <SiteHeader title="Subscriptions" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          <CheckoutPersist currentStep={currentStep} hasExplicitStep={hasExplicitStep} paymentSuccess={!!query.success} />
          {query.success ? <p className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-400">{query.success}</p> : null}
          {query.error ? <p className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">{query.error}</p> : null}

          <section className="rounded-xl border p-4 sm:p-6">
            <p className="text-sm font-medium text-muted-foreground">Checkout steps</p>
            <div className="mt-4 grid gap-2 grid-cols-2 sm:gap-3 md:grid-cols-4">
              {checkoutSteps.map((step, index) => (
                <div key={step} className={`rounded-lg border p-3 text-sm ${index + 1 === currentStep ? "border-primary bg-primary/5 font-medium" : "text-muted-foreground"}`}>
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          </section>

          {currentStep === 1 ? (
            <section className="rounded-xl border p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Step 1: Choose Subscription</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select an app or website to continue.</p>
              <div className="mt-6 space-y-6">
                {categoryOrder.map((category) => (
                  <div key={category}>
                    <h3 className="mb-3 text-base font-semibold">{category}</h3>
                    <div className="flex flex-wrap gap-3">
                      {services.filter((service) => service.category === category).map((service) => (
                        <form action="/subscriptions" key={service.key} method="get">
                          <input name="step" type="hidden" value="2" />
                          <input name="service" type="hidden" value={service.key} />
                          <input name="mode" type="hidden" value="login" />
                          <button className="flex min-w-[180px] items-center gap-3 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/60 sm:min-w-[220px]" type="submit">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/30"><service.icon className="h-5 w-5" style={{ color: service.color }} /></span>
                            <span className="text-sm font-medium">{service.name}</span>
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <div>
              <a
                href="/subscriptions?step=1"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <IconArrowLeft className="h-4 w-4" />
                Back
              </a>
            <section className="rounded-xl border p-4 sm:p-6">
              {!selectedService ? <p className="text-sm text-muted-foreground">Please select a service in Step 1.</p> : (
                <div className="mx-auto max-w-md rounded-xl border p-4 sm:p-6">
                  <div className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/30"><selectedService.icon className="h-7 w-7" style={{ color: selectedService.color }} /></span><p className="mt-3 text-lg font-semibold">{selectedService.name}</p></div>
                  {mode === "login" ? (
                    <form action={loginServiceAccountAction} className="mt-6 space-y-3">
                      <input name="serviceKey" type="hidden" value={selectedService.key} />
                      <input className="w-full rounded-md border px-3 py-2 text-sm" name="email" placeholder="Email" required type="email" />
                      <input className="w-full rounded-md border px-3 py-2 text-sm" name="password" placeholder="Password" required type="password" />
                      <button className="text-xs text-muted-foreground underline" type="button">Forgot password?</button>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground"><input name="termsAccepted" required type="checkbox" />I agree to terms and conditions</label>
                      <button className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" type="submit">Login</button>
                    </form>
                  ) : (
                    <form action={registerServiceAccountAction} className="mt-6 space-y-3">
                      <input name="serviceKey" type="hidden" value={selectedService.key} />
                      <input name="serviceName" type="hidden" value={selectedService.name} />
                      <input className="w-full rounded-md border px-3 py-2 text-sm" name="username" placeholder="Username" required type="text" />
                      <input className="w-full rounded-md border px-3 py-2 text-sm" name="email" placeholder="Email" required type="email" />
                      <input className="w-full rounded-md border px-3 py-2 text-sm" name="password" placeholder="Password" required type="password" />
                      <input className="w-full rounded-md border px-3 py-2 text-sm" name="confirmPassword" placeholder="Confirm password" required type="password" />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground"><input name="termsAccepted" required type="checkbox" />I agree to terms and conditions</label>
                      <button className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" type="submit">Sign up</button>
                    </form>
                  )}
                  <p className="mt-4 text-center text-xs text-muted-foreground">or</p>
                  <a className="mt-2 block text-center text-sm underline" href={`/subscriptions?step=2&service=${selectedService.key}&mode=${mode === "login" ? "register" : "login"}`}>{mode === "login" ? "Register new account" : "Back to login"}</a>
                </div>
              )}
            </section>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div>
              <a
                href={`/subscriptions?step=2&service=${selectedService?.key ?? ""}&mode=login`}
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <IconArrowLeft className="h-4 w-4" />
                Back
              </a>
            <section className="rounded-xl border p-4 sm:p-6">
              {!selectedService ? <p className="text-sm text-muted-foreground">Please choose a service first.</p> : !selectedAccount ? <p className="text-sm text-muted-foreground">Please login or register for this service first.</p> : (
                <div>
                  <h2 className="text-lg font-semibold">Step 3: Choose Plan</h2>
                  <div className="mt-4 flex items-center gap-3 rounded-lg border p-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/30"><selectedService.icon className="h-6 w-6" style={{ color: selectedService.color }} /></span><div><p className="font-medium">{selectedService.name}</p><p className="text-xs text-muted-foreground">Logged in as {selectedAccount.email}</p></div></div>
                  {selectablePlans.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">All plans are already active for this app/account. Use another account to purchase more.</p> : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {selectablePlans.map((plan) => (
                        <a
                          className={`rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-muted/30 ${
                            selectedPlan?.code === plan.code ? "border-primary bg-primary/5" : ""
                          }`}
                          href={`/subscriptions?step=3&service=${selectedService.key}&account=${selectedAccount.id}&plan=${plan.code}${trialEligible ? "&trialEligible=1" : ""}`}
                          key={plan.code}
                        >
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">Duration: {plan.durationMonths} month{plan.durationMonths > 1 ? "s" : ""}</p>
                          <p className="text-sm text-muted-foreground">Members: {plan.members}</p>
                          <p className="mt-2 text-sm font-medium">{formatInr(plan.basePrice)}</p>
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    {selectedPlan ? (
                      <form action="/subscriptions" method="get">
                        <input name="step" type="hidden" value="4" />
                        <input name="service" type="hidden" value={selectedService.key} />
                        <input name="account" type="hidden" value={selectedAccount.id} />
                        <input name="plan" type="hidden" value={selectedPlan.code} />
                        {trialEligible ? <input name="trialEligible" type="hidden" value="1" /> : null}
                        <PlanNextButton />
                      </form>
                    ) : (
                      <PlanNextButton disabled />
                    )}
                  </div>
                </div>
              )}
            </section>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div>
              <a
                href={`/subscriptions?step=3&service=${selectedService?.key ?? ""}&account=${selectedAccount?.id ?? ""}${trialEligible ? "&trialEligible=1" : ""}`}
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <IconArrowLeft className="h-4 w-4" />
                Back
              </a>
            <section className="rounded-xl border p-4 sm:p-6">
              {!selectedService || !selectedAccount || !selectedPlan ? <p className="text-sm text-muted-foreground">Missing checkout details. Please complete Steps 1 to 3.</p> : (
                <div>
                  <h2 className="text-lg font-semibold">Step 4: Checkout</h2>
                  <div className="mt-4 flex items-center gap-3 rounded-lg border p-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/30"><selectedService.icon className="h-6 w-6" style={{ color: selectedService.color }} /></span><div><p className="font-medium">{selectedService.name}</p><p className="text-xs text-muted-foreground">Account: {selectedAccount.email}</p></div></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <article className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Plan Details</p><p className="mt-2 font-medium">{selectedPlan.name}</p><p className="text-sm text-muted-foreground">Duration: {selectedPlan.durationMonths} month{selectedPlan.durationMonths > 1 ? "s" : ""}</p><p className="text-sm text-muted-foreground">Members: {selectedPlan.members}</p></article>
                    <article className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Price Summary</p><div className="mt-2 space-y-1 text-sm"><p>Base price: {formatInr(checkoutBase)}</p><p>GST (18%): {formatInr(checkoutGst)}</p><hr className="my-2 border-t" /><p className="font-medium">Final total: {formatInr(checkoutTotal)}</p><p className="text-muted-foreground">Wallet balance: {formatInr(userWallet?.balance ?? "0")}</p>{useFreeTrial ? <p className="text-green-700">Free trial active: charged {formatInr(selectedService.basePrice)} after 1 month.</p> : null}</div></article>
                  </div>
                  <PinGatedForm action={checkoutSubscriptionAction} hasPin={!!userWallet?.pinHash} className="mt-4">
                    <input name="serviceKey" type="hidden" value={selectedService.key} />
                    <input name="accountId" type="hidden" value={selectedAccount.id} />
                    <input name="planCode" type="hidden" value={selectedPlan.code} />
                    <CheckoutSubmitButton />
                  </PinGatedForm>
                </div>
              )}
            </section>
            </div>
          ) : null}

          <section className="rounded-xl border p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Your Existing Subscriptions</h2>
            {rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No subscriptions found.</p> : (
              <ul className="mt-4 space-y-3">
                {rows.map((sub) => (
                   <li className="rounded-lg border p-3" key={sub.id}>
                    <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate font-medium">{sub.serviceName}</p><span className={sub.status === "ACTIVE" ? "rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400" : sub.status === "PENDING" ? "rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs font-medium text-yellow-400" : "rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400"}>{sub.status}</span></div>
                    <p className="text-sm text-muted-foreground">{formatInr(sub.monthlyCost)} / month | {sub.status}</p>
                    {sub.planName ? <p className="text-xs text-muted-foreground">{sub.planName} | Next billing: {sub.nextBillingDate}</p> : null}
                    {sub.externalAccountEmail ? <p className="text-xs text-muted-foreground">Account: {sub.externalAccountEmail}</p> : null}
                    {sub.freeTrialTaken && sub.freeTrialEndsAt ? <p className="text-xs text-muted-foreground">Free trial ends: {formatDate(new Date(sub.freeTrialEndsAt))}</p> : null}
                    {sub.status === "ACTIVE" || sub.status === "PENDING" ? (
                      <div className="mt-3">
                        <CancelSubscriptionButton subscriptionId={sub.id} serviceName={sub.serviceName} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

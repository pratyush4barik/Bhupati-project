import Link from "next/link";

export default function TermsAndConditionsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold">PayXen Terms and Conditions</h1>
      <p className="mt-3 text-sm text-muted-foreground">Effective date: February 13, 2026</p>

      <section className="mt-8 space-y-4 text-sm text-muted-foreground">
        <p>
          These Terms govern your use of PayXen web services and the PayXen Monitor desktop application. By enabling
          PayXen Monitor, you explicitly agree to focused-time collection for supported services.
        </p>
        <p>
          PayXen Monitor records only active focused window time at service level. It does not collect browsing
          history, page content, keystrokes, messages, passwords, or account-level personal data.
        </p>
        <p>
          You are responsible for maintaining secure access to your account and monitor token. Sharing monitor tokens
          or credentials with others may result in unauthorized data submissions.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Permitted Use</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Use PayXen Monitor only on devices you own or are authorized to operate.</li>
          <li>Do not reverse engineer or tamper with usage telemetry or sync mechanisms.</li>
          <li>Do not attempt to submit fabricated usage data through monitor APIs.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Data Retention and Deletion</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Monitor usage data is retained for up to 180 days unless deleted sooner. You can delete monitor data at any
          time from the PayXen Monitor page via the &quot;Delete My Monitor Data&quot; control.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Service Availability</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          We may update monitor functionality, supported services, or security controls to maintain accuracy,
          compliance, and reliability. Significant policy changes will be reflected in updated legal pages.
        </p>
      </section>

      <p className="mt-10 text-sm">
        Read the privacy details in{" "}
        <Link className="underline" href="/privacy-policy">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}

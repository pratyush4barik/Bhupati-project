import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold">PayXen Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Effective date: February 13, 2026</p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What PayXen Monitor Collects</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Service name from the supported service list.</li>
          <li>Focused minutes while the service window is actively focused.</li>
          <li>Tracking date and technical event identifiers for deduplication.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What PayXen Monitor Does Not Collect</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>No browsing history.</li>
          <li>No page URLs or content metadata.</li>
          <li>No personal messages, files, media content, or keystrokes.</li>
          <li>No login credentials for third-party subscription platforms.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">How Data Is Protected</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Desktop app stores unsynced records in encrypted local storage.</li>
          <li>Data syncs over HTTPS using signed monitor bearer tokens.</li>
          <li>Server validates token status and revocation before accepting usage data.</li>
          <li>Duplicate event IDs are ignored to prevent double counting.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Retention and Deletion</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Usage records are retained for up to 180 days by default. You can request immediate deletion from the
          PayXen Monitor page using &quot;Delete My Monitor Data&quot;. Deletion revokes monitor tokens and removes all monitor
          usage records associated with your account.
        </p>
      </section>

      <p className="mt-10 text-sm">
        Read full use terms in{" "}
        <Link className="underline" href="/terms-and-conditions">
          Terms and Conditions
        </Link>
        .
      </p>
    </main>
  );
}

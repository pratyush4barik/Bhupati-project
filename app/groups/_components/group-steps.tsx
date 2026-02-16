type GroupStepsProps = {
  currentStep: 1 | 2;
};

export function GroupSteps({ currentStep }: GroupStepsProps) {
  return (
    <section className="rounded-xl border p-6">
      <p className="text-sm font-medium text-muted-foreground">Group flow</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div
          className={`rounded-lg border p-3 text-sm ${
            currentStep === 1
              ? "bg-primary/5 font-medium"
              : "text-muted-foreground"
          }`}
        >
          1. Choose plan
        </div>
        <div
          className={`rounded-lg border p-3 text-sm ${
            currentStep === 2
              ? "bg-primary/5 font-medium"
              : "text-muted-foreground"
          }`}
        >
          2. Add members
        </div>
      </div>
    </section>
  );
}

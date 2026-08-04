import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { CalendarClock, FileText, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Provider dashboard — ServePro Onboarding" },
      {
        name: "description",
        content:
          "Track your onboarding application status, profile completeness and reviewer remarks.",
      },
      { property: "og:title", content: "Provider dashboard — ServePro" },
      {
        property: "og:description",
        content: "Application status, completeness and admin feedback in one place.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (!loading && role === "admin") navigate({ to: "/admin", replace: true });
  }, [loading, session, role, navigate]);

  const userId = session?.user.id;
  const { data: provider, isLoading } = useQuery({
    queryKey: ["my-provider", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-12">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (!provider) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <div className="surface-card p-8 text-center">
          <h1 className="text-xl font-semibold">No application found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start your provider application to get verified.
          </p>
          <Button asChild className="mt-6">
            <Link to="/application">Start application</Link>
          </Button>
        </div>
      </main>
    );
  }

  const checks = [
    Boolean(provider.full_name && provider.phone),
    provider.categories.length > 0,
    provider.skills.length > 0 && provider.experience_years >= 0 && Boolean(provider.bio),
    Boolean(provider.city && provider.state && provider.pincode),
    Boolean(provider.photo_path),
    Boolean(provider.id_document_path),
  ];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome{provider.full_name ? `, ${provider.full_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's where your onboarding application stands.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={provider.status} />
          <Button asChild variant="outline">
            <Link to="/application">
              {provider.status === "approved" ? "View profile" : "Edit application"}
            </Link>
          </Button>
        </div>
      </div>

      {provider.status === "rejected" && provider.remarks && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Application rejected</p>
          <p className="mt-1 text-sm text-foreground">{provider.remarks}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Update your application and resubmit for another review.
          </p>
        </div>
      )}

      {provider.status === "approved" && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-4">
          <p className="text-sm font-semibold text-success">
            You're verified — your profile is live on the network.
          </p>
        </div>
      )}

      <div className="surface-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Profile completeness</h2>
          <span className="text-sm font-medium text-muted-foreground">{completeness}%</span>
        </div>
        <Progress value={completeness} className="mt-3" />
        <p className="mt-3 text-sm text-muted-foreground">
          {completeness === 100
            ? "All required sections are filled in."
            : "Fill in the remaining sections to submit for verification."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard icon={Star} title="Categories & skills">
          <p className="text-sm">
            {provider.categories.length ? provider.categories.join(", ") : "Not selected yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {provider.skills.length ? provider.skills.join(", ") : "No skills added"} ·{" "}
            {provider.experience_years} yr experience
          </p>
        </InfoCard>

        <InfoCard icon={MapPin} title="Service location">
          <p className="text-sm">
            {provider.city ? `${provider.city}, ${provider.state} ${provider.pincode}` : "Not set"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{provider.address || "No address"}</p>
        </InfoCard>

        <InfoCard icon={FileText} title="Documents">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Profile photo: {provider.photo_path ? "Uploaded" : "Missing"}</li>
            <li>ID document: {provider.id_document_path ? "Uploaded" : "Missing"}</li>
            <li>Certificate: {provider.certificate_path ? "Uploaded" : "Optional"}</li>
          </ul>
        </InfoCard>

        <InfoCard icon={CalendarClock} title="Timeline">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Created: {new Date(provider.created_at).toLocaleDateString()}</li>
            <li>
              Submitted:{" "}
              {provider.submitted_at
                ? new Date(provider.submitted_at).toLocaleDateString()
                : "Not submitted"}
            </li>
            <li>
              Reviewed:{" "}
              {provider.reviewed_at
                ? new Date(provider.reviewed_at).toLocaleDateString()
                : "Awaiting review"}
            </li>
          </ul>
        </InfoCard>
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  FileUp,
  Gauge,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServePro — Get verified and start taking service jobs" },
      {
        name: "description",
        content:
          "Sign up, complete your provider profile, upload verification documents and track approval status in a single onboarding portal.",
      },
      { property: "og:title", content: "ServePro — Service Provider Onboarding" },
      {
        property: "og:description",
        content:
          "Provider registration, skills and service areas, document uploads and admin verification.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: UserCheck,
    title: "Create your account",
    body: "Register with your name, email and phone. Your provider workspace is created instantly.",
  },
  {
    icon: ClipboardCheck,
    title: "Complete your profile",
    body: "Add service categories, skills, years of experience and the areas you serve.",
  },
  {
    icon: FileUp,
    title: "Upload documents",
    body: "Attach a profile photo, a government ID and any certificates for verification.",
  },
  {
    icon: Gauge,
    title: "Track your status",
    body: "Follow your application from draft to pending to approved, with admin remarks.",
  },
];

function Landing() {
  const { session, role } = useAuth();

  return (
    <main className="flex-1">
      <section className="hero-gradient text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" /> Verified provider network
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Onboard as a service provider, get verified, start earning.
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/85">
              ServePro handles registration, profile completion, document verification and admin
              approval in one clean workflow — for plumbers, electricians, cleaners and every
              trade in between.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to={session ? (role === "admin" ? "/admin" : "/dashboard") : "/auth"}>
                  {session ? "Go to dashboard" : "Become a provider"}
                </Link>
              </Button>
              {!session && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Link to="/auth">
                    Admin sign in
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-6 backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-wide text-primary-foreground/70">
              Categories on the platform
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-primary-foreground/25 px-3 py-1 text-sm"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How onboarding works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Four steps from sign-up to an approved, verified profile.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="surface-card p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <s.icon className="size-4" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Document verification", body: "Private storage — only you and reviewers can open your files." },
            { icon: MapPin, title: "Service areas", body: "Define the city, state and pincode you can travel to." },
            { icon: Gauge, title: "Admin dashboard", body: "Reviewers filter, search and approve or reject with remarks." },
          ].map((f) => (
            <div key={f.title}>
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

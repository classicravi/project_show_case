import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { SERVICE_CATEGORIES, STATUS_LABELS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin review dashboard — ServePro Onboarding" },
      {
        name: "description",
        content:
          "Search, filter and review service provider applications, inspect documents and approve or reject with remarks.",
      },
      { property: "og:title", content: "Admin review dashboard — ServePro" },
      {
        property: "og:description",
        content: "Provider verification queue with search, filters and approval actions.",
      },
    ],
  }),
  component: AdminPage,
});

const STATUSES = ["all", "pending", "approved", "rejected", "draft"] as const;

function AdminPage() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (!loading && session && role && role !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, role, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-providers"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (category !== "all" && !p.categories.includes(category)) return false;
      if (!q) return true;
      return [p.full_name, p.email, p.city, p.state, p.skills.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, status, category]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      pending: all.filter((p) => p.status === "pending").length,
      approved: all.filter((p) => p.status === "approved").length,
      rejected: all.filter((p) => p.status === "rejected").length,
    };
  }, [data]);

  if (loading || (role === "admin" && isLoading)) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-12">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verification queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review provider applications, inspect documents and record a decision.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total applications", value: stats.total },
          { label: "Pending review", value: stats.pending },
          { label: "Approved", value: stats.approved },
          { label: "Rejected", value: stats.rejected },
        ].map((s) => (
          <div key={s.label} className="surface-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 100))}
              placeholder="Search name, email, city or skill"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {SERVICE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          No applications match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div
              key={p.id}
              className="surface-card flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{p.full_name || "Unnamed provider"}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.email} · {p.city ? `${p.city}, ${p.state}` : "No location"} ·{" "}
                  {p.experience_years} yr exp
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {p.categories.length ? p.categories.join(", ") : "No categories"}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/admin/$id" params={{ id: p.id }}>
                  Review
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

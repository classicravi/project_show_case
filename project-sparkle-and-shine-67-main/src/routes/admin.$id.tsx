import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/admin/$id")({
  head: () => ({
    meta: [
      { title: "Review application — ServePro Admin" },
      {
        name: "description",
        content:
          "Inspect a provider's profile and verification documents, then approve or reject with remarks.",
      },
      { property: "og:title", content: "Review application — ServePro Admin" },
      {
        property: "og:description",
        content: "Provider details, documents and approval decision.",
      },
    ],
  }),
  component: ReviewPage,
});

const DOCS = [
  { key: "photo_path", label: "Profile photo" },
  { key: "id_document_path", label: "Government ID" },
  { key: "certificate_path", label: "Certificate" },
] as const;

function ReviewPage() {
  const { id } = Route.useParams();
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (!loading && session && role && role !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, role, navigate]);

  const { data: provider, isLoading } = useQuery({
    queryKey: ["admin-provider", id],
    enabled: role === "admin",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (provider?.remarks) setRemarks(provider.remarks);
  }, [provider]);

  const decide = async (status: "approved" | "rejected") => {
    if (!provider) return;
    if (status === "rejected" && remarks.trim().length < 5) {
      toast.error("Add a remark explaining the rejection.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("providers")
      .update({
        status,
        remarks: remarks.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", provider.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-provider", id] });
    toast.success(status === "approved" ? "Provider approved" : "Application rejected");
    navigate({ to: "/admin" });
  };

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("provider-docs")
      .createSignedUrl(path, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open document");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading || (role === "admin" && isLoading)) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!provider) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="surface-card p-10 text-center">
          <p className="font-semibold">Application not found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/admin">Back to queue</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-12">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to queue
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {provider.full_name || "Unnamed provider"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {provider.email} · {provider.phone || "No phone"}
          </p>
        </div>
        <StatusBadge status={provider.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Detail label="Categories" value={provider.categories.join(", ") || "—"} />
        <Detail label="Skills" value={provider.skills.join(", ") || "—"} />
        <Detail label="Experience" value={`${provider.experience_years} years`} />
        <Detail
          label="Service area"
          value={
            provider.city ? `${provider.address}, ${provider.city}, ${provider.state} ${provider.pincode}` : "—"
          }
        />
        <Detail
          label="Submitted"
          value={
            provider.submitted_at
              ? new Date(provider.submitted_at).toLocaleString()
              : "Not submitted"
          }
        />
        <Detail
          label="Last reviewed"
          value={provider.reviewed_at ? new Date(provider.reviewed_at).toLocaleString() : "—"}
        />
      </div>

      <div className="surface-card p-6">
        <h2 className="font-semibold">About</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
          {provider.bio || "No description provided."}
        </p>
      </div>

      <div className="surface-card p-6">
        <h2 className="font-semibold">Documents</h2>
        <div className="mt-4 space-y-3">
          {DOCS.map((doc) => {
            const path = provider[doc.key];
            return (
              <div
                key={doc.key}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <span className="text-sm">{doc.label}</span>
                {path ? (
                  <Button size="sm" variant="outline" onClick={() => void openDoc(path)}>
                    <ExternalLink className="size-4" /> View
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not uploaded</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface-card space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="remarks">Reviewer remarks</Label>
          <Textarea
            id="remarks"
            rows={3}
            maxLength={1000}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Required when rejecting — explain what the provider must fix."
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={() => void decide("approved")}>
            Approve provider
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void decide("rejected")}>
            Reject application
          </Button>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

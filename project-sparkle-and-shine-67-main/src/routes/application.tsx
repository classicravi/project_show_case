import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/application")({
  head: () => ({
    meta: [
      { title: "My application — ServePro Onboarding" },
      {
        name: "description",
        content:
          "Complete your service provider profile: categories, skills, experience, service area and verification documents.",
      },
      { property: "og:title", content: "My application — ServePro" },
      {
        property: "og:description",
        content: "Provider profile, skills, service area and document uploads.",
      },
    ],
  }),
  component: ApplicationPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid phone number"),
  bio: z.string().trim().min(20, "Tell us at least 20 characters about your work").max(1000),
  experience_years: z.coerce.number().int().min(0).max(60),
  skills: z.string().trim().min(2, "List at least one skill").max(300),
  address: z.string().trim().min(5, "Enter your address").max(300),
  city: z.string().trim().min(2, "Enter your city").max(80),
  state: z.string().trim().min(2, "Enter your state").max(80),
  pincode: z.string().trim().regex(/^[0-9]{4,10}$/, "Enter a valid pincode"),
});

type DocKey = "photo_path" | "id_document_path" | "certificate_path";

const DOCS: { key: DocKey; label: string; hint: string; accept: string }[] = [
  { key: "photo_path", label: "Profile photo", hint: "JPG or PNG, max 5MB", accept: "image/*" },
  {
    key: "id_document_path",
    label: "Government ID",
    hint: "Aadhaar, PAN, licence — image or PDF",
    accept: "image/*,application/pdf",
  },
  {
    key: "certificate_path",
    label: "Certificate (optional)",
    hint: "Trade certificate or training proof",
    accept: "image/*,application/pdf",
  },
];

function ApplicationPage() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const [categories, setCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<DocKey | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (!loading && role === "admin") navigate({ to: "/admin", replace: true });
  }, [loading, session, role, navigate]);

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
      if (data) return data;
      const meta = session!.user.user_metadata as { full_name?: string; phone?: string };
      const { data: created, error: insertError } = await supabase
        .from("providers")
        .insert({
          user_id: userId!,
          email: session!.user.email ?? "",
          full_name: meta.full_name ?? "",
          phone: meta.phone ?? "",
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created;
    },
  });

  useEffect(() => {
    if (provider) setCategories(provider.categories);
  }, [provider]);

  const locked = provider?.status === "pending" || provider?.status === "approved";

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!provider) return;
    const form = new FormData(e.currentTarget);
    const submit = form.get("intent") === "submit";
    const parsed = schema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!out[key]) out[key] = issue.message;
      }
      setErrors(out);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (submit) {
      if (categories.length === 0) {
        toast.error("Select at least one service category.");
        return;
      }
      if (!provider.photo_path || !provider.id_document_path) {
        toast.error("Upload your profile photo and government ID before submitting.");
        return;
      }
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase
      .from("providers")
      .update({
        ...parsed.data,
        skills: parsed.data.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        categories,
        ...(submit
          ? { status: "pending" as const, submitted_at: new Date().toISOString(), remarks: null }
          : {}),
      })
      .eq("id", provider.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-provider", userId] });
    toast.success(submit ? "Application submitted for review" : "Draft saved");
    if (submit) navigate({ to: "/dashboard" });
  };

  const uploadDoc = async (key: DocKey, file: File) => {
    if (!provider) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB.");
      return;
    }
    setUploading(key);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${key}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("provider-docs")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(null);
      toast.error(uploadError.message);
      return;
    }
    const patch =
      key === "photo_path"
        ? { photo_path: path }
        : key === "id_document_path"
          ? { id_document_path: path }
          : { certificate_path: path };
    const { error } = await supabase.from("providers").update(patch).eq("id", provider.id);
    setUploading(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-provider", userId] });
    toast.success("Document uploaded");
  };

  if (loading || isLoading || !provider) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Provider application</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete every section, then submit for verification.
          </p>
        </div>
        <StatusBadge status={provider.status} />
      </div>

      {locked && (
        <p className="mt-4 rounded-md border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
          Your application is {provider.status === "pending" ? "under review" : "approved"} and is
          read-only. Contact support if something needs to change.
        </p>
      )}

      <form onSubmit={save} className="mt-8 space-y-6">
        <fieldset disabled={locked || busy} className="space-y-6">
          <section className="surface-card space-y-4 p-6">
            <h2 className="font-semibold">Personal details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="full_name" defaultValue={provider.full_name} error={errors["full_name"]} />
              <Field label="Phone" name="phone" defaultValue={provider.phone} error={errors["phone"]} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">About your work</Label>
              <Textarea id="bio" name="bio" rows={4} defaultValue={provider.bio} />
              {errors["bio"] && <p className="text-xs text-destructive">{errors["bio"]}</p>}
            </div>
          </section>

          <section className="surface-card space-y-4 p-6">
            <h2 className="font-semibold">Services & experience</h2>
            <div>
              <Label>Service categories</Label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SERVICE_CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={categories.includes(c)}
                      onCheckedChange={(v) =>
                        setCategories((prev) =>
                          v ? [...prev, c] : prev.filter((x) => x !== c),
                        )
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Years of experience"
                name="experience_years"
                type="number"
                defaultValue={String(provider.experience_years)}
                error={errors["experience_years"]}
              />
              <Field
                label="Skills (comma separated)"
                name="skills"
                defaultValue={provider.skills.join(", ")}
                error={errors["skills"]}
              />
            </div>
          </section>

          <section className="surface-card space-y-4 p-6">
            <h2 className="font-semibold">Service area</h2>
            <Field label="Address" name="address" defaultValue={provider.address} error={errors["address"]} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" name="city" defaultValue={provider.city} error={errors["city"]} />
              <Field label="State" name="state" defaultValue={provider.state} error={errors["state"]} />
              <Field label="Pincode" name="pincode" defaultValue={provider.pincode} error={errors["pincode"]} />
            </div>
          </section>
        </fieldset>

        <section className="surface-card space-y-4 p-6">
          <h2 className="font-semibold">Verification documents</h2>
          {DOCS.map((doc) => (
            <div
              key={doc.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
            >
              <div>
                <p className="text-sm font-medium">{doc.label}</p>
                <p className="text-xs text-muted-foreground">
                  {provider[doc.key] ? "Uploaded ✓" : doc.hint}
                </p>
              </div>
              <label className="inline-flex">
                <input
                  type="file"
                  className="hidden"
                  accept={doc.accept}
                  disabled={locked || uploading !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadDoc(doc.key, file);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                  {uploading === doc.key ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {provider[doc.key] ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          ))}
        </section>

        {!locked && (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" name="intent" value="draft" variant="outline" disabled={busy}>
              Save draft
            </Button>
            <Button type="submit" name="intent" value="submit" disabled={busy}>
              Submit for review
            </Button>
          </div>
        )}
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | undefined;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

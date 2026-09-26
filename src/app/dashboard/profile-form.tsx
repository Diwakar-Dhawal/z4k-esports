"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Spinner } from "@/components/ui";

export function ProfileForm({
  initialName,
  initialWhatsapp,
}: {
  initialName: string;
  initialWhatsapp: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ full_name: name.trim() || null, whatsapp: whatsapp.trim() || null })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMsg("Profile saved.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Display name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </Field>
      <Field
        label="WhatsApp number"
        hint="Pre-filled on every tournament registration form."
      >
        <Input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="9876543210"
          inputMode="tel"
        />
      </Field>
      {msg ? <div className="z4k-success">{msg}</div> : null}
      {error ? <div className="z4k-error">{error}</div> : null}
      <Button type="submit" disabled={saving}>
        {saving ? <Spinner /> : null}
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

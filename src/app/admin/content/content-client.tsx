"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, Checkbox, Field, Input, Spinner, Textarea } from "@/components/ui";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal, useConfirm } from "@/components/modal";
import { deleteStoredImages } from "@/lib/storage-cleanup";
import type { ContentBlock, LandingSlide } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  quote: "💬 Motivational quotes (rotate on the homepage)",
  tagline: "🏷 Taglines (hero + fixed copy)",
  block: "📄 Page blocks",
};

const TAGLINE_KEYS: Record<string, string> = {
  hero_title: "Hero title",
  hero_subtitle: "Hero subtitle",
  about_org: "About the org (team section subtitle)",
  about_cta: "About call-to-action",
};

export function ContentClient({
  blocks,
  slides: initialSlides,
}: {
  blocks: ContentBlock[];
  slides: LandingSlide[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { ask, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(blocks.map((b) => [b.id, b.body])),
  );

  const [newKind, setNewKind] = useState<"quote" | "tagline" | "block">("quote");
  const [newKey, setNewKey] = useState("");
  const [newBody, setNewBody] = useState("");

  /* ------------------------------ landing slides ---------------------------- */
  const [slides, setSlides] = useState(initialSlides);
  const [slideModal, setSlideModal] = useState<
    | { id?: string; title: string; tagline: string; image_url: string; sort_order: number; is_active: boolean }
    | null
  >(null);
  const [slideErr, setSlideErr] = useState<string | null>(null);
  const [slideBusy, setSlideBusy] = useState(false);

  async function saveSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!slideModal) return;
    setSlideErr(null);
    if (!slideModal.title.trim()) return setSlideErr("Title is required.");
    if (!slideModal.image_url.trim()) return setSlideErr("An image is required — upload one or paste a URL.");
    setSlideBusy(true);
    const row = {
      title: slideModal.title.trim(),
      tagline: slideModal.tagline.trim(),
      image_url: slideModal.image_url.trim(),
      sort_order: slideModal.sort_order,
      is_active: slideModal.is_active,
    };
    const { error } = slideModal.id
      ? await supabase.from("landing_slides").update(row).eq("id", slideModal.id)
      : await supabase.from("landing_slides").insert(row);
    setSlideBusy(false);
    if (error) {
      setSlideErr(error.message);
      return;
    }
    setSlideModal(null);
    router.refresh();
  }

  async function removeSlide(s: LandingSlide) {
    ask(
      "Delete slide?",
      `"${s.title}" will be removed from the landing carousel and its uploaded image will be deleted from storage.`,
      async () => {
        await deleteStoredImages([s.image_url]);
        await supabase.from("landing_slides").delete().eq("id", s.id);
        setSlides((rows) => rows.filter((x) => x.id !== s.id));
        router.refresh();
      },
    );
  }

  async function toggleSlide(s: LandingSlide) {
    setSlides((rows) => rows.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x)));
    await supabase.from("landing_slides").update({ is_active: !s.is_active }).eq("id", s.id);
    router.refresh();
  }

  /* ------------------------------ content blocks ---------------------------- */
  async function save(b: ContentBlock) {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("content_blocks")
      .update({ body: drafts[b.id] })
      .eq("id", b.id);
    setBusy(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function toggle(b: ContentBlock) {
    setBusy(true);
    await supabase.from("content_blocks").update({ is_active: !b.is_active }).eq("id", b.id);
    setBusy(false);
    router.refresh();
  }

  async function remove(b: ContentBlock) {
    ask(
      "Delete content block?",
      b.key ? `"${b.key}" will be removed permanently.` : "This quote will be removed permanently.",
      async () => {
        await supabase.from("content_blocks").delete().eq("id", b.id);
        router.refresh();
      },
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newBody.trim()) return setError("Text is required.");
    if (newKind !== "quote" && !newKey.trim())
      return setError("Key is required for taglines and blocks (e.g. about_org).");
    setBusy(true);
    const { error } = await supabase.from("content_blocks").insert({
      kind: newKind,
      key: newKind === "quote" ? null : newKey.trim(),
      body: newBody.trim(),
      sort_order: blocks.filter((b) => b.kind === newKind).length + 1,
    });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setNewKey("");
      setNewBody("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      {/* Landing carousel images */}
      <Card className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">
          🖼 Landing page games carousel
        </h2>
        <p className="text-xs text-zinc-500">
          The slideshow behind the hero. Upload real game key art here — shown on the landing page
          top and behind &ldquo;Forge Your Legend&rdquo;.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {slides.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-lg border border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image_url} alt={s.title} className="aspect-video w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-sm font-semibold text-white">{s.title}</p>
                <p className="truncate text-xs text-zinc-500">{s.tagline || "—"}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge tone={s.is_active ? "green" : "gray"}>
                    {s.is_active ? "shown" : "hidden"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setSlideModal({ ...s })}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleSlide(s)}>
                      {s.is_active ? "Hide" : "Show"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => removeSlide(s)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {slides.length === 0 ? (
            <p className="text-sm text-zinc-500">No slides yet — the built-in defaults are showing.</p>
          ) : null}
        </div>
        <Button
          size="sm"
          onClick={() =>
            setSlideModal({ title: "", tagline: "", image_url: "", sort_order: slides.length, is_active: true })
          }
        >
          + Add slide
        </Button>
      </Card>

      {(["quote", "tagline", "block"] as const).map((kind) => {
        const items = blocks.filter((b) => b.kind === kind);
        return (
          <Card key={kind} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              {KIND_LABEL[kind]}
            </h2>
            <div className="space-y-3">
              {items.map((b) => (
                <div key={b.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">{b.key ?? "—"}</span>
                      {TAGLINE_KEYS[b.key ?? ""] ? (
                        <span className="text-xs text-zinc-500">({TAGLINE_KEYS[b.key!]})</span>
                      ) : null}
                      <Badge tone={b.is_active ? "green" : "gray"}>
                        {b.is_active ? "active" : "hidden"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => save(b)} disabled={busy}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(b)} disabled={busy}>
                        {b.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(b)} disabled={busy}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <textarea
                    className="z4k-input"
                    rows={kind === "block" ? 4 : 2}
                    value={drafts[b.id] ?? b.body}
                    onChange={(e) => setDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                  />
                </div>
              ))}
              {items.length === 0 ? (
                <p className="text-sm text-zinc-500">None yet.</p>
              ) : null}
            </div>
          </Card>
        );
      })}

      <Card className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Add new</h2>
        <form onSubmit={add} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select className="z4k-input" value={newKind} onChange={(e) => setNewKind(e.target.value as typeof newKind)}>
                <option value="quote">Quote</option>
                <option value="tagline">Tagline (keyed)</option>
                <option value="block">Page block (keyed)</option>
              </select>
            </Field>
            {newKind !== "quote" ? (
              <Field label="Key" hint="Stable identifier — the site reads copy by key.">
                <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="about_org" />
              </Field>
            ) : null}
          </div>
          <Field label="Text">
            <Textarea rows={3} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
          </Field>
          {error ? <div className="z4k-error">{error}</div> : null}
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : null} Add content
          </Button>
        </form>
      </Card>

      {/* Slide editor modal */}
      <Modal
        open={Boolean(slideModal)}
        title={slideModal?.id ? "Edit slide" : "Add slide"}
        onClose={() => setSlideModal(null)}
      >
        {slideModal ? (
          <form onSubmit={saveSlide} className="space-y-4">
            <Field label="Game / title *">
              <Input
                value={slideModal.title}
                onChange={(e) => setSlideModal({ ...slideModal, title: e.target.value })}
                placeholder="Battlegrounds Mobile India"
              />
            </Field>
            <Field label="Tagline (small red label)">
              <Input
                value={slideModal.tagline}
                onChange={(e) => setSlideModal({ ...slideModal, tagline: e.target.value })}
                placeholder="BGMI · Battle Royale"
              />
            </Field>
            <ImageUploadField
              bucket="site"
              folder="slides"
              label="Image * (upload or URL)"
              value={slideModal.image_url}
              onChange={(url) => setSlideModal({ ...slideModal, image_url: url })}
            />
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Sort order">
                <Input
                  type="number"
                  value={slideModal.sort_order}
                  onChange={(e) => setSlideModal({ ...slideModal, sort_order: Number(e.target.value) })}
                />
              </Field>
              <Checkbox
                checked={slideModal.is_active}
                onChange={(e) => setSlideModal({ ...slideModal, is_active: e.target.checked })}
                label="Shown on landing page"
              />
            </div>
            {slideErr ? <div className="z4k-error">{slideErr}</div> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSlideModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={slideBusy}>
                {slideBusy ? <Spinner /> : null} Save slide
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {dialog}
    </div>
  );
}

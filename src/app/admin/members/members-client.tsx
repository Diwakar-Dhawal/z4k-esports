"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Checkbox, Field, Input, Spinner, Textarea } from "@/components/ui";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal, useConfirm } from "@/components/modal";
import { deleteStoredImages } from "@/lib/storage-cleanup";
import type { MemberCategory, TeamMember } from "@/lib/types";

interface MemberDraft {
  id?: string;
  category_id: string;
  name: string;
  tag: string;
  role_title: string;
  bio: string;
  photo_url: string;
  instagram: string;
  youtube: string;
  sort_order: number;
  is_active: boolean;
}

function draftFromMember(m: TeamMember): MemberDraft {
  return {
    id: m.id,
    category_id: m.category_id,
    name: m.name,
    tag: m.tag ?? "",
    role_title: m.role_title ?? "",
    bio: m.bio ?? "",
    photo_url: m.photo_url ?? "",
    instagram: m.socials?.instagram ?? "",
    youtube: m.socials?.youtube ?? "",
    sort_order: m.sort_order,
    is_active: m.is_active,
  };
}

function emptyDraft(categoryId: string, sortOrder: number): MemberDraft {
  return {
    category_id: categoryId,
    name: "",
    tag: "",
    role_title: "",
    bio: "",
    photo_url: "",
    instagram: "",
    youtube: "",
    sort_order: sortOrder,
    is_active: true,
  };
}

function toRow(d: MemberDraft) {
  const socials: Record<string, string> = {};
  if (d.instagram.trim()) socials.instagram = d.instagram.trim();
  if (d.youtube.trim()) socials.youtube = d.youtube.trim();
  return {
    category_id: d.category_id,
    name: d.name.trim(),
    tag: d.tag.trim() || null,
    role_title: d.role_title.trim() || null,
    bio: d.bio.trim() || null,
    photo_url: d.photo_url.trim() || null,
    socials,
    sort_order: d.sort_order,
    is_active: d.is_active,
  };
}

export function MembersClient({
  categories,
  members,
}: {
  categories: MemberCategory[];
  members: TeamMember[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { ask, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MemberDraft | null>(null);
  const [newCat, setNewCat] = useState("");

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("member_categories")
      .insert({ name: newCat.trim(), sort_order: categories.length + 1 });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setNewCat("");
      router.refresh();
    }
  }

  async function deleteCategory(cat: MemberCategory) {
    const count = members.filter((m) => m.category_id === cat.id).length;
    if (count > 0) {
      ask(
        "Category not empty",
        `Move or delete the ${count} member(s) in "${cat.name}" first.`,
        () => {},
        "Understood",
      );
      return;
    }
    ask(
      "Delete category?",
      `"${cat.name}" will be removed from the team page.`,
      async () => {
        await supabase.from("member_categories").delete().eq("id", cat.id);
        router.refresh();
      },
    );
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    if (!editing.name.trim()) return setError("Name is required.");
    setBusy(true);
    const row = toRow(editing);
    const { error } = editing.id
      ? await supabase.from("team_members").update(row).eq("id", editing.id)
      : await supabase.from("team_members").insert(row);
    setBusy(false);
    if (error) setError(error.message);
    else {
      setEditing(null);
      setError(null);
      router.refresh();
    }
  }

  async function deleteMember(m: TeamMember) {
    ask(
      "Remove member?",
      `${m.name} will be removed from the team page and their uploaded photo will be deleted from storage.`,
      async () => {
        await deleteStoredImages([m.photo_url]);
        await supabase.from("team_members").delete().eq("id", m.id);
        router.refresh();
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
            >
              {c.name}
              <span className="text-xs text-zinc-500">
                ({members.filter((m) => m.category_id === c.id).length})
              </span>
              <button
                onClick={() => deleteCategory(c)}
                className="text-xs text-red-400 hover:text-red-300"
                title="Delete category"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            className="z4k-input max-w-xs"
            placeholder="New category (e.g. Streamers)"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <Button size="sm" type="submit" disabled={busy}>Add category</Button>
        </form>
      </Card>

      {error ? <div className="z4k-error">{error}</div> : null}

      {/* Members by category */}
      {categories.map((cat) => {
        const catMembers = members.filter((m) => m.category_id === cat.id);
        return (
          <Card key={cat.id} className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">{cat.name}</h2>
            <div className="space-y-2">
              {catMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {m.name}
                      {m.tag ? <span className="ml-2 text-xs text-red-400">[{m.tag}]</span> : null}
                      {!m.is_active ? <span className="ml-2 text-xs text-zinc-500">(hidden)</span> : null}
                    </p>
                    {m.role_title ? <p className="text-xs text-zinc-500">{m.role_title}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(draftFromMember(m))}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => deleteMember(m)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {catMembers.length === 0 ? (
                <p className="text-sm text-zinc-500">No members here yet.</p>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(emptyDraft(cat.id, catMembers.length + 1))}
            >
              + Add member to {cat.name}
            </Button>
          </Card>
        );
      })}

      {/* Editor modal */}
      <Modal
        open={Boolean(editing)}
        title={editing?.id ? "Edit member" : "New member"}
        onClose={() => setEditing(null)}
      >
        {editing ? (
        <form onSubmit={saveMember} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select
                  className="z4k-input"
                  value={editing.category_id}
                  onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Name *">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder='Arjun "Z4K Vortex" Mehta' />
              </Field>
              <Field label="Tag">
                <Input value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} placeholder="VORTEX" maxLength={8} />
              </Field>
              <Field label="Role title">
                <Input value={editing.role_title} onChange={(e) => setEditing({ ...editing, role_title: e.target.value })} placeholder="IGL / Assaulter" />
              </Field>
              <div className="sm:col-span-2">
                <ImageUploadField
                  bucket="site"
                  folder="members"
                  label="Photo (upload or URL)"
                  value={editing.photo_url}
                  onChange={(url) => setEditing({ ...editing, photo_url: url })}
                  hint="Left empty → the member gets a generated esports emblem."
                />
              </div>
              <Field label="Instagram URL">
                <Input value={editing.instagram} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} />
              </Field>
              <Field label="YouTube URL">
                <Input value={editing.youtube} onChange={(e) => setEditing({ ...editing, youtube: e.target.value })} />
              </Field>
            </div>
            <Field label="Bio">
              <Textarea rows={3} value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
            </Field>
            <Checkbox
              checked={editing.is_active}
              onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              label="Shown on the team page"
            />
            {error ? <div className="z4k-error">{error}</div> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? <Spinner /> : null} Save member
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        ) : null}
      </Modal>
      {dialog}
    </div>
  );
}

"use client";

import { StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/format";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { Lead } from "@/lib/types";

export function NotesPanel({ lead }: { lead: Lead }) {
  const { addNote, deleteNote } = useLeadStore();
  const [body, setBody] = useState("");

  function submit() {
    if (!body.trim()) return;
    addNote(lead.business.id, body);
    setBody("");
  }

  return (
    <Card>
      <CardHeader title="Notities" description="Alleen in deze browser, tot er cloud-opslag is." />
      <div className="p-5">
        <Textarea
          placeholder="e.g. “Eigenaar gesproken. Bel volgende week terug.”"
          value={body}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-subtle">Ctrl + Enter om op te slaan</span>
          <Button size="sm" variant="primary" onClick={submit} disabled={!body.trim()}>
            Notitie toevoegen
          </Button>
        </div>

        {lead.crm.notes.length === 0 ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-subtle">
            <StickyNote className="size-4" /> No notes yet.
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {lead.crm.notes.map((note) => (
              <li key={note.id} className="group rounded-lg border border-line bg-canvas px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  {/* Rendered as plain text – never as HTML. */}
                  <p className="text-sm whitespace-pre-wrap text-fg">{note.body}</p>
                  <button
                    onClick={() => deleteNote(lead.business.id, note.id)}
                    className="rounded p-1 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
                    aria-label="Notitie verwijderen"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-subtle">{formatDateTime(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

"use client";

import { Mail, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label, Textarea, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { CONTACT_CHANNELS, FOLLOW_UP_LABEL } from "@/lib/constants";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { ContactChannel, FollowUpType, Lead } from "@/lib/types";

/** Log a contact moment and optionally schedule a follow-up. */
export function ContactModal({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const { logContact } = useLeadStore();
  const b = lead.business;
  const [channel, setChannel] = useState<ContactChannel>(b.phone ? "phone" : "email");
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpType, setFollowUpType] = useState<FollowUpType>("follow_up");

  function save() {
    logContact(b.id, {
      channel,
      note,
      followUpAt: followUpDate ? new Date(`${followUpDate}T10:00:00`).toISOString() : undefined,
      followUpType,
    });
    setNote("");
    setFollowUpDate("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Contact met ${b.name}`}
      description="Log het gesprek, zodat de opvolging in je lijst komt."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button variant="primary" onClick={save}>
            Opslaan
          </Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2">
        {b.phone ? (
          <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 rounded-lg border border-line-strong px-3 py-2.5 text-sm hover:bg-hover">
            <Phone className="size-4 text-accent-text" /> {b.phone}
          </a>
        ) : (
          <div className="rounded-lg border border-line px-3 py-2.5 text-sm text-subtle">Geen telefoon</div>
        )}
        {b.email ? (
          <a href={`mailto:${b.email}`} className="flex items-center gap-2 truncate rounded-lg border border-line-strong px-3 py-2.5 text-sm hover:bg-hover">
            <Mail className="size-4 shrink-0 text-accent-text" /> <span className="truncate">{b.email}</span>
          </a>
        ) : (
          <div className="rounded-lg border border-line px-3 py-2.5 text-sm text-subtle">Geen openbaar e-mailadres</div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label>Via</Label>
          <Select value={channel} onChange={(e) => setChannel(e.target.value as ContactChannel)} options={CONTACT_CHANNELS} />
        </div>
        <div>
          <Label>Notitie</Label>
          <Textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Wat heb je besproken?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Opvolgdatum</Label>
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div>
            <Label>Soort opvolging</Label>
            <Select
              value={followUpType}
              onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
              options={Object.entries(FOLLOW_UP_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

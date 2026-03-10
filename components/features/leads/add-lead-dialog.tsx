"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findLeadByName, upsertLead } from "@/lib/local-store";
import { toast } from "sonner";
import type { Lead } from "@/types/lead";

interface AddLeadDialogProps {
  onLeadAdded?: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New -- needs research" },
  { value: "enriched", label: "Enriched -- already researched" },
  { value: "emailed", label: "Already contacted" },
  { value: "replied", label: "Already replied" },
  { value: "meeting", label: "Meeting scheduled" },
  { value: "won", label: "Won -- existing stockist" },
] as const;

export function AddLeadDialog({ onLeadAdded }: AddLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState("new");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setName("");
    setAddress("");
    setArea("");
    setPhone("");
    setWebsite("");
    setContactEmail("");
    setStatus("new");
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Venue name is required");
      return;
    }

    if (name.length > 300) {
      toast.error("Venue name is too long");
      return;
    }

    setIsSubmitting(true);

    try {
      const existing = findLeadByName(name);
      if (existing) {
        toast.error(`A lead named "${existing.name}" already exists`);
        return;
      }

      const placeId = `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
      const now = new Date().toISOString();

      const lead: Lead = {
        placeId,
        name: name.trim(),
        address: address.trim(),
        area: area.trim() || "Manual",
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        types: [],
        status: status as Lead["status"],
        confidenceLevel: "low",
        source: "manual",
        createdAt: now,
        updatedAt: now,
      };

      upsertLead(lead);
      toast.success(`${name} added to your leads`);
      resetForm();
      setOpen(false);
      onLeadAdded?.();
    } catch {
      toast.error("Failed to add lead");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        + Add Lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a lead manually</DialogTitle>
            <DialogDescription>
              Add a venue from your existing contacts, events, or research.
              Duplicates are checked automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lead-name">
                Venue name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lead-name"
                placeholder="e.g. The Cocktail Trading Co"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="lead-area">Area / City</Label>
                <Input
                  id="lead-area"
                  placeholder="e.g. Shoreditch"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "new")}>
                  <SelectTrigger id="lead-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lead-address">Address</Label>
              <Input
                id="lead-address"
                placeholder="Full address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="lead-email">Contact email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="info@venue.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  placeholder="020 7123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lead-website">Website</Label>
              <Input
                id="lead-website"
                type="url"
                placeholder="https://venue.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lead-notes">Notes</Label>
              <Textarea
                id="lead-notes"
                placeholder="e.g. Met at a trade show, interested in stocking Vermouth"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Adding…" : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

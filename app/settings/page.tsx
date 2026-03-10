"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_BRAND_VOICE } from "@/constants/brand-voice";
import { toast } from "sonner";
import type { BrandVoiceConfig } from "@/types/outreach";

interface PocSettings {
  pocMode: boolean;
  pocRedirectEmail: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<BrandVoiceConfig>(() => ({
    ...DEFAULT_BRAND_VOICE,
  }));

  const [poc, setPoc] = useState<PocSettings>({
    pocMode: false,
    pocRedirectEmail: "",
  });
  const [pocLoading, setPocLoading] = useState(true);
  const [pocSaving, setPocSaving] = useState(false);

  const fetchPocSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setPoc({ pocMode: data.pocMode, pocRedirectEmail: data.pocRedirectEmail });
      }
    } catch {
      // fall back to defaults
    } finally {
      setPocLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPocSettings();
  }, [fetchPocSettings]);

  const handlePocToggle = async (enabled: boolean) => {
    if (enabled && !poc.pocRedirectEmail.trim()) {
      toast.error("Set a redirect email before enabling PoC mode");
      return;
    }

    setPocSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pocMode: enabled }),
      });
      if (!res.ok) throw new Error();
      setPoc((prev) => ({ ...prev, pocMode: enabled }));
      toast.success(enabled ? "PoC mode enabled — emails will be redirected" : "PoC mode disabled — emails go to real venues");
    } catch {
      toast.error("Failed to update PoC mode");
    } finally {
      setPocSaving(false);
    }
  };

  const handlePocEmailSave = async () => {
    const email = poc.pocRedirectEmail.trim();
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }

    setPocSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pocRedirectEmail: email }),
      });
      if (!res.ok) throw new Error();
      toast.success("Redirect email updated");
    } catch {
      toast.error("Failed to save redirect email");
    } finally {
      setPocSaving(false);
    }
  };

  const handleSave = () => {
    toast.success("Settings saved");
  };

  const update = <K extends keyof BrandVoiceConfig>(
    key: K,
    value: BrandVoiceConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure outreach behavior and brand voice
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>PoC Mode (Proof of Concept)</CardTitle>
            {!pocLoading && (
              <Badge variant={poc.pocMode ? "default" : "secondary"}>
                {poc.pocMode ? "Active" : "Off"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When enabled, all outreach emails are redirected to your email
            instead of being sent to real venues. Use this for testing and demos.
          </p>

          {pocLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Switch
                  id="poc-toggle"
                  checked={poc.pocMode}
                  onCheckedChange={handlePocToggle}
                  disabled={pocSaving}
                  aria-label="Toggle PoC mode"
                />
                <Label htmlFor="poc-toggle" className="cursor-pointer">
                  {poc.pocMode ? "Emails redirect to you" : "Emails go to real venues"}
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="poc-redirect-email">Redirect email</Label>
                <div className="flex gap-2">
                  <Input
                    id="poc-redirect-email"
                    type="email"
                    placeholder="your@email.com"
                    value={poc.pocRedirectEmail}
                    onChange={(e) =>
                      setPoc((prev) => ({ ...prev, pocRedirectEmail: e.target.value }))
                    }
                    disabled={pocSaving}
                    className="max-w-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handlePocEmailSave}
                    disabled={pocSaving}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  All outreach emails will be sent here with a [PoC] prefix when PoC mode is active.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand voice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand name</Label>
            <Input
              id="brandName"
              value={config.brandName}
              onChange={(e) => update("brandName", e.target.value)}
              placeholder="Asterley Bros"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Textarea
              id="tone"
              value={config.tone}
              onChange={(e) => update("tone", e.target.value)}
              placeholder="Warm, professional..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Personality</Label>
            <Textarea
              id="personality"
              value={config.personality}
              onChange={(e) => update("personality", e.target.value)}
              placeholder="Like a knowledgeable friend..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keySellingPoints">
              Key selling points (one per line)
            </Label>
            <Textarea
              id="keySellingPoints"
              value={config.keySellingPoints.join("\n")}
              onChange={(e) =>
                update(
                  "keySellingPoints",
                  e.target.value.split("\n").filter(Boolean)
                )
              }
              placeholder="Award-winning..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avoidWords">Avoid words (comma-separated)</Label>
            <Textarea
              id="avoidWords"
              value={config.avoidWords.join(", ")}
              onChange={(e) =>
                update(
                  "avoidWords",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="disrupt, revolutionary..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offerTemplate">Offer template</Label>
            <Textarea
              id="offerTemplate"
              value={config.offerTemplate}
              onChange={(e) => update("offerTemplate", e.target.value)}
              placeholder="I'd love to send you a sample pack..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closeTemplate">Close template</Label>
            <Textarea
              id="closeTemplate"
              value={config.closeTemplate}
              onChange={(e) => update("closeTemplate", e.target.value)}
              placeholder="If you're open to it..."
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signatureName">Signature name</Label>
              <Input
                id="signatureName"
                value={config.signatureName}
                onChange={(e) => update("signatureName", e.target.value)}
                placeholder="Rob"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signatureTitle">Signature title</Label>
              <Input
                id="signatureTitle"
                value={config.signatureTitle}
                onChange={(e) => update("signatureTitle", e.target.value)}
                placeholder="Founder, Asterley Bros"
              />
            </div>
          </div>

          <Button onClick={handleSave}>Save</Button>
        </CardContent>
      </Card>
    </article>
  );
}

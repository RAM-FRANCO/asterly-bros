"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DEFAULT_BRAND_VOICE } from "@/constants/brand-voice";
import { toast } from "sonner";
import type { BrandVoiceConfig } from "@/types/outreach";

export default function SettingsPage() {
  const [config, setConfig] = useState<BrandVoiceConfig>(() => ({
    ...DEFAULT_BRAND_VOICE,
  }));

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
        <h1 className="text-2xl font-semibold tracking-tight">
          Brand Voice Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure tone, personality, and templates for outreach emails
        </p>
      </header>

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

"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmailDraft } from "@/types/outreach";

interface EmailPreviewProps {
  draft: EmailDraft;
  onApprove?: (emailId: string) => void;
  onSend?: (
    emailId: string,
    subjectIndex: number
  ) => void | Promise<void>;
}

export function EmailPreview({ draft, onApprove, onSend }: EmailPreviewProps) {
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(
    draft.selectedSubjectIndex
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleApproveAndSend = async () => {
    setIsLoading(true);
    try {
      await onSend?.(draft.id, selectedSubjectIndex);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      await onSend?.(draft.id, selectedSubjectIndex);
    } finally {
      setIsLoading(false);
    }
  };

  const subjectLines = draft.subjectLines.length > 0 ? draft.subjectLines : ["(No subject)"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{draft.leadName}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            To: {draft.intendedRecipient}
            {draft.redirectedTo && (
              <span className="ml-2 text-amber-600">(PoC: redirected)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={draft.confidenceScore >= 85 ? "default" : "secondary"}
            className="shrink-0"
          >
            Confidence: {Math.round(draft.confidenceScore)}%
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              draft.status === "sent" && "bg-green-100 text-green-700",
              draft.status === "pending_review" && "bg-amber-100 text-amber-700",
              draft.status === "approved" && "bg-blue-100 text-blue-700"
            )}
          >
            {draft.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft.holdReasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {draft.holdReasons.map((reason) => (
              <Badge
                key={reason}
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-200"
              >
                {reason}
              </Badge>
            ))}
          </div>
        )}

        <fieldset>
          <legend className="text-sm font-medium mb-2">Subject line</legend>
          <div className="space-y-2" role="radiogroup" aria-label="Select subject line">
            {subjectLines.map((line, index) => (
              <label
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                  selectedSubjectIndex === index
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name={`subject-${draft.id}`}
                  value={index}
                  checked={selectedSubjectIndex === index}
                  onChange={() => setSelectedSubjectIndex(index)}
                  className="sr-only"
                />
                <span className="text-sm">{line}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="text-sm font-medium mb-1">Email body</p>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm overflow-x-auto">
            {draft.fullBody}
          </pre>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {draft.status === "pending_review" && (
          <Button
            onClick={handleApproveAndSend}
            disabled={isLoading}
            aria-label="Approve and send email"
          >
            {isLoading ? "Sending…" : "Approve & Send"}
          </Button>
        )}
        {draft.status === "approved" && (
          <Button
            onClick={handleSend}
            disabled={isLoading}
            aria-label="Send email"
          >
            {isLoading ? "Sending…" : "Send"}
          </Button>
        )}
        {draft.status === "sent" && (
          <div className="text-sm text-muted-foreground space-y-1">
            {draft.sentAt && (
              <p>Sent at: {new Date(draft.sentAt).toLocaleString()}</p>
            )}
            {draft.redirectedTo && (
              <p>Redirected to: {draft.redirectedTo}</p>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

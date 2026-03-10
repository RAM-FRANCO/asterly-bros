"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getOutreachTierLabel } from "@/constants/scoring-weights";
import type { EmailDraft } from "@/types/outreach";

const TIER_STYLES = {
  high: "bg-green-100 text-green-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-600",
  skip: "bg-red-100 text-red-700",
} as const;

interface SendEmailModalProps {
  draft: EmailDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (
    emailId: string,
    subjectIndex: number,
    editedBody?: string
  ) => void | Promise<void>;
  onSaveBody?: (emailId: string, body: string) => void | Promise<void>;
}

export function SendEmailModal({
  draft,
  open,
  onOpenChange,
  onSend,
  onSaveBody,
}: SendEmailModalProps) {
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(
    draft.selectedSubjectIndex
  );
  const [editedBody, setEditedBody] = useState(draft.fullBody);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPendingReview = draft.status === "pending_review";
  const isApproved = draft.status === "approved";
  const isSent = draft.status === "sent";
  const bodyWasEdited = editedBody !== draft.fullBody;

  const debouncedSave = useCallback(
    (body: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        if (!onSaveBody) return;
        setIsSaving(true);
        try {
          await onSaveBody(draft.id, body);
        } finally {
          setIsSaving(false);
        }
      }, 1000);
    },
    [draft.id, onSaveBody]
  );

  const handleBodyChange = (value: string) => {
    setEditedBody(value);
    debouncedSave(value);
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const body =
        isPendingReview && bodyWasEdited ? editedBody : undefined;
      await onSend(draft.id, selectedSubjectIndex, body);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const subjectLines =
    draft.subjectLines.length > 0 ? draft.subjectLines : ["(No subject)"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isSent ? "Sent Email" : "Review & Send Email"}
          </DialogTitle>
          <DialogDescription>
            To: {draft.intendedRecipient}
            {draft.redirectedTo && (
              <span className="ml-2 text-amber-600">(PoC: redirected)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {draft.outreachTier && (
              <Badge
                variant="outline"
                className={cn("shrink-0", TIER_STYLES[draft.outreachTier])}
              >
                {getOutreachTierLabel(draft.outreachTier)}
              </Badge>
            )}
            <Badge
              variant={draft.confidenceScore >= 85 ? "default" : "secondary"}
              className="shrink-0"
            >
              Score: {Math.round(draft.confidenceScore)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                draft.status === "sent" && "bg-green-100 text-green-700",
                draft.status === "pending_review" &&
                  "bg-amber-100 text-amber-700",
                draft.status === "approved" && "bg-blue-100 text-blue-700"
              )}
            >
              {draft.status.replace(/_/g, " ")}
            </Badge>
          </div>

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
            <div
              className="space-y-2"
              role="radiogroup"
              aria-label="Select subject line"
            >
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
                    name={`modal-subject-${draft.id}`}
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
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">Email body</p>
              {isPendingReview && (
                <span className="text-xs text-muted-foreground">
                  {isSaving
                    ? "Saving…"
                    : bodyWasEdited
                      ? "Edited"
                      : "Click to edit"}
                </span>
              )}
            </div>
            {isPendingReview ? (
              <Textarea
                value={editedBody}
                onChange={(e) => handleBodyChange(e.target.value)}
                className="min-h-[200px] font-mono text-sm resize-y"
                aria-label="Edit email body"
              />
            ) : (
              <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm overflow-x-auto max-h-[300px] overflow-y-auto">
                {draft.fullBody}
              </pre>
            )}
          </div>

          {isSent && draft.sentAt && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Sent at: {new Date(draft.sentAt).toLocaleString()}</p>
              {draft.redirectedTo && (
                <p>Redirected to: {draft.redirectedTo}</p>
              )}
            </div>
          )}
        </div>

        {(isPendingReview || isApproved) && (
          <DialogFooter>
            <Button
              onClick={handleSend}
              disabled={isLoading}
              aria-label={
                isPendingReview ? "Approve and send email" : "Send email"
              }
            >
              {isLoading
                ? "Sending…"
                : isPendingReview
                  ? "Approve & Send"
                  : "Send"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

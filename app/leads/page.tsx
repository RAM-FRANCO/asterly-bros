"use client";

import { useState } from "react";
import { DiscoveryForm } from "@/components/features/leads/discovery-form";
import { LeadList } from "@/components/features/leads/lead-list";
import { AddLeadDialog } from "@/components/features/leads/add-lead-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearAllData } from "@/lib/local-store";
import { toast } from "sonner";

export default function LeadsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  function handleDiscoveryComplete() {
    setRefreshKey((k) => k + 1);
  }

  function handleClearData() {
    setClearDialogOpen(false);
    clearAllData();
    toast.success("All data cleared successfully");
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lead Discovery</h1>
          <p className="mt-1 text-muted-foreground">
            Discover new venue leads by area and manage your pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AddLeadDialog onLeadAdded={handleDiscoveryComplete} />
          <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <AlertDialogTrigger
              render={<Button variant="destructive" size="sm" />}
            >
              Clear All Data
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all leads, email drafts, and
                  notifications. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={handleClearData}>
                  Yes, clear everything
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <DiscoveryForm onDiscoveryComplete={handleDiscoveryComplete} />
      <LeadList refreshKey={refreshKey} />
    </div>
  );
}

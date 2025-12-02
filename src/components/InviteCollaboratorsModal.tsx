"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteCollaboratorsModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  onInvitesSent: () => void;
  existingParticipants?: { id: string; email: string; name: string }[];
}

export default function InviteCollaboratorsModal({
  open,
  onClose,
  tripId,
  tripTitle,
  onInvitesSent,
  existingParticipants = [],
}: InviteCollaboratorsModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setCurrentEmail("");
      setCurrentName("");
      setError(null);
    }
  }, [open]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendInvite = async () => {
    if (!currentEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!validateEmail(currentEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    const emailLower = currentEmail.toLowerCase();

    // Check if user is already a participant
    const existingParticipant = existingParticipants.find(
      p => p.email.toLowerCase() === emailLower
    );

    if (existingParticipant) {
      setError(`This user is already a collaborator (${existingParticipant.name})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to send invitations');
      }

      const response = await fetch('/api/send-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tripId,
          tripTitle,
          invites: [{ 
            email: currentEmail, 
            name: currentName || undefined
          }],
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send invitation';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      toast.success(`Invitation sent to ${currentEmail}!`);
      onInvitesSent();
      
      // Clear form after successful send
      setCurrentEmail("");
      setCurrentName("");
      setError(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendInvite();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center mb-6">
            <div className="text-2xl font-extrabold text-center mb-2">Invite Participants</div>
            <p className="text-gray-600 text-center text-sm">
              Invite friends to collaborate on <span className="font-semibold">"{tripTitle}"</span>
            </p>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Invite friends to collaborate on this trip
          </DialogDescription>
        </DialogHeader>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); sendInvite(); }} className="space-y-4">
                {/* Invite section */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">                  
                  <div>
                    <Label className="text-xs font-medium text-[#666]">EMAIL ADDRESS</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="email"
                        value={currentEmail}
                        onChange={(e) => setCurrentEmail(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 h-11"
                        placeholder="ryoko@email.com"
                        disabled={loading}
                      />
                      <Button
                        type="submit"
                        disabled={loading || !currentEmail.trim()}
                        className="cursor-pointer px-4 h-11 bg-[#ff5a58] text-white hover:bg-[#ff4a47] disabled:opacity-50"
                      >
                        {loading ? "Sending..." : "Invite"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
        </DialogContent>
    </Dialog>
  );
}

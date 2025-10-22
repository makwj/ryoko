"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Mail, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface InviteData {
  email: string;
  name?: string;
  status: 'new' | 'existing' | 'duplicate';
  existingName?: string;
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
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setInvites([]);
      setCurrentEmail("");
      setCurrentName("");
      setError(null);
    }
  }, [open]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addInvite = () => {
    if (!currentEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!validateEmail(currentEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    const emailLower = currentEmail.toLowerCase();

    // Check if email is already in the invite list
    if (invites.some(invite => invite.email.toLowerCase() === emailLower)) {
      setError("This email has already been added to the invite list");
      return;
    }

    // Check if user is already a participant
    const existingParticipant = existingParticipants.find(
      p => p.email.toLowerCase() === emailLower
    );

    if (existingParticipant) {
      setInvites(prev => [...prev, { 
        email: currentEmail, 
        name: currentName || undefined,
        status: 'existing',
        existingName: existingParticipant.name
      }]);
      setError(null);
    } else {
      setInvites(prev => [...prev, { 
        email: currentEmail, 
        name: currentName || undefined,
        status: 'new'
      }]);
      setError(null);
    }

    setCurrentEmail("");
    setCurrentName("");
  };

  const removeInvite = (index: number) => {
    setInvites(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out existing participants
    const newInvites = invites.filter(invite => invite.status === 'new');
    
    if (newInvites.length === 0) {
      const existingCount = invites.filter(invite => invite.status === 'existing').length;
      if (existingCount > 0) {
        setError("All selected users are already collaborators. Please add new email addresses to invite.");
      } else {
        setError("Please add at least one collaborator to invite");
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session ? 'Present' : 'Missing');
      
      if (!session) {
        throw new Error('You must be logged in to send invitations');
      }

      console.log('Token length:', session.access_token.length);
      console.log('Sending invitation for tripId:', tripId, 'tripTitle:', tripTitle);
      console.log('TripId type:', typeof tripId, 'TripId value:', tripId);
      console.log('New invites to send:', newInvites);

      const response = await fetch('/api/send-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tripId,
          tripTitle,
          invites: newInvites,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send invitations';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          console.error('Response status:', response.status);
          console.error('Response headers:', response.headers);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      toast.success(`Successfully sent ${result.sentCount} invitation${result.sentCount !== 1 ? 's' : ''}!`);
      onInvitesSent();
      onClose();
      
      // Reset form
      setInvites([]);
      setCurrentEmail("");
      setCurrentName("");
      setError(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInvite();
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
        </DialogHeader>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Add new invite section */}
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
                      />
                      <Button
                        type="button"
                        onClick={addInvite}
                        className="cursor-pointer px-4 h-11 bg-[#ff5a58] text-white hover:bg-[#ff4a47]"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Invites list */}
                {invites.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Collaborators ({invites.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {invites.map((invite, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            invite.status === 'existing' 
                              ? 'bg-yellow-50 border-yellow-200' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              invite.status === 'existing' 
                                ? 'bg-yellow-500' 
                                : 'bg-[#ff5a58]'
                            }`}>
                              {invite.status === 'existing' ? (
                                <AlertCircle className="w-4 h-4 text-white" />
                              ) : (
                                <Mail className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-dark">{invite.email}</p>
                              {invite.status === 'existing' ? (
                                <p className="text-xs text-yellow-700">
                                  Already a collaborator ({invite.existingName})
                                </p>
                              ) : (
                                <p className="text-xs text-gray-500">New invitation</p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeInvite(index)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading || invites.filter(invite => invite.status === 'new').length === 0}
                  className="cursor-pointer w-full h-11 bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold"
                >
                  {loading ? (
                    "Sending Invitations..."
                  ) : (
                    <>
                      Send {invites.filter(invite => invite.status === 'new').length} Invitation{invites.filter(invite => invite.status === 'new').length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </form>
        </DialogContent>
    </Dialog>
  );
}

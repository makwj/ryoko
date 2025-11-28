/**
 * CreateTripModal Component
 * 
 * Multi-step modal for creating new trips with comprehensive trip planning features.
 * Includes destination selection with autocomplete, date picking, collaborator invitations,
 * and interest selection. Features step-by-step wizard interface with validation.
 * Integrates with Google Places API for location search and Supabase for data storage.
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { X, ChevronDownIcon, Plus } from "lucide-react";
import toast from "react-hot-toast";
import LocationAutocomplete from "./LocationAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type CreateTripModalProps = {
  open: boolean;
  onClose: () => void;
  onTripCreated: () => void;
};

type TripFormData = {
  destination: string;
  startDate: string;
  endDate: string;
  title: string;
  description: string;
  collaborators: string[];
  interests: string[];
};

const interestCategories = [
  "Adventure", "Food", "Culture", "Shopping", "Art", "Relaxation",
  "History", "Photography", "Music", "Sports", "Nature", "Nightlife"
];

export default function CreateTripModal({ open, onClose, onTripCreated }: CreateTripModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TripFormData>({
    destination: "",
    startDate: "",
    endDate: "",
    title: "",
    description: "",
    collaborators: [],
    interests: []
  });
  const [newCollaborator, setNewCollaborator] = useState("");
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const handleInputChange = (field: keyof TripFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCollaborator = () => {
    if (newCollaborator.trim() && !formData.collaborators.includes(newCollaborator.trim())) {
      handleInputChange("collaborators", [...formData.collaborators, newCollaborator.trim()]);
      setNewCollaborator("");
    }
  };

  const removeCollaborator = (email: string) => {
    handleInputChange("collaborators", formData.collaborators.filter(c => c !== email));
  };

  const toggleInterest = (interest: string) => {
    const updatedInterests = formData.interests.includes(interest)
      ? formData.interests.filter(i => i !== interest)
      : [...formData.interests, interest];
    handleInputChange("interests", updatedInterests);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mt-6 gap-2">
      {[1, 2, 3, 4].map((step) => (
        <button
          key={step}
          onClick={() => goToStep(step)}
          className={`w-3 h-3 rounded-full transition-colors hover:scale-110 ${
            step === currentStep ? 'bg-[#ff5a58]' : 'bg-gray-300 hover:bg-gray-400'
          }`}
        />
      ))}
    </div>
  );

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create a trip");
        return;
      }

      // Create trip
      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            owner_id: user.id,
            title: formData.title,
            description: formData.description || null,
            destination: formData.destination || null,
            start_date: formData.startDate || null,
            end_date: formData.endDate || null,
            interests: formData.interests.length > 0 ? formData.interests : null,
            // Do not add collaborators directly; invitations will be sent instead
            collaborators: null,
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const createdTrip = data[0];
        toast.success("Trip created successfully!");

        // If collaborator emails were provided, send invitations now
        if (formData.collaborators.length > 0) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const invites = formData.collaborators.map(email => ({ email }));
              const resp = await fetch('/api/send-invitations', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  tripId: createdTrip.id,
                  tripTitle: formData.title,
                  invites
                })
              });

              if (resp.ok) {
                const resJson = await resp.json().catch(() => ({}));
                toast.success(`Invited ${resJson.sentCount ?? invites.length} collaborator(s)`);
              } else {
                const err = await resp.json().catch(() => ({}));
                console.warn('Invitation sending failed:', err);
              }
            }
          } catch (e) {
            console.warn('Failed to send invitations after trip creation:', e);
          }
        }

        onTripCreated();
        onClose();
        // Reset form
        setCurrentStep(1);
        setFormData({
          destination: "",
          startDate: "",
          endDate: "",
          title: "",
          description: "",
          collaborators: [],
          interests: []
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex-1 flex flex-col h-full px-8 py-10">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl text-dark font-extrabold text-center mb-8">PLAN A NEW TRIP</h2>
              
              <div className="space-y-4">
                <div className="bg-white rounded-xl">
                  <LocationAutocomplete
                    value={formData.destination}
                    onChange={(value) => handleInputChange("destination", value)}
                    placeholder="Where are you going?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="start-date" className="px-1 text-sm text-gray-400">
                      Start Date (Optional)
                    </Label>
                    <Popover open={openStart} onOpenChange={setOpenStart}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="start-date"
                          className="w-full justify-between font-normal"
                        >
                          {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : "Select start date"}
                          <ChevronDownIcon />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate ? new Date(formData.startDate) : undefined}
                          captionLayout="dropdown"
                          onSelect={(date: Date | undefined) => {
                            handleInputChange('startDate', date ? date.toISOString().slice(0,10) : '');
                            setOpenStart(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="end-date" className="px-1 text-sm text-gray-400">
                      End Date (Optional)
                    </Label>
                    <Popover open={openEnd} onOpenChange={setOpenEnd}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="end-date"
                          className="w-full justify-between font-normal"
                        >
                          {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : "Select end date"}
                          <ChevronDownIcon />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate ? new Date(formData.endDate) : undefined}
                          captionLayout="dropdown"
                          onSelect={(date: Date | undefined) => {
                            handleInputChange('endDate', date ? date.toISOString().slice(0,10) : '');
                            setOpenEnd(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Button
                onClick={nextStep}
                className="w-full h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold"
              >
                Next
              </Button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex-1 flex flex-col h-full px-8 py-10">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl text-dark font-extrabold text-center mb-8">Enter Your Trip Details</h2>
              
              <div className="space-y-4">
                <div>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter a Trip Name"
                    className="focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                    required
                  />
                </div>

                <div>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="h-24 resize-none focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                    placeholder="Write a short description for your trip (Optional)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Button
                onClick={nextStep}
                className="w-full h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold"
              >
                Next
              </Button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex-1 flex flex-col h-full px-8 py-10">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl text-dark font-extrabold text-center mb-2">Invite Collaborators</h2>
              <p className="text-gray-600 text-sm text-center mb-8">
                Don&apos;t worry, you can add more collaborators once the trip has been created!
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <Input
                    type="email"
                    value={newCollaborator}
                    onChange={(e) => setNewCollaborator(e.target.value)}
                    placeholder="Enter Email Address"
                    onKeyPress={(e) => e.key === 'Enter' && addCollaborator()}
                    className="flex-1 focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                  />
                  <Button
                    onClick={addCollaborator}
                    className="w-12 h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white p-0"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {formData.collaborators.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.collaborators.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-sm text-gray-700">{email}</span>
                        <Button
                          onClick={() => removeCollaborator(email)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-500 p-1 h-auto"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto">
              <Button
                onClick={nextStep}
                className="w-full h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold"
              >
                Next
              </Button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex-1 flex flex-col h-full px-8 py-10">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl text-dark font-extrabold text-center mb-2">Select Your Interests</h2>
              <p className="text-gray-600 text-sm text-center mb-8">
                Get personalized recommendations from our smart recommendation system
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                {interestCategories.map((interest) => (
                  <Button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    variant={formData.interests.includes(interest) ? "default" : "outline"}
                    className={`h-12 px-3 text-sm font-medium ${
                      formData.interests.includes(interest)
                        ? 'bg-[#ff5a58] hover:bg-[#ff4a47] text-white'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {interest}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.title}
                className="w-full h-12 bg-[#ff5a58] hover:bg-[#ff4a47] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
              >
                {loading ? "Creating..." : "Create Trip"}
              </Button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0 overflow-hidden border-0 bg-[#EEEEEE]" hideCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>Create New Trip</DialogTitle>
        </DialogHeader>
        
        <div className="relative grid md:grid-cols-[1fr_1.3fr] h-full">
          {/* Left decorative panel */}
          <div className="relative hidden md:block bg-[#1a2b4d]">
            <div className="absolute inset-0">
              {/* Travel pattern background */}
              <div className="absolute inset-0" style={{
                backgroundImage: `url("/assets/modalbg.png")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }} />
            </div>
          </div>

          {/* Right form panel */}
          <div className="relative flex flex-col h-full">
            {/* Close button positioned inside form panel */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
            >
              <X className="h-4 w-4 text-gray-700" />
              <span className="sr-only">Close</span>
            </button>
            <div className="flex-1 flex flex-col h-full">
              {renderStepContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
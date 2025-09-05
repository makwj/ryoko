"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { X, Calendar, Plus } from "lucide-react";
import toast from "react-hot-toast";
import LocationAutocomplete from "./LocationAutocomplete";

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
            collaborators: formData.collaborators.length > 0 ? formData.collaborators : null,
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        toast.success("Trip created successfully!");
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
              <h2 className="text-2xl text-[#303030] font-extrabold text-center mb-8">PLAN A NEW TRIP</h2>
              
              <div className="space-y-4">
                <div>
                  <LocationAutocomplete
                    value={formData.destination}
                    onChange={(value) => handleInputChange("destination", value)}
                    placeholder="Where are you going?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange("startDate", e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent text-gray-900"
                      placeholder="Dates (Optional)"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent text-gray-900"
                      placeholder="Dates (Optional)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={nextStep}
                className="w-full h-12 rounded-xl bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold transition-colors"
              >
                Next
              </button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex-1 flex flex-col h-full px-8 py-10">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl text-[#303030] font-extrabold text-center mb-8">Enter Your Trip Details</h2>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent text-gray-900"
                    placeholder="Enter a Trip Name"
                    required
                  />
                </div>

                <div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent resize-none text-gray-900"
                    placeholder="Write a short description for your trip (Optional)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={nextStep}
                className="w-full h-12 rounded-xl bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold transition-colors"
              >
                Next
              </button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex-1 flex flex-col h-full px-8 py-10">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl text-[#303030] font-extrabold text-center mb-2">Invite Collaborators</h2>
              <p className="text-gray-600 text-sm text-center mb-8">
                Don&apos;t worry, you can add more collaborators once the trip has been created!
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newCollaborator}
                    onChange={(e) => setNewCollaborator(e.target.value)}
                    className="flex-1 h-12 px-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#ff5a58] focus:border-transparent text-gray-900"
                    placeholder="Enter Email Address"
                    onKeyPress={(e) => e.key === 'Enter' && addCollaborator()}
                  />
                  <button
                    onClick={addCollaborator}
                    className="w-12 h-12 bg-[#ff5a58] hover:bg-[#ff4a47] text-white rounded-xl flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {formData.collaborators.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.collaborators.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-sm text-gray-700">{email}</span>
                        <button
                          onClick={() => removeCollaborator(email)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={nextStep}
                className="w-full h-12 rounded-xl bg-[#ff5a58] hover:bg-[#ff4a47] text-white font-semibold transition-colors"
              >
                Next
              </button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex-1 flex flex-col h-full px-8 py-10">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl text-[#303030] font-extrabold text-center mb-2">Select Your Interests</h2>
              <p className="text-gray-600 text-sm text-center mb-8">
                Get personalized recommendations from our smart recommendation system
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                {interestCategories.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`h-12 px-3 rounded-xl text-sm font-medium transition-colors ${
                      formData.interests.includes(interest)
                        ? 'bg-[#ff5a58] text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.title}
                className="w-full h-12 rounded-xl bg-[#ff5a58] hover:bg-[#ff4a47] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {loading ? "Creating..." : "Create Trip"}
              </button>

              {renderStepIndicator()}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div 
        className="absolute inset-0 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div 
          className="w-full max-w-4xl h-[600px] bg-white rounded-[28px] shadow-2xl overflow-hidden relative"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ 
            duration: 0.4,
            ease: "easeOut"
          }}
        >
          <motion.button
            aria-label="Close"
            className="cursor-pointer absolute right-4 top-4 h-9 w-9 rounded-full flex items-center justify-center text-[#888] hover:bg-[#f3f3f3] z-10"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <X className="w-5 h-5" />
          </motion.button>

          <div className="grid md:grid-cols-[1fr_1.3fr] h-full">
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
              <div className="flex-1 flex flex-col h-full">
                {renderStepContent()}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
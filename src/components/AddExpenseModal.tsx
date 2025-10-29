"use client";

import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, Users, Tag, Plus, Minus, AlertCircle, ChevronDownIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { ActivityLogger } from "@/lib/activityLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import Avatar from "@/components/ui/avatar";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  participants: { id: string; name: string; avatar_url?: string }[];
  onExpenseAdded: (expenseData?: { title: string; amount: number; userId: string }) => void;
}

interface ExpenseFormData {
  title: string;
  description: string;
  amount: string;
  category: 'food' | 'transportation' | 'accommodation' | 'activity' | 'shopping' | 'other';
  paidBy: string;
  splitType: 'everyone' | 'custom';
  splitWith: string[];
  customAmounts: Record<string, string>;
  expenseDate: string;
}

const expenseCategories = [
  { value: 'food', label: 'Food', color: 'bg-green-100 text-green-800' },
  { value: 'transportation', label: 'Transportation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accommodation', label: 'Accommodation', color: 'bg-blue-100 text-blue-800' },
  { value: 'activity', label: 'Activity', color: 'bg-purple-100 text-purple-800' },
  { value: 'shopping', label: 'Shopping', color: 'bg-pink-100 text-pink-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-dark-medium' }
];

export default function AddExpenseModal({ 
  open, 
  onClose, 
  tripId, 
  participants, 
  onExpenseAdded 
}: AddExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    description: '',
    amount: '',
    category: 'food',
    paidBy: '',
    splitType: 'everyone',
    splitWith: [],
    customAmounts: {},
    expenseDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && participants.length > 0) {
      setFormData(prev => ({
        ...prev,
        paidBy: participants[0].id
      }));
    }
  }, [open, participants]);

  const handleInputChange = (field: keyof ExpenseFormData, value: string | string[] | Record<string, string>) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate total of custom amounts
  const getCustomAmountTotal = () => {
    return Object.values(formData.customAmounts).reduce((total, amount) => {
      return total + (parseFloat(amount) || 0);
    }, 0);
  };

  // Get remaining amount for custom splitting
  const getRemainingAmount = () => {
    const total = parseFloat(formData.amount) || 0;
    const customTotal = getCustomAmountTotal();
    return total - customTotal;
  };

  // Add participant to split
  const addParticipantToSplit = (participantId: string) => {
    if (!formData.splitWith.includes(participantId)) {
      setFormData(prev => ({
        ...prev,
        splitWith: [...prev.splitWith, participantId],
        customAmounts: {
          ...prev.customAmounts,
          [participantId]: ''
        }
      }));
    }
  };

  // Remove participant from split
  const removeParticipantFromSplit = (participantId: string) => {
    setFormData(prev => {
      const newSplitWith = prev.splitWith.filter(id => id !== participantId);
      const newCustomAmounts = { ...prev.customAmounts };
      delete newCustomAmounts[participantId];
      return {
        ...prev,
        splitWith: newSplitWith,
        customAmounts: newCustomAmounts
      };
    });
  };

  // Update custom amount for a participant
  const updateCustomAmount = (participantId: string, amount: string) => {
    setFormData(prev => ({
      ...prev,
      customAmounts: {
        ...prev.customAmounts,
        [participantId]: amount
      }
    }));
  };

  // Auto-distribute remaining amount
  const autoDistributeRemaining = () => {
    const remaining = getRemainingAmount();
    const splitCount = formData.splitWith.length;
    if (splitCount > 0 && remaining > 0) {
      const amountPerPerson = remaining / splitCount;
      const newCustomAmounts = { ...formData.customAmounts };
      formData.splitWith.forEach(participantId => {
        if (!newCustomAmounts[participantId] || newCustomAmounts[participantId] === '') {
          newCustomAmounts[participantId] = amountPerPerson.toFixed(2);
        }
      });
      setFormData(prev => ({
        ...prev,
        customAmounts: newCustomAmounts
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter an expense title');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.paidBy) {
      toast.error('Please select who paid for this expense');
      return;
    }

    // Validate custom splitting
    if (formData.splitType === 'custom') {
      if (formData.splitWith.length === 0) {
        toast.error('Please select at least one person to split with');
        return;
      }

      const customTotal = getCustomAmountTotal();
      const expectedTotal = parseFloat(formData.amount);
      const difference = Math.abs(customTotal - expectedTotal);
      
      if (difference > 0.01) {
        toast.error(`Custom amounts total $${customTotal.toFixed(2)} but expense is $${expectedTotal.toFixed(2)}`);
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare split_with data
      let splitWithData;
      if (formData.splitType === 'everyone') {
        splitWithData = 'everyone';
      } else {
        splitWithData = formData.splitWith;
      }

      const { error } = await supabase
        .from('expenses')
        .insert([
          {
            trip_id: tripId,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            amount: parseFloat(formData.amount),
            category: formData.category,
            paid_by: formData.paidBy,
            added_by: user.id,
            split_with: splitWithData,
            split_amounts: formData.splitType === 'custom' ? 
              Object.fromEntries(
                Object.entries(formData.customAmounts).map(([key, value]) => [key, parseFloat(value) || 0])
              ) : null,
            expense_date: formData.expenseDate
          }
        ]);

      if (error) throw error;

      toast.success('Expense added successfully!');
      onExpenseAdded({ 
        title: formData.title, 
        amount: parseFloat(formData.amount), 
        userId: formData.paidBy 
      });
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        amount: '',
        category: 'food',
        paidBy: participants[0]?.id || '',
        splitType: 'everyone',
        splitWith: [],
        customAmounts: {},
        expenseDate: new Date().toISOString().split('T')[0]
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Expense Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Train Ticket Fare and Taxi to Hotel"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="resize-none"
              rows={3}
              placeholder="Brief description of the expense..."
            />
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category" className="text-sm font-medium text-gray-700">
              Category *
            </Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <Badge className={category.color}>{category.label}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paid By */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="paidBy" className="text-sm font-medium text-gray-700">
                Paid By *
              </Label>
              <div className="text-xs text-gray-500">
                You can add expenses for anyone
              </div>
            </div>
            <Select value={formData.paidBy} onValueChange={(value) => {
              handleInputChange('paidBy', value);
            }}>
              <SelectTrigger id="paidBy">
                <SelectValue placeholder="Select who paid" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={participant.name}
                        imageUrl={participant.avatar_url}
                        size="sm"
                        showTooltip={false}
                      />
                      <span>{participant.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Type */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Split With *
            </Label>
            <div className="space-y-3">
              <Button
                onClick={() => handleInputChange('splitType', 'everyone')}
                variant={formData.splitType === 'everyone' ? 'default' : 'outline'}
                className={`w-full p-3 ${
                  formData.splitType === 'everyone'
                    ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Split with Everyone</span>
                </div>
              </Button>

              <Button
                onClick={() => handleInputChange('splitType', 'custom')}
                variant={formData.splitType === 'custom' ? 'default' : 'outline'}
                className={`w-full p-3 ${
                  formData.splitType === 'custom'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Custom Split</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Custom Split Section */}
          {formData.splitType === 'custom' && (
            <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Select Participants & Amounts
                </Label>
                <div className="text-sm text-gray-500">
                  Total: ${getCustomAmountTotal().toFixed(2)} / ${formData.amount || '0.00'}
                </div>
              </div>

              {/* Add Participants */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Add Participants:</Label>
                <div className="flex flex-wrap gap-2">
                  {participants
                    .filter(p => !formData.splitWith.includes(p.id))
                    .map((participant) => (
                      <Button
                        key={participant.id}
                        onClick={() => addParticipantToSplit(participant.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Avatar
                          name={participant.name}
                          imageUrl={participant.avatar_url}
                          size="sm"
                          showTooltip={false}
                        />
                        <span>{participant.name}</span>
                        <Plus className="w-3 h-3" />
                      </Button>
                    ))}
                </div>
              </div>

              {/* Custom Amounts */}
              {formData.splitWith.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-600">Set Amounts:</Label>
                    <Button
                      onClick={autoDistributeRemaining}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Auto-distribute remaining
                    </Button>
                  </div>
                  
                  {formData.splitWith.map((participantId) => {
                    const participant = participants.find(p => p.id === participantId);
                    if (!participant) return null;
                    
                    return (
                      <div key={participantId} className="flex items-center gap-3 p-3 bg-white rounded border">
                        <Avatar
                          name={participant.name}
                          imageUrl={participant.avatar_url}
                          size="sm"
                          showTooltip={false}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{participant.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.customAmounts[participantId] || ''}
                              onChange={(e) => updateCustomAmount(participantId, e.target.value)}
                              className="w-24 pl-7 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <Button
                            onClick={() => removeParticipantFromSplit(participantId)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Validation Message */}
              {formData.splitType === 'custom' && formData.amount && (
                <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                  Math.abs(getCustomAmountTotal() - parseFloat(formData.amount)) <= 0.01
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  {Math.abs(getCustomAmountTotal() - parseFloat(formData.amount)) <= 0.01
                    ? 'Amounts match perfectly!'
                    : `Remaining: $${getRemainingAmount().toFixed(2)}`
                  }
                </div>
              )}
            </div>
          )}

          {/* Expense Date */}
          <div>
            <Label htmlFor="expenseDate" className="text-sm font-medium text-gray-700">
              Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal cursor-pointer focus-visible:ring-[#ff5a58] focus-visible:ring-2"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.expenseDate ? new Date(formData.expenseDate).toLocaleDateString() : "Select expense date"}
                  <ChevronDownIcon className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.expenseDate ? new Date(formData.expenseDate) : undefined}
                  captionLayout="dropdown"
                  onSelect={(date: Date | undefined) => {
                    handleInputChange('expenseDate', date ? date.toISOString().slice(0,10) : '');
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

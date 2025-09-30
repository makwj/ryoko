"use client";

import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, Users, Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  participants: { id: string; name: string }[];
  onExpenseAdded: () => void;
}

interface ExpenseFormData {
  title: string;
  description: string;
  amount: string;
  category: 'food' | 'transportation' | 'accommodation' | 'activity' | 'shopping' | 'other';
  paidBy: string;
  splitWith: string[] | 'everyone';
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
    splitWith: 'everyone',
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

  const handleInputChange = (field: keyof ExpenseFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    setLoading(true);

    try {
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
            split_with: formData.splitWith,
            expense_date: formData.expenseDate
          }
        ]);

      if (error) throw error;

      toast.success('Expense added successfully!');
      onExpenseAdded();
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        amount: '',
        category: 'food',
        paidBy: participants[0]?.id || '',
        splitWith: 'everyone',
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="paidBy" className="text-sm font-medium text-gray-700">
              Paid By *
            </Label>
            <Select value={formData.paidBy} onValueChange={(value) => handleInputChange('paidBy', value)}>
              <SelectTrigger id="paidBy">
                <SelectValue placeholder="Select who paid" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split With */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Split With *
            </Label>
            <div className="space-y-2">
              <Button
                onClick={() => handleInputChange('splitWith', 'everyone')}
                variant={formData.splitWith === 'everyone' ? 'default' : 'outline'}
                className={`w-full p-3 ${
                  formData.splitWith === 'everyone'
                    ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Split with Everyone</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Expense Date */}
          <div>
            <Label htmlFor="expenseDate" className="text-sm font-medium text-gray-700">
              Date *
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="expenseDate"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                className="pl-10"
              />
            </div>
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

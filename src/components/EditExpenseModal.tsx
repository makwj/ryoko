"use client";

import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, Users, ChevronDownIcon } from "lucide-react";
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

interface EditExpenseModalProps {
  open: boolean;
  onClose: () => void;
  expense: {
    id: string;
    title: string;
    description?: string;
    amount: number;
    category: 'food' | 'transportation' | 'accommodation' | 'activity' | 'shopping' | 'other';
    paid_by: string;
    split_with: string[] | 'everyone';
    expense_date: string;
  };
  participants: { id: string; name: string }[];
  onExpenseUpdated: (expenseData?: { title: string; amount: number; userId: string }) => void;
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

export default function EditExpenseModal({ 
  open, 
  onClose, 
  expense,
  participants, 
  onExpenseUpdated 
}: EditExpenseModalProps) {
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
  const [openExpenseDate, setOpenExpenseDate] = useState(false);

  useEffect(() => {
    if (open && expense) {
      setFormData({
        title: expense.title,
        description: expense.description || '',
        amount: expense.amount.toString(),
        category: expense.category,
        paidBy: expense.paid_by,
        splitWith: expense.split_with,
        expenseDate: expense.expense_date
      });
    }
  }, [open, expense]);

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
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          amount: parseFloat(formData.amount),
          category: formData.category,
          paid_by: formData.paidBy,
          split_with: formData.splitWith,
          expense_date: formData.expenseDate
        })
        .eq('id', expense.id);

      if (error) throw error;

      toast.success('Expense updated successfully!');
      onExpenseUpdated({ 
        title: formData.title, 
        amount: parseFloat(formData.amount), 
        userId: formData.paidBy 
      });
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      if (error) throw error;

      toast.success('Expense deleted successfully!');
      onExpenseUpdated();
      onClose();
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
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700 flex items-center justify-between">
              <span>Expense Title</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                Required
              </span>
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
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700 flex items-center justify-between">
              <span>Amount</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                Required
              </span>
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
            <Label htmlFor="category" className="text-sm font-medium text-gray-700 flex items-center justify-between">
              <span>Category</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                Required
              </span>
            </Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <Badge className={category.color}>{category.label}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paid By */}
          <div>
            <Label htmlFor="paidBy" className="text-sm font-medium text-gray-700 flex items-center justify-between">
              <span>Paid By</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                Required
              </span>
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
            <Label className="text-sm font-medium text-gray-700 flex items-center justify-between">
              <span>Split With</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                Required
              </span>
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
            <Label htmlFor="expenseDate" className="text-sm font-medium text-gray-700 flex items-center justify-between">
              <span>Date</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                Required
              </span>
            </Label>
            <Popover open={openExpenseDate} onOpenChange={setOpenExpenseDate}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formData.expenseDate ? new Date(formData.expenseDate).toLocaleDateString() : "Select date"}
                  </span>
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.expenseDate ? new Date(formData.expenseDate) : undefined}
                  captionLayout="dropdown"
                  onSelect={(date: Date | undefined) => {
                    handleInputChange('expenseDate', date ? date.toISOString().slice(0,10) : '');
                    setOpenExpenseDate(false);
                  }}
              />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <Button
            onClick={handleDelete}
            disabled={loading}
            variant="destructive"
            className="px-4 py-3"
          >
            Delete
          </Button>
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
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


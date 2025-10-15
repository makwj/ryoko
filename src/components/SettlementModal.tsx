"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calculator, CheckCircle, AlertCircle, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ActivityLogger } from "@/lib/activityLogger";
import toast from "react-hot-toast";

interface Participant {
  id: string;
  name: string;
  avatar_url?: string;
}

interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

interface SettlementModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  participants: Participant[];
  expenses: any[];
  onSettlementGenerated?: () => void;
  currentUserId?: string;
}

export default function SettlementModal({
  open,
  onClose,
  tripId,
  participants,
  expenses,
  onSettlementGenerated,
  currentUserId
}: SettlementModalProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [paidSettlements, setPaidSettlements] = useState<any[]>([]);

  // Calculate settlements based on expenses
  const calculateSettlements = () => {
    if (!participants.length) return [];

    const balances: Record<string, number> = {};
    const participantMap: Record<string, string> = {};

    // Initialize balances and participant map
    participants.forEach(participant => {
      balances[participant.id] = 0;
      participantMap[participant.id] = participant.name;
    });

    // Calculate balances from expenses
    expenses.forEach(expense => {
      const totalAmount = expense.amount;
      const splitWith = expense.split_with;
      const splitAmounts = expense.split_amounts || {};
      
      // Person who paid gets credited
      balances[expense.paid_by] += totalAmount;

      // Determine how to split the expense
      if (splitWith === 'everyone') {
        // Split equally among all participants
        const participantsToSplitWith = participants.map(p => p.id);
        const totalSplitters = participantsToSplitWith.length;
        const amountPerPerson = totalAmount / totalSplitters;

        participantsToSplitWith.forEach((userId: string) => {
          balances[userId] -= amountPerPerson;
        });
      } else if (Array.isArray(splitWith)) {
        // Check if custom amounts are provided
        if (Object.keys(splitAmounts).length > 0) {
          // Use custom amounts
          Object.entries(splitAmounts).forEach(([userId, amount]) => {
            balances[userId] -= amount;
          });
        } else {
          // Split equally among selected participants
          const totalSplitters = splitWith.length;
          const amountPerPerson = totalAmount / totalSplitters;

          splitWith.forEach((userId: string) => {
            balances[userId] -= amountPerPerson;
          });
        }
      }
    });

    // Separate creditors and debtors
    const creditors: { id: string; name: string; amount: number }[] = [];
    const debtors: { id: string; name: string; amount: number }[] = [];

    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance > 0.01) {
        creditors.push({ id: userId, name: participantMap[userId], amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ id: userId, name: participantMap[userId], amount: Math.abs(balance) });
      }
    });

    // Sort by amount (largest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Generate optimized settlements
    const settlements: Settlement[] = [];
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const settlementAmount = Math.min(creditor.amount, debtor.amount);
      
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: settlementAmount
      });

      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;

      if (creditor.amount < 0.01) {
        creditorIndex++;
      }
      if (debtor.amount < 0.01) {
        debtorIndex++;
      }
    }

    return settlements;
  };

  // Fetch paid settlements
  const fetchPaidSettlements = async () => {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('trip_id', tripId)
        .eq('is_paid', true);

      if (error) throw error;
      setPaidSettlements(data || []);
    } catch (error) {
      console.error('Error fetching paid settlements:', error);
    }
  };

  // Mark settlement as paid
  const markAsPaid = async (settlement: Settlement) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('settlements')
        .insert([
          {
            trip_id: tripId,
            from_user_id: settlement.fromId,
            to_user_id: settlement.toId,
            amount: settlement.amount,
            is_paid: true,
            paid_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Log the payment activity
      if (currentUserId) {
        ActivityLogger.expenseSettled(
          tripId,
          currentUserId,
          settlement.amount,
          `${settlement.fromName} has paid ${settlement.toName} $${settlement.amount.toFixed(2)}`
        );
      }

      await fetchPaidSettlements();
      toast.success(`Marked ${settlement.fromName} → ${settlement.toName} as paid`);
    } catch (error: any) {
      console.error('Error marking settlement as paid:', error);
      toast.error(`Failed to mark as paid: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check if settlement is already paid
  const isSettlementPaid = (settlement: Settlement) => {
    return paidSettlements.some(paid => 
      paid.from_user_id === settlement.fromId &&
      paid.to_user_id === settlement.toId &&
      Math.abs(paid.amount - settlement.amount) < 0.01
    );
  };

  useEffect(() => {
    if (open) {
      const calculatedSettlements = calculateSettlements();
      setSettlements(calculatedSettlements);
      fetchPaidSettlements();
      
      // Log settlement generation activity
      if (onSettlementGenerated) {
        onSettlementGenerated();
      }
    }
  }, [open, expenses, participants, onSettlementGenerated]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calculator className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Payment Settlement</h2>
                <p className="text-sm text-gray-500">Who should pay how much to whom</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {settlements.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Settled!</h3>
              <p className="text-gray-500">Everyone's expenses are balanced. No payments needed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">How it works</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      The system calculates who owes money based on shared expenses. 
                      Mark payments as completed when they're made.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {settlements.map((settlement, index) => {
                  const isPaid = isSettlementPaid(settlement);
                  
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 transition-colors ${
                        isPaid 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isPaid ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <DollarSign className={`w-5 h-5 ${
                              isPaid ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {settlement.fromName}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-gray-900">
                                {settlement.toName}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {isPaid ? 'Payment completed' : 'Payment pending'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              ${settlement.amount.toFixed(2)}
                            </div>
                          </div>
                          {!isPaid && (
                            <button
                              onClick={() => markAsPaid(settlement)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark as Paid
                            </button>
                          )}
                          {isPaid && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">Paid</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

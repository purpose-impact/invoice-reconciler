'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface ReconciledInvoice {
  status: 'success' | 'failure';
  friendlyName: string;
  due_date: string;
  total_due?: number;
  errors?: string[];
}

interface ReconciledInvoicesListProps {
  invoices: ReconciledInvoice[];
}

export default function ReconciledInvoicesList({ invoices }: ReconciledInvoicesListProps) {
  // Sort invoices by due_date, oldest first
  const sortedInvoices = [...invoices].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="space-y-2">
      {sortedInvoices.map((invoice, index) => (
        <InvoiceItem key={index} invoice={invoice} />
      ))}
    </div>
  );
}

function InvoiceItem({ invoice }: { invoice: ReconciledInvoice }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium">{invoice.friendlyName}</div>
            <div className="text-sm text-gray-500">
              Due: {new Date(invoice.due_date).toLocaleDateString()}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {invoice.status === 'success' && invoice.total_due && (
              <div className="text-sm font-medium">
                ${invoice.total_due.toFixed(2)}
              </div>
            )}
            <div className="text-2xl">
              {invoice.status === 'success' ? '🟢' : '🔴'}
            </div>
            {invoice.status === 'failure' && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </div>
        </div>

        {isExpanded && invoice.errors && invoice.errors.length > 0 && (
          <div className="mt-2 pl-4 border-l-2 border-gray-200">
            <ul className="list-disc space-y-1">
              {invoice.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-600">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 

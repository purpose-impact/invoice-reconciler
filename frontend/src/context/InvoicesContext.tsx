'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ReconciledInvoice {
  contract_id: string;
  invoice_data: any; // Replace with actual invoice data type
}

interface InvoicesContextType {
  reconciledInvoices: Record<string, ReconciledInvoice[]>;
  addReconciledInvoice: (contractId: string, invoiceData: any) => void;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [reconciledInvoices, setReconciledInvoices] = useState<Record<string, ReconciledInvoice[]>>({});

  const addReconciledInvoice = (contractId: string, invoiceData: any) => {
    setReconciledInvoices(prev => ({
      ...prev,
      [contractId]: [...(prev[contractId] || []), { contract_id: contractId, invoice_data: invoiceData }]
    }));
  };

  return (
    <InvoicesContext.Provider value={{ reconciledInvoices, addReconciledInvoice }}>
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoicesContext);
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoicesProvider');
  }
  return context;
} 

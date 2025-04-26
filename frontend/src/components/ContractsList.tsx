'use client';

import { useState, useEffect } from 'react';
import { useInvoices } from '@/context/InvoicesContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import InvoiceUpload from './InvoiceUpload';

interface Contract {
  id: string;
  friendlyName: string | null;
  fileName: string;
}

export default function ContractsList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState('');
  const { reconciledInvoices } = useInvoices();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const apiKey = localStorage.getItem('apiKey');
        const indexId = localStorage.getItem('index_id');
        const projectId = localStorage.getItem('project_id');
        const organizationId = localStorage.getItem('organization_id');

        const response = await fetch('/api/contracts/list', {
          headers: {
            'X-API-Key': apiKey || '',
            'X-Index-ID': indexId || '',
            'X-Project-ID': projectId || '',
            'X-Organization-ID': organizationId || '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setContracts(data);
        } else {
          setError('Failed to fetch contracts');
        }
      } catch (err) {
        setError('Error fetching contracts');
      }
    };

    // Initial fetch
    fetchContracts();

    // Set up polling
    const intervalId = setInterval(fetchContracts, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  console.log("reconciledInvoices", reconciledInvoices);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {contracts.map(contract => (
        <Card key={contract.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{contract.friendlyName || "Unnamed contract"}</CardTitle>
              <CardDescription className="text-right">{contract.fileName}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {reconciledInvoices[contract.id] && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Reconciled Invoices:</h3>
                <div className="space-y-2">
                  {reconciledInvoices[contract.id].map((invoice, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      <pre className="text-sm">
                        {JSON.stringify(invoice.invoice_data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <InvoiceUpload />
    </div>
  );
} 

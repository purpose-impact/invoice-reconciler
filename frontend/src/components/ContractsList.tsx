'use client';

import { useState, useEffect } from 'react';
import { useInvoices } from '@/context/InvoicesContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import InvoiceUpload from './InvoiceUpload';
import ReconciledInvoicesList from './ReconciledInvoicesList';

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

        // Skip API call if any required ID is missing
        if (!apiKey || !indexId || !projectId || !organizationId) {
          return;
        }

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
          
          // Call setname endpoint for contracts with empty friendly names
          data.forEach((contract: Contract) => {
            if (!contract.friendlyName) {
              fetch(`/api/contracts/setname?contract_id=${contract.id}`, {
                headers: {
                  'X-API-Key': localStorage.getItem('apiKey') || '',
                  'X-Index-ID': localStorage.getItem('index_id') || '',
                  'X-Project-ID': localStorage.getItem('project_id') || '',
                  'X-Organization-ID': localStorage.getItem('organization_id') || '',
                },
              }).catch(err => {
                console.error('Error setting contract name:', err);
              });
            }
          });
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
                <ReconciledInvoicesList 
                  invoices={reconciledInvoices[contract.id].map(invoice => invoice.invoice_data)} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <InvoiceUpload />
    </div>
  );
} 

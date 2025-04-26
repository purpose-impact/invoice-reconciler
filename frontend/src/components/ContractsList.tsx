'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvoiceUpload from './InvoiceUpload';

interface Contract {
  id: string;
  friendlyName: string | null;
  fileName: string;
}

export default function ContractsList() {
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const apiKey = localStorage.getItem('apiKey');
        const organizationId = localStorage.getItem('organization_id');
        const projectId = localStorage.getItem('project_id');
        const indexId = localStorage.getItem('index_id');

        const response = await fetch('/api/contracts/list', {
          headers: {
            'X-API-Key': apiKey || '',
            'X-Organization-Id': organizationId || '',
            'X-Project-Id': projectId || '',
            'X-Index-Id': indexId || '',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setContracts(data);
        }
      } catch (err) {
        console.error('Error fetching contracts:', err);
      }
    };

    // Initial fetch
    fetchContracts();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchContracts, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-gray-500">No contracts found</p>
          ) : (
            <ul className="space-y-2">
              {contracts.map((contract, index) => (
                <li 
                  key={index} 
                  className="flex justify-between items-center p-2 border rounded"
                  data-document-id={contract.id}
                >
                  <span className="font-medium">
                    {contract.friendlyName || 'Unnamed Contract'}
                  </span>
                  <span className="text-sm text-gray-500">{contract.fileName}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <InvoiceUpload />
    </>
  );
} 

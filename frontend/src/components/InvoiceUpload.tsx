'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useInvoices } from '@/context/InvoicesContext';

interface UploadedFile {
  fileName: string;
  job_id: string;
  status: 'pending' | 'success' | 'error';
  reconciling?: boolean;  // Track reconciliation status
}

export default function InvoiceUpload() {
  const { addReconciledInvoice } = useInvoices();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  // Ref to track files that have started reconciliation to prevent duplicates
  const reconciliationStartedRef = useRef<Set<string>>(new Set());

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Poll job status for each pending file
  useEffect(() => {
    if (uploadedFiles.length === 0) return;

    const pendingFiles = uploadedFiles.filter(file => file.status === 'pending');
    if (pendingFiles.length === 0) return;

    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;

    const intervals: NodeJS.Timeout[] = [];

    pendingFiles.forEach(file => {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/invoices/status?job_id=${file.job_id}`, {
            headers: {
              'X-API-Key': apiKey
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'SUCCESS') {
              // Check if reconciliation has already been started for this file
              if (!reconciliationStartedRef.current.has(file.job_id)) {
                reconciliationStartedRef.current.add(file.job_id);
                startReconciliation(file.job_id);
              }
              
              setUploadedFiles(prev => {
                return prev.map(f => {
                  if (f.job_id === file.job_id) {
                    return { ...f, status: 'success' as const };
                  }
                  return f;
                });
              });
              
              clearInterval(interval);
            } else if (data.status === 'ERROR' || data.status === 'CANCELLED') {
              setUploadedFiles(prev => 
                prev.map(f => 
                  f.job_id === file.job_id ? { ...f, status: 'error' } : f
                )
              );
              clearInterval(interval);
            }
          } else {
            // If our endpoint returns an error, mark as error
            setUploadedFiles(prev => 
              prev.map(f => 
                f.job_id === file.job_id ? { ...f, status: 'error' } : f
              )
            );
            clearInterval(interval);
          }
        } catch (err) {
          console.error(`Error polling status for job ${file.job_id}:`, err);
        }
      }, 3000); // Poll every 3 seconds
      
      intervals.push(interval);
    });

    // Clean up all intervals when the component unmounts
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [uploadedFiles]);

  // Function to start the reconciliation process
  const startReconciliation = async (jobId: string) => {
    const apiKey = localStorage.getItem('apiKey');
    const indexId = localStorage.getItem('index_id');
    const projectId = localStorage.getItem('project_id');
    const organizationId = localStorage.getItem('organization_id');

    if (!apiKey) return;

    // Update the file status to show reconciling
    setUploadedFiles(prev => 
      prev.map(f => 
        f.job_id === jobId ? { ...f, reconciling: true } : f
      )
    );

    try {
      const response = await fetch(`/api/invoices/reconcile?job_id=${jobId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'X-Index-ID': indexId || '',
          'X-Project-ID': projectId || '',
          'X-Organization-ID': organizationId || '',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Add the reconciled invoice data to the context
        addReconciledInvoice(data.contractId, data);
        console.log(`Reconciled invoice added for contract ${data.contractId}`);
        
        // Update the file status to show reconciliation is complete
        setUploadedFiles(prev => 
          prev.map(f => 
            f.job_id === jobId ? { ...f, reconciling: false } : f
          )
        );
      }
    } catch (err) {
      console.error(`Error starting reconciliation for job ${jobId}:`, err);
      // Optionally mark reconciliation as failed
      setUploadedFiles(prev => 
        prev.map(f => 
          f.job_id === jobId ? { ...f, reconciling: false } : f
        )
      );
      // Remove from the tracking set on error
      reconciliationStartedRef.current.delete(jobId);
    }
  };

  // Reset reconciliation tracking when unmounting
  useEffect(() => {
    return () => {
      reconciliationStartedRef.current.clear();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      const fileNames = files.map(file => file.name);
      formData.append('fileNames', JSON.stringify(fileNames));

      const apiKey = localStorage.getItem('apiKey');
      const indexId = localStorage.getItem('index_id');
      const projectId = localStorage.getItem('project_id');
      const organizationId = localStorage.getItem('organization_id');

      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey || '',
          'X-Index-ID': indexId || '',
          'X-Project-ID': projectId || '',
          'X-Organization-ID': organizationId || '',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.files && Array.isArray(data.files)) {
          // Add new files to the tracking list with pending status
          const newFiles = data.files.map((file: {fileName: string, job_id: string}) => ({
            ...file,
            status: 'pending' as const
          }));
          
          setUploadedFiles(prev => [...prev, ...newFiles]);
        }
        
        setSuccess('Invoices uploaded successfully');
        setFiles([]);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to upload invoices');
      }
    } catch (err) {
      setError('Error uploading invoices');
    } finally {
      setUploading(false);
    }
  };

  // Get status icon component
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center">
            <span className="mr-2 text-yellow-500">🟡</span>
            <Loader2 className="animate-spin h-4 w-4 text-yellow-500" />
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center">
            <span className="mr-2 text-green-500">🟢</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center">
            <span className="mr-2 text-red-500">🔴</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
        );
      default:
        return (
          <div className="flex items-center">
            <span className="mr-2 text-yellow-500">🟡</span>
            <Loader2 className="animate-spin h-4 w-4 text-yellow-500" />
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-3xl mt-6">
      <CardHeader>
        <CardTitle>Upload Invoices</CardTitle>
        <CardDescription>
          Drag and drop or select files to upload
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('invoiceFileInput')?.click()}
          >
            <div className="space-y-1">
              <p>Drag and drop files here, or click to select</p>
              <p className="text-sm text-gray-500">Upload multiple invoice files</p>
            </div>
            <input
              id="invoiceFileInput"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium">Selected files:</p>
              <ul className="space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="font-medium">Processing status:</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 px-3 border">Invoice Name</th>
                      <th className="text-center p-2 px-3 border">Parsing</th>
                      <th className="text-center p-2 px-3 border">Reconciling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedFiles.map((file, index) => (
                      <tr key={index} className="border">
                        <td className="p-2 px-3 border">
                          <span className="truncate block">{file.fileName}</span>
                        </td>
                        <td className="p-2 px-3 border text-center">
                          <StatusIcon status={file.status} />
                        </td>
                        <td className="p-2 px-3 border text-center">
                          {file.reconciling ? (
                            <div className="flex items-center justify-center">
                              <span className="mr-2">🔄</span>
                              <span>reconciling...</span>
                              <Loader2 className="ml-2 animate-spin h-4 w-4" />
                            </div>
                          ) : file.status === 'success' ? (
                            <div className="flex items-center justify-center">
                              <span className="mr-2">✅</span>
                              <span>Reconciled</span>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={files.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Invoices'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 

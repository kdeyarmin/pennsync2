import React from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureRequestCreator from '@/components/signer/SignatureRequestCreator';

export default function CreateSignatureRequest() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create Signature Request</h1>
        <p className="text-gray-600 mt-1">Upload a document and request secure signatures from recipients.</p>
      </div>
      <SignatureRequestCreator onCancel={() => navigate('/DocumentHub')} />
    </div>
  );
}
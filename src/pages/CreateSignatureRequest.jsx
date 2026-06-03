import { useNavigate } from 'react-router-dom';
import SignatureRequestCreator from '@/components/signer/SignatureRequestCreator';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import { Pen } from 'lucide-react';

export default function CreateSignatureRequest() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PageHeader
        icon={Pen}
        eyebrow="Documentation"
        title="Create Signature Request"
        description="Upload a document and request secure signatures from recipients."
        favoritePage="CreateSignatureRequest"
      />
      <SignatureRequestCreator onCancel={() => navigate('/DocumentHub')} />
    </PageContainer>
  );
}

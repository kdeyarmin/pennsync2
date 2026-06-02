import PhysicianDirectory from '../components/physician/PhysicianDirectory';
import PageHeader from '@/components/ui/PageHeader';
import { BookUser } from 'lucide-react';

export default function PhysicianDirectoryPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        icon={BookUser}
        title="Provider Directory"
        description="Manage and search provider contact information"
      />
      <PhysicianDirectory mode="directory" />
    </div>
  );
}
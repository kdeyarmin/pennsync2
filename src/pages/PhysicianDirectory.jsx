import PhysicianDirectory from '../components/physician/PhysicianDirectory';
import PageHeader from '@/components/ui/PageHeader';
import { BookUser } from 'lucide-react';

export default function PhysicianDirectoryPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
<<<<<<< HEAD
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Provider Directory</h1>
        <p className="text-sm sm:text-base text-slate-600">Manage and search provider contact information</p>
      </div>
=======
      <PageHeader
        icon={BookUser}
        title="Provider Directory"
        description="Manage and search provider contact information"
      />
>>>>>>> origin/main
      <PhysicianDirectory mode="directory" />
    </div>
  );
}
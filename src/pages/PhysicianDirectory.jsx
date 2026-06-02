import PhysicianDirectory from '../components/physician/PhysicianDirectory';

export default function PhysicianDirectoryPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Provider Directory</h1>
        <p className="text-sm sm:text-base text-slate-600">Manage and search provider contact information</p>
      </div>
      <PhysicianDirectory mode="directory" />
    </div>
  );
}
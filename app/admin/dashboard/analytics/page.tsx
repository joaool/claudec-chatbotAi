import SuperAnalyticsTable from '@/components/admin/SuperAnalyticsTable';

export default function SuperAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Analytics — All Clients</h1>
      <p className="text-sm text-gray-500 mb-8">Browse conversations across all clients. Filter by client, keyword, or date.</p>
      <SuperAnalyticsTable />
    </div>
  );
}

import AnalyticsTable from '@/components/admin/AnalyticsTable';

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Analytics</h1>
      <p className="text-sm text-gray-500 mb-8">
        Browse and search all user questions and AI responses. Filter by keyword or date range.
      </p>
      <AnalyticsTable />
    </div>
  );
}

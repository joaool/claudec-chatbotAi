import DocumentManager from '@/components/admin/DocumentManager';

export default function DocumentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Documents</h1>
      <p className="text-sm text-gray-500 mb-8">
        Upload files to the knowledge base. The assistant will use these documents to answer user questions.
      </p>
      <DocumentManager />
    </div>
  );
}

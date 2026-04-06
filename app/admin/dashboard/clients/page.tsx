import ClientsList from '@/components/admin/ClientsList';

export default function ClientsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Clients</h1>
      <p className="text-sm text-gray-500 mb-8">
        Each client gets their own chatbot URL, OpenAI API key, documents, assistants, and analytics.
      </p>
      <ClientsList />
    </div>
  );
}

import BrandingForm from '@/components/admin/BrandingForm';
import ClientAccessForm from '@/components/admin/ClientAccessForm';

export default function SettingsPage() {
  return (
    <div className="space-y-12">
      {/* Branding */}
      <section>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
        <p className="text-sm text-gray-500 mb-8">
          Configure the chatbot label and icon shown to end users.
        </p>
        <BrandingForm />
      </section>

      <hr className="border-gray-200" />

      {/* Client access */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Client Access</h2>
        <p className="text-sm text-gray-500 mb-6">
          Set a separate password for client users to access this admin panel.
          The super admin password (set in environment variables) always remains active.
        </p>
        <ClientAccessForm />
      </section>
    </div>
  );
}

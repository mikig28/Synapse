import React from 'react';
import LinkTelegramChat from '@/components/settings/LinkTelegramChat';

// Assuming you might have other settings components or sections
// import OtherSettingsSection from '@/components/settings/OtherSettingsSection';

const SettingsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold text-primary mb-6">Settings</h1>

      {/* Section for Linking Telegram Chat */}
      <section>
        <LinkTelegramChat />
      </section>

      {/* Example: Placeholder for other settings sections you might add later */}
      {/* 
      <section>
        <h2 className="text-xl font-semibold mb-3 text-foreground">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your profile information.</p>
        { <OtherSettingsSection /> }
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 text-foreground">Account Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences.</p>
      </section>
      */}

    </div>
  );
};

export default SettingsPage; 
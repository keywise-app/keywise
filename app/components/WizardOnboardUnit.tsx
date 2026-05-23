'use client';
import AddTenantWizard from './AddTenantWizard';

export default function WizardOnboardUnit({ onClose }: { onClose: () => void }) {
  return (
    <AddTenantWizard
      onClose={onClose}
      onComplete={(lease) => { onClose(); }}
    />
  );
}

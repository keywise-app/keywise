import type { Metadata } from 'next';
import InspectionCapture from './InspectionCapture';

export const metadata: Metadata = {
  title: 'New Inspection | Keywise',
  description: 'Capture room-by-room photos for AB 2801 compliance',
};

export default function NewInspectionPage({
  params,
}: {
  params: { unitId: string };
}) {
  return <InspectionCapture unitId={params.unitId} />;
}

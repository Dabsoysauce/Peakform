import { Suspense } from 'react';
import MessagesPage from '../../components/MessagesPage';

export default function CoachMessagesPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-center py-12">Loading...</div>}>
      <MessagesPage />
    </Suspense>
  );
}

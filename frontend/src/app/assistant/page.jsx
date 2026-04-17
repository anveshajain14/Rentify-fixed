'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AssistantChat from '@/components/chat/AssistantChat';

export default function AssistantPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <AssistantChat />
      </div>

      <Footer />
    </main>
  );
}

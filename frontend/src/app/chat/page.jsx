'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UserChat from '@/components/chat/UserChat';

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <UserChat />
      </div>

      <Footer />
    </main>
  );
}

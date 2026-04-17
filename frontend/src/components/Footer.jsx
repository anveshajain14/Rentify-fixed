'use client';

import Link from 'next/link';
import { Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tighter text-foreground">RENT<span className="text-emerald-500 dark:text-cyan-400 italic">IFY</span></span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Premium rental marketplace for the modern world. Rent verified high-end products with ease.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram"><Instagram size={20} /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter"><Twitter size={20} /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook"><Facebook size={20} /></a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-foreground">Marketplace</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground transition-colors">Browse All</Link></li>
              <li><Link href="/products?category=Electronics" className="hover:text-foreground transition-colors">Electronics</Link></li>
              <li><Link href="/products?category=Furniture" className="hover:text-foreground transition-colors">Furniture</Link></li>
              <li><Link href="/products?category=Photography" className="hover:text-foreground transition-colors">Photography</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Rental Policies</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Safety Guidelines</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-foreground">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">Subscribe to get updates on new premium listings.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" aria-label="Newsletter email" className="bg-input border border-border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground" />
              <button type="button" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Join</button>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 RENTIFY Marketplace. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

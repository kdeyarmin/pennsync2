import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Shield, Bell, Menu, X, ChevronLeft } from "lucide-react";

const BACK_PAGES = ['PatientDetails', 'DocumentSignatures', 'DocumentVisit', 'ReferralAdmissionNote'];

export default function MobileHeader({ currentPageName, totalNotificationCount, mobileMenuOpen, onToggleMobileMenu, onOpenNotificationCenter }) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-800 shadow-md border-b border-slate-700 h-16 flex items-center justify-between px-4 print:hidden">
      <div className="flex items-center gap-2">
        {BACK_PAGES.includes(currentPageName) && (
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700 h-10 w-10 mr-1" onClick={() => window.history.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/52cac091f_20170AA9-BB95-4BA4-B4E7-793615312CC4.png" alt="Penn Sync Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg text-white">Penn Sync</span>
        </Link>
        <div className="hidden sm:flex items-center gap-1 text-green-300 text-xs font-medium ml-2">
          <Shield className="w-3 h-3" /> Secure
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-slate-700 h-12 w-12" onClick={onOpenNotificationCenter}>
          <Bell className="w-5 h-5" />
          {totalNotificationCount > 0 && (
            <span className="absolute top-2 right-2 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{totalNotificationCount}</span>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleMobileMenu} className="text-white hover:bg-slate-700 h-12 w-12">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>
    </div>
  );
}
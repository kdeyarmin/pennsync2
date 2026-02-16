import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookUser, Users } from "lucide-react";
import FaxAddressBook from "../components/fax/FaxAddressBook";

export default function FaxAddressBookPage() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookUser className="w-8 h-8" />
            Fax Address Book
          </h1>
          <p className="text-gray-600 mt-2">
            Manage shared fax contacts for quick access when sending faxes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Contacts
            </CardTitle>
            <CardDescription>
              Add contacts manually or upload a CSV file with columns: name, fax, organization (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FaxAddressBook />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
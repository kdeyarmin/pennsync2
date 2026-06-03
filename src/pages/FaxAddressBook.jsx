import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookUser, Users } from "lucide-react";
import FaxAddressBook from "../components/fax/FaxAddressBook";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";

export default function FaxAddressBookPage() {
  return (
    <PageContainer>
      <PageHeader
        icon={BookUser}
        eyebrow="Communication"
        title="Fax Address Book"
        description="Manage shared fax contacts for quick access when sending faxes"
        favoritePage="FaxAddressBook"
      />

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
    </PageContainer>
  );
}
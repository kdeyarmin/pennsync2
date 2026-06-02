import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Mail, Eye, EyeOff, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const generateTemporaryPassword = () => {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + numbers + symbols;
  
  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default function AdminUserSetup() {
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "user",
    staff_type: "office" // rn, lpn, office
  });
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const successTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); };
  }, []);

  const handleGenerate = () => {
    const pwd = generateTemporaryPassword();
    setTemporaryPassword(pwd);
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(temporaryPassword);
    toast.success("Password copied to clipboard");
  };

  const handleSetupUser = async () => {
    if (!formData.email || !formData.full_name || !temporaryPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // Create user through backend function
       const { user } = await base44.functions.invoke('createUserWithTempPassword', {
         email: formData.email,
         full_name: formData.full_name,
         role: formData.role,
         staff_type: formData.role === 'user' ? formData.staff_type : null,
         temporary_password: temporaryPassword
       });

      // Send welcome email
      await base44.functions.invoke('sendWelcomeEmail', {
        email: formData.email,
        full_name: formData.full_name,
        temporary_password: temporaryPassword
      });

      setCreatedUser({
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role
      });
      setSetupSuccess(true);

      // Reset form
      setFormData({ email: "", full_name: "", role: "user", staff_type: "office" });
      setTemporaryPassword("");

      toast.success(`User ${formData.full_name} created and welcome email sent!`);

      // Auto-reset success message after 10 seconds
      successTimerRef.current = setTimeout(() => setSetupSuccess(false), 10000);
    } catch (error) {
      console.error('User setup error:', error);
      toast.error(error.message || "Failed to create user account");
    } finally {
      setIsLoading(false);
    }
  };

  if (setupSuccess && createdUser) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <CardTitle>User Account Created Successfully</CardTitle>
              <CardDescription>Welcome email has been sent</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              ✓ User account created<br/>
              ✓ Temporary password generated<br/>
              ✓ Welcome email sent to {createdUser.email}
            </AlertDescription>
          </Alert>

          <div className="space-y-2 p-3 bg-white rounded-lg border border-green-200">
            <div>
              <p className="text-sm text-slate-600">Name</p>
              <p className="font-semibold">{createdUser.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-semibold">{createdUser.email}</p>
            </div>
            <div>
                <p className="text-sm text-slate-600">Role</p>
                <p className="font-semibold capitalize">{createdUser.role}</p>
              </div>
              {createdUser.staff_type && (
                <div>
                  <p className="text-sm text-slate-600">Staff Type</p>
                  <p className="font-semibold uppercase">{createdUser.staff_type}</p>
                </div>
              )}
            </div>

          <Button
            onClick={() => setSetupSuccess(false)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Create Another User
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Admin User Setup</CardTitle>
              <CardDescription>Create new user accounts and send welcome emails</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New User Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="nurse@hospital.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Smith"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
               <Label htmlFor="role">User Role *</Label>
               <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="user">User (Staff Member)</SelectItem>
                   <SelectItem value="admin">Admin (Administrator)</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             {formData.role === "user" && (
               <div>
                 <Label htmlFor="staff_type">Staff Type *</Label>
                 <Select value={formData.staff_type} onValueChange={(val) => setFormData({ ...formData, staff_type: val })}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="rn">RN (Registered Nurse)</SelectItem>
                     <SelectItem value="lpn">LPN (Licensed Practical Nurse)</SelectItem>
                     <SelectItem value="office">Office Staff</SelectItem>
                   </SelectContent>
                 </Select>
                 <p className="text-xs text-slate-500 mt-1">
                   Specify the staff member's role for proper permissions and training tracking.
                 </p>
               </div>
             )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Temporary Password *</Label>
                {temporaryPassword && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={temporaryPassword}
                    readOnly
                    placeholder="Click 'Generate Password' to create a secure password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button onClick={handleGenerate} variant="outline">
                  Generate
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This temporary password will be included in the welcome email. User must change it on first login.
              </p>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              A welcome email with login credentials will be sent to the user's email address.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleSetupUser}
            disabled={!formData.email || !formData.full_name || !temporaryPassword || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isLoading ? "Creating Account..." : "Create User Account & Send Email"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
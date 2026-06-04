import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Hash, Plus, Loader2, Trash2, UserPlus, UserMinus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatPhoneDisplay, normalizeE164 } from "@/components/voice/phoneUtils";
import { isAdminLike } from "@/lib/superAdmin";

/**
 * NumberPoolPanel — admin inventory of 8x8 numbers. Add a number once, then
 * assign/reassign it to a nurse from a dropdown (one click) instead of retyping
 * it. All writes go through the managePhoneNumberPool backend function, which
 * keeps the pool and User.work_phone_number in sync. Personal cells are still
 * entered/managed in the Nurse Work Numbers card below.
 */
export default function NumberPoolPanel() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isAdmin = isAdminLike(currentUser);

  const { data: pool = [] } = useQuery({
    queryKey: ["phone-pool"],
    queryFn: () => base44.entities.PhoneNumber.list("-created_date", 500),
    enabled: isAdmin,
    initialData: [],
  });
  const { data: users = [] } = useQuery({
    queryKey: ["phone-users"],
    queryFn: () => base44.entities.User.list("full_name", 200),
    enabled: isAdmin,
    initialData: [],
  });

  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [pickedUser, setPickedUser] = useState({}); // pool id -> email

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["phone-pool"] });
    queryClient.invalidateQueries({ queryKey: ["phone-users"] });
  };
  const call = (payload) => base44.functions.invoke("managePhoneNumberPool", payload);

  const add = useMutation({
    mutationFn: () => call({ action: "add", e164: newNumber, label: newLabel }),
    onSuccess: () => { invalidate(); setNewNumber(""); setNewLabel(""); toast.success("Number added to the pool"); },
    onError: (err) => toast.error(err?.message || "Failed to add number"),
  });
  const assign = useMutation({
    mutationFn: ({ id, email }) => call({ action: "assign", id, target_user_email: email }),
    onSuccess: () => { invalidate(); toast.success("Number assigned"); },
    onError: (err) => toast.error(err?.message || "Failed to assign number"),
  });
  const release = useMutation({
    mutationFn: (id) => call({ action: "release", id }),
    onSuccess: () => { invalidate(); toast.success("Number released"); },
    onError: (err) => toast.error(err?.message || "Failed to release number"),
  });
  const remove = useMutation({
    mutationFn: (id) => call({ action: "remove", id }),
    onSuccess: () => { invalidate(); toast.success("Number removed"); },
    onError: (err) => toast.error(err?.message || "Failed to remove number"),
  });

  if (!isAdmin) return null;

  const userName = (email) => {
    const u = users.find((x) => x.email === email);
    return u?.full_name || email;
  };
  const newNumberValid = !newNumber || !!normalizeE164(newNumber);
  const busy = add.isPending || assign.isPending || release.isPending || remove.isPending;

  return (
    <Card id="ex8-pool" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-indigo-600" />
            Number Pool
          </span>
          <Badge variant="outline">
            {pool.filter((n) => n.status !== "assigned").length} available · {pool.length} total
          </Badge>
        </CardTitle>
        <CardDescription>
          Add your purchased 8x8 numbers here, then assign one to a nurse with a single dropdown — no retyping.
          Releasing a number frees it for someone else and clears it from that nurse.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add a number */}
        <div className="flex flex-col sm:flex-row gap-2 items-start">
          <div className="flex-1 w-full">
            <Label className="text-xs text-slate-500">New number (E.164)</Label>
            <Input
              placeholder="+12155550100"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className={`mt-1 ${!newNumberValid ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            />
          </div>
          <div className="flex-1 w-full">
            <Label className="text-xs text-slate-500">Label (optional)</Label>
            <Input placeholder="Nurse line 1" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="mt-1" />
          </div>
          <Button
            onClick={() => add.mutate()}
            disabled={add.isPending || !newNumber || !newNumberValid}
            className="bg-indigo-600 hover:bg-indigo-700 sm:mt-5 w-full sm:w-auto"
          >
            {add.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add
          </Button>
        </div>

        {/* Pool list */}
        {pool.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No numbers yet. Add the 8x8 virtual numbers you've purchased to start assigning them.
          </p>
        ) : (
          <div className="space-y-2">
            {pool.map((n) => {
              const assigned = n.status === "assigned" && n.assigned_to_email;
              return (
                <div key={n.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{formatPhoneDisplay(n.e164)}</p>
                    <p className="text-xs text-slate-500">
                      {n.label ? `${n.label} · ` : ""}
                      {assigned ? (
                        <span className="text-green-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Assigned to {userName(n.assigned_to_email)}
                        </span>
                      ) : (
                        <span className="text-slate-500">Available</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {assigned ? (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => release.mutate(n.id)}>
                        <UserMinus className="w-3.5 h-3.5 mr-1.5" /> Release
                      </Button>
                    ) : (
                      <>
                        <Select value={pickedUser[n.id] || ""} onValueChange={(v) => setPickedUser((p) => ({ ...p, [n.id]: v }))}>
                          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Assign to nurse…" /></SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={busy || !pickedUser[n.id]}
                          onClick={() => assign.mutate({ id: n.id, email: pickedUser[n.id] })}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Assign
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove.mutate(n.id)} title="Remove from pool">
                          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

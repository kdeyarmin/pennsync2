import React, { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, Clock, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function SearchablePatientSelect({ 
  patients = [], 
  value, 
  onValueChange,
  onChange, // Support both for backwards compatibility
  placeholder = "Select patient...",
  className 
}) {
  // Use either onValueChange or onChange
  const handleChange = onValueChange || onChange || (() => {});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentPatients, setRecentPatients] = useState([]);
  const [favoritedPatients, setFavoritedPatients] = useState([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ first_name: "", last_name: "" });
  const [creating, setCreating] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const queryClient = useQueryClient();
  const [localPatients, setLocalPatients] = useState(Array.isArray(patients) ? patients : []);

  // Load current user and their preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const user = await base44.auth.me();
        const userEmail = user?.email || 'default';
        setCurrentUserEmail(userEmail);
        
        const recent = JSON.parse(localStorage.getItem(`recentPatients_${userEmail}`) || '[]');
        const favorited = JSON.parse(localStorage.getItem(`favoritedPatients_${userEmail}`) || '[]');
        setRecentPatients(recent);
        setFavoritedPatients(favorited);
      } catch (error) {
        console.error('Error loading patient preferences:', error);
      }
    };
    loadUserPreferences();
  }, []);

  // Save to recent when patient is selected
  const handleSelect = (patientId) => {
    handleChange(patientId);
    setOpen(false);

    if (!currentUserEmail) return;

    // Update recent patients (max 5)
    const updatedRecent = [
      patientId,
      ...recentPatients.filter(id => id !== patientId)
    ].slice(0, 5);
    
    setRecentPatients(updatedRecent);
    localStorage.setItem(`recentPatients_${currentUserEmail}`, JSON.stringify(updatedRecent));
  };

  // Toggle favorite
  const toggleFavorite = (patientId, e) => {
    e.stopPropagation();
    if (!currentUserEmail) return;
    
    const isFavorited = favoritedPatients.includes(patientId);
    
    const updatedFavorites = isFavorited
      ? favoritedPatients.filter(id => id !== patientId)
      : [...favoritedPatients, patientId];
    
    setFavoritedPatients(updatedFavorites);
    localStorage.setItem(`favoritedPatients_${currentUserEmail}`, JSON.stringify(updatedFavorites));
  };

  // Create new patient
  const handleCreatePatient = async () => {
    if (!newPatient.first_name || !newPatient.last_name) return;
    
    setCreating(true);
    try {
      const created = await base44.entities.Patient.create(newPatient);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      handleSelect(created.id);
      setCreateDialogOpen(false);
      setNewPatient({ first_name: "", last_name: "" });
    } catch (error) {
      console.error('Error creating patient:', error);
    }
    setCreating(false);
  };

  // Pre-fill new patient with search term
  const openCreateDialog = () => {
    const names = search.trim().split(' ');
    setNewPatient({
      first_name: names[0] || "",
      last_name: names.slice(1).join(' ') || ""
    });
    setCreateDialogOpen(true);
    setOpen(false);
  };

  // Get patient by ID
  const getPatient = (id) => patients.find(p => p.id === id);
  const selectedPatient = getPatient(value);

  // Filter and organize patients
  const { favoritesList, recentList, allPatientsList } = useMemo(() => {
    const searchLower = search.toLowerCase();
    const filtered = patients.filter(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      const mrn = (p.medical_record_number || '').toLowerCase();
      return fullName.includes(searchLower) || mrn.includes(searchLower);
    });

    const favorites = filtered.filter(p => favoritedPatients.includes(p.id));
    const recent = recentPatients
      .map(id => getPatient(id))
      .filter(p => p && filtered.includes(p))
      .slice(0, 3);
    
    // All patients excluding favorites and recent
    const all = filtered.filter(p => 
      !favoritedPatients.includes(p.id) && 
      !recent.some(r => r?.id === p.id)
    );

    return {
      favoritesList: favorites,
      recentList: recent,
      allPatientsList: all
    };
  }, [patients, search, favoritedPatients, recentPatients]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={false}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={false}
          className={cn(
            "w-full justify-between h-11 md:h-12 text-base",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {value && selectedPatient
              ? `${selectedPatient.first_name}${selectedPatient.middle_name ? ` ${selectedPatient.middle_name}` : ''} ${selectedPatient.last_name}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[500px] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No patient found.</p>
                <Button 
                  onClick={openCreateDialog}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Patient
                </Button>
              </div>
            </CommandEmpty>
            
            {favoritesList.length > 0 && (
              <CommandGroup heading="Favorites">
                {favoritesList.map((patient) => (
                 <CommandItem
                   key={patient.id}
                   value={patient.id}
                   onSelect={() => handleSelect(patient.id)}
                   disabled={false}
                   className="flex items-center justify-between py-3 cursor-pointer"
                 >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          value === patient.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                       <p className="font-medium">
                         {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
                       </p>
                       {patient.medical_record_number && (
                         <p className="text-xs text-muted-foreground">
                           MRN: {patient.medical_record_number}
                         </p>
                       )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => toggleFavorite(patient.id, e)}
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {recentList.length > 0 && (
              <CommandGroup heading="Recent">
                {recentList.map((patient) => (
                 <CommandItem
                   key={patient.id}
                   value={patient.id}
                   onSelect={() => handleSelect(patient.id)}
                   disabled={false}
                   className="flex items-center justify-between py-3 cursor-pointer"
                 >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          value === patient.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                       <p className="font-medium">
                         {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
                       </p>
                       {patient.medical_record_number && (
                         <p className="text-xs text-muted-foreground">
                           MRN: {patient.medical_record_number}
                         </p>
                       )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => toggleFavorite(patient.id, e)}
                    >
                      <Star className={cn(
                        "h-4 w-4",
                        favoritedPatients.includes(patient.id) 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-muted-foreground"
                      )} />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {allPatientsList.length > 0 && (
              <CommandGroup heading="All Patients">
                {allPatientsList.map((patient) => (
                 <CommandItem
                   key={patient.id}
                   value={patient.id}
                   onSelect={() => handleSelect(patient.id)}
                   disabled={false}
                   className="flex items-center justify-between py-3 cursor-pointer"
                 >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          value === patient.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                       <p className="font-medium">
                         {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
                       </p>
                       {patient.medical_record_number && (
                         <p className="text-xs text-muted-foreground">
                           MRN: {patient.medical_record_number}
                         </p>
                       )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => toggleFavorite(patient.id, e)}
                    >
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
            <DialogDescription>
              Add a new patient to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={newPatient.first_name}
                onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={newPatient.last_name}
                onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePatient}
              disabled={!newPatient.first_name || !newPatient.last_name || creating}
            >
              {creating ? "Creating..." : "Create Patient"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  Shield,
  Settings,
  Zap,
  Database
} from "lucide-react";
import { toast } from "sonner";

// Enhanced duplicate detection with multiple algorithms
const calculateLevenshteinDistance = (str1, str2) => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const distance = calculateLevenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
};

export default function DuplicateScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [scanMode, setScanMode] = useState('standard'); // 'standard' or 'advanced'
  const [advancedOptions, setAdvancedOptions] = useState({
    matchByMRN: true,
    matchByNameAndDOB: true,
    matchByPhone: true,
    matchByEmail: true,
    matchByAddress: false,
    fuzzyNameMatching: true,
    autoMergeData: true,
    closeInactiveOnly: false
  });
  const queryClient = useQueryClient();

  // Fetch all patients for advanced scanning
  const { data: allPatients = [] } = useQuery({
    queryKey: ['all-patients-scan'],
    queryFn: () => base44.entities.Patient.list('-created_date', 10000),
    enabled: scanMode === 'advanced'
  });

  const scanAndRemoveDuplicates = async () => {
    setIsScanning(true);
    toast.info('Starting comprehensive duplicate scan...');
    
    try {
      if (scanMode === 'standard') {
        // Use backend function for standard scan
        const response = await base44.functions.invoke('deduplicatePatients');
        const data = response.data || response;
        setResults(data);
      } else {
        // Advanced client-side scanning with multiple algorithms and batching
        const duplicateGroups = [];
        const processedIds = new Set();
        const updateBatch = [];
        const BATCH_SIZE = 10;
        const BATCH_DELAY = 1000; // 1 second between batches
        
        // Helper to process batches with delay
        const processBatch = async (batch) => {
          if (batch.length === 0) return;
          
          const promises = batch.map(update => 
            base44.entities.Patient.update(update.id, update.data)
              .catch(err => console.error(`Failed to update ${update.id}:`, err))
          );
          
          await Promise.all(promises);
          
          // Delay between batches to avoid rate limiting
          if (batch.length === BATCH_SIZE) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        };
        
        // Phase 1: Identify duplicates (no API calls)
        for (let i = 0; i < allPatients.length; i++) {
          if (processedIds.has(allPatients[i].id)) continue;
          
          const patient = allPatients[i];
          const matches = [];
          
          for (let j = i + 1; j < allPatients.length; j++) {
            if (processedIds.has(allPatients[j].id)) continue;
            
            const otherPatient = allPatients[j];
            let matchScore = 0;
            const matchReasons = [];
            
            // 1. MRN exact match (highest priority)
            if (advancedOptions.matchByMRN && patient.medical_record_number && 
                otherPatient.medical_record_number &&
                patient.medical_record_number === otherPatient.medical_record_number) {
              matchScore += 100;
              matchReasons.push('MRN match');
            }
            
            // 2. Name and DOB match
            if (advancedOptions.matchByNameAndDOB && patient.date_of_birth && otherPatient.date_of_birth) {
              const firstNameSim = calculateSimilarity(patient.first_name || '', otherPatient.first_name || '');
              const lastNameSim = calculateSimilarity(patient.last_name || '', otherPatient.last_name || '');
              
              if (advancedOptions.fuzzyNameMatching) {
                if (firstNameSim >= 80 && lastNameSim >= 80 && patient.date_of_birth === otherPatient.date_of_birth) {
                  matchScore += 90;
                  matchReasons.push('Name+DOB fuzzy match');
                }
              } else {
                if (patient.first_name?.toLowerCase() === otherPatient.first_name?.toLowerCase() &&
                    patient.last_name?.toLowerCase() === otherPatient.last_name?.toLowerCase() &&
                    patient.date_of_birth === otherPatient.date_of_birth) {
                  matchScore += 95;
                  matchReasons.push('Name+DOB exact match');
                }
              }
            }
            
            // 3. Phone match with last name
            if (advancedOptions.matchByPhone && patient.phone && otherPatient.phone) {
              const normalizePhone = (p) => p.replace(/\D/g, '');
              if (normalizePhone(patient.phone) === normalizePhone(otherPatient.phone) &&
                  patient.last_name?.toLowerCase() === otherPatient.last_name?.toLowerCase()) {
                matchScore += 70;
                matchReasons.push('Phone+LastName match');
              }
            }
            
            // 4. Email match with last name
            if (advancedOptions.matchByEmail && patient.email && otherPatient.email) {
              if (patient.email.toLowerCase() === otherPatient.email.toLowerCase() &&
                  patient.last_name?.toLowerCase() === otherPatient.last_name?.toLowerCase()) {
                matchScore += 75;
                matchReasons.push('Email+LastName match');
              }
            }
            
            // 5. Address match with name similarity
            if (advancedOptions.matchByAddress && patient.address && otherPatient.address) {
              const addressSim = calculateSimilarity(patient.address || '', otherPatient.address || '');
              const nameSim = (calculateSimilarity(patient.first_name || '', otherPatient.first_name || '') +
                             calculateSimilarity(patient.last_name || '', otherPatient.last_name || '')) / 2;
              
              if (addressSim >= 85 && nameSim >= 70) {
                matchScore += 60;
                matchReasons.push('Address+Name similarity');
              }
            }
            
            if (matchScore >= 70) {
              matches.push({
                patient: otherPatient,
                matchScore,
                matchReasons
              });
            }
          }
          
          if (matches.length > 0) {
            // Keep the most recent record
            const allRecords = [patient, ...matches.map(m => m.patient)]
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            
            const toKeep = allRecords[0];
            const toRemove = allRecords.slice(1);
            
            // Mark as processed
            processedIds.add(toKeep.id);
            toRemove.forEach(p => processedIds.add(p.id));
            
            // Prepare updates for batching
            if (advancedOptions.autoMergeData) {
              const mergedData = { ...toKeep };
              toRemove.forEach(p => {
                Object.keys(p).forEach(key => {
                  if (!mergedData[key] && p[key] && key !== 'id' && key !== 'created_date') {
                    mergedData[key] = p[key];
                  }
                });
              });
              
              updateBatch.push({ id: toKeep.id, data: mergedData });
            }
            
            // Add duplicate closures to batch
            toRemove.forEach(dup => {
              if (!advancedOptions.closeInactiveOnly || dup.status !== 'active') {
                updateBatch.push({ id: dup.id, data: { status: 'discharged' } });
              }
            });
            
            duplicateGroups.push({
              kept: {
                name: `${toKeep.first_name} ${toKeep.last_name}`,
                mrn: toKeep.medical_record_number,
                id: toKeep.id
              },
              removed: toRemove.map(r => ({
                name: `${r.first_name} ${r.last_name}`,
                mrn: r.medical_record_number,
                match_score: matches.find(m => m.patient.id === r.id)?.matchScore || 0,
                match_reasons: matches.find(m => m.patient.id === r.id)?.matchReasons || []
              })),
              average_match_score: Math.round(
                toRemove.reduce((sum, r) => sum + (matches.find(m => m.patient.id === r.id)?.matchScore || 0), 0) / toRemove.length
              )
            });
          }
        }
        
        // Phase 2: Process updates in batches
        toast.info(`Processing ${updateBatch.length} updates in batches...`);
        for (let i = 0; i < updateBatch.length; i += BATCH_SIZE) {
          const batch = updateBatch.slice(i, i + BATCH_SIZE);
          await processBatch(batch);
          
          // Update progress
          const progress = Math.min(100, Math.round(((i + batch.length) / updateBatch.length) * 100));
          toast.info(`Progress: ${progress}% (${i + batch.length}/${updateBatch.length})`);
        }
        
        setResults({
          duplicate_groups_found: duplicateGroups.length,
          patients_removed: duplicateGroups.reduce((sum, g) => sum + g.removed.length, 0),
          details: duplicateGroups,
          scan_mode: 'advanced',
          algorithms_used: Object.entries(advancedOptions)
            .filter(([k, v]) => v && k.startsWith('match'))
            .map(([k]) => k.replace('matchBy', ''))
        });
        
        toast.success('Advanced scan complete!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan: ' + error.message);
    }
    setIsScanning(false);
  };

  return (
    <Card className="border-2 border-indigo-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Enhanced Duplicate Scanner
          <Badge className="ml-auto bg-purple-600 text-white">
            {scanMode === 'advanced' ? 'Multi-Algorithm' : 'Standard'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results ? (
          <>
            <Alert className="bg-blue-50 border-blue-300">
              <Zap className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Enhanced Detection:</strong> Scans using multiple algorithms including MRN, name+DOB, phone, email, and address matching.
              </AlertDescription>
            </Alert>

            {/* Scan Mode Selection */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Scan Mode</Label>
                <Badge variant="outline" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Configuration
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={scanMode === 'standard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScanMode('standard')}
                  className={scanMode === 'standard' ? 'bg-indigo-600' : ''}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Standard Scan
                </Button>
                <Button
                  variant={scanMode === 'advanced' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScanMode('advanced')}
                  className={scanMode === 'advanced' ? 'bg-purple-600' : ''}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Advanced Scan
                </Button>
              </div>
              
              <p className="text-xs text-gray-600">
                {scanMode === 'standard' 
                  ? 'Fast server-side scan using name and DOB matching'
                  : 'Comprehensive multi-algorithm scan with fuzzy matching and auto-merge'}
              </p>
            </div>

            {/* Advanced Options */}
            {scanMode === 'advanced' && (
              <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-300">
                <h4 className="font-semibold text-purple-900 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Advanced Options
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="matchMRN"
                      checked={advancedOptions.matchByMRN}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, matchByMRN: checked }))
                      }
                    />
                    <Label htmlFor="matchMRN" className="text-xs cursor-pointer">
                      Match by MRN
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="matchNameDOB"
                      checked={advancedOptions.matchByNameAndDOB}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, matchByNameAndDOB: checked }))
                      }
                    />
                    <Label htmlFor="matchNameDOB" className="text-xs cursor-pointer">
                      Match by Name+DOB
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="matchPhone"
                      checked={advancedOptions.matchByPhone}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, matchByPhone: checked }))
                      }
                    />
                    <Label htmlFor="matchPhone" className="text-xs cursor-pointer">
                      Match by Phone
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="matchEmail"
                      checked={advancedOptions.matchByEmail}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, matchByEmail: checked }))
                      }
                    />
                    <Label htmlFor="matchEmail" className="text-xs cursor-pointer">
                      Match by Email
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="matchAddress"
                      checked={advancedOptions.matchByAddress}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, matchByAddress: checked }))
                      }
                    />
                    <Label htmlFor="matchAddress" className="text-xs cursor-pointer">
                      Match by Address
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fuzzyMatch"
                      checked={advancedOptions.fuzzyNameMatching}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, fuzzyNameMatching: checked }))
                      }
                    />
                    <Label htmlFor="fuzzyMatch" className="text-xs cursor-pointer">
                      Fuzzy Name Match
                    </Label>
                  </div>
                </div>
                
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoMerge"
                      checked={advancedOptions.autoMergeData}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, autoMergeData: checked }))
                      }
                    />
                    <Label htmlFor="autoMerge" className="text-xs cursor-pointer font-semibold">
                      Auto-merge data from duplicates
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="closeInactive"
                      checked={advancedOptions.closeInactiveOnly}
                      onCheckedChange={(checked) => 
                        setAdvancedOptions(prev => ({ ...prev, closeInactiveOnly: checked }))
                      }
                    />
                    <Label htmlFor="closeInactive" className="text-xs cursor-pointer">
                      Only close inactive patients
                    </Label>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={scanAndRemoveDuplicates}
              disabled={isScanning}
              className={`w-full ${scanMode === 'advanced' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              size="lg"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning {allPatients.length} Patients...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Run {scanMode === 'advanced' ? 'Advanced' : 'Standard'} Scan
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {results.patients_removed > 0 ? (
              <>
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>✅ Deduplication Complete!</strong>
                    <div className="mt-2 text-sm">
                      Found {results.duplicate_groups_found} duplicate group(s) and removed {results.patients_removed} duplicate record(s).
                      {results.scan_mode === 'advanced' && (
                        <div className="mt-1 text-xs">
                          <Badge className="bg-purple-600 text-white text-xs mt-1">
                            Advanced Multi-Algorithm Scan
                          </Badge>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">Duplicate Groups</p>
                    <p className="text-2xl font-bold text-blue-900">{results.duplicate_groups_found}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 mb-1">Records Closed</p>
                    <p className="text-2xl font-bold text-red-900">{results.patients_removed}</p>
                  </div>
                </div>

                {results.algorithms_used && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-700 mb-2 font-semibold">Algorithms Used:</p>
                    <div className="flex flex-wrap gap-1">
                      {results.algorithms_used.map((algo, idx) => (
                        <Badge key={idx} variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                          {algo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {results.details && results.details.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Deduplication Details
                    </h4>
                    <ScrollArea className="h-64 border rounded-lg">
                      <div className="p-4 space-y-3">
                        {results.details.map((detail, idx) => (
                          <Card key={idx} className="bg-white">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-sm">Kept: {detail.kept.name}</span>
                                <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                                  MRN: {detail.kept.mrn}
                                </Badge>
                                {detail.confidence && (
                                  <Badge className={`text-xs ${
                                    detail.confidence === 'High' ? 'bg-green-600' :
                                    detail.confidence === 'Medium' ? 'bg-yellow-600' :
                                    'bg-orange-600'
                                  }`}>
                                    {detail.confidence} Confidence ({detail.average_match_score}%)
                                  </Badge>
                                )}
                              </div>
                              <div className="ml-6 space-y-1">
                                {detail.removed.map((removed, rIdx) => (
                                  <div key={rIdx} className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                      <span>Removed: {removed.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        MRN: {removed.mrn}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs bg-blue-100">
                                        {removed.match_score}% match
                                      </Badge>
                                    </div>
                                    {removed.match_reasons && removed.match_reasons.length > 0 && (
                                      <div className="ml-6 flex flex-wrap gap-1">
                                        {removed.match_reasons.map((reason, rIdx2) => (
                                          <Badge key={rIdx2} className="bg-green-100 text-green-800 text-xs">
                                            ✓ {reason}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </>
            ) : (
              <Alert className="bg-blue-50 border-blue-300">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>✅ No duplicates found!</strong>
                  <div className="mt-1 text-sm">
                    All patient records are unique.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => setResults(null)}
              variant="outline"
              className="w-full"
            >
              Scan Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
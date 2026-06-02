import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link2,
  CheckCircle2,
  Plus,
  FileText,
  Activity,
  Stethoscope,
  Brain,
  Heart,
  X
} from "lucide-react";

// OASIS M-items that can be linked to documentation
const OASIS_ITEMS = {
  functional: [
    { code: 'M1800', label: 'Grooming', description: 'Current ability to dress upper/lower body' },
    { code: 'M1810', label: 'Upper Body Dressing', description: 'Ability to dress upper body' },
    { code: 'M1820', label: 'Lower Body Dressing', description: 'Ability to dress lower body' },
    { code: 'M1830', label: 'Bathing', description: 'Current ability to bathe self safely' },
    { code: 'M1840', label: 'Toilet Transferring', description: 'Ability to get to and from toilet' },
    { code: 'M1850', label: 'Transferring', description: 'Ability to transfer between surfaces' },
    { code: 'M1860', label: 'Ambulation', description: 'Current ability to ambulate safely' },
  ],
  clinical: [
    { code: 'M1033', label: 'Risk for Hospitalization', description: 'Risk factors for hospitalization' },
    { code: 'M1242', label: 'Pain Frequency', description: 'Frequency of pain interfering with activity' },
    { code: 'M1400', label: 'Dyspnea', description: 'When patient is dyspneic or short of breath' },
    { code: 'M1306', label: 'Pressure Ulcer Present', description: 'Presence of pressure ulcers' },
    { code: 'M1340', label: 'Surgical Wound', description: 'Presence of surgical wound' },
    { code: 'M1610', label: 'Urinary Incontinence', description: 'Urinary incontinence frequency' },
    { code: 'M1620', label: 'Bowel Incontinence', description: 'Bowel incontinence frequency' },
  ],
  cognitive: [
    { code: 'M1700', label: 'Cognitive Functioning', description: 'Patient cognitive functioning' },
    { code: 'M1710', label: 'Confusion', description: 'When confused' },
    { code: 'M1720', label: 'Anxiety', description: 'Frequency of anxiety' },
    { code: 'M1730', label: 'Depression Screening', description: 'PHQ-2 screening' },
  ],
  medication: [
    { code: 'M2001', label: 'Drug Regimen Review', description: 'Drug regimen review conducted' },
    { code: 'M2010', label: 'High Risk Drugs', description: 'Patient receiving high-risk drugs' },
    { code: 'M2020', label: 'Oral Medication Management', description: 'Ability to manage oral medications' },
  ],
  care: [
    { code: 'M1000', label: 'Admission Source', description: 'From where patient was admitted' },
    { code: 'M2102', label: 'Care Management', description: 'Types of care management provided' },
    { code: 'M2200', label: 'Therapy Need', description: 'Therapy need at SOC/ROC' },
  ]
};

const CATEGORY_ICONS = {
  functional: Activity,
  clinical: Stethoscope,
  cognitive: Brain,
  medication: Heart,
  care: FileText
};

const CATEGORY_COLORS = {
  functional: 'blue',
  clinical: 'green',
  cognitive: 'purple',
  medication: 'red',
  care: 'orange'
};

const CATEGORY_TEXT_COLORS = {
  functional: 'text-blue-600',
  clinical: 'text-green-600',
  cognitive: 'text-purple-600',
  medication: 'text-red-600',
  care: 'text-orange-600'
};

export default function OASISItemLinker({ 
  linkedItems = [],
  onAddLink,
  onRemoveLink,
  selectedText = ''
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('functional');
  const [selectedItem, setSelectedItem] = useState('');
  const [justification, setJustification] = useState('');

  const handleAddLink = () => {
    if (!selectedItem) return;
    
    const item = Object.values(OASIS_ITEMS).flat().find(i => i.code === selectedItem);
    if (!item) return;

    onAddLink?.({
      code: item.code,
      label: item.label,
      category: selectedCategory,
      justification: justification || selectedText,
      timestamp: new Date().toISOString()
    });

    setSelectedItem('');
    setJustification('');
    setIsDialogOpen(false);
  };

  const getCategoryColor = (category) => {
    const colors = {
      functional: 'bg-blue-100 text-blue-800',
      clinical: 'bg-green-100 text-green-800',
      cognitive: 'bg-purple-100 text-purple-800',
      medication: 'bg-red-100 text-red-800',
      care: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="border-2 border-cyan-200">
      <CardHeader className="pb-2 bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyan-600" />
            OASIS Item Links
            {linkedItems.length > 0 && (
              <Badge variant="outline" className="text-xs bg-white">
                {linkedItems.length} linked
              </Badge>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Link to OASIS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-cyan-600" />
                  Link Documentation to OASIS Item
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 pt-2">
                {/* Category Selection */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="functional">
                        <span className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-600" /> Functional Status
                        </span>
                      </SelectItem>
                      <SelectItem value="clinical">
                        <span className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-green-600" /> Clinical Status
                        </span>
                      </SelectItem>
                      <SelectItem value="cognitive">
                        <span className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-600" /> Cognitive/Behavioral
                        </span>
                      </SelectItem>
                      <SelectItem value="medication">
                        <span className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-600" /> Medications
                        </span>
                      </SelectItem>
                      <SelectItem value="care">
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-600" /> Care Management
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* OASIS Item Selection */}
                <div>
                  <label className="text-sm font-medium mb-1 block">OASIS Item</label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select M-item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OASIS_ITEMS[selectedCategory]?.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">{item.code}</Badge>
                            {item.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedItem && (
                    <p className="text-xs text-gray-500 mt-1">
                      {OASIS_ITEMS[selectedCategory]?.find(i => i.code === selectedItem)?.description}
                    </p>
                  )}
                </div>

                {/* Justification/Documentation Text */}
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Supporting Documentation
                    <span className="text-gray-400 font-normal ml-1">(from note)</span>
                  </label>
                  <Textarea
                    value={justification || selectedText}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter or paste the note text that supports this OASIS item..."
                    className="h-24 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This text will be saved as justification for the OASIS scoring.
                  </p>
                </div>

                <Button 
                  onClick={handleAddLink}
                  disabled={!selectedItem}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  <Link2 className="w-4 h-4 mr-2" /> Create Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-3">
        {linkedItems.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-3">
            No OASIS items linked yet. Link note sections to support OASIS scoring.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedItems.map((link, idx) => {
              const Icon = CATEGORY_ICONS[link.category] || FileText;
              return (
                <div 
                  key={idx} 
                  className="p-2 bg-gray-50 rounded-lg border flex items-start gap-2"
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${CATEGORY_TEXT_COLORS[link.category] || 'text-gray-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">{link.code}</Badge>
                      <span className="text-xs font-medium">{link.label}</span>
                      <Badge className={`text-xs ${getCategoryColor(link.category)}`}>
                        {link.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      "{link.justification}"
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                    onClick={() => onRemoveLink?.(idx)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}

            <div className="pt-2 border-t">
              <p className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {linkedItems.length} documentation-OASIS link(s) established for audit support
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
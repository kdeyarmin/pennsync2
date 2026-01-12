import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Move } from "lucide-react";
import { toast } from "sonner";

const FIELD_TYPES = [
  { value: "text", label: "Text Field", color: "bg-blue-100" },
  { value: "signature", label: "Signature", color: "bg-purple-100" },
  { value: "initials", label: "Initials", color: "bg-pink-100" },
  { value: "date", label: "Date", color: "bg-green-100" },
  { value: "checkbox", label: "Checkbox", color: "bg-yellow-100" }
];

export default function VisualPDFFieldEditor({ pdfUrl, onFieldsPlaced }) {
  const canvasRef = useRef(null);
  const [fields, setFields] = useState([]);
  const [selectedFieldType, setSelectedFieldType] = useState("text");
  const [fieldLabel, setFieldLabel] = useState("");
  const [draggingField, setDraggingField] = useState(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  const handleCanvasClick = (e) => {
    if (!pdfUrl || !fieldLabel.trim()) {
      toast.error("Please enter a field label");
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newField = {
      id: Date.now(),
      type: selectedFieldType,
      label: fieldLabel,
      x: Math.round(x),
      y: Math.round(y),
      width: 120,
      height: 30
    };

    setFields([...fields, newField]);
    setFieldLabel("");
    toast.success(`${selectedFieldType} field added`);
  };

  const updateField = (fieldId, updates) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const removeField = (fieldId) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const handleDragStart = (fieldId) => {
    setDraggingField(fieldId);
  };

  const handleDragEnd = () => {
    setDraggingField(null);
  };

  const handleMouseMove = (e) => {
    if (!draggingField) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateField(draggingField, { x: Math.round(x), y: Math.round(y) });
  };

  const getFieldTypeColor = (type) => {
    return FIELD_TYPES.find(ft => ft.value === type)?.color || "bg-gray-100";
  };

  const handleSave = () => {
    if (fields.length === 0) {
      toast.error("Add at least one field before saving");
      return;
    }
    onFieldsPlaced(fields);
    toast.success(`${fields.length} field(s) positioned and saved`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Visual Field Editor</h3>
        <p className="text-sm text-gray-600">
          Click on the PDF to place fields. Drag fields to reposition them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Field Configuration Panel */}
        <Card className="p-4 lg:col-span-1 h-fit">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type
              </label>
              <Select value={selectedFieldType} onValueChange={setSelectedFieldType}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(ft => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Label
              </label>
              <Input
                placeholder="e.g., Patient Name"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCanvasClick(e);
                  }
                }}
                className="text-sm"
              />
            </div>

            <Button
              onClick={() => {
                const event = new MouseEvent("click", {
                  bubbles: true,
                  cancelable: true,
                  view: window
                });
                handleCanvasClick(event);
              }}
              className="w-full text-sm"
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Field
            </Button>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  Fields: {fields.length}
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className={`p-2 rounded-lg border cursor-move ${getFieldTypeColor(field.type)}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {field.label}
                        </p>
                        <p className="text-xs text-gray-600">
                          {field.type} @ {field.x}, {field.y}
                        </p>
                      </div>
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-0.5 hover:bg-red-200 rounded text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {fields.length > 0 && (
              <Button
                onClick={handleSave}
                variant="outline"
                className="w-full text-sm"
              >
                Save Field Positions
              </Button>
            )}
          </div>
        </Card>

        {/* PDF Canvas */}
        <div className="lg:col-span-3">
          {pdfUrl ? (
            <Card className="p-4 bg-gray-100 min-h-[600px] sm:min-h-[400px] flex items-center justify-center relative overflow-auto">
              <div
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleDragEnd}
                className="relative bg-white shadow-lg cursor-crosshair w-full max-w-2xl aspect-[8.5/11]"
              >
                {/* PDF Thumbnail as Background */}
                <img
                  src={pdfUrl}
                  alt="PDF Preview"
                  className="w-full h-full object-cover opacity-50"
                  onLoad={() => setPdfLoaded(true)}
                />

                {/* Placed Fields */}
                {fields.map((field) => {
                  const fieldType = FIELD_TYPES.find(ft => ft.value === field.type);
                  return (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={() => handleDragStart(field.id)}
                      onDragEnd={handleDragEnd}
                      className={`absolute border-2 border-dashed cursor-move transition-all ${
                        draggingField === field.id
                          ? "opacity-100 border-blue-500 bg-blue-50"
                          : "opacity-75 border-gray-400 hover:opacity-100"
                      } ${fieldType?.color || "bg-gray-100"}`}
                      style={{
                        left: `${field.x}px`,
                        top: `${field.y}px`,
                        width: `${field.width}px`,
                        height: `${field.height}px`
                      }}
                    >
                      <div className="flex items-center justify-center h-full p-1">
                        <span className="text-xs font-medium text-gray-700 text-center truncate">
                          {field.label}
                        </span>
                      </div>
                      <div className="absolute -top-6 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                        {field.type}
                      </div>
                    </div>
                  );
                })}

                {fields.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Move className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to add fields</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center min-h-96 flex items-center justify-center">
              <div>
                <p className="text-gray-600">No PDF selected</p>
                <p className="text-sm text-gray-500 mt-1">Upload a PDF template first</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Field Legend */}
      <Card className="p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-900 mb-2">Field Types</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {FIELD_TYPES.map(ft => (
            <div key={ft.value} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${ft.color}`} />
              <span className="text-xs text-gray-700">{ft.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
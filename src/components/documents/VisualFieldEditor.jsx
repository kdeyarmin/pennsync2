import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import FieldConfigPanel from "./FieldConfigPanel";

export default function VisualFieldEditor({ pdfUrl, onFieldsChange, initialFields = [] }) {
  const [fields, setFields] = useState(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const containerRef = useRef(null);

  const addField = (newField) => {
    const field = {
      id: Math.random().toString(36).substr(2, 9),
      ...newField,
      position: { x: 50, y: 50 },
      size: { width: 200, height: 30 }
    };
    const updated = [...fields, field];
    setFields(updated);
    onFieldsChange(updated);
    setShowAddPanel(false);
    toast.success("Field added - drag to position");
  };

  const updateField = (fieldId, updates) => {
    const updated = fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
    setFields(updated);
    onFieldsChange(updated);
  };

  const removeField = (fieldId) => {
    const updated = fields.filter(f => f.id !== fieldId);
    setFields(updated);
    onFieldsChange(updated);
    setSelectedFieldId(null);
  };

  const handleDragStart = (e, fieldId) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("fieldId", fieldId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, fieldId) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - 100);
    const y = Math.max(0, e.clientY - rect.top - 15);
    
    updateField(fieldId, {
      position: { x: Math.round(x), y: Math.round(y) }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Visual Field Editor</h3>
          <p className="text-sm text-gray-600">Drag fields to position on PDF</p>
        </div>
        <Button onClick={() => setShowAddPanel(!showAddPanel)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Field
        </Button>
      </div>

      {showAddPanel && (
        <FieldConfigPanel onAdd={addField} onCancel={() => setShowAddPanel(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <div
            ref={containerRef}
            className="relative w-full bg-gray-100 rounded-lg border-2 border-gray-300 overflow-auto"
            style={{ minHeight: "600px", backgroundImage: `url(${pdfUrl})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
            onDragOver={handleDragOver}
          >
            {fields.map(field => (
              <div
                key={field.id}
                draggable
                onDragStart={(e) => handleDragStart(e, field.id)}
                onDrop={(e) => handleDrop(e, field.id)}
                onClick={() => setSelectedFieldId(field.id)}
                className={`absolute bg-white border-2 rounded cursor-move transition-all ${
                  selectedFieldId === field.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-400 hover:border-gray-600'
                }`}
                style={{
                  left: `${field.position.x}px`,
                  top: `${field.position.y}px`,
                  width: `${field.size.width}px`,
                  height: `${field.size.height}px`,
                  minWidth: "80px",
                  minHeight: "20px"
                }}
              >
                <div className="flex items-center justify-between p-1 h-full">
                  <span className="text-xs font-medium text-gray-700 truncate px-1">{field.label}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">{field.field_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fields Panel */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Fields ({fields.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fields.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No fields added yet</p>
            ) : (
              fields.map(field => (
                <Card
                  key={field.id}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedFieldId === field.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedFieldId(field.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{field.label}</p>
                        <p className="text-xs text-gray-500">{field.field_type}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(field.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {field.default_value && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-1 rounded">Default: {field.default_value}</p>
                    )}
                    {field.conditional && (
                      <p className="text-xs text-purple-600 bg-purple-50 p-1 rounded">Conditional visibility</p>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {selectedFieldId && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-gray-700 mb-2">Quick Edit</p>
              <Button size="sm" variant="outline" className="w-full text-xs">
                <Settings className="w-3 h-3 mr-2" />
                Configure Selected
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
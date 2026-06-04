import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { quickTemplates as templates } from "./quickTemplates";

export default function QuickTemplatesLibrary({ onInsertTemplate }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");


  const categories = ["all", ...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === "" || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Quick Templates Library
          <Badge variant="outline" className="ml-auto">
            {templates.length} templates
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(category => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category === "all" ? "All Templates" : category}
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
              {filteredTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => onInsertTemplate(template.template)}
                    className={`${template.bgColor} p-4 rounded-lg border-2 border-transparent hover:border-blue-400 transition-all text-left group`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${template.color} bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 text-sm mb-1">
                          {template.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No templates found matching your search</p>
            </div>
          )}

          <p className="text-xs text-slate-600 italic">
            💡 Tip: Click any template to insert it into your documentation. Edit as needed for your specific patient.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
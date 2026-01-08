import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Edit2, Trash2, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FolderTreeView({ 
  folders = [], 
  selectedFolderId, 
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  templatesCount = {}
}) {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const startEdit = (folder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const saveEdit = (folderId) => {
    if (editingName.trim()) {
      onRenameFolder(folderId, editingName.trim());
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const colorClasses = {
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    indigo: 'text-indigo-600',
    pink: 'text-pink-600'
  };

  const buildFolderTree = (parentId = null, depth = 0) => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(folder => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const hasChildren = folders.some(f => f.parent_folder_id === folder.id);
        const count = templatesCount[folder.id] || 0;

        return (
          <div key={folder.id}>
            <div
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 cursor-pointer group transition-colors",
                isSelected && "bg-indigo-50 hover:bg-indigo-100",
                depth > 0 && "ml-4"
              )}
              onClick={() => onSelectFolder(folder.id)}
            >
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(folder.id);
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-4" />}
              
              {isExpanded ? (
                <FolderOpen className={cn("w-4 h-4", colorClasses[folder.color])} />
              ) : (
                <Folder className={cn("w-4 h-4", colorClasses[folder.color])} />
              )}

              {editingFolderId === folder.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => saveEdit(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(folder.id);
                    if (e.key === 'Escape') {
                      setEditingFolderId(null);
                      setEditingName('');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 text-sm flex-1"
                  autoFocus
                />
              ) : (
                <>
                  <span className="text-sm flex-1 truncate">{folder.name}</span>
                  {count > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  )}
                </>
              )}

              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => startEdit(folder)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:text-red-600"
                  onClick={() => onDeleteFolder(folder.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {isExpanded && buildFolderTree(folder.id, depth + 1)}
          </div>
        );
      });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCreateFolder()}
          className="h-7 text-xs"
        >
          <FolderPlus className="w-3 h-3 mr-1" />
          New
        </Button>
      </div>
      
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors",
          selectedFolderId === null && "bg-indigo-50 hover:bg-indigo-100"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="w-4 h-4 text-gray-600" />
        <span className="text-sm flex-1">All Templates</span>
        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {templatesCount.uncategorized || 0}
        </span>
      </div>

      {buildFolderTree()}
    </div>
  );
}
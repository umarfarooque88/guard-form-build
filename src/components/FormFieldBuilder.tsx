
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  X,
  GripVertical,
  Type,
  AlignLeft,
  CheckSquare,
  Circle,
  Calendar,
  Upload,
  List
} from 'lucide-react';

const fieldTypeIcons = {
  short_text: Type,
  paragraph: AlignLeft,
  multiple_choice: Circle,
  checkbox: CheckSquare,
  dropdown: List,
  date: Calendar,
  file_upload: Upload
};

const fieldTypeLabels = {
  short_text: 'Short Text',
  paragraph: 'Paragraph',
  multiple_choice: 'Multiple Choice',
  checkbox: 'Checkboxes',
  dropdown: 'Dropdown',
  date: 'Date',
  file_upload: 'File Upload'
};

interface FormField {
  id: string;
  type: 'short_text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'date' | 'file_upload';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormFieldBuilderProps {
  field: FormField;
  index: number;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function FormFieldBuilder({
  field,
  index,
  onUpdate,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown
}: FormFieldBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasOptions = ['multiple_choice', 'checkbox', 'dropdown'].includes(field.type);
  const Icon = fieldTypeIcons[field.type];

  const addOption = () => {
    const currentOptions = field.options || [];
    onUpdate({ options: [...currentOptions, ''] });
  };

  const updateOption = (optionIndex: number, value: string) => {
    const currentOptions = field.options || [];
    const newOptions = [...currentOptions];
    newOptions[optionIndex] = value;
    onUpdate({ options: newOptions });
  };

  const removeOption = (optionIndex: number) => {
    const currentOptions = field.options || [];
    const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
    onUpdate({ options: newOptions });
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
              <Badge variant="outline" className="flex items-center space-x-1">
                <Icon className="h-3 w-3" />
                <span>{fieldTypeLabels[field.type]}</span>
              </Badge>
            </div>
            <span className="text-sm text-gray-600">Field {index + 1}</span>
            {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('up')}
              disabled={!canMoveUp}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('down')}
              disabled={!canMoveDown}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Field Type */}
          <div>
            <Label>Field Type</Label>
            <Select
              value={field.type}
              onValueChange={(value: any) => {
                const updates: Partial<FormField> = { type: value };
                // Clear options when changing away from option-based types
                if (!['multiple_choice', 'checkbox', 'dropdown'].includes(value)) {
                  updates.options = undefined;
                }
                // Add default options for option-based types
                if (['multiple_choice', 'checkbox', 'dropdown'].includes(value) && !field.options) {
                  updates.options = ['Option 1', 'Option 2'];
                }
                onUpdate(updates);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(fieldTypeLabels).map(([value, label]) => {
                  const IconComponent = fieldTypeIcons[value as keyof typeof fieldTypeIcons];
                  return (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Field Label */}
          <div>
            <Label>Field Label *</Label>
            <Input
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Enter field label"
              className="mt-1"
            />
          </div>

          {/* Placeholder (for text fields) */}
          {['short_text', 'paragraph'].includes(field.type) && (
            <div>
              <Label>Placeholder Text</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Enter placeholder text"
                className="mt-1"
              />
            </div>
          )}

          {/* Options (for choice fields) */}
          {hasOptions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Options</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {(field.options || []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(optionIndex, e.target.value)}
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(optionIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
            <Label htmlFor={`required-${field.id}`}>Required field</Label>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

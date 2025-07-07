import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  Save, 
  GripVertical,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  Circle,
  FileText,
  Upload,
  Star,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number' | 'email' | 'phone' | 'file' | 'rating';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  conditional?: {
    field: string;
    value: string;
  };
  description?: string;
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: 'intake' | 'survey' | 'assessment' | 'consent' | 'feedback';
  fields: FormField[];
  settings: {
    allowAnonymous: boolean;
    requireAuthentication: boolean;
    multiPage: boolean;
    showProgress: boolean;
    autoSave: boolean;
    notifications: boolean;
    branding: boolean;
    submitMessage: string;
    redirectUrl?: string;
  };
  styling: {
    theme: 'default' | 'minimal' | 'medical' | 'modern';
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
  responses: number;
}

const fieldTypes = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'textarea', label: 'Text Area', icon: FileText },
  { type: 'select', label: 'Dropdown', icon: Circle },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio Button', icon: Circle },
  { type: 'date', label: 'Date Picker', icon: Calendar },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'rating', label: 'Rating', icon: Star },
];

interface AdvancedFormBuilderProps {
  form?: FormTemplate;
  onSave: (form: FormTemplate) => void;
  onCancel: () => void;
}

export function AdvancedFormBuilder({ form, onSave, onCancel }: AdvancedFormBuilderProps) {
  const [formData, setFormData] = useState<FormTemplate>(form || {
    id: '',
    title: 'New Form',
    description: '',
    category: 'intake',
    fields: [],
    settings: {
      allowAnonymous: false,
      requireAuthentication: true,
      multiPage: false,
      showProgress: true,
      autoSave: true,
      notifications: true,
      branding: true,
      submitMessage: 'Thank you for your submission!'
    },
    styling: {
      theme: 'medical',
      primaryColor: '#0ea5e9',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    responses: 0
  });

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New ${type} field`,
      required: false,
      placeholder: type === 'textarea' ? 'Enter your response...' : 'Enter value...'
    };

    if (type === 'select' || type === 'radio') {
      newField.options = ['Option 1', 'Option 2', 'Option 3'];
    }

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedField(newField);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
    if (selectedField?.id === fieldId) {
      setSelectedField(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(formData.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({
      ...prev,
      fields: items
    }));
  };

  const renderFieldIcon = (type: FormField['type']) => {
    const fieldType = fieldTypes.find(ft => ft.type === type);
    const Icon = fieldType?.icon || Type;
    return <Icon className="h-4 w-4" />;
  };

  const renderPreviewField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return <Input placeholder={field.placeholder} className="w-full" />;
      case 'textarea':
        return <Textarea placeholder={field.placeholder} className="w-full" />;
      case 'select':
        return (
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="checkbox" id={`${field.id}_${index}`} />
                <label htmlFor={`${field.id}_${index}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="radio" name={field.id} id={`${field.id}_${index}`} />
                <label htmlFor={`${field.id}_${index}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      case 'date':
        return <Input type="date" className="w-full" />;
      case 'number':
        return <Input type="number" placeholder={field.placeholder} className="w-full" />;
      case 'file':
        return <Input type="file" className="w-full" />;
      case 'rating':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-6 w-6 text-gray-300 hover:text-yellow-400 cursor-pointer" />
            ))}
          </div>
        );
      default:
        return <Input placeholder={field.placeholder} className="w-full" />;
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Form Builder */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{formData.title}</h2>
              <p className="text-gray-600">{formData.description}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button onClick={() => onSave(formData)}>
                <Save className="h-4 w-4 mr-2" />
                Save Form
              </Button>
            </div>
          </div>

          {!previewMode ? (
            <>
              {/* Field Types Palette */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Form Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {fieldTypes.map(({ type, label, icon: Icon }) => (
                      <Button
                        key={type}
                        variant="outline"
                        className="h-auto flex-col p-3"
                        onClick={() => addField(type as FormField['type'])}
                      >
                        <Icon className="h-5 w-5 mb-1" />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Form Fields */}
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {formData.fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`cursor-pointer border-2 ${
                                selectedField?.id === field.id ? 'border-blue-500' : 'border-gray-200'
                              }`}
                              onClick={() => setSelectedField(field)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="h-4 w-4 text-gray-400" />
                                    </div>
                                    {renderFieldIcon(field.type)}
                                    <div>
                                      <div className="font-medium">{field.label}</div>
                                      <div className="text-sm text-gray-500 capitalize">{field.type}</div>
                                    </div>
                                    {field.required && (
                                      <Badge variant="secondary" className="text-xs">Required</Badge>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeField(field.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {formData.fields.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No fields added yet</h3>
                  <p className="text-gray-600">Add fields from the palette above to get started</p>
                </div>
              )}
            </>
          ) : (
            /* Preview Mode */
            <Card>
              <CardHeader>
                <CardTitle>{formData.title}</CardTitle>
                {formData.description && (
                  <p className="text-gray-600">{formData.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.description && (
                      <p className="text-sm text-gray-600">{field.description}</p>
                    )}
                    {renderPreviewField(field)}
                  </div>
                ))}
                {formData.fields.length > 0 && (
                  <Button className="w-full">Submit Form</Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right Panel - Field Settings */}
      {selectedField && !previewMode && (
        <div className="w-80 border-l bg-gray-50 overflow-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Field Settings</h3>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label>Field Label</Label>
                  <Input
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Placeholder</Label>
                  <Input
                    value={selectedField.placeholder || ''}
                    onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={selectedField.description || ''}
                    onChange={(e) => {
                      console.log('Description changed:', e.target.value);
                      updateField(selectedField.id, { description: e.target.value });
                    }}
                    placeholder="Help text for this field"
                    className="w-full min-h-[80px] resize-y"
                    autoFocus={false}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedField.required}
                    onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                  />
                  <Label>Required field</Label>
                </div>
                
                {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2">
                      {selectedField.options?.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(selectedField.options || [])];
                              newOptions[index] = e.target.value;
                              updateField(selectedField.id, { options: newOptions });
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = selectedField.options?.filter((_, i) => i !== index);
                              updateField(selectedField.id, { options: newOptions });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newOptions = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                          updateField(selectedField.id, { options: newOptions });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4">
                <div>
                  <Label>Validation Rules</Label>
                  <div className="space-y-2 mt-2">
                    {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
                      <>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min length"
                            value={selectedField.validation?.minLength || ''}
                            onChange={(e) => updateField(selectedField.id, {
                              validation: { ...selectedField.validation, minLength: parseInt(e.target.value) || undefined }
                            })}
                          />
                          <Input
                            type="number"
                            placeholder="Max length"
                            value={selectedField.validation?.maxLength || ''}
                            onChange={(e) => updateField(selectedField.id, {
                              validation: { ...selectedField.validation, maxLength: parseInt(e.target.value) || undefined }
                            })}
                          />
                        </div>
                      </>
                    )}
                    
                    {selectedField.type === 'number' && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min value"
                          value={selectedField.validation?.min || ''}
                          onChange={(e) => updateField(selectedField.id, {
                            validation: { ...selectedField.validation, min: parseInt(e.target.value) || undefined }
                          })}
                        />
                        <Input
                          type="number"
                          placeholder="Max value"
                          value={selectedField.validation?.max || ''}
                          onChange={(e) => updateField(selectedField.id, {
                            validation: { ...selectedField.validation, max: parseInt(e.target.value) || undefined }
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Conditional Logic</Label>
                  <p className="text-sm text-gray-600 mb-2">Show this field only when:</p>
                  <Select
                    value={selectedField.conditional?.field || ''}
                    onValueChange={(value) => updateField(selectedField.id, {
                      conditional: value ? { ...selectedField.conditional, field: value, value: selectedField.conditional?.value || "" } : undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.fields
                        .filter(f => f.id !== selectedField.id)
                        .map(field => (
                          <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedField.conditional?.field && (
                    <Input
                      className="mt-2"
                      placeholder="equals value"
                      value={selectedField.conditional?.value || ''}
                      onChange={(e) => updateField(selectedField.id, {
                        conditional: { ...selectedField.conditional!, value: e.target.value }
                      })}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
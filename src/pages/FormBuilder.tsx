import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import FormFieldBuilder from '@/components/FormFieldBuilder';
import { Save, Eye, ArrowLeft } from 'lucide-react';

interface FormField {
  id: string;
  type: 'short_text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'date' | 'file_upload';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormData {
  title: string;
  description: string;
  fields: FormField[];
  is_published: boolean;
}

export default function FormBuilder() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    fields: [],
    is_published: false
  });

  useEffect(() => {
    if (formId) {
      fetchForm();
    }
  }, [formId]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (error) throw error;

      setFormData({
        title: data.title,
        description: data.description || '',
        fields: (data.fields as unknown as FormField[]) || [],
        is_published: data.is_published
      });
    } catch (error) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish = false) => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a form title",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const formPayload = {
        title: formData.title,
        description: formData.description,
        fields: formData.fields as any, // Cast to Json
        is_published: publish || formData.is_published,
        owner_id: user.id
      };

      let result;
      if (formId) {
        // Update existing form
        result = await supabase
          .from('forms')
          .update(formPayload)
          .eq('id', formId)
          .select()
          .single();
      } else {
        // Create new form
        result = await supabase
          .from('forms')
          .insert(formPayload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Form ${formId ? 'updated' : 'created'} successfully!`,
      });

      if (!formId) {
        navigate(`/edit/${result.data.id}`);
      } else {
        // Update local state
        setFormData(prev => ({ ...prev, is_published: publish || prev.is_published }));
      }
    } catch (error) {
      console.error('Error saving form:', error);
      toast({
        title: "Error",
        description: "Failed to save form",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'short_text',
      label: '',
      required: false,
      placeholder: ''
    };
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const fields = [...prev.fields];
      const index = fields.findIndex(f => f.id === fieldId);
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= fields.length) return prev;
      
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      
      return { ...prev, fields };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {formId ? 'Edit Form' : 'Create New Form'}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {formId && formData.is_published && (
            <Button 
              variant="outline"
              onClick={() => window.open(`/form/${formId}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          <Button 
            onClick={() => handleSave(false)}
            disabled={saving}
            variant="outline"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button 
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish Form'}
          </Button>
        </div>
      </div>

      {/* Form Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Form Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Form Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter form title"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter form description (optional)"
              className="mt-1"
              rows={3}
            />
          </div>
          {formId && (
            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.is_published}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_published: checked }))
                }
              />
              <Label htmlFor="published">Published</Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Form Fields</CardTitle>
            <Button onClick={addField}>Add Field</Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No fields added yet. Click "Add Field" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.fields.map((field, index) => (
                <FormFieldBuilder
                  key={field.id}
                  field={field}
                  index={index}
                  onUpdate={(updates) => updateField(field.id, updates)}
                  onRemove={() => removeField(field.id)}
                  onMove={(direction) => moveField(field.id, direction)}
                  canMoveUp={index > 0}
                  canMoveDown={index < formData.fields.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

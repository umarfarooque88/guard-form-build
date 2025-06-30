import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface FormField {
  id: string;
  type: 'short_text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'date' | 'file_upload';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: any;
}

export default function FormViewer() {
  const { formId } = useParams();
  const { toast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (formId) {
      fetchForm();
      checkUserSession();
    }
  }, [formId]);

  const checkUserSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');
      // Fetch user profile for name
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();
      setUserName(profile?.name || '');
    }
  };

  const fetchForm = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      setForm({
        id: data.id,
        title: data.title,
        description: data.description,
        fields: (data.fields as unknown as FormField[]) || [],
        settings: data.settings
      });
    } catch (error) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Form not found or is not published",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate email and name for anonymous users
    if (!userEmail) {
      if (!answers['user_email'] || !answers['user_email'].trim()) {
        newErrors['user_email'] = 'Email is required';
      }
    }
    if (!userName) {
      if (!answers['user_name'] || !answers['user_name'].trim()) {
        newErrors['user_name'] = 'Name is required';
      }
    }

    form?.fields.forEach((field) => {
      if (field.required) {
        const answer = answers[field.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0) || answer.toString().trim() === '') {
          newErrors[field.id] = 'This field is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const { data: { user } } = await supabase.auth.getUser();

      // Prepare submission data with user info
      const submissionData = {
        form_id: formId,
        user_id: user?.id || null,
        answers: {
          ...answers,
          user_email: userEmail || answers['user_email'],
          user_name: userName || answers['user_name']
        } as any,
        metadata: {
          time_taken: timeTaken,
          user_agent: navigator.userAgent,
          tab_switches: 0 // TODO: Implement tab switch detection
        } as any
      };

      const { error } = await supabase
        .from('form_responses')
        .insert([submissionData]);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Success",
        description: "Your response has been submitted successfully!",
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateAnswer = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.id];
    const errorMessage = errors[field.id];

    switch (field.type) {
      case 'short_text':
        return (
          <div>
            <Label htmlFor={field.id} className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              value={answers[field.id] || ''}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`mt-1 ${hasError ? 'border-red-500' : ''}`}
            />
            {hasError && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
          </div>
        );

      case 'paragraph':
        return (
          <div>
            <Label htmlFor={field.id} className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={answers[field.id] || ''}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`mt-1 ${hasError ? 'border-red-500' : ''}`}
              rows={4}
            />
            {hasError && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
          </div>
        );

      case 'multiple_choice':
        return (
          <div>
            <Label className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <RadioGroup
              value={answers[field.id] || ''}
              onValueChange={(value) => updateAnswer(field.id, value)}
              className={`mt-2 ${hasError ? 'border border-red-500 rounded p-2' : ''}`}
            >
              {field.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                  <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {hasError && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div>
            <Label className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className={`mt-2 space-y-2 ${hasError ? 'border border-red-500 rounded p-2' : ''}`}>
              {field.options?.map((option, index) => {
                const selectedOptions = answers[field.id] || [];
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.id}-${index}`}
                      checked={selectedOptions.includes(option)}
                      onCheckedChange={(checked) => {
                        const currentOptions = answers[field.id] || [];
                        if (checked) {
                          updateAnswer(field.id, [...currentOptions, option]);
                        } else {
                          updateAnswer(field.id, currentOptions.filter((o: string) => o !== option));
                        }
                      }}
                    />
                    <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
                  </div>
                );
              })}
            </div>
            {hasError && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
          </div>
        );

      case 'dropdown':
        return (
          <div>
            <Label className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={answers[field.id] || ''}
              onValueChange={(value) => updateAnswer(field.id, value)}
            >
              <SelectTrigger className={`mt-1 ${hasError ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
          </div>
        );

      case 'date':
        return (
          <div>
            <Label htmlFor={field.id} className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={answers[field.id] || ''}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              className={`mt-1 ${hasError ? 'border-red-500' : ''}`}
            />
            {hasError && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
          </div>
        );

      case 'file_upload':
        return (
          <div>
            <Label htmlFor={field.id} className="flex items-center space-x-1">
              <span>{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="file"
              onChange={(e) => updateAnswer(field.id, e.target.files?.[0]?.name || '')}
              className={`mt-1 ${hasError ? 'border-red-500' : ''}`}
            />
            {hasError && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Form Not Found</h1>
            <p className="text-gray-600">The form you're looking for doesn't exist or is not published.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h1>
            <p className="text-gray-600">Your response has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-sm text-gray-600">FormGuard</span>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">{form.title}</CardTitle>
            {form.description && (
              <p className="text-gray-600 mt-2">{form.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User info fields for anonymous users */}
              {!userEmail && (
                <div>
                  <Label htmlFor="user_email" className="flex items-center space-x-1">
                    <span>Email Address</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="user_email"
                    type="email"
                    value={answers['user_email'] || ''}
                    onChange={(e) => updateAnswer('user_email', e.target.value)}
                    placeholder="Enter your email address"
                    className={`mt-1 ${errors['user_email'] ? 'border-red-500' : ''}`}
                  />
                  {errors['user_email'] && <p className="text-red-500 text-sm mt-1">{errors['user_email']}</p>}
                </div>
              )}
              
              {!userName && (
                <div>
                  <Label htmlFor="user_name" className="flex items-center space-x-1">
                    <span>Full Name</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="user_name"
                    value={answers['user_name'] || ''}
                    onChange={(e) => updateAnswer('user_name', e.target.value)}
                    placeholder="Enter your full name"
                    className={`mt-1 ${errors['user_name'] ? 'border-red-500' : ''}`}
                  />
                  {errors['user_name'] && <p className="text-red-500 text-sm mt-1">{errors['user_name']}</p>}
                </div>
              )}

              {form.fields.map((field) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
              
              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

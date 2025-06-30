
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface FormResponse {
  id: string;
  answers: Record<string, any>;
  submitted_at: string;
  metadata: {
    time_taken: number;
    user_agent: string;
  };
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
  }>;
}

export default function FormResponses() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (formId) {
      fetchFormAndResponses();
    }
  }, [formId]);

  const fetchFormAndResponses = async () => {
    try {
      // Fetch form details
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      setForm({
        id: formData.id,
        title: formData.title,
        description: formData.description,
        fields: (formData.fields as any) || []
      });

      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (responsesError) throw responsesError;

      // Type cast the responses data
      const typedResponses: FormResponse[] = (responsesData || []).map(response => ({
        id: response.id,
        answers: response.answers as Record<string, any>,
        submitted_at: response.submitted_at,
        metadata: response.metadata as { time_taken: number; user_agent: string; }
      }));

      setResponses(typedResponses);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load form responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) return;

    const headers = ['Submitted At', 'Name', 'Email', 'Time Taken (seconds)'];
    form.fields.forEach(field => {
      headers.push(field.label);
    });

    const csvData = [headers];
    
    responses.forEach(response => {
      const row = [
        format(new Date(response.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
        response.answers.user_name || 'N/A',
        response.answers.user_email || 'N/A',
        response.metadata?.time_taken?.toString() || 'N/A'
      ];
      
      form.fields.forEach(field => {
        const answer = response.answers[field.id];
        if (Array.isArray(answer)) {
          row.push(answer.join(', '));
        } else {
          row.push(answer?.toString() || '');
        }
      });
      
      csvData.push(row);
    });

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title}_responses.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Form Not Found</h1>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
            <p className="text-gray-600">Form Responses ({responses.length})</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {responses.length > 0 && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No responses yet</h3>
            <p className="text-gray-600">Responses will appear here once people start submitting your form.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Time Taken</TableHead>
                    {form.fields.map(field => (
                      <TableHead key={field.id}>{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map(response => (
                    <TableRow key={response.id}>
                      <TableCell>
                        {format(new Date(response.submitted_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{response.answers.user_name || 'N/A'}</TableCell>
                      <TableCell>{response.answers.user_email || 'N/A'}</TableCell>
                      <TableCell>
                        {response.metadata?.time_taken ? `${response.metadata.time_taken}s` : 'N/A'}
                      </TableCell>
                      {form.fields.map(field => {
                        const answer = response.answers[field.id];
                        return (
                          <TableCell key={field.id}>
                            {Array.isArray(answer) ? answer.join(', ') : (answer?.toString() || '-')}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

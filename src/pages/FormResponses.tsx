
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Eye, TrendingUp, Users, Clock, Mail } from 'lucide-react';
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

    toast({
      title: "Success",
      description: "CSV file downloaded successfully!",
    });
  };

  const avgTimeSpent = responses.length > 0 
    ? Math.round(responses.reduce((acc, r) => acc + (r.metadata?.time_taken || 0), 0) / responses.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading responses...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center shadow-xl border-0 bg-white/70 backdrop-blur-sm">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
            <p className="text-gray-600 mb-6">The form you're looking for doesn't exist or you don't have access to it.</p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="bg-white/70 backdrop-blur-sm border-violet-200 hover:bg-violet-50 hover:border-violet-300 transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  {form.title}
                </h1>
                <p className="text-gray-600 text-lg mt-1">Response Analytics & Data</p>
              </div>
            </div>
            {responses.length > 0 && (
              <Button 
                onClick={exportToCSV} 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          {responses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Responses</p>
                      <p className="text-3xl font-bold">{responses.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Avg. Time Spent</p>
                      <p className="text-3xl font-bold">{avgTimeSpent}s</p>
                    </div>
                    <Clock className="h-8 w-8 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Latest Response</p>
                      <p className="text-lg font-bold">
                        {format(new Date(responses[0].submitted_at), 'MMM d')}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Response Rate</p>
                      <p className="text-3xl font-bold">
                        {responses.length > 0 ? '100%' : '0%'}
                      </p>
                    </div>
                    <Mail className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Responses Table */}
        {responses.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Eye className="h-10 w-10 text-violet-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No responses yet</h3>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Your form is ready to collect responses. Share the link and watch the data come in!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-xl font-bold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                All Responses ({responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-100/50">
                      <TableHead className="font-semibold text-gray-700">Submitted At</TableHead>
                      <TableHead className="font-semibold text-gray-700">Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Email</TableHead>
                      <TableHead className="font-semibold text-gray-700">Time Taken</TableHead>
                      {form.fields.map(field => (
                        <TableHead key={field.id} className="font-semibold text-gray-700">
                          {field.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response, index) => (
                      <TableRow 
                        key={response.id} 
                        className={`hover:bg-violet-50/50 transition-colors ${
                          index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                            <span>{format(new Date(response.submitted_at), 'MMM d, yyyy HH:mm')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {(response.answers.user_name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{response.answers.user_name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {response.answers.user_email || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {response.metadata?.time_taken ? `${response.metadata.time_taken}s` : 'N/A'}
                          </span>
                        </TableCell>
                        {form.fields.map(field => {
                          const answer = response.answers[field.id];
                          return (
                            <TableCell key={field.id} className="max-w-xs">
                              <div className="truncate" title={Array.isArray(answer) ? answer.join(', ') : (answer?.toString() || '-')}>
                                {Array.isArray(answer) ? (
                                  <span className="text-purple-600 font-medium">{answer.join(', ')}</span>
                                ) : (
                                  <span className="text-gray-700">{answer?.toString() || '-'}</span>
                                )}
                              </div>
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
    </div>
  );
}

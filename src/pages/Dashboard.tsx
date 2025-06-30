
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  PlusCircle, 
  FileText, 
  Users, 
  Eye, 
  Edit3, 
  Share2, 
  Trash2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface Form {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  response_count?: number;
}

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAndForms();
  }, []);

  const fetchUserAndForms = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setUser(profile);

      // Fetch user's forms with response counts
      const { data: formsData, error } = await supabase
        .from('forms')
        .select(`
          *,
          form_responses(count)
        `)
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Process the data to include response counts
      const formsWithCounts = formsData.map(form => ({
        ...form,
        response_count: form.form_responses?.length || 0
      }));

      setForms(formsWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form deleted successfully",
      });

      // Refresh forms list
      fetchUserAndForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
    }
  };

  const copyFormLink = (formId: string) => {
    const link = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Success",
      description: "Form link copied to clipboard!",
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-600">Manage your forms and view responses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Forms</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.filter(form => form.is_published).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.reduce((total, form) => total + (form.response_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forms List */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Forms</h2>
        <Button onClick={() => navigate('/create')} className="flex items-center space-x-2">
          <PlusCircle className="h-4 w-4" />
          <span>Create New Form</span>
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-6">Create your first form to get started</p>
            <Button onClick={() => navigate('/create')}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1 line-clamp-2">{form.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {form.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant={form.is_published ? "default" : "secondary"}>
                    {form.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{form.response_count || 0} responses</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(form.updated_at), 'MMM d')}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/edit/${form.id}`)}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  {form.is_published && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyFormLink(form.id)}
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteForm(form.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

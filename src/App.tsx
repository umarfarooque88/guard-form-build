
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Toaster } from '@/components/ui/toaster';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import FormBuilder from '@/pages/FormBuilder';
import FormViewer from '@/pages/FormViewer';
import FormResponses from '@/pages/FormResponses';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />
        <Route path="/form/:formId" element={<FormViewer />} />
        
        {/* Protected routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />} />
        <Route 
          path="/dashboard" 
          element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/auth" />} 
        />
        <Route 
          path="/create" 
          element={user ? <Layout><FormBuilder /></Layout> : <Navigate to="/auth" />} 
        />
        <Route 
          path="/edit/:formId" 
          element={user ? <Layout><FormBuilder /></Layout> : <Navigate to="/auth" />} 
        />
        <Route 
          path="/responses/:formId" 
          element={user ? <Layout><FormResponses /></Layout> : <Navigate to="/auth" />} 
        />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;

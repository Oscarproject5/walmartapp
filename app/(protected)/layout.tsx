'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Layout from '../components/Layout';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string>('');
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || session.user.email?.split('@')[0] || 'User');
        } else {
          setUserName(session.user.email?.split('@')[0] || 'User');
        }
      }
    };
    
    getUser();
  }, []);
  
  return children;
} 
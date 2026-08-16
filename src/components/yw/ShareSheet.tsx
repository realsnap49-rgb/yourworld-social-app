import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Send } from 'lucide-react';

interface ShareSheetProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ isOpen = false, onClose = () => {} }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);

      if (!error && data) {
        setUsers(data);
      }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-end z-50">
      <div className="bg-gray-900 w-full max-w-md p-4 rounded-t-2xl text-white max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Search & Send</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Gmail or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-xl">
              <div>
                <p className="font-semibold">{u.full_name || u.username || 'User'}</p>
                <p className="text-xs text-gray-400">{u.username || 'No Gmail ID'}</p>
              </div>
              <button className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500">
                <Send size={16} />
              </button>
            </div>
          ))}
          {searchQuery && users.length === 0 && (
            <p className="text-center text-gray-400 py-4">No user found</p>
          )}
        </div>
      </div>
    </div>
  );
};

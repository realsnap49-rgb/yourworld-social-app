import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string;
  media_url: string;
  caption: string;
  type: 'reel' | 'story';
  user_id: string;
}

export const ReelsAndStories: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'reel' | 'story'>('reel');

  useEffect(() => {
    fetchPosts();
  }, [activeTab]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('type', activeTab)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data as Post[]);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-around mb-4 border-b pb-2">
        <button
          onClick={() => setActiveTab('reel')}
          className={`font-bold ${activeTab === 'reel' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          Reels Feed
        </button>
        <button
          onClick={() => setActiveTab('story')}
          className={`font-bold ${activeTab === 'story' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          24h Stories
        </button>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-center text-gray-400">No {activeTab}s uploaded yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="border rounded-lg p-2 bg-black text-white">
              {post.media_url.endsWith('.mp4') ? (
                <video src={post.media_url} controls className="w-full rounded" />
              ) : (
                <img src={post.media_url} alt={post.caption} className="w-full rounded" />
              )}
              {post.caption && <p className="mt-2 text-sm">{post.caption}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

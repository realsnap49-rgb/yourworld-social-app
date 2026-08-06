import React from 'react';
import { Home, Video, MessageSquare, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around py-3 z-50">
      <button 
        onClick={() => onTabChange('feed')} 
        className={`flex flex-col items-center ${currentTab === 'feed' ? 'text-blue-500' : 'text-gray-400'}`}
      >
        <Home size={22} />
        <span className="text-xs mt-1">Feed</span>
      </button>

      <button 
        onClick={() => onTabChange('reels')} 
        className={`flex flex-col items-center ${currentTab === 'reels' ? 'text-blue-500' : 'text-gray-400'}`}
      >
        <Video size={22} />
        <span className="text-xs mt-1">Reels & Stories</span>
      </button>

      <button 
        onClick={() => onTabChange('chat')} 
        className={`flex flex-col items-center ${currentTab === 'chat' ? 'text-blue-500' : 'text-gray-400'}`}
      >
        <MessageSquare size={22} />
        <span className="text-xs mt-1">Orbit Chat</span>
      </button>

      <button 
        onClick={() => onTabChange('profile')} 
        className={`flex flex-col items-center ${currentTab === 'profile' ? 'text-blue-500' : 'text-gray-400'}`}
      >
        <User size={22} />
        <span className="text-xs mt-1">Profile</span>
      </button>
    </div>
  );
};

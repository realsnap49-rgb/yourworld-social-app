{/* Create Channel Option */}
<div 
  onClick={() => navigate({ to: "/channel/posts" })} 
  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
>
  <div className="flex items-center gap-4">
    <Megaphone className="text-zinc-400" size={20} />
    <div>
      <div className="font-semibold text-white">Create Channel</div>
      <div className="text-xs text-zinc-500">Videos, reels, posts & analytics</div>
    </div>
  </div>
  <ChevronRight className="text-zinc-600" size={20} />
</div>

{/* Orbit Option */}
<div 
  onClick={() => navigate({ to: "/orbit" })} 
  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 rounded-xl cursor-pointer"
>
  <div className="flex items-center gap-4">
    <Orbit className="text-zinc-400" size={20} />
    <div>
      <div className="font-semibold text-white">Orbit</div>
      <div className="text-xs text-zinc-500">Private social discovery</div>
    </div>
  </div>
  <ChevronRight className="text-zinc-600" size={20} />
</div>

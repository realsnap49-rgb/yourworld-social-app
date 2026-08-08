{/* STORY TRAY (EXACT MATCH) */}
      <div className="px-4 py-3 overflow-x-auto flex items-center gap-4 scrollbar-none border-b border-zinc-900/60">
        
        {/* Your Moment (Y + Pink Plus Badge) */}
        <div 
          onClick={() => navigate({ to: "/moment/create" })} 
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-pink-500/80 border-2 border-pink-400 flex items-center justify-center font-bold text-2xl text-white shadow-lg">
              Y
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-pink-500 border-2 border-black flex items-center justify-center text-white">
              <Plus size={12} strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-semibold text-zinc-300">Your moment</span>
        </div>

        {/* Friends Stories (R, M, A, N, K with exact colors) */}
        {[
          { id: 1, name: "riko.night", letter: "R", bg: "bg-purple-600", ring: "border-pink-500" },
          { id: 2, name: "sea.salt", letter: "M", bg: "bg-teal-500", ring: "border-teal-400" },
          { id: 3, name: "spinsolo", letter: "A", bg: "bg-orange-500", ring: "border-orange-400" },
          { id: 4, name: "slowbrunch", letter: "N", bg: "bg-red-600", ring: "border-red-500" },
          { id: 5, name: "wavelen", letter: "K", bg: "bg-sky-500", ring: "border-blue-400" },
        ].map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform">
            <div className={`p-[2px] rounded-full border-2 ${s.ring}`}>
              <div className={`w-15 h-15 rounded-full ${s.bg} flex items-center justify-center font-bold text-2xl text-white border border-black shadow-md`}>
                {s.letter}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-zinc-300 w-16 truncate text-center">{s.name}</span>
          </div>
        ))}

      </div>

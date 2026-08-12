export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: "Trending" | "Lo-Fi" | "Cinematic" | "Drill" | "Chill";
  duration: string;
  url: string;
}

export const NO_COPYRIGHT_MUSIC: MusicTrack[] = [
  {
    id: "1",
    title: "Cyber Vibe",
    artist: "YourWorld Originals",
    category: "Trending",
    duration: "2:15",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3"
  },
  {
    id: "2",
    title: "Chill Lofi Beats",
    artist: "NoCopyrightSounds",
    category: "Lo-Fi",
    duration: "1:48",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3"
  },
  {
    id: "3",
    title: "Cinematic Trailer",
    artist: "World Vault",
    category: "Cinematic",
    duration: "2:05",
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_8fa389f41f.mp3"
  },
  {
    id: "4",
    title: "Dark Drill Beat",
    artist: "Prod. YourWorld",
    category: "Drill",
    duration: "1:30",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3"
  }
];

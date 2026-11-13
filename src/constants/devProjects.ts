export interface DevProject {
  id: string;
  name: string;
  description: string;
  url: string;
  gradient: string;
  monogram: string;
  domainLabel: string;
}

export const DEV_PROJECTS: DevProject[] = [
  {
    id: 'saitechhub',
    name: 'SaiTechHub',
    description: 'Personal tech ecosystem platform',
    url: 'https://saitechhub.qzz.io',
    gradient: 'from-violet-500 via-fuchsia-500 to-amber-500',
    monogram: 'ST',
    domainLabel: 'saitechhub.qzz.io',
  },
  {
    id: 'friends-album',
    name: 'Friends Album',
    description: 'A vibrant memory showcase for friends',
    url: 'https://frdalbum.netlify.app',
    gradient: 'from-pink-500 via-rose-500 to-orange-400',
    monogram: 'FA',
    domainLabel: 'frdalbum.netlify.app',
  },
  {
    id: 'kvsr-timetable',
    name: 'KVSR Siddartha College Timetable',
    description: 'Smart college timetable portal',
    url: 'https://kvsrsiddarthacollegetime.netlify.app/',
    gradient: 'from-indigo-500 via-violet-500 to-pink-500',
    monogram: 'KT',
    domainLabel: 'kvsrsiddarthacollegetime.netlify.app',
  },
  {
    id: 'master-game-mind',
    name: 'Master Game Mind',
    description: 'Brain-training game experience',
    url: 'https://saravana-master-game-mind.netlify.app/',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    monogram: 'MG',
    domainLabel: 'saravana-master-game-mind.netlify.app',
  },
  {
    id: 'electrotech-saravanasai',
    name: 'ElectroTech with Saravanasai',
    description: 'Electronics and embedded systems learning hub',
    url: 'http://electrotechwithsaravanasai.qzz.io/',
    gradient: 'from-cyan-500 via-violet-500 to-fuchsia-500',
    monogram: 'ET',
    domainLabel: 'electrotechwithsaravanasai.qzz.io',
  },
];

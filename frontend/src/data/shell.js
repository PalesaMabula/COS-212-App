// Shell navigation (part of the interface, not course content: that comes from the server).
// "Lessons" (to: null) opens the module the student is working on.

export const NAV = [
  { key: 'dash', label: 'Dashboard', icon: 'home', to: '/' },
  { key: 'course', label: 'Course overview', icon: 'book', to: '/course' },
  { key: 'lesson', label: 'Lessons', icon: 'layers', to: null },
  { key: 'practice', label: 'Practice', icon: 'target', to: '/practice' },
  { key: 'quiz', label: 'Full quiz', icon: 'help', to: '/quiz' },
  { key: 'code', label: 'Code lab', icon: 'code', to: '/code' },
  { key: 'cal', label: 'Calendar and to-do', icon: 'calendar', to: '/?go=plan' },
  { key: 'analysis', label: 'My analysis', icon: 'chart', to: '/analysis' },
  { key: 'settings', label: 'Settings', icon: 'sliders', to: '/settings' },
];

// Pages to search besides the modules and their sections (added from the course content).
export const SEARCH_PAGES = [
  { t: 'Course overview and objectives', to: '/course' },
  { t: 'Glossary', to: '/course?tab=glossary' },
  { t: 'Practice: new questions for any module', to: '/practice' },
  { t: 'Full quiz: 15 questions on all modules', to: '/quiz' },
  { t: 'Code lab: BFS in Python', to: '/code' },
  { t: 'Calendar and to-do list', to: '/?go=plan' },
  { t: 'My analysis and readiness report', to: '/analysis' },
  { t: 'Display, reading and audio settings', to: '/settings' },
];

export const NOTIFICATIONS = [
  { id: 1, kind: 'video', text: 'New animations in Module 3: ripples, the queue and the guestbook', time: 'Today' },
  { id: 2, kind: 'calendar', text: 'Set your lecture date (top bar) to see a countdown.', time: 'Today' },
  { id: 3, kind: 'bulb', text: 'Practice and the Full quiz give you new questions every time.', time: 'Today' },
];

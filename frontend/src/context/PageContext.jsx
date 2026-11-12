import { createContext, useContext, useEffect, useState } from 'react';

// Lets each page tell the top bar what "Read this page aloud" should say,
// and sets the browser tab title.
const PageContext = createContext({ pageText: '', setPageText: () => {} });

export function PageProvider({ children }) {
  const [pageText, setPageText] = useState('');
  return <PageContext.Provider value={{ pageText, setPageText }}>{children}</PageContext.Provider>;
}

export function usePageText() {
  return useContext(PageContext).pageText;
}

/** Call at the top of every page: usePage('Dashboard', 'Text read by the top-bar speaker...') */
export function usePage(title, text) {
  const { setPageText } = useContext(PageContext);
  useEffect(() => {
    document.title = `${title} · COS212 Data Structures`;
    setPageText(text);
  }, [title, text, setPageText]);
}

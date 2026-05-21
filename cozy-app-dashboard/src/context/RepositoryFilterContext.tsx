import { createContext, type ReactNode, useContext, useState } from 'react';

export interface RepositoryFilterContextType {
  showFavoritesOnly: boolean;
  toggleShowFavorites: () => void;
}

const RepositoryFilterContext = createContext<
  RepositoryFilterContextType | undefined
>(undefined);

export function RepositoryFilterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(true);

  const toggleShowFavorites = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
  };

  return (
    <RepositoryFilterContext.Provider
      value={{ showFavoritesOnly, toggleShowFavorites }}
    >
      {children}
    </RepositoryFilterContext.Provider>
  );
}

export function useRepositoryFilter() {
  const context = useContext(RepositoryFilterContext);
  if (context === undefined) {
    throw new Error(
      'useRepositoryFilter must be used within a RepositoryFilterProvider',
    );
  }
  return context;
}

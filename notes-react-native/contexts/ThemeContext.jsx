import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { lightColors, darkColors } from '../styles/theme';
import { KEYS, getItem, setItem } from '../lib/storage';

const ThemeContext = createContext({ theme: 'light', colors: lightColors, setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    getItem(KEYS.theme).then((saved) => {
      if (saved === 'dark' || saved === 'light') setThemeState(saved);
    });
  }, []);

  const setTheme = useCallback((value) => {
    setThemeState(value);
    setItem(KEYS.theme, value);
  }, []);

  const value = useMemo(
    () => ({ theme, colors: theme === 'dark' ? darkColors : lightColors, setTheme }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export const useStyles = (factory) => {
  const { colors, theme } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, theme)), [colors, theme]);
};

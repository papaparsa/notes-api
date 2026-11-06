import { useWindowDimensions } from 'react-native';
import { breakpoints } from '../styles/theme';

export const useBreakpoint = () => {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    sm: width >= breakpoints.sm,
    md: width >= breakpoints.md,
    lg: width >= breakpoints.lg,
    xl: width >= breakpoints.xl,
    xxl: width >= breakpoints.xxl,
  };
};

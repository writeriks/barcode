import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { useThemeColors } from '../../theme/ThemeContext';
import type { Product, ProductSource } from '../../types/product';
import { createProductResultStyles, type ProductResultStyles } from './styles';

interface ProductResultValue {
  product: Product;
  source: ProductSource;
  styles: ProductResultStyles;
}

const ProductResultContext = createContext<ProductResultValue | null>(null);

export function ProductResultProvider({
  product,
  source,
  children,
}: {
  product: Product;
  source: ProductSource;
  children: ReactNode;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createProductResultStyles(colors), [colors]);
  const value = useMemo(() => ({ product, source, styles }), [product, source, styles]);
  return <ProductResultContext.Provider value={value}>{children}</ProductResultContext.Provider>;
}

export function useProductResult(): ProductResultValue {
  const value = useContext(ProductResultContext);
  if (!value) {
    throw new Error('useProductResult must be used inside ProductResultProvider');
  }
  return value;
}

export interface ProductResultSection {
  id: string;
  Component: () => ReactElement | null;
}

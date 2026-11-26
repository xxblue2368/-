import { useEffect, useState } from 'react';
import { fetchProduct } from '../api/products';
import type { CartItem, Product } from '../types/api';

export function useCartProducts(cart: CartItem[]): {
  products: Record<string, Product>;
  loading: boolean;
  error: string;
} {
  const key = JSON.stringify([...new Set(cart.map((item) => item.productId))].sort());
  const [result, setResult] = useState<{
    key: string;
    products: Record<string, Product>;
    loading: boolean;
    error: string;
  }>({ key: '', products: {}, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    const ids: string[] = JSON.parse(key);
    setResult({ key, products: {}, loading: true, error: '' });
    Promise.allSettled(ids.map((id) => fetchProduct(id, controller.signal))).then((results) => {
      if (controller.signal.aborted) return;
      const products: Record<string, Product> = {};
      let failed = false;
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) products[result.value.id] = result.value;
        else failed = true;
      }
      setResult({
        key,
        products,
        loading: false,
        error: failed
          ? '일부 상품 정보를 불러오지 못했습니다. 새로고침하거나 해당 상품을 삭제해 주세요.'
          : '',
      });
    });
    return () => controller.abort();
  }, [key]);
  return result.key === key ? result : { products: {}, loading: true, error: '' };
}

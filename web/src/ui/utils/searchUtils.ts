import { useEffect, useState } from 'react';

/**
 * Chuẩn hóa chuỗi tìm kiếm tiếng Việt:
 * - Bỏ dấu tiếng Việt (NFD + đ/Đ -> d)
 * - Chuyển về chữ thường
 * - Gộp nhiều khoảng trắng thành 1 và trim 2 đầu
 */
export function normalizeSearchText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kiểm tra chuỗi nguồn có chứa từ khóa tìm kiếm sau khi chuẩn hóa hay không.
 */
export function matchesSearch(haystack: unknown, query: string): boolean {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;
  return normalizeSearchText(haystack).includes(normQuery);
}

/**
 * Hook debounce giá trị tìm kiếm (mặc định 1000ms = 1 giây).
 */
export function useDebouncedValue<T>(value: T, delayMs = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

import type { Metadata } from "next";
import UiAppClient from "../ui-app-client";

type RouteProps = { params: Promise<{ slug: string[] }> };

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000/api/v1";

const pageMetadata: Record<string, { title: string; description: string }> = {
  books: { title: "Danh mục sách", description: "Tìm kiếm, lọc và khám phá sách đã xuất bản trên HUKI." },
  search: { title: "Tìm kiếm sách", description: "Tìm tác phẩm, tác giả và nhà xuất bản trên HUKI." },
  categories: { title: "Danh mục sách", description: "Duyệt kho sách HUKI theo danh mục." },
  stores: { title: "Gian hàng chính hãng", description: "Khám phá cửa hàng sách đã được HUKI xác minh." },
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const canonical = `/${slug.map(encodeURIComponent).join("/")}`;
  const [section, identifier] = slug;

  if ((section === "books" || section === "book") && identifier) {
    const book = await fetchPublicEntity(`/books/slug/${encodeURIComponent(identifier)}`);
    if (book) {
      const description = trimDescription(book.description, `Mua và đọc ${book.title} trên HUKI.`);
      return {
        title: String(book.title),
        description,
        alternates: { canonical: `/books/${encodeURIComponent(String(book.slug || identifier))}` },
        openGraph: {
          type: "book",
          title: String(book.title),
          description,
          images: book.coverUrl ? [String(book.coverUrl)] : undefined,
        },
      };
    }
  }

  if ((section === "stores" || section === "shop") && identifier) {
    const store = await fetchPublicEntity(`/stores/slug/${encodeURIComponent(identifier)}`);
    if (store) {
      const description = trimDescription(store.description, `Gian hàng ${store.name} đã được xác minh trên HUKI.`);
      const image = store.banner || store.logo;
      return {
        title: String(store.name),
        description,
        alternates: { canonical: `/stores/${encodeURIComponent(String(store.slug || identifier))}` },
        openGraph: {
          title: String(store.name),
          description,
          images: image ? [String(image)] : undefined,
        },
      };
    }
  }

  const fallback = pageMetadata[section] || { title: "HUKI EBOOK", description: "Nền tảng sách thật và Ebook bản quyền HUKI." };
  return { ...fallback, alternates: { canonical } };
}

async function fetchPublicEntity(path: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data || body || null;
  } catch {
    return null;
  }
}

function trimDescription(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : fallback;
}

export default function UiRoutePage() {
  return <UiAppClient />;
}

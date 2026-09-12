import type { Metadata } from "next";
import UiAppClient from "./ui-app-client";

export const metadata: Metadata = {
  title: "Sách thật & Ebook bản quyền",
  description: "Khám phá sách giấy và Ebook bản quyền từ các cửa hàng đã được HUKI xác minh.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <UiAppClient />;
}

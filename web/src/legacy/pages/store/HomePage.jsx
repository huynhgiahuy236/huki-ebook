import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  // Search State
  const [searchKeyword, setSearchKeyword] = useState('');

  // Voucher Saved State
  const [savedVouchers, setSavedVouchers] = useState(['HUKIFREESHIP']);

  // Bestseller Filter Tab
  const [bestsellerTab, setBestsellerTab] = useState('all');

  // Topic Tags Filter
  const [activeTopicTag, setActiveTopicTag] = useState('Tất cả');

  // Followed Shops & Authors State
  const [followedShops, setFollowedShops] = useState(['Nhã Nam', 'Alpha Books']);
  const [followedAuthors, setFollowedAuthors] = useState(['James Clear']);

  // Author Slider State & Autoplay
  const [authorIndex, setAuthorIndex] = useState(0);
  const [isAuthorHovered, setIsAuthorHovered] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // AI Prompt State
  const [aiInput, setAiInput] = useState('Tôi muốn tìm sách giúp cải thiện sự tập trung và làm việc sâu mà không bị kiệt sức...');
  const [newsletterEmail, setNewsletterEmail] = useState('');

  // 1. VOUCHER LIST
  const voucherList = useMemo(() => [
    {
      code: 'HUKIFREESHIP',
      badge: 'FREESHIP',
      title: 'Miễn phí vận chuyển 100%',
      condition: 'Đơn từ 150.000₫ • Toàn quốc',
      exp: 'HSD: 31/12/2026',
      icon: 'local_shipping'
    },
    {
      code: 'HUKINEW25',
      badge: 'GIẢM 25K',
      title: 'Giảm 25.000₫ đơn đầu tiên',
      condition: 'Đơn từ 120.000₫ • Khách mới',
      exp: 'HSD: Còn 5 ngày',
      icon: 'redeem'
    },
    {
      code: 'HUKICOMBO60',
      badge: 'GIẢM 60K',
      title: 'Giảm 60.000₫ khi mua Combo',
      condition: 'Áp dụng cho Combo từ 300k',
      exp: 'HSD: 15/10/2026',
      icon: 'auto_awesome'
    },
    {
      code: 'EBOOK50',
      badge: 'EBOOK 50%',
      title: 'Giảm 50% mọi Ebook bản quyền',
      condition: 'Tối đa 40.000₫ • Mọi đơn Ebook',
      exp: 'HSD: Còn 2 ngày',
      icon: 'menu_book'
    }
  ], []);

  // 2. CATEGORIES (8 Icon Cards)
  const categoryGrid = useMemo(() => [
    { name: 'Văn học', count: '12.5k sách', icon: 'auto_stories', link: '/books?category=van-hoc', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { name: 'Kinh tế', count: '8.2k sách', icon: 'trending_up', link: '/books?category=kinh-te', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { name: 'Thiếu nhi', count: '15.3k sách', icon: 'child_care', link: '/books?category=thieu-nhi', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { name: 'Công nghệ & AI', count: '3.5k sách', icon: 'smart_toy', link: '/books?category=cong-nghe', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { name: 'Ngoại ngữ', count: '7.2k sách', icon: 'translate', link: '/books?category=ngoai-ngu', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
    { name: 'Manga - Comic', count: '6.8k sách', icon: 'menu_book', link: '/books?category=manga', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { name: 'Kỹ năng sống', count: '9.1k sách', icon: 'psychology', link: '/books?category=ky-nang', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    { name: 'Ebook bản quyền', count: '4.2k Ebook', icon: 'devices', link: '/books?format=ebook', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' }
  ], []);

  // 3. FLASH SALE BOOKS (6 Compact Items)
  const flashSaleBooks = useMemo(() => [
    {
      id: 'nha-gia-kim',
      title: 'Nhà Giả Kim (Tái bản đặc biệt)',
      author: 'Paulo Coelho',
      shop: 'Nhã Nam',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwPUmsBfjLGRW-n9hawXV_KRe5uns4e23Sr-vbTT3ZAC6v81LBUJpgdiDD84jx3WG0xBciu-qXcCD6b-wQm2wMDtH5m-mF3MRAUz90G7g51ctEiszyvqJOqF5Dhb0jF_Jd0YzsvrnKnu1vX5P-iRJH2r1kfgjVfuRmyIsTHUCVDw28VR_q6VSejoa2Mb-M_TF2Det6HuKZDVVEBnniYrJ6Sm4m93QoIfQz5pWuP05amWqXMb5JYtCICg',
      price: 89000,
      originalPrice: 129000,
      discount: '-31%',
      rating: 4.9,
      reviews: '1.4k',
      soldPercent: 85,
      soldText: 'Đã bán 85%'
    },
    {
      id: 'tam-ly-hoc-ve-tien',
      title: 'Tâm Lý Học Về Tiền',
      author: 'Morgan Housel',
      shop: 'NXB Trẻ',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7ouqQ7elIuGRHZ7rj7l5cYrPzWtVWXyk8F3s9fBkQf8lEZFMOCpZ1WNMWOVoN5Uy13M3ZCCtm0Kp6qODtQ3a5mAu81yactomECdD4kLkkrlCvqEPHOgvwES7pkRYwgFiAN7MHH3veqNbCNbdX5MfzYRgsIN5CRugb_eWd0jzg2YPAWJlzYTmoYx-QBxSmQa0tUxtsTK7oDOF1qSFqUnhLUn91MXUytXRomvOwDXqwzBlH_CfbqtBLxg',
      price: 123250,
      originalPrice: 145000,
      discount: '-15%',
      rating: 4.9,
      reviews: '980',
      soldPercent: 64,
      soldText: 'Đã bán 64%'
    },
    {
      id: 'atomic-habits',
      title: 'Thay Đổi Tí Hon Hiệu Quả Bất Ngờ',
      author: 'James Clear',
      shop: 'Alpha Books Official',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw',
      price: 141750,
      originalPrice: 189000,
      discount: '-25%',
      rating: 5.0,
      reviews: '3.1k',
      soldPercent: 92,
      soldText: 'Gần hết (92%)'
    },
    {
      id: 'dot-pha-ai',
      title: 'Đột Phá AI & Kỷ Nguyên Số',
      author: 'Max Tegmark',
      shop: 'Tri Thức Books',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsoPRm1o5oAf0LdG-UEOhv4hl5WN0P8pL54ffx0hvUIIu8xwa5CwQvQQ57VOaufr_auWd5PM3ma8-Oks_ejxXfgeKK2qNj5g8OXDAqYjPvWCyOP7uoz2pt3V0OxL-aFeL6GB2B4X_gQw5ma7EN8UY930o8Xdwt565uCw467Mqey1vTk3JLFCx3qJh8Tlu8H-9D8gbizcWBThmI3S3j7DNhDit8kTFkBVwhpzsiMt4-GdkTNfpgr3aKWQ',
      price: 154000,
      originalPrice: 220000,
      discount: '-30%',
      rating: 4.8,
      reviews: '420',
      soldPercent: 45,
      soldText: 'Đã bán 45%'
    },
    {
      id: 'dam-bi-ghet',
      title: 'Dám Bị Ghét',
      author: 'Kishimi Ichiro',
      shop: 'Nhã Nam',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkQMsE3JYx1MiacLW-pCW4R4aI2ID7OUS6jIc0zqammHEZymG_D_EbuJfIQav6ZHfMV71XcrzYulytqxP2CfVs7wfcTM73E5wSBQjS3NhZ3llvxCc_Uk0d1O-5RMuqdXqNEDK1JWbqA17kKcJOx8hyLekAuG3rqu71jN7jLJ19dWkHxNa6Nd7T2O3_VW6XqqRzqUaNgyRvwtAFuHHF7O37aK82eJQN2Tk_NqYVRdUDOPZzVix54noa2g',
      price: 108000,
      originalPrice: 135000,
      discount: '-20%',
      rating: 4.9,
      reviews: '2.1k',
      soldPercent: 78,
      soldText: 'Đã bán 78%'
    },
    {
      id: 'tu-duy-nhanh-va-cham',
      title: 'Tư Duy Nhanh Và Chậm',
      author: 'Daniel Kahneman',
      shop: 'Alpha Books Official',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs4TOGpw97Vnc6jgkJQMlOiU7qkOiSmZMU8P6YK_c_Xv4yyyh5kcdgWdNcmp_7lzHDU83XTVXrEQfQ_DPSN-Mp9dSA0MQApwu8ZLxoCWnLRzqWiFkVvWX2RVAkwZvps1dOv0-yTu-_yB4018zA1AdeR8PRZO-z44u04brEkbSH_KBxSDPYogcbHMroUxaLZGIV609Be_tEY3scjX_tvWAlaSAs_WqnVoLBT2e7gBWeTaofdU_B8QdTww',
      price: 156000,
      originalPrice: 200000,
      discount: '-22%',
      rating: 4.9,
      reviews: '1.8k',
      soldPercent: 88,
      soldText: 'Đã bán 88%'
    }
  ], []);

  // 4. BESTSELLER BOOKS (6 Compact Items with Rank 1 to 6)
  const bestsellerBooks = useMemo(() => [
    {
      id: 'nha-gia-kim',
      rank: 1,
      title: 'Nhà Giả Kim (The Alchemist)',
      author: 'Paulo Coelho',
      shop: 'Nhã Nam',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwPUmsBfjLGRW-n9hawXV_KRe5uns4e23Sr-vbTT3ZAC6v81LBUJpgdiDD84jx3WG0xBciu-qXcCD6b-wQm2wMDtH5m-mF3MRAUz90G7g51ctEiszyvqJOqF5Dhb0jF_Jd0YzsvrnKnu1vX5P-iRJH2r1kfgjVfuRmyIsTHUCVDw28VR_q6VSejoa2Mb-M_TF2Det6HuKZDVVEBnniYrJ6Sm4m93QoIfQz5pWuP05amWqXMb5JYtCICg',
      price: 64000,
      originalPrice: 80000,
      rating: 5.0,
      reviews: '9.2k',
      soldSummary: '38.2k đã bán',
      category: 'paper'
    },
    {
      id: 'atomic-habits',
      rank: 2,
      title: 'Atomic Habits – Thay Đổi Tí Hon',
      author: 'James Clear',
      shop: 'Alpha Books Official',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw',
      price: 149000,
      originalPrice: 189000,
      rating: 4.9,
      reviews: '4.8k',
      soldSummary: '15.4k đã bán',
      category: 'paper'
    },
    {
      id: 'tam-ly-hoc-ve-tien',
      rank: 3,
      title: 'Tâm Lý Học Về Tiền',
      author: 'Morgan Housel',
      shop: 'NXB Trẻ',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7ouqQ7elIuGRHZ7rj7l5cYrPzWtVWXyk8F3s9fBkQf8lEZFMOCpZ1WNMWOVoN5Uy13M3ZCCtm0Kp6qODtQ3a5mAu81yactomECdD4kLkkrlCvqEPHOgvwES7pkRYwgFiAN7MHH3veqNbCNbdX5MfzYRgsIN5CRugb_eWd0jzg2YPAWJlzYTmoYx-QBxSmQa0tUxtsTK7oDOF1qSFqUnhLUn91MXUytXRomvOwDXqwzBlH_CfbqtBLxg',
      price: 149000,
      originalPrice: 189000,
      rating: 4.9,
      reviews: '5.4k',
      soldSummary: '19.8k đã bán',
      category: 'paper'
    },
    {
      id: 'hoa-vang-co-xanh',
      rank: 4,
      title: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh',
      author: 'Nguyễn Nhật Ánh',
      shop: 'NXB Trẻ',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmk40IHL8nN8QgKmmU5Htwlb2gfZo134PTe-LmHn1e02Dy8D3eLCGlU_U27hCuP3t0jn7R4F3zjTTBBAowvf6PDX6-RbVei2RSTp33PDhYHzIFrWCpK9wHIInJJ5w0ByCX87r2K5VshsFg3ne7rf6i-N_G-_nzhcvWnfSkv7aJHW-9Bx3QzTpbw_67wwMZsthqpn3yoWWuD8LZQ9LpRP-5UTOg8eIetCyfz3Txa9jlqbr0mHuqw_4EHQ',
      price: 84000,
      originalPrice: 105000,
      rating: 4.9,
      reviews: '4.1k',
      soldSummary: '12.6k đã bán',
      category: 'paper'
    },
    {
      id: 'dam-bi-ghet',
      rank: 5,
      title: 'Dám Bị Ghét (Bản Quyền Số)',
      author: 'Kishimi Ichiro',
      shop: 'Nhã Nam',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkQMsE3JYx1MiacLW-pCW4R4aI2ID7OUS6jIc0zqammHEZymG_D_EbuJfIQav6ZHfMV71XcrzYulytqxP2CfVs7wfcTM73E5wSBQjS3NhZ3llvxCc_Uk0d1O-5RMuqdXqNEDK1JWbqA17kKcJOx8hyLekAuG3rqu71jN7jLJ19dWkHxNa6Nd7T2O3_VW6XqqRzqUaNgyRvwtAFuHHF7O37aK82eJQN2Tk_NqYVRdUDOPZzVix54noa2g',
      price: 59000,
      originalPrice: 89000,
      rating: 4.8,
      reviews: '4.1k',
      soldSummary: '17.5k đã bán',
      category: 'ebook'
    },
    {
      id: '1984-novel',
      rank: 6,
      title: '1984 – George Orwell',
      author: 'George Orwell',
      shop: 'Nhã Nam',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCA1xP3paoLAqBU3fKHmRDckUIE8iPzVZoNNBZhxhSwMiSKPx5pxgdTFt5D8C-BIv7ydsAWRxjc6vxLDWdemsBQBMs5XvueBE9BbE636D26rl2dCtf7SYQDTU6SRHgh96uAlcBIZpqzDpVLEa-kpiAPjj9u5y4vngAViz3HHDqV3Hi7Tn8RqAQYH-FMvsuROg6hRJAqb2loxUuR8Sckc93MuOsVDdg0M_2xAiqfdZhaVMwTTRzFUgYQXw',
      price: 79000,
      originalPrice: 99000,
      rating: 4.8,
      reviews: '3.2k',
      soldSummary: '9.8k đã bán',
      category: 'new'
    }
  ], []);

  // Filtered Bestsellers
  const filteredBestsellers = useMemo(() => {
    if (bestsellerTab === 'all') return bestsellerBooks;
    if (bestsellerTab === 'paper') return bestsellerBooks.filter(b => b.category === 'paper');
    if (bestsellerTab === 'ebook') return bestsellerBooks.filter(b => b.category === 'ebook');
    return bestsellerBooks;
  }, [bestsellerTab, bestsellerBooks]);

  // 5. OFFICIAL STORES / BRAND MALL (5 Stores)
  const officialStores = useMemo(() => [
    {
      id: 'store-tre',
      name: 'NXB Trẻ',
      code: 'TRẺ',
      color: 'bg-emerald-600 text-white',
      followers: '42.5k người theo dõi',
      rating: '⭐ 4.9 (12.5k)',
      verified: true
    },
    {
      id: 'store-nhanam',
      name: 'Nhã Nam',
      code: 'NN',
      color: 'bg-amber-600 text-white',
      followers: '68.2k người theo dõi',
      rating: '⭐ 5.0 (28.4k)',
      verified: true
    },
    {
      id: 'store-kimdong',
      name: 'NXB Kim Đồng',
      code: 'KĐ',
      color: 'bg-rose-600 text-white',
      followers: '51.9k người theo dõi',
      rating: '⭐ 4.9 (19.1k)',
      verified: true
    },
    {
      id: 'store-alphabooks',
      name: 'Alpha Books Official',
      code: 'αB',
      color: 'bg-blue-600 text-white',
      followers: '39.1k người theo dõi',
      rating: '⭐ 4.8 (14.2k)',
      verified: true
    },
    {
      id: 'store-firstnews',
      name: 'First News Trí Việt',
      code: 'FN',
      color: 'bg-teal-700 text-white',
      followers: '45.8k người theo dõi',
      rating: '⭐ 4.9 (16.7k)',
      verified: true
    }
  ], []);

  // 6. EBOOK SHELF (6 Items)
  const ebookShelf = useMemo(() => [
    {
      id: 'de-men-phieu-luu-ky',
      title: 'Dế Mèn Phiêu Lưu Ký',
      author: 'Tô Hoài',
      price: 0,
      priceLabel: 'Miễn phí',
      originalPrice: 35000,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0XD4epuA9uGzk8p2QUk5ZApI5HZkfb9APvuWW_YiLXwtBnUorKQHz5l_BAZrHkGnLxR7nTHWC9jfV_bvkbZ7mjIgNpANANCqOCf2Mqmk6XrSy00XCsKEO0xfC6VLqplL1CqbDC_A16JVX0R5fiCkUnrD5x3QaLUB35R719wxnEGtK0s5nx0cR3s_CW6-Eug4ivhfIzOi3B3jJnPtEN8GvbjFSpwZ1Kaljjo_bjWRVukiykK8aSp7lOg',
      rating: 4.9,
      reviews: '6.2k'
    },
    {
      id: 'tu-duy-tich-cuc',
      title: 'Tư Duy Tích Cực Tạo Thành Công',
      author: 'Norman Vincent Peale',
      price: 35000,
      priceLabel: '35.000₫',
      originalPrice: 59000,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8bxDpaWJvlZh36fF2Lcr-Qxq02W5oZUFbxAw8Q9Kl1tjO8SD_fHP1nPUnoN9KIQRJBBMtTF7ogW5RHAfrcBddvLFNyIVeearETdMbuLaaHbTs2ZK7j9KJaaNkoqllUvlSucAUT_K6y6ZS0XDVGnELJxGzPFnEbEdqMfdUlLHO_00ubBnRJo0k-9tGVooaQPzlk1gWbpc7UoQf6wYcas9Fa0R02GE5hQESIskX-RdelR6JnnmoFgLeMA',
      rating: 4.8,
      reviews: '1.2k'
    },
    {
      id: 'nha-gia-kim-ebook',
      title: 'Nhà Giả Kim (Ebook DRM)',
      author: 'Paulo Coelho',
      price: 39000,
      priceLabel: '39.000₫',
      originalPrice: 65000,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwPUmsBfjLGRW-n9hawXV_KRe5uns4e23Sr-vbTT3ZAC6v81LBUJpgdiDD84jx3WG0xBciu-qXcCD6b-wQm2wMDtH5m-mF3MRAUz90G7g51ctEiszyvqJOqF5Dhb0jF_Jd0YzsvrnKnu1vX5P-iRJH2r1kfgjVfuRmyIsTHUCVDw28VR_q6VSejoa2Mb-M_TF2Det6HuKZDVVEBnniYrJ6Sm4m93QoIfQz5pWuP05amWqXMb5JYtCICg',
      rating: 5.0,
      reviews: '8.4k'
    },
    {
      id: 'sapiens-ebook',
      title: 'Sapiens: Lược Sử Loài Người',
      author: 'Yuval Noah Harari',
      price: 75000,
      priceLabel: '75.000₫',
      originalPrice: 120000,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2H3l5c7_JP2T-qUtp7DCY42wLc1tMDdyQtRiGNH8LsvYEqbyEo-qNhVf3Y-KZ7Q487upiQuJrXSnZxfwkuBjlnOUhC1ckdcF1tq3pOW3BN48BgA7QIETZbXRTXLru6om1zQx1itIhe8B9R80sk9RnkV5_68mjjA7MX-1fEj0FAiAaHcySuAI3OFkRnGBT7ggCfz9PSVO64-R_x7QgsvkfhnbJvxNjkHVXfNnXcJ0fyKqOB3TYw8ZYHQ',
      rating: 4.95,
      reviews: '4.3k'
    },
    {
      id: 'hieu-ve-trai-tim-ebook',
      title: 'Hiểu Về Trái Tim',
      author: 'Thích Minh Niệm',
      price: 49000,
      priceLabel: '49.000₫',
      originalPrice: 80000,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIVd9e_xnuEa_DW6YY3L3loH6GzqT5fbdDVDUXUGPYTiwNwtsNRPsq0IDnExW68G2riBcucukM_GYSYHVIumaHSrkG6PaiousV-H7pu3UnxOPIuJWrGBo7V9SPhF9SSq4DcP2sCNM2f5IquMZ9GAjqxLJg1dxRIjLO863oh6Z8IkjciAsYS6H2z39GOVXtRqI6lEmbMpcauoOMktSp2zLuGCZFwKvcUV_nka0vi9jIw5VpguiyBRdUVg',
      rating: 5.0,
      reviews: '5.1k'
    },
    {
      id: 'con-duong-phia-truoc',
      title: 'Con Đường Phía Trước',
      author: 'Bill Gates',
      price: 89000,
      priceLabel: '89.000₫',
      originalPrice: 159000,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLIUp69uyAUlwfsWjfZSKPiRBAFeEMdzK13KM5bD95N171lBk9uJ0eRwLz3A9YJ9uNEHXt0-Lb361ukl0j6fG1p1wzluyOD8mVZsaexm0l3hxOnUU3WSje_nt4TdMKmzkS8pqYHKR5A4Ta-DT0l4OJc7MJR2ir0kU9tQ22k1pOb9_JjtVe2sBlZCGV5PDAwY_qmlCjTlnWBcN5eq2FJ2a0yXSeuQzpBTkxj1pcep69oBL7K49JzRDGkw',
      rating: 5.0,
      reviews: '3.8k'
    }
  ], []);

  // 7. AUTHORS LIST (8 Items)
  const authorsList = useMemo(() => [
    { name: 'Haruki Murakami', books: '18 đầu sách', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCR-OPOd7e4KsfO0t-0xMw2DyZP6jFtwwwqK09pUgJkDjYa5toolI1E43E6nK-pjKQ6oIWrou0_f2agMmZEgZ5RS2CAqewxN9TTMHgCwG3kskJbOd9X7kp7O9OAoalbSgCbAKmG8cO9bWGgyhXmV7IYpaXvZo22hV3-AQrsi84-ZhwNMBtpp6uHr5U4YKB0kas_ERbqkslBd2P7hY2oeGjp4StJDzkov6Y8h3uarnyuNI2MzhOB6sP7Vw' },
    { name: 'James Clear', books: '4 ấn phẩm', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnw9yJWOrKGesjDyl1-X_0R2W4HNILmzCsBYgbF0XKynDiK7fNvri-xM3jY3V_3z15MmE0g3IJX0qsypYqufMmBW5544ziG8nhUbsSR9WJhuCOKCBJisehB_5esWgbY7RkVY2LHadzTRsRvBp8TVGnTCHFoDrWjwhXvNwjNCCisa-LJUAhhMYg7n_eLSRD2IdW0XHKQl2V1i3tKp6YJXGPZUt1ZTo4IpAKkERRMoCTmqrThvqL1YOmFA' },
    { name: 'Morgan Housel', books: '3 tác phẩm', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtrE0r2gXqHTig1zo3glXgfCTbKIG1iJv0jftMG7jgJJAy4XBzXb_a0OQpbRa8X1mTIRnjs54Zb5EsOBo9IE1RxUfVgYt5ysUjQ46kpM6ikrx4t_t56RpqAQbYuqKfhaO1h18LuSzCUNduXsNOWS2wX0xolsVziTAj70AnD6YrUKPB5Oyg0jtxgqFbF0yN0X6x3vCXuSCMXzIhQxcEBAP86uH8f2lmCgbn6JCxhlEqNeYzY_-Zpiv-tQ' },
    { name: 'Yuval Noah Harari', books: '5 bộ lược sử', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTraLVsMiNUVda0rejvWN-zCy-uTUY55qgl17upiljc0TV6u1kOJnsntndANnLcPEmEgEEdIwvKaT_yEjZTbUveJXG5yZUXE77KuhWBL4eSEm_dlUCQuFaEisFn6uqlFfcY-RTB2cMXk3FuQCIdIfRpqkHpiSqE3hsDJW1RFT1dQTBClR3wqcCD6Y-Jt6X1SsOlJCvS-pcnFeB47QmLs4X8uc9_tU14Sv2hqeEB1ry4JzHN-_w8ji9Fw' },
    { name: 'Nguyễn Nhật Ánh', books: '32 truyện dài', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmk40IHL8nN8QgKmmU5Htwlb2gfZo134PTe-LmHn1e02Dy8D3eLCGlU_U27hCuP3t0jn7R4F3zjTTBBAowvf6PDX6-RbVei2RSTp33PDhYHzIFrWCpK9wHIInJJ5w0ByCX87r2K5VshsFg3ne7rf6i-N_G-_nzhcvWnfSkv7aJHW-9Bx3QzTpbw_67wwMZsthqpn3yoWWuD8LZQ9LpRP-5UTOg8eIetCyfz3Txa9jlqbr0mHuqw_4EHQ' },
    { name: 'Thích Nhất Hạnh', books: '14 tác phẩm', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIVd9e_xnuEa_DW6YY3L3loH6GzqT5fbdDVDUXUGPYTiwNwtsNRPsq0IDnExW68G2riBcucukM_GYSYHVIumaHSrkG6PaiousV-H7pu3UnxOPIuJWrGBo7V9SPhF9SSq4DcP2sCNM2f5IquMZ9GAjqxLJg1dxRIjLO863oh6Z8IkjciAsYS6H2z39GOVXtRqI6lEmbMpcauoOMktSp2zLuGCZFwKvcUV_nka0vi9jIw5VpguiyBRdUVg' },
    { name: 'Paulo Coelho', books: '12 tiểu thuyết', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMW6Ygf2v_PkH6UwpH5HtMgEnkSTukKcuSzk6OzxWbjqi9bNLJ2ZjcfiPOGzNfHcKUejI4SxFFG6lzkeh3lJ1aS3stQ-DWKwTU2gV-yjdQMLxPbv38z6vcuSwfnN2yiEMO-gw4Qa-YZ08mg9eyTX-c2yDUKxxOy28O7qT1IxG0PejgAezdSexDFr8CUezUXNwFLQsoa7_MgwFGEZxIAqpW5D6NdkvEK8TTFFJ3-TAzk0A5wXCkAEeIcQ' },
    { name: 'Dale Carnegie', books: '6 sách kỹ năng', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBx7ue4Vh4KbHNkR6CR4zWzXheCx8uX-DGqYTaZ4-t33F92llGELpWK2JUtMf5wSq_hmxevwPpZIxOXyDbD7Bt7bbNejs5qLAqmzospFYfzm4dfbHKemwHCNwHH9GhQMLni_xDfeDc6xRh6K1DUbD56GLWO0TvI1vNX95rOuVyWDvDm81F0-4T050BlAhGnFOZY0Vg8TgyYuVN0WdG5neqfm04jO6ixnU40e54y0YbM_c6QZELd1zmkoA' }
  ], []);

  // Responsive itemsPerPage calculation for authors slider
  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth < 640) setItemsPerPage(2);
      else if (window.innerWidth < 1024) setItemsPerPage(3);
      else setItemsPerPage(5);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const maxAuthorIndex = Math.max(0, authorsList.length - itemsPerPage);

  const handleNextAuthor = () => {
    setAuthorIndex(prev => (prev >= maxAuthorIndex ? 0 : prev + 1));
  };

  const handlePrevAuthor = () => {
    setAuthorIndex(prev => (prev <= 0 ? maxAuthorIndex : prev - 1));
  };

  useEffect(() => {
    if (isAuthorHovered) return;
    const timer = setInterval(() => {
      setAuthorIndex(prev => (prev >= maxAuthorIndex ? 0 : prev + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [isAuthorHovered, maxAuthorIndex]);

  // Handle Quick Add To Cart
  const handleQuickAdd = (book, e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: `${book.id}-paper`,
      bookId: book.id,
      title: book.title,
      author: book.author,
      publisher: book.shop || 'HUKI Partner',
      storeId: 'store-default',
      format: 'Sách giấy',
      formatTag: 'Bìa mềm cao cấp',
      price: book.price,
      originalPrice: book.originalPrice || book.price * 1.2,
      quantity: 1,
      checked: true,
      cover: book.cover,
      type: 'physical'
    });
    showToast(`Đã thêm "${book.title}" vào giỏ hàng!`, 'success');
  };

  // Handle Save Voucher
  const handleSaveVoucher = (code) => {
    if (savedVouchers.includes(code)) {
      showToast(`Mã ${code} đã có trong ví voucher của bạn.`, 'info');
    } else {
      setSavedVouchers(prev => [...prev, code]);
      showToast(`Đã lưu mã ${code} thành công! Áp dụng ngay khi thanh toán.`, 'success');
    }
  };

  // Toggle Shop Follow
  const handleToggleShopFollow = (shopName) => {
    if (followedShops.includes(shopName)) {
      setFollowedShops(prev => prev.filter(s => s !== shopName));
      showToast(`Đã bỏ theo dõi ${shopName}`, 'info');
    } else {
      setFollowedShops(prev => [...prev, shopName]);
      showToast(`Đang theo dõi ${shopName}. Bạn sẽ nhận thông báo sách mới sớm nhất!`, 'success');
    }
  };

  // Toggle Author Follow
  const handleToggleAuthorFollow = (authorName) => {
    if (followedAuthors.includes(authorName)) {
      setFollowedAuthors(prev => prev.filter(a => a !== authorName));
      showToast(`Đã bỏ theo dõi tác giả ${authorName}`, 'info');
    } else {
      setFollowedAuthors(prev => [...prev, authorName]);
      showToast(`Đang theo dõi tác giả ${authorName}`, 'success');
    }
  };

  // Handle Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/books?q=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-[1520px] mx-auto px-3 sm:px-5 lg:px-8 py-5 flex flex-col gap-8 sm:gap-10">

      {/* =========================================================================
          SECTION 1: BENTO GRID HERO (1 LỚN 65% + 2 NHỎ 35%) & TRUST BADGES
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          
          {/* Main Large Hero Banner (65% width) */}
          <div 
            style={{ background: 'linear-gradient(135deg, var(--theme-hero-from, #00382B) 0%, var(--theme-hero-via, #004D38) 60%, var(--theme-hero-to, #00271E) 100%)' }}
            className="lg:col-span-8 rounded-2xl p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden flex flex-col justify-between shadow-md border border-white/10"
          >
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -left-10 bottom-0 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-emerald-200 text-[12px] font-semibold mb-3">
                <span className="material-symbols-outlined text-[15px] text-amber-300">auto_awesome</span>
                <span>Hội Sách Tri Thức Mùa Xuất Bản 2026</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight max-w-xl">
                Mỗi cuốn sách một thế giới mới
              </h1>
              <p className="text-[13.5px] sm:text-[14.5px] text-white/85 max-w-lg mt-2 leading-relaxed">
                Khám phá hơn 50.000 đầu sách giấy &amp; Ebook bản quyền từ các Nhà xuất bản uy tín hàng đầu. Đọc tức thì trên mọi thiết bị.
              </p>

              {/* Compact Search Bar inside Hero */}
              <form onSubmit={handleSearchSubmit} className="mt-5 max-w-xl bg-surface-container-lowest rounded-xl p-1.5 shadow-lg flex items-center gap-2 border border-white/20">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px] ml-2.5">search</span>
                <input 
                  type="text" 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm tên sách, tác giả, nhà xuất bản, ISBN..." 
                  className="w-full bg-transparent border-none text-on-surface text-[13.5px] focus:outline-none placeholder:text-on-surface-variant/60"
                />
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container text-[13px] font-bold hover:brightness-105 transition-all shrink-0 flex items-center gap-1"
                >
                  <span>Tìm kiếm</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </form>
            </div>

            {/* Quick Suggestions Strip */}
            <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/90">
              <span className="text-emerald-300 font-semibold">Gợi ý hot:</span>
              <Link to="/books?q=Tâm lý học" className="hover:text-emerald-200 underline decoration-white/30">Tâm lý học</Link>
              <span className="opacity-40">•</span>
              <Link to="/books?q=Atomic Habits" className="hover:text-emerald-200 underline decoration-white/30">Atomic Habits</Link>
              <span className="opacity-40">•</span>
              <Link to="/books?q=Kinh doanh" className="hover:text-emerald-200 underline decoration-white/30">Kinh doanh</Link>
              <span className="opacity-40">•</span>
              <Link to="/books?q=Trí tuệ nhân tạo" className="hover:text-emerald-200 underline decoration-white/30">AI 2026</Link>
            </div>
          </div>

          {/* 2 Sub Banners Stacked (35% width) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            {/* Sub Banner 1 */}
            <div className="flex-1 rounded-2xl p-5 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white relative overflow-hidden flex flex-col justify-between shadow-sm border border-amber-500/20 group cursor-pointer">
              <div className="relative z-10">
                <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                  TOP 1 EBOOK PHÁT HÀNH
                </span>
                <h3 className="text-[17px] font-bold mt-2 leading-snug group-hover:text-amber-200 transition-colors">
                  Con Đường Phía Trước – Bill Gates
                </h3>
                <p className="text-[12px] text-white/80 mt-1 line-clamp-2">
                  Bản quyền số độc quyền tại HUKI. Đọc thử 20 trang đầu miễn phí.
                </p>
              </div>
              <Link 
                to="/book/con-duong-phia-truoc" 
                className="relative z-10 mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-amber-200 group-hover:translate-x-1 transition-transform"
              >
                <span>Đọc thử ngay</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {/* Sub Banner 2 */}
            <div className="flex-1 rounded-2xl p-5 bg-gradient-to-br from-teal-800 via-emerald-900 to-slate-950 text-white relative overflow-hidden flex flex-col justify-between shadow-sm border border-teal-500/20 group cursor-pointer">
              <div className="relative z-10">
                <span className="bg-emerald-400 text-emerald-950 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                  ĐẠI TIỆC COMBO HYBRID
                </span>
                <h3 className="text-[17px] font-bold mt-2 leading-snug group-hover:text-emerald-300 transition-colors">
                  Mua Sách Giấy Tặng Ebook Đọc Ngay
                </h3>
                <p className="text-[12px] text-white/80 mt-1 line-clamp-2">
                  Tiết kiệm đến 35% khi mua trọn bộ combo sách tư duy &amp; tài chính.
                </p>
              </div>
              <Link 
                to="/books?format=hybrid" 
                className="relative z-10 mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-emerald-300 group-hover:translate-x-1 transition-transform"
              >
                <span>Xem bộ sưu tập</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Compact Trust Badges Strip (44px height) */}
        <div className="w-full bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/30 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px] font-medium text-on-surface shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified_user</span>
            <span>100% Sách Thật &amp; Bản Quyền</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">local_shipping</span>
            <span>Freeship Toàn Quốc Từ 150k</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">devices</span>
            <span>Đọc Ebook Tức Thì DRM v3.4</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">replay</span>
            <span>Đổi Trả Dễ Dàng Trong 7 Ngày</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: DẢI GOM MÃ GIẢM GIÁ 1-CHẠM (1-CLICK VOUCHER STRIP)
      ========================================================================= */}
      <section className="bg-surface-container-low/70 rounded-2xl p-3.5 sm:p-4 border border-outline-variant/30">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">confirmation_number</span>
            <h2 className="text-[14px] sm:text-[15px] font-bold text-on-surface">Mã Giảm Giá &amp; Ưu Đãi Hôm Nay</h2>
            <span className="text-[11px] text-on-surface-variant hidden sm:inline">• Thu thập mã trước khi mua sắm</span>
          </div>
          <span className="text-[12px] text-tertiary font-semibold">Tự động áp dụng khi thanh toán</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {voucherList.map((v) => {
            const isSaved = savedVouchers.includes(v.code);
            return (
              <div 
                key={v.code}
                className="bg-surface-container-lowest rounded-xl p-2.5 border border-dashed border-outline-variant/60 flex items-center justify-between gap-2 shadow-2xs hover:border-tertiary/60 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{v.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-bold text-primary">{v.badge}</span>
                      <span className="text-[10px] text-on-surface-variant font-mono bg-surface-container px-1 py-0.2 rounded">{v.code}</span>
                    </div>
                    <p className="text-[11px] text-on-surface font-medium truncate mt-0.5">{v.title}</p>
                    <span className="text-[9.5px] text-on-surface-variant/80 block">{v.condition}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleSaveVoucher(v.code)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    isSaved 
                      ? 'bg-surface-container text-on-surface-variant' 
                      : 'bg-primary text-on-primary hover:brightness-105 shadow-2xs'
                  }`}
                >
                  {isSaved ? 'Đã lưu' : 'Lưu mã'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: DANH MỤC NỔI BẬT (8 COMPACT ICON CARDS)
      ========================================================================= */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] sm:text-[16px] font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[20px]">category</span>
            <span>Danh Mục Sách Nổi Bật</span>
          </h2>
          <Link to="/books" className="text-[12.5px] text-tertiary hover:underline font-semibold flex items-center gap-0.5">
            <span>Xem tất cả danh mục</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
          {categoryGrid.map((cat, idx) => (
            <Link 
              key={idx} 
              to={cat.link}
              className="bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/30 flex flex-col items-center text-center hover:border-tertiary/50 hover:shadow-sm transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform`}>
                <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
              </div>
              <span className="text-[12px] font-semibold text-on-surface line-clamp-1 leading-tight group-hover:text-tertiary transition-colors">{cat.name}</span>
              <span className="text-[10px] text-on-surface-variant mt-0.5">{cat.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: FLASH SALE HÔM NAY (6 COMPACT CARDS - 1 HÀNG CHUẨN TMĐT)
      ========================================================================= */}
      <section className="bg-surface-container-low/60 rounded-2xl p-4 sm:p-5 border border-outline-variant/40 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-primary-fixed text-primary px-3 py-1 rounded-full text-[12.5px] font-bold">
              <span className="material-symbols-outlined text-[17px] fill-icon">local_fire_department</span>
              <span>FLASH SALE HÔM NAY</span>
            </div>

            <div className="flex items-center gap-1.5 text-[12px] text-on-surface font-medium">
              <span className="text-on-surface-variant">Kết thúc sau:</span>
              <span className="bg-inverse-surface text-inverse-on-surface px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">08</span>:
              <span className="bg-inverse-surface text-inverse-on-surface px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">24</span>:
              <span className="bg-inverse-surface text-inverse-on-surface px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">17</span>
            </div>
          </div>

          <Link to="/books?filter=flash-sale" className="text-[12.5px] text-primary hover:underline font-semibold flex items-center gap-0.5">
            <span>Xem toàn bộ Flash Sale</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        {/* 6 COMPACT CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {flashSaleBooks.map((book) => (
            <div 
              key={book.id}
              className="bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/30 flex flex-col justify-between relative group hover:border-tertiary/50 hover:shadow-md transition-all cursor-pointer"
            >
              {/* Discount Tag */}
              <span className="absolute top-2 left-2 z-20 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                {book.discount}
              </span>

              {/* Cover Image (Aspect 2/3 compact ~175px) */}
              <Link to={`/book/${book.id}`} className="block">
                <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-2 bg-surface-container spine-crease relative">
                  <img 
                    src={book.cover} 
                    alt={book.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              </Link>

              {/* Book Info */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1 text-[10.5px] text-secondary font-semibold mb-0.5">
                  <span className="material-symbols-outlined text-[12px] text-secondary fill-icon">star</span>
                  <span>{book.rating}</span>
                  <span className="text-on-surface-variant font-normal">({book.reviews})</span>
                </div>

                <Link 
                  to={`/book/${book.id}`} 
                  title={book.title}
                  className="text-[12.5px] font-semibold text-on-surface line-clamp-2 leading-tight hover:text-tertiary transition-colors h-[32px]"
                >
                  {book.title}
                </Link>

                <span className="text-[11px] text-on-surface-variant truncate mt-0.5">{book.author}</span>
                <span className="text-[10px] text-tertiary/90 truncate font-medium">{book.shop}</span>

                {/* Price & Quick Add Button */}
                <div className="mt-2 pt-1.5 border-t border-outline-variant/20 flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-bold text-tertiary">{book.price.toLocaleString('vi-VN')}₫</div>
                    <div className="text-[10.5px] text-on-surface-variant/60 line-through">{book.originalPrice.toLocaleString('vi-VN')}₫</div>
                  </div>

                  <button 
                    onClick={(e) => handleQuickAdd(book, e)}
                    className="w-7 h-7 rounded-lg bg-tertiary/10 hover:bg-tertiary hover:text-on-tertiary text-tertiary flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    title="Thêm vào giỏ hàng"
                    aria-label="Thêm vào giỏ hàng"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                  </button>
                </div>

                {/* Slim Progress Bar */}
                <div className="mt-1.5">
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-primary h-full rounded-full"
                      style={{ width: `${book.soldPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[9.5px] text-on-surface-variant font-medium mt-0.5 block">{book.soldText}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: BẢNG XẾP HẠNG BESTSELLER (TOP #1 ĐẾN #6 CÓ HUY HIỆU RANK)
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[22px] fill-icon">emoji_events</span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-on-surface">Bảng Xếp Hạng Sách Bán Chạy</h2>
              <p className="text-[11px] text-on-surface-variant">Những tác phẩm được độc giả HUKI chọn mua nhiều nhất trong tuần</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'paper', label: 'Sách giấy' },
              { id: 'ebook', label: 'Ebook thịnh hành' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setBestsellerTab(tab.id)}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  bestsellerTab === tab.id
                    ? 'bg-tertiary text-on-tertiary shadow-2xs'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6 BESTSELLER CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {filteredBestsellers.map((book) => {
            // Rank Badge Color
            let rankBg = 'bg-slate-700 text-white';
            if (book.rank === 1) rankBg = 'bg-amber-400 text-amber-950 font-black';
            else if (book.rank === 2) rankBg = 'bg-slate-300 text-slate-900 font-bold';
            else if (book.rank === 3) rankBg = 'bg-amber-600 text-white font-bold';

            return (
              <div 
                key={book.id}
                className="bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/30 flex flex-col justify-between relative group hover:border-tertiary/50 hover:shadow-md transition-all cursor-pointer"
              >
                {/* Number Rank Badge */}
                <div className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-md ${rankBg} text-[11px] flex items-center justify-center shadow-xs`}>
                  #{book.rank}
                </div>

                {/* Cover Image */}
                <Link to={`/book/${book.id}`} className="block">
                  <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-2 bg-surface-container spine-crease relative">
                    <img 
                      src={book.cover} 
                      alt={book.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                </Link>

                {/* Book Info */}
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-1 text-[10.5px] text-secondary font-semibold mb-0.5">
                    <span className="material-symbols-outlined text-[12px] text-secondary fill-icon">star</span>
                    <span>{book.rating}</span>
                    <span className="text-on-surface-variant font-normal">({book.reviews})</span>
                  </div>

                  <Link 
                    to={`/book/${book.id}`} 
                    title={book.title}
                    className="text-[12.5px] font-semibold text-on-surface line-clamp-2 leading-tight hover:text-tertiary transition-colors h-[32px]"
                  >
                    {book.title}
                  </Link>

                  <span className="text-[11px] text-on-surface-variant truncate mt-0.5">{book.author}</span>
                  <span className="text-[10px] text-tertiary/90 truncate font-medium">{book.shop}</span>

                  <div className="mt-2 pt-1.5 border-t border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div className="text-[13.5px] font-bold text-tertiary">{book.price.toLocaleString('vi-VN')}₫</div>
                      <span className="text-[9.5px] text-on-surface-variant/80 font-medium block">{book.soldSummary}</span>
                    </div>

                    <button 
                      onClick={(e) => handleQuickAdd(book, e)}
                      className="w-7 h-7 rounded-lg bg-tertiary/10 hover:bg-tertiary hover:text-on-tertiary text-tertiary flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                      title="Thêm vào giỏ hàng"
                      aria-label="Thêm vào giỏ hàng"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: GIAN HÀNG NXB & ĐỐI TÁC BẢN QUYỀN (OFFICIAL BRAND MALL)
      ========================================================================= */}
      <section className="bg-surface-container-low/50 rounded-2xl p-4 sm:p-5 border border-outline-variant/30 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[22px]">storefront</span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-on-surface">Gian Hàng NXB &amp; Đối Tác Chính Hãng</h2>
              <p className="text-[11px] text-on-surface-variant">100% sách thật bản quyền, phân phối trực tiếp từ nhà xuất bản</p>
            </div>
          </div>

          <Link to="/books?filter=official-stores" className="text-[12.5px] text-tertiary hover:underline font-semibold flex items-center gap-0.5">
            <span>Xem tất cả cửa hàng</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {officialStores.map((store) => {
            const isFollowed = followedShops.includes(store.name);
            return (
              <div 
                key={store.id}
                className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/30 flex flex-col justify-between hover:border-tertiary/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl ${store.color} flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0`}>
                    {store.code}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="text-[12.5px] font-bold text-on-surface truncate">{store.name}</h4>
                      <span className="material-symbols-outlined text-[14px] text-tertiary fill-icon shrink-0">verified</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant block">{store.followers}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleToggleShopFollow(store.name)}
                  className={`mt-3 w-full py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isFollowed 
                      ? 'bg-tertiary text-on-tertiary' 
                      : 'bg-surface-container text-tertiary hover:bg-tertiary hover:text-on-tertiary'
                  }`}
                >
                  {isFollowed ? '✓ Đang theo dõi' : '+ Theo dõi'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: KỆ EBOOK & ĐỌC ONLINE BẢN QUYỀN (NÚT "ĐỌC NGAY")
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 text-[22px]">devices</span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-on-surface">Ebook &amp; Đọc Online Bản Quyền</h2>
              <p className="text-[11px] text-on-surface-variant">Đọc tức thì trong 10 giây trên trình đọc WebReader độc quyền</p>
            </div>
          </div>

          <Link to="/books?format=ebook" className="text-[12.5px] text-tertiary hover:underline font-semibold flex items-center gap-0.5">
            <span>Xem 4.200+ Ebook</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        {/* 6 EBOOK COMPACT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {ebookShelf.map((ebook) => (
            <div 
              key={ebook.id}
              className="bg-surface-container-lowest rounded-xl p-2.5 border border-outline-variant/30 flex flex-col justify-between group hover:border-tertiary/50 hover:shadow-md transition-all"
            >
              <div>
                <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-2 bg-surface-container spine-crease relative">
                  <img 
                    src={ebook.cover} 
                    alt={ebook.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1.5 left-1.5 bg-inverse-surface/85 backdrop-blur-sm text-inverse-on-surface text-[9px] font-semibold px-1.5 py-0.5 rounded">
                    Ebook DRM
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10.5px] text-secondary font-semibold mb-0.5">
                  <span className="material-symbols-outlined text-[12px] text-secondary fill-icon">star</span>
                  <span>{ebook.rating}</span>
                  <span className="text-on-surface-variant font-normal">({ebook.reviews})</span>
                </div>

                <Link 
                  to={`/book/${ebook.id}`} 
                  title={ebook.title}
                  className="text-[12.5px] font-semibold text-on-surface line-clamp-2 leading-tight hover:text-tertiary transition-colors h-[32px]"
                >
                  {ebook.title}
                </Link>
                <span className="text-[11px] text-on-surface-variant truncate mt-0.5 block">{ebook.author}</span>
              </div>

              <div className="mt-2 pt-1.5 border-t border-outline-variant/20 flex items-center justify-between gap-1">
                <div>
                  <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">{ebook.priceLabel}</span>
                  {ebook.price > 0 && (
                    <span className="text-[10px] text-on-surface-variant/60 line-through block">{ebook.originalPrice.toLocaleString('vi-VN')}₫</span>
                  )}
                </div>

                <Link 
                  to={`/book/${ebook.id}/preview`}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                >
                  <span>Đọc ngay</span>
                  <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: BỘ SƯU TẬP CHUYÊN ĐỀ ĐẶC BIỆT (EDITORIAL BANNER)
      ========================================================================= */}
      <section 
        style={{ background: 'linear-gradient(135deg, var(--theme-hero-from, #00382B) 0%, var(--theme-hero-via, #004D38) 70%, var(--theme-hero-to, #00271E) 100%)' }}
        className="rounded-2xl text-white p-6 sm:p-8 lg:p-10 border border-white/15 relative overflow-hidden shadow-md"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 flex flex-col gap-3">
            <span className="bg-secondary-container text-on-secondary-container text-[10.5px] font-bold px-2.5 py-0.5 rounded-full w-fit tracking-wider uppercase">
              BỘ SƯU TẬP CHUYÊN ĐỀ ĐẶC BIỆT
            </span>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug text-white">
              ĐỌC ĐỂ HIỂU MÌNH – Tuyển tập Tâm lý học &amp; Chữa lành
            </h3>
            <blockquote className="text-[13px] italic text-emerald-200 border-l-2 border-secondary-container pl-3 my-0.5 leading-relaxed">
              "Khi bạn bắt đầu nhìn sâu vào bên trong chính mình, cả thế giới hỗn độn bên ngoài bỗng trở nên sáng tỏ và bình yên lạ thường."
            </blockquote>
            <p className="text-[12.5px] sm:text-[13.5px] text-white/90 max-w-xl leading-relaxed">
              Tuyển tập 24 tác phẩm kinh điển từ Carl Jung, Thích Nhất Hạnh, Erich Fromm và Viktor Frankl. Giảm ngay 30% khi mua trọn bộ ebook hoặc combo sách giấy.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Link 
                to="/books?theme=psychology-healing"
                className="px-5 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container text-[13px] font-bold hover:brightness-105 transition-all shadow-xs"
              >
                Khám phá bộ sưu tập ngay
              </Link>
              <Link 
                to="/books?format=ebook"
                className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold border border-white/30 transition-all backdrop-blur-sm"
              >
                Đọc thử Ebook miễn phí
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center items-center">
            <div className="relative w-[220px] h-[220px] flex items-center justify-center">
              <div className="w-[120px] h-[175px] rounded-lg overflow-hidden shadow-xl absolute -left-2 transform -rotate-6 border border-white/30 spine-crease">
                <img className="w-full h-full object-cover" alt="Đi Tìm Lẽ Sống" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyE5tatnZnRNymMx9UkRCMQIqouBY67LmdSzlX6bQTU8_aLCJPXiU_ODA9joZcXzn8S1G5CAHikFsmSWSBwHt8kY2kFLI-OcyTFJLooyNM2enwQftmbxCMMMQC6zqLFSBfN1lZeFz3h_ZzXeMxe2FAhZihkyNsJ12FFZrOV2tyEpxleNeYbLoUUC1_npNZ3mmtOSLE7ig7kGsXnQcotggOFdqADloUpvh2b5UoEfh_zmp5QtnWKEFgkQ" />
              </div>
              <div className="w-[130px] h-[190px] rounded-lg overflow-hidden shadow-2xl relative z-10 border-2 border-white/40 spine-crease">
                <img className="w-full h-full object-cover" alt="Nghệ Thuật Yêu" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5OKAyXa7Fcvl7yTUoWXOPzwNoPWu-QEK7s1eHA2FdwMOMaCgN8ohkwWLec1nTxQSDEu-J0NrgeD6me73NX8Pi3acfgGIpIFJ33kXnnmPXoUQBykWZqgSI233v4ur5aHgbP7Z5UwgKD4uaQATmq-5jfLrwySxWrJ4doiamhldPjUN26xd_pMzw6YVDOFM72tNXKigOZnJZtfWKBY_WdBhPrgv24HZZMi-Sv2S6j-riyoqNDVcHBVwmyw" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: SÁCH THEO THỂ LOẠI & TOPIC TAG CHIPS (KINH DOANH & AI)
      ========================================================================= */}
      <section className="flex flex-col gap-4">
        {/* Topic Tag Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            'Tất cả', 'Phát triển bản thân', 'Kinh doanh & Khởi nghiệp', 'Tâm lý học', 
            'Công nghệ & AI', 'Văn học & Tiểu thuyết', 'Kỹ năng sống', 'Triết học', 'Lịch sử'
          ].map((tag, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTopicTag(tag)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTopicTag === tag
                  ? 'bg-tertiary text-on-tertiary shadow-2xs'
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:border-tertiary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 2 Showcases: Kinh Doanh & AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Showcase 1: Kinh Doanh */}
          <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">trending_up</span>
                <h3 className="text-[14px] font-bold text-on-surface">Kinh Doanh &amp; Khởi Nghiệp</h3>
              </div>
              <Link to="/books?category=kinh-te" className="text-[11.5px] text-tertiary hover:underline font-semibold">Xem 1.250+ sách →</Link>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { title: 'Từ Tốt Đến Vĩ Đại', author: 'Jim Collins', price: 148000, cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUnUpUsTPVTT2aXL1sifuheoTa-M2lRoP-gxSZUz8DinaHvgh4rrwHhYC9nS98SkyYQAxoz0IK2JE_R1tRMan0RnFbZm0xxt23qPvmAwc6om5HUeUsbISapxnWhQ4455r4h_9zdvJRtQ-oH6Sys-LjyMGclScmFLMOiluJl7liJ7wq9QAZd6vTYGok_UUjVdsaS8-I3AU4_0I_rH-RBQd-pHji-FeTOJPT7xROWqzhy0-iggWoICykvw' },
                { title: 'Khởi Nghiệp Tinh Gọn', author: 'Eric Ries', price: 136000, cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBX4Kd4G8iNHQlfF7K5cYKsiyOVqxeKAjWTmdYZNmsl2XwtRt5LbwHOa10Cm2k8Ks83vdrK1LYqrzl4TjNG_UjLLJO8YAXTf-o9kinqaBLbxQi36ETbetNY83YBHoDUTu9AqyLAqJwSwk0EFtmqxqq7Za5zYlruIt0WnBekbSGVkLTkAurg4ZslQRdxslzp8ZUhvp4o1DslKhg72GeRNQbQt72uWrVThFoqGnqRu-ApFxw6BirgD4sZ_Q' },
                { title: 'Principles: Nguyên Tắc', author: 'Ray Dalio', price: 225000, cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANH9QImz-ucfcn9uv_MlbqtxToG_dytIK3a8VA3WhDMJxtc7C7nGB3P4THS39VcuT2OdgWu_eGDaTUI8j1aBQd9YjObATDkleR2X6wUk023tz5x5l0XYGbT8s-eLIGufFcL4aRX3zc_qLlav8X4ZhfgFjrtLdWa3cdUfuPPmARFsOJnMDclYDZhaEFkNzE9zo16on8sZQNc-K3QwPJDkP5As62z9yINTaSyFZzuO50mMkGPL_R5Vz0Pw' }
              ].map((book, idx) => (
                <div key={idx} className="bg-surface-container-lowest rounded-xl p-2 border border-outline-variant/30 flex flex-col justify-between hover:border-tertiary/40 transition-all">
                  <div className="aspect-[2/3] w-full rounded-md overflow-hidden mb-1.5 bg-surface-container spine-crease">
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <h5 className="text-[11.5px] font-semibold text-on-surface line-clamp-1 truncate" title={book.title}>{book.title}</h5>
                  <p className="text-[10px] text-on-surface-variant truncate">{book.author}</p>
                  <div className="mt-1 pt-1 border-t border-outline-variant/20 flex items-center justify-between">
                    <span className="text-[12px] font-bold text-tertiary">{book.price.toLocaleString('vi-VN')}₫</span>
                    <button 
                      onClick={(e) => handleQuickAdd(book, e)}
                      className="w-6 h-6 rounded bg-surface-container hover:bg-tertiary hover:text-white text-tertiary flex items-center justify-center transition-colors text-[14px]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Showcase 2: Công Nghệ AI */}
          <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[20px]">smart_toy</span>
                <h3 className="text-[14px] font-bold text-on-surface">Công Nghệ &amp; Trí Tuệ Nhân Tạo AI</h3>
              </div>
              <Link to="/books?category=cong-nghe" className="text-[11.5px] text-tertiary hover:underline font-semibold">Xem 680+ sách →</Link>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { title: 'AI 2041: 10 Viễn Cảnh', author: 'Kai-Fu Lee', price: 172000, cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjTLa-EsuM3rAWCh7QLNIibiUWD653rBXryru_Jm_EF0wZW4y-iu_MEhVPSofjLC51Q-mcpY6LK9ZFs5uMtEB0CFUp-uJycDwy6uYh4tlaXcIvZXN-K54DVKnrOpk767ZNWT6ifu0fqPVQ8L2bs9tl6LERKtNGUpUsbOX0jig_DPsfwPYYhcf6KivlIei79lVB2OH3MF9WtjhEoxYGMJQILVOWMGuMuuuvutHrRyYYwlR6EJ1732DOkg' },
                { title: 'Chip War: Vi Mạch', author: 'Chris Miller', price: 195000, cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbmG-DrwzDF7L-xQC0apLXmttMBZRPoKvu3rMyr8W7vyn4zTfdiN3JtQyOa_IObFnmj1bdvIY73nAT_QjNjLLfuYgxo6FBNn-lt7lOTfQNIva3WaAKlxnMHgy-_IhHoktDeEGEDA3rnfjz9Vfn3AevGOk0kZi2dXV-JghxIDb2TycTgXazMg_SXHXg5rQ094aGVtNPb39Rp8lmU2aE-iFWhX57HnxWU8RB7a246d1ZYO2y6aBpBliXGw' },
                { title: 'Kỷ Nguyên AI', author: 'Henry Kissinger', price: 145000, cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqFYczOxI6BBEPJSMzztuWwVEuoaWCELJRJUH8TPmZfu4TGUMCLBDdIMVayaksl_ckCMcALtlmYopDNyBpIa_B749DzC1MNOvwmZOqhS2wpECcIBwflRtdvHy9VdoTbFzHF8dOjHY0HqabUfwJ-xZJ8NAdR7w2eeCJjxjT0azwVDaDemPRQEQoK8n2ib3M5PlmtfIqpKqJhGvdmsuXSvYUk5LzX_cPr74oMG-KpxiOpQ3-gMeRZp2fPQ' }
              ].map((book, idx) => (
                <div key={idx} className="bg-surface-container-lowest rounded-xl p-2 border border-outline-variant/30 flex flex-col justify-between hover:border-tertiary/40 transition-all">
                  <div className="aspect-[2/3] w-full rounded-md overflow-hidden mb-1.5 bg-surface-container spine-crease">
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <h5 className="text-[11.5px] font-semibold text-on-surface line-clamp-1 truncate" title={book.title}>{book.title}</h5>
                  <p className="text-[10px] text-on-surface-variant truncate">{book.author}</p>
                  <div className="mt-1 pt-1 border-t border-outline-variant/20 flex items-center justify-between">
                    <span className="text-[12px] font-bold text-tertiary">{book.price.toLocaleString('vi-VN')}₫</span>
                    <button 
                      onClick={(e) => handleQuickAdd(book, e)}
                      className="w-6 h-6 rounded bg-surface-container hover:bg-tertiary hover:text-white text-tertiary flex items-center justify-center transition-colors text-[14px]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: TỦ SÁCH TÁC GIẢ YÊU THÍCH (AUTHORS SLIDER)
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-on-surface">Tác Giả Được Yêu Thích</h3>
            <p className="text-[11px] text-on-surface-variant">Theo dõi tác giả để nhận thông báo tác phẩm mới và giao lưu trực tuyến</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevAuthor}
              className="w-7 h-7 rounded-full border border-outline-variant/50 hover:bg-tertiary hover:text-white flex items-center justify-center transition-colors cursor-pointer text-on-surface-variant"
              title="Tác giả trước"
              aria-label="Tác giả trước"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button
              onClick={handleNextAuthor}
              className="w-7 h-7 rounded-full border border-outline-variant/50 hover:bg-tertiary hover:text-white flex items-center justify-center transition-colors cursor-pointer text-on-surface-variant"
              title="Tác giả tiếp theo"
              aria-label="Tác giả tiếp theo"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div 
          className="overflow-hidden w-full py-1"
          onMouseEnter={() => setIsAuthorHovered(true)}
          onMouseLeave={() => setIsAuthorHovered(false)}
        >
          <div 
            className="flex transition-transform duration-500 ease-in-out gap-3"
            style={{
              transform: `translateX(calc(-${authorIndex} * (100% + 0.75rem) / ${itemsPerPage}))`
            }}
          >
            {authorsList.map((author, idx) => {
              const isFollowing = followedAuthors.includes(author.name);
              return (
                <div 
                  key={`${author.name}-${idx}`} 
                  className="shrink-0 w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2*0.75rem)/3)] lg:w-[calc((100%-4*0.75rem)/5)] bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/30 flex flex-col items-center text-center hover:border-tertiary/40 transition-all justify-between"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden mb-2 ring-2 ring-tertiary/20 shrink-0">
                      <img className="w-full h-full object-cover" alt={author.name} src={author.avatar} loading="lazy" />
                    </div>
                    <h4 className="text-[12.5px] font-semibold text-on-surface line-clamp-1 truncate" title={author.name}>{author.name}</h4>
                    <span className="text-[10.5px] text-on-surface-variant mt-0.5">{author.books}</span>
                  </div>
                  <button 
                    onClick={() => handleToggleAuthorFollow(author.name)}
                    className={`mt-2.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer w-full ${
                      isFollowing 
                        ? 'bg-tertiary text-on-tertiary' 
                        : 'bg-surface-container hover:bg-tertiary hover:text-on-tertiary text-tertiary'
                    }`}
                  >
                    {isFollowing ? '✓ Đang theo dõi' : '+ Theo dõi'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11: COMBO SÁCH HYBRID & HỘP QUÀ TRI THỨC (TIẾT KIỆM 30%)
      ========================================================================= */}
      <section className="bg-surface-container-low/50 rounded-2xl p-4 sm:p-5 border border-outline-variant/30 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">collections_bookmark</span>
            <div>
              <h3 className="text-[15px] sm:text-[16px] font-bold text-on-surface">Combo Sách Hybrid – Tiết Kiệm 30%</h3>
              <p className="text-[11px] text-on-surface-variant">Mua theo bộ ba ấn phẩm tinh hoa, đóng gói hộp quà sang trọng kèm mã đọc Ebook tức thì</p>
            </div>
          </div>
          <span className="bg-secondary text-on-secondary text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase hidden sm:inline">
            HỘP QUÀ TRI THỨC
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Combo 1 */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 flex flex-col sm:flex-row gap-4 items-center hover:border-tertiary/40 transition-all">
            <div className="w-[160px] h-[130px] relative shrink-0 flex items-center justify-center">
              <div className="w-[75px] h-[110px] rounded shadow absolute left-2 transform -rotate-12 border border-outline-variant/30 overflow-hidden spine-crease">
                <img className="w-full h-full object-cover" alt="Tư Duy Đột Phá" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_QjvduKfNR5seSn9HPQEvqsH1E7n9WeSjjr9wNbXrRGbPMZDQx-zMBxCEDXUuKTyqJgLwQjYnRRlbm3tj3ffqDtG5oIj915dx4fdYGouCBRv67zL2f4HLc0YY0dFXeQIJ2n1iUGV0DXtqTQXU6KCLevhIIzzexoCH-_6PuICpO8LDeszxFJy6bk9UliEwUulEAc_bvwTRZb7QBXVhr2SJCmaOGv8UbmgEMYqd8B3pyPYz6x6V1ZB-tA" />
              </div>
              <div className="w-[80px] h-[115px] rounded shadow-md relative z-10 border border-outline-variant/40 overflow-hidden spine-crease">
                <img className="w-full h-full object-cover" alt="Tư Duy Phản Biện" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkHNckh2qNxG6vP9xBQOhN_j0cpXF9XzvB2lmrn6RNFJ588pRh96iKJIl7t1DjsTo4XWg4nHw7FOyTaZiK-CExIDPjSGlvF6Tgm3uO5Ka7C3lm9hvA0Q9SrZHUxRGn5_m_81s9p0Zgmb6j0FQMDvQw69X1Svu-VMorrJkauSziIpvFdfZG7pJJT3ufAwSAeewW60Asdh2BW8KEzFYpqjQp3DiKCLBtibBM1w7draDDvJ_s5iwkxzPSmw" />
              </div>
              <div className="w-[75px] h-[110px] rounded shadow absolute right-2 transform rotate-12 border border-outline-variant/30 overflow-hidden spine-crease">
                <img className="w-full h-full object-cover" alt="Trực Giác" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD07ofHbad1Ed8bpRC3fJjNXcQHdEtXLiX2Zlrovt8CF41gqPHpReuJASicWyqIUc_FvmGOJIruGktt8garc8-MItXxGTd-cdei8NsJ-U-85yDlLFX8O4pK0p3PrWH9nQSZP6GLmJ7QPmoO_-UQ8IJ1N_4vQ9TkjdophOsPeN1nNvIO0k79B1gjI1bTwTALG8Q-rr6FEilTOzqjXO_RJo9ysWHdIJ0HurEbQQliuiK94Fgr3hjNzZr8yQ" />
              </div>
            </div>

            <div className="flex flex-col justify-between flex-1 min-w-0 w-full gap-2">
              <div>
                <span className="bg-primary-fixed text-primary text-[10px] font-bold px-2 py-0.5 rounded inline-block">Combo 3 cuốn - Tiết kiệm 135.000₫</span>
                <h4 className="text-[13.5px] font-bold text-on-surface mt-1 line-clamp-2 leading-snug">Bộ Sách Rèn Luyện Tư Duy Sắc Bén &amp; Quyết Định Đúng Đắn</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">Gồm: Tư Duy Nhanh &amp; Chậm + Nghệ Thuật Rành Mạch + Rèn Luyện Trí Não</p>
              </div>

              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[15px] font-bold text-tertiary">315.000₫</span>
                  <span className="text-[11px] text-on-surface-variant/60 line-through ml-1.5">450.000₫</span>
                </div>
                <button 
                  onClick={() => {
                    addToCart({
                      id: 'combo-tu-duy',
                      title: 'Bộ Sách Rèn Luyện Tư Duy Sắc Bén (Combo 3 cuốn)',
                      price: 315000,
                      originalPrice: 450000,
                      quantity: 1,
                      type: 'combo'
                    });
                    showToast('Đã thêm Combo Tư Duy vào giỏ hàng!', 'success');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-tertiary text-on-tertiary text-[11.5px] font-bold hover:bg-tertiary-container transition-colors cursor-pointer shadow-2xs"
                >
                  Mua Combo Ngay
                </button>
              </div>
            </div>
          </div>

          {/* Combo 2 */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 flex flex-col sm:flex-row gap-4 items-center hover:border-tertiary/40 transition-all">
            <div className="w-[160px] h-[130px] relative shrink-0 flex items-center justify-center">
              <div className="w-[75px] h-[110px] rounded shadow absolute left-2 transform -rotate-12 border border-outline-variant/30 overflow-hidden spine-crease">
                <img className="w-full h-full object-cover" alt="Nhà Đầu Tư" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBu7LaASRbXZ7TUHWVAA27v2w_NOsutXCFd2cyMdMjko98cXe1k4fUFUxUMyAJPuv94pBCY0nl8uM01aoHKeuFpg6ZVTga7A_CyDLJnVJN3VjPtUKX01ZRbji59GS_rVb4yiV0iivvQM-Dl-auR9zcEvDyZWHwg4d1R42zRmKJ1GzWAvk2yIJlwXpOUsU44i6pD2gqSDBIi0ln-qTTye32CBClOpmCDacWI7uvsqRGnn9kwNyaDzslOYw" />
              </div>
              <div className="w-[80px] h-[115px] rounded shadow-md relative z-10 border border-outline-variant/40 overflow-hidden spine-crease">
                <img className="w-full h-full object-cover" alt="Tâm Lý Học Về Tiền" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM7gBSVDgX1zUMWDdQFGZ7IZg2kjfHbgtiqdLWk-uRX--8P_yVE1QgBXtZc-vuME4D_3wWbkWNqk79YS-9NOXNCV3o7Y_GGruD6pzQ-iZrMq23Bl5Zdd_XQ961fXc8maykgDBp_OWE4_l2BuZ_aioFoNZ9XiJz4L1PeFwm7RTJpZLcerg1dTvIUrXf8pgpBer-e9X--S2UqUZ0cw3pb3CO56J0IDZHmJfbkpLmIECuNyvzwng-FqKPsw" />
              </div>
              <div className="w-[75px] h-[110px] rounded shadow absolute right-2 transform rotate-12 border border-outline-variant/30 overflow-hidden spine-crease">
                <img className="w-full h-full object-cover" alt="Bước Đi Ngẫu Nhiên" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsq8ZiGEIYceYqKnhpVyjqgGJm-dW0JALzvnEZGfK2Huzvok3KGyrL3q7K7vGcnyA1kVW1-2oY_HmfLRc2tErTMOfiigAX-REIRW2GxLUpRHAiVQGvqELsnSl-V5wq5jbqYwUzbeWsaVZRqXc9-clAMuow_8uYbbHrU9oHAeLeLmGMcEVkvMbX6-5rou19M_tYrelhPRHEql9PvUZj9_0VyN0zyV3dUBxO56Cw-6R0wipatHSUXQQK-g" />
              </div>
            </div>

            <div className="flex flex-col justify-between flex-1 min-w-0 w-full gap-2">
              <div>
                <span className="bg-primary-fixed text-primary text-[10px] font-bold px-2 py-0.5 rounded inline-block">Combo 3 cuốn - Tiết kiệm 168.000₫</span>
                <h4 className="text-[13.5px] font-bold text-on-surface mt-1 line-clamp-2 leading-snug">Bộ Cẩm Nang Tự Do Tài Chính &amp; Đầu Tư Bền Vững</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">Gồm: Tâm Lý Học Về Tiền + Nhà Đầu Tư Thông Minh + Bước Đi Ngẫu Nhiên</p>
              </div>

              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[15px] font-bold text-tertiary">392.000₫</span>
                  <span className="text-[11px] text-on-surface-variant/60 line-through ml-1.5">560.000₫</span>
                </div>
                <button 
                  onClick={() => {
                    addToCart({
                      id: 'combo-tai-chinh',
                      title: 'Bộ Cẩm Nang Tự Do Tài Chính (Combo 3 cuốn)',
                      price: 392000,
                      originalPrice: 560000,
                      quantity: 1,
                      type: 'combo'
                    });
                    showToast('Đã thêm Combo Tài Chính vào giỏ hàng!', 'success');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-tertiary text-on-tertiary text-[11.5px] font-bold hover:bg-tertiary-container transition-colors cursor-pointer shadow-2xs"
                >
                  Mua Combo Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 12: MẠNG XÃ HỘI ĐỘC GIẢ & REVIEW THỰC TẾ
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
          <div>
            <div className="flex items-center gap-1.5 text-tertiary text-[11px] uppercase font-bold">
              <span className="material-symbols-outlined text-[16px]">forum</span> Mạng Xã Hội Độc Giả HUKI
            </div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-on-surface mt-0.5">Cộng Đồng Đang Đọc &amp; Thảo Luận Gì?</h3>
          </div>
          <Link to="/community" className="text-[12.5px] text-tertiary hover:underline font-semibold flex items-center gap-0.5">
            <span>Ghé thăm Diễn Đàn Đọc</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[
            {
              name: 'Lê Phương Thảo',
              activity: "Vừa đọc xong cuốn 'Atomic Habits'",
              avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDudxgVMML_sgJfIDt0kJIqOu05zv5bBG96Ja3O8eT9mifVyStY6lnCLUheExhdsRhlWBnksCN9Id433O1w10F0tKY3CWhucJ1HtwKFgt0FWE51G9cDr89SDbDyKql8LrrC4z60g8NQRNR0oxk-3uEoCkcmdHTTdqdS1LsNDtb75jWIfsUnMYTGbCqUEH5L0ao-jk1o2TqP_VkmIHjoBvX3UZ6KfbfMLj-SYtdNMRr7Yp-IfJHzzMfLNw',
              quote: "Cuốn sách đã thay đổi hoàn toàn cách mình nhìn nhận về mục tiêu. Đừng tập trung vào đích đến, hãy kiến tạo một hệ thống hành vi tí hon mỗi ngày...",
              likes: 142,
              comments: 28,
              time: '2 giờ trước',
              bookId: 'atomic-habits'
            },
            {
              name: 'Trần Hoàng Long',
              activity: "Review cuốn 'Tâm Lý Học Về Tiền'",
              avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVUON5wplaY962G-e4RdAr5WP_j4J21qV8OznHaoQUVPnQSP1y4_DXp21uo9peEB3INDzgEGvN1YSsYIsl0r7m66X_i7OlfJnX3cQM0F57aZhTi_v1xuaTAsYrqmaqdeRst4lPKMRmelueUtLls719HTVw0dZLzXU6hAcq2usErTkgND60zNHnkqHG1l2ejELA1bke5WkS3ns3g-iU2DsHrJDsWW94nu4DFi-2ul0Lnm7lNsFM9m8SyQ',
              quote: "Cách tác giả phân tích về lòng tham và sự đủ đầy thực sự là một cú tát thức tỉnh. Đọc chậm từng chương trên HUKI Reader ban đêm rất thấm!",
              likes: 98,
              comments: 16,
              time: '5 giờ trước',
              bookId: 'tam-ly-hoc-ve-tien'
            },
            {
              name: 'Nguyễn Minh Anh',
              activity: 'Khởi động Thử Thách Đọc 2026',
              avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcI1ilftVRQhZe8zdz1QYlqywoblx1SYa-VF-sg4AVarmY6Q_aEbNRIzQ-i4PDxgD5FNegtJ6F8NIsaTYtygfnOf4KrQpn4Yu0q0KdQiPFP5GmVoHxQrQW4k54yh4JJWb7TjxSQj6aNPHC3WtAV7sU6ZCg5reilFciTdbQKjAerueFV6pK6W4uo2CGFdrRN8JDBrYv9LsYreNDoJEQIXt7kDMHCt8QJ4yuIm-LeJuzQ7FOTnvPKDb1Uw',
              quote: "Mục tiêu 35 cuốn năm nay đã hoàn thành cuốn số 4 rồi cả nhà ơi! Bạn nào đang tìm sách chữa lành tâm hồn thì không nên bỏ qua 'Dám Bị Ghét' nhé.",
              likes: 210,
              comments: 42,
              time: 'Hôm qua',
              bookId: 'dam-bi-ghet'
            }
          ].map((rev, idx) => (
            <div key={idx} className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/30 flex flex-col justify-between hover:border-tertiary/40 transition-all">
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-container shrink-0">
                    <img className="w-full h-full object-cover" alt={rev.name} src={rev.avatar} loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12.5px] font-bold text-on-surface truncate">{rev.name}</h4>
                    <span className="text-[10px] text-on-surface-variant block truncate">{rev.activity}</span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 text-secondary mb-1.5">
                  <span className="material-symbols-outlined text-[13px] fill-icon">star</span>
                  <span className="material-symbols-outlined text-[13px] fill-icon">star</span>
                  <span className="material-symbols-outlined text-[13px] fill-icon">star</span>
                  <span className="material-symbols-outlined text-[13px] fill-icon">star</span>
                  <span className="material-symbols-outlined text-[13px] fill-icon">star</span>
                </div>

                <p className="text-[12px] text-on-surface leading-relaxed italic">
                  "{rev.quote}"
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-on-surface-variant text-[11px]">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 hover:text-primary cursor-pointer"><span className="material-symbols-outlined text-[14px]">favorite</span> {rev.likes}</span>
                  <span className="flex items-center gap-1 hover:text-tertiary cursor-pointer"><span className="material-symbols-outlined text-[14px]">chat_bubble</span> {rev.comments}</span>
                </div>
                <Link to={`/book/${rev.bookId}`} className="text-tertiary hover:underline font-semibold flex items-center gap-0.5">
                  <span>Mua sách này</span>
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 13: BANNER TUYỂN DỤNG NGƯỜI BÁN & TÁC GIẢ (SELLER RECRUITMENT)
      ========================================================================= */}
      <section className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-5 sm:p-7 text-white border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">storefront</span>
          </div>
          <div>
            <span className="bg-emerald-400/20 text-emerald-300 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded">
              DÀNH CHO TÁC GIẢ &amp; NHÀ SÁCH
            </span>
            <h3 className="text-[17px] sm:text-[19px] font-bold text-white mt-1">
              Trở Thành Người Bán Trên HUKI EBOOK
            </h3>
            <p className="text-[12px] text-white/80 mt-0.5 max-w-xl">
              Dễ dàng mở gian hàng phân phối Sách Giấy &amp; Ebook có bảo vệ bản quyền DRM. Tiếp cận hơn 250.000 độc giả trung thành.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-emerald-200">
              <span>✔ Miễn phí mở shop</span>
              <span>•</span>
              <span>✔ Bảo vệ DRM chống sao chép</span>
              <span>•</span>
              <span>✔ Rút tiền linh hoạt 24/7</span>
            </div>
          </div>
        </div>

        <Link
          to="/seller/register"
          className="px-5 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container text-[13px] font-bold hover:brightness-105 transition-all shrink-0 shadow-sm flex items-center gap-1.5"
        >
          <span>Đăng ký bán hàng ngay</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </section>

      {/* =========================================================================
          SECTION 14: TRỢ LÝ AI GỢI Ý SÁCH & NEWSLETTER NHẬN MÃ ƯU ĐÃI
      ========================================================================= */}
      <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-tertiary/30 shadow-xs flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">smart_toy</span>
        </div>
        <h3 className="text-[17px] sm:text-[19px] font-bold text-on-surface">
          Chưa Biết Nên Đọc Gì Hôm Nay? Hãy Để HUKI AI Lắng Nghe Bạn
        </h3>
        <p className="text-[12.5px] text-on-surface-variant max-w-lg">
          Nhập tâm trạng, khó khăn hiện tại hay chủ đề bạn tò mò, AI sẽ phân tích và gợi ý chính xác cuốn sách dành riêng cho bạn.
        </p>

        <div className="w-full max-w-xl mt-1 bg-surface-container-low border border-outline-variant/40 rounded-xl p-1.5 flex flex-col sm:flex-row items-center gap-1.5 focus-within:border-tertiary transition-all">
          <div className="flex-1 flex items-center px-2.5 w-full">
            <span className="material-symbols-outlined text-tertiary text-[18px] mr-2">auto_awesome</span>
            <input 
              type="text" 
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              className="w-full bg-transparent border-none text-on-surface text-[12.5px] focus:outline-none"
            />
          </div>
          <button 
            onClick={() => {
              showToast('HUKI AI đang phân tích dữ liệu độc giả và gợi ý sách...', 'info');
              navigate(`/books?q=${encodeURIComponent(aiInput)}`);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-[12px] font-semibold hover:bg-tertiary-container flex items-center justify-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            <span>Gợi ý thông minh</span>
            <span className="material-symbols-outlined text-[16px]">magic_button</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-on-surface-variant mt-1">
          <span>Ví dụ câu hỏi hay:</span>
          <span 
            onClick={() => setAiInput('Sách về tâm lý vượt qua trì hoãn')}
            className="bg-surface-container px-2 py-0.5 rounded-full cursor-pointer hover:text-tertiary"
          >
            "Sách vượt qua trì hoãn"
          </span>
          <span 
            onClick={() => setAiInput('Tiểu thuyết trinh thám ly kỳ cuối tuần')}
            className="bg-surface-container px-2 py-0.5 rounded-full cursor-pointer hover:text-tertiary"
          >
            "Trinh thám ly kỳ"
          </span>
          <span 
            onClick={() => setAiInput('Sách nhập môn đầu tư chứng khoán cho người mới')}
            className="bg-surface-container px-2 py-0.5 rounded-full cursor-pointer hover:text-tertiary"
          >
            "Nhập môn đầu tư"
          </span>
        </div>
      </section>

      {/* Newsletter Strip */}
      <section 
        style={{ background: 'linear-gradient(135deg, var(--theme-hero-from, #00382B) 0%, var(--theme-hero-via, #004D38) 100%)' }}
        className="rounded-2xl text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-5 border border-white/15 shadow-sm"
      >
        <div className="max-w-md">
          <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">mail</span> BẢN TIN SALON VĂN HỌC
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Nhận Ngay Mã Ưu Đãi 20% Cho Đơn Hàng Đầu Tiên
          </h3>
          <p className="text-[12px] text-white/85 mt-1 leading-relaxed">
            Cập nhật review sách từ các dịch giả uy tín, danh mục sách tặng miễn phí và vé tham dự giao lưu tác giả.
          </p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newsletterEmail.trim()) {
              showToast(`Đã gửi mã giảm 20% tới ${newsletterEmail}! Vui lòng kiểm tra hộp thư.`, 'success');
              setNewsletterEmail('');
            }
          }}
          className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2"
        >
          <input 
            type="email" 
            required
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
            placeholder="Nhập địa chỉ email của bạn..." 
            className="w-full sm:w-[280px] px-3.5 py-2.5 rounded-xl bg-white text-gray-900 text-[13px] focus:outline-none border-none shadow-sm placeholder:text-gray-500"
          />
          <button 
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container text-[13px] font-bold hover:brightness-105 transition-all shrink-0 shadow-sm cursor-pointer"
          >
            Đăng ký ngay
          </button>
        </form>
      </section>

    </div>
  );
}

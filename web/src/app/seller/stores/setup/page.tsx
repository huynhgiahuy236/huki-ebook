"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { businessApi, BusinessData, StoreData } from '@/ui/api/businessApi';
import { walletApi } from '@/ui/api/walletApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { getUniqueBanks, VietnamBank } from '@/data/vietnam-banks';

export default function SellerSetupStorePage() {
  const router = useRouter();
  const { user, refreshBusiness } = useAuth();
  const { showToast } = useToast();

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [currentStore, setCurrentStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStep, setSavingStep] = useState(false);

  // Stepper state (1: Gian hàng, 2: Ngân hàng, 3: Mã PIN, 4: Hoàn tất)
  const [currentStep, setCurrentStep] = useState(1);

  // Form state cho Bước 1: Gian hàng
  const [storeForm, setStoreForm] = useState({
    name: '',
    description: '',
    logo: '',
    banner: '',
  });
  const [storeErrors, setStoreErrors] = useState<Record<string, string>>({});

  // Form state cho Bước 2: Tài khoản ngân hàng
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_holder_name: '',
    bank_branch: '',
  });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  // Form state cho Bước 3: Mã PIN
  const [pinForm, setPinForm] = useState({
    pin: '',
    confirmPin: '',
  });
  const [pinErrors, setPinErrors] = useState<Record<string, string>>({});
  const [hasPinConfigured, setHasPinConfigured] = useState(false);

  // Available banks list for dropdown
  const availableBanks = useMemo(() => getUniqueBanks(), []);
  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return availableBanks;
    const q = bankSearch.toLowerCase();
    return availableBanks.filter(
      (b) =>
        b.shortName.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
    );
  }, [bankSearch, availableBanks]);

  const loadData = useCallback(async () => {
    try {
      // 1. Load business
      const bizRes = await businessApi.getMyBusiness();
      if (bizRes.success && bizRes.data) {
        const b = (bizRes.data as any)?.data || bizRes.data;
        setBusiness(b);

        // Nếu chưa được duyệt → redirect về pending
        if (b.status !== 'APPROVED') {
          router.replace('/seller/pending');
          return;
        }

        // Kiểm tra nếu đã hoàn tất setup Onboarding trước đó -> chuyển thẳng vào Dashboard (chỉ hiển thị 1 lần)
        if (typeof window !== 'undefined' && b.id) {
          const isCompleted = localStorage.getItem(`huki_store_setup_completed_${b.id}`);
          if (isCompleted === 'true') {
            router.replace('/seller/dashboard');
            return;
          }
        }

        // Pre-fill bank form từ business nếu có
        setBankForm({
          bank_name: b.bankName || '',
          bank_code: '',
          account_number: b.bankAccountNumber || '',
          account_holder_name: b.bankAccountHolderName || b.name || '',
          bank_branch: b.bankBranch || 'Chi nhánh TP. HCM',
        });

        // 2. Load stores
        if (b.id) {
          const storesRes = await businessApi.getMyStores(b.id);
          if (storesRes.success && storesRes.data) {
            const storeList = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data as any)?.data || [];
            setStores(storeList);

            if (storeList.length > 0) {
              const primaryStore = storeList[0];
              setCurrentStore(primaryStore);
              setStoreForm({
                name: primaryStore.name || b.name || '',
                description: primaryStore.description || '',
                logo: primaryStore.logo || '',
                banner: primaryStore.banner || '',
              });

              // Check security PIN status
              try {
                const secRes = await walletApi.getSecurityStatus(primaryStore.id);
                if (secRes.success && secRes.data?.hasPin) {
                  setHasPinConfigured(true);
                }
              } catch {
                // Ignore if wallet is not yet initialized
              }
            } else {
              setStoreForm({
                name: b.stores?.[0]?.name || b.name || '',
                description: b.stores?.[0]?.description || '',
                logo: b.stores?.[0]?.logo || '',
                banner: b.stores?.[0]?.banner || '',
              });
            }
          }
        }
      } else {
        router.replace('/seller/register');
      }
    } catch (err) {
      console.error('Error loading setup data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle bank selection
  const handleSelectBank = (bank: VietnamBank) => {
    setBankForm((prev) => ({
      ...prev,
      bank_name: `${bank.shortName} - ${bank.name}`,
      bank_code: bank.code,
    }));
    setIsBankDropdownOpen(false);
    setBankSearch('');
    if (bankErrors.bank_name) {
      setBankErrors((prev) => {
        const next = { ...prev };
        delete next.bank_name;
        return next;
      });
    }
  };

  // Validation per step
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!storeForm.name.trim()) {
      errors.name = 'Vui lòng nhập tên gian hàng hiển thị.';
    } else if (storeForm.name.trim().length < 3) {
      errors.name = 'Tên gian hàng tối thiểu 3 ký tự.';
    }
    setStoreErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!bankForm.bank_name.trim()) {
      errors.bank_name = 'Vui lòng chọn ngân hàng nhận thanh toán.';
    }
    if (!bankForm.account_number.trim()) {
      errors.account_number = 'Vui lòng nhập số tài khoản ngân hàng.';
    } else if (!/^[0-9A-Za-z]{6,25}$/.test(bankForm.account_number.trim().replace(/\s+/g, ''))) {
      errors.account_number = 'Số tài khoản không hợp lệ (6 - 25 ký tự).';
    }
    if (!bankForm.account_holder_name.trim()) {
      errors.account_holder_name = 'Tên chủ tài khoản không được để trống.';
    }
    setBankErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    if (!hasPinConfigured) {
      if (!pinForm.pin) {
        errors.pin = 'Vui lòng nhập Mã PIN (6 chữ số).';
      } else if (!/^[0-9]{6}$/.test(pinForm.pin)) {
        errors.pin = 'Mã PIN phải bao gồm đúng 6 chữ số.';
      }
      if (!pinForm.confirmPin) {
        errors.confirmPin = 'Vui lòng nhập lại để xác nhận Mã PIN.';
      } else if (pinForm.confirmPin !== pinForm.pin) {
        errors.confirmPin = 'Xác nhận Mã PIN không khớp.';
      }
    }
    setPinErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: Save Store
  const handleSaveStep1 = async () => {
    if (!validateStep1()) return;

    setSavingStep(true);
    try {
      const storeId = currentStore?.id || stores[0]?.id;

      if (storeId) {
        const res = await businessApi.updateStore(storeId, {
          name: storeForm.name.trim(),
          description: storeForm.description.trim(),
          logo: storeForm.logo || undefined,
          banner: storeForm.banner || undefined,
        });

        if (res.success) {
          showToast('Đã lưu thông tin gian hàng!', 'success');
          setCurrentStep(2);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showToast(res.error?.message || 'Không thể cập nhật cửa hàng.', 'error');
        }
      } else if (business?.id) {
        const slug = storeForm.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const res = await businessApi.createStore(business.id, {
          name: storeForm.name.trim(),
          description: storeForm.description.trim(),
          slug: slug || `store-${Date.now()}`,
          logo: storeForm.logo || undefined,
          banner: storeForm.banner || undefined,
          email: business.email || user?.email || '',
          phone: business.phone || user?.phone || '',
        });

        if (res.success && res.data) {
          setCurrentStore(res.data);
          showToast('Khởi tạo gian hàng thành công!', 'success');
          setCurrentStep(2);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showToast(res.error?.message || 'Không thể tạo cửa hàng.', 'error');
        }
      }
    } catch (err) {
      console.error('Error saving store info:', err);
      showToast('Có lỗi xảy ra khi lưu thông tin gian hàng.', 'error');
    } finally {
      setSavingStep(false);
    }
  };

  // Step 2: Save Bank
  const handleSaveStep2 = async () => {
    if (!validateStep2()) return;

    setSavingStep(true);
    try {
      if (business?.id) {
        const res = await businessApi.updateBusiness(business.id, {
          bankName: bankForm.bank_name.trim(),
          bankAccountNumber: bankForm.account_number.trim(),
          bankAccountHolderName: bankForm.account_holder_name.trim() || business.name,
          bankBranch: bankForm.bank_branch.trim() || 'Chi nhánh TP. HCM',
        });

        if (res.success) {
          showToast('Đã liên kết tài khoản ngân hàng nhận tiền!', 'success');
          setCurrentStep(3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showToast(res.error?.message || 'Không thể cập nhật tài khoản ngân hàng.', 'error');
        }
      }
    } catch (err) {
      console.error('Error updating bank info:', err);
      showToast('Có lỗi khi lưu thông tin ngân hàng.', 'error');
    } finally {
      setSavingStep(false);
    }
  };

  // Step 3: Save PIN
  const handleSaveStep3 = async () => {
    if (hasPinConfigured) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!validateStep3()) return;

    setSavingStep(true);
    try {
      const storeId = currentStore?.id || stores[0]?.id;
      if (storeId) {
        const res = await walletApi.setupPin(storeId, pinForm.pin);
        if (res.success) {
          setHasPinConfigured(true);
          showToast('Thiết lập Mã PIN 6 số thành công!', 'success');
          setCurrentStep(4);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showToast(res.error?.message || 'Không thể thiết lập mã PIN.', 'error');
        }
      } else {
        setHasPinConfigured(true);
        showToast('Đã lưu mã PIN bảo mật!', 'success');
        setCurrentStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error saving PIN:', err);
      showToast('Có lỗi xảy ra khi thiết lập mã PIN.', 'error');
    } finally {
      setSavingStep(false);
    }
  };

  // Step 4: Finish setup & Go to Dashboard (Chỉ 1 lần duy nhất)
  const handleFinishSetup = async () => {
    setSavingStep(true);
    try {
      if (business?.id && typeof window !== 'undefined') {
        localStorage.setItem(`huki_store_setup_completed_${business.id}`, 'true');
      }
      if (refreshBusiness) {
        await refreshBusiness();
      }
      showToast('Chúc mừng! Gian hàng của bạn đã sẵn sàng hoạt động.', 'success');
      router.push('/seller/dashboard');
    } catch (err) {
      console.error('Error finalizing setup:', err);
      router.push('/seller/dashboard');
    } finally {
      setSavingStep(false);
    }
  };

  const stepsList = [
    { num: 1, title: '1. Nhận Diện Gian Hàng', desc: 'Tên, Logo & Banner' },
    { num: 2, title: '2. Tài Khoản Ngân Hàng', desc: 'Nhận thanh toán & Đối soát' },
    { num: 3, title: '3. Mã PIN Bảo Mật', desc: 'Bảo vệ ví & Lệnh rút tiền' },
    { num: 4, title: '4. Kích Hoạt Hoạt Động', desc: 'Hoàn tất & Bắt đầu bán' },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#003B2B]/20 border-t-[#003B2B] rounded-full animate-spin"></div>
        <p className="text-sm text-slate-600 font-medium">Đang tải thiết lập cửa hàng...</p>
      </div>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#FAF8F5] text-slate-900 py-8 antialiased">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header Banner */}
        <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-emerald-700/20 blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold border border-emerald-700">
                <span className="material-symbols-outlined text-sm text-emerald-400">verified</span>
                <span>Hồ sơ doanh nghiệp đã được phê duyệt</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-white tracking-tight">
                Thiết Lập &amp; Kích Hoạt Gian Hàng
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
                Hoàn tất 3 bước thiết lập thông tin gian hàng, tài khoản ngân hàng và mã PIN giao dịch để chính thức phát hành sách trên sàn HUKI.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-700/50 px-4 py-2.5 rounded-2xl shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-emerald-200 font-medium">
                Tiến trình: <strong className="text-white font-bold">Bước {currentStep} / 4</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 4-Step Stepper Bar */}
        <section className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stepsList.map((step) => {
              const isCompleted = step.num < currentStep;
              const isCurrent = step.num === currentStep;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isCurrent
                      ? 'bg-white border-[#003B2B] ring-2 ring-[#003B2B]/15 shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-50/70 border-emerald-200 cursor-pointer hover:bg-emerald-50'
                      : 'bg-white/60 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-[#003B2B] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isCompleted ? '✓' : step.num}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Đã xong</span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">{step.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">{step.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Wizard Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">

          {/* ========================================================================= */}
          {/* BƯỚC 1: NHẬN DIỆN GIAN HÀNG */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <div className="inline-flex items-center gap-2 text-[#003B2B] font-bold text-xs uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-base">storefront</span>
                  <span>Bước 1 / 4</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900">
                  Thông Tin &amp; Nhận Diện Gian Hàng
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Thiết lập tên gian hàng đại diện, mô tả định vị và hình ảnh thương hiệu để thu hút độc giả.
                </p>
              </div>

              <div className="space-y-5">
                {/* Tên cửa hàng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên gian hàng hiển thị trên sàn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={storeForm.name}
                    onChange={(e) => {
                      setStoreForm({ ...storeForm, name: e.target.value });
                      if (storeErrors.name) setStoreErrors({ ...storeErrors, name: '' });
                    }}
                    placeholder="VD: Nhà Sách Kim Đồng Official"
                    className={`w-full h-12 px-4 border rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-2xs ${
                      storeErrors.name
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                    }`}
                  />
                  {storeErrors.name && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{storeErrors.name}</p>
                  )}
                </div>

                {/* Mô tả cửa hàng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả / Lời chào từ gian hàng
                  </label>
                  <textarea
                    value={storeForm.description}
                    onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                    rows={4}
                    placeholder="Giới thiệu về dòng sách chuyên ngành, sứ mệnh và cam kết chất lượng của đơn vị..."
                    className="w-full px-4 py-3 border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl text-sm text-slate-900 outline-none transition-all resize-none shadow-2xs"
                  />
                </div>

                {/* Logo & Banner Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Logo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Logo đại diện gian hàng (Tỉ lệ 1:1, tối thiểu 200x200px)
                    </label>
                    <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#003B2B] rounded-2xl flex items-center gap-4 transition-colors">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {storeForm.logo ? (
                          <img src={storeForm.logo} alt="Logo preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-slate-400">store</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <label className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs">
                            <span className="material-symbols-outlined text-sm">upload</span>
                            <span>Tải ảnh logo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setStoreForm({ ...storeForm, logo: URL.createObjectURL(file) });
                                  showToast('Đã chọn logo gian hàng!', 'success');
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setStoreForm({
                                ...storeForm,
                                logo: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
                              });
                            }}
                            className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                          >
                            Logo mẫu
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">Hỗ trợ PNG, JPG, WebP</p>
                      </div>
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Ảnh bìa / Banner gian hàng (Tỉ lệ rộng, tối thiểu 1200x300px)
                    </label>
                    <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#003B2B] rounded-2xl flex items-center gap-4 transition-colors">
                      <div className="w-24 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {storeForm.banner ? (
                          <img src={storeForm.banner} alt="Banner preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-slate-400">landscape</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <label className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs">
                            <span className="material-symbols-outlined text-sm">upload</span>
                            <span>Tải banner</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setStoreForm({ ...storeForm, banner: URL.createObjectURL(file) });
                                  showToast('Đã chọn banner gian hàng!', 'success');
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setStoreForm({
                                ...storeForm,
                                banner: 'https://images.unsplash.com/photo-1507842229451-79b1be046a25?auto=format&fit=crop&w=1200&q=80',
                              });
                            }}
                            className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                          >
                            Banner mẫu
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">Hỗ trợ PNG, JPG, WebP</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/seller"
                  className="h-12 px-6 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center transition-colors"
                >
                  Để sau
                </Link>

                <button
                  type="button"
                  disabled={savingStep}
                  onClick={handleSaveStep1}
                  className="h-12 px-8 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {savingStep ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu &amp; Tiếp tục Bước 2 →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BƯỚC 2: TÀI KHOẢN NGÂN HÀNG */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <div className="inline-flex items-center gap-2 text-[#003B2B] font-bold text-xs uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-base">account_balance</span>
                  <span>Bước 2 / 4</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900">
                  Thiết Lập Tài Khoản Ngân Hàng Nhận Tiền
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Doanh thu bán sách từ ví gian hàng sẽ được đối soát và giải ngân định kỳ về tài khoản ngân hàng chính thức này.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Chủ tài khoản */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên chủ tài khoản ngân hàng <span className="text-red-500">* (Đồng bộ theo Pháp nhân/Chủ shop)</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.account_holder_name}
                    onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value.toUpperCase() })}
                    placeholder="VD: CÔNG TY CP XUẤT BẢN HUKI"
                    className={`w-full h-12 px-4 border rounded-xl text-sm font-bold uppercase tracking-wider text-slate-900 outline-none transition-all shadow-2xs ${
                      bankErrors.account_holder_name
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                    }`}
                  />
                  {bankErrors.account_holder_name ? (
                    <p className="mt-1 text-xs text-red-500 font-medium">{bankErrors.account_holder_name}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      🔒 Tên chủ tài khoản phải trùng khớp với tên pháp nhân hoặc chủ thể đại diện đăng ký kinh doanh.
                    </p>
                  )}
                </div>

                {/* Dropdown Ngân hàng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ngân hàng thụ hưởng (VietQR / NAPAS) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                      className={`w-full h-12 bg-white border rounded-xl px-4 text-sm text-left flex items-center justify-between gap-2 outline-none transition-all shadow-2xs cursor-pointer ${
                        bankErrors.bank_name
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                          : bankForm.bank_name
                          ? 'border-emerald-300 hover:border-emerald-400 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                      }`}
                    >
                      <span className={bankForm.bank_name ? 'font-semibold text-slate-900 truncate' : 'text-slate-400'}>
                        {bankForm.bank_name || 'Chọn ngân hàng...'}
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-slate-400 shrink-0">
                        {isBankDropdownOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isBankDropdownOpen && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-2.5 bg-slate-50 border-b border-slate-100">
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined text-[18px] text-slate-400 mr-2">search</span>
                            <input
                              type="text"
                              value={bankSearch}
                              onChange={(e) => setBankSearch(e.target.value)}
                              placeholder="Tìm ngân hàng (Vietcombank, MB, ACB...)"
                              className="w-full bg-transparent text-xs py-1.5 pr-8 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                              autoFocus
                            />
                            {bankSearch && (
                              <button
                                type="button"
                                onClick={() => setBankSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <span className="material-symbols-outlined text-[16px]">cancel</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                          {filteredBanks.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                              Không tìm thấy ngân hàng phù hợp
                            </div>
                          ) : (
                            filteredBanks.map((bank) => (
                              <button
                                key={bank.code}
                                type="button"
                                onClick={() => handleSelectBank(bank)}
                                className="w-full px-4 py-2.5 text-left text-xs flex items-center justify-between gap-2 hover:bg-emerald-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{bank.shortName}</div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-xs">{bank.name}</div>
                                </div>
                                {bankForm.bank_name.includes(bank.shortName) && (
                                  <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {bankErrors.bank_name && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{bankErrors.bank_name}</p>
                  )}
                </div>

                {/* Số tài khoản */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Số tài khoản ngân hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.account_number}
                    onChange={(e) => {
                      setBankForm({ ...bankForm, account_number: e.target.value });
                      if (bankErrors.account_number) setBankErrors({ ...bankErrors, account_number: '' });
                    }}
                    placeholder="VD: 19038889999018"
                    className={`w-full h-12 px-4 border rounded-xl text-sm font-mono font-bold tracking-wider text-slate-900 outline-none transition-all shadow-2xs ${
                      bankErrors.account_number
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                    }`}
                  />
                  {bankErrors.account_number && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{bankErrors.account_number}</p>
                  )}
                </div>

                {/* Chi nhánh */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chi nhánh / Phòng giao dịch mở tài khoản
                  </label>
                  <input
                    type="text"
                    value={bankForm.bank_branch}
                    onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })}
                    placeholder="VD: Chi nhánh TP. Hồ Chí Minh / Sở Giao Dịch 1"
                    className="w-full h-12 px-4 border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="h-12 px-6 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  ← Quay lại Bước 1
                </button>

                <button
                  type="button"
                  disabled={savingStep}
                  onClick={handleSaveStep2}
                  className="h-12 px-8 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {savingStep ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu &amp; Tiếp tục Bước 3 →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BƯỚC 3: BẢO MẬT MÃ PIN GIAO DỊCH */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <div className="inline-flex items-center gap-2 text-[#003B2B] font-bold text-xs uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-base">lock</span>
                  <span>Bước 3 / 4</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900">
                  Thiết Lập Mã PIN Bảo Mật Rút Tiền
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Mã PIN gồm chính xác 6 chữ số dùng để xác thực an toàn tuyệt đối mỗi khi bạn tạo lệnh rút tiền từ Ví gian hàng.
                </p>
              </div>

              {hasPinConfigured ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl text-emerald-700">shield_lock</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-emerald-900 text-sm">Mã PIN giao dịch đã được kích hoạt</h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Tài khoản gian hàng của bạn đã có mã PIN 6 số an toàn. Bạn có thể thay đổi hoặc đặt lại mã PIN bất cứ lúc nào trong phần Quản lý Tài chính &amp; Ví.
                    </p>
                    <button
                      type="button"
                      onClick={() => setHasPinConfigured(false)}
                      className="mt-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                    >
                      Thiết lập lại mã PIN mới
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-5 py-4">
                  <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-700 text-xl shrink-0">info</span>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Tuyệt đối không chia sẻ mã PIN cho người khác. HUKI sẽ không bao giờ yêu cầu bạn cung cấp mã PIN qua điện thoại hay tin nhắn.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nhập Mã PIN mới (6 chữ số) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={pinForm.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setPinForm({ ...pinForm, pin: val });
                        if (pinErrors.pin) setPinErrors({ ...pinErrors, pin: '' });
                      }}
                      placeholder="••••••"
                      className={`w-full h-12 px-4 border rounded-xl text-center text-lg font-mono font-bold tracking-[0.5em] text-slate-900 outline-none transition-all shadow-2xs ${
                        pinErrors.pin
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                      }`}
                    />
                    {pinErrors.pin && (
                      <p className="mt-1 text-xs text-red-500 font-medium text-center">{pinErrors.pin}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Xác nhận lại Mã PIN (6 chữ số) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={pinForm.confirmPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setPinForm({ ...pinForm, confirmPin: val });
                        if (pinErrors.confirmPin) setPinErrors({ ...pinErrors, confirmPin: '' });
                      }}
                      placeholder="••••••"
                      className={`w-full h-12 px-4 border rounded-xl text-center text-lg font-mono font-bold tracking-[0.5em] text-slate-900 outline-none transition-all shadow-2xs ${
                        pinErrors.confirmPin
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                      }`}
                    />
                    {pinErrors.confirmPin && (
                      <p className="mt-1 text-xs text-red-500 font-medium text-center">{pinErrors.confirmPin}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="h-12 px-6 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  ← Quay lại Bước 2
                </button>

                <button
                  type="button"
                  disabled={savingStep}
                  onClick={handleSaveStep3}
                  className="h-12 px-8 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {savingStep ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu &amp; Xem lại Tổng quan →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BƯỚC 4: XEM LẠI & KÍCH HOẠT GIAN HÀNG */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-base">celebration</span>
                  <span>Bước 4 / 4 - Sẵn Sàng Kích Hoạt</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900">
                  Hoàn Tất Thiết Lập &amp; Kích Hoạt Gian Hàng
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Xem lại toàn bộ thông tin đã thiết lập trước khi chuyển vào Kênh Quản Trị Người Bán HUKI.
                </p>
              </div>

              {/* Cards Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gian hàng card */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-[#003B2B]">storefront</span>
                      Gian Hàng Bán Sách
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[11px] font-bold text-[#003B2B] hover:underline cursor-pointer"
                    >
                      Sửa
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {storeForm.logo ? (
                        <img src={storeForm.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-2xl text-slate-400">store</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{storeForm.name || business?.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{storeForm.description || 'Chưa có mô tả'}</p>
                    </div>
                  </div>
                </div>

                {/* Ngân hàng card */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-[#003B2B]">account_balance</span>
                      Tài Khoản Nhận Doanh Thu
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[11px] font-bold text-[#003B2B] hover:underline cursor-pointer"
                    >
                      Sửa
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">Chủ TK:</span>{' '}
                      <strong className="text-slate-900">{bankForm.account_holder_name || business?.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Số TK:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{bankForm.account_number || 'Chưa nhập'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Ngân hàng:</span>{' '}
                      <span className="text-slate-800 font-medium">{bankForm.bank_name || 'Chưa chọn'}</span>
                    </div>
                  </div>
                </div>

                {/* Bảo mật PIN card */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-emerald-700">verified_user</span>
                      Bảo Mật Giao Dịch &amp; Mã PIN Ví
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-[11px] font-bold text-[#003B2B] hover:underline cursor-pointer"
                    >
                      Thay đổi
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                    <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                    <span>Mã PIN 6 số đã được thiết lập thành công và bảo vệ cho các lệnh rút tiền.</span>
                  </div>
                </div>
              </div>

              {/* Final CTA */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="h-12 px-6 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer w-full sm:w-auto"
                >
                  ← Quay lại Bước 3
                </button>

                <button
                  type="button"
                  disabled={savingStep}
                  onClick={handleFinishSetup}
                  className="h-13 px-10 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {savingStep ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang chuyển hướng...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">rocket_launch</span>
                      <span>Kích Hoạt Gian Hàng &amp; Vào Kênh Bán Hàng</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

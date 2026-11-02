const fs = require('fs');
const path = require('path');

const adminUsersViewPath = path.resolve(__dirname, '../../web/src/ui/components/admin/AdminUsersView.tsx');
let content = fs.readFileSync(adminUsersViewPath, 'utf8');

// 1. Update AdminUser interface
const oldInterface = `  status: 'active' | 'warning' | 'locked' | 'pending';
  statusLabel: string;
  storeName?: string | null;
  rawStatus?: string;
}`;

const newInterface = `  status: 'active' | 'warning' | 'locked' | 'pending' | 'pending_deletion' | 'deleted';
  statusLabel: string;
  storeName?: string | null;
  rawStatus?: string;
  deletionScheduledAt?: string | null;
  deletionRequestedAt?: string | null;
  deletionCount?: number;
  remainingDays?: number | null;
  deletedAt?: string | null;
  originalEmail?: string | null;
}`;

content = content.replace(oldInterface, newInterface);

// 2. Update mapping in loadUsers
const oldStatusMapping = `          const rawStatus = (u.status || '').toUpperCase();
          const isLocked = rawStatus === 'LOCKED' || rawStatus === 'BLOCKED';
          const isPending = rawStatus === 'PENDING';
          const status = isLocked ? 'locked' : isPending ? 'warning' : 'active';
          const statusLabel = isLocked
            ? 'Đã bị khóa tài khoản'
            : isPending
            ? 'Chờ xác thực'
            : 'Hoạt động tốt';`;

const newStatusMapping = `          const rawStatus = (u.status || '').toUpperCase();
          const isPendingDeletion = rawStatus === 'PENDING_DELETION';
          const isDeleted = rawStatus === 'DELETED' || Boolean(u.deletedAt);
          const isLocked = rawStatus === 'LOCKED' || rawStatus === 'BLOCKED';
          const isPending = rawStatus === 'PENDING';

          let status: 'active' | 'warning' | 'locked' | 'pending' | 'pending_deletion' | 'deleted' = 'active';
          let statusLabel = 'Hoạt động tốt';

          if (isPendingDeletion) {
            status = 'pending_deletion';
            statusLabel = \`Chờ xóa (\${u.remainingDays ?? 7} ngày)\`;
          } else if (isDeleted) {
            status = 'deleted';
            statusLabel = 'Đã xóa tài khoản';
          } else if (isLocked) {
            status = 'locked';
            statusLabel = 'Đã bị khóa tài khoản';
          } else if (isPending) {
            status = 'warning';
            statusLabel = 'Chờ xác thực';
          }`;

content = content.replace(oldStatusMapping, newStatusMapping);

// Add fields to mapped user object
const oldMappedReturn = `            status,
            statusLabel,
            storeName: u.storeName,
            rawStatus,
          };`;

const newMappedReturn = `            status,
            statusLabel,
            storeName: u.storeName,
            rawStatus,
            deletionScheduledAt: u.deletionScheduledAt,
            deletionRequestedAt: u.deletionRequestedAt,
            deletionCount: u.deletionCount || 0,
            remainingDays: u.remainingDays,
            deletedAt: u.deletedAt,
            originalEmail: u.originalEmail,
          };`;

content = content.replace(oldMappedReturn, newMappedReturn);

// 3. Add handleRestoreUser function
const oldToggleLock = `  // 3. Real Toggle Lock in Database
  const handleToggleLock = async (userId: string) => {`;

const newRestoreAndToggleLock = `  // 3. Real Restore User (Mở lại chốt an toàn)
  const handleRestoreUser = async (userId: string) => {
    try {
      const res = await adminApi.restoreUser(userId);
      if (res.success) {
        showToast?.('Đã khôi phục tài khoản thành công! Chốt an toàn đã được mở lại.', 'success');
        loadUsers();
      } else {
        showToast?.(res.error?.message || 'Không thể khôi phục tài khoản.', 'error');
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Lỗi khi khôi phục tài khoản.', 'error');
    }
  };

  // Real Toggle Lock in Database
  const handleToggleLock = async (userId: string) => {`;

content = content.replace(oldToggleLock, newRestoreAndToggleLock);

// 4. Update filtering in filteredUsers
const oldFilteredUsers = `      if (activeTab === 'customer' && user.role !== 'CUSTOMER' && user.role !== 'USER') return false;
      if (activeTab === 'business' && user.role !== 'BUSINESS' && user.role !== 'SELLER_ADMIN') return false;
      if (activeTab === 'staff' && user.role !== 'DELIVERY_STAFF') return false;
      if (activeTab === 'warning' && user.status !== 'warning' && user.status !== 'locked') return false;`;

const newFilteredUsers = `      if (activeTab === 'customer' && user.role !== 'CUSTOMER' && user.role !== 'USER') return false;
      if (activeTab === 'business' && user.role !== 'BUSINESS' && user.role !== 'SELLER_ADMIN') return false;
      if (activeTab === 'staff' && user.role !== 'DELIVERY_STAFF') return false;
      if (activeTab === 'pending_deletion' && user.status !== 'pending_deletion') return false;
      if (activeTab === 'deleted' && user.status !== 'deleted') return false;
      if (activeTab === 'warning' && user.status !== 'warning' && user.status !== 'locked') return false;`;

content = content.replace(oldFilteredUsers, newFilteredUsers);

// 5. Update kpiStats
const oldKpiStats = `    const lockedOrPendingCount = users.filter((u) => u.status === 'locked' || u.status === 'warning').length;

    return {
      totalUsers,
      customerCount,
      businessCount,
      staffCount,
      lockedOrPendingCount,
    };`;

const newKpiStats = `    const lockedOrPendingCount = users.filter((u) => u.status === 'locked' || u.status === 'warning').length;
    const pendingDeletionCount = users.filter((u) => u.status === 'pending_deletion').length;
    const deletedCount = users.filter((u) => u.status === 'deleted').length;

    return {
      totalUsers,
      customerCount,
      businessCount,
      staffCount,
      lockedOrPendingCount,
      pendingDeletionCount,
      deletedCount,
    };`;

content = content.replace(oldKpiStats, newKpiStats);

// 6. Update columns: status badge and actions
const oldStatusRender = `      {
        key: 'status',
        title: 'Trạng thái',
        align: 'center',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (status: string) => {
          if (status === 'active') return <AdminStatusBadge status="success" label="Hoạt động" icon="check_circle" />;
          if (status === 'warning') return <AdminStatusBadge status="warning" label="Chờ duyệt" icon="warning" />;
          return <AdminStatusBadge status="danger" label="Đã khóa" icon="lock" />;
        },
      },`;

const newStatusRender = `      {
        key: 'status',
        title: 'Trạng thái',
        align: 'center',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (_val: string, user: AdminUser) => {
          if (user.status === 'pending_deletion') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Chờ xóa (\${user.remainingDays ?? 7} ngày)</span>
              </span>
            );
          }
          if (user.status === 'deleted') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-300">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Đã xóa</span>
              </span>
            );
          }
          if (user.status === 'active') return <AdminStatusBadge status="success" label="Hoạt động" icon="check_circle" />;
          if (user.status === 'warning') return <AdminStatusBadge status="warning" label="Chờ duyệt" icon="warning" />;
          return <AdminStatusBadge status="danger" label="Đã khóa" icon="lock" />;
        },
      },`;

content = content.replace(oldStatusRender, newStatusRender);

// Update action buttons in columns
const oldActionRender = `            <button
              onClick={() => handleToggleLock(user.id)}
              className={\`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer border \${
                user.status === 'locked'
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }\`}
              title={user.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản trong CSDL'}
            >
              {user.status === 'locked' ? 'Mở Khóa' : 'Khóa'}
            </button>`;

const newActionRender = `            {user.status === 'pending_deletion' || user.status === 'deleted' ? (
              <button
                onClick={() => handleRestoreUser(user.id)}
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 flex items-center gap-1 shadow-2xs"
                title="Mở lại chốt và khôi phục tài khoản nguyên trạng"
              >
                <span className="material-symbols-outlined text-[13px]">restore</span>
                <span>Khôi Phục</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleLock(user.id)}
                className={\`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer border \${
                  user.status === 'locked'
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                }\`}
                title={user.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản trong CSDL'}
              >
                {user.status === 'locked' ? 'Mở Khóa' : 'Khóa'}
              </button>
            )}`;

content = content.replace(oldActionRender, newActionRender);

// 7. Update Tabs in DataTableFilterBar
const oldTabs = `        tabs={[
          { key: 'all', label: 'Tất cả người dùng', count: users.length },
          { key: 'customer', label: 'Độc giả (Customer)', count: kpiStats.customerCount },
          { key: 'business', label: 'Nhà bán sách (Business)', count: kpiStats.businessCount },
          { key: 'staff', label: 'Bưu tá (Shipper)', count: kpiStats.staffCount },
          { key: 'warning', label: 'Khóa / Chờ duyệt', count: kpiStats.lockedOrPendingCount },
        ]}`;

const newTabs = `        tabs={[
          { key: 'all', label: 'Tất cả người dùng', count: users.length },
          { key: 'customer', label: 'Độc giả (Customer)', count: kpiStats.customerCount },
          { key: 'business', label: 'Nhà bán sách (Business)', count: kpiStats.businessCount },
          { key: 'staff', label: 'Bưu tá (Shipper)', count: kpiStats.staffCount },
          { key: 'pending_deletion', label: 'Chờ xóa (7 ngày)', count: kpiStats.pendingDeletionCount },
          { key: 'deleted', label: 'Đã xóa', count: kpiStats.deletedCount },
          { key: 'warning', label: 'Khóa / Chờ duyệt', count: kpiStats.lockedOrPendingCount },
        ]}`;

content = content.replace(oldTabs, newTabs);

// 8. Update Drawer Actions to include Restore button
const oldDrawerAction = `                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleToggleLock(inspectingUser.id)}
                    className={\`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs \${
                      inspectingUser.status === 'locked'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }\`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {inspectingUser.status === 'locked' ? 'lock_open' : 'lock'}
                    </span>
                    <span>{inspectingUser.status === 'locked' ? 'Mở Khóa Tài Khoản (DB)' : 'Khóa Tài Khoản (DB)'}</span>
                  </button>`;

const newDrawerAction = `                <div className="flex flex-wrap gap-2">
                  {(inspectingUser.status === 'pending_deletion' || inspectingUser.status === 'deleted') && (
                    <button
                      onClick={() => handleRestoreUser(inspectingUser.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">restore</span>
                      <span>Mở Chốt &amp; Khôi Phục Tài Khoản (DB)</span>
                    </button>
                  )}
                  {inspectingUser.status !== 'deleted' && inspectingUser.status !== 'pending_deletion' && (
                    <button
                      onClick={() => handleToggleLock(inspectingUser.id)}
                      className={\`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs \${
                        inspectingUser.status === 'locked'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }\`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {inspectingUser.status === 'locked' ? 'lock_open' : 'lock'}
                      </span>
                      <span>{inspectingUser.status === 'locked' ? 'Mở Khóa Tài Khoản (DB)' : 'Khóa Tài Khoản (DB)'}</span>
                    </button>
                  )}`;

content = content.replace(oldDrawerAction, newDrawerAction);

fs.writeFileSync(adminUsersViewPath, content, 'utf8');
console.log('Successfully updated AdminUsersView.tsx');


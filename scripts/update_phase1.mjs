import fs from 'fs';
import path from 'path';

// 1. UPDATE AdminBusinessesView.tsx
{
  const filePath = path.join(process.cwd(), 'web/src/ui/components/admin/AdminBusinessesView.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Column title updates
  content = content.replace("title: 'Doanh Nghiệp & Pháp Lý'", "title: 'Doanh nghiệp & MST'");
  content = content.replace("title: 'Đại Diện & Liên Hệ'", "title: 'Người đại diện'");
  content = content.replace("title: 'Loại Hình & Ngày Nộp'", "title: 'Loại hình'");
  content = content.replace("title: 'Trạng Thái'", "title: 'Trạng thái'");
  content = content.replace("title: 'Thao Tác'", "title: 'Thao tác'");

  // Remove raw UUID on main table row
  content = content.replace(/<span className="text-\[10px\] text-gray-400 font-mono">\s*ID: \{biz\.id\}\s*<\/span>/g, '');

  // Improve business name wrapping
  content = content.replace(
    'className="font-bold text-gray-900 block hover:text-[#00875A] cursor-pointer text-xs break-words"',
    'className="font-bold text-gray-900 block hover:text-[#00875A] cursor-pointer text-xs break-words line-clamp-2 leading-snug"'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Updated AdminBusinessesView.tsx');
}

// 2. UPDATE AdminStoresView.tsx
{
  const filePath = path.join(process.cwd(), 'web/src/ui/components/admin/AdminStoresView.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Titles
  content = content.replace("title: 'Cửa Hàng & Đường Dẫn (Slug)'", "title: 'Cửa hàng & Slug'");
  content = content.replace("title: 'Doanh Nghiệp Sở Hữu'", "title: 'Doanh nghiệp chủ quản'");
  content = content.replace("title: 'Liên Hệ & Ngày Tạo'", "title: 'Liên hệ'");
  content = content.replace("title: 'Trạng Thái'", "title: 'Trạng thái'");
  content = content.replace("title: 'Thao Tác'", "title: 'Thao tác'");

  // Anti-AI avatar: replace indigo gradient avatar with clean neutral styling
  content = content.replace(
    'bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-800 font-extrabold text-xs shrink-0',
    'bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 select-none'
  );

  // Remove raw UUIDs: ID: {st.id} and ID DN: {st.businessId...}
  content = content.replace(/<span className="text-\[10px\] text-gray-400 font-mono">\s*ID: \{st\.id\}\s*<\/span>/g, '');
  content = content.replace(/<span className="font-mono text-\[10\.5px\] text-gray-400">\s*ID DN: \{st\.businessId \|\| st\.business\?\.id \|\| '—'\}\s*<\/span>/g, '');

  // Wrap store name
  content = content.replace(
    'className="font-bold text-gray-900 block hover:text-[#00875A] cursor-pointer text-xs break-words"',
    'className="font-bold text-gray-900 block hover:text-[#00875A] cursor-pointer text-xs break-words line-clamp-2 leading-snug"'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Updated AdminStoresView.tsx');
}

// 3. UPDATE AdminPublishersView.tsx
{
  const filePath = path.join(process.cwd(), 'web/src/ui/components/admin/AdminPublishersView.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Titles
  content = content.replace("title: 'Nhà Xuất Bản & Mã Số Thuế'", "title: 'Nhà xuất bản'");
  content = content.replace("title: 'Liên Hệ & Trụ Sở'", "title: 'Trụ sở & Email'");
  content = content.replace("title: 'Quy Mô & Ngày Tham Gia'", "title: 'Đầu sách'");
  content = content.replace("title: 'Trạng Thái'", "title: 'Trạng thái'");
  content = content.replace("title: 'Thao Tác'", "title: 'Thao tác'");

  // Remove truncate from publisher name and addresses, replace with line-clamp / break-words
  content = content.replace(
    'className="font-bold text-gray-900 hover:text-[#00875A] transition-colors leading-snug truncate cursor-pointer text-xs"',
    'className="font-bold text-gray-900 hover:text-[#00875A] transition-colors leading-snug break-words line-clamp-2 cursor-pointer text-xs"'
  );
  content = content.replace(
    'className="truncate">{p.email || \'Chưa có\'}</span>',
    'className="break-words line-clamp-1">{p.email || \'Chưa có\'}</span>'
  );
  content = content.replace(
    'className="truncate" title={p.address}>{p.address || \'Chưa cập nhật\'}</span>',
    'className="break-words line-clamp-1" title={p.address}>{p.address || \'Chưa cập nhật\'}</span>'
  );

  // Anti-AI avatar
  content = content.replace(
    'bg-emerald-50 text-[#00875A] font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200/60',
    'bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 select-none'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Updated AdminPublishersView.tsx');
}

// 4. UPDATE AdminBusinessUpdateRequestsView.tsx
{
  const filePath = path.join(process.cwd(), 'web/src/ui/components/admin/AdminBusinessUpdateRequestsView.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Titles
  content = content.replace('>Doanh Nghiệp &amp; Mã Số Thuế</th>', '>Doanh nghiệp & MST</th>');
  content = content.replace('>Nội Dung Đề Xuất Thay Đổi</th>', '>Đề xuất thay đổi</th>');
  content = content.replace('>Thời Gian Gửi</th>', '>Ngày gửi</th>');
  content = content.replace('>Trạng Thái &amp; Thao Tác</th>', '>Trạng thái & Thao tác</th>');

  // Remove truncate from business name
  content = content.replace(
    'className="font-bold text-gray-900 group-hover:text-[#00875A] transition-colors cursor-pointer block truncate max-w-[240px]"',
    'className="font-bold text-gray-900 group-hover:text-[#00875A] transition-colors cursor-pointer block break-words line-clamp-2 leading-snug"'
  );
  // Remove truncate from changes
  content = content.replace(
    'className="text-gray-800 font-medium text-xs truncate max-w-[280px]"',
    'className="text-gray-800 font-medium text-xs break-words line-clamp-2 leading-snug"'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Updated AdminBusinessUpdateRequestsView.tsx');
}

// 5. UPDATE AdminPublisherLeadsView.tsx
{
  const filePath = path.join(process.cwd(), 'web/src/ui/components/admin/AdminPublisherLeadsView.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Titles
  content = content.replace('>Đơn Vị / NXB Đăng Ký</th>', '>Đơn vị / NXB</th>');
  content = content.replace('>Mã Số Thuế &amp; Đại Diện</th>', '>Mã số thuế</th>');
  content = content.replace('>Email &amp; Trụ Sở</th>', '>Liên hệ & Trụ sở</th>');
  content = content.replace('>Ngày Nộp</th>', '>Ngày nộp</th>');
  content = content.replace('>Trạng Thái &amp; Thao Tác</th>', '>Trạng thái & Thao tác</th>');

  // Remove truncate from lead name
  content = content.replace(
    'className="font-bold text-gray-900 leading-snug truncate hover:text-[#00875A] cursor-pointer"',
    'className="font-bold text-gray-900 leading-snug break-words line-clamp-2 hover:text-[#00875A] cursor-pointer"'
  );

  // Remove raw UUID on lead row
  content = content.replace(
    /<div className="text-\[10px\] text-gray-400 font-mono truncate">\s*ID: \{lead\.id\?\.substring\(0, 10\)\}\.\.\.\s*<\/div>/g,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Updated AdminPublisherLeadsView.tsx');
}

# WORKFLOW - Git & Conventions

> Quy trình Git và conventions cho HUKI EBOOK
> Last updated: 2026-08-24

---

## 🌿 Git Workflow

### Branches

| Branch | Purpose | Protected |
|--------|---------|-----------|
| `main` | Production code | ✅ Yes |
| `develop` | Development branch | ✅ Yes |
| `feature/*` | New features | No |
| `fix/*` | Bug fixes | No |
| `hotfix/*` | Emergency fixes | No |
| `docs/*` | Documentation only | No |
| `refactor/*` | Code refactoring | No |

### Naming Convention

```bash
feature/<short-description>     # feature/add-payment-vnpay
fix/<short-description>         # fix/cart-quantity-bug
docs/<short-description>        # docs/update-api-reference
refactor/<short-description>    # refactor/user-service
hotfix/<short-description>      # hotfix/payment-webhook-down
```

### Workflow Steps

```bash
# 1. Bắt đầu feature mới
git checkout develop
git pull origin develop
git checkout -b feature/<name>

# 2. Commit changes
git add -A
git commit -m "feat(scope): short description"

# 3. Push feature branch
git push origin feature/<name>

# 4. Tạo PR (optional) hoặc merge trực tiếp

# 5. Merge vào develop
git checkout develop
git pull origin develop
git merge feature/<name>
git push origin develop

# 6. Khi đã stable → merge vào main
git checkout main
git pull origin main
git merge develop
git push origin main
```

---

## 📝 Commit Message Convention

### Format

```
<type>(<scope>): <short description>

<longer description>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Add/update tests |
| `chore` | Build, deps, config |

### Scopes

| Scope | Description |
|-------|-------------|
| `auth` | Authentication |
| `user` | User management |
| `business` | Business |
| `book` | Book CRUD |
| `cart` | Cart |
| `order` | Orders |
| `payment` | Payments |
| `ship` | Shipping |
| `chat` | Chat |
| `review` | Reviews |
| `forum` | Forum |
| `notify` | Notifications |
| `voucher` | Vouchers |
| `banner` | Banners |
| `flash` | Flash sales |
| `db` | Database/Prisma |
| `event` | Events |
| `shared` | Shared libs |

### Examples

```bash
feat(auth): add refresh token rotation
fix(cart): resolve quantity overflow bug
docs(api): update endpoint reference
refactor(user): simplify profile service
test(payment): add webhook tests
chore(deps): update nestjs to v10
```

---

## 🔄 Git Operations

### Pull Before Push (BẮT BUỘC)

```bash
# Trước khi push, LUÔN pull về trước
git pull origin <branch> --rebase

# Nếu có conflict:
# 1. Resolve conflicts
# 2. git add -A
# 3. git rebase --continue
# 4. git push origin <branch>
```

### Handle Conflicts

```bash
# Khi merge có conflict:
# 1. git status (xem files conflict)
# 2. Mở từng file, resolve conflict markers (<<<<, ====, >>>>)
# 3. git add <resolved-files>
# 4. git commit (hoặc git rebase --continue)
```

---

## 📊 Report Conventions

### Session Reports

**Location:** `res/claude/YYYY-MM-DD-sessionN.md`

**Naming:**
- `2026-08-24-session1.md`
- `2026-08-24-session2.md`
- (Nếu nhiều sessions trong 1 ngày)

### Update Frequencies

| File | Khi nào update |
|------|---------------|
| `PROJECT-STATE.md` | Sau mỗi phiên có thay đổi lớn |
| `SESSION-LOG.md` | Sau mỗi phiên |
| `res/claude/*.md` | Sau mỗi phiên (báo cáo) |
| `docs/` | Khi API thay đổi |
| `flow/` | Khi flow business thay đổi |
| `err/CODES/` | Khi thêm error mới |

---

## 🧪 Testing Before Commit

```bash
# 1. Type check
cd platform
npx tsc -p apps/<service>/tsconfig.app.json --noEmit

# 2. Build
npx nest build <service>

# 3. Run tests (if any)
npm test

# 4. Lint
npm run lint

# 5. Commit
git add -A
git commit -m "..."
```

---

## 🚀 Deployment Workflow

### Development
```bash
git checkout develop
git pull
docker-compose up -d
```

### Production
```bash
git checkout main
git pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📋 Checklist Mỗi Phiên

### Start
- [ ] Đọc `.agent/CLAUDE.md`
- [ ] Đọc `.agent/PROJECT-STATE.md`
- [ ] Đọc `.agent/SESSION-LOG.md`
- [ ] Git pull develop
- [ ] Tạo branch mới (nếu có task mới)

### During
- [ ] Commit với message rõ ràng
- [ ] Update docs nếu thay đổi API
- [ ] Update PROJECT-STATE.md nếu cần
- [ ] Test build trước khi commit

### End
- [ ] Append session vào SESSION-LOG.md
- [ ] Tạo báo cáo trong `res/claude/`
- [ ] Git pull trước khi push
- [ ] Hỏi user: "Push và merge develop không?"
- [ ] Nếu có → push → merge develop → merge main

---

## ❌ Anti-patterns (TRÁNH)

- ❌ Commit trực tiếp vào main
- ❌ Push không pull trước
- ❌ Commit message mơ hồ ("update", "fix", etc.)
- ❌ Bỏ qua conflict resolution
- ❌ Không update docs khi code đổi
- ❌ Không tạo session report
- ❌ Branch tên không theo convention

---

## 🔗 Quick Commands

```bash
# Xem state hiện tại
git status
git branch
git log --oneline -10

# Switch branch
git checkout <branch>

# Tạo + switch
git checkout -b <branch>

# Sync với remote
git fetch origin
git pull origin <branch>

# Push
git push origin <branch>

# Stash changes
git stash
git stash pop

# Discard changes
git checkout -- <file>
git reset --hard HEAD
```

---

*Maintained by: Claude*
*Version: 1.0*
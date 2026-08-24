# ONBOARDING PROMPT

> **Copy và paste đoạn dưới vào Claude (hoặc agent khác) khi bắt đầu phiên mới**

---

```
Bạn đang làm việc trong project HUKI EBOOK. Đây là microservice platform cho ebook.

## BƯỚC 1: ĐỌC FILE NÀY TRƯỚC (BẮT BUỘC)
Đọc các file sau theo thứ tự:
1. /CLAUDE.md - Quy trình làm việc & project structure
2. /PROJECT-STATE.md - State hiện tại của project
3. /SESSION-LOG.md - Lịch sử các phiên trước
4. /WORKFLOW.md - Git workflow & conventions

## BƯỚC 2: ĐỌC CODE CHÍNH
5. /../docs/04-API-REFERENCE/README.md - API patterns
6. /../res/DOMAIN/*.md - Domain schemas (user, book, order, etc.)
7. /../flow/*.md - Business flows
8. /../err/CODES/*.md - Error codes

## BƯỚC 3: XÁC NHẬN CONTEXT
Sau khi đọc, xác nhận:
- Tech stack: NestJS microservices + Next.js + Flutter + RabbitMQ + PostgreSQL + MongoDB
- 7 services: identity, business, commerce, shipping, community, promotion, api-gateway
- 143+ API endpoints
- Event-driven với outbox pattern
- Current branch: develop

## BƯỚC 4: LÀM VIỆC
- Tạo branch mới theo convention (feature/*, fix/*, docs/*)
- Commit message theo convention (feat/fix/docs/refactor)
- Update docs khi API thay đổi
- Sau khi xong → tạo báo cáo trong /../res/claude/
- Append session vào /SESSION-LOG.md
- Hỏi user: "Push và merge develop không?"

## NGUYÊN TẮC
- KHÔNG tự ý push main
- LUÔN pull trước khi push
- LUÔN update PROJECT-STATE.md nếu thay đổi lớn
- LUÔN tạo session report
- LUÔN commit với message rõ ràng
```

---

## 📋 Quick Onboarding (30 giây)

```
Project: HUKI EBOOK - Microservice ebook platform
Stack: NestJS + Next.js + Flutter + RabbitMQ + PostgreSQL + MongoDB
Services: 7 (identity, business, commerce, shipping, community, promotion, gateway)
APIs: 143+ endpoints
Branch: develop (main = production)

Workflow:
1. Read .agent/ files
2. Create branch (feature/*, fix/*, docs/*)
3. Code → Test → Commit
4. Update docs
5. Create session report in res/claude/
6. Ask: "Push và merge develop không?"

Rules:
- Don't auto-push to main
- Always pull before push
- Update PROJECT-STATE.md
- Create session report
```

---

## 🚀 Cheat Sheet

| Command | Purpose |
|---------|---------|
| `git status` | Check state |
| `git checkout -b feature/<name>` | New branch |
| `git commit -m "feat(scope): desc"` | Commit |
| `git push origin <branch>` | Push |
| `git pull origin develop --rebase` | Sync |
| `cd platform && npx nest build <service>` | Build |
| `npx prisma generate` | Generate client |
| `npx prisma migrate dev` | Run migrations |

---

## 🔗 File Map

```
.agent/
├── CLAUDE.md            ← READ FIRST
├── PROJECT-STATE.md     ← Current state
├── SESSION-LOG.md       ← History
├── WORKFLOW.md          ← Git workflow
├── ONBOARDING-PROMPT.md ← This file
└── TEMPLATES/
    ├── session-report.md
    └── feature-task.md
```

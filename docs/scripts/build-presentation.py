#!/usr/bin/env python3
"""Build OEX presentation deck per docs/Note.md slide criteria (10 pts)."""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
IMAGES = DOCS / "images"
OUT = DOCS / "OEX_Presentation.pptx"

# Slide size 16:9
W = Inches(13.333)
H = Inches(7.5)

# Colors — academic / OEX brand
NAVY = RGBColor(0x00, 0x20, 0x60)
ACCENT = RGBColor(0xC4, 0x41, 0x33)
DARK = RGBColor(0x1A, 0x1A, 0x2E)
GRAY = RGBColor(0x55, 0x55, 0x55)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = RGBColor(0xF4, 0xF6, 0xFA)


def set_slide_bg(slide, color: RGBColor) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, left, top, width, height, color: RGBColor) -> None:
    shape = slide.shapes.add_shape(1, left, top, width, height)  # MSO_SHAPE.RECTANGLE
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def textbox(slide, left, top, width, height, text, *, size=18, bold=False,
            color=DARK, align=PP_ALIGN.LEFT, font="Times New Roman"):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def bullets(slide, left, top, width, height, items, *, size=16, color=DARK):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = item
        p.level = 0
        p.font.name = "Times New Roman"
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.space_after = Pt(6)
    return box


def add_image(slide, path: Path, left, top, width, height=None):
    if not path.exists():
        textbox(slide, left, top, width, Inches(0.5), f"[Missing: {path.name}]", size=12, color=ACCENT)
        return
    slide.shapes.add_picture(str(path), left, top, width=width, height=height)


def slide_header(slide, title: str, subtitle: str = "") -> None:
    set_slide_bg(slide, LIGHT_BG)
    add_rect(slide, Inches(0), Inches(0), W, Inches(1.05), NAVY)
    textbox(slide, Inches(0.6), Inches(0.22), Inches(12), Inches(0.6),
            title, size=28, bold=True, color=WHITE)
    if subtitle:
        textbox(slide, Inches(0.6), Inches(0.72), Inches(12), Inches(0.35),
                subtitle, size=14, color=RGBColor(0xCC, 0xDD, 0xFF))


def build() -> None:
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    blank = prs.slide_layouts[6]

    # ── 1. Title Slide (0.5) ─────────────────────────────────────────────
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    add_rect(s, Inches(0), Inches(0), W, Inches(0.12), ACCENT)
    textbox(s, Inches(0.8), Inches(1.2), Inches(11.5), Inches(1.2),
            "OEX — Online Examination System", size=40, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    textbox(s, Inches(0.8), Inches(2.5), Inches(11.5), Inches(0.8),
            "Hệ thống thi trắc nghiệm trực tuyến — Tạo đề · Gán bài · Làm bài · Chấm tự động",
            size=20, color=RGBColor(0xBB, 0xCC, 0xEE), align=PP_ALIGN.CENTER)
    textbox(s, Inches(0.8), Inches(4.2), Inches(11.5), Inches(0.5),
            "Sinh viên: Hồ Tiến Huy  ·  MSSV: K23DTCN138  ·  Lớp: DTCXN02-K",
            size=18, color=WHITE, align=PP_ALIGN.CENTER)
    textbox(s, Inches(0.8), Inches(4.85), Inches(11.5), Inches(0.5),
            "Môn: Phát triển phần mềm hướng dịch vụ  ·  GVHD: Huỳnh Trung Trụ",
            size=16, color=RGBColor(0xAA, 0xBB, 0xDD), align=PP_ALIGN.CENTER)
    textbox(s, Inches(0.8), Inches(6.2), Inches(11.5), Inches(0.4),
            "Học viện Công nghệ Bưu chính Viễn thông  ·  TP.HCM, 06/2026",
            size=14, color=RGBColor(0x88, 0x99, 0xBB), align=PP_ALIGN.CENTER)

    # ── 2. Project Overview (0.5) ────────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Tổng quan dự án", "Project Overview")
    bullets(s, Inches(0.7), Inches(1.4), Inches(5.8), Inches(5.5), [
        "Tầm nhìn: Nền tảng web hỗ trợ tổ chức thi trắc nghiệm trực tuyến cho quy mô lớp học (~100–500 người).",
        "Mục đích cốt lõi: Số hóa quy trình kiểm tra — giảm in ấn, chấm thủ công, khó kiểm soát thời gian.",
        "Ba vai trò người dùng: Admin · Teacher · Student.",
        "Luồng nghiệp vụ chính: Soạn ngân hàng câu → Tạo & publish đề → Gán học sinh → Làm bài online → Chấm điểm tự động.",
        "Phiên bản v1 hoàn thiện: 81 API tests pass, OpenAPI contract, UI tiếng Anh.",
    ], size=17)
    add_image(s, IMAGES / "diagram-00-client-server.png", Inches(6.8), Inches(1.5), Inches(5.8))

    # ── 3. Problem Statement (0.5) ───────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Vấn đề & Nhu cầu", "Problem Statement")
    items = [
        ("In ấn & phân phát đề", "Chi phí cao, khó cập nhật khi có lỗi trong đề thi."),
        ("Chấm bài thủ công", "Tốn thời gian giáo viên, dễ sai sót với lớp đông."),
        ("Kiểm soát thời gian", "Khó đảm bảo mọi học sinh nộp bài đúng giờ trong thi giấy."),
        ("Nền tảng thương mại", "Phức tạp, tốn phí, không phù hợp quy mô một lớp/một môn."),
        ("Mục tiêu học tập PMHDV", "Rèn thiết kế API contract-first, tách FE/BE, bảo mật JWT, kiểm thử API."),
    ]
    y = 1.35
    for title, desc in items:
        textbox(s, Inches(0.7), Inches(y), Inches(11.5), Inches(0.35), title, size=17, bold=True, color=NAVY)
        textbox(s, Inches(1.0), Inches(y + 0.38), Inches(11), Inches(0.45), desc, size=15, color=GRAY)
        y += 0.95

    # ── 4. Proposed Solution (0.5) ───────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Giải pháp đề xuất", "Proposed Solution")
    cols = [
        ("Vấn đề", "Giải pháp OEX"),
        ("Tạo & quản lý đề", "Teacher CRUD môn/câu/đề, publish, gán trực tiếp học sinh"),
        ("Làm bài trực tuyến", "Student My Exams → Start → Timer + auto-save + auto-submit"),
        ("Chấm điểm", "gradeAttemptInTx: so sánh đáp án, tính điểm ngay khi nộp"),
        ("Phân quyền", "JWT + requireRole(ADMIN|TEACHER|STUDENT), ẩn isCorrect khi thi"),
        ("Triển khai", "Vue SPA + Express API + PostgreSQL, Docker local dev"),
    ]
    tbl = s.shapes.add_table(len(cols), 2, Inches(0.7), Inches(1.45), Inches(11.8), Inches(5.2)).table
    tbl.columns[0].width = Inches(3.2)
    tbl.columns[1].width = Inches(8.6)
    for r, (c0, c1) in enumerate(cols):
        for c, txt in enumerate((c0, c1)):
            cell = tbl.cell(r, c)
            cell.text = txt
            for p in cell.text_frame.paragraphs:
                p.font.name = "Times New Roman"
                p.font.size = Pt(15 if r else 16)
                p.font.bold = r == 0
                p.font.color.rgb = NAVY if r == 0 else DARK

    # ── 5. Tech Stack (1) ────────────────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Công nghệ sử dụng", "Tech Stack")
    stacks = [
        ("Frontend", "Vue.js 3.5 · Vite 7 · TypeScript · Pinia · Vue Router · Axios · Custom CSS"),
        ("Backend", "Node.js 20 LTS · Express 5 · TypeScript · Prisma 6 · Zod · JWT · bcrypt"),
        ("Database", "PostgreSQL 15 (Docker Compose) · Prisma ORM · Migration + Seed"),
        ("Dev & Test", "Vitest + Supertest (81 tests) · tsx · dotenv · OpenAPI 3.0.3"),
        ("IDE & Tools", "Cursor / VS Code · Git · Docker Desktop · Playwright (screenshots)"),
        ("Deploy", "REST /api/v1 · CORS · .env config · docs/DEPLOY.md"),
    ]
    y = 1.35
    for label, detail in stacks:
        add_rect(s, Inches(0.7), Inches(y), Inches(2.2), Inches(0.55), NAVY)
        textbox(s, Inches(0.85), Inches(y + 0.1), Inches(2.0), Inches(0.4), label, size=14, bold=True, color=WHITE)
        textbox(s, Inches(3.1), Inches(y + 0.08), Inches(9.3), Inches(0.5), detail, size=15, color=DARK)
        y += 0.85

    # ── 6. Core Features (1) ─────────────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Tính năng tiêu biểu", "Core Features")
    features = [
        ("1. Quản lý ngân hàng đề (Teacher)", "CRUD môn học, câu MCQ một đáp án đúng, độ khó & điểm số."),
        ("2. Tạo & gán đề thi (Teacher)", "Cấu hình thời gian, publish DRAFT→PUBLISHED, gán học sinh, xem kết quả lớp."),
        ("3. Làm bài online (Student)", "Timer đếm ngược, navigator câu hỏi, auto-save 500ms, submit thủ công/tự động."),
        ("4. Chấm điểm & bảo mật (System)", "Chấm trong transaction, ẩn đáp án đúng khi IN_PROGRESS, JWT role guard."),
    ]
    for i, (title, desc) in enumerate(features):
        col = i % 2
        row = i // 2
        x = Inches(0.7 + col * 6.2)
        y = Inches(1.4 + row * 2.85)
        add_rect(s, x, y, Inches(5.8), Inches(2.5), WHITE)
        add_rect(s, x, y, Inches(5.8), Inches(0.55), ACCENT)
        textbox(s, x + Inches(0.2), y + Inches(0.08), Inches(5.4), Inches(0.45), title, size=16, bold=True, color=WHITE)
        textbox(s, x + Inches(0.2), y + Inches(0.65), Inches(5.4), Inches(1.7), desc, size=15, color=DARK)

    # ── 7. System Architecture (1) ─────────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Kiến trúc hệ thống", "System Architecture — Client–Server 3 tầng")
    add_image(s, IMAGES / "diagram-00-client-server.png", Inches(0.5), Inches(1.25), Inches(5.5))
    add_image(s, IMAGES / "diagram-01-backend-layers.png", Inches(6.3), Inches(1.25), Inches(6.4))
    textbox(s, Inches(0.5), Inches(5.0), Inches(12.2), Inches(1.8),
            "Luồng request: Browser (Vue 5173) → HTTP/JSON + JWT → Express (3000/api/v1) "
            "→ Routes → Middleware → Controllers → Services → Prisma → PostgreSQL. "
            "Frontend: AppLayout → Router guard → Views → Pinia + Axios.",
            size=14, color=GRAY)

    # ── 8. Development Timeline (1) ──────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Quy trình phát triển", "Development Timeline")
    phases = [
        ("Tuần 1–2", "Khảo sát & phân tích", "Actor, phạm vi v1, basic_requirement.md"),
        ("Tuần 2–3", "Thiết kế CSDL & API", "ERD, Prisma schema, OpenAPI"),
        ("Tuần 3–6", "Backend", "Auth, CRUD, attempt, grading — 81 tests"),
        ("Tuần 5–8", "Frontend", "18 views, 3 role, exam taking UI"),
        ("Tuần 7–9", "Kiểm thử & tích hợp", "Vitest, E2E smoke, manual checklist"),
        ("Tuần 9–10", "Triển khai & tài liệu", "Docker, seed, DEPLOY.md, báo cáo"),
    ]
    y = 1.35
    for week, phase, output in phases:
        add_rect(s, Inches(0.7), Inches(y), Inches(1.5), Inches(0.7), NAVY)
        textbox(s, Inches(0.75), Inches(y + 0.12), Inches(1.4), Inches(0.5), week, size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        textbox(s, Inches(2.4), Inches(y + 0.05), Inches(3.5), Inches(0.4), phase, size=16, bold=True, color=NAVY)
        textbox(s, Inches(2.4), Inches(y + 0.42), Inches(9.0), Inches(0.35), output, size=14, color=GRAY)
        if y < 5.5:
            add_rect(s, Inches(1.45), Inches(y + 0.7), Inches(0.04), Inches(0.35), ACCENT)
        y += 0.95

    # ── 9. UI/UX Showcase (2 pts) — multiple slides ──────────────────────
    ui_slides = [
        ("Đăng nhập & Dashboard", "01-login.png", "02-dashboard-teacher.png",
         "Split layout login · Dashboard thống kê môn/đề cho Teacher"),
        ("Quản lý môn & câu hỏi", "03-subjects.png", "04-question-bank.png",
         "CRUD môn học · Ngân hàng câu MCQ với filter độ khó"),
        ("Soạn câu hỏi & Đề thi", "05-question-form.png", "07-exam-detail.png",
         "Form MCQ A/B/C/D · Exam detail: settings, questions, assign"),
        ("Kết quả & Admin", "08-exam-results.png", "10-user-management.png",
         "Teacher xem điểm lớp · Admin CRUD user Teacher/Student"),
        ("Luồng học sinh", "11-my-exams.png", "12-take-exam.png",
         "My Exams · Take Exam: timer, progress bar, question navigator"),
        ("Kết quả học sinh", "13-result.png", None,
         "Điểm tổng + review từng câu sau khi nộp bài"),
    ]
    for title, img1, img2, caption in ui_slides:
        s = prs.slides.add_slide(blank)
        slide_header(s, "Trình diễn giao diện", f"UI/UX Showcase — {title}")
        add_image(s, IMAGES / img1, Inches(0.5), Inches(1.2), Inches(6.1))
        if img2:
            add_image(s, IMAGES / img2, Inches(6.8), Inches(1.2), Inches(6.1))
        textbox(s, Inches(0.5), Inches(6.55), Inches(12.2), Inches(0.5), caption, size=14, color=GRAY, align=PP_ALIGN.CENTER)

    # ── 10. Impact & Roadmap (0.5) ───────────────────────────────────────
    s = prs.slides.add_slide(blank)
    slide_header(s, "Kết quả & Định hướng", "Impact & Roadmap")
    textbox(s, Inches(0.7), Inches(1.3), Inches(5.5), Inches(0.4), "Đã đạt được", size=20, bold=True, color=NAVY)
    bullets(s, Inches(0.7), Inches(1.75), Inches(5.8), Inches(4.5), [
        "Luồng v1 end-to-end: user → question → exam → attempt → grade → result",
        "81 API tests pass · E2E smoke · manual checklist 40+ case",
        "JWT + bcrypt + role guard · ẩn đáp án khi thi",
        "OpenAPI contract · Docker · seed data demo",
        "UI đầy đủ 3 role · timer, auto-save, auto-submit",
    ], size=15)
    textbox(s, Inches(6.8), Inches(1.3), Inches(5.5), Inches(0.4), "Hướng phát triển", size=20, bold=True, color=ACCENT)
    bullets(s, Inches(6.8), Inches(1.75), Inches(5.8), Inches(4.5), [
        "Cao: Module lớp học · Import Excel câu hỏi",
        "Trung bình: Xáo trộn câu/đáp án · câu hỏi hình ảnh · biểu đồ thống kê",
        "Thấp: Playwright UI E2E · i18n Việt/Anh",
        "Dài hạn: Tách microservices khi scale lớn",
    ], size=15)

    # ── 11. Q&A (0.5) ────────────────────────────────────────────────────
    s = prs.slides.add_slide(blank)
    set_slide_bg(s, NAVY)
    add_rect(s, Inches(0), Inches(0), W, Inches(0.12), ACCENT)
    textbox(s, Inches(0.8), Inches(2.0), Inches(11.5), Inches(1.0),
            "Cảm ơn thầy và các bạn đã lắng nghe!", size=36, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    textbox(s, Inches(0.8), Inches(3.2), Inches(11.5), Inches(0.6),
            "Q & A — Hỏi đáp", size=28, color=RGBColor(0xBB, 0xCC, 0xEE), align=PP_ALIGN.CENTER)
    textbox(s, Inches(0.8), Inches(4.2), Inches(11.5), Inches(1.2),
            "Hồ Tiến Huy  ·  K23DTCN138  ·  Lớp DTCXN02-K\n"
            "Đề tài: OEX — Online Examination System\n"
            "Demo: http://localhost:5173  ·  API: http://localhost:3000/api/v1\n"
            "Tài khoản: teacher@oex.test / student2@oex.test  ·  Password123!",
            size=16, color=WHITE, align=PP_ALIGN.CENTER)

    prs.save(str(OUT))
    print(f"Saved {OUT.relative_to(ROOT)} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    build()

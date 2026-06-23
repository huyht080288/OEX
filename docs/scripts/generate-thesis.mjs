/**
 * Generates PMHDV-style thesis draft from OEX design (V2).
 * Run: npm install && node generate-thesis.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, '..', 'OEX_PMHDV_Thesis.docx');

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 } });
}

function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}

function p(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bullet(text) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'TRƯỜNG ĐẠI HỌC …', bold: true, size: 26 }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({ text: 'KHOA …', bold: true, size: 26 }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'ĐỒ ÁN / KHÓA LUẬN TỐT NGHIỆP', bold: true, size: 28 }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: 'XÂY DỰNG HỆ THỐNG THI TRẮC NGHIỆM TRỰC TUYẾN (OEX)',
        bold: true,
        size: 32,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: 'Ngành: Phát triển phần mềm hệ thống thông tin', size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: 'Sinh viên thực hiện: …', size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'TP. Hồ Chí Minh, tháng 06 năm 2025', size: 24, italics: true })],
  }),
  new Paragraph({ children: [new PageBreak()] }),

  h1('LỜI CAM ĐOAN'),
  p(
    'Em xin cam đoan đây là công trình nghiên cứu của riêng em. Các số liệu, kết quả trình bày trong đồ án là trung thực và chưa được công bố trong bất kỳ công trình nào khác.',
  ),
  new Paragraph({ children: [new PageBreak()] }),

  h1('MỤC LỤC'),
  bullet('Chương 1. Mở đầu'),
  bullet('Chương 2. Cơ sở lý thuyết và khảo sát'),
  bullet('Chương 3. Phân tích yêu cầu'),
  bullet('Chương 4. Thiết kế hệ thống'),
  bullet('Chương 5. Cài đặt và kiểm thử'),
  bullet('Chương 6. Kết luận và hướng phát triển'),
  new Paragraph({ children: [new PageBreak()] }),

  h1('CHƯƠNG 1. MỞ ĐẦU'),
  h2('1.1. Lý do chọn đề tài'),
  p(
    'Thi trắc nghiệm trực tuyến giúp giảm chi phí in ấn, chấm điểm nhanh và hỗ trợ quản lý kết quả tập trung. Hệ thống OEX (Online Examination System) được xây dựng nhằm đáp ứng nhu cầu tổ chức kỳ thi quy mô vừa và nhỏ (khoảng 100–500 người dùng) với kiến trúc web ba lớp, API REST và cơ sở dữ liệu quan hệ.',
  ),
  h2('1.2. Mục tiêu đề tài'),
  bullet('Xây dựng website thi trắc nghiệm trực tuyến với ba vai trò: Admin, Giáo viên, Sinh viên.'),
  bullet('Triển khai API REST và cơ sở dữ liệu PostgreSQL (Prisma ORM).'),
  bullet('Tự động chấm điểm câu hỏi trắc nghiệm một đáp án đúng.'),
  bullet('Lập tài liệu thiết kế chi tiết và kiểm thử hệ thống.'),
  h2('1.3. Phạm vi'),
  p(
    'Phiên bản v1 tập trung vào luồng cốt lõi: quản lý người dùng (admin), ngân hàng câu hỏi, tạo kỳ thi, gán sinh viên trực tiếp, làm bài có đồng hồ đếm ngược và xem kết quả. Các tính năng như import Excel, chống gian lận, quản lý lớp học và hình ảnh câu hỏi được loại khỏi phạm vi v1.',
  ),

  h1('CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ KHẢO SÁT'),
  h2('2.1. Kiến trúc hệ thống'),
  p(
    'OEX áp dụng mô hình Client–Server ba lớp: Vue 3 SPA (frontend), Node.js Express (backend), PostgreSQL (database). Giao tiếp qua HTTP/JSON và xác thực JWT.',
  ),
  h2('2.2. Công nghệ sử dụng'),
  bullet('Frontend: Vue 3, Vite, TypeScript, Pinia, Vue Router.'),
  bullet('Backend: Node.js, Express, Zod validation, bcrypt, JWT.'),
  bullet('Database: PostgreSQL, Prisma ORM, seed dữ liệu mẫu.'),
  bullet('Triển khai: Docker Compose (PostgreSQL), hướng dẫn trong DEPLOY.md.'),
  h2('2.3. Khảo sát hiện trạng'),
  p(
    'Các hệ thống LMS/thi trực tuyến phổ biến cung cấp ngân hàng câu hỏi, phân quyền và báo cáo. OEX chọn phạm vi tối thiểu phù hợp đồ án: gán sinh viên trực tiếp thay vì module lớp học, một đáp án đúng mỗi câu.',
  ),

  h1('CHƯƠNG 3. PHÂN TÍCH YÊU CẦU'),
  h2('3.1. Tác nhân'),
  bullet('Admin: quản lý tài khoản người dùng.'),
  bullet('Giáo viên: môn học, câu hỏi, kỳ thi, gán sinh viên, xem kết quả.'),
  bullet('Sinh viên: xem kỳ thi được gán, làm bài, xem điểm.'),
  h2('3.2. Yêu cầu chức năng chính'),
  bullet('Đăng nhập, đổi mật khẩu, quản lý người dùng (CRUD, kích hoạt/vô hiệu).'),
  bullet('CRUD môn học, câu hỏi trắc nghiệm (2–6 phương án, một đáp án đúng).'),
  bullet('Tạo kỳ thi: thời gian mở/đóng, thời lượng, số lần làm, hiển thị đáp án sau nộp.'),
  bullet('Làm bài: bắt đầu attempt, lưu đáp án, nộp bài hoặc hết giờ.'),
  bullet('Chấm điểm tự động và xem chi tiết bài làm (giáo viên và sinh viên).'),
  h2('3.3. Yêu cầu phi chức năng'),
  bullet('Bảo mật: mật khẩu băm bcrypt, JWT, phân quyền theo vai trò.'),
  bullet('Hiệu năng: phù hợp quy mô ~100–500 người dùng.'),
  bullet('Giao diện sản phẩm: tiếng Anh (theo quyết định dự án).'),

  h1('CHƯƠNG 4. THIẾT KẾ HỆ THỐNG'),
  h2('4.1. Mô hình dữ liệu'),
  p(
    'Cơ sở dữ liệu gồm 9 bảng chính: users, subjects, questions, question_options, exams, exam_questions, exam_assignments, exam_attempts, attempt_answers. Chi tiết ERD và ràng buộc xem tài liệu OEX_DetailedDesign_V2.md mục 8.',
  ),
  h2('4.2. Thiết kế API'),
  p(
    'API REST phiên bản /api/v1: auth (login, me, change-password), users (admin), subjects, questions, exams (publish, assign, results, attempt detail), attempts (start, save, submit, result), my-exams, students. Đặc tả OpenAPI: docs/api/openapi.yaml.',
  ),
  h2('4.3. Thiết kế giao diện'),
  bullet('/login — đăng nhập'),
  bullet('/ — dashboard theo vai trò'),
  bullet('/admin/users — quản lý người dùng'),
  bullet('/subjects, /exams — luồng giáo viên'),
  bullet('/my-exams, /take/:attemptId, /results/:attemptId — luồng sinh viên'),
  bullet('/account — đổi mật khẩu'),

  h1('CHƯƠNG 5. CÀI ĐẶT VÀ KIỂM THỬ'),
  h2('5.1. Cài đặt'),
  p(
    'Môi trường phát triển: Docker Compose khởi chạy PostgreSQL; backend chạy migrate và seed; frontend kết nối API qua VITE_API_BASE_URL. Hướng dẫn đầy đủ trong README.md và DEPLOY.md.',
  ),
  h2('5.2. Kiểm thử'),
  bullet('Kiểm thử tích hợp API (Vitest + Supertest): 81 test case, 0 lỗi.'),
  bullet('Kiểm thử E2E luồng sinh viên: đăng nhập → làm bài → nộp → xem kết quả.'),
  bullet('Kiểm thử thủ công: docs/MANUAL_TEST_CHECKLIST.md.'),
  h2('5.3. Kết quả đạt được'),
  p(
    'Hệ thống hoàn thiện luồng nghiệp vụ cốt lõi theo thiết kế V2. Các khoảng trống ban đầu (GAP-01 admin UI, GAP-02 đổi mật khẩu, GAP-03 chi tiết attempt giáo viên) đã được bổ sung trong Phase 8.',
  ),

  h1('CHƯƠNG 6. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN'),
  h2('6.1. Kết luận'),
  p(
    'Đồ án đã xây dựng thành công hệ thống thi trắc nghiệm trực tuyến OEX với kiến trúc rõ ràng, API đầy đủ và giao diện cho ba vai trò. Hệ thống đáp ứng yêu cầu môn Phát triển phần mềm hệ thống thông tin về website, API và cơ sở dữ liệu.',
  ),
  h2('6.2. Hướng phát triển'),
  bullet('Import câu hỏi từ Excel.'),
  bullet('Module lớp học và gán theo lớp.'),
  bullet('Chống gian lận (phát hiện chuyển tab, toàn màn hình).'),
  bullet('Thống kê biểu đồ và xuất báo cáo PDF/Excel.'),
  bullet('Hỗ trợ hình ảnh trong đề bài và xáo trộn câu hỏi/đáp án.'),
];

const doc = new Document({
  sections: [{ properties: {}, children }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`Written: ${outPath}`);

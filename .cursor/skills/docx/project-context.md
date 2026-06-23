# PMHDV — Document Context

## Purpose

PMHDV (Phần mềm quản lý hướng dẫn viên) project documents live in `docs/`. Use the docx skill for formal deliverables that must open correctly in Microsoft Word.

## Typical documents

| Document | Notes |
|----------|-------|
| Đặc tả yêu cầu (SRS) | Numbered sections, TOC, tables for actors/use cases |
| Thiết kế hệ thống | Diagrams as images; consistent heading hierarchy |
| Báo cáo đồ án | Cover page, mục lục, chapters with Heading 1–3 |
| Hướng dẫn sử dụng | Screenshots with captions; step lists via numbering config |
| Biên bản / hợp đồng HDV | Tab stops for signatory lines; date right-aligned |

## Formatting defaults (PMHDV)

- **Paper:** A4, margins 2.5 cm (≈ 1417 DXA) or 2 cm (≈ 1134 DXA) per school template
- **Body font:** Times New Roman 13pt (size 26 in half-points) or Arial 12pt — pick one per document and stay consistent
- **Headings:** Bold; use built-in Heading 1–3 with `outlineLevel` for TOC
- **Line spacing:** 1.15–1.5 for body text in academic reports
- **Page numbers:** Footer, centered or right-aligned

## Vietnamese typography

- Use real Vietnamese characters in source text (ă, â, đ, ê, ô, ơ, ư and tones)
- In XML edits, escape `&` as `&amp;`; use smart-quote entities for apostrophes in new content
- Date format: `dd/MM/yyyy` or `ngày … tháng … năm …` for formal letters

## Workflow checklist

```
- [ ] Confirm document type and audience
- [ ] Choose create (docx-js) vs edit (unpack → XML → pack)
- [ ] Set A4 page size and margins explicitly
- [ ] Build TOC only from HeadingLevel paragraphs
- [ ] Validate: python scripts/office/validate.py output.docx
- [ ] Save to docs/ with clear filename (e.g. PMHDV_BaoCao_V1.docx)
```

## Filename convention

```
PMHDV_<LoaiTaiLieu>_<PhienBan>.docx
```

Examples: `PMHDV_SRS_V1.docx`, `PMHDV_HuongDanSuDung_V1.docx`

"""Resume builder: HTML preview/PDF export from structured resume data."""

from __future__ import annotations

import html
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, ListFlowable, ListItem


def _esc(value: object) -> str:
    return html.escape(str(value or "").strip())


def _list(value) -> list:
    return value if isinstance(value, list) else []


def normalize_resume(data: dict | None) -> dict:
    data = data if isinstance(data, dict) else {}
    contact = data.get("contact") if isinstance(data.get("contact"), dict) else {}
    experience = []
    for item in _list(data.get("experience")):
        if isinstance(item, dict):
            experience.append(
                {
                    "title": str(item.get("title") or "").strip(),
                    "company": str(item.get("company") or "").strip(),
                    "duration": str(item.get("duration") or "").strip(),
                    "description": str(item.get("description") or "").strip(),
                }
            )
    education = []
    for item in _list(data.get("education")):
        if isinstance(item, dict):
            education.append(
                {
                    "degree": str(item.get("degree") or "").strip(),
                    "institution": str(item.get("institution") or "").strip(),
                    "year": str(item.get("year") or "").strip(),
                }
            )
    projects = []
    for item in _list(data.get("projects")):
        if isinstance(item, dict):
            tech = item.get("technologies") or []
            if isinstance(tech, str):
                tech = [t.strip() for t in tech.split(",") if t.strip()]
            projects.append(
                {
                    "name": str(item.get("name") or "").strip(),
                    "description": str(item.get("description") or "").strip(),
                    "technologies": [str(t).strip() for t in tech if str(t).strip()],
                }
            )
    skills = [str(s).strip() for s in _list(data.get("skills")) if str(s).strip()]
    return {
        "name": str(data.get("name") or contact.get("name") or "").strip(),
        "headline": str(data.get("headline") or "").strip(),
        "summary": str(data.get("summary") or "").strip(),
        "contact": {
            "email": str(contact.get("email") or data.get("email") or "").strip(),
            "phone": str(contact.get("phone") or data.get("phone") or "").strip(),
            "location": str(contact.get("location") or data.get("location") or "").strip(),
            "linkedin": str(contact.get("linkedin") or data.get("linkedin") or "").strip(),
            "github": str(contact.get("github") or data.get("github") or "").strip(),
            "website": str(contact.get("website") or data.get("website") or "").strip(),
        },
        "skills": skills,
        "experience": experience,
        "education": education,
        "projects": projects,
    }


def render_resume_html(data: dict | None) -> str:
    r = normalize_resume(data)
    contact_bits = [v for v in r["contact"].values() if v]
    contact = " · ".join(_esc(x) for x in contact_bits)

    def section(title: str, body: str) -> str:
        return f'<section><h2>{_esc(title)}</h2>{body}</section>' if body else ""

    exp = "".join(
        f"""<div class="item"><div class="row"><strong>{_esc(i['title'])}</strong><span>{_esc(i['duration'])}</span></div>
        <div class="muted">{_esc(i['company'])}</div><p>{_esc(i['description'])}</p></div>"""
        for i in r["experience"] if i.get("title") or i.get("company") or i.get("description")
    )
    edu = "".join(
        f"""<div class="item"><div class="row"><strong>{_esc(i['degree'])}</strong><span>{_esc(i['year'])}</span></div>
        <div class="muted">{_esc(i['institution'])}</div></div>"""
        for i in r["education"] if i.get("degree") or i.get("institution")
    )
    proj = "".join(
        f"""<div class="item"><div class="row"><strong>{_esc(i['name'])}</strong><span>{_esc(', '.join(i['technologies']))}</span></div>
        <p>{_esc(i['description'])}</p></div>"""
        for i in r["projects"] if i.get("name") or i.get("description")
    )
    skills = f"<p>{', '.join(_esc(s) for s in r['skills'])}</p>" if r["skills"] else ""
    summary = f"<p>{_esc(r['summary'])}</p>" if r["summary"] else ""

    body = (
        section("Summary", summary)
        + section("Skills", skills)
        + section("Experience", exp)
        + section("Projects", proj)
        + section("Education", edu)
    )
    name = _esc(r["name"] or "Your Name")
    headline = f'<p class="headline">{_esc(r["headline"])}</p>' if r["headline"] else ""
    contact_html = f'<p class="contact">{contact}</p>' if contact else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
body{{font-family:Arial,sans-serif;color:#111;margin:40px;line-height:1.4}} h1{{margin:0;font-size:28px}} .headline{{margin:4px 0 0;color:#333}}
.contact{{margin:6px 0 20px;color:#444;font-size:13px}} h2{{font-size:14px;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px}}
.item{{margin:0 0 10px}} .row{{display:flex;justify-content:space-between;gap:12px}} .muted{{color:#444;font-size:13px}} p{{margin:3px 0;font-size:13px}}
</style></head><body><h1>{name}</h1>{headline}{contact_html}{body or '<p>Add resume content to preview.</p>'}</body></html>"""


def build_resume_pdf(data: dict | None) -> bytes:
    r = normalize_resume(data)
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="RName", parent=styles["Title"], fontSize=22, leading=26, spaceAfter=2, textColor=colors.HexColor("#111111")))
    styles.add(ParagraphStyle(name="RMeta", parent=styles["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#333333"), spaceAfter=8))
    styles.add(ParagraphStyle(name="RSec", parent=styles["Heading2"], fontSize=11, leading=14, spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#111111")))
    styles.add(ParagraphStyle(name="RBody", parent=styles["Normal"], fontSize=9.5, leading=12, spaceAfter=2))
    styles.add(ParagraphStyle(name="RSmall", parent=styles["Normal"], fontSize=9, leading=11, textColor=colors.HexColor("#333333"), spaceAfter=1))
    story = []

    story.append(Paragraph(_esc(r["name"] or "Your Name"), styles["RName"]))
    if r["headline"]:
        story.append(Paragraph(_esc(r["headline"]), styles["RMeta"]))
    contact = " | ".join([v for v in r["contact"].values() if v])
    if contact:
        story.append(Paragraph(_esc(contact), styles["RMeta"]))

    def sec(title: str):
        story.append(Paragraph(_esc(title.upper()), styles["RSec"]))
        story.append(Table([[""]], colWidths=[7.2 * inch], style=TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc"))])))
        story.append(Spacer(1, 2))

    if r["summary"]:
        sec("Summary")
        story.append(Paragraph(_esc(r["summary"]), styles["RBody"]))
    if r["skills"]:
        sec("Skills")
        story.append(Paragraph(_esc(", ".join(r["skills"])), styles["RBody"]))
    if r["experience"]:
        sec("Experience")
        for i in r["experience"]:
            head = " - ".join([x for x in [i.get("title"), i.get("company")] if x])
            if head:
                story.append(Paragraph(f"<b>{_esc(head)}</b>" + (f"  <font color='#444444'>({_esc(i.get('duration',''))})</font>" if i.get("duration") else ""), styles["RBody"]))
            if i.get("description"):
                for line in [l.strip(" -•\t") for l in i["description"].splitlines() if l.strip()]:
                    story.append(Paragraph(f"• {_esc(line)}", styles["RSmall"]))
            story.append(Spacer(1, 2))
    if r["projects"]:
        sec("Projects")
        for i in r["projects"]:
            head = i.get("name", "")
            tech = ", ".join(i.get("technologies") or [])
            if head:
                story.append(Paragraph(f"<b>{_esc(head)}</b>" + (f"  <font color='#444444'>({_esc(tech)})</font>" if tech else ""), styles["RBody"]))
            if i.get("description"):
                story.append(Paragraph(_esc(i["description"]), styles["RSmall"]))
            story.append(Spacer(1, 2))
    if r["education"]:
        sec("Education")
        for i in r["education"]:
            head = " - ".join([x for x in [i.get("degree"), i.get("institution")] if x])
            if head:
                story.append(Paragraph(f"<b>{_esc(head)}</b>" + (f"  <font color='#444444'>({_esc(i.get('year',''))})</font>" if i.get("year") else ""), styles["RBody"]))

    doc.build(story)
    return buf.getvalue()

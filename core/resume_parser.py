"""
core/resume_parser.py
Extracts job titles, skills, certifications, and industries from PDF/DOCX resumes.
Generates targeted search queries from the extracted signals.
"""

import re
from pathlib import Path

SKILL_KEYWORDS = {
    "titles": [
        "procurement manager", "procurement specialist", "procurement analyst",
        "subcontracts manager", "subcontracts administrator", "contract manager",
        "contract administrator", "contract specialist", "contract analyst",
        "vendor manager", "vendor specialist", "supplier manager",
        "supply chain manager", "supply chain analyst", "logistics manager",
        "operations manager", "operations director", "business operations",
        "program manager", "project manager", "project lead",
        "account manager", "account executive", "client success manager",
        "customer success manager", "business development manager",
        "strategic sourcing manager", "category manager",
        "director of procurement", "vp of procurement",
        "purchasing manager", "purchasing agent", "buyer",
        "data analyst", "business analyst", "financial analyst",
        "hr manager", "human resources manager", "talent acquisition",
        "marketing manager", "product manager", "product owner",
    ],
    "tools_systems": [
        "sap", "ariba", "coupa", "oracle", "netsuite", "workday",
        "salesforce", "hubspot", "servicenow", "jira", "confluence",
        "power bi", "tableau", "excel", "sharepoint", "ms office",
        "dynamics", "erp", "crm", "p2p", "procure-to-pay", "s2p",
        "source-to-pay", "ivalua", "jaggaer", "gep smart",
    ],
    "procurement_skills": [
        "strategic sourcing", "category management", "rfp", "rfq",
        "vendor management", "supplier management", "contract negotiation",
        "purchase orders", "purchase requisitions", "spend analysis",
        "cost reduction", "cost savings", "supplier diversity",
        "vendor onboarding", "supplier development", "procurement operations",
        "indirect procurement", "direct procurement", "tail spend",
    ],
    "contract_skills": [
        "far", "dfars", "government contracts", "government contracting",
        "federal contracting", "subcontracts", "prime contractor",
        "teaming agreements", "nda", "msa", "sow", "statement of work",
        "contract lifecycle", "clm", "terms and conditions",
        "intellectual property", "ip rights", "compliance",
    ],
    "certifications": [
        "pmp", "cpm", "csm", "cppo", "cpsm", "cpsd",
        "lean six sigma", "six sigma", "green belt", "black belt",
        "prince2", "agile", "scrum master", "itil",
        "cia", "cpa", "mba", "juris doctor", "jd",
        "p&c license", "insurance license",
    ],
    "industries": [
        "defense", "aerospace", "military", "government",
        "healthcare", "pharma", "biotech", "life sciences",
        "technology", "saas", "fintech", "software",
        "manufacturing", "automotive", "energy", "oil gas",
        "retail", "e-commerce", "logistics", "transportation",
        "financial services", "banking", "insurance",
        "non-profit", "higher education", "university",
    ],
}

QUERY_TEMPLATES = [
    ("{title} remote", "titles"),
    ("{title} hybrid", "titles"),
    ("{title} {industry} remote", "titles+industries"),
    ("{title} {tool} remote", "titles+tools"),
    ("strategic sourcing manager remote", None),
    ("procurement manager remote", None),
    ("contract administrator remote", None),
    ("subcontracts manager defense remote", None),
    ("vendor manager remote", None),
    ("supply chain manager remote", None),
    ("operations manager remote hybrid", None),
    ("program manager remote", None),
]


def _extract_text_pdf(path: str) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception as e:
        raise RuntimeError(f"Could not read PDF: {e}")


def _extract_text_docx(path: str) -> str:
    try:
        from docx import Document
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        raise RuntimeError(f"Could not read DOCX: {e}")


class ResumeParser:
    def parse(self, path: str) -> dict:
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        ext = path.suffix.lower()
        if ext == ".pdf":
            text = _extract_text_pdf(str(path))
        elif ext in (".docx", ".doc"):
            text = _extract_text_docx(str(path))
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        text_lower = text.lower()

        found = {k: [] for k in SKILL_KEYWORDS}
        for category, keywords in SKILL_KEYWORDS.items():
            for kw in keywords:
                if kw.lower() in text_lower:
                    found[category].append(kw)

        suggested = self._build_queries(found)

        return {
            "path": str(path),
            "titles": found["titles"],
            "skills": found["procurement_skills"] + found["contract_skills"],
            "tools": found["tools_systems"],
            "certifications": found["certifications"],
            "industries": found["industries"],
            "all_found": found,
            "suggested_queries": suggested,
            "raw_text_preview": text[:500],
        }

    def _build_queries(self, found: dict) -> list[str]:
        queries = set()

        titles = found["titles"][:4]
        industries = found["industries"][:2]
        tools = found["tools_systems"][:2]

        for title in titles:
            queries.add(f"{title} remote")
            queries.add(f"{title} hybrid")

        for title in titles[:2]:
            for industry in industries[:1]:
                queries.add(f"{title} {industry} remote")

        for title in titles[:2]:
            for tool in tools[:1]:
                queries.add(f"{title} {tool} remote")

        if found["contract_skills"]:
            if "far" in found["contract_skills"] or "dfars" in found["contract_skills"]:
                queries.add("contract administrator FAR DFARS remote")
                queries.add("subcontracts manager defense remote")

        if found["certifications"]:
            for cert in found["certifications"][:2]:
                if titles:
                    queries.add(f"operations manager {cert} remote")

        fallbacks = [
            "procurement manager remote",
            "contract administrator remote",
            "vendor manager remote",
            "supply chain manager remote",
            "operations manager remote",
        ]
        for fb in fallbacks:
            if len(queries) >= 10:
                break
            queries.add(fb)

        return sorted(queries)

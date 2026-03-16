"""
core/scraper.py
Multi-source job scraper using BeautifulSoup.
Searches Indeed, LinkedIn, ZipRecruiter, Glassdoor, and Adzuna.
"""

import logging
import os
import time
import random
from datetime import datetime

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("jobsearch")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


def _mock_jobs(query: str, source: str, n: int = 5) -> list[dict]:
    base_titles = [
        "Senior Procurement Manager", "Contract Administrator",
        "Vendor Manager", "Supply Chain Manager", "Operations Manager",
        "Strategic Sourcing Specialist", "Subcontracts Administrator",
        "Program Manager", "Business Operations Manager", "Category Manager",
    ]
    companies = [
        "Acme Corp", "TechCo Inc", "Defense Solutions LLC", "HealthPlus",
        "GlobalLogistics", "SaaS Ventures", "FedCon Group", "Apex Systems",
        "Innovate Health", "NextGen Tech",
    ]
    locations = ["Remote", "Hybrid - Austin, TX", "Remote US", "Hybrid - McLean, VA",
                 "Remote - East Coast", "Hybrid - San Diego, CA"]
    jobs = []
    for i in range(n):
        jobs.append({
            "title": base_titles[i % len(base_titles)],
            "company": companies[i % len(companies)],
            "location": locations[i % len(locations)],
            "salary": f"${80 + i * 5}K - ${95 + i * 5}K/year",
            "description": f"Exciting {query} opportunity. Remote/Hybrid available.",
            "url": f"https://{source}.com/jobs/{i+1000}",
            "source": source,
            "date_found": datetime.now().strftime("%Y-%m-%d"),
            "query": query,
        })
    return jobs


class JobScraper:
    def __init__(self, cfg):
        self.delay = float(cfg.get("request_delay", 2.0))
        self.max_results = int(cfg.get("max_results_per_query", 25))
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def search(self, profile: dict, progress_cb=None) -> list[dict]:
        use_mock = bool(os.environ.get("MOCK") or os.environ.get("JOBSEARCH_MOCK"))

        queries = [q["query"] if isinstance(q, dict) else q
                   for q in profile.get("queries", [])]
        sources = profile.get("sources", ["indeed", "linkedin", "ziprecruiter"])
        work_type = profile.get("work_type", "remote")

        all_jobs = []
        seen_urls = set()

        dispatch = {
            "indeed": self._indeed,
            "linkedin": self._linkedin,
            "ziprecruiter": self._ziprecruiter,
            "glassdoor": self._glassdoor,
            "adzuna": self._adzuna,
        }

        total_steps = len(queries) * len(sources)
        step = 0

        for query in queries:
            for source in sources:
                step += 1
                if progress_cb:
                    progress_cb(step, total_steps, f"[{source}] '{query}'")

                if use_mock:
                    jobs = _mock_jobs(query, source)
                else:
                    fn = dispatch.get(source)
                    if not fn:
                        logger.warning(f"Unknown source: {source}")
                        jobs = []
                    else:
                        try:
                            jobs = fn(query, work_type)
                        except Exception as e:
                            logger.error(f"[{source}] '{query}' → ERROR: {e}")
                            jobs = []

                new = 0
                for job in jobs[:self.max_results]:
                    url = job.get("url", "")
                    key = f"{job.get('title','').lower()}|{job.get('company','').lower()}"
                    if url and url in seen_urls:
                        continue
                    if key in seen_urls:
                        continue
                    seen_urls.add(url)
                    seen_urls.add(key)
                    job["source"] = source
                    job["query"] = query
                    job["date_found"] = datetime.now().strftime("%Y-%m-%d")
                    all_jobs.append(job)
                    new += 1

                logger.info(f"[{source}] '{query}' → {new} jobs")
                time.sleep(self.delay + random.uniform(0, 1))

        return all_jobs

    def _indeed(self, query: str, work_type: str) -> list[dict]:
        params = {
            "q": query,
            "remotejob": "032b3046-06a3-4876-8dfd-474eb5e7ed11" if work_type == "remote" else "",
            "l": "",
            "limit": str(self.max_results),
        }
        url = "https://www.indeed.com/jobs"
        try:
            resp = self.session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            jobs = []
            for card in soup.select("div.job_seen_beacon, div.tapItem, li.css-5lfssm"):
                title_el = card.select_one("h2.jobTitle span, a.jcs-JobTitle span[title], h2 a span")
                company_el = card.select_one("span.companyName, [data-testid='company-name'], span.css-1h7lukg")
                loc_el = card.select_one("div.companyLocation, [data-testid='text-location'], div.css-1restlb")
                link_el = card.select_one("a[href*='/rc/clk'], a[href*='/pagead/clk'], h2 a")
                if not title_el:
                    continue
                href = link_el.get("href", "") if link_el else ""
                if href and not href.startswith("http"):
                    href = "https://www.indeed.com" + href
                jobs.append({
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True) if company_el else "",
                    "location": loc_el.get_text(strip=True) if loc_el else "",
                    "salary": "",
                    "description": "",
                    "url": href,
                })
            return jobs
        except Exception as e:
            logger.debug(f"Indeed scrape error: {e}")
            return []

    def _linkedin(self, query: str, work_type: str) -> list[dict]:
        f_WT = "2" if work_type == "remote" else "3"
        params = {
            "keywords": query,
            "f_WT": f_WT,
            "f_TPR": "r86400",
        }
        url = "https://www.linkedin.com/jobs/search"
        try:
            resp = self.session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            jobs = []
            for card in soup.select("li.jobs-search__results-list, div.base-card"):
                title_el = card.select_one("h3.base-search-card__title, span.screen-reader-text")
                company_el = card.select_one("h4.base-search-card__subtitle a, a.hidden-nested-link")
                loc_el = card.select_one("span.job-search-card__location")
                link_el = card.select_one("a.base-card__full-link, a[href*='/jobs/view/']")
                if not title_el:
                    continue
                jobs.append({
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True) if company_el else "",
                    "location": loc_el.get_text(strip=True) if loc_el else "",
                    "salary": "",
                    "description": "",
                    "url": link_el.get("href", "") if link_el else "",
                })
            return jobs
        except Exception as e:
            logger.debug(f"LinkedIn scrape error: {e}")
            return []

    def _ziprecruiter(self, query: str, work_type: str) -> list[dict]:
        params = {
            "search": query,
            "location": "Remote" if work_type == "remote" else "",
        }
        url = "https://www.ziprecruiter.com/candidate/search"
        try:
            resp = self.session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            jobs = []
            for card in soup.select("article.job_result, div[class*='job_result_']"):
                title_el = card.select_one("h2 a, a.job_link, span[class*='job_title']")
                company_el = card.select_one("a.company_name, span[class*='company']")
                loc_el = card.select_one("span.location, li[class*='location']")
                salary_el = card.select_one("span[class*='salary']")
                if not title_el:
                    continue
                jobs.append({
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True) if company_el else "",
                    "location": loc_el.get_text(strip=True) if loc_el else "",
                    "salary": salary_el.get_text(strip=True) if salary_el else "",
                    "description": "",
                    "url": title_el.get("href", "") if title_el.name == "a" else "",
                })
            return jobs
        except Exception as e:
            logger.debug(f"ZipRecruiter scrape error: {e}")
            return []

    def _glassdoor(self, query: str, work_type: str) -> list[dict]:
        params = {"sc.keyword": query, "remoteWorkType": "1" if work_type == "remote" else ""}
        url = "https://www.glassdoor.com/Job/jobs.htm"
        try:
            resp = self.session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            jobs = []
            for card in soup.select("li.react-job-listing, div[data-test='jobListing']"):
                title_el = card.select_one("a[data-test='job-title'], div.jobTitle")
                company_el = card.select_one("div.employerName, span[data-test='employer-name']")
                loc_el = card.select_one("span.loc, div[data-test='emp-location']")
                if not title_el:
                    continue
                href = title_el.get("href", "")
                if href and not href.startswith("http"):
                    href = "https://www.glassdoor.com" + href
                jobs.append({
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True) if company_el else "",
                    "location": loc_el.get_text(strip=True) if loc_el else "",
                    "salary": "",
                    "description": "",
                    "url": href,
                })
            return jobs
        except Exception as e:
            logger.debug(f"Glassdoor scrape error: {e}")
            return []

    def _adzuna(self, query: str, work_type: str) -> list[dict]:
        q = query + (" remote" if work_type == "remote" else "")
        params = {
            "q": q,
            "results_per_page": str(self.max_results),
        }
        url = "https://www.adzuna.com/search"
        try:
            resp = self.session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            jobs = []
            for card in soup.select("div[class*='result'], article[class*='result']"):
                title_el = card.select_one("h2 a, a[class*='title']")
                company_el = card.select_one("span[class*='company'], div[class*='company']")
                loc_el = card.select_one("span[class*='location'], div[class*='location']")
                salary_el = card.select_one("span[class*='salary']")
                if not title_el:
                    continue
                href = title_el.get("href", "")
                if href and not href.startswith("http"):
                    href = "https://www.adzuna.com" + href
                jobs.append({
                    "title": title_el.get_text(strip=True),
                    "company": company_el.get_text(strip=True) if company_el else "",
                    "location": loc_el.get_text(strip=True) if loc_el else "",
                    "salary": salary_el.get_text(strip=True) if salary_el else "",
                    "description": "",
                    "url": href,
                })
            return jobs
        except Exception as e:
            logger.debug(f"Adzuna scrape error: {e}")
            return []

# Phase 1 — Resume Parsing: Raw vs Structured (LLM Output)

Generated for human review before Phase 1 sign-off. Output produced by the live server's LLM extraction path (`openai/gpt-4o-mini` via `backend/services/resume_ai.py`), written to `profile_snapshots.resume_data`. Skills are regex-extracted; experience/education/projects are LLM-extracted.


==========================================================================================
## resume_clean.txt
==========================================================================================

### RAW TEXT
```
JANE SMITH
Senior Software Engineer
jane.smith@email.com | (555) 123-4567 | San Francisco, CA

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years of experience building scalable web applications and microservices. Proficient in Python, JavaScript, and cloud technologies.

TECHNICAL SKILLS
Programming Languages: Python, JavaScript, TypeScript, Go, SQL
Frameworks: React, Node.js, FastAPI, Django, Express.js
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
Cloud & DevOps: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, Terraform, CI/CD
Tools: Git, GitHub, Jira, Confluence, Postman

WORK EXPERIENCE

Senior Software Engineer | Google | Jan 2022 - Present
- Led development of a real-time data processing pipeline serving 10M+ daily users
- Designed and implemented microservices architecture reducing latency by 40%
- Mentored team of 3 junior engineers, conducting code reviews and technical interviews
- Built RESTful APIs using Python/FastAPI with 99.9% uptime

Software Engineer | Meta | Jun 2019 - Dec 2021
- Developed React-based dashboard for internal analytics platform
- Implemented automated testing framework achieving 85% code coverage
- Optimized PostgreSQL queries reducing database load by 60%
- Collaborated with product team to deliver features on aggressive timelines

Junior Developer | Startup Inc | Aug 2017 - May 2019
- Full-stack development using Node.js and React
- Built and maintained RESTful APIs serving mobile and web clients
- Implemented user authentication system using JWT tokens

EDUCATION

Bachelor of Science in Computer Science
Stanford University | 2017
- GPA: 3.8/4.0
- Relevant coursework: Data Structures, Algorithms, Database Systems, Distributed Systems

PROJECTS

Open Source Contributions
- Contributed to FastAPI framework, fixing bugs and improving documentation
- Built a CLI tool for automated database migrations (Python, 500+ GitHub stars)

Personal Projects
- Real-time chat application using WebSockets and Redis (React, Node.js, Docker)
- E-commerce platform with payment integration (Stripe, PostgreSQL)

CERTIFICATIONS
- AWS Certified Solutions Architect - Associate
- Google Cloud Professional Cloud Developer

```

### PARSED JSON (skills = regex; experience/education/projects = LLM)

```json
{
  "skills": [
    "websockets",
    "ci/cd",
    "express",
    "java",
    "django",
    "jira",
    "redis",
    "docker",
    "confluence",
    "aws",
    "elasticsearch",
    "github",
    "javascript",
    "typescript",
    "python",
    "node.js",
    "terraform",
    "mongodb",
    "fastapi",
    "kubernetes",
    "postgresql",
    "go",
    "sql",
    "react",
    "git"
  ],
  "experience": [
    {
      "title": "Senior Software Engineer",
      "company": "Google",
      "duration": "Jan 2022 - Present",
      "description": "Led development of a real-time data processing pipeline serving 10M+ daily users. Designed and implemented microservices architecture reducing latency by 40%. Mentored team of 3 junior engineers, conducting code reviews and technical interviews. Built RESTful APIs using Python/FastAPI with 99.9% uptime."
    },
    {
      "title": "Software Engineer",
      "company": "Meta",
      "duration": "Jun 2019 - Dec 2021",
      "description": "Developed React-based dashboard for internal analytics platform. Implemented automated testing framework achieving 85% code coverage. Optimized PostgreSQL queries reducing database load by 60%. Collaborated with product team to deliver features on aggressive timelines."
    },
    {
      "title": "Junior Developer",
      "company": "Startup Inc",
      "duration": "Aug 2017 - May 2019",
      "description": "Full-stack development using Node.js and React. Built and maintained RESTful APIs serving mobile and web clients. Implemented user authentication system using JWT tokens."
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "Stanford University",
      "year": "2017"
    }
  ],
  "projects": [
    {
      "name": "Open Source Contributions",
      "description": "Contributed to FastAPI framework, fixing bugs and improving documentation. Built a CLI tool for automated database migrations",
      "technologies": [
        "Python"
      ]
    },
    {
      "name": "Personal Projects",
      "description": "Real-time chat application using WebSockets and Redis. E-commerce platform with payment integration.",
      "technologies": [
        "React",
        "Node.js",
        "Docker",
        "Stripe",
        "PostgreSQL"
      ]
    }
  ],
  "filename": "resume_clean.txt"
}
```


==========================================================================================
## resume_messy.txt
==========================================================================================

### RAW TEXT
```
hey there!! i'm bob jones and i need a job lol

basically i know some stuff about computers and programming

what i can do:
- python (made some scripts)
- javascript (made a website once)
- react (kind of)
- docker (i think i used it?)
- sql (mysql not postgres sorry)
- git (i use github sometimes)

where i worked:
google - software engineer thing (2020 to now) - did some stuff with backend
facebook - intern (2019 summer) - made a dashboard
my college - web developer (2018) - updated the website

school:
i went to MIT for computer science, graduated 2020 or 2019 i forget exactly

oh also i made a cool app that does something with AI and machine learning using tensorflow and pytorch but i lost the code

and i know some linux and bash scripting too

i'm looking for a backend engineer role or maybe full stack idk

thanks!!

```

### PARSED JSON (skills = regex; experience/education/projects = LLM)

```json
{
  "skills": [
    "tensorflow",
    "github",
    "machine learning",
    "docker",
    "javascript",
    "react",
    "python",
    "go",
    "mysql",
    "sql",
    "java",
    "pytorch",
    "git"
  ],
  "experience": [
    {
      "title": "software engineer thing",
      "company": "google",
      "duration": "2020 to now",
      "description": "did some stuff with backend"
    },
    {
      "title": "intern",
      "company": "facebook",
      "duration": "2019 summer",
      "description": "made a dashboard"
    },
    {
      "title": "web developer",
      "company": "my college",
      "duration": "2018",
      "description": "updated the website"
    }
  ],
  "education": [
    {
      "degree": "computer science",
      "institution": "MIT",
      "year": "2020"
    }
  ],
  "projects": [
    {
      "name": "cool app",
      "description": "does something with AI and machine learning",
      "technologies": [
        "tensorflow",
        "pytorch"
      ]
    }
  ],
  "filename": "resume_messy.txt"
}
```


==========================================================================================
## resume_minimal.txt
==========================================================================================

### RAW TEXT
```
JOHN DOE
john@email.com

Skills: Python

Experience: Intern at TechCorp (2021)

Education: BS Computer Science, State University (2021)

```

### PARSED JSON (skills = regex; experience/education/projects = LLM)

```json
{
  "skills": [
    "python"
  ],
  "experience": [
    {
      "title": "Intern",
      "company": "TechCorp",
      "duration": "2021",
      "description": ""
    }
  ],
  "education": [
    {
      "degree": "BS Computer Science",
      "institution": "State University",
      "year": "2021"
    }
  ],
  "projects": [],
  "filename": "resume_minimal.txt"
}
```


==========================================================================================
## resume_tabular.txt
==========================================================================================

### RAW TEXT
```
ALICE CHEN — FULL-STACK DEVELOPER
alice.chen@example.com | (415) 555-0199

PROFILE
7 years building product-facing web software. Strong on the frontend-to-backend seam: React, Node, Postgres, AWS.

CORE COMPETENCIES
React · TypeScript · Node.js · Express · PostgreSQL · Redis · Docker · AWS (EC2, S3, Lambda) · GraphQL · Jest · Git

EMPLOYMENT HISTORY

2021–Present | Senior Full-Stack Engineer @ Finly
Architected the payments ledger service (Node/Postgres), cut p95 latency 45%, and shipped the v2 customer dashboard (React/TS). Led a pod of 4.

2018–2021 | Full-Stack Developer @ Shopify
Built internal fulfillment tooling on React + GraphQL; owned the analytics export pipeline; added end-to-end Jest coverage.

2016–2018 | Junior Web Developer @ Agency Co
Delivered ~20 client sites; migrated legacy jQuery to React; set up CI with Docker + GitHub Actions.

EDUCATION
2016 — B.S. Computer Science, UC Berkeley

PROJECTS
Ledger visualization dashboard — React + D3 + WebSockets, live metrics.
Open-source GraphQL rate-limiter — TS, 400 stars.

```

### PARSED JSON (skills = regex; experience/education/projects = LLM)

```json
{
  "skills": [
    "github",
    "redis",
    "docker",
    "typescript",
    "websockets",
    "postgresql",
    "aws",
    "express",
    "node.js",
    "sql",
    "react",
    "graphql",
    "git"
  ],
  "experience": [
    {
      "title": "Senior Full-Stack Engineer",
      "company": "Finly",
      "duration": "2021â€“Present",
      "description": "Architected the payments ledger service (Node/Postgres), cut p95 latency 45%, and shipped the v2 customer dashboard (React/TS). Led a pod of 4."
    },
    {
      "title": "Full-Stack Developer",
      "company": "Shopify",
      "duration": "2018â€“2021",
      "description": "Built internal fulfillment tooling on React + GraphQL; owned the analytics export pipeline; added end-to-end Jest coverage."
    },
    {
      "title": "Junior Web Developer",
      "company": "Agency Co",
      "duration": "2016â€“2018",
      "description": "Delivered ~20 client sites; migrated legacy jQuery to React; set up CI with Docker + GitHub Actions."
    }
  ],
  "education": [
    {
      "degree": "B.S. Computer Science",
      "institution": "UC Berkeley",
      "year": "2016"
    }
  ],
  "projects": [
    {
      "name": "Ledger visualization dashboard",
      "description": "live metrics.",
      "technologies": [
        "React",
        "D3",
        "WebSockets"
      ]
    },
    {
      "name": "Open-source GraphQL rate-limiter",
      "description": "",
      "technologies": [
        "TS"
      ]
    }
  ],
  "filename": "resume_tabular.txt"
}
```


==========================================================================================
## resume_chronological.txt
==========================================================================================

### RAW TEXT
```
CAROL MARTINEZ

Backend Engineer | Distributed Systems

SUMMARY
Backend engineer with 6 years of experience designing and operating distributed systems on Kubernetes and AWS. Comfortable owning services end-to-end: design, implementation, observability, and on-call.

EXPERIENCE

Acme Cloud
Senior Backend Engineer
March 2021 – June 2025

Built and operated the event-streaming platform (Kafka, Go, Postgres) serving 3M daily events. Introduced structured logging and tracing, reducing mean-time-to-detect from hours to minutes. Mentored two junior engineers through production-readiness reviews.

Northwind Systems
Backend Engineer
July 2018 – February 2021

Owned the order-processing API (Python, FastAPI). Migrated a monolith to microservices, cutting deploy time from 30 minutes to 4. Wrote integration tests that raised confidence and caught two severe regressions pre-release.

EDUCATION

Carnegie Mellon University
M.S. in Computer Science
2019

Georgia Tech
B.S. in Computer Science
2017

MORE
- Docker
- Kafka
- Go
- Terraform
- Prometheus
- gRPC

```

### PARSED JSON (skills = regex; experience/education/projects = LLM)

```json
{
  "skills": [
    "fastapi",
    "docker",
    "python",
    "kubernetes",
    "aws",
    "go",
    "grpc",
    "terraform"
  ],
  "experience": [
    {
      "title": "Senior Backend Engineer",
      "company": "Acme Cloud",
      "duration": "March 2021 â€“ June 2025",
      "description": "Built and operated the event-streaming platform (Kafka, Go, Postgres) serving 3M daily events. Introduced structured logging and tracing, reducing mean-time-to-detect from hours to minutes. Mentored two junior engineers through production-readiness reviews."
    },
    {
      "title": "Backend Engineer",
      "company": "Northwind Systems",
      "duration": "July 2018 â€“ February 2021",
      "description": "Owned the order-processing API (Python, FastAPI). Migrated a monolith to microservices, cutting deploy time from 30 minutes to 4. Wrote integration tests that raised confidence and caught two severe regressions pre-release."
    }
  ],
  "education": [
    {
      "degree": "M.S. in Computer Science",
      "institution": "Carnegie Mellon University",
      "year": "2019"
    },
    {
      "degree": "B.S. in Computer Science",
      "institution": "Georgia Tech",
      "year": "2017"
    }
  ],
  "projects": [
    {
      "name": "Event-Streaming Platform",
      "description": "Built and operated the event-streaming platform (Kafka, Go, Postgres) serving 3M daily events.",
      "technologies": [
        "Kafka",
        "Go",
        "Postgres"
      ]
    },
    {
      "name": "Order-Processing API",
      "description": "Owned the order-processing API (Python, FastAPI). Migrated a monolith to microservices, cutting deploy time from 30 minutes to 4.",
      "technologies": [
        "Python",
        "FastAPI"
      ]
    }
  ],
  "filename": "resume_chronological.txt"
}
```

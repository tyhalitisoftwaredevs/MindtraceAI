import sqlite3
from pathlib import Path


CONCEPTS = [
    ("variables", "Programming", "Named values that store data."),
    ("fractions", "Algebra", "Parts of a whole represented as a quotient."),
    ("negative_numbers", "Algebra", "Numbers less than zero."),
    ("ratios", "Algebra", "Comparisons between quantities."),
    ("conditionals", "Programming", "Branching based on a condition."),
    ("loops", "Programming", "Repeated execution of a block."),
    ("functions", "Programming", "Reusable named blocks of code."),
    ("recursion", "Programming", "A function calling itself with a base case."),
    ("algebra", "Algebra", "Foundational equation-solving using fractions and ratios."),
]


def seed_database(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS learners (
            id TEXT PRIMARY KEY, display_name TEXT NOT NULL, cohort TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'learner', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS concepts (
            id TEXT PRIMARY KEY, subject TEXT NOT NULL, description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS prerequisites (
            concept_id TEXT NOT NULL, prerequisite_id TEXT NOT NULL,
            PRIMARY KEY (concept_id, prerequisite_id),
            FOREIGN KEY (concept_id) REFERENCES concepts(id),
            FOREIGN KEY (prerequisite_id) REFERENCES concepts(id)
        );
        CREATE TABLE IF NOT EXISTS evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT, learner_id TEXT NOT NULL,
            concept_id TEXT NOT NULL, evidence_type TEXT NOT NULL, correct INTEGER NOT NULL,
            independent INTEGER NOT NULL DEFAULT 0, details TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (learner_id) REFERENCES learners(id)
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL,
            actor_role TEXT NOT NULL, learner_id TEXT, stage TEXT, payload TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS voice_consents (
            learner_id TEXT PRIMARY KEY, granted INTEGER NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (learner_id) REFERENCES learners(id)
        );
        CREATE TABLE IF NOT EXISTS interventions (
            id TEXT PRIMARY KEY, status TEXT NOT NULL, content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_by TEXT, reviewed_at TEXT
        );
        """
    )
    connection.executemany(
        "INSERT OR IGNORE INTO concepts (id, subject, description) VALUES (?, ?, ?)",
        CONCEPTS,
    )
    edges = [
        ("loops", "variables"),
        ("loops", "conditionals"),
        ("recursion", "functions"),
        ("recursion", "loops"),
        ("algebra", "fractions"),
        ("algebra", "ratios"),
    ]
    connection.executemany(
        "INSERT OR IGNORE INTO prerequisites (concept_id, prerequisite_id) VALUES (?, ?)",
        edges,
    )
    connection.executemany(
        "INSERT OR IGNORE INTO learners (id, display_name, cohort) VALUES (?, ?, 'First-year programming')",
        [(f"learner-{number:02d}", f"Student {number:02d}") for number in range(1, 26)],
    )
    existing = connection.execute("SELECT COUNT(*) FROM evidence").fetchone()[0]
    if existing == 0:
        for number in range(1, 26):
            confused = number <= 16
            connection.execute(
                "INSERT INTO evidence (learner_id, concept_id, evidence_type, correct, independent, details) VALUES (?, 'loops', 'cohort_quiz', ?, 0, ?)",
                (
                    f"learner-{number:02d}",
                    0 if confused else 1,
                    "Illustrative sample data: conflates loops with recursion"
                    if confused
                    else "Illustrative sample data: distinguishes iteration",
                ),
            )
    connection.commit()

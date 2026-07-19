import json
import os
import sqlite3
import uuid
from dotenv import load_dotenv

load_dotenv()

# Predefined seed questions covering major interview types, topics, and difficulties.
# Each entry: (topic, subtopic, difficulty, company, question, tags_list)
SEED_QUESTIONS = [
    # DSA
    ("Arrays", "Two Pointers", "Easy", "Google", 
     "Given a sorted array of integers, how would you find two numbers that add up to a specific target? Explain the time complexity.", 
     ["dsa", "arrays", "two-pointers"]),
    ("Arrays", "Sliding Window", "Medium", "Amazon", 
     "Explain how you would find the maximum sum of a contiguous subarray of size K. Walk through the sliding window approach.", 
     ["dsa", "arrays", "sliding-window"]),
    ("Strings", "Anagrams", "Easy", "Microsoft", 
     "Write a method to decide if two strings are anagrams of each other. What is the space complexity of your solution?", 
     ["dsa", "strings", "hash-map"]),
    ("Strings", "Substring Search", "Hard", "Meta", 
     "How does the Rabin-Karp substring search algorithm work? Discuss its average vs worst-case time complexity.", 
     ["dsa", "strings", "algorithms"]),
    ("Linked List", "Cycle Detection", "Medium", "Microsoft", 
     "How does Floyd's Cycle-Finding Algorithm (tortoise and hare) work to detect a cycle in a linked list? Why does it work?", 
     ["dsa", "linked-list", "pointers"]),
    ("Stack", "Valid Parentheses", "Easy", "Amazon", 
     "How would you design a stack-based algorithm to verify if a string of parentheses is balanced?", 
     ["dsa", "stack", "validation"]),
    ("Queue", "BFS Traversals", "Medium", "Google", 
     "Explain the difference between a Queue and a Stack. How is a Queue used to perform a Breadth-First Search (BFS) on a graph?", 
     ["dsa", "queue", "bfs"]),
    ("Hashing", "Collision Resolution", "Medium", "Google", 
     "How does a Hash Map handle collisions? Compare Chaining vs Open Addressing in detail.", 
     ["dsa", "hashing", "collisions"]),
    ("Trees", "Binary Tree Traversals", "Medium", "Meta", 
     "Explain In-order, Pre-order, and Post-order tree traversals. How would you implement Post-order iteratively?", 
     ["dsa", "trees", "dfs"]),
    ("BST", "Validation", "Medium", "Amazon", 
     "How do you validate if a binary tree is a Binary Search Tree (BST)? What is the recursive vs iterative approach?", 
     ["dsa", "bst", "recursion"]),
    ("Heap", "Priority Queue", "Hard", "Meta", 
     "Explain the Heapify operation in a Binary Heap. How does Heap Sort achieve O(N log N) time complexity?", 
     ["dsa", "heap", "sorting"]),
    ("Graph", "Dijkstra's Algorithm", "Hard", "Google", 
     "Walk me through Dijkstra's shortest path algorithm. What data structures are used to optimize its runtime?", 
     ["dsa", "graph", "shortest-path"]),
    ("Dynamic Programming", "Knapsack", "Hard", "Amazon", 
     "Explain the 0/1 Knapsack Problem. Describe the state transitions in its dynamic programming approach.", 
     ["dsa", "dp", "algorithms"]),
    ("Recursion", "Backtracking", "Medium", "Microsoft", 
     "What is backtracking? Explain the recursive backtracking template using the N-Queens problem.", 
     ["dsa", "recursion", "backtracking"]),

    # Frontend
    ("HTML5 & Semantic Markup", "Accessibility", "Easy", "Apple", 
     "Why is semantic HTML important for SEO and accessibility? Give examples of elements that improve page structure.", 
     ["frontend", "html5", "accessibility"]),
    ("CSS Layouts & Flexbox/Grid", "Flexbox vs Grid", "Easy", "Meta", 
     "Explain when you would use CSS Flexbox versus CSS Grid. What are the core layout paradigms of each?", 
     ["frontend", "css3", "layout"]),
    ("JavaScript Core", "Event Loop", "Medium", "Netflix", 
     "Explain the event loop in JavaScript. How do microtasks (Promises) and macrotasks (setTimeout) get prioritized?", 
     ["frontend", "javascript", "async"]),
    ("React Fundamentals", "Virtual DOM", "Easy", "Meta", 
     "How does React's Virtual DOM work, and how does the reconciliation algorithm update the browser UI efficiently?", 
     ["frontend", "react", "reconciliation"]),
    ("Web Performance Optimization", "LCP & Core Web Vitals", "Hard", "Google", 
     "What are Core Web Vitals? How would you optimize a website to improve the Largest Contentful Paint (LCP)?", 
     ["frontend", "performance", "lighthouse"]),
    ("State Management", "Redux vs Context", "Medium", "Uber", 
     "Compare using React Context API vs Redux/Zustand for global state management. When does Context cause performance issues?", 
     ["frontend", "react", "state"]),

    # Backend
    ("REST APIs & HTTP Protocol", "Idempotency", "Easy", "Stripe", 
     "What does it mean for an HTTP method to be idempotent? Which standard HTTP methods are idempotent and why?", 
     ["backend", "apis", "http"]),
    ("Relational Databases & SQL", "Indexes", "Medium", "Oracle", 
     "How do database indexes speed up query retrieval? What are the tradeoffs in terms of write operations and disk space?", 
     ["backend", "databases", "sql"]),
    ("Caching & Redis", "Caching Patterns", "Medium", "Twitter", 
     "Explain Cache-Aside, Write-Through, and Write-Behind caching strategies. When would you use each?", 
     ["backend", "caching", "redis"]),
    ("Authentication & JWT", "JWT Security", "Medium", "Okta", 
     "How does JWT-based authentication work? What are the security risks of storing tokens in LocalStorage vs HttpOnly cookies?", 
     ["backend", "auth", "security"]),
    ("Message Queues & Event-Driven Systems", "Kafka vs RabbitMQ", "Hard", "LinkedIn", 
     "Compare Kafka and RabbitMQ. When would you choose a log-based message broker over a traditional message queue?", 
     ["backend", "messaging", "queues"]),

    # System Design
    ("Microservices Architecture", "Service Discovery", "Medium", "Netflix", 
     "How does Service Discovery work in a microservices architecture? Explain the roles of consul or eureka.", 
     ["systemdesign", "microservices"]),
    ("Scalability & Load Balancing", "Load Balancers", "Medium", "Amazon", 
     "What is the difference between Layer 4 and Layer 7 load balancing? Give scenarios where each is preferred.", 
     ["systemdesign", "scalability"]),
    ("Database Selection & Sharding", "Horizontal Sharding", "Hard", "Meta", 
     "Explain how horizontal database sharding works. How do you handle range-based vs hash-based sharding and re-sharding?", 
     ["systemdesign", "databases"]),
    ("CAP Theorem & Tradeoffs", "PACELC Theorem", "Hard", "Google", 
     "State the CAP Theorem. How does the PACELC theorem extend CAP to describe latency and consistency tradeoffs?", 
     ["systemdesign", "architecture"]),

    # AI / ML
    ("Supervised vs Unsupervised Learning", "Core concepts", "Easy", "Microsoft", 
     "What is the difference between supervised and unsupervised learning? Give two standard algorithms for each.", 
     ["aiml", "ml"]),
    ("Transformer Architectures & Attention", "Self-Attention Mechanism", "Hard", "OpenAI", 
     "Explain the self-attention mechanism in Transformer models. Why does it scale better than LSTMs for long sequences?", 
     ["aiml", "deep-learning"]),
    ("MLOps & Model Deployment", "Feature Store", "Medium", "Uber", 
     "What is a Feature Store in an ML pipeline? Why is it crucial for preventing training-serving skew?", 
     ["aiml", "mlops"]),

    # Behavioral
    ("Conflict Resolution", "Team disagreements", "Medium", "Amazon", 
     "Tell me about a time you had a technical disagreement with a teammate. How did you resolve it to keep the project moving?", 
     ["behavioral", "conflict"]),
    ("Leadership & Initiative", "Ownership", "Medium", "Google", 
     "Describe a situation where you saw a problem outside your immediate responsibility and took ownership to fix it.", 
     ["behavioral", "leadership"]),
    ("Handling Failure & Resiliency", "Mistakes", "Easy", "Meta", 
     "Describe a major project failure or mistake you made. How did you handle it, and what did you learn?", 
     ["behavioral", "failure"]),

    # HR
    ("Motivation & Work Ethic", "Motivation", "Easy", "Microsoft", 
     "What motivates you to do your best work, and how do you stay productive when tasks become repetitive?", 
     ["hr", "motivation"]),
    ("Salary Expectations & Negotiation", "Salary", "Medium", "Recruiters", 
     "What are your salary expectations for this position? How do you assess a compensation package beyond base salary?", 
     ["hr", "salary"]),

    # OS
    ("Processes vs Threads", "Context Switching", "Easy", "Intel", 
     "Explain the difference between a process and a thread. What resources are shared between threads of the same process?", 
     ["os", "processes"]),
    ("Deadlock Conditions & Prevention", "Coffman Conditions", "Medium", "Oracle", 
     "What are the four Coffman conditions required for a deadlock to occur? How can an OS prevent deadlocks?", 
     ["os", "deadlock"]),

    # Database (Specialized DBA)
    ("ACID Properties & Transactions", "Isolation Levels", "Hard", "Database Engines", 
     "Explain the four SQL isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) and the anomalies they prevent.", 
     ["database", "transactions"]),
    ("Indexing & Query Performance Optimization", "B-Tree vs Hash Index", "Medium", "PostgreSQL", 
     "Compare B-Tree indexes and Hash indexes in database engines. In what scenarios would a Hash index fail?", 
     ["database", "indexes"]),

    # Networking
    ("TCP/IP Protocol Suite & Handshakes", "TCP 3-Way Handshake", "Easy", "Cisco", 
     "Describe the steps in the TCP three-way handshake. What flags are set in each segment?", 
     ["networking", "tcp"]),
    ("HTTP/HTTPS Protocols & SSL/TLS Handshake", "SSL/TLS Handshake", "Medium", "Cloudflare", 
     "Walk me through how an HTTPS connection is secured. What happens during the SSL/TLS handshake?", 
     ["networking", "security"])
]


def seed_sqlite():
    db_path = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "interview_forge.db"))
    print(f"Connecting to local SQLite database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_questions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        subtopic TEXT,
        difficulty TEXT NOT NULL,
        company TEXT,
        tags TEXT,
        question TEXT NOT NULL UNIQUE,
        followups TEXT,
        expected_points TEXT,
        time_limit INTEGER DEFAULT 180,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        role TEXT NOT NULL,
        seniority TEXT NOT NULL,
        interview_type TEXT NOT NULL,
        total_questions INTEGER DEFAULT 0,
        current_question_index INTEGER DEFAULT 0,
        asked_question_ids TEXT,
        asked_questions_text TEXT,
        covered_topics TEXT,
        difficulty_history TEXT,
        answer_history TEXT,
        weak_topics TEXT,
        strong_topics TEXT,
        report TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()

    # Seed questions
    inserted = 0
    skipped = 0
    for topic, subtopic, diff, comp, q, tags in SEED_QUESTIONS:
        q_id = str(uuid.uuid4())
        tags_json = json.dumps(tags)
        try:
            cursor.execute(
                "INSERT INTO interview_questions (id, topic, subtopic, difficulty, company, tags, question) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (q_id, topic, subtopic, diff, comp, tags_json, q)
            )
            inserted += 1
        except sqlite3.IntegrityError:
            skipped += 1
            
    conn.commit()
    conn.close()
    print(f"SQLite seeding completed. Inserted: {inserted}, Skipped/Existing: {skipped}")


def seed_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("Supabase credentials not found. Skipping Supabase seeding.")
        return
        
    try:
        from supabase import create_client
        client = create_client(url, key)
        print("Seeding Supabase public.interview_questions table...")
        
        inserted = 0
        skipped = 0
        
        for topic, subtopic, diff, comp, q, tags in SEED_QUESTIONS:
            # Check if exists
            exists = client.table("interview_questions").select("id").eq("question", q).execute()
            if exists.data:
                skipped += 1
                continue
                
            data = {
                "topic": topic,
                "subtopic": subtopic,
                "difficulty": diff,
                "company": comp,
                "tags": tags,
                "question": q,
                "followups": [],
                "expected_points": [],
                "time_limit": 180
            }
            client.table("interview_questions").insert(data).execute()
            inserted += 1
            
        print(f"Supabase seeding completed. Inserted: {inserted}, Skipped/Existing: {skipped}")
    except Exception as e:
        print(f"Error seeding Supabase: {e}. (This is normal if database tables are not yet created in Supabase)")


if __name__ == "__main__":
    seed_sqlite()
    seed_supabase()

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def seed_data():
    print("Seeding data...")

    # Seed Courses, Modules, and Lessons
    courses = [
        {'title': 'React for Beginners', 'description': 'Learn the fundamentals of React.'},
        {'title': 'Advanced Python', 'description': 'Master advanced Python concepts.'}
    ]
    course_res = supabase.table('courses').insert(courses).execute()
    course_ids = [c['id'] for c in course_res.data]

    modules = [
        {'course_id': course_ids[0], 'title': 'Introduction to React'},
        {'course_id': course_ids[1], 'title': 'Decorators and Generators'}
    ]
    module_res = supabase.table('modules').insert(modules).execute()
    module_ids = [m['id'] for m in module_res.data]

    lessons = [
        {'module_id': module_ids[0], 'title': 'What is React?', 'type': 'read', 'content': 'React is a JavaScript library...'},
        {'module_id': module_ids[0], 'title': 'Components and Props', 'type': 'video', 'content': 'https://youtube.com/watch?v=...'},
        {'module_id': module_ids[1], 'title': 'Python Decorators', 'type': 'practice', 'content': '{"problem": "Write a decorator..."}'}
    ]
    supabase.table('lessons').insert(lessons).execute()

    # Seed Achievements
    achievements = [
        {'name': 'First Steps', 'description': 'Complete your first lesson.', 'icon_name': 'footprints', 'xp_reward': 10},
        {'name': 'Bookworm', 'description': 'Complete 5 "read" lessons.', 'icon_name': 'book', 'xp_reward': 50},
        {'name': 'Streak Starter', 'description': 'Maintain a 3-day streak.', 'icon_name': 'flame', 'xp_reward': 30}
    ]
    supabase.table('achievements').insert(achievements).execute()

    # Seed Redemption Store Items
    redemption_items = [
        {'name': 'Dark Mode Theme', 'description': 'A cool new theme for your app.', 'image_url': '/themes/dark.png', 'xp_cost': 100},
        {'name': 'Profile Badge', 'description': 'Show off your skills with a new badge.', 'image_url': '/badges/pro.png', 'xp_cost': 250},
        {'name': '30-Min Mentor Session', 'description': 'Get 1-on-1 help from an expert.', 'image_url': '/mentors/session.png', 'xp_cost': 1000}
    ]
    supabase.table('redemption_items').insert(redemption_items).execute()

    print("Data seeding complete!")

if __name__ == "__main__":
    seed_data()

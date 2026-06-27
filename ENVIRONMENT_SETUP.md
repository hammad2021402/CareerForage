# 🔐 Environment Variables - Complete Guide

## Backend Environment (.env)

Create a file `backend/.env` with the following variables:

```env
# ========================================
# REQUIRED - Application will not work without these
# ========================================

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here  # IMPORTANT: Use SERVICE ROLE key, NOT anon key!

# ========================================
# AI & LEARNING FEATURES - Highly Recommended
# ========================================

# OpenAI API (for AI tutoring, code review, assessments)
OPENAI_API_KEY=sk-proj-your-openai-key-here  # Get from platform.openai.com
# Cost: ~$0.01-0.10 per user session
# Fallback: Mock responses if not provided

# ========================================
# OPTIONAL INTEGRATIONS
# ========================================

# Judge0 API (for live code execution)
JUDGE0_API_KEY=your-judge0-key-here  # Get from rapidapi.com/judge0
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
# Fallback: Mock execution results if not provided
```

---

## Frontend Environment (.env)

Create a file `.env` in the root directory (next to package.json):

```env
# Backend API URL
VITE_API_URL=http://localhost:8000
```

For production:
```env
VITE_API_URL=https://your-backend-domain.com
```

---

## Getting API Keys

### 1. Supabase (REQUIRED)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing)
3. Go to Project Settings → API
4. Copy these values:
   - **URL**: `https://xxx.supabase.co`
   - **service_role key**: `eyJxxx...` (NOT the anon key!)

**CRITICAL**: Use the **service_role** key, not the **anon** key. The service role key bypasses RLS (Row Level Security) which is needed for backend operations.

---

### 2. OpenAI (Highly Recommended)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to API keys
4. Click "Create new secret key"
5. Copy the key (starts with `sk-proj-` or `sk-`)
6. **Save it immediately** - you can't see it again!

**Billing**:
- Set up billing at [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
- Recommended: Set a monthly limit ($5-10 for testing)
- Monitor usage in the dashboard

**Models Used**:
- `gpt-4-turbo-preview` for all AI features
- Cost: ~$0.01 per 1,000 tokens
- Average user session: $0.01-0.10

---

### 3. Judge0 (Optional)
1. Go to [rapidapi.com/judge0/api/judge0-ce](https://rapidapi.com/judge0/api/judge0-ce)
2. Sign up for RapidAPI
3. Subscribe to Judge0 (free tier available)
4. Copy your RapidAPI key from dashboard

**Usage**: Live code execution for 6+ languages
**Cost**: Free tier: 50 calls/day
**Fallback**: Mock execution with expected outputs

---

## Feature Matrix by API Key

| Feature | Works Without Keys | With OpenAI | With All Keys |
|---------|-------------------|-------------|---------------|
| Authentication | ✅ (Supabase) | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Learning Paths | ✅ | ✅ | ✅ |
| Basic Lessons | ✅ | ✅ | ✅ |
| XP & Gamification | ✅ | ✅ | ✅ |
| AI Chat | ⚠️ Mock | ✅ Real GPT-4 | ✅ |
| Code Review | ⚠️ Basic | ✅ GPT-4 | ✅ |
| AI Hints | ⚠️ Generic | ✅ Contextual | ✅ |
| Recommendations | ⚠️ Basic | ✅ Personalized | ✅ |
| Assessments | ⚠️ Mock | ✅ AI Grading | ✅ |
| Code Execution | ⚠️ Mock | ⚠️ Mock | ✅ Real |
| Voice Commands | ⚠️ Mock | ✅ OpenAI | ✅ OpenAI + Judge0 |

**Legend**:
- ✅ Full functionality
- ⚠️ Limited/mock functionality
- ❌ Not available

---

## Recommended Setup for Different Use Cases

### 🎓 Learning/Testing (Minimum)
```env
SUPABASE_URL=xxx
SUPABASE_KEY=xxx
# Works for basic learning platform
```

### 🤖 AI Features Demo (Recommended)
```env
SUPABASE_URL=xxx
SUPABASE_KEY=xxx
OPENAI_API_KEY=sk-xxx  # Adds AI tutoring, code review, smart hints
# Best bang for buck - most impressive features
```

### 🚀 Full Hackathon Demo (Complete)
```env
SUPABASE_URL=xxx
SUPABASE_KEY=xxx
OPENAI_API_KEY=sk-xxx
JUDGE0_API_KEY=xxx
# All features enabled, most impressive
```

---

## Security Best Practices

### ✅ DO:
- Keep `.env` files in `.gitignore`
- Use environment variables, never hardcode
- Use different keys for dev/staging/production
- Rotate keys periodically
- Set billing limits on API providers
- Use service_role key only in backend

### ❌ DON'T:
- Commit `.env` files to Git
- Share API keys in screenshots or demos
- Use production keys in development
- Expose service_role key to frontend
- Hardcode keys in source code
- Use anon key for backend operations

---

## Troubleshooting

### "Failed to connect to Supabase"
**Cause**: Wrong URL or key
**Fix**: 
- Check URL format: `https://xxx.supabase.co`
- Verify you're using **service_role** key
- Test connection in Supabase dashboard

### "OpenAI API key not valid"
**Cause**: Key incorrect or expired
**Fix**:
- Check for extra spaces in .env
- Regenerate key at platform.openai.com
- Verify billing is set up

### "Module not found" errors
**Cause**: Missing dependencies
**Fix**:
```bash
cd backend
pip install -r requirements.txt
```

### "CORS errors" in browser
**Cause**: Frontend can't reach backend
**Fix**:
- Check backend is running (`uvicorn main:app --reload`)
- Verify `VITE_API_URL` in frontend .env
- Check CORS settings in `backend/main.py`

---

## Cost Management

### OpenAI
- **Development**: ~$1-5/month
- **Demo day**: ~$10-20 (heavy usage)
- **Per user**: ~$0.05-0.20/hour

**Tips**:
- Set monthly limit ($10 recommended)
- Use `gpt-3.5-turbo` for cheaper alternative
- Implement caching for common questions
- Monitor usage dashboard daily

### Judge0
- **Free tier**: 50 calls/day
- **Paid tier**: $0.004/call
- **Estimate**: $5-10/month for moderate use

## Production Deployment

### Environment Variables on Hosting Platforms

**Vercel/Netlify (Frontend)**:
```
VITE_API_URL=https://api.yourapp.com
```

**Railway/Render/Heroku (Backend)**:
```
SUPABASE_URL=xxx
SUPABASE_KEY=xxx
OPENAI_API_KEY=xxx
JUDGE0_API_KEY=xxx
```

**Docker**:
```bash
docker run -e SUPABASE_URL=xxx -e OPENAI_API_KEY=xxx your-image
```

---

## Example .env Files

### Backend Development
```env
# backend/.env
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-abcd1234567890...
JUDGE0_API_KEY=abc123def456::rapidapi...
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
```

### Frontend Development
```env
# .env (root)
VITE_API_URL=http://localhost:8000
```

### Frontend Production
```env
# .env.production
VITE_API_URL=https://api.nexuslearn.com
```

---

## Verification Checklist

After setting up your .env files:

**Backend**:
- [ ] `cd backend`
- [ ] `python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('Supabase:', os.getenv('SUPABASE_URL')[:20]); print('OpenAI:', bool(os.getenv('OPENAI_API_KEY')))"`
- [ ] Should print your Supabase URL and True/False for OpenAI

**Frontend**:
- [ ] `npm run dev`
- [ ] Check browser console for API_URL
- [ ] Should see `http://localhost:8000`

**Integration**:
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000/5173
- [ ] Login works → Supabase connected ✅
- [ ] AI Chat responds → OpenAI connected ✅
- [ ] Voice command works → OpenAI connected ✅
- [ ] Code runs → Judge0 connected ✅

---

**Last Updated**: Environment setup complete
**Status**: Production ready with full documentation

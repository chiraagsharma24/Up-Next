import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample data for the API
const sampleStories = [
  {
    id: 1,
    roleTitle: "Software Engineer @ Google",
    timeline: [
      { year: 2018, event: "Started B.Tech in Computer Science" },
      { year: 2020, event: "Internship at Microsoft" },
      { year: 2021, event: "First job at a startup" },
      { year: 2022, event: "Joined Google" }
    ],
    tags: ["React", "Node.js", "DSA", "IIT"],
    motivationQuote: "Rejection is redirection. Keep pushing forward!",
    verified: true,
    collegeTier: "tier1",
    experience: "entry"
  },
  {
    id: 2,
    roleTitle: "Product Designer @ Figma",
    timeline: [
      { year: 2019, event: "Started learning UI/UX design" },
      { year: 2020, event: "First freelance project" },
      { year: 2021, event: "Joined a design agency" },
      { year: 2022, event: "Joined Figma" }
    ],
    tags: ["Figma", "UI/UX", "Design Systems", "Prototyping"],
    motivationQuote: "Design is not just what it looks like, it's how it works.",
    verified: true,
    collegeTier: "tier2",
    experience: "mid"
  },
  {
    id: 3,
    roleTitle: "Data Scientist @ Amazon",
    timeline: [
      { year: 2017, event: "Started M.Tech in Data Science" },
      { year: 2019, event: "Research internship at IBM" },
      { year: 2020, event: "First job as Data Analyst" },
      { year: 2021, event: "Joined Amazon" }
    ],
    tags: ["Python", "Machine Learning", "SQL", "AWS"],
    motivationQuote: "Data is the new oil. Learn to extract value from it.",
    verified: true,
    collegeTier: "tier1",
    experience: "mid"
  },
  {
    id: 4,
    roleTitle: "Frontend Developer @ Netflix",
    timeline: [
      { year: 2018, event: "Started learning web development" },
      { year: 2019, event: "Built portfolio projects" },
      { year: 2020, event: "First job at a tech startup" },
      { year: 2021, event: "Joined Netflix" }
    ],
    tags: ["React", "TypeScript", "Next.js", "CSS"],
    motivationQuote: "The best way to predict the future is to create it.",
    verified: true,
    collegeTier: "tier3",
    experience: "entry"
  },
  {
    id: 5,
    roleTitle: "Backend Engineer @ Stripe",
    timeline: [
      { year: 2017, event: "Started B.Tech in Computer Science" },
      { year: 2019, event: "Open source contributions" },
      { year: 2020, event: "First job as Backend Developer" },
      { year: 2021, event: "Joined Stripe" }
    ],
    tags: ["Java", "Spring Boot", "Microservices", "AWS"],
    motivationQuote: "Code is poetry. Write it with passion.",
    verified: true,
    collegeTier: "tier2",
    experience: "senior"
  },
  {
    id: 6,
    roleTitle: "DevOps Engineer @ AWS",
    timeline: [
      { year: 2016, event: "Started B.Tech in Computer Science" },
      { year: 2018, event: "First internship in DevOps" },
      { year: 2019, event: "Joined a cloud consulting firm" },
      { year: 2020, event: "Joined AWS" }
    ],
    tags: ["AWS", "Docker", "Kubernetes", "CI/CD"],
    motivationQuote: "Automation is the key to scaling.",
    verified: true,
    collegeTier: "tier1",
    experience: "mid"
  },
  {
    id: 7,
    roleTitle: "Mobile Developer @ Instagram",
    timeline: [
      { year: 2018, event: "Started learning mobile development" },
      { year: 2019, event: "Built first mobile app" },
      { year: 2020, event: "Joined a mobile app startup" },
      { year: 2021, event: "Joined Instagram" }
    ],
    tags: ["React Native", "iOS", "Android", "Firebase"],
    motivationQuote: "Mobile is the future. Build for it.",
    verified: true,
    collegeTier: "tier2",
    experience: "entry"
  },
  {
    id: 8,
    roleTitle: "AI Research Scientist @ OpenAI",
    timeline: [
      { year: 2015, event: "Started Ph.D. in Machine Learning" },
      { year: 2018, event: "Published research papers" },
      { year: 2020, event: "Joined a research lab" },
      { year: 2021, event: "Joined OpenAI" }
    ],
    tags: ["Python", "TensorFlow", "PyTorch", "NLP"],
    motivationQuote: "AI will transform the world. Be part of that transformation.",
    verified: true,
    collegeTier: "tier1",
    experience: "senior"
  },
  {
    id: 9,
    roleTitle: "UX Researcher @ Airbnb",
    timeline: [
      { year: 2017, event: "Started M.Des in Interaction Design" },
      { year: 2019, event: "Internship at a UX agency" },
      { year: 2020, event: "First job as UX Designer" },
      { year: 2021, event: "Joined Airbnb" }
    ],
    tags: ["User Research", "Prototyping", "Usability Testing", "Figma"],
    motivationQuote: "User-centered design is the key to great products.",
    verified: true,
    collegeTier: "tier2",
    experience: "mid"
  },
  {
    id: 10,
    roleTitle: "Blockchain Developer @ Coinbase",
    timeline: [
      { year: 2018, event: "Started learning blockchain development" },
      { year: 2019, event: "Built first DApp" },
      { year: 2020, event: "Joined a blockchain startup" },
      { year: 2021, event: "Joined Coinbase" }
    ],
    tags: ["Solidity", "Ethereum", "Web3.js", "Smart Contracts"],
    motivationQuote: "Blockchain is the future of finance. Learn it now.",
    verified: true,
    collegeTier: "tier3",
    experience: "entry"
  }
];

// Helper function to filter stories based on query parameters
const filterStories = (stories, search, collegeTier, experience) => {
  return stories.filter(story => {
    // Filter by search term (role or company)
    if (search && !story.roleTitle.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    // Filter by college tier
    if (collegeTier && collegeTier !== "any" && story.collegeTier !== collegeTier) {
      return false;
    }
    
    // Filter by experience level
    if (experience && experience !== "any" && story.experience !== experience) {
      return false;
    }
    
    return true;
  });
};

// Helper: Fetch user profile
async function getUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { skills: true, education: true },
  });
}

// Helper: Generate personalized success stories using Gemini
async function generateSuccessStories(userProfile, targetRole, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert storyteller. Generate personalized success stories, case studies, and insights for the role of ${targetRole} in the ${industry} industry. Use this user profile: ${JSON.stringify(userProfile)}. Return as JSON: {stories: string[], insights: string[], feedback: string}.`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  try {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch (e) {
    return { error: 'Failed to parse Gemini response', raw: data };
  }
}

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const collegeTier = searchParams.get("collegeTier") || "any";
    const experience = searchParams.get("experience") || "any";
    
    // Filter stories based on query parameters
    const filteredStories = filterStories(sampleStories, search, collegeTier, experience);
    
    // Paginate results
    const pageSize = 5;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedStories = filteredStories.slice(startIndex, endIndex);
    
    // Check if there are more pages
    const hasMore = endIndex < filteredStories.length;
    
    // Return response
    return NextResponse.json({
      stories: paginatedStories,
      hasMore,
      total: filteredStories.length
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { userId, targetRole, industry } = await req.json();
    if (!userId || !targetRole || !industry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Fetch user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // 2. Generate personalized success stories
    const successStories = await generateSuccessStories(userProfile, targetRole, industry);
    // 3. Store stories data
    const storedStory = await prisma.story.create({
      data: {
        userId,
        targetRole,
        industry,
        stories: successStories.stories,
        insights: successStories.insights,
        feedback: successStories.feedback,
        status: 'draft',
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      userId,
      stories: {
        stories: successStories.stories,
        insights: successStories.insights,
        feedback: successStories.feedback,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 
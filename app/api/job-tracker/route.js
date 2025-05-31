import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: Fetch user profile
async function getUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { jobApplications: true },
  });
}

// Helper: Parse application emails using Gmail API
async function parseGmailEmails(userId) {
  // TODO: Integrate Gmail API
  return [
    {
      company: 'Google',
      position: 'Software Engineer',
      status: 'Applied',
      source: 'Gmail',
      appliedDate: new Date(),
      jobUrl: 'https://careers.google.com/jobs/123',
      description: 'Job description here',
      notes: 'Notes here',
    },
  ];
}

// Helper: Schedule interview using Calendar API
async function scheduleInterview(jobApplicationId, interviewDetails) {
  // TODO: Integrate Calendar API
  return {
    id: 'interview123',
    jobApplicationId,
    type: 'Phone',
    scheduledAt: new Date(),
    duration: 60,
    interviewer: 'John Doe',
    notes: 'Interview notes here',
    status: 'Scheduled',
  };
}

export async function POST(req) {
  try {
    const { userId, company, position, status, source, appliedDate, jobUrl, description, notes } = await req.json();
    if (!userId || !company || !position || !status || !source || !appliedDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Fetch user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // 2. Parse application emails
    const parsedEmails = await parseGmailEmails(userId);
    // 3. Store job application data
    const jobApplication = await prisma.jobApplication.create({
      data: {
        userId,
        company,
        position,
        status,
        source,
        appliedDate: new Date(appliedDate),
        jobUrl,
        description,
        notes,
      },
    });
    // 4. Schedule interview if applicable
    let interview = null;
    if (status === 'Interview') {
      interview = await scheduleInterview(jobApplication.id, { type: 'Phone', duration: 60 });
    }
    // 5. Return structured response
    return NextResponse.json({
      userId,
      jobApplication: {
        ...jobApplication,
        interview,
      },
      parsedEmails,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 
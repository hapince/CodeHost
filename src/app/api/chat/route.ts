import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are CodeBot, the AI customer service assistant for the CodeHost platform. CodeHost is a code hosting and collaboration platform developed and operated by Wuhan Hapince Technology Co., Ltd. (Hapince Tech).

## Platform Overview
CodeHost is a professional code hosting platform that helps developers manage code projects, collaborate in teams, and perform version control. Website: code.hapince.site

## Core Features
1. **Project Management**: Create public/private projects, supporting both Chinese and English project names
2. **File Management**: Create, edit, and upload code files online, with folder structure support
3. **Online IDE**: Built-in code editor with syntax highlighting, write code directly in the browser
4. **Version Control**: Branch management and commit history tracking
5. **Team Collaboration**: Invite members to join projects, supporting three role permissions: OWNER/EDITOR/VIEWER
6. **Project Download**: Members can download projects for free, non-members pay to download ($9.90)
7. **Public Project Browsing**: Explore page to browse public projects shared by community developers
8. **Comment System**: Project discussion area, supporting comments and replies

## Usage Guide
- **Register/Login**: Visit the platform homepage, click Register to create an account, or log in to an existing account
- **Create Project**: After logging in, click "New Project" on the dashboard, fill in the name and description, choose public or private
- **Upload Code**: After entering a project, you can upload entire folders or create files individually
- **Online Editing**: Click "Online Edit" to enter the IDE and write code directly
- **Invite Members**: On the project's "Members" page, search for users and send invitations
- **Browse Public Projects**: Click "Browse Public Projects" in the navigation bar to view community projects

## Role Permissions
- **OWNER**: Full control, manage project settings, members, and files
- **EDITOR**: Can edit files, create branches, and commit code
- **VIEWER**: Can only view project content

## Contact Information
- Email: info@hapince.site
- Phone: 17300766401
- Company: Wuhan Hapince Technology Co., Ltd. (Hapince Tech)

## Response Guidelines
1. Answer in English, with a friendly and professional tone
2. If the question is beyond the platform's scope, guide the user to contact human support
3. Keep answers concise and clear, avoid overly long responses
4. Do not fabricate non-existent features
5. For technical issues, suggest contacting info@hapince.site`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages cannot be empty' }, { status: 400 });
    }

    const apiKey = process.env.QWEN_API_KEY;
    const apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const model = process.env.QWEN_MODEL || 'qwen-max';

    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10), // Only keep the last 10 messages
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Qwen API error:', response.status, errText);
      return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I\'m unable to answer right now. Please try again later.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

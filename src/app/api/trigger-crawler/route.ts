import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Body 파싱 불필요
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken || githubToken === 'ghp_your_github_token') {
      return NextResponse.json(
        { status: 'error', message: 'GitHub Token이 서버에 설정되지 않았습니다.' },
        { status: 400 }
      );
    }

    // GitHub Actions Workflow Dispatch API
    const response = await fetch(
      'https://api.github.com/repos/anogro/campfinder/actions/workflows/crawler.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main'
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API Error: ${response.status} ${errorText}`);
    }

    return NextResponse.json({ status: 'success', message: '크롤러가 성공적으로 실행되었습니다.' });
  } catch (error: any) {
    console.error('Trigger error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

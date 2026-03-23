import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        // Initialize client (standard practice)
        createClientFromRequest(req);

        const githubToken = Deno.env.get('GITHUB_TOKEN');
        if (!githubToken) {
            return Response.json({ error: 'GitHub token not configured' }, { status: 400 });
        }

        // Fetch the most recently updated repository for the authenticated user
        const response = await fetch('https://api.github.com/user/repos?sort=updated&direction=desc&per_page=1', {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Base44-App'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            return Response.json({ error: 'Failed to fetch repos', details: error }, { status: response.status });
        }

        const repos = await response.json();
        const latestRepo = repos[0];

        return Response.json({ repo: latestRepo });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
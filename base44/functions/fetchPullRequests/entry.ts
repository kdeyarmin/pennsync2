import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        createClientFromRequest(req);
        
        const githubToken = Deno.env.get('GITHUB_TOKEN');
        if (!githubToken) {
            return Response.json({ error: 'GitHub token not configured' }, { status: 400 });
        }

        const owner = 'kdeyarmin';
        const repo = 'pennsync';

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open`, {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Base44-App'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            return Response.json({ error: 'Failed to fetch pull requests', details: error }, { status: response.status });
        }

        const prs = await response.json();
        
        return Response.json({ pullRequests: prs });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
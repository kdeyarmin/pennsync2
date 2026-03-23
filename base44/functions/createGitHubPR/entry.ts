Deno.serve(async (req) => {
  try {
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    if (!githubToken) {
      return Response.json({ error: 'GitHub token not configured' }, { status: 400 });
    }

    const { owner = 'kdeyarmin', repo = 'pennsync', head = 'development', base = 'main' } = await req.json();

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Optimize Twilio fax sync: CPU time limit fix',
        body: `## Summary
Fixes CPU time limit exceeded errors in syncTwilioFaxStatuses function.

## Changes
- Reduced batch processing from 50 to 20 faxes per run
- Strict 35-second execution timeout to prevent CPU overload
- Disabled UserActivity logging to reduce overhead
- Optimized query to fetch only pending faxes

## Impact
- Eliminates recurring "CPU time limit exceeded" errors
- Improves function reliability and system stability
- No functional changes to fax status updates`,
        head,
        base,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json(
        { error: 'Failed to create PR', details: error },
        { status: response.status }
      );
    }

    const prData = await response.json();
    return Response.json({
      success: true,
      pr_number: prData.number,
      pr_url: prData.html_url,
      message: `PR #${prData.number} created successfully`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
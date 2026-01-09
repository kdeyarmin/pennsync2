import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Simple fuzzy match implementation
function fuzzyMatch(text, query) {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) {
    return { score: 100, matches: [query] };
  }
  
  // Word match
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);
  let matchedWords = 0;
  const matches = [];
  
  queryWords.forEach(qWord => {
    if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      matchedWords++;
      matches.push(qWord);
    }
  });
  
  const score = (matchedWords / queryWords.length) * 80;
  return { score, matches };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      query,
      document_type,
      patient_id,
      fuzzy = true,
      limit = 50
    } = await req.json();

    if (!query || query.trim().length < 2) {
      return Response.json({ 
        error: 'Query must be at least 2 characters' 
      }, { status: 400 });
    }

    // Build filter
    const filter = {};
    if (document_type && document_type !== 'all') {
      filter.document_type = document_type;
    }
    if (patient_id) {
      filter.patient_id = patient_id;
    }

    // Fetch all indexed documents
    const allDocs = await base44.asServiceRole.entities.PDFIndex.filter(
      filter,
      '-created_date',
      limit * 2 // Fetch more to filter
    );

    // Search and score results
    const results = allDocs
      .map(doc => {
        const matchResult = fuzzyMatch(doc.extracted_text, query);
        
        // Also check keywords
        const keywordMatches = doc.keywords?.filter(k => 
          k.includes(query.toLowerCase()) || query.toLowerCase().includes(k)
        ) || [];
        
        // Boost score for keyword matches
        const keywordBoost = keywordMatches.length * 10;
        const totalScore = matchResult.score + keywordBoost;
        
        if (totalScore === 0 && !fuzzy) return null;
        if (totalScore < 20 && fuzzy) return null;
        
        // Find page matches
        const pageMatches = doc.page_contents
          ?.map(page => {
            const pageMatch = fuzzyMatch(page.text, query);
            if (pageMatch.score > 30) {
              return {
                page_number: page.page_number,
                score: pageMatch.score,
                snippet: extractSnippet(page.text, query)
              };
            }
            return null;
          })
          .filter(Boolean) || [];
        
        return {
          ...doc,
          search_score: totalScore,
          matched_terms: [...matchResult.matches, ...keywordMatches],
          page_matches: pageMatches,
          snippet: extractSnippet(doc.extracted_text, query)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.search_score - a.search_score)
      .slice(0, limit);

    // Log search
    await base44.asServiceRole.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'pdf_search',
      details: {
        query,
        results_count: results.length,
        filters: { document_type, patient_id }
      },
      page: 'pdf_search'
    });

    return Response.json({
      success: true,
      query,
      results_count: results.length,
      results
    });

  } catch (error) {
    console.error('PDF search error:', error);
    return Response.json({ 
      error: error.message || 'Search failed' 
    }, { status: 500 });
  }
});

function extractSnippet(text, query, contextLength = 100) {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(queryLower);
  
  if (index === -1) {
    return text.substring(0, contextLength * 2) + '...';
  }
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + query.length + contextLength);
  
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}
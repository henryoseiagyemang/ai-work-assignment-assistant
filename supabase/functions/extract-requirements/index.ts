const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LLMRequirement {
  id: string;
  text: string;
}

interface LLMWorkItem {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  required_skills: string[];
  requirement_ids: string[];
  theme: string;
}

interface LLMResponse {
  requirements: LLMRequirement[];
  work_items: LLMWorkItem[];
}

const SYSTEM_PROMPT = `You are a technical project analyst. Given a requirements document, you must:
1. Extract every requirement as a structured item with an ID (R1, R2, R3, ...) and the full requirement text.
2. Generate work items from those requirements. Each work item should:
   - Have an ID (W1, W2, W3, ...)
   - Have a concise title (5-8 words)
   - Have a description (1-2 sentences explaining what needs to be done)
   - Have a difficulty score from 1 (trivial) to 5 (very complex)
   - Have required_skills: an array of skill names needed (e.g. "React", "Node.js", "PostgreSQL", "Security", "CSS", "Accessibility", "Testing", "UI Design", "Python", "Documentation")
   - Have requirement_ids: an array of requirement IDs this work item addresses (e.g. ["R1"] or ["R1", "R3"])
   - Have a theme: a short grouping label (e.g. "Frontend UI", "Security", "Backend & Data", "Mobile Development")

Every requirement MUST be addressed by at least one work item. No requirement may be left without a work item. A work item can address multiple requirements — group related requirements into single work items where it makes sense — but ensure every requirement ID appears in at least one work item's requirement_ids array.

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "requirements": [
    { "id": "R1", "text": "The full requirement text here" }
  ],
  "work_items": [
    {
      "id": "W1",
      "title": "Short title",
      "description": "What needs to be done",
      "difficulty": 3,
      "required_skills": ["React", "CSS"],
      "requirement_ids": ["R1"],
      "theme": "Frontend UI"
    }
  ]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { document } = await req.json();

    if (!document || typeof document !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'document' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GROQ_API_KEY is not configured. Add it as a secret in your Supabase project.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: document },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return new Response(
        JSON.stringify({ error: `Groq API error (${groqResponse.status}): ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI model" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: LLMResponse;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI model returned invalid JSON" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!parsed.requirements || !Array.isArray(parsed.requirements)) {
      return new Response(
        JSON.stringify({ error: "AI response missing 'requirements' array" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedReqs = parsed.requirements.map((r) => ({
      id: r.id,
      text: r.text,
    }));

    const extractedItems = (parsed.work_items || []).map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description,
      difficulty: w.difficulty,
      requiredSkills: w.required_skills || [],
      requirementIds: w.requirement_ids || [],
      theme: w.theme,
    }));

    // Safety-net: ensure every requirement ID is covered by at least one work item.
    // If the AI missed any, auto-generate a default work item for each uncovered requirement.
    const coveredIds = new Set(extractedItems.flatMap((w) => w.requirementIds));
    let fallbackCounter = extractedItems.length;
    for (const req of extractedReqs) {
      if (!coveredIds.has(req.id)) {
        fallbackCounter++;
        const fallbackId = `W${fallbackCounter}`;
        extractedItems.push({
          id: fallbackId,
          title: req.text.slice(0, 60),
          description: `Auto-generated work item to ensure full requirement coverage. Address requirement ${req.id}.`,
          difficulty: 3,
          requiredSkills: [],
          requirementIds: [req.id],
          theme: "General",
        });
      }
    }

    const result = {
      requirements: extractedReqs,
      workItems: extractedItems,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

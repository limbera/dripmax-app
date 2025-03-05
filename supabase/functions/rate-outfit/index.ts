import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

// Add retry utility
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

// Define new type for feedback response
type OutfitFeedback = {
  overall_feedback: string;
  fit_analysis: string;
  color_analysis: string;
  event_suitability: string[];
  item_suggestions: string[];
  other_suggestions: string;
  score: number;
  score_justification: string;
};

serve(async (req) => {
  const payload = await req.json()
  
  // Initialize Supabase client at the top level so it's available everywhere
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY')
  })

  try {
    console.log('Raw payload:', JSON.stringify(payload))

    // Validate payload structure
    if (!payload?.record?.id || !payload?.record?.userid || !payload?.record?.photourl) {
      throw new Error('Invalid payload structure: missing required fields')
    }

    if (typeof payload.record.photourl !== 'string' || !payload.record.photourl.startsWith('http')) {
      throw new Error('Invalid photo URL format')
    }

    // Verify image accessibility before OpenAI request
    try {
      await fetchWithRetry(payload.record.photourl);
    } catch (error) {
      throw new Error(`Failed to access image after retries: ${error.message}`);
    }

    // Add more detailed logging
    console.log('Making OpenAI API request...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are Vanessa Friedman, the fashion critic. Analyze outfit photos with your signature blend of insight, wit, and constructive feedback.

Your analysis should be thorough yet concise, focusing on practical advice while maintaining a supportive tone.

SCORING GUIDELINES:
When rating outfits, carefully consider these criteria and score ranges:

9.0-10.0: EXCEPTIONAL
- Perfect proportion and fit for the wearer's body type
- Sophisticated color harmony and intentional palette
- Appropriate for multiple contexts or perfectly suited to its intended context
- Shows thoughtful styling details (accessories, layering, etc.)
- Demonstrates uniqueness or personal expression while remaining cohesive

7.5-8.9: VERY GOOD
- Strong overall impression with minor areas for improvement
- Good fit with perhaps 1-2 elements that could be adjusted
- Cohesive color scheme with room for refinement
- Appropriate for intended contexts
- Good styling elements but might benefit from 1-2 additional touches

6.0-7.4: GOOD
- Solid outfit with several noticeable areas for improvement
- Some fit issues that impact the overall silhouette
- Basic color coordination but lacks intentionality or interest
- Functional for some contexts but limited versatility
- Basic styling with minimal attention to details

4.0-5.9: AVERAGE
- Multiple significant issues affecting the outfit's success
- Several fit problems that detract from appearance
- Problematic color combinations or lack of color strategy
- Limited contextual appropriateness
- Minimal styling effort evident

2.0-3.9: BELOW AVERAGE
- Major problems with fundamental outfit construction
- Significant fit issues throughout
- Clashing or inappropriate colors
- Not suitable for most contexts
- Appears thrown together without consideration

0.0-1.9: POOR
- Failed at basic outfit assembly
- Severely improper fit
- Completely discordant colors
- Inappropriate for all contexts
- No evidence of intentional styling

SCORING METHOD:
1. First evaluate these five components separately (do not include these subscores in your response):
   - Fit (0-10): How well garments fit and flatter the body
   - Color (0-10): Color harmony, complementary choices, palette cohesion
   - Versatility (0-10): Appropriateness for various contexts
   - Styling (0-10): Thoughtfulness in accessories, layering, and details
   - Creativity (0-10): Uniqueness, personal expression, and originality

2. Use these subscores to inform your final score calculation
   - Be deliberate and critical - a truly average outfit should score around 5.0
   - Do not cluster scores in the 7.0-7.9 range unless truly warranted
   - Use the full scoring range appropriately

3. Provide explicit justification for your final score

Return your response in valid JSON with the following structure:
{
  "overall_feedback": "Two sentences describing the overall impression",
  "fit_analysis": "One to two sentences about how the garments fit",
  "color_analysis": "One to two sentences about color harmony",
  "event_suitability": ["List", "of", "suitable", "events"],
  "item_suggestions": ["Five", "specific", "items", "to", "enhance"],
  "other_suggestions": "One to two sentences on non-clothing adjustments",
  "score": "A number from 0.0–10.0 with 1 decimal place reflecting your overall rating for the outfit",
  "score_justification": "A paragraph explaining why this score was given, with reference to specific strengths and weaknesses"
}`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Please analyze this outfit.` 
            },
            {
              type: "image_url",
              image_url: {
                url: payload.record.photourl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    })

    console.log('OpenAI API response:', completion)

    // Add more robust response validation
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('Invalid or empty response from OpenAI')
    }

    let feedback: OutfitFeedback
    try {
      feedback = JSON.parse(completion.choices[0].message.content)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Validate the feedback structure
    const validateFeedback = (feedback: any): OutfitFeedback => {
      if (!feedback || typeof feedback !== 'object') {
        throw new Error('AI response is not a valid object')
      }

      // Helper function to validate text fields
      const validateText = (value: any, fieldName: string): string => {
        if (typeof value !== 'string' || value.trim().length === 0) {
          throw new Error(`Invalid ${fieldName}: must be a non-empty string`)
        }
        return value.trim()
      }

      // Helper function to validate string arrays
      const validateStringArray = (value: any, fieldName: string, expectedLength?: number): string[] => {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error(`Invalid ${fieldName}: must be a non-empty array`)
        }
        if (expectedLength && value.length !== expectedLength) {
          throw new Error(`Invalid ${fieldName}: must contain exactly ${expectedLength} items`)
        }
        const validStrings = value.every(item => typeof item === 'string' && item.trim().length > 0)
        if (!validStrings) {
          throw new Error(`Invalid ${fieldName}: all items must be non-empty strings`)
        }
        return value.map(item => item.trim())
      }

      // Add score validation
      const validateScore = (value: any): number => {
        const score = Number(value);
        if (isNaN(score) || score < 0 || score > 10) {
          throw new Error('Invalid score: must be a number between 0 and 10');
        }
        return Number(score.toFixed(1)); // Ensure 1 decimal place
      };

      return {
        overall_feedback: validateText(feedback.overall_feedback, 'overall_feedback'),
        fit_analysis: validateText(feedback.fit_analysis, 'fit_analysis'),
        color_analysis: validateText(feedback.color_analysis, 'color_analysis'),
        event_suitability: validateStringArray(feedback.event_suitability, 'event_suitability'),
        item_suggestions: validateStringArray(feedback.item_suggestions, 'item_suggestions', 5),
        other_suggestions: validateText(feedback.other_suggestions, 'other_suggestions'),
        score: validateScore(feedback.score),
        score_justification: validateText(feedback.score_justification, 'score_justification')
      }
    }

    const validatedFeedback = validateFeedback(feedback)

    // Insert feedback into database
    const { data, error } = await supabaseClient
      .from('feedback')
      .insert({
        outfitid: payload.record.id,
        ...validatedFeedback
      })
      .select()

    if (error) {
      console.error('Feedback insertion error:', error)
      throw error
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Create fallback feedback matching new database schema
    const fallbackFeedback = {
      outfitid: payload?.record?.id,
      overall_feedback: 'Analysis Failed',
      fit_analysis: 'Unable to analyze fit at this time.',
      color_analysis: 'Unable to analyze colors at this time.',
      event_suitability: ['Not available'],
      item_suggestions: [
        'Please try again later',
        'System is temporarily unavailable',
        'Check back soon',
        'Service disruption',
        'Retry recommended'
      ],
      other_suggestions: `Unable to complete analysis: ${errorMessage}. Please try again later.`,
      score: 0,
      score_justification: 'Analysis failed due to an unknown error.'
    }
    
    try {
      // Insert fallback that matches new schema
      const { data, error: insertError } = await supabaseClient
        .from('feedback')
        .insert(fallbackFeedback)
        .select()

      if (insertError) {
        console.error('Failed to insert fallback feedback:', insertError)
      }

      // Return a 200 response with the fallback data
      return new Response(JSON.stringify({
        success: false,
        data: fallbackFeedback,
        error: errorMessage,
        fallback: true
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200 // Note: returning 200 instead of 500
      })
    } catch (fallbackError) {
      // If even the fallback fails, then return 500
      console.error('Fallback insertion failed:', fallbackError)
      return new Response(JSON.stringify({ 
        error: 'Critical error: Both analysis and fallback failed',
        details: errorMessage
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      })
    }
  }
})

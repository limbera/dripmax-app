// supabase/functions/analyze-garment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Get environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const clippingMagicApiId = Deno.env.get('CLIPPING_MAGIC_API_ID') ?? '';
const clippingMagicApiSecret = Deno.env.get('CLIPPING_MAGIC_API_SECRET') ?? '';

serve(async (req) => {
  try {
    // Add basic logging for debugging
    console.log('Edge function called, parsing request...');
    
    // Parse the request body
    let body;
    try {
      body = await req.json();
      console.log('Request parsed successfully');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body format',
          details: parseError.message 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required inputs
    const { image, userId } = body;
    
    if (!image) {
      console.error('Missing required field: image');
      return new Response(
        JSON.stringify({ success: false, error: 'Image is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userId) {
      console.error('Missing required field: userId');
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!openaiApiKey) {
      console.error('Missing required environment variable: OPENAI_API_KEY');
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!clippingMagicApiId || !clippingMagicApiSecret) {
      console.error('Missing required environment variables: CLIPPING_MAGIC_API_ID or CLIPPING_MAGIC_API_SECRET');
      return new Response(
        JSON.stringify({ success: false, error: 'Clipping Magic API not configured correctly' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client with service role for storage operations
    console.log('Initializing Supabase client');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Process image
    let base64Image = image;
    // Check if the image is just a Base64 string or includes the Data URL prefix
    if (base64Image.startsWith('data:')) {
      base64Image = base64Image.split(',')[1];
      console.log('Extracted base64 data from Data URL');
    }

    // 1. Process image with Clipping Magic for background removal
    console.log('Removing background with Clipping Magic');
    let processedImageBase64;
    try {
      processedImageBase64 = await removeBackgroundWithClippingMagic(base64Image);
      console.log('Background removal successful');
    } catch (clippingMagicError) {
      console.error('Error with background removal:', clippingMagicError);
      // Fall back to original image if background removal fails
      console.log('Falling back to original image');
      processedImageBase64 = base64Image;
    }
    
    // 2. Upload original image to storage
    console.log('Uploading original image to storage');
    const timestamp = new Date().getTime();
    const originalFilePath = `${userId}/${timestamp}_original.jpg`;
    
    try {
      const { data: originalStorageData, error: originalStorageError } = await supabase
        .storage
        .from('garments')
        .upload(originalFilePath, base64ToUint8Array(base64Image), {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (originalStorageError) {
        console.error('Error uploading original image to storage:', originalStorageError);
        throw originalStorageError;
      }
      
      console.log('Original image uploaded successfully to', originalFilePath);
    } catch (storageError) {
      console.error('Storage error for original image:', storageError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Storage error', 
          details: storageError.message || String(storageError) 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Upload processed image to storage
    console.log('Uploading processed image to storage');
    const processedFilePath = `${userId}/${timestamp}.png`;
    
    try {
      const { data: processedStorageData, error: processedStorageError } = await supabase
        .storage
        .from('garments')
        .upload(processedFilePath, base64ToUint8Array(processedImageBase64), {
          contentType: 'image/png',
          upsert: false
        });
      
      if (processedStorageError) {
        console.error('Error uploading processed image to storage:', processedStorageError);
        throw processedStorageError;
      }
      
      console.log('Processed image uploaded successfully to', processedFilePath);
      
      // Get public URLs for the images
      const { data: originalUrlData } = supabase
        .storage
        .from('garments')
        .getPublicUrl(originalFilePath);
      
      const { data: processedUrlData } = supabase
        .storage
        .from('garments')
        .getPublicUrl(processedFilePath);
      
      const originalPublicUrl = originalUrlData.publicUrl;
      const processedPublicUrl = processedUrlData.publicUrl;
      
      console.log('Public URLs generated');
      
      // 4. Analyze with OpenAI
      try {
        console.log('Calling OpenAI API');
        // Use the processed image for analysis if available, otherwise use original
        const imageForAnalysis = processedImageBase64 || base64Image;
        const analysis = await analyzeImageWithOpenAI(imageForAnalysis);
        console.log('OpenAI analysis complete', analysis);
        
        // 5. Save garment with analysis data
        console.log('Saving garment to database');
        try {
          const { data: garment, error: dbError } = await supabase
            .from('garments')
            .insert({
              user_id: userId,
              image_url: processedPublicUrl, // Use the processed image as primary
              original_image_url: originalPublicUrl, // Store original image URL as well
              category: analysis.category || 'uncategorized',
              type: analysis.type || null,
              brand: analysis.brand || null,
              primary_color: analysis.primaryColor || null,
              secondary_colors: analysis.secondaryColors || null,
              pattern: analysis.pattern || null,
              material: analysis.material || null,
              size_range: analysis.sizeRange || null,
              fit_style: analysis.fitStyle || null,
              price_range: analysis.priceRange || null,
              has_transparent_bg: processedImageBase64 !== base64Image, // Track if we have a transparent background
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('*')
            .single();
          
          if (dbError) {
            console.error('Database error:', dbError);
            throw dbError;
          }
          
          console.log('Garment saved successfully with ID:', garment.id);
          return new Response(
            JSON.stringify({ success: true, garment }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        } catch (dbError) {
          console.error('Error saving to database:', dbError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database error', 
              details: dbError.message || String(dbError) 
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error analyzing image', 
            details: aiError.message || String(aiError) 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (storageError) {
      console.error('Storage error for processed image:', storageError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Storage error', 
          details: storageError.message || String(storageError) 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unexpected error', 
        details: error.message || String(error) 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Removes the background from an image using Clipping Magic API
 * @param base64Image Base64-encoded image
 * @returns Base64-encoded image with background removed (as PNG with transparency)
 */
async function removeBackgroundWithClippingMagic(base64Image: string): Promise<string> {
  try {
    // Create the Authorization header using the API ID and Secret
    const authHeader = 'Basic ' + btoa(`${clippingMagicApiId}:${clippingMagicApiSecret}`);
    console.log('Using Clipping Magic API ID:', clippingMagicApiId);
    
    // Convert base64 to binary data for multipart/form-data upload
    const binaryData = base64ToUint8Array(base64Image);
    
    // Create FormData object for multipart upload 
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: 'image/jpeg' });
    formData.append('image', blob, 'image.jpg');
    
    // Auto Clip - single API call to upload, process, and get result
    formData.append('format', 'result'); // Get the processed result directly
    formData.append('hardness', '0');    // Soft edge (0-100)
    formData.append('crop', 'true');     // Crop to content
    
    // Using test=false for production quality without watermark
    formData.append('test', 'false');
    
    console.log('Uploading image to Clipping Magic and processing...');
    const response = await fetch('https://clippingmagic.com/api/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': authHeader
        // Don't set Content-Type for multipart/form-data
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error with Clipping Magic API:', errorText);
      throw new Error(`Clipping Magic API failed: ${response.status} ${errorText}`);
    }
    
    // The response is the actual image data
    console.log('Successfully received processed image');
    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = arrayBufferToBase64(resultBuffer);
    
    return resultBase64;
  } catch (error) {
    console.error('Error in removeBackgroundWithClippingMagic:', error);
    throw error;
  }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64String: string): Uint8Array {
  try {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('Error converting base64 to Uint8Array:', error);
    throw new Error('Invalid base64 image data');
  }
}

async function analyzeImageWithOpenAI(base64Image: string) {
  try {
    // Call OpenAI API with the prompt and image
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { "type": "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this fashion item image and return a JSON object with the following structure. Be sure to return ONLY valid JSON without any explanations or additional text:\n\n```json\n{\n  \"category\": string, // one of [Headwear, Top, Bottom, Footwear, Outerwear, One-Piece, Accessories],\n  \"type\": string, // specific type based on category (e.g., T-shirt, Jeans, Sneakers),\n  \"brand\": string | null, // identified brand or null if not visible,\n  \"primaryColor\": string, // main color,\n  \"secondaryColors\": string[], // array of additional colors or empty array if none,\n  \"pattern\": string | null, // pattern/design (e.g., solid, striped, plaid) or null if not applicable,\n  \"material\": string | null, // fabric/material composition or null if not identifiable,\n  \"sizeRange\": string | null, // estimated size range or null if not possible to determine,\n  \"fitStyle\": string | null, // fit style (e.g., slim, regular, relaxed) or null if not applicable,\n  \"priceRange\": string | null // estimated price range (e.g., \"$20-50 USD\") or null if not possible to estimate\n}\n```"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      console.error('OpenAI API error status:', response.status);
      console.error('OpenAI API error details:', await response.text());
      throw new Error(`OpenAI API returned status ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Unexpected OpenAI response format:', JSON.stringify(data));
      throw new Error('Unexpected response format from OpenAI');
    }
    
    const contentString = data.choices[0].message.content;
    console.log('Raw OpenAI response content:', contentString.substring(0, 200) + '...');
    
    try {
      // Parse the JSON response
      const jsonResponse = JSON.parse(contentString);
      console.log('Parsed JSON response:', jsonResponse);
      
      // Map the response to our expected structure
      return {
        category: jsonResponse.category || null,
        type: jsonResponse.type || null,
        brand: jsonResponse.brand || null,
        primaryColor: jsonResponse.primaryColor || null,
        secondaryColors: Array.isArray(jsonResponse.secondaryColors) ? jsonResponse.secondaryColors : [],
        pattern: jsonResponse.pattern || null,
        material: jsonResponse.material || null,
        sizeRange: jsonResponse.sizeRange || null,
        fitStyle: jsonResponse.fitStyle || null,
        priceRange: jsonResponse.priceRange || null
      };
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      console.error('Original content:', contentString);
      // Fall back to regex parsing if JSON parsing fails
      return parseOpenAIResponse(contentString);
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

function parseOpenAIResponse(content: string) {
  console.log('Falling back to regex parsing for response:', content.substring(0, 200) + '...');
  // A simple parser to extract key-value pairs from OpenAI's response
  const result = {
    category: null,
    type: null,
    brand: null,
    primaryColor: null,
    secondaryColors: [],
    pattern: null,
    material: null,
    sizeRange: null,
    fitStyle: null,
    priceRange: null
  };
  
  // Function to handle different response formats
  const extractValue = (fieldName: string): string | null => {
    // Try markdown bullet point format first: "- **Category**: Footwear"
    const markdownRegex = new RegExp(`[\\-\\*]\\s*\\*\\*${fieldName}\\*\\*\\s*:\\s*([^\\n]+)`, 'i');
    const markdownMatch = content.match(markdownRegex);
    if (markdownMatch) return markdownMatch[1].trim();
    
    // Try standard format: "Category: Footwear"
    const standardRegex = new RegExp(`${fieldName}\\s*:\\s*([^\\n]+)`, 'i');
    const standardMatch = content.match(standardRegex);
    if (standardMatch) return standardMatch[1].trim();
    
    // Try line with only the field name
    const lineRegex = new RegExp(`${fieldName}\\s*:\\s*([^\\n]+)\\n`, 'i');
    const lineMatch = content.match(lineRegex);
    if (lineMatch) return lineMatch[1].trim();
    
    return null;
  };
  
  // Extract all fields using the helper function
  result.category = extractValue('Category');
  result.type = extractValue('Type');
  result.brand = extractValue('Brand');
  result.primaryColor = extractValue('Primary Color');
  
  // Handle secondary colors which might be an array
  const secondaryColors = extractValue('Secondary Color\\(s\\)');
  if (secondaryColors && secondaryColors.toLowerCase() !== 'none') {
    result.secondaryColors = secondaryColors.split(',').map(c => c.trim());
  }
  
  result.pattern = extractValue('Pattern\\/Design');
  result.material = extractValue('Material');
  result.sizeRange = extractValue('Size Range');
  result.fitStyle = extractValue('Fit Style');
  result.priceRange = extractValue('Estimated Price Range');
  
  // Log the extracted values for debugging
  console.log('Extracted fields:', {
    category: result.category,
    type: result.type,
    brand: result.brand,
    primaryColor: result.primaryColor,
    secondaryColors: result.secondaryColors,
    pattern: result.pattern,
    material: result.material,
    sizeRange: result.sizeRange,
    fitStyle: result.fitStyle,
    priceRange: result.priceRange
  });
  
  return result;
}
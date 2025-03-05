// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Purchases from './revenuecat-proxy.ts'

console.log("Hello from Functions!")

// Helper functions for external service cleanup
async function cancelSubscription(userId: string) {
  try {
    const purchases = new Purchases(Deno.env.get('REVENUECAT_API_KEY'))
    await purchases.deleteUser(userId)
    console.log(`Successfully cancelled subscription for user ${userId}`)
  } catch (error) {
    console.error(`Failed to cancel subscription for user ${userId}:`, error)
    // Don't throw - we want to continue with account deletion
  }
}

async function deleteUserFiles(supabaseClient: any, userId: string) {
  try {
    // List all files in user's directory
    const { data: files, error: listError } = await supabaseClient
      .storage
      .from('outfits')
      .list(`user/${userId}`)
    
    if (listError) throw listError
    
    // Delete all files found
    if (files?.length > 0) {
      const { error: deleteError } = await supabaseClient
        .storage
        .from('outfits')
        .remove(files.map(file => `user/${userId}/${file.name}`))
      
      if (deleteError) throw deleteError
    }
    
    console.log(`Successfully deleted storage files for user ${userId}`)
  } catch (error) {
    console.error(`Failed to delete storage files for user ${userId}:`, error)
    // Don't throw - we want to continue with account deletion
  }
}

// Main handler
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) throw new Error('Missing auth token')

    const { data: { user }, error: jwtError } = await supabaseClient.auth.getUser(authHeader)
    if (jwtError || !user) throw new Error('Invalid auth token')

    // Best-effort cleanup of external services
    await Promise.all([
      cancelSubscription(user.id),
      deleteUserFiles(supabaseClient, user.id)
    ])

    // Delete all user data (this must succeed)
    const { error: deleteError } = await supabaseClient.rpc('delete_user_account', {
      user_id: user.id
    })

    if (deleteError) throw deleteError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Account deletion failed:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-account' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

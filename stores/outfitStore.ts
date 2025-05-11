import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '../services/supabase';
import { outfitLogger } from '../utils/logger';
import { trackOutfitActions } from '@/utils/analytics';

// Define the types for our data structures
export interface Outfit {
  id: string;
  photourl: string;
  timestamp: string;
  userid: string;
}

export interface Feedback {
  id: string;
  // outfitid is not in the joined result since we're selecting by relation
  overall_feedback: string;
  fit_analysis: string;
  color_analysis: string;
  event_suitability: string[];
  item_suggestions: string[];
  other_suggestions: string;
  score: number;
  score_justification: string;
  fit_score: number;
  color_score: number;
}

export interface OutfitWithFeedback extends Outfit {
  feedback: Feedback | null;
}

// Define the state interface
interface OutfitState {
  outfits: OutfitWithFeedback[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetched: Date | null;
  
  // Actions
  fetchOutfits: () => Promise<void>;
  getOutfitWithFeedback: (outfitId: string) => Promise<OutfitWithFeedback | null>;
  addOutfit: (photoUrl: string) => Promise<string | null>;
  refreshOutfits: () => Promise<void>;
  removeOutfit: (outfitId: string) => void;
}

export const useOutfitStore = create<OutfitState>()(
  immer((set, get) => ({
    outfits: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastFetched: null,

    fetchOutfits: async () => {
      try {
        outfitLogger.info('Fetching outfits');
        
        set(state => {
          state.isLoading = true;
          state.error = null;
        });

        // Get the current user's session
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        if (!userId) {
          outfitLogger.error('No user ID available, cannot fetch outfits');
          throw new Error('You must be logged in to view outfits');
        }

        // Fetch outfits with feedback joined
        const { data, error } = await supabase
          .from('outfits')
          .select(`
            id, photourl, timestamp, userid,
            feedback (
              id, overall_feedback, fit_analysis, color_analysis,
              event_suitability, item_suggestions, other_suggestions,
              score, score_justification, fit_score, color_score
            )
          `)
          .eq('userid', userId)
          .order('timestamp', { ascending: false });

        if (error) {
          outfitLogger.error('Error fetching outfits', { error: error.message });
          throw error;
        }

        // Transform the data to match our expected format
        const outfits = (data || []).map(item => {
          // Destructure to separate feedback from outfit
          const { feedback, ...outfit } = item;
          
          // Return properly typed outfit with feedback
          return {
            ...outfit,
            feedback: feedback && feedback.length > 0 ? feedback[0] : null
          } as OutfitWithFeedback;
        });

        outfitLogger.debug('Fetched outfits', { 
          count: outfits.length,
          ids: outfits.map(o => o.id)
        });

        set(state => {
          state.outfits = outfits;
          state.isLoading = false;
          state.lastFetched = new Date();
        });
      } catch (error: any) {
        outfitLogger.error('Error in fetchOutfits', { 
          error: error.message,
          stack: error.stack
        });
        
        set(state => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },

    getOutfitWithFeedback: async (outfitId: string) => {
      try {
        outfitLogger.info('Getting outfit details', { outfitId });
        
        // Check if we already have this outfit with feedback in state
        const existingOutfit = get().outfits.find(o => o.id === outfitId);
        if (existingOutfit && existingOutfit.feedback) {
          outfitLogger.debug('Using cached outfit with feedback', { outfitId });
          return existingOutfit;
        }
        
        // Fetch the outfit with its feedback
        const { data, error } = await supabase
          .from('outfits')
          .select(`
            id, photourl, timestamp, userid,
            feedback (
              id, overall_feedback, fit_analysis, color_analysis,
              event_suitability, item_suggestions, other_suggestions,
              score, score_justification, fit_score, color_score
            )
          `)
          .eq('id', outfitId)
          .single();

        if (error) {
          outfitLogger.error('Error fetching outfit details', { 
            error: error.message,
            outfitId
          });
          throw error;
        }

        if (!data) {
          outfitLogger.error('No outfit found with ID', { outfitId });
          return null;
        }

        // Transform the data
        const { feedback, ...outfit } = data;
        const outfitWithFeedback: OutfitWithFeedback = {
          ...outfit,
          feedback: feedback && feedback.length > 0 ? feedback[0] : null
        };

        // Also update the outfit in the state if it exists
        set(state => {
          const index = state.outfits.findIndex(o => o.id === outfitId);
          if (index !== -1) {
            state.outfits[index] = outfitWithFeedback;
          }
        });

        return outfitWithFeedback;
      } catch (error: any) {
        outfitLogger.error('Error in getOutfitWithFeedback', { 
          error: error.message,
          stack: error.stack,
          outfitId
        });
        return null;
      }
    },

    addOutfit: async (photoUrl: string) => {
      try {
        outfitLogger.info('Adding new outfit', { photoUrl });
        
        // Get the current user's session
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        if (!userId) {
          outfitLogger.error('No user ID available, cannot add outfit');
          throw new Error('You must be logged in to add outfits');
        }

        // Insert the new outfit
        const { data, error } = await supabase
          .from('outfits')
          .insert({
            photourl: photoUrl,
            userid: userId,
            timestamp: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) {
          outfitLogger.error('Error adding outfit', { error: error.message });
          throw error;
        }

        if (!data) {
          outfitLogger.error('No ID returned after adding outfit');
          throw new Error('Failed to add outfit');
        }

        const outfitId = data.id;
        outfitLogger.debug('Successfully added outfit', { outfitId });

        // Track the outfit added event
        trackOutfitActions.added(outfitId);

        // Refresh the outfits list to include the new one
        await get().fetchOutfits();

        return outfitId;
      } catch (error: any) {
        outfitLogger.error('Error in addOutfit', { 
          error: error.message,
          stack: error.stack
        });
        
        set(state => {
          state.error = error.message;
        });
        
        return null;
      }
    },

    refreshOutfits: async () => {
      try {
        outfitLogger.info('Refreshing outfits');
        
        set(state => {
          state.isRefreshing = true;
          state.error = null;
        });

        // Reuse the fetchOutfits logic
        await get().fetchOutfits();

        set(state => {
          state.isRefreshing = false;
        });
      } catch (error: any) {
        outfitLogger.error('Error in refreshOutfits', { 
          error: error.message,
          stack: error.stack
        });
        
        set(state => {
          state.error = error.message;
          state.isRefreshing = false;
        });
      }
    },

    removeOutfit: (outfitId: string) => {
      outfitLogger.info('Removing outfit from state', { outfitId });
      
      set(state => {
        state.outfits = state.outfits.filter(outfit => outfit.id !== outfitId);
      });
      
      outfitLogger.debug('Outfit removed from state', { outfitId });
    }
  }))
); 
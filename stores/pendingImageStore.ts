import { create } from 'zustand';

/**
 * Store to manage the pending image captured during onboarding
 * This image can be processed once the user subscribes
 */
interface PendingImageState {
  pendingImageUri: string | null;
  setPendingImage: (imageUri: string) => void;
  clearPendingImage: () => void;
}

export const usePendingImageStore = create<PendingImageState>((set) => ({
  pendingImageUri: null,
  setPendingImage: (imageUri: string) => {
    console.log('[PendingImageStore] Setting pending image:', imageUri);
    set({ pendingImageUri: imageUri });
  },
  clearPendingImage: () => {
    console.log('[PendingImageStore] Clearing pending image');
    set({ pendingImageUri: null });
  },
})); 
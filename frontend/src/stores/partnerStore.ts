import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PartnerState {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  setPartnerInfo: (id: string, name: string, email: string) => void;
  clearPartnerInfo: () => void;
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set) => ({
      partnerId: `partner_${Date.now()}`,
      partnerName: "Partner",
      partnerEmail: "partner@email.com",
      setPartnerInfo: (id, name, email) =>
        set({ partnerId: id, partnerName: name, partnerEmail: email }),
      clearPartnerInfo: () =>
        set({
          partnerId: `partner_${Date.now()}`,
          partnerName: "Partner",
          partnerEmail: "partner@email.com",
        }),
    }),
    {
      name: "partner-storage",
    }
  )
);


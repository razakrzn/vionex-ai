import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Emirates {
  id: number;
  name: string;
}

interface EmiratesState {
  emirates: Emirates[];
  setEmirates: (emirates: Emirates[]) => void;
  getEmirates: () => Emirates[];
  getEmirateById: (id: number) => Emirates | undefined;
  getEmirateIdByName: (name: string) => number | undefined;
}

export const useEmiratesStore = create<EmiratesState>()(
  persist(
    (set, get) => ({
      emirates: [],

      setEmirates: (emirates) => {
        // Extract only id and name from the response
        const formattedEmirates: Emirates[] = emirates.map((item: any) => ({
          id: item.id,
          name: item.name,
        }));
        set({ emirates: formattedEmirates });
      },

      getEmirates: () => {
        return get().emirates;
      },

      getEmirateById: (id: number) => {
        return get().emirates.find((emirate) => emirate.id === id);
      },

      getEmirateIdByName: (name: string) => {
        const emirate = get().emirates.find((e) => e.name.toLowerCase() === name.toLowerCase());
        return emirate?.id;
      },
    }),
    {
      name: "emirates-storage", // Storage key
      partialize: (state) => ({
        emirates: state.emirates,
      }),
    }
  )
);

